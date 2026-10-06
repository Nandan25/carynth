import { Semaphore } from "../utils/semaphore.js";

/**
 * Every job that needs a Chromium page (PDF export, OCR) goes through this
 * one gate. A single shared browser is cheap, but each open page costs real
 * memory, and the free-tier instance has very little. Excess requests wait in
 * a short queue; beyond that they get a fast 503 instead of risking an
 * out-of-memory kill that takes down every user's request.
 */
const concurrency = Math.min(8, Math.max(1, Number(process.env.BROWSER_CONCURRENCY) || 2));

export const browserJobs = new Semaphore(concurrency, 10);
