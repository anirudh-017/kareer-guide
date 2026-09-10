import { ai, aiShort, parseJson } from "../ai.server";
import { aggregateJobs } from "../jobs.server";
import { InvalidInputError } from "../validate";
import { findCompany } from "./companies";
import type {
  DreamAnalysis,
  DreamAnalyzeInput,
  DreamRequirements,
  InterviewPrep,
  ProjectIdea,
  RatedSkill,
  ReadinessBreakdown,
  RoadmapPhase,
} from "./types";

/**
 * Server engine for the Dream Job feature.
 *
 * Requirements pipeline: try to verify a real listing first (Firecrawl when a
 * key exists, else JSearch via the job aggregator), then extract structured
 * requirements with the AI. If no listing can be verified we still produce a
 * useful career-readiness analysis from the model's knowledge of the role —
 * but we say so clearly and never invent a job URL.
 *
 * AI rules enforced here (feature spec §29): no employment guarantees, no
 * fabricated URLs, required vs preferred kept separate, realistic timelines.
 */

/* ------------------------- requirements extraction ------------------------- */

type RawListing = {
  title: string;
  company: string;
  location: string;
  description: string;
  applyLink: string;
  source: string;
};

/** Is this URL on the company's own domain (so it can be the apply target)? */
export function isOwnDomain(url: string, careersUrl: string | undefined): boolean {
  if (!url || !careersUrl) return false;
  try {
    const registrable = (h: string) =>
      h
        .replace(/^www\./, "")
        .split(".")
        .slice(-2)
        .join(".");
    return registrable(new URL(url).hostname) === registrable(new URL(careersUrl).hostname);
  } catch {
    return false;
  }
}

/** Escape a string for safe embedding in a JSON prompt. */
const q = (s: string) => s.slice(0, 300).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/**
 * The `site:` operator needs a domain, not a display name — `site:Google`
 * matches nothing. Use the curated careers URL's host when we know the company,
 * and otherwise fall back to a plain keyword search.
 */
function listingQuery(company: string, role: string): string {
  const known = findCompany(company);
  if (known) {
    try {
      const host = new URL(known.careersUrl).hostname.replace(/^www\./, "");
      return `site:${host} ${q(role)} job apply`;
    } catch {
      /* fall through to the keyword search */
    }
  }
  return company
    ? `${q(company)} careers ${q(role)} job apply`
    : `${q(role)} job apply official careers`;
}

/**
 * Second route to a real listing, using the job boards the app already
 * aggregates. Firecrawl needs its own key; this one works with whatever job
 * source is configured, so requirements can still be read off a genuine
 * posting rather than the model's memory of the role.
 */
export async function findListing(company: string, role: string): Promise<RawListing | null> {
  if (!role.trim()) return null;
  try {
    const jobs = await aggregateJobs({ skills: [role], location: "" });
    if (!jobs.length) return null;

    const wanted = company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const roleWords = role
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const scored = jobs
      .map((j) => {
        const jobCompany = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
        // With a company named, only that company's postings can verify it —
        // another employer's listing says nothing about this one's bar.
        if (wanted && !jobCompany.includes(wanted) && !wanted.includes(jobCompany)) return null;
        const title = j.title.toLowerCase();
        const titleHits = roleWords.filter((w) => title.includes(w)).length;
        return titleHits ? { job: j, score: titleHits } : null;
      })
      .filter((x): x is { job: (typeof jobs)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.job;
    if (!best || best.description.length < 200) return null;

    return {
      title: best.title,
      company: best.company || company,
      location: best.location,
      description: best.description.slice(0, 6000),
      applyLink: best.applyLink,
      source: best.source,
    };
  } catch {
    return null;
  }
}

export async function scrapeListing(company: string, role: string): Promise<RawListing | null> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: listingQuery(company, role), limit: 6 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { web?: { url?: string; title?: string; description?: string; markdown?: string }[] };
    };
    const hits = data.data?.web ?? [];
    // Keep only links that plausibly point at the company's own careers site.
    const ownDomain = hits.find((h) => {
      const url = h.url ?? "";
      try {
        const host = new URL(url).hostname;
        return (
          /(careers|jobs)\./.test(host) || host.includes(company.toLowerCase().replace(/\s+/g, ""))
        );
      } catch {
        return false;
      }
    });
    const hit = ownDomain ?? hits[0];
    if (!hit?.url) return null;
    return {
      title: hit.title ?? role,
      company,
      location: "",
      description: (hit.markdown ?? hit.description ?? "").slice(0, 6000),
      applyLink: hit.url,
      source: "Official careers page (via web search)",
    };
  } catch {
    return null;
  }
}

