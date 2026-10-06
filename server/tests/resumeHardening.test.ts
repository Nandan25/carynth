import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import Resume from "../models/Resume.js";
import User from "../models/User.js";
import { createTestUser, authHeader } from "./helpers.js";

// PDF export launches Chromium; not needed to exercise id validation.
vi.mock("../services/pdfService.js", () => ({
  resumeToPdfBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
  closeBrowser: vi.fn(),
}));

async function createResume(token: string) {
  const res = await request(app)
    .post("/api/resumes")
    .set(authHeader(token))
    .send({ title: "Original", templateId: "classic" });
  return res.body;
}

describe("malformed resume ids", () => {
  const BAD_ID = "not-a-real-id";

  it("returns 400 (not a crash) for every :id route", async () => {
    const { token } = await createTestUser();
    const auth = authHeader(token);

    expect((await request(app).get(`/api/resumes/${BAD_ID}`).set(auth)).status).toBe(400);
    expect((await request(app).put(`/api/resumes/${BAD_ID}`).set(auth).send({ title: "x" })).status).toBe(400);
    expect((await request(app).delete(`/api/resumes/${BAD_ID}`).set(auth)).status).toBe(400);
    expect((await request(app).post(`/api/resumes/${BAD_ID}/tailor`).set(auth).send({})).status).toBe(400);
    expect((await request(app).get(`/api/resumes/${BAD_ID}/export`).set(auth)).status).toBe(400);
  });

  it("keeps serving requests afterwards", async () => {
    const { token } = await createTestUser();
    await request(app).get(`/api/resumes/${BAD_ID}`).set(authHeader(token));
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
  });

  it("rejects a 12-character string that Mongoose would otherwise treat as an ObjectId", async () => {
    const { token } = await createTestUser();
    const res = await request(app).get("/api/resumes/aaaaaaaaaaaa").set(authHeader(token));
    expect(res.status).toBe(400);
  });

  it("rejects a bad id on AI routes WITHOUT using up a daily AI call", async () => {
    const { user, token } = await createTestUser();

    const res = await request(app)
      .post(`/api/ai/resumes/${BAD_ID}/ats-score`)
      .set(authHeader(token))
      .send({ jobDescription: "anything" });
    expect(res.status).toBe(400);

    const after = await User.findById(user._id);
    expect(after!.aiUsage.count).toBe(0);
  });

  it("returns 404 (not 400) for a well-formed id that doesn't exist", async () => {
    const { token } = await createTestUser();
    const missing = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/resumes/${missing}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/resumes/:id only accepts editable fields", () => {
  it("ignores attempts to change owner, baseResumeId and lastAtsCheck", async () => {
    const { user: a, token: tokenA } = await createTestUser({ email: "a-owner@example.com" });
    const { user: b } = await createTestUser({ email: "b-victim@example.com" });
    const resume = await createResume(tokenA);

    const res = await request(app)
      .put(`/api/resumes/${resume._id}`)
      .set(authHeader(tokenA))
      .send({
        title: "Renamed",
        owner: b._id.toString(),
        baseResumeId: new mongoose.Types.ObjectId().toString(),
        lastAtsCheck: { score: 100, notes: "forged" },
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");

    const stored = await Resume.findById(resume._id);
    expect(String(stored!.owner)).toBe(String(a._id));
    expect(stored!.baseResumeId).toBeNull();
    expect(stored!.lastAtsCheck?.score).toBeUndefined();
  });

  it("accepts the full document the editor sends back (server-managed fields are stripped)", async () => {
    const { token } = await createTestUser();
    const created = await createResume(token);
    const loaded = (await request(app).get(`/api/resumes/${created._id}`).set(authHeader(token))).body;

    const res = await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(token))
      .send({ ...loaded, skills: ["TypeScript"] });

    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual(["TypeScript"]);
  });

  it("accepts null scalar values (older / AI-imported documents contain them)", async () => {
    const { token } = await createTestUser();
    const created = await createResume(token);

    const res = await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(token))
      .send({ personalInfo: { fullName: "Jane", phone: null }, experience: [{ company: null, bullets: ["x"] }] });

    expect(res.status).toBe(200);
  });

  it("rejects an unknown template", async () => {
    const { token } = await createTestUser();
    const created = await createResume(token);
    const res = await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(token))
      .send({ templateId: "comic-sans" });
    expect(res.status).toBe(400);
    expect(res.body.issues[0].path).toBe("templateId");
  });

  it("rejects oversized payloads (too many skills, over-long fields)", async () => {
    const { token } = await createTestUser();
    const created = await createResume(token);
    const auth = authHeader(token);

    const tooManySkills = Array.from({ length: 101 }, (_, i) => `skill-${i}`);
    expect((await request(app).put(`/api/resumes/${created._id}`).set(auth).send({ skills: tooManySkills })).status).toBe(400);

    const longSummary = "x".repeat(5001);
    expect(
      (await request(app).put(`/api/resumes/${created._id}`).set(auth).send({ personalInfo: { summary: longSummary } })).status
    ).toBe(400);
  });

  it("rejects an empty title with 400 instead of failing inside Mongoose", async () => {
    const { token } = await createTestUser();
    const created = await createResume(token);
    const res = await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(token))
      .send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when another user tries to update (validation doesn't leak existence)", async () => {
    const { token: owner } = await createTestUser({ email: "o@example.com" });
    const { token: intruder } = await createTestUser({ email: "i@example.com" });
    const created = await createResume(owner);
    const res = await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(intruder))
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/resumes", () => {
  it("rejects an invalid template at creation", async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post("/api/resumes")
      .set(authHeader(token))
      .send({ templateId: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("error handling", () => {
  it("returns 400 for a malformed JSON body instead of a 500", async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post("/api/resumes")
      .set(authHeader(token))
      .set("Content-Type", "application/json")
      .send("{ this is not json");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/malformed json/i);
  });
});
