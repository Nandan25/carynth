import { describe, it, expect } from "vitest";
import { parseEnv, loadEnv, parseOrigins } from "../config/env.js";

const GOOD = {
  MONGO_URI: "mongodb://localhost:27017/app",
  JWT_SECRET: "x".repeat(32),
  ENCRYPTION_KEY: "ab".repeat(32),
  GEMINI_API_KEY: "key",
  CLIENT_URL: "https://app.example.com",
};

describe("parseEnv", () => {
  it("accepts a complete production config with no problems", () => {
    const { problems, env } = parseEnv({ ...GOOD, NODE_ENV: "production" });
    expect(problems).toEqual([]);
    expect(env.clientOrigins).toEqual(["https://app.example.com"]);
    expect(env.trustProxyHops).toBe(1); // behind Render's proxy by default in production
  });

  it("lists EVERY problem at once, not just the first", () => {
    const { problems } = parseEnv({ NODE_ENV: "production" });
    const text = problems.join("\n");
    expect(text).toMatch(/MONGO_URI/);
    expect(text).toMatch(/JWT_SECRET/);
    expect(text).toMatch(/ENCRYPTION_KEY/);
    expect(text).toMatch(/CLIENT_URL/);
  });

  it("requires a longer JWT secret in production than in development", () => {
    const short = "s".repeat(20);
    expect(parseEnv({ ...GOOD, NODE_ENV: "production", JWT_SECRET: short }).problems.join()).toMatch(/JWT_SECRET/);
    expect(parseEnv({ ...GOOD, NODE_ENV: "development", JWT_SECRET: short }).problems).toEqual([]);
  });

  it("rejects an ENCRYPTION_KEY that is not 64 hex characters (production)", () => {
    for (const bad of ["too-short", "z".repeat(64), "ab".repeat(31)]) {
      const { problems } = parseEnv({ ...GOOD, NODE_ENV: "production", ENCRYPTION_KEY: bad });
      expect(problems.join()).toMatch(/ENCRYPTION_KEY/);
    }
  });

  it("only warns about a bad ENCRYPTION_KEY outside production so a fresh clone still boots", () => {
    const { problems, warnings } = parseEnv({ ...GOOD, NODE_ENV: "development", ENCRYPTION_KEY: "replace_me" });
    expect(problems).toEqual([]);
    expect(warnings.join()).toMatch(/ENCRYPTION_KEY/);
  });

  it("rejects a MONGO_URI that isn't a MongoDB connection string", () => {
    expect(parseEnv({ ...GOOD, MONGO_URI: "http://localhost" }).problems.join()).toMatch(/MONGO_URI/);
  });

  it("requires CLIENT_URL in production but not in development", () => {
    const { CLIENT_URL: _omit, ...withoutClient } = GOOD;
    expect(parseEnv({ ...withoutClient, NODE_ENV: "production" }).problems.join()).toMatch(/CLIENT_URL/);
    expect(parseEnv({ ...withoutClient, NODE_ENV: "development" }).problems).toEqual([]);
  });

  it("rejects an invalid CLIENT_URL origin", () => {
    expect(parseEnv({ ...GOOD, CLIENT_URL: "not a url" }).problems.join()).toMatch(/CLIENT_URL/);
    expect(parseEnv({ ...GOOD, CLIENT_URL: "ftp://example.com" }).problems.join()).toMatch(/CLIENT_URL/);
  });

  it("supports several origins and strips trailing slashes", () => {
    expect(parseOrigins("https://a.com/, https://b.com//")).toEqual(["https://a.com", "https://b.com"]);
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it("applies defaults and validates numeric settings", () => {
    const ok = parseEnv(GOOD).env;
    expect(ok.port).toBe(5000);
    expect(ok.freeTierDailyAiLimit).toBe(10);
    expect(ok.browserConcurrency).toBe(2);
    expect(ok.trustProxyHops).toBe(0); // not production -> no proxy assumed

    const bad = parseEnv({ ...GOOD, PORT: "abc", BROWSER_CONCURRENCY: "99", FREE_TIER_DAILY_AI_LIMIT: "-1" });
    expect(bad.problems.length).toBe(3);
  });

  it("warns (but doesn't fail) when there is no shared Gemini key", () => {
    const { GEMINI_API_KEY: _omit, ...noKey } = GOOD;
    const { problems, warnings } = parseEnv(noKey);
    expect(problems).toEqual([]);
    expect(warnings.join()).toMatch(/GEMINI_API_KEY/);
  });
});

describe("loadEnv", () => {
  it("throws one error that names every missing variable", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/MONGO_URI[\s\S]*JWT_SECRET/);
  });

  it("returns the parsed config when valid", () => {
    expect(loadEnv(GOOD).mongoUri).toBe(GOOD.MONGO_URI);
  });
});
