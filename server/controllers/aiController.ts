import type { Request, Response } from "express";
import Resume from "../models/Resume.js";
import { scoreAts, rewriteBullet, generateSummary } from "../services/geminiService.js";

export async function checkAtsScore(req: Request, res: Response) {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription?.trim()) {
      return res.status(400).json({ message: "jobDescription is required" });
    }
    const resume = await Resume.findOne({ _id: req.params.id, owner: req.user!._id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const result = await scoreAts(req.user!, resume, jobDescription);

    resume.jobDescription = jobDescription;
    resume.lastAtsCheck = {
      score: result.score,
      missingKeywords: result.missingKeywords,
      notes: result.notes,
      checkedAt: new Date(),
    };
    await resume.save();

    res.json({ ...result, usesOwnKey: req.usesOwnKey });
  } catch (err: any) {
    res.status(500).json({ message: "ATS scoring failed", error: err.message });
  }
}

export async function improveBullet(req: Request, res: Response) {
  try {
    const { text, jobDescription } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required" });

    const rewritten = await rewriteBullet(req.user!, text, jobDescription || "");
    res.json({ rewritten, usesOwnKey: req.usesOwnKey });
  } catch (err: any) {
    res.status(500).json({ message: "Bullet rewrite failed", error: err.message });
  }
}

export async function summarize(req: Request, res: Response) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, owner: req.user!._id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const summary = await generateSummary(req.user!, resume, req.body.jobDescription || "");
    res.json({ summary, usesOwnKey: req.usesOwnKey });
  } catch (err: any) {
    res.status(500).json({ message: "Summary generation failed", error: err.message });
  }
}
