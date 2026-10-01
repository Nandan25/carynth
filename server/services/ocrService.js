import fs from "fs";
import { createRequire } from "module";
import { createWorker } from "tesseract.js";
import { getBrowser } from "./pdfService.js";

const require = createRequire(import.meta.url);

// pdf.js's browser-ready legacy UMD build. We inject this into a headless
// Chromium page (reusing the same Puppeteer instance already used for PDF
// export) and rasterize pages via a real <canvas>, rather than pulling in a
// native PDF-rasterization dependency like Poppler or GraphicsMagick, which
// Render's standard Node runtime doesn't provide without switching to a
// Docker-based deploy.
const PDFJS_BUILD_PATH = require.resolve("pdfjs-dist/legacy/build/pdf.min.js");

/**
 * OCRs a PDF buffer: rasterizes up to `maxPages` pages to PNG images inside
 * a headless Chromium page, then runs tesseract.js over each page. Returns
 * the concatenated recognized text.
 *
 * Capped to a few pages by default — resumes are rarely longer than 2-3
 * pages, and both rasterization and OCR are meaningfully CPU/RAM-heavy, so
 * there's no reason to pay that cost for pages that are very unlikely to
 * exist.
 */
export async function ocrPdfBuffer(buffer, { maxPages = 3 } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  let worker;

  try {
    await page.goto("about:blank");
    const pdfjsSource = fs.readFileSync(PDFJS_BUILD_PATH, "utf8");
    await page.addScriptTag({ content: pdfjsSource });

    const base64 = buffer.toString("base64");

    const pageImages = await page.evaluate(
      async (base64Data, maxPagesToRender) => {
        /* eslint-disable no-undef */
        const pdfjsLib = window.pdfjsLib;
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const numPages = Math.min(pdf.numPages, maxPagesToRender);
        const images = [];

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
        /* eslint-enable no-undef */
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
  } finally {
    if (worker) await worker.terminate();
    await page.close();
  }
}
