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

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-[#ddd] rounded px-1.5 py-0.5 text-[10.5px] font-mono mr-1 mt-1">
      {children}
    </span>
  );
}

export default function Technical({ resume }: { resume: Resume }) {
  const p = resume.personalInfo || {};
  return (
    <div className="bg-white text-[#1c1e21] p-12 text-[13px] leading-relaxed" style={{ width: 794, minHeight: 1000 }}>
      <div className="text-[22px] font-bold">{p.fullName || "Your Name"}</div>
      <div className="text-[13px] font-semibold text-accent">{p.title}</div>
      <div className="text-[11px] font-mono text-[#555] mt-1.5">{contactLine(p)}</div>

      {p.summary && (
        <Section title="Summary">
          <p>{p.summary}</p>
        </Section>
      )}

      {resume.skills?.length > 0 && (
        <Section title="Technical Skills">
          <div>{resume.skills.map((s, i) => <Tag key={i}>{s}</Tag>)}</div>
        </Section>
      )}

      {resume.experience?.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((e, i) => (
            <div key={i} className="mb-2.5">
              <div className="flex justify-between items-baseline">
                <span className="font-bold">{e.role} @ {e.company}</span>
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
              {pr.tech?.length > 0 && <div>{pr.tech.map((t, ti) => <Tag key={ti}>{t}</Tag>)}</div>}
            </div>
          ))}
        </Section>
      )}

      {resume.education?.length > 0 && (
        <Section title="Education">
          {resume.education.map((ed, i) => (
            <div key={i} className="flex justify-between mb-1">
              <span className="font-bold">{ed.degree}, {ed.school}</span>
              <span className="text-[#55575e]">{dateRange(ed.startDate, ed.endDate)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[12px] font-bold border-l-[3px] border-accent pl-2 mb-2">{title}</div>
      {children}
    </div>
  );
}
