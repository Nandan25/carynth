import puppeteer from "puppeteer";
import { renderResumeHtml } from "../templates/renderResume.js";

let browserPromise = null;

// Reuse a single browser instance across requests instead of launching a
// fresh one every export (launching Chromium is the expensive part).
export function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

export async function resumeToPdfBuffer(resume) {
  const html = renderResumeHtml(resume);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
