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
