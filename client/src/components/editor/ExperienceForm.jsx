import { useState } from "react";
import { useResumeStore } from "../../store/resumeStore.js";
import { improveBullet } from "../../api/ai.js";

const emptyExperience = {
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  bullets: [],
};

export default function ExperienceForm() {
  const { resume, addItem, updateItem, removeItem, addBullet, updateBullet, removeBullet } =
    useResumeStore();
  const [improvingKey, setImprovingKey] = useState(null);

  const handleImprove = async (itemIndex, bulletIndex) => {
    const text = resume.experience[itemIndex].bullets[bulletIndex];
    if (!text?.trim()) return;
    const key = `${itemIndex}-${bulletIndex}`;
    setImprovingKey(key);
    try {
      const { rewritten } = await improveBullet(text, resume.jobDescription || "");
      updateBullet("experience", itemIndex, bulletIndex, rewritten);
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't improve this bullet right now");
    } finally {
      setImprovingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      {resume.experience.map((exp, i) => (
        <div key={i} className="rounded-lg border border-border p-4 dark:border-border-dark">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted dark:text-muted-dark">
              Position {i + 1}
            </span>
            <button
              onClick={() => removeItem("experience", i)}
              className="text-xs text-danger hover:underline"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Role"
              value={exp.role}
              onChange={(e) => updateItem("experience", i, { role: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Company"
              value={exp.company}
              onChange={(e) => updateItem("experience", i, { company: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Location"
              value={exp.location}
              onChange={(e) => updateItem("experience", i, { location: e.target.value })}
              className="col-span-2 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Start (e.g. Jan 2022)"
              value={exp.startDate}
              onChange={(e) => updateItem("experience", i, { startDate: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="End (or blank if current)"
              value={exp.endDate}
              disabled={exp.current}
              onChange={(e) => updateItem("experience", i, { endDate: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark"
            />
          </div>

          <label className="mt-2 flex items-center gap-2 text-xs text-muted dark:text-muted-dark">
            <input
              type="checkbox"
              checked={exp.current}
              onChange={(e) => updateItem("experience", i, { current: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#4F46E5]"
            />
            I currently work here
          </label>

          <div className="mt-3 space-y-2">
            {(exp.bullets || []).map((b, bi) => {
              const key = `${i}-${bi}`;
              return (
                <div key={bi} className="flex gap-2">
                  <textarea
                    value={b}
                    onChange={(e) => updateBullet("experience", i, bi, e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleImprove(i, bi)}
                      disabled={improvingKey === key}
                      title="Improve with AI"
                      className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-border-dark dark:hover:bg-white/5"
                    >
                      {improvingKey === key ? "…" : "✨"}
                    </button>
                    <button
                      onClick={() => removeBullet("experience", i, bi)}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-danger hover:bg-danger/5 dark:border-border-dark"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => addBullet("experience", i, "")}
              className="text-xs font-medium text-accent hover:underline"
            >
              + Add bullet point
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => addItem("experience", emptyExperience)}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-muted hover:border-accent hover:text-accent dark:border-border-dark dark:text-muted-dark"
      >
        + Add position
      </button>
    </div>
  );
}
