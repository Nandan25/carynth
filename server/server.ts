import "dotenv/config";
import { connectDB } from "./config/db.js";
import { closeBrowser } from "./services/pdfService.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    await closeBrowser();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
