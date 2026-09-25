import api from "./axios.js";

export const setGeminiKey = (payload) => api.put("/user/gemini-key", payload).then((r) => r.data);
export const removeGeminiKey = () => api.delete("/user/gemini-key").then((r) => r.data);
export const getUsage = () => api.get("/user/usage").then((r) => r.data);
