import type { Job } from "./types";

const TIMEOUT = 8000;

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT)),
  ]);
}

async function wrap(name: string, p: Promise<Job[]>): Promise<Job[]> {
  try {
    const jobs = await withTimeout(p, []);
    return jobs;
  } catch (error) {
    console.error(`[jobs] source ${name} failed`, error);
    return [];
  }
}

const clean = (html: string | undefined | null) =>
  (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

const env = (n: string) => process.env[n];

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/* ------------------------------ sources ------------------------------ */

async function jsearch(query: string, location: string): Promise<Job[]> {
  const key = env("RAPIDAPI_KEY");
  if (!key) return [];
  const q = encodeURIComponent(`${query} ${location}`.trim());
  const data = (await getJson(
    `https://jsearch.p.rapidapi.com/search?query=${q}&page=1&num_pages=2`,
    { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" } },
  )) as Any;
  return (data.data ?? []).slice(0, 30).map(
    (j: Any): Job => ({
      title: j.job_title ?? "",
      company: j.employer_name ?? "",
      location:
        [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || "Not specified",
      description: clean(j.job_description),
      applyLink: j.job_apply_link ?? "",
      source: j.job_publisher ?? "JSearch",
      postedAt: j.job_posted_at_datetime_utc ?? null,
      jobType: (j.job_employment_type ?? "").toLowerCase(),
    }),
  );
}

async function internshipsApi(query: string): Promise<Job[]> {
  const key = env("RAPIDAPI_KEY");
  if (!key) return [];
  const data = (await getJson(
    `https://internships-api.p.rapidapi.com/active-jb-7d?title_filter=${encodeURIComponent(query)}`,
    {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "internships-api.p.rapidapi.com" },
    },
  )) as Any[];
  return (Array.isArray(data) ? data : []).slice(0, 40).map(
    (j: Any): Job => ({
      title: j.title ?? "",
      company: j.organization ?? "",
      location: (j.locations_derived ?? []).join(", ") || "Remote",
      description: clean(j.description_text ?? j.linkedin_org_description),
      applyLink: j.url ?? "",
      source: "Internships API",
      postedAt: j.date_posted ?? null,
      jobType: "internship",
    }),
  );
}

async function adzuna(query: string, country: string, intern: boolean): Promise<Job[]> {
  const id = env("ADZUNA_APP_ID");
  const key = env("ADZUNA_APP_KEY");
  if (!id || !key) return [];
  const run = async (what: string) => {
    const data = (await getJson(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${id}&app_key=${key}&results_per_page=50&what=${encodeURIComponent(what)}`,
    )) as Any;
    return (data.results ?? []).map(
      (j: Any): Job => ({
        title: j.title ?? "",
        company: j.company?.display_name ?? "",
        location: j.location?.display_name ?? "",
        description: clean(j.description),
        applyLink: j.redirect_url ?? "",
        source: "Adzuna",
        postedAt: j.created ?? null,
        jobType: (j.contract_time ?? "").toLowerCase(),
      }),
    );
  };
  const runs = [run(query)];
  if (intern) runs.push(run(`${query} intern trainee`));
  const all = await Promise.all(runs.map((r) => r.catch(() => [] as Job[])));
  return all.flat();
}

async function remotive(query: string): Promise<Job[]> {
  const data = (await getJson(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=60`,
  )) as Any;
  return (data.jobs ?? []).map(
    (j: Any): Job => ({
      title: j.title ?? "",
      company: j.company_name ?? "",
      location: j.candidate_required_location || "Remote",
      description: clean(j.description),
      applyLink: j.url ?? "",
      source: "Remotive",
      postedAt: j.publication_date ?? null,
      jobType: (j.job_type ?? "remote").toLowerCase(),
    }),
  );
}

async function arbeitnow(): Promise<Job[]> {
  const data = (await getJson("https://www.arbeitnow.com/api/job-board-api")) as Any;
  return (data.data ?? []).map(
    (j: Any): Job => ({
      title: j.title ?? "",
      company: j.company_name ?? "",
      location: j.location || (j.remote ? "Remote" : ""),
      description: clean(j.description),
      applyLink: j.url ?? "",
      source: "Arbeitnow",
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      jobType: (j.job_types ?? []).join(" ").toLowerCase() || (j.remote ? "remote" : ""),
    }),
  );
}

async function jobicy(): Promise<Job[]> {
  const data = (await getJson("https://jobicy.com/api/v2/remote-jobs?count=100")) as Any;
  return (data.jobs ?? []).map(
    (j: Any): Job => ({
      title: j.jobTitle ?? "",
      company: j.companyName ?? "",
      location: j.jobGeo || "Remote",
      description: clean(j.jobExcerpt ?? j.jobDescription),
      applyLink: j.url ?? "",
      source: "Jobicy",
      postedAt: j.pubDate ? new Date(j.pubDate).toISOString() : null,
      jobType: (j.jobType ?? ["remote"]).join(" ").toLowerCase(),
    }),
  );
}

async function remoteok(): Promise<Job[]> {
  const data = (await getJson("https://remoteok.com/api", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      Accept: "application/json",
    },
  })) as Any[];
  return (Array.isArray(data) ? data.slice(1) : []).map(
    (j: Any): Job => ({
      title: j.position ?? j.title ?? "",
      company: j.company ?? "",
      location: j.location || "Remote",
      description: clean(j.description),
      applyLink: j.url ?? j.apply_url ?? "",
      source: "RemoteOK",
      postedAt: j.date ?? null,
      jobType: "remote",
    }),
  );
}

async function theMuse(query: string, intern: boolean): Promise<Job[]> {
  const pages = intern ? [1, 2, 3] : [1, 2];
  const results = await Promise.all(
    pages.map(async (page) => {
      const data = (await getJson(
        `https://www.themuse.com/api/public/jobs?page=${page}${intern ? "&level=Internship" : ""}`,
      )) as Any;
      return (data.results ?? []).map(
        (j: Any): Job => ({
          title: j.name ?? "",
          company: j.company?.name ?? "",
          location: (j.locations ?? []).map((l: Any) => l.name).join(", "),
          description: clean(j.contents),
          applyLink: j.refs?.landing_page ?? "",
          source: "The Muse",
          postedAt: j.publication_date ?? null,
          jobType: (j.levels ?? []).map((l: Any) => l.name).join(" ").toLowerCase(),
        }),
      );
    }),
  ).catch(() => [] as Job[][]);
  void query;
  return results.flat();
}

async function himalayas(): Promise<Job[]> {
  const data = (await getJson("https://himalayas.app/jobs/api?limit=100&offset=0")) as Any;
  return (data.jobs ?? []).map(
    (j: Any): Job => ({
      title: j.title ?? "",
      company: j.companyName ?? "",
      location: (j.locationRestrictions ?? []).join(", ") || "Remote",
      description: clean(j.excerpt ?? j.description),
      applyLink: j.applicationLink ?? j.guid ?? "",
      source: "Himalayas",
      postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null,
      jobType: "remote",
    }),
  );
}

async function jooble(query: string, location: string): Promise<Job[]> {
  const key = env("JOOBLE_API_KEY");
  if (!key) return [];
  const res = await fetch(`https://jooble.org/api/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: query, location }),
  });
  if (!res.ok) throw new Error(`jooble ${res.status}`);
  const data = (await res.json()) as Any;
  return (data.jobs ?? []).map(
    (j: Any): Job => ({
      title: j.title ?? "",
      company: j.company ?? "",
      location: j.location ?? "",
      description: clean(j.snippet),
      applyLink: j.link ?? "",
      source: "Jooble",
      postedAt: j.updated ?? null,
      jobType: (j.type ?? "").toLowerCase(),
    }),
  );
}

async function findwork(query: string): Promise<Job[]> {
  const key = env("FINDWORK_API_KEY");
  if (!key) return [];
  const data = (await getJson(
    `https://findwork.dev/api/jobs/?search=${encodeURIComponent(query)}&sort_by=date`,
    { headers: { Authorization: `Token ${key}` } },
  )) as Any;
  return (data.results ?? []).map(
    (j: Any): Job => ({
      title: j.role ?? "",
      company: j.company_name ?? "",
      location: j.location || (j.remote ? "Remote" : ""),
      description: clean(j.text),
      applyLink: j.url ?? "",
      source: "Findwork",
      postedAt: j.date_posted ?? null,
      jobType: j.employment_type ?? (j.remote ? "remote" : ""),
    }),
  );
}

