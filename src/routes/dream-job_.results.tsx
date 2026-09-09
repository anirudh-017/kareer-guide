import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Info,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { buildSkillGaps, computeMatchScore, matchCategory, matchHeadline } from "@/lib/dream/match";
import type { GapStatus, SavedDreamJob } from "@/lib/dream/types";
import { roadmapProgress, saveDreamJob, toggleRoadmapTask } from "@/lib/dreamJobs";
import { SK, readJson, writeJson } from "@/lib/session";

export const Route = createFileRoute("/dream-job_/results")({
  head: () =>
    seo({
      title: "Your Dream Job Analysis",
      description:
        "Your eligibility, skill gaps, personalized roadmap, projects, interview prep and official application link for your dream job.",
      path: "/dream-job/results",
      keywords: ["dream job match", "skill gap analysis", "career roadmap"],
    }),
  component: DreamResults,
});

function statusIcon(s: GapStatus) {
  if (s === "match")
    return (
      <span aria-label="match" style={{ color: "#2f6f52" }}>
        ✓
      </span>
    );
  if (s === "partial")
    return (
      <span aria-label="partial match" style={{ color: "#8a6a1f" }}>
        ⚠
      </span>
    );
  return (
    <span aria-label="missing" style={{ color: "#8c3a2b" }}>
      ✕
    </span>
  );
}

/**
 * A section the model failed to fill in. Better to say so and offer a retry
 * than to render an empty heading and let the user wonder what broke.
 */
function Missing({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="mt-3">
      <p className="text-sm text-muted-foreground">
        We couldn't generate {what} this time — the rest of your analysis below is unaffected.
      </p>
      <button className="btn-brutal mt-3" onClick={onRetry}>
        <span className="relative z-10">TRY THE ANALYSIS AGAIN</span>
        <span className="nav-fill" />
      </button>
    </div>
  );
}

function matchColor(v: number) {
  return v >= 80 ? "#2f6f52" : v >= 60 ? "#8a6a1f" : "#8c3a2b";
}

