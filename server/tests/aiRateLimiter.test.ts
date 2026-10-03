import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

// Mock the Gemini SDK so ai routes resolve instantly without a real call.
const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}));

beforeEach(() => {
  mockGenerateContent.mockReset();
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify({ rewritten: "An improved bullet point" }) },
  });
});

// FREE_TIER_DAILY_AI_LIMIT is set to 3 in tests/setup.js
describe("AI rate limiting on the shared key", () => {
  it("allows calls up to the daily limit", async () => {
    const { token } = await createTestUser();

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/ai/improve-bullet")
        .set(authHeader(token))
        .send({ text: "did some stuff" });
      expect(res.status).toBe(200);
    }
  });

  it("blocks the call once the daily limit is exceeded", async () => {
    const { token } = await createTestUser();

    for (let i = 0; i < 3; i++) {
      await request(app).post("/api/ai/improve-bullet").set(authHeader(token)).send({ text: "did some stuff" });
    }

    const res = await request(app)
      .post("/api/ai/improve-bullet")
      .set(authHeader(token))
      .send({ text: "one call too many" });

    expect(res.status).toBe(429);
    expect(res.body.limitReached).toBe(true);
  });

  it("does not let one user's usage affect another user's limit", async () => {
    const { token: tokenA } = await createTestUser({ email: "limitA@example.com" });
    const { token: tokenB } = await createTestUser({ email: "limitB@example.com" });

    for (let i = 0; i < 3; i++) {
      await request(app).post("/api/ai/improve-bullet").set(authHeader(tokenA)).send({ text: "x" });
    }

    const res = await request(app).post("/api/ai/improve-bullet").set(authHeader(tokenB)).send({ text: "x" });
    expect(res.status).toBe(200);
  });
});

describe("AI rate limiting bypass with a user's own key", () => {
  it("allows unlimited calls once useOwnKey is enabled with a saved key", async () => {
    const { token } = await createTestUser();

    // Save + enable a personal Gemini key via the settings endpoint
    const setKey = await request(app)
      .put("/api/user/gemini-key")
      .set(authHeader(token))
      .send({ apiKey: "my-own-gemini-key", useOwnKey: true });
    expect(setKey.status).toBe(200);
    expect(setKey.body.useOwnKey).toBe(true);

    // Exceed what would normally be the shared-key daily limit (3)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/ai/improve-bullet")
        .set(authHeader(token))
        .send({ text: "did some stuff" });
      expect(res.status).toBe(200);
    }
  });

  it("actually uses the user's own key for the Gemini call (not just bypassing the rate limiter)", async () => {
    const { token } = await createTestUser();
    await request(app)
      .put("/api/user/gemini-key")
      .set(authHeader(token))
      .send({ apiKey: "my-own-gemini-key-xyz", useOwnKey: true });

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    GoogleGenerativeAI.mockClear();

    await request(app)
      .post("/api/ai/improve-bullet")
      .set(authHeader(token))
      .send({ text: "did some stuff" });

    // This is the actual regression check: req.user (set by the `protect`
    // middleware) must carry the decrypted-able key field all the way
    // through to the Gemini service call, not just satisfy the rate limiter.
    expect(GoogleGenerativeAI).toHaveBeenCalledWith("my-own-gemini-key-xyz");
  });

  it("rejects enabling useOwnKey before any key has been saved", async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .put("/api/user/gemini-key")
      .set(authHeader(token))
      .send({ useOwnKey: true });
    expect(res.status).toBe(400);
  });
});
