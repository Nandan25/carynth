import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { parseOrigins } from "./config/env.js";

import authRoutes from "./routes/auth.js";
import resumeRoutes from "./routes/resumes.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";

export function createApp(): Express {
  const app = express();

  // Hops of reverse proxy in front of us (Render = 1). Needed so req.ip, and
  // therefore the rate limiters, see the real client address, and only that
  // many X-Forwarded-For entries are trusted so the header can't be spoofed.
  const isProd = process.env.NODE_ENV === "production";
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? (isProd ? 1 : 0)));

  // Security headers. CORP stays cross-origin so the SPA on another origin can
  // read API responses (including the PDF download).
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // Never fall back to "*": allow only the configured frontend origin(s). In
  // production loadEnv() refuses to start without CLIENT_URL; the localhost
  // default is for local development only.
  const origins = parseOrigins(process.env.CLIENT_URL);
  app.use(cors({ origin: origins.length > 0 ? origins : "http://localhost:5173" }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/user", userRoutes);

  // Central error handler. Translates the errors that are really the client's
  // fault (malformed JSON, bad ids, schema validation) into 4xx responses
  // instead of 500s, and hides internals of genuine server errors in production.
  const errorHandler: ErrorRequestHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    let status: number = err.status || err.statusCode || 500;
    let message: string = err.message || "Server error";

    if (err.type === "entity.parse.failed") {
      status = 400;
      message = "Malformed JSON body";
    } else if (err.type === "entity.too.large") {
      status = 413;
      message = "Request body too large";
    } else if (err.name === "CastError") {
      status = 400;
      message = "Invalid identifier";
    } else if (err.name === "ValidationError") {
      status = 400;
    }

    if (status >= 500) {
      console.error(err);
      if (process.env.NODE_ENV === "production") message = "Server error";
    }
    res.status(status).json({ message });
  };
  app.use(errorHandler);

  return app;
}

export default createApp();