function DreamResults() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedDreamJob | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(SK.dreamResult);
    if (!raw) return;
    try {
      const analysis = JSON.parse(raw) as SavedDreamJob;
      // Re-hydrate the pieces the client computes/keeps.
      const profile = readJson<SavedDreamJob["profile"]>(SK.dreamProfile);
      const skills = readJson<SavedDreamJob["skills"]>(SK.dreamSkills);
      const company = (sessionStorage.getItem(SK.dreamCompany) ?? "").trim();
      const role = (sessionStorage.getItem(SK.dreamRole) ?? "").trim();
      const merged: SavedDreamJob = {
        ...analysis,
        company: company || analysis.company,
        role: role || analysis.role,
        profile: profile ?? analysis.profile,
        skills: skills ?? analysis.skills,
      };
      // Compute the client-side gap table + match from the requirements.
      const gaps = buildSkillGaps(
        merged.skills,
        analysis.requirements.requiredSkills,
        analysis.requirements.preferredSkills,
        analysis.requirements.requiredLevels,
        analysis.aiSkillLevels ?? {},
      );
      const match = computeMatchScore(gaps);
      const category = matchCategory(match);
      const eligible = category === "strong" || category === "good";
      // Carry the previous match onto the record itself so History can show the
      // improvement without depending on sessionStorage still being around.
      const prior = readJson<{ match: number }>(SK.dreamPrevious)?.match;
      const complete: SavedDreamJob = {
        ...merged,
        ...(typeof prior === "number" ? { previousMatch: prior } : {}),
        match: {
          ...analysis.match,
          match,
          category,
          eligible,
          skillGaps: gaps,
          requirementsMet: analysis.requirements.requiredSkills.map((r) => {
            const g = gaps.find((x) => x.skill.toLowerCase() === r.toLowerCase());
            return {
              requirement: r,
              status: (g?.status ?? "missing") as GapStatus,
              yourEvidence: g?.yourLevel ?? "None",
            };
          }),
        },
      };
      setSaved(complete);
      setProgress(roadmapProgress(complete.roadmap));
      // Persist immediately so History and re-analysis work later.
      saveDreamJob(complete);
    } catch {
      toast.error("Could not load your analysis — run it again");
    }
  }, []);

  async function downloadPdf() {
    if (!saved) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth() - 80;
    let y = 55;
    const line = (text: string, size = 10.5, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const l of doc.splitTextToSize(text || " ", width) as string[]) {
        if (y > doc.internal.pageSize.getHeight() - 45) {
          doc.addPage();
          y = 55;
        }
        doc.text(l, 40, y);
        y += size + 4;
      }
    };
    line(`${saved.company || "Dream role"} — ${saved.role}`, 18, true);
    line(`Match: ${saved.match.match}% (${matchHeadline(saved.match.category)})`, 12, true);
    line(`Analyzed on: ${new Date(saved.createdAt).toLocaleDateString()}`);
    line("");
    line("SKILL GAPS", 13, true);
    for (const g of saved.match.skillGaps) {
      line(`- ${g.skill} (${g.kind}): you ${g.yourLevel} / need ${g.requiredLevel} [${g.status}]`);
    }
    line("");
    line("ROADMAP", 13, true);
    for (const [i, p] of saved.roadmap.entries()) {
      line(`Phase ${i + 1}: ${p.phase} (${p.duration})`, 11.5, true);
      line(`Why: ${p.why}`);
      line(`Learn: ${(p.topics ?? []).join(", ")}`);
      line(`Resources: ${(p.resources ?? []).join(", ")}`);
      line(`Outcome: ${p.outcome}`);
      line("");
    }
    doc.save("dream-job-roadmap.pdf");
  }

  if (!saved) {
    return (
      <Page title="Dream Job Analysis">
        <p className="text-sm text-muted-foreground">No analysis yet — start from the wizard.</p>
        <Link to="/dream-job" className="btn-brutal mt-6">
          <span className="relative z-10">START DREAM JOB ANALYSIS</span>
          <span className="nav-fill" />
        </Link>
      </Page>
    );
  }

  const r = saved.requirements;
  const applyUrl = r.sourceUrl;
  const applyLabel = applyUrl ? "View Official Job" : "View Official Careers";
  const previous =
    typeof saved.previousMatch === "number"
      ? { match: saved.previousMatch }
      : readJson<{ match: number }>(SK.dreamPrevious);

  /**
   * Send the user back to the wizard with this analysis's profile loaded and
   * the current match stashed, so the next run can show the improvement.
   */
  function reanalyze() {
    if (!saved) return;
    sessionStorage.setItem(SK.dreamPrevious, JSON.stringify({ match: saved.match.match }));
    sessionStorage.setItem(SK.dreamCompany, saved.company);
    sessionStorage.setItem(SK.dreamRole, saved.role);
    writeJson(SK.dreamProfile, saved.profile);
    writeJson(SK.dreamSkills, saved.skills);
    navigate({ to: "/dream-job" });
  }

  // Requirements older than this are worth re-checking against the live listing.
  const STALE_AFTER_DAYS = 30;
  const analyzedMs = Date.parse(r.analyzedAt);
  const ageDays = Number.isNaN(analyzedMs)
    ? null
    : Math.floor((Date.now() - analyzedMs) / 86_400_000);
  const staleDays = ageDays !== null && ageDays >= STALE_AFTER_DAYS ? ageDays : null;

  return (
    <Page title="Dream Job Analysis" intro={saved.match.explanation}>
      {/* 1-2. Header + overall match */}
      <div className="grid gap-px border border-border bg-border md:grid-cols-3">
        <div className="bg-background p-6 md:col-span-1">
          <p className="label text-muted-foreground">DREAM JOB</p>
          <p className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight">
            {saved.company || "Your target role"}
          </p>
          <p className="mt-1 text-lg font-bold">{saved.role}</p>
        </div>
        <div className="bg-background p-6">
          <p className="label text-muted-foreground">DREAM JOB MATCH</p>
          <p className="mt-1 text-6xl font-black" style={{ color: matchColor(saved.match.match) }}>
            {saved.match.match}%
          </p>
          <p className="label mt-1">{matchHeadline(saved.match.category).toUpperCase()}</p>
          {previous && (
            <p className="mt-2 text-xs text-muted-foreground">
              Previous match: {previous.match}% ({saved.match.match >= previous.match ? "+" : ""}
              {saved.match.match - previous.match}% improvement)
            </p>
          )}
        </div>
        <div className="bg-background p-6">
          <p className="label text-muted-foreground">ELIGIBILITY STATUS</p>
          {saved.match.eligible ? (
            <p className="mt-2 text-2xl font-black" style={{ color: "#2f6f52" }}>
              🎉 You're Currently Eligible
            </p>
          ) : (
            <p className="mt-2 text-2xl font-black">🚀 Not Quite There Yet</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {saved.match.eligible
              ? "Your profile appears to meet most listed requirements."
              : "You have a foundation — the roadmap below closes the gaps."}{" "}
            This is not a guarantee of employment.
          </p>
        </div>
      </div>

      {/* Unverified-listing disclaimer */}
      {!r.isVerified && (
        <div className="card-brutal mt-4 flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--pink)" }} />
          <p className="text-sm text-muted-foreground">{r.verificationNote}</p>
        </div>
      )}

      {/* Stale requirements — job specs move, so say so instead of quietly ageing */}
      {staleDays !== null && (
        <div className="card-brutal mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-start gap-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--pink)" }} />
            <span>
              These requirements were analyzed{" "}
              <span className="font-bold">{staleDays} days ago</span>. Job requirements change —
              re-run the analysis to check them against the current listing.
            </span>
          </p>
          <button className="btn-brutal shrink-0" onClick={reanalyze}>
            <span className="relative z-10">REFRESH REQUIREMENTS</span>
            <span className="nav-fill" />
          </button>
        </div>
      )}

      {/* 3. Target job card */}
      <div className="card-brutal mt-8">
        <p className="label text-muted-foreground">TARGET JOB</p>
        <div className="mt-3 grid gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="label">LOCATION</p>
            <p className="mt-1">{r.locations.join(", ") || "See listing"}</p>
          </div>
          <div>
            <p className="label">EXPERIENCE</p>
            <p className="mt-1">{r.experience || "Not specified"}</p>
          </div>
          <div>
            <p className="label">JOB TYPE</p>
            <p className="mt-1">{r.jobType}</p>
          </div>
          <div>
            <p className="label">SENIORITY</p>
            <p className="mt-1">{r.seniority || "Not specified"}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="label">KEY SKILLS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ...r.requiredSkills.map((s) => ({ s, req: true })),
              ...r.preferredSkills.map((s) => ({ s, req: false })),
            ].map(({ s, req }) => (
              <span
                key={`${req}-${s}`}
                className="label border border-border px-3 py-1.5"
                title={req ? "Required" : "Preferred"}
              >
                {req ? "" : "◆ "}
                {s}
              </span>
            ))}
          </div>
          <p className="label mt-3 text-muted-foreground">
            SOURCE: {r.sourceName.toUpperCase()} · REQUIREMENTS ANALYZED ON{" "}
            {new Date(r.analyzedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* 4. Strengths */}
      <div className="card-brutal mt-8">
        <p className="label">YOUR STRENGTHS</p>
        {saved.match.strengths.length === 0 ? (
          <Missing what="strengths" onRetry={reanalyze} />
        ) : (
          <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {saved.match.strengths.map((s, k) => (
              <li key={`${k}-${s}`} className="flex items-center gap-2">
                <span style={{ color: "#2f6f52" }}>✓</span> {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 5. Skill gaps — cards on mobile, table from md up */}
      <div className="card-brutal mt-8">
        <p className="label">SKILL GAP ANALYSIS</p>
        {saved.match.skillGaps.length === 0 && (
          <Missing what="a skill gap breakdown" onRetry={reanalyze} />
        )}
        <ul className="mt-4 space-y-px bg-border md:hidden">
          {saved.match.skillGaps.map((g) => (
            <li key={`m-${g.kind}-${g.skill}`} className="bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold">{g.skill}</span>
                <span className="shrink-0">{statusIcon(g.status)}</span>
              </div>
              <p className="label mt-1 text-muted-foreground">{g.kind}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="label text-muted-foreground">YOUR LEVEL</dt>
                  <dd className="mt-0.5">{g.yourLevel}</dd>
                </div>
                <div>
                  <dt className="label text-muted-foreground">REQUIRED</dt>
                  <dd className="mt-0.5">{g.requiredLevel}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <table className="mt-4 hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4">Requirement</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Your Level</th>
              <th className="py-2 pr-4">Required</th>
              <th className="py-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            {saved.match.skillGaps.map((g) => (
              <tr key={`${g.kind}-${g.skill}`} className="border-b border-border/50">
                <td className="py-2 pr-4 font-bold">{g.skill}</td>
                <td className="py-2 pr-4 text-muted-foreground">{g.kind}</td>
                <td className="py-2 pr-4">{g.yourLevel}</td>
                <td className="py-2 pr-4">{g.requiredLevel}</td>
                <td className="py-2">{statusIcon(g.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          The roadmap below closes these gaps in order, biggest first.
        </p>
      </div>

      {/* 6. Requirements met */}
      <div className="card-brutal mt-8">
        <p className="label">REQUIREMENTS CHECK</p>
        {saved.match.requirementsMet.length === 0 && (
          <Missing what="the requirements checklist" onRetry={reanalyze} />
        )}
        <ul className="mt-3 space-y-2 text-sm">
          {saved.match.requirementsMet.map((rm, k) => (
            <li key={`${k}-${rm.requirement}`} className="flex items-start gap-3">
              <span className="mt-0.5">{statusIcon(rm.status)}</span>
              <span>
                <span className="font-bold">{rm.requirement}</span>
                <span className="text-muted-foreground"> — you: {rm.yourEvidence}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 7. Roadmap with progress */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Your Personalized Roadmap
          </h2>
          <p className="label">ROADMAP PROGRESS: {progress}%</p>
        </div>
        {saved.roadmap.length === 0 && (
          <div className="card-brutal mt-4">
            <Missing what="a roadmap" onRetry={reanalyze} />
          </div>
        )}
        <div className="mt-4 border border-border">
          {saved.roadmap.map((p, pi) => (
            <section key={pi} className="-mt-px border-t border-border p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="label text-muted-foreground">
                  PHASE {pi + 1} · {p.duration}
                </p>
              </div>
              <h3 className="mt-1 text-xl font-black uppercase tracking-tight">{p.phase}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Why: </span>
                {p.why}
              </p>
              <div className="mt-4 grid gap-6 md:grid-cols-4">
                <div>
                  <p className="label">WHAT TO LEARN</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(p.topics ?? []).map((t) => (
                      <li key={t}>· {t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label">RESOURCES (FREE)</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(p.resources ?? []).map((t) => (
                      <li key={t}>· {t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label">PRACTICE</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(p.practice ?? []).map((t) => (
                      <li key={t}>· {t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label">CHECKLIST</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {(p.tasks ?? []).map((t) => (
                      <li key={t.id}>
                        <button
                          className="flex items-start gap-2 text-left"
                          onClick={() => {
                            toggleRoadmapTask(saved.id, pi, t.id);
                            const next = !t.done;
                            const updated = {
                              ...saved,
                              roadmap: saved.roadmap.map((ph, i) =>
                                i === pi
                                  ? {
                                      ...ph,
                                      tasks: ph.tasks.map((x) =>
                                        x.id === t.id ? { ...x, done: next } : x,
                                      ),
                                    }
                                  : ph,
                              ),
                            };
                            setSaved(updated);
                            setProgress(roadmapProgress(updated.roadmap));
                          }}
                        >
                          {t.done ? (
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0"
                              style={{ color: "var(--pink)" }}
                            />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className={t.done ? "line-through opacity-60" : ""}>{t.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-sm">
                <span className="font-bold">After this phase: </span>
                {p.outcome}
              </p>
            </section>
          ))}
        </div>
        <button className="btn-brutal mt-4" onClick={downloadPdf}>
          <span className="relative z-10 flex items-center gap-2">
            <Download className="h-3 w-3" /> DOWNLOAD ROADMAP PDF
          </span>
          <span className="nav-fill" />
        </button>
      </div>

      {/* 8. Projects */}
      <div className="mt-8">
        <h2 className="text-2xl font-black uppercase tracking-tight">Recommended Projects</h2>
        {saved.projects.length === 0 && (
          <div className="card-brutal mt-4">
            <Missing what="project ideas" onRetry={reanalyze} />
          </div>
        )}
        <div className="mt-4 grid gap-px border border-border bg-border md:grid-cols-3">
          {saved.projects.map((p, i) => (
            <article key={i} className="bg-background p-6">
              <p className="label text-muted-foreground">
                PROJECT {i + 1} · {p.difficulty} · {p.duration}
              </p>
              <h3 className="mt-2 font-bold">{p.idea}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.whyItHelps}</p>
              <p className="label mt-3">TECH</p>
              <p className="mt-1 text-sm">{(p.technologies ?? []).join(", ")}</p>
              <p className="label mt-3">FEATURES</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {(p.features ?? []).map((f, k) => (
                  <li key={`${k}-${f}`}>· {f}</li>
                ))}
              </ul>
              {(p.demonstrates ?? []).length > 0 && (
                <>
                  <p className="label mt-3">SKILLS IT DEMONSTRATES</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(p.demonstrates ?? []).map((d, k) => (
                      <span key={`${k}-${d}`} className="label border border-border px-2 py-1">
                        {d}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 9. Interview prep */}
      <div className="card-brutal mt-8">
        <h2 className="text-2xl font-black uppercase tracking-tight">Interview Preparation</h2>
        {(saved.interviewPrep?.technical ?? []).length === 0 &&
          (saved.interviewPrep?.behavioral ?? []).length === 0 && (
            <Missing what="an interview prep plan" onRetry={reanalyze} />
          )}
        <div className="mt-4 grid gap-6 md:grid-cols-4">
          <div>
            <p className="label">TECHNICAL</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(saved.interviewPrep?.technical ?? []).map((t, k) => (
                <li key={`${k}-${t}`}>· {t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">BEHAVIORAL</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(saved.interviewPrep?.behavioral ?? []).map((t, k) => (
                <li key={`${k}-${t}`}>· {t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">PRACTICE ON</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(saved.interviewPrep?.practicePlatforms ?? []).map((t, k) => (
                <li key={`${k}-${t}`}>· {t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">SUGGESTED PREP</p>
            <p className="mt-2 text-sm">{saved.interviewPrep?.suggestedDuration || "4-6 weeks"}</p>
          </div>
        </div>
      </div>

      {/* 10. Readiness */}
      <div className="card-brutal mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="label">YOUR APPLICATION READINESS</p>
          <p className="label">OVERALL: {saved.overallReadiness}%</p>
        </div>
        {saved.readiness.length === 0 && (
          <Missing what="a readiness breakdown" onRetry={reanalyze} />
        )}
        <div className="mt-4 space-y-3">
          {saved.readiness.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-sm">
                <span>{b.label}</span>
                <span className="text-muted-foreground">{b.score}%</span>
              </div>
              <div className="mt-1 h-2 w-full bg-muted">
                <div className="h-2" style={{ width: `${b.score}%`, background: "var(--pink)" }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          This is an estimated preparation indicator, not an official hiring score.
        </p>
      </div>

      {/* 11-12. Apply + actions */}
      <div className="mt-8 flex flex-wrap gap-px">
        {applyUrl && (
          <a href={applyUrl} target="_blank" rel="noreferrer" className="btn-brutal">
            <span className="relative z-10 flex items-center gap-2">
              {applyLabel.toUpperCase()} <ExternalLink className="h-3 w-3" />
            </span>
            <span className="nav-fill" />
          </a>
        )}
        <button
          className="btn-brutal -ml-px"
          style={{ background: "var(--pink)", color: "#000" }}
          onClick={reanalyze}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> RE-ANALYZE MY PROFILE
          </span>
        </button>
        <Link to="/dream-job/history" className="btn-brutal -ml-px">
          <span className="relative z-10">MY DREAM JOBS</span>
          <span className="nav-fill" />
        </Link>
      </div>
      <p className="label mt-4 text-muted-foreground">
        SOURCE: {r.sourceName.toUpperCase()}
        {applyUrl ? "" : " — NO VERIFIED LISTING; LINK OPENS THE OFFICIAL CAREERS PAGE"}
      </p>
    </Page>
  );
}
