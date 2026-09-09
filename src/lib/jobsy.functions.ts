import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ai, parseJson } from "./ai.server";
import { aggregateJobs } from "./jobs.server";
import type { Job, ResumeAnalysis, RoadmapPhase } from "./types";

/* --------------------------- resume -> skills --------------------------- */

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ resumeText: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const text = await ai(
      `Extract the candidate's technical and professional skills from this resume.
Return ONLY a JSON array of 10-20 lowercase skill strings (tools, languages, frameworks, domains, role keywords).

RESUME:
${data.resumeText.slice(0, 12000)}`,
      "You are an expert technical recruiter. Reply with JSON only.",
    );
    const skills = parseJson<string[]>(text, []);
    return { skills: skills.filter((s) => typeof s === "string").slice(0, 20) };
  });

/* ------------------------------- job search ------------------------------ */

const SearchInput = z.object({
  skills: z.array(z.string()).min(1),
  location: z.string().optional(),
  internship: z.boolean().optional(),
  countryCode: z.string().optional(),
});

export const searchJobs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }): Promise<{ jobs: Job[] }> => {
    const jobs = await aggregateJobs(data);
    return { jobs };
  });

/* -------------------------------- roadmap -------------------------------- */

export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ role: z.string().min(2), background: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ phases: RoadmapPhase[] }> => {
    const text = await ai(
      `Create a career roadmap to become a "${data.role}".
${data.background ? `Candidate background: ${data.background}` : ""}
Return ONLY JSON: an array of 6 to 8 objects with keys:
phase (string), duration (string), skills (string[]), resources (string[] of FREE resources with names), projects (string[] project ideas), milestones (string[]).
Order from absolute beginner to job-ready/advanced. Be specific and practical, India-friendly where relevant.`,
      "You are a senior career coach. Reply with JSON only.",
    );
    const phases = parseJson<RoadmapPhase[]>(text, []);
    return { phases: Array.isArray(phases) ? phases.slice(0, 8) : [] };
  });

/* ---------------------------- resume tailoring ---------------------------- */

const AnalyzeInput = z.object({
  resumeText: z.string().min(50),
  jobDescription: z.string().optional(),
  region: z.string().optional(),
  companyProfile: z.string().optional(),
});

export const tailorAnalyze = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }): Promise<ResumeAnalysis> => {
    const text = await ai(
      `You are a senior recruiter reviewing a resume for the ${data.region ?? "Global"} market at a ${data.companyProfile ?? "Standard Professional"} employer.

RESUME:
${data.resumeText.slice(0, 14000)}

${data.jobDescription ? `JOB DESCRIPTION:\n${data.jobDescription.slice(0, 8000)}` : "No job description provided; set fitScore to 0."}

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
    const fallback: ResumeAnalysis = {
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
    const parsed = parseJson<ResumeAnalysis>(text, fallback);
    return { ...fallback, ...parsed };
  });

const ApplyInput = AnalyzeInput.extend({
  approvedKeywords: z.array(z.string()).default([]),
  approvedBullets: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
});

async function rescore(resume: string, jd?: string) {
  const text = await ai(
    `Score this resume. Return ONLY JSON {"score":0-100,"fitScore":0-100,"gaps":[strings]}.
RESUME:
${resume.slice(0, 12000)}
${jd ? `JOB DESCRIPTION:\n${jd.slice(0, 6000)}` : ""}`,
    "You are an ATS scoring engine. Reply with JSON only.",
  );
  return parseJson<{ score: number; fitScore: number; gaps: string[] }>(text, {
    score: 80,
    fitScore: jd ? 75 : 0,
    gaps: [],
  });
}

export const tailorApply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApplyInput.parse(d))
  .handler(async ({ data }) => {
    let resume = await ai(
      `Rewrite this resume so it is tailored for the target role, for the ${data.region ?? "Global"} market and a ${data.companyProfile ?? "Standard Professional"} employer.

RULES
- Weave in these keywords naturally, no stuffing: ${data.approvedKeywords.join(", ") || "none"}
- Remove these red flags: ${data.redFlags.join("; ") || "none"}
- Use these XYZ-formula bullets where they fit: ${data.approvedBullets.join(" | ") || "none"}
- Keep all real facts; never invent employers, degrees, or dates.
- ATS-safe plain text, clear section headers, strong action verbs, quantified impact.
- Finish with a "stop the scroll" polish pass on the top third of the resume.
Return ONLY the finished resume text.

RESUME:
${data.resumeText.slice(0, 14000)}
${data.jobDescription ? `\nJOB DESCRIPTION:\n${data.jobDescription.slice(0, 8000)}` : ""}`,
      "You are an elite resume writer. Output plain resume text only.",
    );

    let { score, fitScore, gaps } = await rescore(resume, data.jobDescription);
    for (let i = 0; i < 3 && score < 85; i++) {
      resume = await ai(
        `Improve this resume to fix these gaps: ${gaps.join("; ") || "raise clarity and measurable impact"}.
Keep every real fact. Return ONLY the improved resume text.

${resume}`,
        "You are an elite resume writer. Output plain resume text only.",
      );
      const next = await rescore(resume, data.jobDescription);
      score = next.score;
      fitScore = next.fitScore;
      gaps = next.gaps;
    }

    return { tailoredResume: resume.trim(), score, fitScore };
  });
