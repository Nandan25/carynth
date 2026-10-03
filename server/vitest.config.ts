import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Run test files serially per-suite to avoid in-memory Mongo state bleeding
    // across files that reset collections between tests.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["tests/**", "node_modules/**"],
    },
  },
});
