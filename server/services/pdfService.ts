import fs from "fs";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";
import { renderResumeHtml } from "../templates/renderResume.js";
import { browserJobs } from "./browserJobs.js";
import type { IResume } from "../models/Resume.js";

const PDF_TIMEOUT_MS = 30_000;

let browserPromise: Promise<Browser> | null = null;

const CHROME_INSTALL_HINT =
  "Chrome for Puppeteer is not installed, so PDF export and OCR cannot work.\n" +
  "  Fix (from the server/ folder):  pnpm exec puppeteer browsers install chrome\n" +
  "  Why it happens: package managers such as pnpm 10+ skip dependency install scripts by default,\n" +
  "  and Puppeteer downloads Chrome from one. Docker/Render install it explicitly in the Dockerfile.";

/**
 * Is the browser Puppeteer will try to launch actually on disk? Checked at
 * startup so a missing Chrome is reported immediately, not on the first
 * user's export.
 */
export function chromeStatus(): { installed: boolean; path?: string } {
  try {
    const path = puppeteer.executablePath();
    return { installed: !!path && fs.existsSync(path), path };
  } catch {
    return { installed: false };
  }
}

/** Turns Puppeteer's "Could not find Chrome" into a clear 503 plus an actionable server log. */
function explainLaunchFailure(err: any): any {
  if (/could not find (chrome|chromium|browser)/i.test(String(err?.message))) {
    console.error(`[pdf] ${CHROME_INSTALL_HINT}`);
    const friendly: any = new Error("PDF export is unavailable: Chrome isn't installed on the server.");
    friendly.status = 503;
    return friendly;
  }
  return err;
}

export { CHROME_INSTALL_HINT };

/**
 * Returns the shared Chromium instance, launching it on first use.
 *
 * The cached promise is cleared if the launch fails OR the browser later
 * crashes / is killed ("disconnected"). Without that, one failure would leave
 * a dead browser cached and every later export would fail until the whole
 * server was restarted.
 */
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const launching: Promise<Browser> = puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .then((browser) => {
        browser.on("disconnected", () => {
          if (browserPromise === launching) browserPromise = null;
        });
        return browser;
      })
      .catch((err) => {
        throw explainLaunchFailure(err);
      });
    launching.catch(() => {
      if (browserPromise === launching) browserPromise = null;
    });
    browserPromise = launching;
  }
  return browserPromise;
}

export function resumeToPdfBuffer(resume: IResume): Promise<Buffer> {
  return browserJobs.run(async () => {
    const html = renderResumeHtml(resume);
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(PDF_TIMEOUT_MS);

      // Defence in depth. The templates escape user text, but the page that
      // renders it should still be unable to run script or reach the network
      // (SSRF to internal addresses, tracking pixels, ...) even if some future
      // template change let markup through.
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (url.startsWith("data:") || url.startsWith("about:")) req.continue();
        else req.abort();
      });

      // Everything is inline HTML/CSS, so "load" is enough; "networkidle0"
      // only added an extra half-second wait.
      await page.setContent(html, { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: false,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
    }
  });
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const pending = browserPromise;
    browserPromise = null;
    try {
      const browser = await pending;
      await browser.close();
    } catch {
      // launch had failed, or the browser was already gone
    }
  }
}
