import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark, ExternalLink, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { experienceOf, matchesLocation, typeOf } from "@/lib/jobFilters";
import { saveJob } from "@/lib/savedJobs";
import { seo } from "@/lib/seo";
import { SK, readJson, writeJson } from "@/lib/session";
import type { Job } from "@/lib/types";

export const Route = createFileRoute("/jobs")({
  head: () =>
    seo({
      title: "Your Job Matches",
      description:
        "Live job and internship matches from 13 job boards, filtered by type, experience level, location and source.",
      path: "/jobs",
      keywords: [
        "live job listings",
        "internship listings",
        "remote jobs india",
        "entry level jobs",
      ],
    }),
  component: Jobs,
});

/** How many cards to render before "show more" — the full set can top 100. */
const PAGE_SIZE = 24;

function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  // Results live in sessionStorage, so on the server and on the very first
  // client paint we genuinely don't know yet whether there are any.
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("all");
  const [exp, setExp] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("recent");
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    setJobs(readJson<Job[]>(SK.jobs) ?? []);
    setLoc(sessionStorage.getItem(SK.searchLocation) ?? "");
    setLoaded(true);
  }, []);

  // Any filter change puts the user back at the top of a fresh page of results.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [q, loc, type, exp, source, sort]);

  const sources = useMemo(() => Array.from(new Set(jobs.map((j) => j.source))).sort(), [jobs]);

  const filtered = useMemo(() => {
    const out = jobs.filter((j) => {
      if (q && !`${j.title} ${j.company} ${j.description}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (loc && !matchesLocation(j.location, loc)) return false;
      if (type !== "all" && typeOf(j) !== type) return false;
      if (exp !== "all" && experienceOf(j) !== exp) return false;
      if (source !== "all" && j.source !== source) return false;
      return true;
    });
    if (sort === "company") out.sort((a, b) => a.company.localeCompare(b.company));
    else
      out.sort(
        (a, b) => (Date.parse(b.postedAt ?? "0") || 0) - (Date.parse(a.postedAt ?? "0") || 0),
      );
    return out;
  }, [jobs, q, loc, type, exp, source, sort]);

  const visible = useMemo(() => filtered.slice(0, shown), [filtered, shown]);

  function clearFilters() {
    setQ("");
    setLoc("");
    setType("all");
    setExp("all");
    setSource("all");
  }

  function tailor(job: Job) {
    // Save first: the tailored resume is attached back to this record by id, so
    // the hand-off has to carry the saved id or /resume-analysis silently skips it.
    const saved = saveJob(job);
    writeJson(SK.tailorJob, {
      jobDescription: job.description,
      title: job.title,
      company: job.company,
      location: job.location,
      applyLink: job.applyLink,
      savedId: saved.id,
    });
    navigate({ to: "/tailor-resume" });
  }

  return (
    <Page title="Job Results" intro="Freshest matches first. Nothing older than 10 days.">
      {!loaded ? (
        <div className="grid gap-px border border-border bg-border md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 bg-background p-6">
              <div className="h-2 w-24 animate-pulse bg-muted" />
              <div className="h-5 w-3/4 animate-pulse bg-muted" />
              <div className="h-3 w-1/3 animate-pulse bg-muted" />
              <div className="h-3 w-full animate-pulse bg-muted" />
              <div className="h-3 w-5/6 animate-pulse bg-muted" />
            </div>
          ))}
          <span className="sr-only">Loading your job matches</span>
        </div>
      ) : jobs.length === 0 ? (
        <div>
          <p className="text-sm text-muted-foreground">
            No search yet — head to Job Match and upload your resume or enter your skills.
          </p>
          <Link to="/recommendations" className="btn-brutal mt-6">
            <span className="relative z-10">GO TO JOB MATCH</span>
            <span className="nav-fill" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-px border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
            <input
              className="input-brutal border-0"
              placeholder="SEARCH"
              aria-label="Search job titles, companies and descriptions"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              className="input-brutal border-0"
              placeholder="LOCATION"
              aria-label="Filter by location"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
            />
            <select
              className="input-brutal border-0"
              aria-label="Filter by job type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">ALL TYPES</option>
              <option value="full-time">FULL-TIME</option>
              <option value="internship">INTERNSHIP</option>
              <option value="remote">REMOTE</option>
            </select>
            <select
              className="input-brutal border-0"
              aria-label="Filter by experience level"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
            >
              <option value="all">ALL LEVELS</option>
              <option value="entry">ENTRY</option>
              <option value="mid">MID</option>
              <option value="senior">SENIOR</option>
            </select>
            <select
              className="input-brutal border-0"
              aria-label="Filter by job source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">ALL SOURCES</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              className="input-brutal border-0"
              aria-label="Sort results"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">MOST RECENT</option>
              <option value="company">COMPANY A–Z</option>
            </select>
          </div>

          <p className="label mt-4" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "JOB" : "JOBS"} FOUND
            {filtered.length > visible.length ? ` · SHOWING ${visible.length}` : ""}
          </p>

          {filtered.length === 0 && (
            <div className="card-brutal mt-6">
              <p className="text-sm">No jobs match these filters.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {jobs.length} result{jobs.length === 1 ? "" : "s"} came back from your search —
                widen or clear the filters to see them.
              </p>
              <button className="btn-brutal mt-5" onClick={clearFilters}>
                <span className="relative z-10">CLEAR ALL FILTERS</span>
                <span className="nav-fill" />
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-2">
            {visible.map((job, i) => (
              <article key={`${job.applyLink}-${i}`} className="flex flex-col bg-background p-6">
                <p className="label text-muted-foreground">
                  {job.source.toUpperCase()}
                  <span className="hidden sm:inline">
                    {job.postedAt ? ` · ${new Date(job.postedAt).toLocaleDateString()}` : ""}
                  </span>
                </p>
                <h2 className="mt-2 text-lg font-bold leading-tight">{job.title}</h2>
                <p className="mt-1 text-sm">{job.company}</p>
                <p className="label mt-1 text-muted-foreground">
                  {job.location || "NOT SPECIFIED"}
                </p>
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

          {filtered.length > visible.length && (
            <button
              className="btn-brutal mt-6 w-full"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
            >
              <span className="relative z-10">
                SHOW {Math.min(PAGE_SIZE, filtered.length - visible.length)} MORE
              </span>
              <span className="nav-fill" />
            </button>
          )}
        </>
      )}
    </Page>
  );
}
