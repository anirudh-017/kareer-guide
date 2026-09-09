import type { CSSProperties } from "react";

export function ScoreCard({ label, value }: { label: string; value: number }) {
  const score = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  const tone = score >= 80 ? "strong" : score >= 60 ? "developing" : "attention";
  const offset = 251.33 * (1 - score / 100);
  return (
    <div className="score-card" data-tone={tone}>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="score-value">
          {score}
          <span>/ 100</span>
        </p>
      </div>
      <svg className="score-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="score-track" cx="50" cy="50" r="40" />
        <circle
          className="score-arc"
          cx="50"
          cy="50"
          r="40"
          style={{ "--score-offset": offset, strokeDashoffset: offset } as CSSProperties}
        />
      </svg>
    </div>
  );
}
