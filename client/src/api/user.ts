import api from "./axios";

export interface GeminiKeyPayload {
  apiKey?: string;
  useOwnKey?: boolean;
}

export interface GeminiKeyResponse {
  hasOwnKey: boolean;
  useOwnKey: boolean;
}

export interface UsageResponse {
  useOwnKey: boolean;
  hasOwnKey: boolean;
  dailyLimit: number;
  usedToday: number;
}

export const setGeminiKey = (payload: GeminiKeyPayload): Promise<GeminiKeyResponse> =>
  api.put("/user/gemini-key", payload).then((r) => r.data);

export const removeGeminiKey = (): Promise<GeminiKeyResponse> =>
  api.delete("/user/gemini-key").then((r) => r.data);

export const getUsage = (): Promise<UsageResponse> => api.get("/user/usage").then((r) => r.data);
