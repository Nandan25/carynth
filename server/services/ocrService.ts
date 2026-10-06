import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { createWorker } from "tesseract.js";
import { getBrowser } from "./pdfService.js";
import { browserJobs } from "./browserJobs.js";

const OCR_TIMEOUT_MS = 120_000;

const require = createRequire(import.meta.url);

/**
 * Locates a usable browser-ready pdf.js build inside the installed
 * pdfjs-dist package. The exact file layout has shifted across pdfjs-dist
 * versions (recent versions lean increasingly ESM-only, and minified builds
 * aren't guaranteed to be published to npm at all), so rather than hardcode
 * one path, this checks several known candidates against whatever is
 * actually on disk. Resolved lazily (only when OCR is actually attempted),
 * not at module load time — a problem here should fail one request, not
 * crash the whole server on startup.
 */
export function resolvePdfJsBuild(): string {
  const pkgJsonPath = require.resolve("pdfjs-dist/package.json");
  const pkgRoot = path.dirname(pkgJsonPath);

  const candidates = [
    "legacy/build/pdf.js", // UMD-style, exposes window.pdfjsLib directly — preferred
    "legacy/build/pdf.min.js",
    "build/pdf.js",
    "build/pdf.min.js",
  ];

  for (const rel of candidates) {
    const full = path.join(pkgRoot, rel);
    if (fs.existsSync(full)) return full;
  }

  throw new Error(
    `Could not locate a usable pdfjs-dist browser build in ${pkgRoot}. ` +
      `Checked: ${candidates.join(", ")}. The installed pdfjs-dist version may have changed its build layout.`
  );
}

export interface OcrOptions {
  maxPages?: number;
}

/**
 * OCRs a PDF buffer: rasterizes up to `maxPages` pages to PNG images inside
 * a headless Chromium page (reusing the Puppeteer instance already used for
 * PDF export), then runs tesseract.js over each page. Returns the
 * concatenated recognized text.
 */
async function runOcr(buffer: Buffer, maxPages: number): Promise<string> {
  const pdfjsBuildPath = resolvePdfJsBuild(); // throws a clear, catchable error if unavailable

  const browser = await getBrowser();
  const page = await browser.newPage();
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;

  // Hard stop: closing the page makes any in-flight evaluate() reject, and
  // terminating the worker stops recognition, so a pathological PDF can't pin
  // a browser slot and CPU indefinitely.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    page.close().catch(() => {});
    worker?.terminate().catch(() => {});
  }, OCR_TIMEOUT_MS);

  try {
    // pdf.js only needs the inline script + a canvas; block everything else.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("data:") || url.startsWith("about:")) req.continue();
      else req.abort();
    });
    await page.goto("about:blank");
    const pdfjsSource = fs.readFileSync(pdfjsBuildPath, "utf8");
    await page.addScriptTag({ content: pdfjsSource });

    const hasGlobal = await page.evaluate(() => typeof (window as any).pdfjsLib !== "undefined");
    if (!hasGlobal) {
      throw new Error(
        "pdfjs-dist loaded but did not expose window.pdfjsLib — the installed build may be ESM-only and incompatible with this rendering approach."
      );
    }

    const base64 = buffer.toString("base64");

    const pageImages: string[] = await page.evaluate(
      async (base64Data: string, maxPagesToRender: number) => {
        /* eslint-disable no-undef, @typescript-eslint/no-explicit-any */
        const pdfjsLib = (window as any).pdfjsLib;
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const numPages = Math.min(pdf.numPages, maxPagesToRender);
        const images: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const pdfPage = await pdf.getPage(i);
          const viewport = pdfPage.getViewport({ scale: 2 }); // sharper image = better OCR accuracy
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
          images.push(canvas.toDataURL("image/png"));
        }
        return images;
        /* eslint-enable no-undef, @typescript-eslint/no-explicit-any */
      },
      base64,
      maxPages
    );

    worker = await createWorker("eng");
    let fullText = "";
    for (const dataUrl of pageImages) {
      const imgBuffer = Buffer.from(dataUrl.split(",")[1], "base64");
      const {
        data: { text },
      } = await worker.recognize(imgBuffer);
      fullText += `\n${text}`;
    }

    return fullText.trim();
  } catch (err: any) {
    if (timedOut) {
      const timeout: any = new Error("Reading this PDF took too long. Try a shorter or clearer file.");
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (worker) await worker.terminate().catch(() => {});
    await page.close().catch(() => {});
  }
}

/** Queued behind the shared browser-job limit so OCR can't starve the server. */
export function ocrPdfBuffer(buffer: Buffer, { maxPages = 3 }: OcrOptions = {}): Promise<string> {
  return browserJobs.run(() => runOcr(buffer, maxPages));
}
