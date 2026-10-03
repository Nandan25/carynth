import api from "./axios";

export interface AtsScoreResponse {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string;
  usesOwnKey: boolean;
}

export interface ImproveBulletResponse {
  rewritten: string;
  usesOwnKey: boolean;
}

export interface GenerateSummaryResponse {
  summary: string;
  usesOwnKey: boolean;
}

export const checkAtsScore = (resumeId: string, jobDescription: string): Promise<AtsScoreResponse> =>
  api.post(`/ai/resumes/${resumeId}/ats-score`, { jobDescription }).then((r) => r.data);

export const improveBullet = (text: string, jobDescription = ""): Promise<ImproveBulletResponse> =>
  api.post("/ai/improve-bullet", { text, jobDescription }).then((r) => r.data);

export const generateSummary = (
  resumeId: string,
  jobDescription = ""
): Promise<GenerateSummaryResponse> =>
  api.post(`/ai/resumes/${resumeId}/summary`, { jobDescription }).then((r) => r.data);
