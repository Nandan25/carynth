import { z } from "zod";

// Caps keep a single request from sending (and the shared key from paying
// for) an enormous prompt. The 2 MB JSON body limit alone allows far more.
const jobDescription = z.string().max(20000);

export const atsScoreSchema = z.object({
  jobDescription: z.string().trim().min(1).max(20000),
});

export const improveBulletSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  jobDescription: jobDescription.optional(),
});

export const summarySchema = z.object({
  jobDescription: jobDescription.optional(),
});
