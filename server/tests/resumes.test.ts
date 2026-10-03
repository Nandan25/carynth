import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

// PDF generation launches real Chromium via Puppeteer — mock it so export
// tests run fast and don't need a browser installed in CI.
vi.mock("../services/pdfService.js", () => ({
  resumeToPdfBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
  closeBrowser: vi.fn(),
}));

async function createResumeFor(token, overrides = {}) {
  const res = await request(app)
    .post("/api/resumes")
    .set(authHeader(token))
    .send({ title: "My Resume", templateId: "classic", ...overrides });
  return res.body;
}

describe("Resume CRUD", () => {
  it("creates a resume for the authenticated user", async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post("/api/resumes")
      .set(authHeader(token))
      .send({ title: "New Resume", templateId: "modern" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Resume");
    expect(res.body.templateId).toBe("modern");
  });

  it("lists only the current user's resumes", async () => {
    const { token: tokenA } = await createTestUser({ email: "a@example.com" });
    const { token: tokenB } = await createTestUser({ email: "b@example.com" });

    await createResumeFor(tokenA, { title: "A1" });
    await createResumeFor(tokenA, { title: "A2" });
    await createResumeFor(tokenB, { title: "B1" });

    const res = await request(app).get("/api/resumes").set(authHeader(tokenA));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((r) => r.title).sort()).toEqual(["A1", "A2"]);
  });

  it("updates a resume's fields", async () => {
    const { token } = await createTestUser();
    const resume = await createResumeFor(token);

    const res = await request(app)
      .put(`/api/resumes/${resume._id}`)
      .set(authHeader(token))
      .send({ skills: ["React", "Node.js"] });

    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual(["React", "Node.js"]);
  });

  it("deletes a resume", async () => {
    const { token } = await createTestUser();
    const resume = await createResumeFor(token);

    const del = await request(app).delete(`/api/resumes/${resume._id}`).set(authHeader(token));
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/resumes/${resume._id}`).set(authHeader(token));
    expect(get.status).toBe(404);
  });
});

describe("Resume ownership isolation", () => {
  it("prevents one user from reading another user's resume", async () => {
    const { token: owner } = await createTestUser({ email: "owner@example.com" });
    const { token: intruder } = await createTestUser({ email: "intruder@example.com" });
    const resume = await createResumeFor(owner);

    const res = await request(app).get(`/api/resumes/${resume._id}`).set(authHeader(intruder));
    expect(res.status).toBe(404);
  });

  it("prevents one user from updating another user's resume", async () => {
    const { token: owner } = await createTestUser({ email: "owner2@example.com" });
    const { token: intruder } = await createTestUser({ email: "intruder2@example.com" });
    const resume = await createResumeFor(owner);

    const res = await request(app)
      .put(`/api/resumes/${resume._id}`)
      .set(authHeader(intruder))
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);
  });

  it("prevents one user from deleting another user's resume", async () => {
    const { token: owner } = await createTestUser({ email: "owner3@example.com" });
    const { token: intruder } = await createTestUser({ email: "intruder3@example.com" });
    const resume = await createResumeFor(owner);

    const res = await request(app).delete(`/api/resumes/${resume._id}`).set(authHeader(intruder));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/resumes/:id/tailor", () => {
  it("forks a resume into a new tailored copy referencing the original", async () => {
    const { token } = await createTestUser();
    const created = await createResumeFor(token);
    // createResume only accepts title/templateId/personalInfo at creation
    // time (matching the real frontend flow); set skills via update.
    await request(app)
      .put(`/api/resumes/${created._id}`)
      .set(authHeader(token))
      .send({ skills: ["SQL"] });
    const resume = { ...created, skills: ["SQL"] };

    const res = await request(app)
      .post(`/api/resumes/${resume._id}/tailor`)
      .set(authHeader(token))
      .send({ title: "Tailored for Acme", jobDescription: "Looking for a SQL expert" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Tailored for Acme");
    expect(res.body.baseResumeId).toBe(resume._id);
    expect(res.body.skills).toEqual(["SQL"]);
    expect(res.body._id).not.toBe(resume._id);
  });
});

describe("GET /api/resumes/:id/export", () => {
  it("returns a PDF buffer for an owned resume", async () => {
    const { token } = await createTestUser();
    const resume = await createResumeFor(token);

    const res = await request(app).get(`/api/resumes/${resume._id}/export`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});
