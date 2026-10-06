import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

vi.mock("../services/pdfService.js", () => ({
  resumeToPdfBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
  closeBrowser: vi.fn(),
}));

afterEach(() => {
  delete process.env.DISABLE_RATE_LIMIT;
});

async function failedLogin() {
  return request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrong" });
}

// NOTE: the limiter's counter lives for the whole file and is keyed by IP
// (always 127.0.0.1 under supertest). Once the limit is hit, even a good login
// is refused, so the test that exhausts the limit MUST run last in this block.
describe("login rate limiting", () => {
  it("does not count SUCCESSFUL logins, so real users aren't locked out by their own use", async () => {
    await createTestUser({ email: "good@example.com", password: "right-password" });
    for (let i = 0; i < 14; i++) {
      const res = await request(app).post("/api/auth/login").send({ email: "good@example.com", password: "right-password" });
      expect(res.status).toBe(200);
    }
  });

  it("can be switched off for the e2e suite via DISABLE_RATE_LIMIT", async () => {
    process.env.DISABLE_RATE_LIMIT = "true";
    for (let i = 0; i < 14; i++) {
      expect((await failedLogin()).status).toBe(401);
    }
  });

  it("blocks an IP after 10 failed attempts with a 429 and standard headers", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await failedLogin()).status).toBe(401);
    }
    const blocked = await failedLogin();
    expect(blocked.status).toBe(429);
    expect(blocked.body.rateLimited).toBe(true);
    expect(blocked.body.message).toMatch(/too many failed sign-in attempts/i);
    expect(blocked.headers["ratelimit"] ?? blocked.headers["ratelimit-policy"]).toBeDefined();
  });
});

describe("PDF export rate limiting (per user)", () => {
  async function newResume(token: string) {
    return (await request(app).post("/api/resumes").set(authHeader(token)).send({ title: "R" })).body._id;
  }

  it("allows 20 exports, then 429s that user only", async () => {
    const { token } = await createTestUser({ email: "heavy@example.com" });
    const { token: other } = await createTestUser({ email: "light@example.com" });
    const id = await newResume(token);

    for (let i = 0; i < 20; i++) {
      expect((await request(app).get(`/api/resumes/${id}/export`).set(authHeader(token))).status).toBe(200);
    }
    const blocked = await request(app).get(`/api/resumes/${id}/export`).set(authHeader(token));
    expect(blocked.status).toBe(429);

    const otherId = await newResume(other);
    expect((await request(app).get(`/api/resumes/${otherId}/export`).set(authHeader(other))).status).toBe(200);
  });
});
