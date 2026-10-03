// Server-side HTML renderers for each template. These mirror the React
// preview components (client/src/components/preview/templates/*) so the
// exported PDF matches what the user saw on screen. Keep both in sync when
// changing a template's look.

import type { IResume } from "../models/Resume.js";

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dateRange(start, end, current) {
  const from = esc(start || "");
  const to = current ? "Present" : esc(end || "");
  if (!from && !to) return "";
  return `${from} – ${to}`;
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page {
      width: 794px; /* A4 @ 96dpi */
      min-height: 1123px;
      padding: 48px 56px;
      font-family: 'Inter', Arial, sans-serif;
      color: #1c1e21;
      font-size: 13px;
      line-height: 1.5;
    }
    h1, h2, h3 { margin: 0; }
    ul { margin: 4px 0 0; padding-left: 18px; }
    li { margin-bottom: 3px; }
    .section { margin-top: 18px; }
    .section:first-of-type { margin-top: 0; }
    .muted { color: #55575e; }
    .row-between { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  `;
}

function contactLine(p) {
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github]
    .filter(Boolean)
    .map(esc)
    .join("  •  ");
}

function renderClassic(resume) {
  const p = resume.personalInfo || {};
  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    ${baseStyles()}
    .page { font-family: Georgia, 'Times New Roman', serif; }
    .name { font-size: 26px; font-weight: 700; letter-spacing: 0.3px; }
    .title { font-size: 14px; color: #55575e; margin-top: 2px; }
    .contact { font-size: 11.5px; margin-top: 8px; color: #444; }
    .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #1c1e21; padding-bottom: 3px; margin-bottom: 8px; }
    .item { margin-bottom: 10px; }
    .item-title { font-weight: 700; }
  </style></head>
  <body><div class="page">
    <div class="name">${esc(p.fullName)}</div>
    <div class="title">${esc(p.title)}</div>
    <div class="contact">${contactLine(p)}</div>

    ${p.summary ? `<div class="section"><div class="section-title">Summary</div><div>${esc(p.summary)}</div></div>` : ""}

    ${resume.experience?.length ? `<div class="section"><div class="section-title">Experience</div>
      ${resume.experience.map(e => `
        <div class="item">
          <div class="row-between"><span class="item-title">${esc(e.role)} — ${esc(e.company)}</span><span class="muted">${dateRange(e.startDate, e.endDate, e.current)}</span></div>
          ${e.location ? `<div class="muted">${esc(e.location)}</div>` : ""}
          <ul>${(e.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>` : ""}

    ${resume.projects?.length ? `<div class="section"><div class="section-title">Projects</div>
      ${resume.projects.map(pr => `
        <div class="item">
          <div class="item-title">${esc(pr.name)}${pr.tech?.length ? ` <span class="muted">(${pr.tech.map(esc).join(", ")})</span>` : ""}</div>
          ${pr.description ? `<div>${esc(pr.description)}</div>` : ""}
          <ul>${(pr.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>` : ""}

    ${resume.education?.length ? `<div class="section"><div class="section-title">Education</div>
      ${resume.education.map(ed => `
        <div class="item">
          <div class="row-between"><span class="item-title">${esc(ed.degree)}${ed.field ? `, ${esc(ed.field)}` : ""}</span><span class="muted">${dateRange(ed.startDate, ed.endDate, ed.current)}</span></div>
          <div class="muted">${esc(ed.school)}${ed.location ? `, ${esc(ed.location)}` : ""}</div>
          ${ed.details ? `<div>${esc(ed.details)}</div>` : ""}
        </div>`).join("")}
    </div>` : ""}

    ${resume.skills?.length ? `<div class="section"><div class="section-title">Skills</div><div>${resume.skills.map(esc).join("  •  ")}</div></div>` : ""}

    ${resume.certifications?.length ? `<div class="section"><div class="section-title">Certifications</div>
      ${resume.certifications.map(c => `<div>${esc(c.name)} — ${esc(c.issuer)} <span class="muted">(${esc(c.date)})</span></div>`).join("")}
    </div>` : ""}
  </div></body></html>`;
}

function renderModern(resume) {
  const p = resume.personalInfo || {};
  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    ${baseStyles()}
    .page { padding: 0; }
    .header { background: #4F46E5; color: #fff; padding: 40px 56px 28px; }
    .name { font-size: 28px; font-weight: 800; }
    .title { font-size: 14px; opacity: 0.9; margin-top: 2px; }
    .contact { font-size: 11.5px; margin-top: 10px; opacity: 0.85; }
    .body { padding: 28px 56px 48px; }
    .section-title { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4F46E5; margin-bottom: 8px; }
    .item { margin-bottom: 10px; }
    .item-title { font-weight: 700; }
    .skill-pill { display: inline-block; background: #EEF0FF; color: #4338CA; border-radius: 999px; padding: 3px 10px; font-size: 11.5px; margin: 2px 4px 2px 0; }
  </style></head>
  <body><div class="page">
    <div class="header">
      <div class="name">${esc(p.fullName)}</div>
      <div class="title">${esc(p.title)}</div>
      <div class="contact">${contactLine(p)}</div>
    </div>
    <div class="body">
      ${p.summary ? `<div class="section"><div class="section-title">Summary</div><div>${esc(p.summary)}</div></div>` : ""}

      ${resume.experience?.length ? `<div class="section"><div class="section-title">Experience</div>
        ${resume.experience.map(e => `
          <div class="item">
            <div class="row-between"><span class="item-title">${esc(e.role)} · ${esc(e.company)}</span><span class="muted">${dateRange(e.startDate, e.endDate, e.current)}</span></div>
            <ul>${(e.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
          </div>`).join("")}
      </div>` : ""}

      ${resume.projects?.length ? `<div class="section"><div class="section-title">Projects</div>
        ${resume.projects.map(pr => `
          <div class="item">
            <div class="item-title">${esc(pr.name)}</div>
            ${pr.description ? `<div>${esc(pr.description)}</div>` : ""}
            <ul>${(pr.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
          </div>`).join("")}
      </div>` : ""}

      ${resume.skills?.length ? `<div class="section"><div class="section-title">Skills</div><div>${resume.skills.map(s => `<span class="skill-pill">${esc(s)}</span>`).join("")}</div></div>` : ""}

      ${resume.education?.length ? `<div class="section"><div class="section-title">Education</div>
        ${resume.education.map(ed => `
          <div class="item">
            <div class="row-between"><span class="item-title">${esc(ed.degree)}${ed.field ? `, ${esc(ed.field)}` : ""}</span><span class="muted">${dateRange(ed.startDate, ed.endDate, false)}</span></div>
            <div class="muted">${esc(ed.school)}</div>
          </div>`).join("")}
      </div>` : ""}

      ${resume.certifications?.length ? `<div class="section"><div class="section-title">Certifications</div>
        ${resume.certifications.map(c => `<div>${esc(c.name)} — ${esc(c.issuer)} <span class="muted">(${esc(c.date)})</span></div>`).join("")}
      </div>` : ""}
    </div>
  </div></body></html>`;
}

function renderMinimal(resume) {
  const p = resume.personalInfo || {};
  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    ${baseStyles()}
    .name { font-size: 22px; font-weight: 600; }
    .title { font-size: 13px; color: #55575e; }
    .contact { font-size: 11px; margin-top: 6px; color: #777; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #999; margin-bottom: 6px; }
    .item { margin-bottom: 9px; }
    .item-title { font-weight: 600; }
    hr { border: none; border-top: 1px solid #eee; margin: 16px 0; }
  </style></head>
  <body><div class="page">
    <div class="name">${esc(p.fullName)}</div>
    <div class="title">${esc(p.title)}</div>
    <div class="contact">${contactLine(p)}</div>
    <hr/>
    ${p.summary ? `<div class="section"><div>${esc(p.summary)}</div></div>` : ""}

    ${resume.experience?.length ? `<div class="section"><div class="section-title">Experience</div>
      ${resume.experience.map(e => `
        <div class="item">
          <div class="row-between"><span class="item-title">${esc(e.role)}, ${esc(e.company)}</span><span class="muted">${dateRange(e.startDate, e.endDate, e.current)}</span></div>
          <ul>${(e.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>` : ""}

    ${resume.education?.length ? `<div class="section"><div class="section-title">Education</div>
      ${resume.education.map(ed => `<div class="item row-between"><span>${esc(ed.degree)}, ${esc(ed.school)}</span><span class="muted">${dateRange(ed.startDate, ed.endDate, false)}</span></div>`).join("")}
    </div>` : ""}

    ${resume.skills?.length ? `<div class="section"><div class="section-title">Skills</div><div>${resume.skills.map(esc).join(", ")}</div></div>` : ""}

    ${resume.projects?.length ? `<div class="section"><div class="section-title">Projects</div>
      ${resume.projects.map(pr => `<div class="item"><span class="item-title">${esc(pr.name)}</span> — ${esc(pr.description || "")}</div>`).join("")}
    </div>` : ""}
  </div></body></html>`;
}

function renderTechnical(resume) {
  const p = resume.personalInfo || {};
  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    ${baseStyles()}
    .page { font-family: 'Inter', Arial, sans-serif; }
    .name { font-size: 22px; font-weight: 700; }
    .title { font-size: 13px; color: #4F46E5; font-weight: 600; }
    .contact { font-size: 11px; margin-top: 6px; color: #555; font-family: monospace; }
    .section-title { font-size: 12px; font-weight: 700; color: #1c1e21; border-left: 3px solid #4F46E5; padding-left: 8px; margin-bottom: 8px; }
    .item-title { font-weight: 700; }
    .item { margin-bottom: 10px; }
    .tech-tag { display: inline-block; border: 1px solid #ddd; border-radius: 4px; padding: 1px 6px; font-size: 10.5px; margin: 2px 3px 0 0; font-family: monospace; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 4px; }
  </style></head>
  <body><div class="page">
    <div class="name">${esc(p.fullName)}</div>
    <div class="title">${esc(p.title)}</div>
    <div class="contact">${contactLine(p)}</div>

    ${p.summary ? `<div class="section"><div class="section-title">Summary</div><div>${esc(p.summary)}</div></div>` : ""}

    ${resume.skills?.length ? `<div class="section"><div class="section-title">Technical Skills</div><div class="skills-grid">${resume.skills.map(s => `<span class="tech-tag">${esc(s)}</span>`).join("")}</div></div>` : ""}

    ${resume.experience?.length ? `<div class="section"><div class="section-title">Experience</div>
      ${resume.experience.map(e => `
        <div class="item">
          <div class="row-between"><span class="item-title">${esc(e.role)} @ ${esc(e.company)}</span><span class="muted">${dateRange(e.startDate, e.endDate, e.current)}</span></div>
          <ul>${(e.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>` : ""}

    ${resume.projects?.length ? `<div class="section"><div class="section-title">Projects</div>
      ${resume.projects.map(pr => `
        <div class="item">
          <div class="item-title">${esc(pr.name)}</div>
          ${pr.description ? `<div>${esc(pr.description)}</div>` : ""}
          <ul>${(pr.bullets || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
          ${pr.tech?.length ? `<div class="skills-grid" style="margin-top:4px">${pr.tech.map(t => `<span class="tech-tag">${esc(t)}</span>`).join("")}</div>` : ""}
        </div>`).join("")}
    </div>` : ""}

    ${resume.education?.length ? `<div class="section"><div class="section-title">Education</div>
      ${resume.education.map(ed => `<div class="item row-between"><span class="item-title">${esc(ed.degree)}, ${esc(ed.school)}</span><span class="muted">${dateRange(ed.startDate, ed.endDate, false)}</span></div>`).join("")}
    </div>` : ""}

    ${resume.certifications?.length ? `<div class="section"><div class="section-title">Certifications</div>
      ${resume.certifications.map(c => `<div>${esc(c.name)} — ${esc(c.issuer)} <span class="muted">(${esc(c.date)})</span></div>`).join("")}
    </div>` : ""}
  </div></body></html>`;
}

const RENDERERS = {
  classic: renderClassic,
  modern: renderModern,
  minimal: renderMinimal,
  technical: renderTechnical,
};

export function renderResumeHtml(resume: IResume): string {
  const renderer =
    (RENDERERS as Record<string, (resume: IResume) => string>)[resume.templateId] || renderClassic;
  return renderer(resume);
}
