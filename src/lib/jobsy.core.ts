/**
 * The actual work: AI prompts and the job pipeline, with no framework wrapper.
 *
 * Both entry points import from here — the TanStack server functions in
 * `jobsy.functions.ts` (the web app) and the MCP tools in `mcp/tools/*`
 * (external agents) — so the two can never drift apart.
 */
import { ai, aiGroq, parseJson } from "./ai.server";
import { aggregateJobs, type JobSearchOptions } from "./jobs.server";
import type { Job, ResumeAnalysis, RoadmapPhase } from "./types";

/** Extract 10-20 lowercase skill keywords from raw resume text. */
export async function extractSkills(resumeText: string): Promise<string[]> {
  const text = await ai(
    `Extract the candidate's technical and professional skills from this resume.
Return ONLY a JSON array of 10-20 lowercase skill strings (tools, languages, frameworks, domains, role keywords).

RESUME:
${resumeText.slice(0, 12000)}`,
    "You are an expert technical recruiter. Reply with JSON only.",
  );
  const skills = parseJson<string[]>(text, []);
  return skills.filter((s) => typeof s === "string").slice(0, 20);
}

/** Aggregate, rank and de-duplicate live listings across every configured board. */
export async function findJobs(opts: JobSearchOptions): Promise<Job[]> {
  return aggregateJobs(opts);
}

/** A 6-8 phase path from beginner to job-ready for a target role. Runs on Groq. */
export async function buildRoadmap(role: string, background?: string): Promise<RoadmapPhase[]> {
  const text = await aiGroq(
    `Create a career roadmap to become a "${role}".
${background ? `Candidate background: ${background}` : ""}
Return ONLY JSON: an array of 6 to 8 objects with keys:
phase (string), duration (string), skills (string[]), resources (string[] of FREE resources with names), projects (string[] project ideas), milestones (string[]).
Order from absolute beginner to job-ready/advanced. Be specific and practical, India-friendly where relevant.`,
    "You are a senior career coach. Reply with JSON only.",
  );
  const phases = parseJson<RoadmapPhase[]>(text, []);
  return Array.isArray(phases) ? phases.slice(0, 8) : [];
}

export const EMPTY_ANALYSIS: ResumeAnalysis = {
  score: 0,
  fitScore: 0,
  missingKeywords: [],
  redFlags: [],
  atsFit: [],
  reviewerLens: [],
  executiveClarity: [],
  priorityFixes: [],
  bulletRewrites: [],
  summaryRewrite: "",
  benchmark: "",
};

export type AnalyzeArgs = {
  resumeText: string;
  jobDescription?: string | undefined;
  region?: string | undefined;
  companyProfile?: string | undefined;
};

/** Stage 1: recruiter-persona review producing scores, signals and rewrites. */
export async function analyzeResumeAgainstJob(args: AnalyzeArgs): Promise<ResumeAnalysis> {
  const text = await ai(
    `You are a senior recruiter reviewing a resume for the ${args.region ?? "Global"} market at a ${args.companyProfile ?? "Standard Professional"} employer.

RESUME:
${args.resumeText.slice(0, 14000)}

${
  args.jobDescription
    ? `JOB DESCRIPTION:
${args.jobDescription.slice(0, 8000)}`
    : "No job description provided; set fitScore to 0."
}

Return ONLY JSON with this exact shape:
{
 "score": number 0-100,
 "fitScore": number 0-100,
 "missingKeywords": [5 strings],
 "redFlags": [3 strings],
 "atsFit": [5 {"name","score" 0-100,"note"}],
 "reviewerLens": [5 {"name","score","note"}],
 "executiveClarity": [5 {"name","score","note"}],
 "priorityFixes": [4 strings],
 "bulletRewrites": [4 {"before","after"}] where each "after" uses the Google XYZ formula "Accomplished X as measured by Y by doing Z",
 "summaryRewrite": string,
 "benchmark": string
}`,
    "You are a brutally honest recruiter and ATS expert. Reply with JSON only.",
  );
  return { ...EMPTY_ANALYSIS, ...parseJson<ResumeAnalysis>(text, EMPTY_ANALYSIS) };
}

async function rescore(resume: string, jd?: string) {
  const text = await ai(
    `Score this resume. Return ONLY JSON {"score":0-100,"fitScore":0-100,"gaps":[strings]}.
RESUME:
${resume.slice(0, 12000)}
${
  jd
    ? `JOB DESCRIPTION:
${jd.slice(0, 6000)}`
    : ""
}`,
    "You are an ATS scoring engine. Reply with JSON only.",
  );
  return parseJson<{ score: number; fitScore: number; gaps: string[] }>(text, {
    score: 80,
    fitScore: jd ? 75 : 0,
    gaps: [],
  });
}

export type TailorArgs = AnalyzeArgs & {
  approvedKeywords: string[];
  approvedBullets: string[];
  redFlags: string[];
};

/** Stop refining once the resume scores this well. */
const TARGET_SCORE = 85;
const MAX_REFINEMENTS = 3;
/** Wall-clock budget for the refinement loop, measured from the first call. */
const REFINE_BUDGET_MS = 45_000;

/** Stage 2: rewrite, then score-and-refine up to 3 times until it clears 85. */
export async function tailorResume(
  args: TailorArgs,
): Promise<{ tailoredResume: string; score: number; fitScore: number }> {
  const startedAt = Date.now();
  let resume = await ai(
    `Rewrite this resume so it is tailored for the target role, for the ${args.region ?? "Global"} market and a ${args.companyProfile ?? "Standard Professional"} employer.

RULES
- Weave in these keywords naturally, no stuffing: ${args.approvedKeywords.join(", ") || "none"}
- Remove these red flags: ${args.redFlags.join("; ") || "none"}
- Use these XYZ-formula bullets where they fit: ${args.approvedBullets.join(" | ") || "none"}
- Keep all real facts; never invent employers, degrees, or dates.
- ATS-safe plain text, clear section headers, strong action verbs, quantified impact.
- Finish with a "stop the scroll" polish pass on the top third of the resume.
Return ONLY the finished resume text.

RESUME:
${args.resumeText.slice(0, 14000)}
${
  args.jobDescription
    ? `
JOB DESCRIPTION:
${args.jobDescription.slice(0, 8000)}`
    : ""
}`,
    "You are an elite resume writer. Output plain resume text only.",
  );

  let { score, fitScore, gaps } = await rescore(resume, args.jobDescription);
  for (let i = 0; i < MAX_REFINEMENTS && score < TARGET_SCORE; i++) {
    // Each pass is two more model calls on top of the two already spent. A
    // slow provider could otherwise leave the user staring at a spinner past
    // the host's request timeout, so stop refining once the budget is gone and
    // return the best version reached — always a complete, usable resume.
    if (Date.now() - startedAt > REFINE_BUDGET_MS) {
      console.warn(`[tailor] refinement budget spent after ${i} pass(es); returning score ${score}`);
      break;
    }
    resume = await ai(
      `Improve this resume to fix these gaps: ${gaps.join("; ") || "raise clarity and measurable impact"}.
Keep every real fact. Return ONLY the improved resume text.

${resume}`,
      "You are an elite resume writer. Output plain resume text only.",
    );
    const next = await rescore(resume, args.jobDescription);
    score = next.score;
    fitScore = next.fitScore;
    gaps = next.gaps;
  }

  return { tailoredResume: resume.trim(), score, fitScore };
}
