import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResumePreview from "./ResumePreview";

const baseResume = {
  templateId: "classic",
  personalInfo: { fullName: "Jane Doe", title: "Engineer" },
  experience: [],
  education: [],
  skills: ["React"],
  projects: [],
  certifications: [],
};

describe("ResumePreview", () => {
  it("renders the name for every template", () => {
    for (const templateId of ["classic", "modern", "minimal", "technical"]) {
      const { unmount } = render(<ResumePreview resume={{ ...baseResume, templateId }} />);
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      unmount();
    }
  });

  it("falls back to the classic template for an unknown templateId", () => {
    render(<ResumePreview resume={{ ...baseResume, templateId: "nonexistent" }} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });
});
