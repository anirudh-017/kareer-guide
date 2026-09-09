import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark, ExternalLink, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { saveJob } from "@/lib/savedJobs";
import type { Job } from "@/lib/types";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Your Job Matches | Kareer Guide" },
      {
        name: "description",
        content:
          "Live job and internship matches from 13+ boards, filtered by type, experience level, location and source.",
      },
      { property: "og:title", content: "Your Job Matches | Kareer Guide" },
      { property: "og:description", content: "Live job and internship matches, freshest first." },
      { property: "og:url", content: "/jobs" },
    ],
    links: [{ rel: "canonical", href: "/jobs" }],
  }),
  component: Jobs,
});

function experienceOf(job: Job): "entry" | "mid" | "senior" {
  const t = `${job.title} ${job.description}`.toLowerCase();
  if (/\b(senior|sr\.|lead|principal|staff|head of|manager|architect)\b/.test(t)) return "senior";
  if (/\b(intern|internship|trainee|fresher|graduate|entry[- ]level|junior|jr\.)\b/.test(t)) return "entry";
  return "mid";
}

function typeOf(job: Job): string {
  const t = `${job.jobType} ${job.title}`.toLowerCase();
  if (t.includes("intern")) return "internship";
  if (t.includes("remote")) return "remote";
  return "full-time";
}

function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("all");
  const [exp, setExp] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    try {
      setJobs(JSON.parse(sessionStorage.getItem("kg.jobs") ?? "[]") as Job[]);
    } catch {
      setJobs([]);
    }
  }, []);

  const sources = useMemo(() => Array.from(new Set(jobs.map((j) => j.source))).sort(), [jobs]);

  const filtered = useMemo(() => {
    const out = jobs.filter((j) => {
      if (q && !`${j.title} ${j.company} ${j.description}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (loc && !j.location.toLowerCase().includes(loc.toLowerCase())) return false;
      if (type !== "all" && typeOf(j) !== type) return false;
      if (exp !== "all" && experienceOf(j) !== exp) return false;
      if (source !== "all" && j.source !== source) return false;
      return true;
    });
    if (sort === "company") out.sort((a, b) => a.company.localeCompare(b.company));
    else out.sort((a, b) => (Date.parse(b.postedAt ?? "0") || 0) - (Date.parse(a.postedAt ?? "0") || 0));
    return out;
  }, [jobs, q, loc, type, exp, source, sort]);

  function tailor(job: Job) {
    saveJob(job);
    sessionStorage.setItem(
      "kg.tailorJob",
      JSON.stringify({
        jobDescription: job.description,
        title: job.title,
        company: job.company,
        location: job.location,
        applyLink: job.applyLink,
      }),
    );
    navigate({ to: "/tailor-resume" });
  }

  return (
    <Page title="Job Results" intro="Freshest matches first. Nothing older than 10 days.">
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No search yet — head to Job Match and upload your resume or enter your skills.
        </p>
      ) : (
        <>
          <div className="grid gap-px border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
            <input className="input-brutal border-0" placeholder="SEARCH" value={q} onChange={(e) => setQ(e.target.value)} />
            <input className="input-brutal border-0" placeholder="LOCATION" value={loc} onChange={(e) => setLoc(e.target.value)} />
            <select className="input-brutal border-0" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">ALL TYPES</option>
              <option value="full-time">FULL-TIME</option>
              <option value="internship">INTERNSHIP</option>
              <option value="remote">REMOTE</option>
            </select>
            <select className="input-brutal border-0" value={exp} onChange={(e) => setExp(e.target.value)}>
              <option value="all">ALL LEVELS</option>
              <option value="entry">ENTRY</option>
              <option value="mid">MID</option>
              <option value="senior">SENIOR</option>
            </select>
            <select className="input-brutal border-0" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="all">ALL SOURCES</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
            <select className="input-brutal border-0" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">MOST RECENT</option>
              <option value="company">COMPANY A–Z</option>
            </select>
          </div>

          <p className="label mt-4">{filtered.length} JOBS FOUND</p>

          <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-2">
            {filtered.map((job, i) => (
              <article key={`${job.applyLink}-${i}`} className="flex flex-col bg-background p-6">
                <p className="label text-muted-foreground">
                  {job.source.toUpperCase()}
                  <span className="hidden sm:inline">
                    {job.postedAt ? ` · ${new Date(job.postedAt).toLocaleDateString()}` : ""}
                  </span>
                </p>
                <h2 className="mt-2 text-lg font-bold leading-tight">{job.title}</h2>
                <p className="mt-1 text-sm">{job.company}</p>
                <p className="label mt-1 text-muted-foreground">{job.location || "NOT SPECIFIED"}</p>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                <div className="mt-auto flex flex-wrap gap-px pt-5">
                  <a href={job.applyLink} target="_blank" rel="noreferrer" className="btn-brutal">
                    <span className="relative z-10 flex items-center gap-2">
                      APPLY NOW <ExternalLink className="h-3 w-3" />
                    </span>
                    <span className="nav-fill" />
                  </a>
                  <button
                    className="btn-brutal -ml-px"
                    onClick={() => {
                      saveJob(job);
                      toast.success("Job saved");
                    }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Bookmark className="h-3 w-3" /> SAVE
                    </span>
                    <span className="nav-fill" />
                  </button>
                  <button className="btn-brutal -ml-px" onClick={() => tailor(job)}>
                    <span className="relative z-10 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> TAILOR RESUME
                    </span>
                    <span className="nav-fill" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
