import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const launch = vi.hoisted(() => {
  process.env.BROWSER_CONCURRENCY = "2"; // read once, when browserJobs is imported
  return vi.fn();
});
vi.mock("puppeteer", () => ({ default: { launch } }));

const { resumeToPdfBuffer, closeBrowser, getBrowser } = await import("../services/pdfService.js");

const resume: any = {
  templateId: "classic",
  personalInfo: { fullName: "Jane Doe" },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const tracker = { current: 0, peak: 0 };

function makeBrowser({ pdfDelayMs = 0, pdfError }: { pdfDelayMs?: number; pdfError?: Error } = {}) {
  const handlers: Record<string, () => void> = {};
  const pages: any[] = [];
  const browser: any = {
    on: vi.fn((event: string, fn: () => void) => {
      handlers[event] = fn;
    }),
    close: vi.fn(async () => {}),
    newPage: vi.fn(async () => {
      const page: any = {
        requestHandler: null as null | ((req: any) => void),
        setDefaultTimeout: vi.fn(),
        setJavaScriptEnabled: vi.fn(),
        setRequestInterception: vi.fn(),
        on: vi.fn((event: string, fn: (req: any) => void) => {
          if (event === "request") page.requestHandler = fn;
        }),
        setContent: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
        pdf: vi.fn(async () => {
          tracker.current++;
          tracker.peak = Math.max(tracker.peak, tracker.current);
          await new Promise((r) => setTimeout(r, pdfDelayMs));
          tracker.current--;
          if (pdfError) throw pdfError;
          return Buffer.from("%PDF-fake");
        }),
      };
      pages.push(page);
      return page;
    }),
    emit: (event: string) => handlers[event]?.(),
    pages,
  };
  return browser;
}

beforeEach(() => {
  launch.mockReset();
  tracker.current = 0;
  tracker.peak = 0;
});

afterEach(async () => {
  await closeBrowser();
});

describe("browser lifecycle", () => {
  it("launches once and reuses the browser for later exports", async () => {
    launch.mockResolvedValue(makeBrowser());
    await resumeToPdfBuffer(resume);
    await resumeToPdfBuffer(resume);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("launches a fresh browser after Chromium crashes ('disconnected')", async () => {
    const first = makeBrowser();
    const second = makeBrowser();
    launch.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    await resumeToPdfBuffer(resume);
    first.emit("disconnected"); // browser died
    await resumeToPdfBuffer(resume);

    expect(launch).toHaveBeenCalledTimes(2);
    expect(second.newPage).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed launch: the next export tries again", async () => {
    launch.mockRejectedValueOnce(new Error("could not start chrome")).mockResolvedValueOnce(makeBrowser());

    await expect(resumeToPdfBuffer(resume)).rejects.toThrow("could not start chrome");
    await expect(resumeToPdfBuffer(resume)).resolves.toBeInstanceOf(Buffer);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("closeBrowser closes it, and the next export relaunches", async () => {
    const first = makeBrowser();
    launch.mockResolvedValueOnce(first).mockResolvedValueOnce(makeBrowser());

    await resumeToPdfBuffer(resume);
    await closeBrowser();
    expect(first.close).toHaveBeenCalledTimes(1);

    await getBrowser();
    expect(launch).toHaveBeenCalledTimes(2);
  });
});

describe("rendering page", () => {
  it("disables JavaScript and blocks every network request except inline data", async () => {
    const browser = makeBrowser();
    launch.mockResolvedValue(browser);

    await resumeToPdfBuffer(resume);
    const page = browser.pages[0];

    expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(page.setRequestInterception).toHaveBeenCalledWith(true);

    const run = (url: string) => {
      const req = { url: () => url, abort: vi.fn(), continue: vi.fn() };
      page.requestHandler(req);
      return req;
    };
    const internal = run("http://169.254.169.254/latest/meta-data/"); // cloud metadata endpoint
    const file = run("file:///etc/passwd");
    const inline = run("data:text/html;base64,AAAA");

    expect(internal.abort).toHaveBeenCalled();
    expect(file.abort).toHaveBeenCalled();
    expect(inline.continue).toHaveBeenCalled();
  });

  it("applies a timeout to the page", async () => {
    const browser = makeBrowser();
    launch.mockResolvedValue(browser);
    await resumeToPdfBuffer(resume);
    expect(browser.pages[0].setDefaultTimeout).toHaveBeenCalledWith(30_000);
  });

  it("closes the page even when PDF generation fails", async () => {
    const browser = makeBrowser({ pdfError: new Error("render crashed") });
    launch.mockResolvedValue(browser);

    await expect(resumeToPdfBuffer(resume)).rejects.toThrow("render crashed");
    expect(browser.pages[0].close).toHaveBeenCalled();
  });
});

describe("concurrency limit", () => {
  it("runs at most BROWSER_CONCURRENCY (2) pages at once, but completes all exports", async () => {
    launch.mockResolvedValue(makeBrowser({ pdfDelayMs: 15 }));

    const results = await Promise.all(Array.from({ length: 6 }, () => resumeToPdfBuffer(resume)));

    expect(results).toHaveLength(6);
    expect(tracker.peak).toBe(2);
  });

  it("answers 503 instead of queueing without bound", async () => {
    launch.mockResolvedValue(makeBrowser({ pdfDelayMs: 30 }));

    // 2 running + 10 waiting is the most it will hold; the 13th is refused.
    const settled = await Promise.allSettled(Array.from({ length: 13 }, () => resumeToPdfBuffer(resume)));
    const rejected = settled.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.status).toBe(503);
    expect(settled.filter((r) => r.status === "fulfilled")).toHaveLength(12);
  });
});
