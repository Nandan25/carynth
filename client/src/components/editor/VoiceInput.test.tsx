import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceInput from "./VoiceInput";

const mockInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
  destroy: vi.fn(),
};
let capturedOnStatus;

vi.mock("../../voice/transcription", () => ({
  VoiceTranscription: vi.fn().mockImplementation((onStatus) => {
    capturedOnStatus = onStatus;
    return mockInstance;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInstance.start.mockResolvedValue(undefined);
});

describe("VoiceInput", () => {
  it("shows the start button initially", () => {
    render(<VoiceInput onInsert={vi.fn()} />);
    expect(screen.getByRole("button", { name: /voice input/i })).toBeInTheDocument();
  });

  it("hides the start button through every busy state, preventing an overlapping second recording", async () => {
    const user = userEvent.setup();
    render(<VoiceInput onInsert={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /voice input/i }));
    expect(mockInstance.start).toHaveBeenCalledTimes(1);

    // This is the exact regression this test guards against: previously the
    // mic button only hid during "recording"/"transcribing", so clicking it
    // again during "requesting-permission", "preparing-audio" or
    // "loading-whisper" would start a second, overlapping recording.
    for (const status of [
      "requesting-permission",
      "recording",
      "preparing-audio",
      "loading-whisper",
      "transcribing",
    ]) {
      capturedOnStatus({ status });
      expect(screen.queryByRole("button", { name: /voice input/i })).not.toBeInTheDocument();
    }

    // start() should never have been called a second time via this flow
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
  });

  it("shows Insert and Cancel once a transcript is ready, and inserts it on click", async () => {
    const onInsert = vi.fn();
    mockInstance.stop.mockResolvedValue({ text: "hello from whisper", engine: "whisper" });
    const user = userEvent.setup();

    render(<VoiceInput onInsert={onInsert} />);
    await user.click(screen.getByRole("button", { name: /voice input/i }));
    capturedOnStatus({ status: "recording" });

    await user.click(screen.getByRole("button", { name: /stop recording/i }));

    expect(await screen.findByText("hello from whisper")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /insert transcript/i }));

    expect(onInsert).toHaveBeenCalledWith("hello from whisper");
  });

  it("shows a warning banner when the web-speech fallback engine was used", async () => {
    mockInstance.stop.mockResolvedValue({
      text: "fallback text",
      engine: "web-speech",
      warning: "Whisper was unavailable. The browser's speech recognition was used instead.",
    });
    const user = userEvent.setup();

    render(<VoiceInput onInsert={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /voice input/i }));
    capturedOnStatus({ status: "recording" });
    await user.click(screen.getByRole("button", { name: /stop recording/i }));

    expect(await screen.findByText(/whisper was unavailable/i)).toBeInTheDocument();
  });

  it("shows an error and no insert option when transcription returns empty", async () => {
    mockInstance.stop.mockResolvedValue({ text: "", engine: "whisper" });
    const user = userEvent.setup();

    render(<VoiceInput onInsert={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /voice input/i }));
    capturedOnStatus({ status: "recording" });
    await user.click(screen.getByRole("button", { name: /stop recording/i }));

    expect(await screen.findByText(/no speech was recognized/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /insert transcript/i })).not.toBeInTheDocument();
  });

  it("calls destroy() on unmount to release the microphone and terminate the worker", () => {
    const { unmount } = render(<VoiceInput onInsert={vi.fn()} />);
    unmount();
    expect(mockInstance.destroy).toHaveBeenCalledTimes(1);
  });
});
