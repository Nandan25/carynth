import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// authController builds its OAuth client at import time, only if this is set.
const verifyIdToken = vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  return vi.fn();
});

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken })),
}));

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { createTestUser } = await import("./helpers.js");

function googlePayload(overrides: Record<string, any> = {}) {
  return {
    sub: "google-sub-123",
    email: "person@example.com",
    email_verified: true,
    name: "Pat Person",
    picture: "https://example.com/p.png",
    ...overrides,
  };
}

function loginWith(payload: Record<string, any> | null) {
  verifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });
  return request(app).post("/api/auth/google").send({ credential: "fake-id-token" });
}

beforeEach(() => {
  verifyIdToken.mockReset();
});

describe("POST /api/auth/google", () => {
  it("creates an account for a new, verified Google user and returns a token", async () => {
    const res = await loginWith(googlePayload());

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("person@example.com");

    const stored = await User.findOne({ email: "person@example.com" });
    expect(stored!.googleId).toBe("google-sub-123");
  });

  it("normalises the email to lowercase", async () => {
    await loginWith(googlePayload({ email: "MiXeD@Example.COM" }));
    expect(await User.findOne({ email: "mixed@example.com" })).not.toBeNull();
  });

  it("rejects a Google account whose email is not verified", async () => {
    const res = await loginWith(googlePayload({ email_verified: false }));
    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it("rejects a token with no email at all", async () => {
    const res = await loginWith(googlePayload({ email: undefined }));
    expect(res.status).toBe(401);
  });

  it("signs the same Google user in again without creating a duplicate", async () => {
    await loginWith(googlePayload());
    const second = await loginWith(googlePayload());

    expect(second.status).toBe(200);
    expect(await User.countDocuments({ googleId: "google-sub-123" })).toBe(1);
  });

  it("REFUSES to link Google to an existing account that has a password (pre-hijacking defence)", async () => {
    // An attacker registered the victim's address with a password of their own.
    await createTestUser({ email: "victim@example.com", password: "attacker-chosen-password" });

    const res = await loginWith(googlePayload({ sub: "victim-google-sub", email: "victim@example.com" }));

    expect(res.status).toBe(409);
    expect(res.body.token).toBeUndefined();

    const stored = await User.findOne({ email: "victim@example.com" });
    expect(stored!.googleId).toBeUndefined();
  });

  it("still lets the password owner sign in normally after a refused link", async () => {
    await createTestUser({ email: "owner@example.com", password: "correct-password" });
    await loginWith(googlePayload({ sub: "x", email: "owner@example.com" }));

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@example.com", password: "correct-password" });
    expect(login.status).toBe(200);
  });

  it("links to an existing account that has no password and no Google id", async () => {
    await User.create({ name: "No Password", email: "nopass@example.com" });

    const res = await loginWith(googlePayload({ sub: "link-me", email: "nopass@example.com" }));

    expect(res.status).toBe(200);
    const stored = await User.findOne({ email: "nopass@example.com" });
    expect(stored!.googleId).toBe("link-me");
  });

  it("returns 400 when no credential is supplied", async () => {
    const res = await request(app).post("/api/auth/google").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 when Google rejects the token", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("Invalid token signature"));
    const res = await request(app).post("/api/auth/google").send({ credential: "bad" });
    expect(res.status).toBe(401);
  });
});
