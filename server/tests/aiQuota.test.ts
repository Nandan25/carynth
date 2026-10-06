import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/User.js";
import { utcDayStart } from "../middleware/aiRateLimiter.js";
import { createTestUser, authHeader } from "./helpers.js";

const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}));

// FREE_TIER_DAILY_AI_LIMIT is 3 (tests/setup.ts)
const LIMIT = 3;

beforeEach(() => {
  mockGenerateContent.mockReset();
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify({ rewritten: "better bullet" }) },
  });
});

const improve = (token: string, body: Record<string, any> = { text: "did stuff" }) =>
  request(app).post("/api/ai/improve-bullet").set(authHeader(token)).send(body);

const usedToday = async (userId: any) => (await User.findById(userId))!.aiUsage.count;

// The refund runs after the response is sent, so poll rather than read once.
const expectUsed = (userId: any, n: number) =>
  vi.waitFor(async () => expect(await usedToday(userId)).toBe(n), { timeout: 2000, interval: 25 });

describe("daily quota is enforced atomically", () => {
  it("lets exactly LIMIT of many simultaneous requests through (no read-modify-write race)", async () => {
    const { user, token } = await createTestUser();

    const results = await Promise.all(Array.from({ length: 10 }, () => improve(token)));
    const ok = results.filter((r) => r.status === 200).length;
    const blocked = results.filter((r) => r.status === 429).length;

    expect(ok).toBe(LIMIT);
    expect(blocked).toBe(10 - LIMIT);
    expect(await usedToday(user._id)).toBe(LIMIT);
  });

  it("does not let the limit be exceeded by a burst on a brand-new day either", async () => {
    const { user, token } = await createTestUser();
    const yesterday = new Date(utcDayStart().getTime() - 60 * 60 * 1000);
    await User.updateOne({ _id: user._id }, { $set: { "aiUsage.count": LIMIT, "aiUsage.resetAt": yesterday } });

    const results = await Promise.all(Array.from({ length: 8 }, () => improve(token)));

    expect(results.filter((r) => r.status === 200).length).toBe(LIMIT);
    expect(await usedToday(user._id)).toBe(LIMIT);
  });

  it("resets the counter on a new UTC day", async () => {
    const { user, token } = await createTestUser();
    const yesterday = new Date(utcDayStart().getTime() - 60 * 60 * 1000);
    await User.updateOne({ _id: user._id }, { $set: { "aiUsage.count": LIMIT, "aiUsage.resetAt": yesterday } });

    expect((await improve(token)).status).toBe(200);

    const after = await User.findById(user._id);
    expect(after!.aiUsage.count).toBe(1);
    expect(after!.aiUsage.resetAt.getTime()).toBeGreaterThanOrEqual(utcDayStart().getTime());
  });

  it("still blocks when the limit is reached today", async () => {
    const { user, token } = await createTestUser();
    await User.updateOne({ _id: user._id }, { $set: { "aiUsage.count": LIMIT, "aiUsage.resetAt": new Date() } });

    const res = await improve(token);

    expect(res.status).toBe(429);
    expect(res.body.limitReached).toBe(true);
    expect(await usedToday(user._id)).toBe(LIMIT); // a refused call is not counted (or refunded) again
  });

  it("copes with an old user document that has no usage record at all", async () => {
    const { user, token } = await createTestUser();
    await User.collection.updateOne({ _id: user._id }, { $unset: { aiUsage: "" } });

    expect((await improve(token)).status).toBe(200);
    expect(await usedToday(user._id)).toBe(1);
  });

  it("never limits admins, and doesn't count their calls", async () => {
    const { user, token } = await createTestUser({ adminUser: true });
    for (let i = 0; i < LIMIT + 3; i++) {
      expect((await improve(token)).status).toBe(200);
    }
    expect(await usedToday(user._id)).toBe(0);
  });
});

describe("failed calls are refunded", () => {
  it("gives the call back when Gemini fails", async () => {
    const { user, token } = await createTestUser();
    mockGenerateContent.mockRejectedValue(new Error("[503 Service Unavailable] model overloaded"));

    expect((await improve(token)).status).toBe(500);
    await expectUsed(user._id, 0);
  });

  it("means a Gemini outage can't use up the whole day's allowance", async () => {
    const { user, token } = await createTestUser();
    mockGenerateContent.mockRejectedValue(new Error("503"));
    for (let i = 0; i < LIMIT + 2; i++) {
      expect((await improve(token)).status).toBe(500); // never 429
      await expectUsed(user._id, 0);
    }

    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({ rewritten: "ok" }) } });
    expect((await improve(token)).status).toBe(200);
  });

  it("refunds when the controller rejects the request (resume not found)", async () => {
    const { user, token } = await createTestUser();
    const missing = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post(`/api/ai/resumes/${missing}/ats-score`)
      .set(authHeader(token))
      .send({ jobDescription: "needs React" });

    expect(res.status).toBe(404);
    await expectUsed(user._id, 0);
  });

  it("keeps the charge for a successful call", async () => {
    const { user, token } = await createTestUser();
    expect((await improve(token)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(await usedToday(user._id)).toBe(1);
  });
});

describe("invalid requests don't touch the quota", () => {
  it("rejects an empty bullet with 400 before the limiter runs", async () => {
    const { user, token } = await createTestUser();
    expect((await improve(token, { text: "   " })).status).toBe(400);
    expect(await usedToday(user._id)).toBe(0);
  });

  it("rejects an oversized job description", async () => {
    const { user, token } = await createTestUser();
    const res = await improve(token, { text: "fine", jobDescription: "x".repeat(20001) });
    expect(res.status).toBe(400);
    expect(await usedToday(user._id)).toBe(0);
  });

  it("rejects an ATS check with no job description", async () => {
    const { user, token } = await createTestUser();
    const id = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/ai/resumes/${id}/ats-score`).set(authHeader(token)).send({});
    expect(res.status).toBe(400);
    expect(await usedToday(user._id)).toBe(0);
  });
});

describe("utcDayStart", () => {
  it("is midnight UTC regardless of the server's timezone", () => {
    expect(utcDayStart(new Date("2026-03-05T23:59:59.999Z")).toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(utcDayStart(new Date("2026-03-06T00:00:00.000Z")).toISOString()).toBe("2026-03-06T00:00:00.000Z");
  });
});
