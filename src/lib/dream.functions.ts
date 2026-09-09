import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { rateLimit } from "./rate-limit.server";
import { looksLikeGibberish } from "./validate";
import {
  extractProfileFromResume,
  extractRequirements,
  findListing,
  generateCoaching,
  scrapeListing,
  type ExtractedResume,
} from "./dream/dream.server";
import type { DreamAnalysis, DreamAnalyzeInput, DreamRequirements } from "./dream/types";

/**
 * Dream Job server entry points — same pattern as jobsy.functions.ts:
 * validate, meter, delegate. All logic lives in dream/dream.server.ts.
 */

const RatedSkillSchema = z.object({
  name: z.string().min(1).max(60),
  rating: z.enum(["beginner", "intermediate", "advanced", "expert"]),
});

const ProfileSchema = z.object({
  education: z.object({
    level: z.string().max(80).default(""),
    degree: z.string().max(120).default(""),
    branch: z.string().max(120).default(""),
    college: z.string().max(160).default(""),
    graduationYear: z.string().max(10).default(""),
    gpa: z.string().max(20).default(""),
  }),
  experience: z.object({
    level: z.string().max(40).default(""),
    jobTitle: z.string().max(120).default(""),
    internships: z.string().max(400).default(""),
    projects: z.string().max(600).default(""),
  }),
});

const DreamInputSchema = z.object({
  company: z
    .string()
    .max(80)
    .default("")
    .refine((v) => !v || !looksLikeGibberish(v), {
      message:
        "That doesn't look like a real company. Leave it blank to compare against the field.",
    }),
  role: z
    .string()
    .min(2)
    .max(80)
    // Shape was already checked here; meaning was not, so mash reached the model.
    .refine((v) => !looksLikeGibberish(v), {
      message: "That doesn't look like a real role. Try a job title like “Data Scientist”.",
    }),
  profile: ProfileSchema,
  skills: z.array(RatedSkillSchema).min(1).max(60),
  resumeText: z.string().max(30_000).optional(),
});

export const analyzeDreamJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DreamInputSchema.parse(d))
  .handler(async ({ data }): Promise<DreamAnalysis> => {
    rateLimit("ai");
    const input = data as DreamAnalyzeInput;

    // 1) Verify a real listing when possible. Firecrawl reaches the company's
    //    own careers page but needs its own key; the job aggregator works with
    //    whatever job-board keys are configured, so try both before giving up
    //    and falling back to the model's general knowledge of the role.
    const listing =
      (await scrapeListing(input.company, input.role)) ??
      (await findListing(input.company, input.role));

    // 2) Extract structured requirements (verified or AI knowledge).
    const requirements: DreamRequirements = await extractRequirements(
      input.company,
      input.role,
      listing,
    );

    // 3) Coaching pack: match explanation, roadmap, projects, interview prep.
    const coaching = await generateCoaching(input, requirements);

    return {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      company: input.company,
      role: input.role,
      requirements,
      match: coaching.match,
      roadmap: coaching.roadmap,
      projects: coaching.projects,
      interviewPrep: coaching.interviewPrep,
      readiness: coaching.readiness,
      overallReadiness: coaching.overallReadiness,
      aiSkillLevels: coaching.aiSkillLevels,
    };
  });

/**
 * Parse an uploaded resume into the wizard's fields so the user can review and
 * edit everything before analyzing (feature spec §5).
 */
export const parseDreamResume = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ resumeText: z.string().min(50).max(30_000) }).parse(d))
  .handler(async ({ data }): Promise<ExtractedResume> => {
    rateLimit("ai");
    return extractProfileFromResume(data.resumeText);
  });
