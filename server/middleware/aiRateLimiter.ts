import type { Request, Response, NextFunction } from "express";
import User from "../models/User.js";

const DAILY_LIMIT = Number(process.env.FREE_TIER_DAILY_AI_LIMIT || 10);

/**
 * Users on their own Gemini key (or admins) have unlimited calls. Users on
 * the app's shared key are capped at DAILY_LIMIT calls/day. Must run after
 * `protect`.
 */
export async function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!._id).select(
      "+geminiApiKeyEncrypted useOwnKey aiUsage adminUser"
    );
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    const hasOwnKey = user.useOwnKey && !!user.geminiApiKeyEncrypted;
    const adminUser = user.adminUser || false;
    req.usesOwnKey = hasOwnKey;

    if (hasOwnKey || adminUser) {
      return next();
    }

    // Reset the counter if the last reset was on a previous day
    const now = new Date();
    const resetAt = user.aiUsage?.resetAt ? new Date(user.aiUsage.resetAt) : now;
    const isNewDay = now.toDateString() !== resetAt.toDateString();

    if (isNewDay) {
      user.aiUsage.count = 0;
      user.aiUsage.resetAt = now;
    }

    if (user.aiUsage.count >= DAILY_LIMIT) {
      return res.status(429).json({
        message: `Daily AI limit reached (${DAILY_LIMIT}/day) on the shared key. Add your own Gemini key in Settings for unlimited use.`,
        limitReached: true,
      });
    }

    user.aiUsage.count += 1;
    await user.save();
    next();
  } catch (err: any) {
    console.error("aiRateLimiter error:", err.message);
    res.status(500).json({ message: "Rate limiter error" });
  }
}
