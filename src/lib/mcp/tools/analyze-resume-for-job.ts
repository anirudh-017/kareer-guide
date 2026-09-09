import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { analyzeResumeAgainstJob } from "@/lib/jobsy.core";
import { rateLimit } from "@/lib/rate-limit.server";

const signal = z.object({ name: z.string(), score: z.number(), note: z.string() });

export default defineTool({
  name: "analyze_resume_for_job",
  title: "Analyse a resume against a job description",
  description:
    "Recruiter-grade review of a resume, optionally against a specific job description. Returns an overall score, a JD fit score, 15 hiring signals across ATS fit / reviewer lens / executive clarity, recruiter red flags, missing keywords and XYZ-formula bullet rewrites.",
  inputSchema: {
    resumeText: z.string().min(50).describe("Plain text of the resume"),
    jobDescription: z
      .string()
      .optional()
      .describe("The job description to score against. Omitted means fitScore is 0."),
    region: z.string().optional().describe("Target market, e.g. 'India' or 'United States'"),
    companyProfile: z
      .string()
      .optional()
      .describe(
        "Employer type: Standard Professional, Large MNC / Fortune 500, Vendor / Staffing, Implementation Partner, Startup, Public Sector, Others",
      ),
  },
  handler: async (args) => {
    rateLimit("ai");
    const a = await analyzeResumeAgainstJob(args);
    const group = (name: string, items: { name: string; score: number; note: string }[]) =>
      `${name}:\n${items.map((s) => `  ${s.name} (${s.score}) — ${s.note}`).join("\n")}`;

    const text = [
      `Resume score: ${a.score}/100 · JD fit: ${a.fitScore}/100`,
      a.benchmark,
      group("ATS fit", a.atsFit),
      group("Reviewer lens", a.reviewerLens),
      group("Executive clarity", a.executiveClarity),
      `Priority fixes:\n${a.priorityFixes.map((f) => `  - ${f}`).join("\n")}`,
      `Red flags:\n${a.redFlags.map((f) => `  - ${f}`).join("\n")}`,
      `Missing keywords: ${a.missingKeywords.join(", ")}`,
      `Bullet rewrites (XYZ formula):\n${a.bulletRewrites.map((b) => `  before: ${b.before}\n  after:  ${b.after}`).join("\n")}`,
      a.summaryRewrite ? `Suggested summary:\n  ${a.summaryRewrite}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return { content: [{ type: "text" as const, text }], structuredContent: a };
  },
  outputSchema: {
    score: z.number(),
    fitScore: z.number(),
    missingKeywords: z.array(z.string()),
    redFlags: z.array(z.string()),
    atsFit: z.array(signal),
    reviewerLens: z.array(signal),
    executiveClarity: z.array(signal),
    priorityFixes: z.array(z.string()),
    bulletRewrites: z.array(z.object({ before: z.string(), after: z.string() })),
    summaryRewrite: z.string(),
    benchmark: z.string(),
  },
});
