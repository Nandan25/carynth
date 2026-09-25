function dateRange(start, end, current) {
  const from = start || "";
  const to = current ? "Present" : end || "";
  if (!from && !to) return "";
  return `${from} – ${to}`;
}

function contactLine(p) {
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).join("  •  ");
}

export default function Classic({ resume }) {
  const p = resume.personalInfo || {};
  return (
    <div className="bg-white text-[#1c1e21] p-12 font-serif text-[13px] leading-relaxed" style={{ width: 794, minHeight: 1000 }}>
      <div className="text-2xl font-bold tracking-wide">{p.fullName || "Your Name"}</div>
      <div className="text-sm text-[#55575e] mt-0.5">{p.title}</div>
      <div className="text-[11.5px] text-[#444] mt-2">{contactLine(p)}</div>

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
                <span className="font-bold">{e.role} — {e.company}</span>
                <span className="text-[#55575e]">{dateRange(e.startDate, e.endDate, e.current)}</span>
              </div>
              {e.location && <div className="text-[#55575e]">{e.location}</div>}
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
              <div className="font-bold">{pr.name}{pr.tech?.length ? ` (${pr.tech.join(", ")})` : ""}</div>
              {pr.description && <div>{pr.description}</div>}
              <ul className="list-disc pl-4 mt-0.5">
                {(pr.bullets || []).map((b, bi) => <li key={bi}>{b}</li>)}
              </ul>
            </div>
          ))}
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
              <div className="text-[#55575e]">{ed.school}{ed.location ? `, ${ed.location}` : ""}</div>
            </div>
          ))}
        </Section>
      )}

      {resume.skills?.length > 0 && (
        <Section title="Skills">
          <p>{resume.skills.join("  •  ")}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[13px] uppercase tracking-wider border-b-[1.5px] border-[#1c1e21] pb-1 mb-2">{title}</div>
      {children}
    </div>
  );
}
