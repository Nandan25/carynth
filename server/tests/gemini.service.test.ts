import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}));

const { scoreAts, rewriteBullet, generateSummary, parseResumeFromText } = await import(
  "../services/geminiService.js"
);
const { encrypt } = await import("../services/encryption.js");

function mockResponse(obj) {
  return { response: { text: () => JSON.stringify(obj) } };
}

const sampleResume = {
  personalInfo: { fullName: "Jane Doe", title: "Engineer", summary: "" },
  skills: ["JavaScript", "React"],
  experience: [{ role: "Engineer", company: "Acme", startDate: "2021", endDate: "2023", bullets: ["Built things"] }],
  projects: [],
  education: [],
  certifications: [],
};

const sharedKeyUser = { useOwnKey: false };

beforeEach(() => {
  mockGenerateContent.mockReset();
});

describe("scoreAts", () => {
  it("parses a well-formed JSON response and clamps the score", async () => {
    mockGenerateContent.mockResolvedValueOnce(
      mockResponse({ score: 82, matchedKeywords: ["React"], missingKeywords: ["TypeScript"], notes: "Good match" })
    );

    const result = await scoreAts(sharedKeyUser, sampleResume, "Looking for a React + TypeScript engineer");

    expect(result.score).toBe(82);
    expect(result.missingKeywords).toEqual(["TypeScript"]);
    expect(result.notes).toBe("Good match");
  });

  it("clamps an out-of-range score into 0-100", async () => {
    mockGenerateContent.mockResolvedValueOnce(mockResponse({ score: 150 }));
    const result = await scoreAts(sharedKeyUser, sampleResume, "some JD");
    expect(result.score).toBe(100);
  });

  it("tolerates a response wrapped in markdown code fences", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "```json\n" + JSON.stringify({ score: 50 }) + "\n```" },
    });
    const result = await scoreAts(sharedKeyUser, sampleResume, "some JD");
    expect(result.score).toBe(50);
  });

  it("uses the user's own decrypted key when useOwnKey is true", async () => {
    const ownKeyUser = { useOwnKey: true, geminiApiKeyEncrypted: encrypt("user-own-key-123") };
    mockGenerateContent.mockResolvedValueOnce(mockResponse({ score: 60 }));

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    await scoreAts(ownKeyUser, sampleResume, "some JD");

    expect(GoogleGenerativeAI).toHaveBeenCalledWith("user-own-key-123");
  });
});

describe("rewriteBullet", () => {
  it("returns the rewritten bullet text", async () => {
    mockGenerateContent.mockResolvedValueOnce(mockResponse({ rewritten: "Shipped a feature used by 10k users" }));
    const result = await rewriteBullet(sharedKeyUser, "worked on a feature");
    expect(result).toBe("Shipped a feature used by 10k users");
  });

  it("falls back to the original text if the field is missing", async () => {
    mockGenerateContent.mockResolvedValueOnce(mockResponse({}));
    const result = await rewriteBullet(sharedKeyUser, "worked on a feature");
    expect(result).toBe("worked on a feature");
  });
});

describe("generateSummary", () => {
  it("returns the generated summary text", async () => {
    mockGenerateContent.mockResolvedValueOnce(mockResponse({ summary: "Experienced engineer skilled in React." }));
    const result = await generateSummary(sharedKeyUser, sampleResume);
    expect(result).toBe("Experienced engineer skilled in React.");
  });
});

describe("parseResumeFromText", () => {
  it("returns the structured resume shape with all fields present", async () => {
    mockGenerateContent.mockResolvedValueOnce(
      mockResponse({
        personalInfo: { fullName: "Alex Rivera", title: "Backend Engineer" },
        experience: [{ company: "Acme", role: "Engineer" }],
        education: [],
        skills: ["Go", "PostgreSQL"],
        projects: [],
        certifications: [],
      })
    );

    const result = await parseResumeFromText(sharedKeyUser, "raw pdf text goes here");

    expect(result.personalInfo.fullName).toBe("Alex Rivera");
    expect(result.skills).toEqual(["Go", "PostgreSQL"]);
    expect(result.experience).toHaveLength(1);
  });

  it("fills in empty defaults for any missing field rather than erroring", async () => {
    mockGenerateContent.mockResolvedValueOnce(mockResponse({ personalInfo: { fullName: "Alex" } }));

    const result = await parseResumeFromText(sharedKeyUser, "sparse text");

    expect(result.personalInfo.fullName).toBe("Alex");
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
  });
});
