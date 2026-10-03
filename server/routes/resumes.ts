import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { uploadResumePdf } from "../middleware/upload.js";
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

router.get("/", listResumes);
router.post("/", createResume);
router.post("/import", uploadResumePdf, aiRateLimiter, importResume);
router.get("/:id", getResume);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);
router.post("/:id/tailor", tailorResume);
router.get("/:id/export", exportPdf);

export default router;
