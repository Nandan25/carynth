import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createTestUser, authHeader } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("jane@example.com");
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects registration with a missing field", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "jane@example.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Jane Doe",
      email: "dup@example.com",
      password: "password123",
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "Jane Doe 2",
      email: "dup@example.com",
      password: "password456",
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    await createTestUser({ email: "login@example.com", password: "correct-password" });
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "correct-password",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects an incorrect password", async () => {
    await createTestUser({ email: "login2@example.com", password: "correct-password" });
    const res = await request(app).post("/api/auth/login").send({
      email: "login2@example.com",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("rejects a nonexistent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "whatever",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user when authenticated", async () => {
    const { user, token } = await createTestUser({ name: "Me User" });
    const res = await request(app).get("/api/auth/me").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it("rejects a missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    const res = await request(app).get("/api/auth/me").set(authHeader("not-a-real-token"));
    expect(res.status).toBe(401);
  });
});
