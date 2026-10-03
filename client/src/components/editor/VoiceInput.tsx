import { useEffect, useRef, useState } from "react";
import { VoiceTranscription } from "../../voice/transcription";

const STATUS_LABELS: Record<string, string> = {
  "requesting-permission": "Waiting for microphone permission…",
  recording: "Listening…",
  "preparing-audio": "Preparing recording…",
  "loading-whisper": "Loading Whisper model…",
  transcribing: "Transcribing your recording…",
  "fallback-unavailable": "Browser fallback unavailable. Whisper will be used.",
};

export default function VoiceInput({
  onInsert,
  label = "Voice input",
}: {
  onInsert: (text: string) => void;
  label?: string;
}) {
  const engineRef = useRef<VoiceTranscription | null>(null);

  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [progress, setProgress] = useState(null);
  const [engine, setEngine] = useState("");

  useEffect(() => {
    const engineInstance = new VoiceTranscription((event) => {
      setStatus(event.status);

      if (event.status === "error") {
        setError(event.message || "Transcription failed.");
      }

      if (event.status === "model-progress") {
        setProgress(event.progress);
      }
    });

    engineRef.current = engineInstance;

    return () => {
      engineInstance.destroy();
      engineRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    setError("");
    setWarning("");
    setTranscript("");
    setProgress(null);
    setEngine("");

    try {
      await engineRef.current.start();
    } catch (err) {
      setStatus("error");
      setError(err.message || "Unable to access the microphone.");
    }
  };

  const stopRecording = async () => {
    setError("");

    try {
      const result = await engineRef.current.stop();

      if (result?.cancelled) return;

      setTranscript(result.text || "");
      setEngine(result.engine || "");

      if (result.warning) {
        setWarning(result.warning);
      }

      setStatus(result.text?.trim() ? "review" : "error");

      if (!result.text?.trim()) {
        setError("No speech was recognized. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setError(err.message || "Transcription failed.");
    }
  };

  const cancel = () => {
    engineRef.current?.cancel();
    setStatus("idle");
    setTranscript("");
    setError("");
    setWarning("");
    setProgress(null);
  };

  const insertTranscript = () => {
    const text = transcript.trim();
    if (!text) return;

    onInsert(text);
    setTranscript("");
    setStatus("idle");
  };

  const showInsert =
    ["review", "fallback-unavailable"].includes(status) && transcript.trim();

  const showCancel = status !== "idle";

  // Every state between clicking "start" and the transcript being ready
  // must hide the mic button — otherwise a user can click it again mid-flow
  // (e.g. during "loading-whisper") and kick off a second, overlapping
  // recording while the first is still being processed.
  const BUSY_STATUSES = [
    "requesting-permission",
    "recording",
    "preparing-audio",
    "loading-whisper",
    "transcribing",
  ];
  const showMicrophone = !BUSY_STATUSES.includes(status);
  const showStop = status === "recording";

  const currentStatusLabel = STATUS_LABELS[status];

  return (
    <div>
      <div className="flex items-center gap-2">
        {showMicrophone && (
          <button
            onClick={startRecording}
            type="button"
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark dark:bg-accent-dark dark:hover:bg-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3H12m7.414-7.5a2.25 2.25 0 00.297-3.236l-1.574-1.573A.75.75 0 0017.25 9V7.5m-8.625 10.5a2.25 2.25 0 01-2.25-2.25V15m11.36-1.36l1.59-1.59a2.25 2.25 0 00-.297-3.235l-1.574-1.573A.75.75 0 0014.25 9V7.5M12 18.75a4.5 4.5 0 004.5-4.5v-1.5m-4.5 7.5a4.5 4.5 0 01-4.5-4.5v-1.5"
              />
            </svg>
            {label}
          </button>
        )}

        {showStop && (
          <button
            onClick={stopRecording}
            type="button"
            className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Stop Recording
          </button>
        )}

        {currentStatusLabel && (
          <p className="text-sm text-muted dark:text-muted-dark">
            {currentStatusLabel}
            {progress && (
              <span className="ml-1">({Math.round(progress.progress)}%)</span>
            )}
          </p>
        )}
      </div>

      {warning && (
        <p className="mt-2 text-sm text-orange-500 dark:text-orange-400">
          {warning}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {transcript && (
        <div className="mt-4 rounded-lg border border-border bg-white p-3 text-sm dark:border-border-dark dark:bg-surface-dark">
          <p className="font-medium">Transcript:</p>
          <p className="mt-1 text-muted dark:text-muted-dark">{transcript}</p>
        </div>
      )}

      {(showInsert || showCancel) && (
        <div className="mt-4 flex items-center gap-2">
          {showInsert && (
            <button
              onClick={insertTranscript}
              type="button"
              className="rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Insert Transcript
            </button>
          )}
          {showCancel && (
            <button
              onClick={cancel}
              type="button"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-muted shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-border-dark dark:bg-surface-dark dark:text-muted-dark dark:hover:bg-surface-dark-hover"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
