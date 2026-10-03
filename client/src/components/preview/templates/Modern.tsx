import type { ReactNode } from "react";
import type { Resume } from "../../../store/resumeStore";

function dateRange(start, end, current) {
  const from = start || "";
  const to = current ? "Present" : end || "";
  if (!from && !to) return "";
  return `${from} – ${to}`;
}

function contactLine(p) {
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).join("  •  ");
}

export default function Modern({ resume }: { resume: Resume }) {
  const p = resume.personalInfo || {};
  return (
    <div className="bg-white text-[#1c1e21] text-[13px] leading-relaxed" style={{ width: 794, minHeight: 1000 }}>
      <div className="bg-accent text-white px-14 pt-10 pb-7">
        <div className="text-[28px] font-extrabold">{p.fullName || "Your Name"}</div>
        <div className="text-sm opacity-90 mt-0.5">{p.title}</div>
        <div className="text-[11.5px] opacity-80 mt-2.5">{contactLine(p)}</div>
      </div>

      <div className="px-14 py-7">
        {p.summary && (
          <Section title="Summary">
            <p>{p.summary}</p>
          </Section>
        )}

        {resume.experience?.length > 0 && (
          <Section title="Experience">
            {resume.experience.map((e, i) => (
              <div key={i} className="mb-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{e.role} · {e.company}</span>
                  <span className="text-[#55575e]">{dateRange(e.startDate, e.endDate, e.current)}</span>
                </div>
                <ul className="list-disc pl-4 mt-0.5">
                  {(e.bullets || []).map((b, bi) => <li key={bi}>{b}</li>)}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.projects?.length > 0 && (
          <Section title="Projects">
            {resume.projects.map((pr, i) => (
              <div key={i} className="mb-2.5">
                <div className="font-bold">{pr.name}</div>
                {pr.description && <div>{pr.description}</div>}
                <ul className="list-disc pl-4 mt-0.5">
                  {(pr.bullets || []).map((b, bi) => <li key={bi}>{b}</li>)}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {resume.skills?.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => (
                <span key={i} className="rounded-full bg-accent-soft text-[#4338CA] px-2.5 py-0.5 text-[11.5px]">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}

        {resume.education?.length > 0 && (
          <Section title="Education">
            {resume.education.map((ed, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{ed.degree}{ed.field ? `, ${ed.field}` : ""}</span>
                  <span className="text-[#55575e]">{dateRange(ed.startDate, ed.endDate)}</span>
                </div>
                <div className="text-[#55575e]">{ed.school}</div>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[12.5px] font-bold uppercase tracking-wide text-accent mb-2">{title}</div>
      {children}
    </div>
  );
}
