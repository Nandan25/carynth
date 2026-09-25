import { useResumeStore } from "../../store/resumeStore.js";

const emptyEducation = {
  school: "",
  degree: "",
  field: "",
  location: "",
  startDate: "",
  endDate: "",
  details: "",
};

export default function EducationForm() {
  const { resume, addItem, updateItem, removeItem } = useResumeStore();

  return (
    <div className="space-y-5">
      {resume.education.map((ed, i) => (
        <div key={i} className="rounded-lg border border-border p-4 dark:border-border-dark">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted dark:text-muted-dark">
              Education {i + 1}
            </span>
            <button
              onClick={() => removeItem("education", i)}
              className="text-xs text-danger hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="School"
              value={ed.school}
              onChange={(e) => updateItem("education", i, { school: e.target.value })}
              className="col-span-2 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Degree (e.g. B.S.)"
              value={ed.degree}
              onChange={(e) => updateItem("education", i, { degree: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Field of study"
              value={ed.field}
              onChange={(e) => updateItem("education", i, { field: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="Start"
              value={ed.startDate}
              onChange={(e) => updateItem("education", i, { startDate: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <input
              placeholder="End"
              value={ed.endDate}
              onChange={(e) => updateItem("education", i, { endDate: e.target.value })}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
            <textarea
              placeholder="Notable coursework, honors, GPA (optional)"
              value={ed.details}
              onChange={(e) => updateItem("education", i, { details: e.target.value })}
              rows={2}
              className="col-span-2 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => addItem("education", emptyEducation)}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-muted hover:border-accent hover:text-accent dark:border-border-dark dark:text-muted-dark"
      >
        + Add education
      </button>
    </div>
  );
}
