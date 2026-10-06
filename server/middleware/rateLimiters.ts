import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  /** Only count requests that ended in an error (e.g. failed logins). */
  failuresOnly?: boolean;
  /** Count per signed-in user instead of per IP (use after `protect`). */
  perUser?: boolean;
}

function createLimiter({ windowMs, limit, message, failuresOnly, perUser }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: !!failuresOnly,
    // Escape hatch for the e2e suite, which registers many users from one IP.
    // Evaluated per request so it can be toggled without re-importing.
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
    ...(perUser
      ? { keyGenerator: (req: Request) => String(req.user?._id ?? req.ip ?? "unknown") }
      : {}),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ message, rateLimited: true });
    },
  });
}

// --- Authentication: slow down credential stuffing / account spam.
// Successful logins don't count, so a real user is never locked out by their
// own good sign-ins; only repeated failures from one IP are throttled.
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  failuresOnly: true,
  message: "Too many failed sign-in attempts. Please try again in about 15 minutes.",
});

export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many accounts created from this network. Please try again later.",
});

export const googleLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many sign-in attempts. Please try again in a few minutes.",
});

// --- Expensive operations (each launches Chromium work), per signed-in user.
export const exportLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  perUser: true,
  message: "You're exporting PDFs very quickly. Please wait a few minutes and try again.",
});

export const importLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  perUser: true,
  message: "You're importing resumes very quickly. Please wait a few minutes and try again.",
});
