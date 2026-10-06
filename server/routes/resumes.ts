import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { uploadResumePdf } from "../middleware/upload.js";
import { exportLimiter, importLimiter } from "../middleware/rateLimiters.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createResumeSchema,
  tailorResumeSchema,
  updateResumeSchema,
} from "../validation/resumeSchemas.js";
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  tailorResume,
  exportPdf,
} from "../controllers/resumeController.js";
import { importResume } from "../controllers/importController.js";

const router = Router();

router.use(protect);

// Runs for every route below that has an :id segment.
router.param("id", validateObjectIdParam);

router.get("/", asyncHandler(listResumes));
router.post("/", validateBody(createResumeSchema), asyncHandler(createResume));
router.post("/import", importLimiter, uploadResumePdf, aiRateLimiter, asyncHandler(importResume));
router.get("/:id", asyncHandler(getResume));
router.put("/:id", validateBody(updateResumeSchema), asyncHandler(updateResume));
router.delete("/:id", asyncHandler(deleteResume));
router.post("/:id/tailor", validateBody(tailorResumeSchema), asyncHandler(tailorResume));
router.get("/:id/export", exportLimiter, asyncHandler(exportPdf));

export default router;
