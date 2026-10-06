import { z } from "zod";

// Scalars may legitimately be null/absent (older documents, AI-imported data),
// so accept null and let Mongoose store it as before.
const text = (max: number) => z.string().max(max).nullish();
const list = <T extends z.ZodTypeAny>(item: T, max: number) => z.array(item).max(max);

export const TEMPLATE_IDS = ["classic", "modern", "minimal", "technical"] as const;

const personalInfo = z.object({
  fullName: text(200),
  title: text(200),
  email: text(320),
  phone: text(50),
  location: text(200),
  website: text(500),
  linkedin: text(500),
  github: text(500),
  summary: text(5000),
});

const experience = z.object({
  company: text(200),
  role: text(200),
  location: text(200),
  startDate: text(50),
  endDate: text(50),
  current: z.boolean().nullish(),
  bullets: list(z.string().max(1000), 50).optional(),
});

const education = z.object({
  school: text(200),
  degree: text(200),
  field: text(200),
  location: text(200),
  startDate: text(50),
  endDate: text(50),
  details: text(2000),
});

const project = z.object({
  name: text(200),
  link: text(500),
  description: text(2000),
  bullets: list(z.string().max(1000), 50).optional(),
  tech: list(z.string().max(100), 50).optional(),
});

const certification = z.object({
  name: text(200),
  issuer: text(200),
  date: text(50),
});

/**
 * Fields a client is allowed to change on a resume. Everything else
 * (owner, baseResumeId, lastAtsCheck, timestamps, _id, __v ...) is stripped:
 * the editor sends back the whole document it loaded, and none of those
 * server-managed fields should ever be writable through it.
 */
export const updateResumeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  personalInfo: personalInfo.optional(),
  experience: list(experience, 50).optional(),
  education: list(education, 30).optional(),
  skills: list(z.string().max(100), 100).optional(),
  projects: list(project, 30).optional(),
  certifications: list(certification, 30).optional(),
  jobDescription: z.string().max(20000).optional(),
});

export const createResumeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  personalInfo: personalInfo.optional(),
});

export const tailorResumeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  jobDescription: z.string().max(20000).optional(),
});
