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

/**
 * Only the two fields with an unambiguous shape are checked here. A degree,
 * branch or college cannot be validated by pattern without rejecting real
 * ones — "Bhilai" and "ilugb" are indistinguishable to a regex — so those are
 * judged by the model in generateCoaching instead.
 */
const YEAR = new Date().getFullYear();
const gradYear = z
  .string()
  .max(10)
  .default("")
  .refine((v) => !v.trim() || /^(19|20)\d{2}$/.test(v.trim()), {
    message: "Graduation year should be a four-digit year, e.g. 2027.",
  })
  .refine(
    (v) => {
      const n = Number(v.trim());
      return !v.trim() || (n >= 1950 && n <= YEAR + 10);
    },
    { message: `Graduation year should be between 1950 and ${YEAR + 10}.` },
  );

const gpa = z
  .string()
  .max(20)
  .default("")
  // Accepts 8.4, 8.4/10, 3.6/4, 84%, 84 — the forms Indian and US transcripts use.
  .refine((v) => !v.trim() || /^\d{1,3}(\.\d{1,2})?\s*(%|\/\s*(4|5|7|10))?$/.test(v.trim()), {
    message: "GPA should be a number, e.g. 8.4, 8.4/10 or 84%.",
  });

const ProfileSchema = z.object({
  education: z.object({
    level: z.string().max(80).default(""),
    degree: z.string().max(120).default(""),
    branch: z.string().max(120).default(""),
    college: z.string().max(160).default(""),
    graduationYear: gradYear,
    gpa,
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
