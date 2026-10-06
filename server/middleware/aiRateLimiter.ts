import type { Request, Response, NextFunction } from "express";
import type { Types } from "mongoose";
import User from "../models/User.js";

/** Start of the current UTC day: the quota window is the same for every server timezone. */
export function utcDayStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const sameDayWithRoom = (userId: Types.ObjectId, limit: number, dayStart: Date) => ({
  _id: userId,
  "aiUsage.resetAt": { $gte: dayStart },
  "aiUsage.count": { $lt: limit },
});

/**
 * Atomically claims one AI call for today. Every check-and-increment is a
 * single conditional update in MongoDB, so concurrent requests can't both read
 * "9 of 10 used" and both succeed (the old read-modify-write allowed that).
 */
async function tryConsume(userId: Types.ObjectId, limit: number, dayStart: Date): Promise<boolean> {
  if (limit < 1) return false;

  // 1) Same day, still under the limit: increment.
  if (await User.findOneAndUpdate(sameDayWithRoom(userId, limit, dayStart), { $inc: { "aiUsage.count": 1 } })) {
    return true;
  }

  // 2) First call of a new day (or a user document with no usage record yet): reset to 1.
  const rolledOver = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { "aiUsage.resetAt": { $lt: dayStart } },
        { "aiUsage.resetAt": { $exists: false } },
        { "aiUsage.resetAt": null },
      ],
    },
    { $set: { "aiUsage.count": 1, "aiUsage.resetAt": new Date() } }
  );
  if (rolledOver) return true;

  // 3) A concurrent request may have just performed the day rollover between
  // our steps 1 and 2; try the increment once more before giving up.
  return !!(await User.findOneAndUpdate(sameDayWithRoom(userId, limit, dayStart), {
    $inc: { "aiUsage.count": 1 },
  }));
}

/** Gives a call back (only if it belongs to the current day's window). */
async function refund(userId: Types.ObjectId, dayStart: Date): Promise<void> {
  await User.updateOne(
    { _id: userId, "aiUsage.resetAt": { $gte: dayStart }, "aiUsage.count": { $gt: 0 } },
    { $inc: { "aiUsage.count": -1 } }
  );
}

/**
 * Users on their own Gemini key (or admins) have unlimited calls. Everyone
 * else is capped at FREE_TIER_DAILY_AI_LIMIT calls per UTC day on the shared
 * key. A call that ends in an error (Gemini outage, validation failure,
 * missing resume...) is refunded, so failures you can't control don't eat the
 * daily allowance. Must run after `protect`, which loads the user.
 */
export async function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized, user not found" });

    const hasOwnKey = user.useOwnKey && !!user.geminiApiKeyEncrypted;
    req.usesOwnKey = hasOwnKey;
    if (hasOwnKey || user.adminUser) return next();

    const limit = Number(process.env.FREE_TIER_DAILY_AI_LIMIT ?? 10);
    const dayStart = utcDayStart();

    if (!(await tryConsume(user._id as Types.ObjectId, limit, dayStart))) {
      return res.status(429).json({
        message: `Daily AI limit reached (${limit}/day) on the shared key. Add your own Gemini key in Settings for unlimited use.`,
        limitReached: true,
      });
    }

    res.once("finish", () => {
      if (res.statusCode >= 400) {
        refund(user._id as Types.ObjectId, dayStart).catch((err) =>
          console.error("aiRateLimiter refund failed:", err.message)
        );
      }
    });
    next();
  } catch (err: any) {
    console.error("aiRateLimiter error:", err.message);
    res.status(500).json({ message: "Rate limiter error" });
  }
}
