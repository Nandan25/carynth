import { beforeAll, afterEach, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Test env vars — set before any app code reads them. Nothing in the app
// reads these at import time (only inside request handlers), so setting
// them here is safe even though app.js is imported by test files after this
// setup file runs.
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ENCRYPTION_KEY = "0".repeat(64); // 32-byte hex, test-only
process.env.GEMINI_API_KEY = "test-shared-gemini-key";
process.env.FREE_TIER_DAILY_AI_LIMIT = "3";
process.env.CLIENT_URL = "http://localhost:5173";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  // Reset all collections between tests so each test starts clean
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
