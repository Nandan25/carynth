import { Router } from "express";
import { register, login, googleLogin, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginLimiter, registerLimiter, googleLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/register", registerLimiter, asyncHandler(register));
router.post("/login", loginLimiter, asyncHandler(login));
router.post("/google", googleLimiter, asyncHandler(googleLogin));
router.get("/me", protect, asyncHandler(getMe));

export default router;
