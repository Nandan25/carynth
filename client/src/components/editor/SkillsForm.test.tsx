import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SkillsForm from "./SkillsForm";
import { useResumeStore } from "../../store/resumeStore";

beforeEach(() => {
  useResumeStore.getState().reset();
});

describe("SkillsForm", () => {
  it("adds a skill when pressing Enter", async () => {
    const user = userEvent.setup();
    render(<SkillsForm />);

    const input = screen.getByPlaceholderText(/e\.g\. react/i);
    await user.type(input, "TypeScript");
    await user.keyboard("{Enter}");

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(useResumeStore.getState().resume.skills).toContain("TypeScript");
  });

  it("does not add a duplicate skill", async () => {
    const user = userEvent.setup();
    useResumeStore.getState().setSkills(["React"]);
    render(<SkillsForm />);

    const input = screen.getByPlaceholderText(/e\.g\. react/i);
    await user.type(input, "React");
    await user.keyboard("{Enter}");

    expect(useResumeStore.getState().resume.skills).toEqual(["React"]);
  });

  it("removes a skill when its ✕ button is clicked", async () => {
    const user = userEvent.setup();
    useResumeStore.getState().setSkills(["React", "Node.js"]);
    render(<SkillsForm />);

    const reactTag = screen.getByText("React").closest("span");
    await user.click(reactTag.querySelector("button"));

    expect(useResumeStore.getState().resume.skills).toEqual(["Node.js"]);
  });
});