export async function extractRequirements(
  company: string,
  role: string,
  listing: RawListing | null,
): Promise<DreamRequirements> {
  const listingBlock = listing
    ? `LIVE JOB LISTING (source: ${q(listing.source)} · url: ${q(listing.applyLink)}):
TITLE: ${q(listing.title)}
COMPANY: ${q(listing.company)}
DESCRIPTION:
${listing.description.slice(0, 5500)}`
    : `NO live listing could be verified. Base requirements on your general knowledge of what a ${q(role)} at ${q(company || "companies generally")} requires, and set sourceUrl to the company's official careers page root URL ONLY if you are confident it exists, otherwise leave it "".`;

  const text = await aiShort(
    `You are a technical recruiter analyzing requirements for a ${q(role)} position${company ? ` at ${q(company)}` : ""}.

${listingBlock}

Return ONLY JSON with this exact shape:
{
 "requiredSkills": [5-10 SHORT skill names, 1-4 words each — "Data Structures", "Distributed Systems", "C++", "System Design". NEVER full sentences: write "Front-End Development", not "Experience with front-end technologies". These are matched against a candidate's skill list, so a sentence matches nothing],
 "preferredSkills": [0-8 SHORT nice-to-have skill names, same 1-4 word rule],
 "requiredLevels": {}, // map skill->level using exactly one of: "beginner" | "intermediate" | "advanced" | "expert" for the TOP 5 required skills
 "education": string,
 "experience": string,
 "locations": [strings],
 "jobType": string ("Full-time", "Internship", ...),
 "seniority": string ("Entry", "Mid", "Senior", ...),
 "sourceUrl": string (the listing URL if a live listing was provided above, else "" unless confident of the official careers URL),
 "summary": string (one plain-English sentence describing this role's bar)
}`,
    "You are a precise recruitment data extractor. Reply with JSON only.",
  );

  const parsed = parseJson<{
    requiredSkills?: string[];
    preferredSkills?: string[];
    requiredLevels?: Record<string, string>;
    education?: string;
    experience?: string;
    locations?: string[];
    jobType?: string;
    seniority?: string;
    sourceUrl?: string;
    summary?: string;
  }>(text, {});

  const c = findCompany(company);
  const verified = Boolean(listing);

  // Spec §19: the apply button must point at the company's own site. A listing
  // found through an aggregator is fine for reading requirements off, but its
  // link is a job-board redirect, so it never becomes the apply target.
  const listingIsOfficial = listing ? isOwnDomain(listing.applyLink, c?.careersUrl) : false;
  const officialUrl = c?.careersUrl ?? parsed.sourceUrl ?? "";
  const sourceUrl = listingIsOfficial ? listing!.applyLink : officialUrl;

  const sourceName = !listing
    ? c
      ? `${c.careersName} (role profile — listing not verified)`
      : "AI role profile (listing not verified)"
    : listingIsOfficial
      ? `Official listing — ${listing.source}`
      : `Requirements read from a live ${listing.source} posting${c ? ` · apply via ${c.careersName}` : ""}`;

  return {
    company,
    role,
    requiredLevels: parsed.requiredLevels ?? {},
    source: verified ? "official-listing" : "ai-knowledge",
    sourceUrl,
    sourceName,
    requiredSkills: (parsed.requiredSkills ?? []).filter((s) => typeof s === "string").slice(0, 10),
    preferredSkills: (parsed.preferredSkills ?? [])
      .filter((s) => typeof s === "string")
      .slice(0, 8),
    education: parsed.education ?? "Bachelor's degree in a relevant field (typical)",
    experience: parsed.experience ?? "Not specified",
    locations: parsed.locations ?? [],
    jobType: parsed.jobType ?? "Full-time",
    seniority: parsed.seniority ?? "",
    isVerified: verified,
    verificationNote: verified
      ? listingIsOfficial
        ? ""
        : "These requirements come from a live posting we found on a job board, not from the company's own careers page. Confirm them on the official listing before applying."
      : "We couldn't verify a current job listing for this role. This is a career-readiness analysis based on typical requirements — verify the current requirements on the company's official careers page before applying.",
    analyzedAt: new Date().toISOString(),
  };
}

