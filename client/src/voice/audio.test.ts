import { describe, it, expect, afterEach } from "vitest";
import { decodeAudioTo16kMono, getSupportedRecordingMimeType } from "./audio";

describe("getSupportedRecordingMimeType", () => {
  afterEach(() => {
    delete window.MediaRecorder;
  });

  it("returns an empty string when MediaRecorder is unavailable", () => {
    delete window.MediaRecorder;
    expect(getSupportedRecordingMimeType()).toBe("");
  });

  it("returns the first supported candidate type", () => {
    window.MediaRecorder = { isTypeSupported: (type) => type === "audio/webm" };
    expect(getSupportedRecordingMimeType()).toBe("audio/webm");
  });

  it("returns an empty string when none of the candidates are supported", () => {
    window.MediaRecorder = { isTypeSupported: () => false };
    expect(getSupportedRecordingMimeType()).toBe("");
  });
});

describe("decodeAudioTo16kMono", () => {
  function mockAudioContext({ sampleRate, channelData }) {
    const numberOfChannels = channelData.length;
    const length = channelData[0].length;
    class MockAudioContext {
      async decodeAudioData() {
        return {
          numberOfChannels,
          sampleRate,
          length,
          getChannelData: (ch) => channelData[ch],
        };
      }
      async close() {}
    }
    window.AudioContext = MockAudioContext;
  }

  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  it("rejects an empty blob before touching AudioContext", async () => {
    await expect(decodeAudioTo16kMono(new Blob([]))).rejects.toThrow(/empty/i);
  });

  it("throws clearly when Web Audio is unsupported", async () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    await expect(decodeAudioTo16kMono(new Blob(["x"]))).rejects.toThrow(/not supported/i);
  });

  it("returns audio unchanged when the source is already 16kHz", async () => {
    const samples = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    mockAudioContext({ sampleRate: 16000, channelData: [samples] });

    const result = await decodeAudioTo16kMono(new Blob(["x"]));
    expect(Array.from(result)).toEqual(Array.from(samples));
  });

  it("averages multiple channels down to mono", async () => {
    const left = new Float32Array([1, 1]);
    const right = new Float32Array([-1, -1]);
    mockAudioContext({ sampleRate: 16000, channelData: [left, right] });

    const result = await decodeAudioTo16kMono(new Blob(["x"]));
    expect(Array.from(result)).toEqual([0, 0]);
  });

  it("resamples down to 16kHz when the source rate is higher", async () => {
    const samples = new Float32Array([0, 1, 0, -1]); // 4 samples at 32kHz
    mockAudioContext({ sampleRate: 32000, channelData: [samples] });

    const result = await decodeAudioTo16kMono(new Blob(["x"]));
    // 4 samples at 32kHz -> ~2 samples at 16kHz
    expect(result.length).toBe(2);
  });
});
