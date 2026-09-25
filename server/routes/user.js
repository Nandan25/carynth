import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { setGeminiKey, removeGeminiKey, getUsage } from "../controllers/userController.js";

const router = Router();

router.use(protect);

router.put("/gemini-key", setGeminiKey);
router.delete("/gemini-key", removeGeminiKey);
router.get("/usage", getUsage);

export default router;
