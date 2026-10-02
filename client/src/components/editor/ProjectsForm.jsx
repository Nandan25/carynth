import { useResumeStore } from "../../store/resumeStore.js";
import VoiceInput from "./VoiceInput.jsx";

const emptyProject = {
  name: "",
  link: "",
  description: "",
  bullets: [],
  tech: [],
};

export default function ProjectsForm() {
  const { resume, addItem, updateItem, removeItem } = useResumeStore();

  const updateTech = (i, value) => {
    const tech = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateItem("projects", i, { tech });
  };

  const updateBulletsText = (i, value) => {
    const bullets = value.split("\n").filter((b) => b.trim() !== "");
    updateItem("projects", i, { bullets });
  };

  return (
    <div className="space-y-5">
      {resume.projects.map((pr, i) => (
        <div
          key={i}
          className="rounded-lg border border-border p-4 dark:border-border-dark"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted dark:text-muted-dark">
              Project {i + 1}
            </span>
            <button
              onClick={() => removeItem("projects", i)}
              className="text-xs text-danger hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="space-y-2">
            <input
              placeholder="Project name"
              value={pr.name}
              onChange={(e) =>
                updateItem("projects", i, { name: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Link (optional)"
              value={pr.link}
              onChange={(e) =>
                updateItem("projects", i, { link: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <textarea
              placeholder="One-line description"
              value={pr.description}
              onChange={(e) =>
                updateItem("projects", i, { description: e.target.value })
              }
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <VoiceInput
              label={`Dictate description for ${pr.name || `Project ${i + 1}`}`}
              onInsert={(text) =>
                updateItem("projects", i, {
                  description: [pr.description, text]
                    .filter(Boolean)
                    .join(" ")
                    .trim(),
                })
              }
            />
            <textarea
              placeholder="Bullet points (one per line)"
              value={(pr.bullets || []).join("\n")}
              onChange={(e) => updateBulletsText(i, e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <VoiceInput
              label={`Dictate bullet for ${pr.name || `Project ${i + 1}`}`}
              onInsert={(text) =>
                updateItem("projects", i, {
                  bullets: [...(pr.bullets || []), text],
                })
              }
            />
            <input
              placeholder="Tech used, comma-separated (e.g. React, Node, MongoDB)"
              value={(pr.tech || []).join(", ")}
              onChange={(e) => updateTech(i, e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => addItem("projects", emptyProject)}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-muted hover:border-accent hover:text-accent dark:border-border-dark dark:text-muted-dark"
      >
        + Add project
      </button>
    </div>
  );
}