/* --------------------------- resume -> profile ---------------------------- */

export type ExtractedResume = {
  profile: DreamAnalyzeInput["profile"];
  skills: RatedSkill[];
  certifications: string[];
};

const RATINGS: RatedSkill["rating"][] = ["beginner", "intermediate", "advanced", "expert"];

/**
 * Read a resume into the wizard's own shape so the user can review and edit
 * every field before analyzing, rather than handing raw text to the model and
 * hoping. Ratings are the model's estimate and are explicitly presented as
 * editable — nobody's proficiency should be decided for them.
 */
export async function extractProfileFromResume(resumeText: string): Promise<ExtractedResume> {
  const text = await aiShort(
    `Extract this candidate's profile from their resume.

RESUME:
${resumeText.slice(0, 12000)}

Return ONLY JSON with this exact shape. Use "" for anything the resume does not state — never guess:
{
 "education": {"level": "one of 10th|12th|Diploma|Bachelor's|Master's|PhD|Bootcamp", "degree": "", "branch": "", "college": "", "graduationYear": "", "gpa": ""},
 "experience": {"level": "one of Student|Fresher|0-1 years|1-2 years|2-5 years|5+ years", "jobTitle": "", "internships": "one short line summarising internships", "projects": "one short line summarising projects"},
 "skills": [{"name": "skill name", "rating": "beginner|intermediate|advanced|expert"}],
 "certifications": ["certification names as written"]
}
Infer each skill's rating from how it is used in the resume: years of use, depth of the projects, and seniority. Return 5-25 skills.`,
    "You are a precise resume parser. Reply with JSON only.",
  );

  const parsed = parseJson<{
    education?: Partial<ExtractedResume["profile"]["education"]>;
    experience?: Partial<ExtractedResume["profile"]["experience"]>;
    skills?: { name?: string; rating?: string }[];
    certifications?: string[];
  }>(text, {});

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  return {
    profile: {
      education: {
        level: str(parsed.education?.level),
        degree: str(parsed.education?.degree),
        branch: str(parsed.education?.branch),
        college: str(parsed.education?.college),
        graduationYear: str(parsed.education?.graduationYear),
        gpa: str(parsed.education?.gpa),
      },
      experience: {
        level: str(parsed.experience?.level),
        jobTitle: str(parsed.experience?.jobTitle),
        internships: str(parsed.experience?.internships),
        projects: str(parsed.experience?.projects),
      },
    },
    skills: (parsed.skills ?? [])
      .map((s) => ({
        name: str(s?.name),
        rating: (RATINGS as string[]).includes(str(s?.rating).toLowerCase())
          ? (str(s?.rating).toLowerCase() as RatedSkill["rating"])
          : ("intermediate" as const),
      }))
      .filter((s) => s.name.length > 0 && s.name.length <= 60)
      .slice(0, 25),
    certifications: (parsed.certifications ?? [])
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .slice(0, 10),
  };
}

