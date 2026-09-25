import { useResumeStore } from "../../store/resumeStore.js";

const FIELDS = [
  { key: "fullName", label: "Full name", placeholder: "Jane Doe" },
  { key: "title", label: "Headline / target role", placeholder: "Senior Product Designer" },
  { key: "email", label: "Email", placeholder: "jane@example.com" },
  { key: "phone", label: "Phone", placeholder: "+1 555 123 4567" },
  { key: "location", label: "Location", placeholder: "San Francisco, CA" },
  { key: "website", label: "Website", placeholder: "janedoe.com" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janedoe" },
  { key: "github", label: "GitHub", placeholder: "github.com/janedoe" },
];

export default function PersonalInfoForm() {
  const { resume, updatePersonalInfo } = useResumeStore();
  const p = resume.personalInfo || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.key === "fullName" || f.key === "title" ? "col-span-2" : ""}>
            <label className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark">
              {f.label}
            </label>
            <input
              value={p[f.key] || ""}
              onChange={(e) => updatePersonalInfo({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark">
          Summary
        </label>
        <textarea
          value={p.summary || ""}
          onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
          rows={4}
          placeholder="2-3 sentences on your strongest, most specific qualifications."
          className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
        />
      </div>
    </div>
  );
}
