import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listResumes, createResume, deleteResume } from "../api/resumes.js";

const TEMPLATE_LABEL = {
  classic: "Classic",
  modern: "Modern",
  minimal: "Minimal",
  technical: "Technical",
};

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const data = await listResumes();
    setResumes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const resume = await createResume({ title: "Untitled Resume", templateId: "classic" });
    navigate(`/editor/${resume._id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this resume? This can't be undone.")) return;
    await deleteResume(id);
    setResumes((r) => r.filter((x) => x._id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your resumes</h1>
          <p className="mt-1 text-sm text-muted dark:text-muted-dark">
            {resumes.length} resume{resumes.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-light"
        >
          + New resume
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted dark:text-muted-dark">Loading…</p>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center dark:border-border-dark">
          <p className="text-sm text-muted dark:text-muted-dark">
            No resumes yet. Start with a blank one — you can pick a template inside the editor.
          </p>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-light"
          >
            Create your first resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div
              key={r._id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-white p-5 transition hover:border-accent dark:border-border-dark dark:bg-surface-dark"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{r.title}</h3>
                  {r.baseResumeId && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent dark:bg-accent/20 dark:text-accent-light">
                      Tailored
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted dark:text-muted-dark">
                  {TEMPLATE_LABEL[r.templateId] || r.templateId} · Updated{" "}
                  {new Date(r.updatedAt).toLocaleDateString()}
                </p>
                {r.lastAtsCheck?.score != null && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-[120px] rounded-full bg-black/5 dark:bg-white/10">
                      <div
                        className="h-1.5 rounded-full bg-success"
                        style={{ width: `${r.lastAtsCheck.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted dark:text-muted-dark">
                      {r.lastAtsCheck.score}% ATS
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate(`/editor/${r._id}`)}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-border-dark dark:hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r._id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-danger/5 dark:border-border-dark"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
