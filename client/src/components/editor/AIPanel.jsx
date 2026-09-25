import { useState } from "react";
import { useResumeStore } from "../../store/resumeStore.js";
import { checkAtsScore, generateSummary } from "../../api/ai.js";

function ScoreRing({ score }) {
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="28" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r="28"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
        {score}
      </text>
    </svg>
  );
}

export default function AIPanel({ resumeId }) {
  const { resume, updatePersonalInfo, setAtsCheck } = useResumeStore();
  const [jd, setJd] = useState(resume.jobDescription || "");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState("");
  const result = resume.lastAtsCheck;

  const handleCheck = async () => {
    if (!jd.trim()) return;
    setError("");
    setLoading(true);
    try {
      const data = await checkAtsScore(resumeId, jd);
      setAtsCheck({
        score: data.score,
        missingKeywords: data.missingKeywords,
        notes: data.notes,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.response?.data?.message || "ATS check failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummarizing(true);
    setError("");
    try {
      const { summary } = await generateSummary(resumeId, jd);
      updatePersonalInfo({ summary });
    } catch (err) {
      setError(err.response?.data?.message || "Summary generation failed");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted dark:text-muted-dark">
          Paste a job description
        </label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={6}
          placeholder="Paste the job posting here to get an ATS match score and tailored suggestions."
          className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCheck}
          disabled={loading || !jd.trim()}
          className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-60"
        >
          {loading ? "Scoring…" : "Check ATS score"}
        </button>
        <button
          onClick={handleGenerateSummary}
          disabled={summarizing}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-border-dark dark:hover:bg-white/5"
        >
          {summarizing ? "…" : "✨ Generate summary"}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result?.score != null && (
        <div className="rounded-lg border border-border p-4 dark:border-border-dark">
          <div className="flex items-center gap-4">
            <div className="text-accent">
              <ScoreRing score={result.score} />
            </div>
            <div>
              <p className="text-sm font-medium">ATS match score</p>
              <p className="text-xs text-muted dark:text-muted-dark">
                Checked {new Date(result.checkedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {result.notes && <p className="mt-3 text-sm">{result.notes}</p>}

          {result.missingKeywords?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted dark:text-muted-dark">
                Missing keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs text-warning"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
