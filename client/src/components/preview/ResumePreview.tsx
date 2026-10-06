import type { Resume } from "../../store/resumeStore";
import Classic from "./templates/Classic";
import Modern from "./templates/Modern";
import Minimal from "./templates/Minimal";
import Technical from "./templates/Technical";

const TEMPLATES = {
  classic: Classic,
  modern: Modern,
  minimal: Minimal,
  technical: Technical,
};

export default function ResumePreview({ resume, scale = 0.72 }: { resume: Resume; scale?: number }) {
  const Template = TEMPLATES[resume.templateId] || Classic;

  return (
    <div
      className="flex justify-center py-6"
      data-testid="resume-preview"
      data-template={resume.templateId}
    >
      <div
        className="origin-top shadow-lg ring-1 ring-black/5"
        style={{ transform: `scale(${scale})`, width: 794 }}
      >
        <Template resume={resume} />
      </div>
    </div>
  );
}
