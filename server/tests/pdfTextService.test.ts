import { describe, it, expect } from "vitest";
import { looksLikeScannedPdf } from "../services/pdfTextService.js";

describe("looksLikeScannedPdf", () => {
  it("flags empty text as scanned", () => {
    expect(looksLikeScannedPdf("", 1)).toBe(true);
  });

  it("flags very short text as scanned", () => {
    expect(looksLikeScannedPdf("Resume", 1)).toBe(true);
  });

  it("does not flag normal resume text as scanned", () => {
    const text = "Jane Doe Software Engineer with experience in React and Node.js building web applications. ".repeat(
      3
    );
    expect(looksLikeScannedPdf(text, 1)).toBe(false);
  });

  it("accounts for page count when judging text density", () => {
    const shortTextSpreadOverManyPages = "Jane Doe ".repeat(5);
    expect(looksLikeScannedPdf(shortTextSpreadOverManyPages, 5)).toBe(true);
  });
});
