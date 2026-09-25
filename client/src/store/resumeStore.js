import { create } from "zustand";

const emptyResume = {
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

export const useResumeStore = create((set, get) => ({
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
      resume: { ...state.resume, [key]: [...state.resume[key], item] },
      dirty: true,
    })),

  updateItem: (key, index, fields) =>
    set((state) => {
      const list = [...state.resume[key]];
      list[index] = { ...list[index], ...fields };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  removeItem: (key, index) =>
    set((state) => {
      const list = state.resume[key].filter((_, i) => i !== index);
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  addBullet: (key, itemIndex, bullet = "") =>
    set((state) => {
      const list = [...state.resume[key]];
      const bullets = [...(list[itemIndex].bullets || []), bullet];
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  updateBullet: (key, itemIndex, bulletIndex, text) =>
    set((state) => {
      const list = [...state.resume[key]];
      const bullets = [...list[itemIndex].bullets];
      bullets[bulletIndex] = text;
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  removeBullet: (key, itemIndex, bulletIndex) =>
    set((state) => {
      const list = [...state.resume[key]];
      const bullets = list[itemIndex].bullets.filter((_, i) => i !== bulletIndex);
      list[itemIndex] = { ...list[itemIndex], bullets };
      return { resume: { ...state.resume, [key]: list }, dirty: true };
    }),

  markSaved: () => set({ dirty: false }),

  setAtsCheck: (lastAtsCheck) =>
    set((state) => ({ resume: { ...state.resume, lastAtsCheck } })),
}));
