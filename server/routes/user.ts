import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { setGeminiKey, removeGeminiKey, getUsage } from "../controllers/userController.js";

const router = Router();

router.use(protect);

router.put("/gemini-key", asyncHandler(setGeminiKey));
router.delete("/gemini-key", asyncHandler(removeGeminiKey));
router.get("/usage", asyncHandler(getUsage));

export default router;