function normalizeLinkedIn(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("google.") || u.hostname.includes("bing.")) {
      const target = u.searchParams.get("url") ?? u.searchParams.get("u");
      if (!target) return null;
      return normalizeLinkedIn(target);
    }
    if (u.hostname.includes("linkedin.com") && !u.pathname.includes("/jobs/")) return null;
    u.search = "";
    return u.toString();
  } catch {
    return null;
  }
}

async function firecrawl(query: string, location: string): Promise<Job[]> {
  const key = env("FIRECRAWL_API_KEY");
  if (!key) return [];
  const sites = ["internshala.com", "linkedin.com/jobs", "indeed.com"];
  const results = await Promise.all(
    sites.map(async (site) => {
      try {
        const res = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query: `site:${site} ${query} ${location} jobs`, limit: 10 }),
        });
        if (!res.ok) return [] as Job[];
        const data = (await res.json()) as Any;
        const items: Any[] = data.data?.web ?? data.data ?? [];
        return items
          .map((r: Any): Job | null => {
            const link = site.includes("linkedin") ? normalizeLinkedIn(r.url ?? "") : (r.url ?? "");
            if (!link) return null;
            return {
              title: (r.title ?? "").split(" - ")[0] || r.title || "",
              company: (r.title ?? "").split(" - ")[1] ?? site.split(".")[0],
              location: location || "India",
              description: clean(r.description ?? r.markdown),
              applyLink: link,
              source: site.includes("internshala")
                ? "Internshala"
                : site.includes("linkedin")
                  ? "LinkedIn"
                  : "Indeed",
              postedAt: null,
              jobType: query.toLowerCase().includes("intern") ? "internship" : "",
            };
          })
          .filter((j): j is Job => j !== null);
      } catch {
        return [] as Job[];
      }
    }),
  );
  return results.flat();
}

