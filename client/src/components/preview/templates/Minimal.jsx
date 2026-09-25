function dateRange(start, end, current) {
  const from = start || "";
  const to = current ? "Present" : end || "";
  if (!from && !to) return "";
  return `${from} – ${to}`;
}

function contactLine(p) {
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).join("  •  ");
}

export default function Minimal({ resume }) {
  const p = resume.personalInfo || {};
  return (
    <div className="bg-white text-[#1c1e21] p-12 text-[13px] leading-relaxed" style={{ width: 794, minHeight: 1000 }}>
      <div className="text-[22px] font-semibold">{p.fullName || "Your Name"}</div>
      <div className="text-[13px] text-[#55575e]">{p.title}</div>
      <div className="text-[11px] text-[#777] mt-1.5">{contactLine(p)}</div>
      <hr className="my-4 border-[#eee]" />

      {p.summary && <p className="mb-4">{p.summary}</p>}

      {resume.experience?.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">{e.role}, {e.company}</span>
                <span className="text-[#55575e]">{dateRange(e.startDate, e.endDate, e.current)}</span>
              </div>
              <ul className="list-disc pl-4 mt-0.5">
                {(e.bullets || []).map((b, bi) => <li key={bi}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {resume.education?.length > 0 && (
        <Section title="Education">
          {resume.education.map((ed, i) => (
            <div key={i} className="flex justify-between mb-1">
              <span>{ed.degree}, {ed.school}</span>
              <span className="text-[#55575e]">{dateRange(ed.startDate, ed.endDate)}</span>
            </div>
          ))}
        </Section>
      )}

      {resume.skills?.length > 0 && (
        <Section title="Skills">
          <p>{resume.skills.join(", ")}</p>
        </Section>
      )}

      {resume.projects?.length > 0 && (
        <Section title="Projects">
          {resume.projects.map((pr, i) => (
            <div key={i} className="mb-1.5">
              <span className="font-semibold">{pr.name}</span> — {pr.description}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[11px] uppercase tracking-widest text-[#999] mb-1.5">{title}</div>
      {children}
    </div>
  );
}
