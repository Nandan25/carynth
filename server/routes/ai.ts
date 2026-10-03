import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { checkAtsScore, improveBullet, summarize } from "../controllers/aiController.js";

const router = Router();

router.use(protect, aiRateLimiter);

router.post("/resumes/:id/ats-score", checkAtsScore);
router.post("/resumes/:id/summary", summarize);
router.post("/improve-bullet", improveBullet);

export default router;