/* --------------------------- ranking pipeline --------------------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#. ]/g, " ");

function scoreJob(job: Job, skills: string[]): number {
  const title = norm(job.title);
  const body = norm(`${job.title} ${job.description}`);
  let score = 0;
  let matches = 0;
  let titleHit = false;
  for (const raw of skills) {
    const s = norm(raw).trim();
    if (!s || s.length < 2) continue;
    if (title.includes(s)) {
      titleHit = true;
      score += 6;
      matches++;
    } else if (body.includes(s)) {
      score += 2;
      matches++;
    }
  }
  if (!titleHit && matches < 2) return 0;
  return score;
}

function recent(job: Job, days = 10): boolean {
  if (!job.postedAt) return true;
  const t = Date.parse(job.postedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const k = `${norm(j.company)}|${norm(j.title)}`;
    if (seen.has(k) || !j.title || !j.applyLink) return false;
    seen.add(k);
    return true;
  });
}

export async function aggregateJobs(opts: {
  skills: string[];
  location?: string;
  internship?: boolean;
  countryCode?: string;
}): Promise<Job[]> {
  const skills = opts.skills.filter(Boolean).slice(0, 20);
  const location = opts.location ?? "";
  const intern = opts.internship ?? false;
  const country = opts.countryCode ?? "in";
  const primary = skills.slice(0, 3).join(" ") || "software";
  const query = intern ? `${primary} internship` : primary;

  const batches = await Promise.all([
    wrap("jsearch", jsearch(query, location)),
    wrap("adzuna", adzuna(query, country, intern)),
    wrap("remotive", remotive(primary)),
    wrap("arbeitnow", arbeitnow()),
    wrap("jobicy", jobicy()),
    wrap("remoteok", remoteok()),
    wrap("themuse", theMuse(query, intern)),
    wrap("himalayas", himalayas()),
    wrap("jooble", jooble(query, location)),
    wrap("findwork", findwork(primary)),
    wrap("internships", intern ? internshipsApi(primary) : Promise.resolve([])),
    wrap("firecrawl", firecrawl(query, location)),
  ]);

  const all = dedupe(batches.flat());
  const scored = all
    .map((job) => ({ job, score: scoreJob(job, skills) }))
    .filter((x) => x.score > 0 && recent(x.job))
    .sort((a, b) => b.score - a.score);

  const max = scored[0]?.score ?? 0;
  const pick = (ratio: number) => scored.filter((x) => x.score >= max * ratio).map((x) => x.job);

  let result = pick(0.5);
  if (result.length < 5) result = pick(0.3);
  if (result.length < 5) result = scored.slice(0, 30).map((x) => x.job);

  return result
    .sort((a, b) => (Date.parse(b.postedAt ?? "0") || 0) - (Date.parse(a.postedAt ?? "0") || 0))
    .slice(0, 120);
}
