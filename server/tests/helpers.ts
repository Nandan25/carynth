import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

/** Creates a user directly in the DB and returns { user, token } for authenticated requests. */
export async function createTestUser(overrides: Record<string, any> = {}) {
  const user = await User.create({
    name: "Test User",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "password123",
    ...overrides,
  });
  const token = generateToken(user._id);
  return { user, token };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
