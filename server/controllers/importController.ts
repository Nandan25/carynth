import type { Request, Response } from "express";
import Resume from "../models/Resume.js";
import { extractTextFromPdf, looksLikeScannedPdf } from "../services/pdfTextService.js";
import { ocrPdfBuffer } from "../services/ocrService.js";
import { parseResumeFromText } from "../services/geminiService.js";

const MAX_IMPORT_CHARS = 40_000;

export async function importResume(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded (expected field name 'resume')" });
    }

    const { text, numPages } = await extractTextFromPdf(req.file.buffer);
    let rawText = text;
    let usedOcr = false;

    if (looksLikeScannedPdf(text, numPages)) {
      usedOcr = true;
      rawText = await ocrPdfBuffer(req.file.buffer, { maxPages: 3 });

      if (!rawText || rawText.trim().length < 20) {
        return res.status(422).json({
          message:
            "Couldn't extract readable text from this PDF, even with OCR. Try a clearer scan or a text-based export.",
        });
      }
    }

    // A long PDF would otherwise become a very large (and expensive) prompt.
    const parsed = await parseResumeFromText(req.user!, rawText.slice(0, MAX_IMPORT_CHARS));

    const resume = await Resume.create({
      owner: req.user!._id,
      title: parsed.personalInfo?.fullName ? `${parsed.personalInfo.fullName}'s Resume` : "Imported Resume",
      templateId: "classic",
      personalInfo: parsed.personalInfo,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      projects: parsed.projects,
      certifications: parsed.certifications,
    });

    res.status(201).json({ resume, usedOcr, usesOwnKey: req.usesOwnKey });
  } catch (err: any) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    // 503 (busy) / 504 (timeout) carry a message that is safe and useful to show.
    const message = status === 503 || status === 504 ? err.message : "Resume import failed";
    res.status(status).json({ message, error: err.message });
  }
}
