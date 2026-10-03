import { create } from "zustand";

export type TemplateId = "classic" | "modern" | "minimal" | "technical";

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
}

export interface Experience {
  company?: string;
  role?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets: string[];
}

export interface Education {
  school?: string;
  degree?: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
}

export interface Project {
  name?: string;
  link?: string;
  description?: string;
  bullets: string[];
  tech: string[];
}

export interface Certification {
  name?: string;
  issuer?: string;
  date?: string;
}

export interface AtsCheck {
  score?: number;
  missingKeywords?: string[];
  notes?: string;
  checkedAt?: string;
}

export interface Resume {
  _id?: string;
  title: string;
  templateId: TemplateId;
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  jobDescription: string;
  lastAtsCheck: AtsCheck | null;
}

// addItem/updateItem/removeItem work across any list section; addBullet and
// friends only make sense for the two sections that actually have a
// `bullets` field (education/certifications don't).
type ListKey = "experience" | "education" | "projects" | "certifications";
type BulletListKey = "experience" | "projects";

interface ResumeStoreState {
  resume: Resume;
  dirty: boolean;
  setResume: (resume: Partial<Resume>) => void;
  reset: () => void;
  updatePersonalInfo: (fields: Partial<PersonalInfo>) => void;
  setTemplate: (templateId: TemplateId) => void;
  setTitle: (title: string) => void;
  setSkills: (skills: string[]) => void;
  addItem: (key: ListKey, item: any) => void;
  updateItem: (key: ListKey, index: number, fields: any) => void;
  removeItem: (key: ListKey, index: number) => void;
  addBullet: (key: BulletListKey, itemIndex: number, bullet?: string) => void;
  updateBullet: (key: BulletListKey, itemIndex: number, bulletIndex: number, text: string) => void;
  removeBullet: (key: BulletListKey, itemIndex: number, bulletIndex: number) => void;
  markSaved: () => void;
  setAtsCheck: (lastAtsCheck: AtsCheck | null) => void;
}

const emptyResume: Resume = {
  title: "Untitled Resume",
  templateId: "classic",
  personalInfo: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    summary: "",
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  jobDescription: "",
  lastAtsCheck: null,
};

export const useResumeStore = create<ResumeStoreState>((set) => ({
  resume: emptyResume,
  dirty: false,

  setResume: (resume) => set({ resume: { ...emptyResume, ...resume }, dirty: false }),

  reset: () => set({ resume: emptyResume, dirty: false }),

  updatePersonalInfo: (fields) =>
    set((state) => ({
      resume: { ...state.resume, personalInfo: { ...state.resume.personalInfo, ...fields } },
      dirty: true,
    })),

  setTemplate: (templateId) =>
    set((state) => ({ resume: { ...state.resume, templateId }, dirty: true })),

  setTitle: (title) => set((state) => ({ resume: { ...state.resume, title }, dirty: true })),

  setSkills: (skills) => set((state) => ({ resume: { ...state.resume, skills }, dirty: true })),

  // Generic list helpers for experience / education / projects / certifications
  addItem: (key, item) =>
    set((state) => ({
      resume: { ...state.resume, [key]: [...(state.resume[key] as any[]), item] },
      dirty: true,
    })),

  updateItem: (key, index, fields) =>
    set((state) => {
      const list = [...(state.resume[key] as any[])];
      list[index] = { ...list[index], ...fields };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  removeItem: (key, index) =>
    set((state) => {
      const list = (state.resume[key] as any[]).filter((_: any, i: number) => i !== index);
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  addBullet: (key, itemIndex, bullet = "") =>
    set((state) => {
      const list = [...(state.resume[key] as any[])];
      const bullets = [...(list[itemIndex].bullets || []), bullet];
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  updateBullet: (key, itemIndex, bulletIndex, text) =>
    set((state) => {
      const list = [...(state.resume[key] as any[])];
      const bullets = [...list[itemIndex].bullets];
      bullets[bulletIndex] = text;
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  removeBullet: (key, itemIndex, bulletIndex) =>
    set((state) => {
      const list = [...(state.resume[key] as any[])];
      const bullets = list[itemIndex].bullets.filter((_: any, i: number) => i !== bulletIndex);
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  markSaved: () => set({ dirty: false }),

  setAtsCheck: (lastAtsCheck) =>
    set((state) => ({ resume: { ...state.resume, lastAtsCheck } })),
}));
