import api from "./axios.js";

export const listResumes = () => api.get("/resumes").then((r) => r.data);
export const getResume = (id) => api.get(`/resumes/${id}`).then((r) => r.data);
export const createResume = (payload) => api.post("/resumes", payload).then((r) => r.data);
export const updateResume = (id, payload) => api.put(`/resumes/${id}`, payload).then((r) => r.data);
export const deleteResume = (id) => api.delete(`/resumes/${id}`).then((r) => r.data);
export const tailorResume = (id, payload) => api.post(`/resumes/${id}/tailor`, payload).then((r) => r.data);

export async function exportResumePdf(id, filename = "resume.pdf") {
  const res = await api.get(`/resumes/${id}/export`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
