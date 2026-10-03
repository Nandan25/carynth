import { useNavigate } from "react-router-dom";
import { createResume } from "../api/resumes";

const TEMPLATES = [
  { id: "classic", name: "Classic", blurb: "Serif, traditional layout. Safe for conservative industries." },
  { id: "modern", name: "Modern", blurb: "Bold color header, pill-tagged skills. Good for design/product roles." },
  { id: "minimal", name: "Minimal", blurb: "Quiet, whitespace-forward. Lets the content do the talking." },
  { id: "technical", name: "Technical", blurb: "Skills-forward with tech tags. Built for engineering resumes." },
];

const PREVIEW_STYLES = {
  classic: { font: "font-serif", accent: "#1C1E21" },
  modern: { font: "font-sans", accent: "#4F46E5" },
  minimal: { font: "font-sans", accent: "#999999" },
  technical: { font: "font-sans", accent: "#4F46E5" },
};

export default function TemplateGallery() {
  const navigate = useNavigate();

  const handlePick = async (templateId) => {
    const resume = await createResume({ title: "Untitled Resume", templateId });
    navigate(`/editor/${resume._id}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-display text-3xl font-semibold">Choose a template</h1>
      <p className="mt-1 text-sm text-muted dark:text-muted-dark">
        You can switch templates later without losing your content.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const style = PREVIEW_STYLES[t.id];
          return (
            <button
              key={t.id}
              onClick={() => handlePick(t.id)}
              className="group rounded-xl border border-border bg-white p-5 text-left transition hover:border-accent dark:border-border-dark dark:bg-surface-dark"
            >
              <div
                className={`mb-4 flex h-40 flex-col justify-center gap-1.5 rounded-lg border border-border p-4 dark:border-border-dark ${style.font}`}
                style={{ background: t.id === "modern" ? "#EEF0FF" : "#FAFAF8" }}
              >
                <div className="h-2.5 w-2/5 rounded" style={{ background: style.accent }} />
                <div className="h-1.5 w-3/5 rounded bg-black/10" />
                <div className="mt-3 h-1.5 w-full rounded bg-black/10" />
                <div className="h-1.5 w-full rounded bg-black/10" />
                <div className="h-1.5 w-4/5 rounded bg-black/10" />
              </div>
              <h3 className="font-medium">{t.name}</h3>
              <p className="mt-1 text-xs text-muted dark:text-muted-dark">{t.blurb}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
