import puppeteer, { Browser } from "puppeteer";
import { renderResumeHtml } from "../templates/renderResume.js";
import type { IResume } from "../models/Resume.js";

let browserPromise: Promise<Browser> | null = null;

// Reuse a single browser instance across requests instead of launching a
// fresh one every export (launching Chromium is the expensive part).
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

export async function resumeToPdfBuffer(resume: IResume): Promise<Buffer> {
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
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
