import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  tailorResume,
  exportPdf,
} from "../controllers/resumeController.js";

const router = Router();

router.use(protect);

router.get("/", listResumes);
router.post("/", createResume);
router.get("/:id", getResume);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);
router.post("/:id/tailor", tailorResume);
router.get("/:id/export", exportPdf);

export default router;
