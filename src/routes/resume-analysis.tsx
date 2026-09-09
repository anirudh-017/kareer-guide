import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { ScoreCard } from "@/components/ScoreCard";
import { seo } from "@/lib/seo";
import { tailorApply } from "@/lib/jobsy.functions";
import { attachTailoredResume } from "@/lib/savedJobs";
import { SK, readJson, writeJson, type TailorHandoff } from "@/lib/session";
import type { ResumeAnalysis, Signal } from "@/lib/types";

export const Route = createFileRoute("/resume-analysis")({
  head: () =>
    seo({
      title: "Resume Analysis & Hiring Signals",
      description:
        "See your resume score, JD fit, 15 hiring signals, recruiter red flags and XYZ-formula bullet rewrites before you apply the changes.",
      path: "/resume-analysis",
      keywords: ["resume score", "ats score checker", "recruiter red flags", "xyz formula bullets"],
    }),
  component: AnalysisPage,
});

function SignalGroup({ title, signals }: { title: string; signals: Signal[] }) {
  return (
    <div className="card-brutal">
      <p className="label">{title}</p>
      <ul className="mt-4 space-y-4">
        {(signals ?? []).map((s, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold">{s.name}</span>
              <span className="label">{s.score}</span>
            </div>
            <div
              className="signal-track mt-2"
              role="progressbar"
              aria-label={s.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.max(0, Math.min(100, s.score))}
            >
              <div
                className="signal-fill"
                style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisPage() {
  const navigate = useNavigate();
  const run = useServerFn(tailorApply);
  const [a, setA] = useState<ResumeAnalysis | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [bullets, setBullets] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const parsed = readJson<ResumeAnalysis>(SK.analysis);
    if (!parsed) return;
    setA(parsed);
    setKeywords(parsed.missingKeywords ?? []);
    setBullets((parsed.bulletRewrites ?? []).map((b) => b.after));
    setFlags(parsed.redFlags ?? []);
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  async function apply() {
    setBusy(true);
    try {
      const result = await run({
        data: {
          resumeText: sessionStorage.getItem(SK.resumeText) ?? "",
          ...(sessionStorage.getItem(SK.jd)
            ? { jobDescription: sessionStorage.getItem(SK.jd)! }
            : {}),
          ...(sessionStorage.getItem(SK.region)
            ? { region: sessionStorage.getItem(SK.region)! }
            : {}),
          ...(sessionStorage.getItem(SK.profile)
            ? { companyProfile: sessionStorage.getItem(SK.profile)! }
            : {}),
          approvedKeywords: keywords,
          approvedBullets: bullets,
          redFlags: flags,
        },
      });
      const job = readJson<TailorHandoff>(SK.tailorContext);
      if (job?.savedId) {
        attachTailoredResume(job.savedId, result.tailoredResume, result.score, result.fitScore);
      }
      writeJson(SK.tailored, { ...result, job });
      navigate({ to: "/tailored-resume" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the resume");
    } finally {
      setBusy(false);
    }
  }

  if (!a)
    return (
      <Page title="Resume Analysis">
        <p className="text-sm text-muted-foreground">No analysis yet — start from Tailor Resume.</p>
      </Page>
    );

  return (
    <Page title="Analysis Review" intro="Approve what you want applied, then generate the rewrite.">
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard label="RESUME SCORE" value={a.score} />
        <ScoreCard label="JD FIT SCORE" value={a.fitScore} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SignalGroup title="ATS FIT" signals={a.atsFit} />
        <SignalGroup title="REVIEWER LENS" signals={a.reviewerLens} />
        <SignalGroup title="EXECUTIVE CLARITY" signals={a.executiveClarity} />
      </div>

      <div className="mt-8 card-brutal">
        <p className="label">PRIORITY FIXES</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {(a.priorityFixes ?? []).map((f, i) => (
            <li key={i}>· {f}</li>
          ))}
        </ul>
        {a.benchmark && <p className="mt-4 text-sm">{a.benchmark}</p>}
      </div>

      <div className="mt-8 card-brutal">
        <p className="label">RECRUITER RED FLAGS — TICK THE ONES TO FIX</p>
        <div className="mt-3 space-y-2">
          {(a.redFlags ?? []).map((f, i) => (
            <label key={i} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={flags.includes(f)}
                onChange={() => toggle(flags, setFlags, f)}
              />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-8 card-brutal">
        <p className="label">MISSING KEYWORDS — TAP TO INCLUDE</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(a.missingKeywords ?? []).map((k) => (
            <button
              key={k}
              onClick={() => toggle(keywords, setKeywords, k)}
              aria-pressed={keywords.includes(k)}
              className="keyword-chip"
              style={
                keywords.includes(k)
                  ? { background: "var(--pink)", color: "var(--accent-foreground)" }
                  : undefined
              }
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 card-brutal">
        <p className="label">SUGGESTED BULLETS (GOOGLE XYZ FORMULA)</p>
        <div className="mt-3 space-y-4">
          {(a.bulletRewrites ?? []).map((b, i) => (
            <label key={i} className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={bullets.includes(b.after)}
                onChange={() => toggle(bullets, setBullets, b.after)}
              />
              <span className="text-sm">
                <span className="block text-muted-foreground line-through">{b.before}</span>
                <span className="mt-1 block">{b.after}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {a.summaryRewrite && (
        <div className="mt-8 card-brutal">
          <p className="label">SUMMARY REWRITE</p>
          <p className="mt-3 text-sm">{a.summaryRewrite}</p>
        </div>
      )}

      <button
        disabled={busy}
        className="btn-brutal mt-8 w-full disabled:opacity-60"
        onClick={apply}
      >
        <span className="relative z-10 flex items-center gap-2">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy ? "GENERATING… THIS CAN TAKE A MINUTE" : "APPLY AND GENERATE TAILORED RESUME"}
        </span>
        <span className="nav-fill" />
      </button>
    </Page>
  );
}
