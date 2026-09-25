import Classic from "./templates/Classic.jsx";
import Modern from "./templates/Modern.jsx";
import Minimal from "./templates/Minimal.jsx";
import Technical from "./templates/Technical.jsx";

const TEMPLATES = {
  classic: Classic,
  modern: Modern,
  minimal: Minimal,
  technical: Technical,
};

export default function ResumePreview({ resume, scale = 0.72 }) {
  const Template = TEMPLATES[resume.templateId] || Classic;

  return (
    <div className="flex justify-center py-6">
      <div
        className="origin-top shadow-lg ring-1 ring-black/5"
        style={{ transform: `scale(${scale})`, width: 794 }}
      >
        <Template resume={resume} />
      </div>
    </div>
  );
}
