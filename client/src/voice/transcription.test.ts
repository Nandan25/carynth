import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./audio", () => ({
  decodeAudioTo16kMono: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2])),
  getSupportedRecordingMimeType: vi.fn().mockReturnValue("audio/webm"),
}));

const { VoiceTranscription } = await import("./transcription");
const { decodeAudioTo16kMono } = await import("./audio");

// Each test sets this to control what the "worker" responds with once
// postMessage is called, so tests can just `await vt.stop()` directly
// instead of manually grabbing the worker instance mid-flight.
let workerResponse = null;

class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage(message) {
    const respond = workerResponse;
    queueMicrotask(() => {
      if (!respond) return;
      const response = respond(message);
      if (response?.error) {
        this.onmessage?.({ data: { type: "error", requestId: message.requestId, message: response.error } });
      } else {
        this.onmessage?.({
          data: { type: "result", requestId: message.requestId, text: response?.text ?? "" },
        });
      }
    });
  }
  terminate() {}
}

class MockMediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.state = "inactive";
    this.mimeType = options?.mimeType || "audio/webm";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["chunk"]) });
    this.onstop?.();
  }
}

function mockStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track], _track: track };
}

beforeEach(() => {
  workerResponse = null;
  decodeAudioTo16kMono.mockClear();
  window.MediaRecorder = MockMediaRecorder;
  window.Worker = MockWorker;
  global.Worker = MockWorker;
  navigator.mediaDevices = { getUserMedia: vi.fn().mockResolvedValue(mockStream()) };
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VoiceTranscription", () => {
  it("throws if start() is called while already recording", async () => {
    const vt = new VoiceTranscription();
    await vt.start();
    await expect(vt.start()).rejects.toThrow(/already in progress/i);
  });

  it("throws if getUserMedia is unsupported", async () => {
    navigator.mediaDevices = {};
    const vt = new VoiceTranscription();
    await expect(vt.start()).rejects.toThrow(/not supported/i);
  });

  it("emits a recording status once started", async () => {
    const events = [];
    const vt = new VoiceTranscription((e) => events.push(e.status));
    await vt.start();
    expect(events).toContain("recording");
  });

  it("resolves with Whisper's transcript on success", async () => {
    workerResponse = () => ({ text: "hello world" });
    const vt = new VoiceTranscription();
    await vt.start();

    const result = await vt.stop();
    expect(result.text).toBe("hello world");
    expect(result.engine).toBe("whisper");
  });

  it("falls back to web-speech collected text when Whisper fails", async () => {
    class MockRecognition {
      start() {
        MockRecognition.instance = this;
      }
      stop() {}
    }
    window.SpeechRecognition = MockRecognition;
    workerResponse = () => ({ error: "model failed to load" });

    const vt = new VoiceTranscription();
    await vt.start();

    // Simulate a final speech-recognition result arriving during recording
    const recognition = MockRecognition.instance;
    recognition.onresult({
      resultIndex: 0,
      results: [Object.assign([{ transcript: "fallback text" }], { isFinal: true })],
    });

    const result = await vt.stop();
    expect(result.engine).toBe("web-speech");
    expect(result.text).toBe("fallback text");
    expect(result.warning).toMatch(/whisper was unavailable/i);
  });

  it("throws when Whisper fails and no fallback text was collected", async () => {
    workerResponse = () => ({ error: "model failed to load" });
    const vt = new VoiceTranscription();
    await vt.start();

    await expect(vt.stop()).rejects.toThrow(/model failed to load/i);
  });

  it("throws if stop() is called with no active recording", async () => {
    const vt = new VoiceTranscription();
    await expect(vt.stop()).rejects.toThrow(/no active recording/i);
  });

  it("stops media stream tracks on cancel", async () => {
    const vt = new VoiceTranscription();
    await vt.start();
    const track = vt.stream._track;

    vt.cancel();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(vt.stream).toBeNull();
  });

  it("destroy() cleans up an in-progress recording (cancel on unmount)", async () => {
    const vt = new VoiceTranscription();
    await vt.start();
    const track = vt.stream._track;

    vt.destroy();

    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
