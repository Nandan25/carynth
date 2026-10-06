/**
 * Startup configuration check. Called once from server.ts before anything
 * connects, so a missing or malformed variable stops the process with ONE
 * clear message instead of surfacing later as a confusing failure on some
 * unlucky request (e.g. registration creating a user and then failing to
 * sign the token because JWT_SECRET was never set).
 *
 * Deliberately not called from app.ts: tests build the app directly and set
 * only the variables they need.
 */

export interface ParsedEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  mongoUri: string;
  clientOrigins: string[];
  freeTierDailyAiLimit: number;
  trustProxyHops: number;
  browserConcurrency: number;
}

export interface EnvCheck {
  env: ParsedEnv;
  problems: string[];
  warnings: string[];
}

type Source = Record<string, string | undefined>;

const HEX_64 = /^[0-9a-fA-F]{64}$/;

/** "https://a.com/, https://b.com" -> ["https://a.com", "https://b.com"] */
export function parseOrigins(raw?: string): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function parseEnv(source: Source): EnvCheck {
  const problems: string[] = [];
  const warnings: string[] = [];

  const rawNodeEnv = source.NODE_ENV || "development";
  const nodeEnv = (["development", "test", "production"].includes(rawNodeEnv)
    ? rawNodeEnv
    : "development") as ParsedEnv["nodeEnv"];
  const isProd = nodeEnv === "production";

  const int = (key: string, fallback: number, min: number, max: number): number => {
    const raw = source[key];
    if (raw === undefined || raw === "") return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      problems.push(`${key} must be an integer between ${min} and ${max} (got "${raw}")`);
      return fallback;
    }
    return n;
  };

  // --- required everywhere
  const mongoUri = source.MONGO_URI || "";
  if (!mongoUri) {
    problems.push("MONGO_URI is required");
  } else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    problems.push('MONGO_URI must start with "mongodb://" or "mongodb+srv://"');
  }

  const jwtSecret = source.JWT_SECRET || "";
  const minSecret = isProd ? 32 : 16;
  if (!jwtSecret) {
    problems.push("JWT_SECRET is required");
  } else if (jwtSecret.length < minSecret) {
    problems.push(`JWT_SECRET must be at least ${minSecret} characters${isProd ? " in production" : ""}`);
  }

  // --- encryption key: required in production, a warning elsewhere so a fresh
  // clone with the placeholder from .env.example still boots for local dev.
  const encryptionHelp =
    "generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";
  if (!HEX_64.test(source.ENCRYPTION_KEY || "")) {
    const msg = `ENCRYPTION_KEY must be exactly 64 hex characters (${encryptionHelp})`;
    if (isProd) problems.push(msg);
    else warnings.push(`${msg}. Saving a personal Gemini key will fail until you set it.`);
  }

  // --- CORS origin(s)
  const clientOrigins = parseOrigins(source.CLIENT_URL);
  if (isProd && clientOrigins.length === 0) {
    problems.push("CLIENT_URL is required in production (the exact frontend origin, e.g. https://app.example.com)");
  }
  for (const origin of clientOrigins) {
    try {
      const u = new URL(origin);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      problems.push(`CLIENT_URL contains an invalid origin: "${origin}"`);
    }
  }

  // --- optional
  if (!source.GEMINI_API_KEY) {
    warnings.push(
      "GEMINI_API_KEY is not set: AI features only work for users who add their own key in Settings."
    );
  }

  const env: ParsedEnv = {
    nodeEnv,
    port: int("PORT", 5000, 1, 65535),
    mongoUri,
    clientOrigins,
    freeTierDailyAiLimit: int("FREE_TIER_DAILY_AI_LIMIT", 10, 0, 100000),
    // Hops of reverse proxy in front of the app (Render = 1). 0 means "none",
    // so X-Forwarded-For is ignored and can't be used to dodge rate limits.
    trustProxyHops: int("TRUST_PROXY", isProd ? 1 : 0, 0, 10),
    browserConcurrency: int("BROWSER_CONCURRENCY", 2, 1, 8),
  };

  return { env, problems, warnings };
}

/** Validates process.env; throws one Error listing every problem. */
export function loadEnv(source: Source = process.env): ParsedEnv {
  const { env, problems, warnings } = parseEnv(source);
  for (const w of warnings) console.warn(`[config] warning: ${w}`);
  if (problems.length > 0) {
    throw new Error(
      `Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`
    );
  }
  return env;
}
