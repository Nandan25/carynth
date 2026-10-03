
import { pipeline, env } from "@huggingface/transformers";

// Browser-only inference; no backend model downloads or Node dependencies.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "onnx-community/whisper-tiny.en";

// Worker global scope: the DOM lib types `self` as Window (whose postMessage
// needs a targetOrigin), so describe the small worker-scope surface we use.
const workerSelf = self as unknown as {
    postMessage: (message: unknown) => void;
    onmessage: ((event: MessageEvent) => void) | null;
};

let transcriberPromise: Promise<any> | null = null;

async function getTranscriber() {
    if (!transcriberPromise) {
        transcriberPromise = (pipeline as any)(
            "automatic-speech-recognition",
            MODEL_ID,
            {
                device: "wasm",
                dtype: "q8",
                progress_callback: (progress) => {
                    workerSelf.postMessage({
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

workerSelf.onmessage = async (event) => {
    const { type, audio, requestId } = event.data || {};

    if (type !== "transcribe") return;

    try {
        if (!(audio instanceof Float32Array) || audio.length === 0) {
            throw new Error("No usable audio was provided.");
        }

        workerSelf.postMessage({ type: "loading", requestId });

        const transcriber = await getTranscriber();

        workerSelf.postMessage({ type: "transcribing", requestId });

        const result = await transcriber(audio, {
            sampling_rate: 16000,
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false,
        });

        const text = Array.isArray(result)
            ? result.map((item) => item.text || "").join(" ")
            : result.text || "";

        workerSelf.postMessage({
            type: "result",
            requestId,
            text: text.trim(),
        });
    } catch (error) {
        workerSelf.postMessage({
            type: "error",
            requestId,
            message: error?.message || "Whisper transcription failed.",
        });
    }
};