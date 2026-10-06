import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

vi.mock("../services/pdfTextService.js", () => ({
  extractTextFromPdf: vi.fn(),
  looksLikeScannedPdf: vi.fn(),
}));
vi.mock("../services/ocrService.js", () => ({
  ocrPdfBuffer: vi.fn(),
}));
vi.mock("../services/geminiService.js", () => ({
  parseResumeFromText: vi.fn(),
}));

const { extractTextFromPdf, looksLikeScannedPdf } = await import("../services/pdfTextService.js");
const { ocrPdfBuffer } = await import("../services/ocrService.js");
const { parseResumeFromText } = await import("../services/geminiService.js");

const fakePdf = Buffer.from("%PDF-1.4 fake pdf content");

function attachPdf(req, filename = "resume.pdf", contentType = "application/pdf") {
  return req.attach("resume", fakePdf, { filename, contentType });
}

beforeEach(() => {
  vi.resetAllMocks();
  extractTextFromPdf.mockResolvedValue({ text: "Jane Doe Software Engineer with 5 years experience", numPages: 1 });
  looksLikeScannedPdf.mockReturnValue(false);
  parseResumeFromText.mockResolvedValue({
    personalInfo: { fullName: "Jane Doe", title: "Software Engineer" },
    experience: [],
    education: [],
    skills: ["React"],
    projects: [],
    certifications: [],
  });
});

describe("POST /api/resumes/import", () => {
  it("imports a text-based PDF without needing OCR", async () => {
    const { token } = await createTestUser();
    const res = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));

    expect(res.status).toBe(201);
    expect(res.body.usedOcr).toBe(false);
    expect(res.body.resume.personalInfo.fullName).toBe("Jane Doe");
    expect(res.body.resume.skills).toEqual(["React"]);
    expect(ocrPdfBuffer).not.toHaveBeenCalled();
  });

  it("falls back to OCR when the PDF looks scanned", async () => {
    looksLikeScannedPdf.mockReturnValue(true);
    ocrPdfBuffer.mockResolvedValue("OCR extracted text content for Jane Doe");

    const { token } = await createTestUser();
    const res = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));

    expect(res.status).toBe(201);
    expect(res.body.usedOcr).toBe(true);
    expect(ocrPdfBuffer).toHaveBeenCalledTimes(1);
    expect(parseResumeFromText).toHaveBeenCalledWith(
      expect.anything(),
      "OCR extracted text content for Jane Doe"
    );
  });

  it("returns 422 when OCR still can't extract readable text", async () => {
    looksLikeScannedPdf.mockReturnValue(true);
    ocrPdfBuffer.mockResolvedValue("   ");

    const { token } = await createTestUser();
    const res = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));

    expect(res.status).toBe(422);
    expect(parseResumeFromText).not.toHaveBeenCalled();
  });

  it("rejects a non-PDF file", async () => {
    const { token } = await createTestUser();
    const res = await attachPdf(
      request(app).post("/api/resumes/import").set(authHeader(token)),
      "resume.txt",
      "text/plain"
    );
    expect(res.status).toBe(400);
  });

  it("rejects a request with no file attached", async () => {
    const { token } = await createTestUser();
    const res = await request(app).post("/api/resumes/import").set(authHeader(token));
    expect(res.status).toBe(400);
  });

  it("creates the imported resume owned by the importing user", async () => {
    const { token, user } = await createTestUser();
    const res = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));
    expect(res.body.resume.owner).toBe(String(user._id));
  });

  it("counts against the shared-key daily AI limit, like other AI features", async () => {
    const { token } = await createTestUser();
    for (let i = 0; i < 3; i++) {
      const r = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));
      expect(r.status).toBe(201);
    }
    const blocked = await attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));
    expect(blocked.status).toBe(429);
  });
});

describe("POST /api/resumes/import: upload hardening", () => {
  const post = (token: string) => request(app).post("/api/resumes/import").set(authHeader(token));

  it("rejects a file that CLAIMS to be a PDF but isn't", async () => {
    const { token } = await createTestUser();
    const res = await post(token).attach("resume", Buffer.from("just some plain text, not a pdf"), {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid pdf/i);
    expect(extractTextFromPdf).not.toHaveBeenCalled();
  });

  it("accepts a PDF whose header is preceded by a little junk", async () => {
    const { token } = await createTestUser();
    const res = await post(token).attach("resume", Buffer.concat([Buffer.from("\n\n  "), fakePdf]), {
      filename: "resume.pdf",
      contentType: "application/pdf",
    });
    expect(res.status).toBe(201);
  });

  it("answers 413 for a file over the 8 MB limit", async () => {
    const { token } = await createTestUser();
    const tooBig = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(8 * 1024 * 1024 + 1024)]);
    const res = await post(token).attach("resume", tooBig, { filename: "big.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/too large/i);
  });

  it("does not spend an AI call on a rejected upload", async () => {
    const { user, token } = await createTestUser();
    await post(token).attach("resume", Buffer.from("not a pdf"), { filename: "a.pdf", contentType: "application/pdf" });
    const fresh = await (await import("../models/User.js")).default.findById(user._id);
    expect(fresh!.aiUsage.count).toBe(0);
  });
});

describe("POST /api/resumes/import: failure modes", () => {
  const upload = (token: string) => attachPdf(request(app).post("/api/resumes/import").set(authHeader(token)));

  it("returns the server-busy message with a 503 when the browser queue is full", async () => {
    looksLikeScannedPdf.mockReturnValue(true);
    ocrPdfBuffer.mockRejectedValue(
      Object.assign(new Error("The server is busy right now. Please try again in a moment."), { status: 503 })
    );
    const { token } = await createTestUser();

    const res = await upload(token);

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/busy/i);
  });

  it("returns a readable 504 when OCR times out", async () => {
    looksLikeScannedPdf.mockReturnValue(true);
    ocrPdfBuffer.mockRejectedValue(
      Object.assign(new Error("Reading this PDF took too long. Try a shorter or clearer file."), { status: 504 })
    );
    const { token } = await createTestUser();

    const res = await upload(token);

    expect(res.status).toBe(504);
    expect(res.body.message).toMatch(/took too long/i);
  });

  it("hides internal error details behind a generic message for unexpected failures", async () => {
    parseResumeFromText.mockRejectedValue(new Error("[GoogleGenerativeAI Error] 503 model overloaded"));
    const { token } = await createTestUser();

    const res = await upload(token);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Resume import failed");
  });

  it("refunds the daily AI call when the import fails", async () => {
    parseResumeFromText.mockRejectedValue(new Error("503"));
    const { user, token } = await createTestUser();
    const User = (await import("../models/User.js")).default;

    await upload(token);

    await vi.waitFor(async () => expect((await User.findById(user._id))!.aiUsage.count).toBe(0), {
      timeout: 2000,
      interval: 25,
    });
  });

  it("caps the text sent to Gemini so a huge PDF can't create a huge prompt", async () => {
    extractTextFromPdf.mockResolvedValue({ text: "a".repeat(100_000), numPages: 3 });
    const { token } = await createTestUser();

    await upload(token);

    const sentText = parseResumeFromText.mock.calls[0][1] as string;
    expect(sentText.length).toBe(40_000);
  });
});
