import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResumeStore, type TemplateId } from "../store/resumeStore";
import {
  getResume,
  updateResume,
  exportResumePdf,
  tailorResume,
} from "../api/resumes";
import ResumePreview from "../components/preview/ResumePreview";
import PersonalInfoForm from "../components/editor/PersonalInfoForm";
import ExperienceForm from "../components/editor/ExperienceForm";
import EducationForm from "../components/editor/EducationForm";
import SkillsForm from "../components/editor/SkillsForm";
import ProjectsForm from "../components/editor/ProjectsForm";
import AIPanel from "../components/editor/AIPanel";

// How long to wait before retrying a failed autosave.
const SAVE_RETRY_MS = 4000;

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
  const {
    resume,
    setResume,
    setTitle,
    setTemplate,
    dirty,
    markSaved,
  } = useResumeStore();
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getResume(id);
        if (active) {
          setResume(data);
          setLoading(false);
        }
      } catch (err: any) {
        // Without this the page sat on "Loading…" forever when the resume
        // didn't exist (or the request failed).
        if (active) {
          const status = err.response?.status;
          setLoadError(
            status === 400 || status === 404
              ? "We couldn't find that resume. It may have been deleted."
              : "We couldn't load this resume. Check your connection and try again.",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id, setResume, reloadTick]);

  // Autosave, debounced.
  useEffect(() => {
    if (!dirty || loading) return;
    const snapshot = resume;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await updateResume(id, snapshot);
        setSaveError("");
        // Only mark clean if nothing changed while the request was in
        // flight. Otherwise an edit made during the save would be flagged
        // "saved" without ever being sent (and its pending timer cancelled
        // by the dirty flag flipping), silently losing that edit.
        if (useResumeStore.getState().resume === snapshot) markSaved();
      } catch (err: any) {
        const status = err.response?.status;
        // Network trouble, server errors and rate limiting are worth retrying.
        // A 4xx (e.g. a title the server rejects) will fail identically every
        // time, so retrying would only hammer the API: report it and wait for
        // the user's next edit instead.
        const retryable = !status || status >= 500 || status === 429;
        if (retryable) {
          setSaveError("Couldn't save, retrying…");
          // `resume` hasn't changed, so nothing would re-trigger this effect:
          // schedule the retry ourselves.
          setTimeout(() => setRetryTick((t) => t + 1), SAVE_RETRY_MS);
        } else {
          setSaveError(`Couldn't save: ${err.response?.data?.message || "the server rejected this change."}`);
        }
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, dirty, loading, id, retryTick]);

  // Leaving the editor (navigating away, or switching to another resume)
  // within the debounce window used to drop the last edits: flush them.
  useEffect(() => {
    return () => {
      const { dirty: pending, resume: latest } = useResumeStore.getState();
      if (pending && id) updateResume(id, latest).catch(() => {});
    };
  }, [id]);

  // Closing the tab with unsaved edits: ask the browser to confirm.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportResumePdf(
        id,
        `${(resume.title || "resume").replace(/\s+/g, "_")}.pdf`,
      );
    } catch {
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleTailor = async () => {
    const title = prompt(
      "Name this tailored copy (e.g. 'Resume — Acme PM role'):",
      `${resume.title} (Tailored)`,
    );
    if (!title) return;
    const tailored = await tailorResume(id, {
      title,
      jobDescription: resume.jobDescription,
    });
    navigate(`/editor/${tailored._id}`);
  };

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm" role="alert">
          {loadError}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Back to dashboard
          </button>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-sm text-muted dark:text-muted-dark">
        Loading…
      </div>
    );
  }

  return (
    <div className="editor-layout flex min-h-screen flex-col md:h-screen md:min-h-0">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <input
            value={resume.title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-w-0 max-w-[280px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-medium outline-none hover:border-border focus:border-accent sm:w-auto"
          />
          <span
            className={`text-xs ${saveError && !saving ? "text-danger" : "text-muted dark:text-muted-dark"}`}
            role="status"
          >
            {saving
              ? "Saving…"
              : saveError
                ? saveError
                : dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={resume.templateId}
            onChange={(e) => setTemplate(e.target.value as TemplateId)}
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
      <div className="flex flex-1 flex-col overflow-visible md:min-h-0 md:flex-row md:overflow-hidden">
        {/* Form pane */}
        <div className="flex w-full flex-col border-b border-border dark:border-border-dark md:min-h-0 md:w-[46%] md:shrink-0 md:border-b-0 md:border-r">
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
          <div className="min-w-0 px-4 py-5 sm:px-5 md:min-h-0 md:flex-1 md:overflow-y-auto">
            {tab === "personal" && <PersonalInfoForm />}
            {tab === "experience" && <ExperienceForm />}
            {tab === "education" && <EducationForm />}
            {tab === "skills" && <SkillsForm />}
            {tab === "projects" && <ProjectsForm />}
            {tab === "ai" && <AIPanel resumeId={id} />}
          </div>
        </div>

        {/* Preview pane */}
        <div className="w-full min-w-0 overflow-x-auto bg-black/[0.02] py-5 dark:bg-white/[0.02] md:min-h-0 md:flex-1 md:overflow-y-auto">
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );
}
