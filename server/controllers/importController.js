import Resume from "../models/Resume.js";
import { extractTextFromPdf, looksLikeScannedPdf } from "../services/pdfTextService.js";
import { ocrPdfBuffer } from "../services/ocrService.js";
import { parseResumeFromText } from "../services/geminiService.js";

export async function importResume(req, res) {
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

    const parsed = await parseResumeFromText(req.user, rawText);

    const resume = await Resume.create({
      owner: req.user._id,
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
  } catch (err) {
    res.status(500).json({ message: "Resume import failed", error: err.message });
  }
}
