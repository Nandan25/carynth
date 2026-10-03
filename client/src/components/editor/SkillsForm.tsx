import { useState } from "react";
import { useResumeStore } from "../../store/resumeStore";

export default function SkillsForm() {
  const { resume, setSkills } = useResumeStore();
  const [input, setInput] = useState("");

  const addSkill = () => {
    const value = input.trim();
    if (!value) return;
    if (!resume.skills.includes(value)) {
      setSkills([...resume.skills, value]);
    }
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (skill) => {
    setSkills(resume.skills.filter((s) => s !== skill));
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark">
        Add a skill and press Enter
      </label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. React, Figma, SQL"
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
        />
        <button
          onClick={addSkill}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-black/5 dark:border-border-dark dark:hover:bg-white/5"
        >
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {resume.skills.map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs text-accent dark:bg-accent/20 dark:text-accent-light"
          >
            {s}
            <button onClick={() => removeSkill(s)} className="text-accent/70 hover:text-accent">
              ✕
            </button>
          </span>
        ))}
        {resume.skills.length === 0 && (
          <p className="text-xs text-muted dark:text-muted-dark">No skills added yet.</p>
        )}
      </div>
    </div>
  );
}
