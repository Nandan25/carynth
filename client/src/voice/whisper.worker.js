
import { pipeline, env } from "@huggingface/transformers";

// Browser-only inference; no backend model downloads or Node dependencies.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "onnx-community/whisper-tiny.en";

let transcriberPromise = null;

async function getTranscriber() {
    if (!transcriberPromise) {
        transcriberPromise = pipeline(
            "automatic-speech-recognition",
            MODEL_ID,
            {
                device: "wasm",
                dtype: "q8",
                progress_callback: (progress) => {
                    self.postMessage({
                        type: "progress",
                        progress,
                    });
                },
            }
        ).catch((error) => {
            transcriberPromise = null;
            throw error;
        });
    }

    return transcriberPromise;
}

self.onmessage = async (event) => {
    const { type, audio, requestId } = event.data || {};

    if (type !== "transcribe") return;

    try {
        if (!(audio instanceof Float32Array) || audio.length === 0) {
            throw new Error("No usable audio was provided.");
        }

        self.postMessage({ type: "loading", requestId });

        const transcriber = await getTranscriber();

        self.postMessage({ type: "transcribing", requestId });

        const result = await transcriber(audio, {
            sampling_rate: 16000,
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
        });

        const text = Array.isArray(result)
            ? result.map((item) => item.text || "").join(" ")
            : result.text || "";

        self.postMessage({
            type: "result",
            requestId,
            text: text.trim(),
        });
    } catch (error) {
        self.postMessage({
            type: "error",
            requestId,
            message: error?.message || "Whisper transcription failed.",
        });
    }
};