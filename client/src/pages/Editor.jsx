import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResumeStore } from "../store/resumeStore.js";
import { getResume, updateResume, exportResumePdf, tailorResume } from "../api/resumes.js";
import ResumePreview from "../components/preview/ResumePreview.jsx";
import PersonalInfoForm from "../components/editor/PersonalInfoForm.jsx";
import ExperienceForm from "../components/editor/ExperienceForm.jsx";
import EducationForm from "../components/editor/EducationForm.jsx";
import SkillsForm from "../components/editor/SkillsForm.jsx";
import ProjectsForm from "../components/editor/ProjectsForm.jsx";
import AIPanel from "../components/editor/AIPanel.jsx";

const TABS = [
  { id: "personal", label: "Personal" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "ai", label: "AI / ATS" },
];

const TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
  { id: "technical", label: "Technical" },
];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, setResume, setTitle, setTemplate, dirty, markSaved } = useResumeStore();
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await getResume(id);
      if (active) {
        setResume(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, setResume]);

  // Autosave, debounced
  useEffect(() => {
    if (!dirty || loading) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateResume(id, resume);
        markSaved();
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(saveTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, dirty, loading, id]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportResumePdf(id, `${(resume.title || "resume").replace(/\s+/g, "_")}.pdf`);
    } catch {
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleTailor = async () => {
    const title = prompt("Name this tailored copy (e.g. 'Resume — Acme PM role'):", `${resume.title} (Tailored)`);
    if (!title) return;
    const tailored = await tailorResume(id, { title, jobDescription: resume.jobDescription });
    navigate(`/editor/${tailored._id}`);
  };

  if (loading) {
    return <div className="p-10 text-sm text-muted dark:text-muted-dark">Loading…</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 dark:border-border-dark">
        <div className="flex items-center gap-3">
          <input
            value={resume.title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-medium outline-none hover:border-border focus:border-accent dark:hover:border-border-dark"
          />
          <span className="text-xs text-muted dark:text-muted-dark">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={resume.templateId}
            onChange={(e) => setTemplate(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-dark"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleTailor}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-black/5 dark:border-border-dark dark:hover:bg-white/5"
          >
            Tailor for a job
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Form pane */}
        <div className="flex w-[46%] flex-col border-r border-border dark:border-border-dark">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 dark:border-border-dark">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-accent-soft text-accent dark:bg-accent/20 dark:text-accent-light"
                    : "text-muted hover:bg-black/5 dark:text-muted-dark dark:hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {tab === "personal" && <PersonalInfoForm />}
            {tab === "experience" && <ExperienceForm />}
            {tab === "education" && <EducationForm />}
            {tab === "skills" && <SkillsForm />}
            {tab === "projects" && <ProjectsForm />}
            {tab === "ai" && <AIPanel resumeId={id} />}
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex-1 overflow-y-auto bg-black/[0.02] dark:bg-white/[0.02]">
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );
}
