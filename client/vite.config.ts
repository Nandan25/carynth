import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // The Whisper worker is created with `{ type: "module" }` and pulls in code-split
  // dependencies (transformers.js / onnxruntime). Vite's default worker format
  // ("iife") can't be used for code-splitting builds, so `vite build` needs "es".
  // This only affects the production bundle; the dev server is unchanged.
  worker: {
    format: "es",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
