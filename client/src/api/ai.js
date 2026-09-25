import api from "./axios.js";

export const checkAtsScore = (resumeId, jobDescription) =>
  api.post(`/ai/resumes/${resumeId}/ats-score`, { jobDescription }).then((r) => r.data);

export const improveBullet = (text, jobDescription = "") =>
  api.post("/ai/improve-bullet", { text, jobDescription }).then((r) => r.data);

export const generateSummary = (resumeId, jobDescription = "") =>
  api.post(`/ai/resumes/${resumeId}/summary`, { jobDescription }).then((r) => r.data);
