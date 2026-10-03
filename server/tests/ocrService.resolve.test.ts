import { describe, it, expect } from "vitest";
import fs from "fs";
import { resolvePdfJsBuild } from "../services/ocrService.js";

// Deliberately NOT mocked — this checks against the real, installed
// pdfjs-dist package on disk. The point is to catch exactly the class of
// bug that slipped through before: a hardcoded build path that doesn't
// match what the installed package version actually ships.
describe("resolvePdfJsBuild (real filesystem check)", () => {
  it("finds an existing pdfjs-dist browser build file", () => {
    const resolvedPath = resolvePdfJsBuild();
    expect(fs.existsSync(resolvedPath)).toBe(true);
  });

  it("the resolved file is non-empty", () => {
    const resolvedPath = resolvePdfJsBuild();
    const stats = fs.statSync(resolvedPath);
    expect(stats.size).toBeGreaterThan(1000);
  });
});
