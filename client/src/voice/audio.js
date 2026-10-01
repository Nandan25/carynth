
export async function decodeAudioTo16kMono(blob) {
    if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The recording is empty.");
    }

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        throw new Error("Web Audio is not supported in this browser.");
    }

    const context = new AudioContextClass();

    try {
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer);

        const channels = decoded.numberOfChannels;
        const sourceRate = decoded.sampleRate;
        const targetRate = 16000;

        const mono = new Float32Array(decoded.length);

        for (let channel = 0; channel < channels; channel += 1) {
            const samples = decoded.getChannelData(channel);

            for (let i = 0; i < samples.length; i += 1) {
                mono[i] += samples[i] / channels;
            }
        }

        if (sourceRate === targetRate) {
            return mono;
        }

        const outputLength = Math.ceil(
            mono.length * targetRate / sourceRate
        );

        const resampled = new Float32Array(outputLength);
        const ratio = sourceRate / targetRate;

        for (let i = 0; i < outputLength; i += 1) {
            const position = i * ratio;
            const left = Math.floor(position);
            const right = Math.min(left + 1, mono.length - 1);
            const fraction = position - left;

            resampled[i] =
                mono[left] * (1 - fraction) +
                mono[right] * fraction;
        }

        return resampled;
    } finally {
        await context.close().catch(() => { });
    }
}

export function getSupportedRecordingMimeType() {
    if (!window.MediaRecorder) return "";

    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
    ];

    return candidates.find((type) =>
        MediaRecorder.isTypeSupported(type)
    ) || "";
}