/* ------------------------------ coaching pack ------------------------------ */

export type CoachingPack = {
  aiSkillLevels: Record<string, string>;
  match: DreamAnalysis["match"];
  roadmap: RoadmapPhase[];
  projects: ProjectIdea[];
  interviewPrep: InterviewPrep;
  readiness: ReadinessBreakdown[];
  overallReadiness: number;
};

function profileSummary(profile: DreamAnalyzeInput["profile"], skills: RatedSkill[]): string {
  const e = profile.education;
  const x = profile.experience;
  const skillList = skills.map((s) => `${s.name} (${s.rating})`).join(", ") || "none listed";
  return `EDUCATION: ${[e.level, e.degree, e.branch, e.college, e.graduationYear, e.gpa].filter(Boolean).join(" | ") || "not provided"}
EXPERIENCE: ${[x.level, x.jobTitle, x.internships, x.projects].filter(Boolean).join(" | ") || "not provided"}
SKILLS: ${skillList}`;
}

export async function generateCoaching(
  input: DreamAnalyzeInput,
  req: DreamRequirements,
): Promise<CoachingPack> {
  const levels = req.requiredLevels;
  const required = req.requiredSkills.join(", ") || "not specified";
  const preferred = req.preferredSkills.join(", ") || "none";

  const text = await ai(
    `You are a senior career coach. The user wants to become a strong candidate for:
ROLE: ${q(req.role)}${req.company ? ` at ${q(req.company)}` : " (no specific company)"}
JOB REQUIREMENTS — required: ${required}; preferred: ${preferred}
Requirement levels (map skill->level): ${JSON.stringify(levels)}

USER PROFILE:
${profileSummary(input.profile, input.skills)}
${input.resumeText ? `RESUME EXCERPT:\n${input.resumeText.slice(0, 3000)}` : ""}

RULES
- Never guarantee employment. Match % means "profile appears to meet listed requirements".
- Required skills count more than preferred ones; lacking a preferred skill must never make someone ineligible.
- Use the user's actual skill levels; do NOT make them relearn what they already know (unless a higher proficiency is needed).
- Realistic timelines. Free, real, well-known resources only (MDN, freeCodeCamp, official docs, LeetCode, YouTube channels). Never invent URLs or course names.
- Explain in simple, plain English why each gap matters for THIS role.
- BEGINNERS: if the user lists few skills, only beginner ratings, or nothing relevant to this
  role, start the roadmap from absolute fundamentals — programming basics (variables, data
  types, conditions, loops, functions, arrays, objects, problem solving) as phase 1, then core
  programming, then data structures & algorithms, then building projects, then the role's
  specific stack, then interview preparation. Say plainly that they are starting from scratch
  and give an honest, longer timeline rather than a flattering short one.

PROFILE CHECK
- Go through the USER PROFILE one field at a time — level, degree, branch, college, jobTitle,
  internships, projects — and ask of each: is this value a real word, name or abbreviation
  that a person could mean? Put every field that fails in "unreadableFields".
- A value fails when it is random letters or keyboard mash: "ilugb" is not a degree,
  "asdkjh" is not a branch, "qwerty college" is not an institution. Check every field
  independently; one bad field does not excuse the others, and one good field does not
  vouch for them.
- Judge only what is written; never guess what was meant, and never repair a value silently.
- Be conservative in the other direction. Real institutions, abbreviations and place names
  look unfamiliar all the time ("BITS", "VIT", "Bhilai", "TRR College of Technology") and
  must be accepted. An empty field is fine and is never flagged.

Return ONLY JSON:
{
 "unreadableFields": [],  // names from: level, degree, branch, college, jobTitle, internships, projects
 "match": { "strengths": [3-6 strings from the user's existing skills/experience],
            "explanation": "3-4 plain sentences: where they stand, biggest gaps, what to do first" },
 "skillLevels": {}, // your estimate of the user's level for each required/preferred skill: map skill->"none"|"beginner"|"intermediate"|"advanced"|"expert"
 "roadmap": [4-8 phase objects ordered from their CURRENT level to job-ready:
   {"phase": name, "duration": e.g. "3-4 weeks", "why": "why this matters for THIS role",
    "skills": [skills covered], "topics": [specific topics to learn],
    "resources": [3-5 real free resources with names], "practice": [exercises/projects to do],
    "outcome": "what they can do after this phase",
    "tasks": [2-4 short checkable task strings]}],
 "projects": [3 objects: {"idea","technologies":[...],"features":[...],"difficulty":"Beginner|Intermediate|Advanced","duration","demonstrates":[skills],"whyItHelps"}],
 "interviewPrep": {"technical":[...],"behavioral":[...],"practicePlatforms":[real names],"suggestedDuration":"e.g. 4-6 weeks"},
 "readiness": [5 objects {"label": one of "Technical Skills","Experience","Projects","DSA","Interview Readiness","score":0-100}],
 "overallReadiness": 0-100
}`,
    "You are an honest, encouraging career coach. Reply with JSON only.",
  );

  const parsed = parseJson<
    CoachingPack & { skillLevels?: Record<string, string>; unreadableFields?: unknown }
  >(text, {
    aiSkillLevels: {},
    match: {
      match: 0,
      category: "moderate",
      eligible: false,
      strengths: [],
      explanation: "",
      skillGaps: [],
      requirementsMet: [],
    },
    roadmap: [],
    projects: [],
    interviewPrep: { technical: [], behavioral: [], practicePlatforms: [], suggestedDuration: "" },
    readiness: [],
    overallReadiness: 0,
  });

  // The profile's free-text fields cannot be pattern-checked without rejecting
  // real institutions, so the model judges them here. Refuse rather than build
  // a confident gap analysis on top of a value nobody can read.
  const unreadable = Array.isArray(parsed.unreadableFields)
    ? parsed.unreadableFields.filter((f): f is string => typeof f === "string" && !!f.trim())
    : [];
  if (unreadable.length) {
    const names = unreadable.slice(0, 4).join(", ");
    throw new InvalidInputError(
      `Some profile fields don't look like real values: ${names}. Fix those and run the analysis again.`,
    );
  }

  return {
    // match/match.category/eligible are recomputed client-side from the real
    // skill gaps; the server only contributes the narrative pieces.
    match: {
      match: 0,
      category: "moderate",
      eligible: false,
      strengths: (parsed.match?.strengths ?? []).slice(0, 6),
      explanation: parsed.match?.explanation ?? "",
      skillGaps: [],
      requirementsMet: [],
    },
    roadmap: (parsed.roadmap ?? []).slice(0, 8).map((p) => ({
      ...p,
      tasks: (p.tasks ?? []).map((t, i) => ({
        id: `${i}`,
        title: typeof t === "string" ? t : String((t as { title?: string })?.title ?? ""),
        done: false,
      })),
    })),
    aiSkillLevels: parsed.skillLevels ?? {},
    projects: parsed.projects ?? [],
    // Every field here needs its own fallback: the model returning valid JSON
    // that omits one key is normal, and the results page dereferences
    // interviewPrep.technical directly — an undefined here crashes the page
    // after the user has already waited out a full analysis.
    interviewPrep: {
      technical: parsed.interviewPrep?.technical ?? [],
      behavioral: parsed.interviewPrep?.behavioral ?? [],
      practicePlatforms: parsed.interviewPrep?.practicePlatforms ?? [],
      suggestedDuration: parsed.interviewPrep?.suggestedDuration ?? "4-6 weeks",
    },
    readiness: parsed.readiness ?? [],
    overallReadiness: parsed.overallReadiness ?? 0,
  };
}
