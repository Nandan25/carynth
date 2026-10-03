import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import resumeRoutes from "./routes/resumes.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/user", userRoutes);

  // Central error handler
  const errorHandler: ErrorRequestHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  };
  app.use(errorHandler);

  return app;
}

export default createApp();
