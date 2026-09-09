import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  analyzeResumeAgainstJob,
  buildRoadmap,
  extractSkills,
  findJobs,
  tailorResume,
} from "./jobsy.core";
import { rateLimit } from "./rate-limit.server";
import type { Job, ResumeAnalysis, Roadmap } from "./types";

/**
 * The web app's entry points. Every handler is a thin shell — validate, meter,
 * delegate to `jobsy.core`, which the MCP tools share. Keep logic there.
 *
 * These are public and unauthenticated by design, so each one is metered:
 * anything that spends AI credits or upstream API quota goes through
 * `rateLimit` first.
 */

/* --------------------------- resume -> skills --------------------------- */

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ resumeText: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    rateLimit("ai");
    return { skills: await extractSkills(data.resumeText) };
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
    rateLimit("search");
    return { jobs: await findJobs(data) };
  });

/* -------------------------------- roadmap -------------------------------- */

export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ role: z.string().min(2), background: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<Roadmap> => {
    rateLimit("ai");
    return buildRoadmap(data.role, data.background);
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
    rateLimit("ai");
    return analyzeResumeAgainstJob(data);
  });

const ApplyInput = AnalyzeInput.extend({
  approvedKeywords: z.array(z.string()).default([]),
  approvedBullets: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
});

export const tailorApply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApplyInput.parse(d))
  .handler(async ({ data }) => {
    rateLimit("tailor");
    return tailorResume(data);
  });
