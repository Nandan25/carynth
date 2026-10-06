import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("security headers (helmet)", () => {
  it("sets the standard hardening headers and hides the framework", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("keeps cross-origin resource policy open so the SPA can read API responses", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });
});

describe("CORS", () => {
  // CLIENT_URL is http://localhost:5173 in tests/setup.ts

  it("allows the configured frontend origin", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow any other origin (and never answers with a wildcard)", async () => {
    const res = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers a preflight for the allowed origin", async () => {
    const res = await request(app)
      .options("/api/resumes")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "PUT")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(res.status).toBeLessThan(300);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
