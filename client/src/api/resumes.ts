import api from "./axios";
import type { Resume, TemplateId } from "../store/resumeStore";

export interface CreateResumePayload {
  title?: string;
  templateId?: TemplateId;
  personalInfo?: Partial<Resume["personalInfo"]>;
}

export interface ImportResumeResult {
  resume: Resume;
  usedOcr: boolean;
  usesOwnKey: boolean;
}

export const listResumes = (): Promise<Resume[]> => api.get("/resumes").then((r) => r.data);

export const getResume = (id: string): Promise<Resume> =>
  api.get(`/resumes/${id}`).then((r) => r.data);

export const createResume = (payload: CreateResumePayload): Promise<Resume> =>
  api.post("/resumes", payload).then((r) => r.data);

export const updateResume = (id: string, payload: Partial<Resume>): Promise<Resume> =>
  api.put(`/resumes/${id}`, payload).then((r) => r.data);

export const deleteResume = (id: string): Promise<{ message: string }> =>
  api.delete(`/resumes/${id}`).then((r) => r.data);

export const tailorResume = (
  id: string,
  payload: { title?: string; jobDescription?: string }
): Promise<Resume> => api.post(`/resumes/${id}/tailor`, payload).then((r) => r.data);

export async function importResumePdf(file: File): Promise<ImportResumeResult> {
  const formData = new FormData();
  formData.append("resume", file);
  const { data } = await api.post("/resumes/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportResumePdf(id: string, filename = "resume.pdf"): Promise<void> {
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
