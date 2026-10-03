import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../services/encryption.js";

describe("encryption service", () => {
  it("round-trips a plaintext string", () => {
    const original = "AIzaSy-fake-gemini-key-1234567890";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encrypt("same-plaintext");
    const b = encrypt("same-plaintext");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same-plaintext");
    expect(decrypt(b)).toBe("same-plaintext");
  });

  it("fails to decrypt tampered ciphertext", () => {
    const encrypted = encrypt("sensitive-value");
    const tampered = encrypted.slice(0, -2) + "ff";
    expect(() => decrypt(tampered)).toThrow();
  });
});
