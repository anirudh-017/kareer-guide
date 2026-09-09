import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { getDreamJobs, removeDreamJob, roadmapProgress } from "@/lib/dreamJobs";
import { SK, writeJson } from "@/lib/session";
import type { SavedDreamJob } from "@/lib/dream/types";

export const Route = createFileRoute("/dream-job_/history")({
  head: () =>
    seo({
      title: "My Dream Jobs",
      description:
        "Track your saved Dream Job analyses, roadmap progress and match improvements over time.",
      path: "/dream-job/history",
      keywords: ["saved dream jobs", "career tracking", "roadmap progress"],
    }),
  component: DreamHistory,
});

function DreamHistory() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<SavedDreamJob[]>([]);

  useEffect(() => {
    const sync = () => setJobs(getDreamJobs());
    sync();
    window.addEventListener("kg-dream-jobs", sync);
    return () => window.removeEventListener("kg-dream-jobs", sync);
  }, []);

  function reanalyze(job: SavedDreamJob) {
    // Carry the profile + previous match into the wizard for an informed re-run.
    writeJson(SK.dreamPrevious, { match: job.match.match, id: job.id });
    sessionStorage.setItem(SK.dreamCompany, job.company);
    sessionStorage.setItem(SK.dreamRole, job.role);
    writeJson(SK.dreamProfile, job.profile);
    writeJson(SK.dreamSkills, job.skills);
    navigate({ to: "/dream-job" });
  }

  return (
    <Page
      title="My Dream Jobs"
      intro="Kept on this device only. Update your skills, re-analyze, and watch the match climb."
    >
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved analyses yet — run your first Dream Job analysis.
        </p>
      ) : (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2">
          {jobs.map((job) => {
            const progress = roadmapProgress(job.roadmap);
            return (
              <article key={job.id} className="flex flex-col bg-background p-6">
                <p className="label text-muted-foreground">
                  {job.company ? job.company.toUpperCase() : "TARGET ROLE"} ·{" "}
                  {new Date(job.createdAt).toLocaleDateString()}
                </p>
                <h2 className="mt-2 text-lg font-bold leading-tight">{job.role}</h2>
                <div className="mt-3 flex items-center gap-4">
                  <p
                    className="text-4xl font-black"
                    style={{ color: job.match.match >= 60 ? "#16a34a" : "#dc2626" }}
                  >
                    {job.match.match}%
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>{job.match.eligible ? "✓ Currently eligible" : "🚀 Building toward it"}</p>
                    <p className="label mt-1">ROADMAP: {progress}% COMPLETE</p>
                    {typeof job.previousMatch === "number" && (
                      <p className="label mt-1" style={{ color: "var(--pink)" }}>
                        WAS {job.previousMatch}% · {job.match.match >= job.previousMatch ? "+" : ""}
                        {job.match.match - job.previousMatch}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-px pt-5">
                  <a
                    href={job.requirements.sourceUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-brutal"
                    onClick={(e) => {
                      if (!job.requirements.sourceUrl) e.preventDefault();
                    }}
                  >
                    <span className="relative z-10">OFFICIAL JOB</span>
                    <span className="nav-fill" />
                  </a>
                  <button className="btn-brutal -ml-px" onClick={() => reanalyze(job)}>
                    <span className="relative z-10">RE-ANALYZE</span>
                    <span className="nav-fill" />
                  </button>
                  <button className="btn-brutal -ml-px" onClick={() => removeDreamJob(job.id)}>
                    <span className="relative z-10 flex items-center gap-2">
                      <Trash2 className="h-3 w-3" /> REMOVE
                    </span>
                    <span className="nav-fill" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
