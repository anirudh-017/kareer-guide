import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { countryCodeFor } from "@/lib/countries";
import { findJobs } from "@/lib/jobsy.core";
import { rateLimit } from "@/lib/rate-limit.server";

export default defineTool({
  name: "search_jobs",
  title: "Search jobs and internships",
  description:
    "Search live jobs and internships across 13 job boards by skill. Results are de-duplicated, ranked by skill overlap and limited to postings from the last 10 days, newest first.",
  inputSchema: {
    skills: z
      .array(z.string().min(1))
      .min(1)
      .max(20)
      .describe("Skills, tools or role keywords to match against, e.g. ['react','typescript']"),
    location: z.string().optional().describe("Free-text location, e.g. 'Bengaluru, India'"),
    internship: z.boolean().optional().describe("Search internships instead of full roles"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
  },
  handler: async ({ skills, location, internship, limit }) => {
    rateLimit("search");
    const jobs = (
      await findJobs({
        skills,
        location,
        internship,
        countryCode: countryCodeFor(location),
      })
    ).slice(0, limit ?? 20);

    if (!jobs.length) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No fresh postings matched ${skills.join(", ")}${location ? ` in ${location}` : ""}. Try broader skills or drop the location.`,
          },
        ],
      };
    }

    const summary = jobs
      .map(
        (j, i) =>
          `${i + 1}. ${j.title} — ${j.company || "Unknown company"} (${j.location || "location not specified"})\n   ${j.source}${j.postedAt ? ` · posted ${j.postedAt.slice(0, 10)}` : ""}\n   ${j.applyLink}`,
      )
      .join("\n");

    return {
      content: [{ type: "text" as const, text: `${jobs.length} matching roles:\n\n${summary}` }],
      structuredContent: { jobs },
    };
  },
  outputSchema: {
    jobs: z.array(
      z.object({
        title: z.string(),
        company: z.string(),
        location: z.string(),
        description: z.string(),
        applyLink: z.string(),
        source: z.string(),
        postedAt: z.string().nullable(),
        jobType: z.string(),
      }),
    ),
  },
});
