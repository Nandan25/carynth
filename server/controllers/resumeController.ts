import type { Request, Response } from "express";
import Resume from "../models/Resume.js";
import { resumeToPdfBuffer } from "../services/pdfService.js";

export async function listResumes(req: Request, res: Response) {
  const resumes = await Resume.find({ owner: req.user!._id })
    .sort({ updatedAt: -1 })
    .select("title templateId updatedAt createdAt baseResumeId lastAtsCheck personalInfo.fullName personalInfo.title");
  res.json(resumes);
}

export async function getResume(req: Request, res: Response) {
  const resume = await Resume.findOne({ _id: req.params.id, owner: req.user!._id });
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  res.json(resume);
}

export async function createResume(req: Request, res: Response) {
  const resume = await Resume.create({
    owner: req.user!._id,
    title: req.body.title || "Untitled Resume",
    templateId: req.body.templateId || "classic",
    personalInfo: req.body.personalInfo || {},
  });
  res.status(201).json(resume);
}

export async function updateResume(req: Request, res: Response) {
  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.id, owner: req.user!._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  res.json(resume);
}

export async function deleteResume(req: Request, res: Response) {
  const resume = await Resume.findOneAndDelete({ _id: req.params.id, owner: req.user!._id });
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  res.json({ message: "Resume deleted" });
}

/** Forks a resume into a new tailored copy for a specific job application. */
export async function tailorResume(req: Request, res: Response) {
  const source = await Resume.findOne({ _id: req.params.id, owner: req.user!._id });
  if (!source) return res.status(404).json({ message: "Resume not found" });

  const clone: any = source.toObject();
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  delete clone.lastAtsCheck;

  const tailored = await Resume.create({
    ...clone,
    title: req.body.title || `${source.title} (Tailored)`,
    baseResumeId: source._id,
    jobDescription: req.body.jobDescription || "",
  });

  res.status(201).json(tailored);
}

export async function exportPdf(req: Request, res: Response) {
  const resume = await Resume.findOne({ _id: req.params.id, owner: req.user!._id });
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  try {
    const pdfBuffer = await resumeToPdfBuffer(resume);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(resume.title || "resume").replace(/[^a-z0-9-_]+/gi, "_")}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    const message = status === 503 ? err.message : "PDF export failed";
    res.status(status).json({ message, error: err.message });
  }
}
