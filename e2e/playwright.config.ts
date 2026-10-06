import { defineConfig, devices } from "@playwright/test";

const PORT_CLIENT = 5173;
const usingRemote = !!process.env.E2E_BASE_URL;
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT_CLIENT}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Only auto-start local dev servers when testing locally. When pointed at
  // a deployed URL (E2E_BASE_URL set), we assume it's already running.
  webServer: usingRemote
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "../server",
          // The suite registers a user per test from one IP; skip the
          // per-IP auth rate limits for it (never set this in production).
          env: { ...(process.env as Record<string, string>), DISABLE_RATE_LIMIT: "true" },
          url: "http://localhost:5000/api/health",
          reuseExistingServer: true,
          timeout: 30_000,
        },
        {
          command: "npm run dev",
          cwd: "../client",
          url: `http://localhost:${PORT_CLIENT}`,
          reuseExistingServer: true,
          timeout: 30_000,
        },
      ],
});
