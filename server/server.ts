import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { closeBrowser } from "./services/pdfService.js";
import { loadEnv } from "./config/env.js";
import app from "./app.js";

// Fail fast, with every problem listed at once, before connecting to anything.
try {
  loadEnv();
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Shutting down...");

    // Never hang forever on a stuck connection or browser.
    const forceExit = setTimeout(() => process.exit(exitCode || 1), 10_000);
    (forceExit as unknown as NodeJS.Timeout).unref(); // don't keep the loop alive just for this

    // Stop accepting new connections first, then release resources.
    server.close();
    try {
      await closeBrowser();
      await mongoose.connection.close();
    } catch (err) {
      console.error("Error during shutdown:", err);
    }
    process.exit(exitCode);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  // A rejection or exception nobody handled means the process may be in an
  // unknown state: log it with context, then exit cleanly so the platform
  // (Render / Docker) restarts a healthy instance.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
    shutdown(1);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown(1);
  });
});
