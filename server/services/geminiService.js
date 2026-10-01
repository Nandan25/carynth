import { GoogleGenerativeAI } from "@google/generative-ai";
import { decrypt } from "./encryption.js";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/** Picks the right Gemini API key: the user's own (decrypted) or the app's shared key. */
function resolveApiKey(user) {
  if (user.useOwnKey && user.geminiApiKeyEncrypted) {
    return decrypt(user.geminiApiKeyEncrypted);
  }
  return process.env.GEMINI_API_KEY;
}

function getModel(user, { json = false } = {}) {
  const apiKey = resolveApiKey(user);
  if (!apiKey) {
    throw new Error("No Gemini API key available (shared key not configured, and user has no key set)");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: json ? { responseMimeType: "application/json" } : undefined,
  });
}

function resumeToPlainText(resume) {
  const p = resume.personalInfo || {};
  const lines = [];
  lines.push(`Name: ${p.fullName || ""}`);
  lines.push(`Title: ${p.title || ""}`);
  if (p.summary) lines.push(`Summary: ${p.summary}`);
  if (resume.skills?.length) lines.push(`Skills: ${resume.skills.join(", ")}`);

  if (resume.experience?.length) {
    lines.push("Experience:");
    for (const e of resume.experience) {
      lines.push(`- ${e.role} at ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate})`);
      for (const b of e.bullets || []) lines.push(`  * ${b}`);
    }
  }

  if (resume.projects?.length) {
    lines.push("Projects:");
    for (const proj of resume.projects) {
      lines.push(`- ${proj.name}: ${proj.description || ""}`);
      for (const b of proj.bullets || []) lines.push(`  * ${b}`);
    }
  }

  if (resume.education?.length) {
    lines.push("Education:");
    for (const ed of resume.education) {
      lines.push(`- ${ed.degree} in ${ed.field}, ${ed.school} (${ed.startDate} - ${ed.endDate})`);
    }
  }

  if (resume.certifications?.length) {
    lines.push("Certifications:");
    for (const c of resume.certifications) lines.push(`- ${c.name} (${c.issuer}, ${c.date})`);
  }

  return lines.join("\n");
}

/** Extracts the first valid JSON object from a model response, tolerating stray text/fences. */
function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse AI response as JSON");
  }
}

/**
 * Scores a resume against a job description for ATS compatibility.
 * Returns { score, missingKeywords, matchedKeywords, notes }
 */
export async function scoreAts(user, resume, jobDescription) {
  const model = getModel(user, { json: true });
  const prompt = `You are an ATS (Applicant Tracking System) compatibility analyzer.
Compare the RESUME to the JOB DESCRIPTION and return ONLY a JSON object with this exact shape:
{
  "score": <integer 0-100, overall ATS match score>,
  "matchedKeywords": [<important keywords/skills from the JD that the resume already covers>],
  "missingKeywords": [<important keywords/skills from the JD that the resume is missing>],
  "notes": "<2-4 sentence plain-language summary of the biggest gaps and quickest fixes>"
}

RESUME:
${resumeToPlainText(resume)}

JOB DESCRIPTION:
${jobDescription}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = extractJson(text);

  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    matchedKeywords: parsed.matchedKeywords || [],
    missingKeywords: parsed.missingKeywords || [],
    notes: parsed.notes || "",
  };
}

/**
 * Rewrites a single resume bullet to be more impactful and ATS-friendly.
 * Optionally tailored toward a job description.
 */
export async function rewriteBullet(user, bulletText, jobDescription = "") {
  const model = getModel(user, { json: true });
  const prompt = `Rewrite the following resume bullet point to be more impactful: use a strong
action verb, quantify results where plausible, and keep it to one line (under ~220 characters).
Do not invent specific numbers that weren't implied; if you add a placeholder metric, mark it
clearly like "[X%]" so the user knows to fill it in.
${jobDescription ? `Where natural, incorporate relevant language from this job description:\n${jobDescription}\n` : ""}

Return ONLY a JSON object: { "rewritten": "<the improved bullet>" }

Original bullet: "${bulletText}"`;

  const result = await model.generateContent(prompt);
  const parsed = extractJson(result.response.text());
  return parsed.rewritten || bulletText;
}

/**
 * Parses raw text extracted from an uploaded PDF (via pdf-parse or the OCR
 * fallback) into the app's structured resume shape. The text may be
 * imperfectly ordered since it came from automated extraction — the prompt
 * asks the model to reconstruct logical structure without inventing facts
 * that aren't actually present in the source text.
 */
export async function parseResumeFromText(user, rawText) {
  const model = getModel(user, { json: true });
  const prompt = `You are extracting structured resume data from raw text pulled from a PDF
(it may be imperfectly ordered, since it came from automated text or OCR extraction). Return
ONLY a JSON object matching exactly this shape. Use an empty string or empty array for anything
not present in the text — never invent or guess information that isn't actually there:

{
  "personalInfo": {
    "fullName": "", "title": "", "email": "", "phone": "", "location": "",
    "website": "", "linkedin": "", "github": "", "summary": ""
  },
  "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "current": false, "bullets": [""] }],
  "education": [{ "school": "", "degree": "", "field": "", "location": "", "startDate": "", "endDate": "", "details": "" }],
  "skills": [""],
  "projects": [{ "name": "", "link": "", "description": "", "bullets": [""], "tech": [""] }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }]
}

RAW TEXT:
${rawText}`;

  const result = await model.generateContent(prompt);
  const parsed = extractJson(result.response.text());

  return {
    personalInfo: parsed.personalInfo || {},
    experience: parsed.experience || [],
    education: parsed.education || [],
    skills: parsed.skills || [],
    projects: parsed.projects || [],
    certifications: parsed.certifications || [],
  };
}
export async function generateSummary(user, resume, jobDescription = "") {
  const model = getModel(user, { json: true });
  const prompt = `Write a concise, first-person-implied professional resume summary (2-3 sentences,
no "I"), based on the candidate's experience and skills below. It should read naturally, avoid
generic filler ("hard-working team player"), and highlight their strongest, most specific
qualifications.
${jobDescription ? `Tailor the emphasis toward this job description where honest to do so:\n${jobDescription}\n` : ""}

Return ONLY a JSON object: { "summary": "<the summary text>" }

CANDIDATE DATA:
${resumeToPlainText(resume)}`;

  const result = await model.generateContent(prompt);
  const parsed = extractJson(result.response.text());
  return parsed.summary || "";
}
