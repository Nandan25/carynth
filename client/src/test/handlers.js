import { http, HttpResponse } from "msw";

const BASE = "*/api";

export const sampleResume = {
  _id: "resume-1",
  title: "Untitled Resume",
  templateId: "classic",
  personalInfo: {
    fullName: "Jane Doe",
    title: "Software Engineer",
    email: "jane@example.com",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    summary: "",
  },
  experience: [],
  education: [],
  skills: ["React", "Node.js"],
  projects: [],
  certifications: [],
  jobDescription: "",
  lastAtsCheck: null,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.password === "wrong-password") {
      return HttpResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }
    return HttpResponse.json({
      token: "fake-jwt-token",
      user: { id: "user-1", name: "Jane Doe", email: body.email },
    });
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { token: "fake-jwt-token", user: { id: "user-1", name: body.name, email: body.email } },
      { status: 201 }
    );
  }),

  http.get(`${BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      useOwnKey: false,
      hasOwnKey: false,
    });
  }),

  http.get(`${BASE}/resumes`, () => {
    return HttpResponse.json([
      { ...sampleResume, _id: "resume-1", title: "Product Manager Resume" },
      { ...sampleResume, _id: "resume-2", title: "Backend Engineer Resume" },
    ]);
  }),

  http.get(`${BASE}/resumes/:id`, ({ params }) => {
    return HttpResponse.json({ ...sampleResume, _id: params.id });
  }),

  http.post(`${BASE}/resumes`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...sampleResume, ...body, _id: "resume-new" }, { status: 201 });
  }),

  http.put(`${BASE}/resumes/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ ...sampleResume, ...body, _id: params.id });
  }),

  http.delete(`${BASE}/resumes/:id`, () => {
    return HttpResponse.json({ message: "Resume deleted" });
  }),

  http.post(`${BASE}/resumes/import`, () => {
    return HttpResponse.json(
      {
        resume: {
          ...sampleResume,
          _id: "resume-imported",
          title: "Imported Resume",
          personalInfo: { ...sampleResume.personalInfo, fullName: "Imported Person" },
        },
        usedOcr: false,
        usesOwnKey: false,
      },
      { status: 201 }
    );
  }),

  http.post(`${BASE}/ai/resumes/:id/ats-score`, () => {
    return HttpResponse.json({
      score: 78,
      matchedKeywords: ["React"],
      missingKeywords: ["TypeScript", "GraphQL"],
      notes: "Solid match overall, add TypeScript experience if you have it.",
      usesOwnKey: false,
    });
  }),

  http.post(`${BASE}/ai/improve-bullet`, () => {
    return HttpResponse.json({ rewritten: "Shipped a redesigned checkout flow, lifting conversion 12%", usesOwnKey: false });
  }),

  http.post(`${BASE}/ai/resumes/:id/summary`, () => {
    return HttpResponse.json({ summary: "Engineer with 5 years building React and Node applications.", usesOwnKey: false });
  }),

  http.get(`${BASE}/user/usage`, () => {
    return HttpResponse.json({ useOwnKey: false, hasOwnKey: false, dailyLimit: 10, usedToday: 2 });
  }),

  http.put(`${BASE}/user/gemini-key`, () => {
    return HttpResponse.json({ hasOwnKey: true, useOwnKey: true });
  }),

  http.delete(`${BASE}/user/gemini-key`, () => {
    return HttpResponse.json({ hasOwnKey: false, useOwnKey: false });
  }),
];
