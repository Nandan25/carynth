
import {
    decodeAudioTo16kMono,
    getSupportedRecordingMimeType,
} from "./audio.js";

const MAX_RECORDING_MS = 5 * 60 * 1000;

function getSpeechRecognitionConstructor() {
    return (
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        null
    );
}

function createRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class VoiceTranscription {
    constructor(onStatus = () => { }) {
        this.onStatus = onStatus;
        this.stream = null;
        this.recorder = null;
        this.chunks = [];
        this.worker = null;
        this.recognition = null;
        this.fallbackParts = [];
        this.requestId = null;
        this.timeoutId = null;
        this.cancelled = false;
        this.recordingStartedAt = 0;
    }

    emit(status, details = {}) {
        this.onStatus({ status, ...details });
    }

    async start() {
        if (this.recorder?.state === "recording") {
            throw new Error("A recording is already in progress.");
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Microphone recording is not supported.");
        }

        this.cancelled = false;
        this.chunks = [];
        this.fallbackParts = [];

        this.emit("requesting-permission");

        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });

        const mimeType = getSupportedRecordingMimeType();

        this.recorder = new MediaRecorder(
            this.stream,
            mimeType ? { mimeType } : undefined
        );

        this.recorder.ondataavailable = (event) => {
            if (event.data?.size) {
                this.chunks.push(event.data);
            }
        };

        this.recorder.onerror = (event) => {
            this.emit("error", {
                message: event.error?.message || "Recording failed.",
            });
        };

        this.recorder.start(1000);
        this.recordingStartedAt = Date.now();

        this.startSpeechFallback();

        this.timeoutId = window.setTimeout(() => {
            if (this.recorder?.state === "recording") {
                this.stop().catch(() => { });
            }
        }, MAX_RECORDING_MS);

        this.emit("recording");
    }

    startSpeechFallback() {
        const Recognition = getSpeechRecognitionConstructor();

        if (!Recognition) {
            this.emit("fallback-unavailable");
            return;
        }

        try {
            const recognition = new Recognition();

            recognition.lang = "en-US";
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i += 1
                ) {
                    const result = event.results[i];
                    const transcript = result[0]?.transcript?.trim();

                    if (result.isFinal && transcript) {
                        this.fallbackParts.push(transcript);
                    }
                }
            };

            recognition.onerror = () => {
                // Whisper remains the primary engine.
            };

            recognition.onend = () => {
                // Some browsers end recognition automatically.
                // Do not restart it after recording has stopped.
            };

            this.recognition = recognition;
            recognition.start();
        } catch {
            this.recognition = null;
        }
    }

    stopRecognition() {
        if (!this.recognition) return;

        try {
            this.recognition.stop();
        } catch {
            // It may already have stopped.
        }

        this.recognition = null;
    }

    stopRecorder() {
        return new Promise((resolve, reject) => {
            if (!this.recorder) {
                reject(new Error("No active recording."));
                return;
            }

            if (this.recorder.state === "inactive") {
                resolve();
                return;
            }

            this.recorder.onstop = resolve;

            try {
                this.recorder.stop();
            } catch (error) {
                reject(error);
            }
        });
    }

    async stop() {
        if (!this.recorder || this.recorder.state !== "recording") {
            throw new Error("There is no active recording.");
        }

        window.clearTimeout(this.timeoutId);
        this.stopRecognition();

        this.emit("preparing-audio");

        await this.stopRecorder();

        const durationMs = Date.now() - this.recordingStartedAt;

        this.cleanupStream();

        const blob = new Blob(this.chunks, {
            type: this.recorder.mimeType || "audio/webm",
        });

        if (!blob.size) {
            throw new Error("No audio was captured.");
        }

        if (this.cancelled) {
            return { cancelled: true };
        }

        this.emit("loading-whisper");

        try {
            const audio = await decodeAudioTo16kMono(blob);

            if (this.cancelled) return { cancelled: true };

            const whisperText = await this.runWhisper(audio);

            if (whisperText.trim()) {
                this.emit("completed", { engine: "whisper" });

                return {
                    text: whisperText.trim(),
                    engine: "whisper",
                    durationMs,
                };
            }

            throw new Error("Whisper returned an empty transcript.");
        } catch (error) {
            const fallbackText = this.fallbackParts.join(" ").trim();

            if (fallbackText) {
                this.emit("completed", {
                    engine: "web-speech",
                    fallback: true,
                });

                return {
                    text: fallbackText,
                    engine: "web-speech",
                    durationMs,
                    warning:
                        "Whisper was unavailable. The browser's speech recognition was used instead.",
                };
            }

            this.emit("error", {
                message:
                    error?.message ||
                    "Transcription failed. Please try recording again.",
            });

            throw new Error(
                `${error?.message || "Whisper failed."} ${getSpeechRecognitionConstructor()
                    ? "No fallback transcript was available."
                    : "Web Speech fallback is not supported in this browser."
                }`
            );
        } finally {
            this.terminateWorker();
            this.recorder = null;
        }
    }

    runWhisper(audio) {
        return new Promise((resolve, reject) => {
            this.terminateWorker();

            this.worker = new Worker(
                new URL("./whisper.worker.js", import.meta.url),
                { type: "module" }
            );

            this.requestId = createRequestId();

            const worker = this.worker;
            const requestId = this.requestId;

            worker.onmessage = (event) => {
                const message = event.data;

                if (message.requestId && message.requestId !== requestId) {
                    return;
                }

                if (message.type === "progress") {
                    this.emit("model-progress", {
                        progress: message.progress,
                    });
                }

                if (message.type === "loading") {
                    this.emit("loading-whisper");
                }

                if (message.type === "transcribing") {
                    this.emit("transcribing");
                }

                if (message.type === "result") {
                    resolve(message.text || "");
                }

                if (message.type === "error") {
                    reject(new Error(message.message));
                }
            };

            worker.onerror = () => {
                reject(new Error("Whisper worker failed to load."));
            };

            worker.postMessage(
                {
                    type: "transcribe",
                    requestId,
                    audio,
                },
                [audio.buffer]
            );
        });
    }

    cancel() {
        this.cancelled = true;

        window.clearTimeout(this.timeoutId);
        this.stopRecognition();

        if (this.recorder?.state === "recording") {
            try {
                this.recorder.stop();
            } catch {
                // Ignore cancellation cleanup errors.
            }
        }

        this.cleanupStream();
        this.terminateWorker();
        this.recorder = null;
        this.chunks = [];
        this.fallbackParts = [];

        this.emit("cancelled");
    }

    cleanupStream() {
        this.stream?.getTracks().forEach((track) => track.stop());
        this.stream = null;
    }

    terminateWorker() {
        this.worker?.terminate();
        this.worker = null;
    }

    destroy() {
        this.cancel();
    }
}