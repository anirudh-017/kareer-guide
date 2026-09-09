import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { getSavedJobs, removeJob } from "@/lib/savedJobs";
import { SK, writeJson } from "@/lib/session";
import type { SavedJob } from "@/lib/types";

export const Route = createFileRoute("/saved-jobs")({
  head: () =>
    seo({
      title: "Saved Jobs",
      description:
        "Your shortlist of saved jobs and internships, with the tailored resume for each one.",
      path: "/saved-jobs",
      keywords: ["saved jobs", "job shortlist", "tailored resume tracker"],
    }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<SavedJob[]>([]);

  useEffect(() => {
    const sync = () => setJobs(getSavedJobs());
    sync();
    window.addEventListener("kg-saved-jobs", sync);
    return () => window.removeEventListener("kg-saved-jobs", sync);
  }, []);

  function tailor(job: SavedJob) {
    writeJson(SK.tailorJob, {
      jobDescription: job.description,
      title: job.title,
      company: job.company,
      location: job.location,
      applyLink: job.applyLink,
      savedId: job.id,
    });
    navigate({ to: "/tailor-resume" });
  }

  function view(job: SavedJob) {
    writeJson(SK.tailored, {
      tailoredResume: job.tailoredResume,
      score: job.tailoredScore ?? 0,
      fitScore: job.tailoredFitScore ?? 0,
      job: { title: job.title, company: job.company, applyLink: job.applyLink, savedId: job.id },
    });
    navigate({ to: "/tailored-resume" });
  }

  return (
    <Page title="Saved Jobs" intro="Kept on this device only. No account, no sync, no tracking.">
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="flex flex-col bg-background p-6">
              <p className="label text-muted-foreground">{job.source.toUpperCase()}</p>
              <h2 className="mt-2 text-lg font-bold leading-tight">{job.title}</h2>
              <p className="mt-1 text-sm">{job.company}</p>
              <p className="label mt-1 text-muted-foreground">{job.location}</p>
              {job.tailoredResume && (
                <p className="label mt-3" style={{ color: "var(--pink)" }}>
                  TAILORED RESUME READY · SCORE {job.tailoredScore}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-px pt-5">
                <a href={job.applyLink} target="_blank" rel="noreferrer" className="btn-brutal">
                  <span className="relative z-10 flex items-center gap-2">
                    APPLY NOW <ExternalLink className="h-3 w-3" />
                  </span>
                  <span className="nav-fill" />
                </a>
                <button className="btn-brutal -ml-px" onClick={() => tailor(job)}>
                  <span className="relative z-10">TAILOR RESUME</span>
                  <span className="nav-fill" />
                </button>
                {job.tailoredResume && (
                  <button className="btn-brutal -ml-px" onClick={() => view(job)}>
                    <span className="relative z-10">VIEW TAILORED</span>
                    <span className="nav-fill" />
                  </button>
                )}
                <button className="btn-brutal -ml-px" onClick={() => removeJob(job.id)}>
                  <span className="relative z-10 flex items-center gap-2">
                    <Trash2 className="h-3 w-3" /> REMOVE
                  </span>
                  <span className="nav-fill" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
