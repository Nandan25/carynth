import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { atsScoreSchema, improveBulletSchema, summarySchema } from "../validation/aiSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAtsScore, improveBullet, summarize } from "../controllers/aiController.js";

const router = Router();

router.use(protect);

// router.param runs before the matched route's handlers, and validateBody runs
// before aiRateLimiter, so malformed requests are rejected (400) without
// burning a daily AI call.
router.param("id", validateObjectIdParam);

router.post("/resumes/:id/ats-score", validateBody(atsScoreSchema), aiRateLimiter, asyncHandler(checkAtsScore));
router.post("/resumes/:id/summary", validateBody(summarySchema), aiRateLimiter, asyncHandler(summarize));
router.post("/improve-bullet", validateBody(improveBulletSchema), aiRateLimiter, asyncHandler(improveBullet));

export default router;
