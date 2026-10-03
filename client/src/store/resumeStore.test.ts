import { describe, it, expect, beforeEach } from "vitest";
import { useResumeStore } from "../store/resumeStore";

// Zustand stores are plain modules with shared state, so reset it between tests.
beforeEach(() => {
  useResumeStore.getState().reset();
});

describe("resumeStore", () => {
  it("starts with an empty resume", () => {
    const { resume } = useResumeStore.getState();
    expect(resume.title).toBe("Untitled Resume");
    expect(resume.experience).toEqual([]);
  });

  it("updates personal info fields without clobbering others", () => {
    const { updatePersonalInfo } = useResumeStore.getState();
    updatePersonalInfo({ fullName: "Jane Doe" });
    updatePersonalInfo({ title: "Engineer" });
    const { personalInfo } = useResumeStore.getState().resume;
    expect(personalInfo.fullName).toBe("Jane Doe");
    expect(personalInfo.title).toBe("Engineer");
  });

  it("marks the resume dirty after an edit and clean after markSaved", () => {
    const { updatePersonalInfo, markSaved } = useResumeStore.getState();
    expect(useResumeStore.getState().dirty).toBe(false);
    updatePersonalInfo({ fullName: "Jane" });
    expect(useResumeStore.getState().dirty).toBe(true);
    markSaved();
    expect(useResumeStore.getState().dirty).toBe(false);
  });

  it("adds, updates, and removes an experience item", () => {
    const { addItem, updateItem, removeItem } = useResumeStore.getState();
    addItem("experience", { company: "Acme", role: "Engineer", bullets: [] });
    expect(useResumeStore.getState().resume.experience).toHaveLength(1);

    updateItem("experience", 0, { role: "Senior Engineer" });
    expect(useResumeStore.getState().resume.experience[0].role).toBe("Senior Engineer");

    removeItem("experience", 0);
    expect(useResumeStore.getState().resume.experience).toHaveLength(0);
  });

  it("adds, edits, and removes bullets on an experience item", () => {
    const { addItem, addBullet, updateBullet, removeBullet } = useResumeStore.getState();
    addItem("experience", { company: "Acme", role: "Engineer", bullets: [] });

    addBullet("experience", 0, "Did a thing");
    expect(useResumeStore.getState().resume.experience[0].bullets).toEqual(["Did a thing"]);

    updateBullet("experience", 0, 0, "Did a better thing");
    expect(useResumeStore.getState().resume.experience[0].bullets[0]).toBe("Did a better thing");

    removeBullet("experience", 0, 0);
    expect(useResumeStore.getState().resume.experience[0].bullets).toEqual([]);
  });

  it("sets skills as a plain array", () => {
    const { setSkills } = useResumeStore.getState();
    setSkills(["React", "Node.js"]);
    expect(useResumeStore.getState().resume.skills).toEqual(["React", "Node.js"]);
  });

  it("replaces the resume via setResume, filling in missing defaults", () => {
    const { setResume } = useResumeStore.getState();
    setResume({ title: "Loaded Resume", skills: ["SQL"] });
    const { resume, dirty } = useResumeStore.getState();
    expect(resume.title).toBe("Loaded Resume");
    expect(resume.skills).toEqual(["SQL"]);
    expect(resume.experience).toEqual([]); // default filled in
    expect(dirty).toBe(false);
  });
});
