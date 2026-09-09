import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { buildRoadmap } from "@/lib/jobsy.core";
import { rateLimit } from "@/lib/rate-limit.server";

export default defineTool({
  name: "generate_career_roadmap",
  title: "Generate a career roadmap",
  description:
    "Build a complete learning roadmap for a target role: a market overview, prerequisites, and 5-7 phases that each carry topics with explanations, tools, real named resources, hands-on projects and a milestone that proves the phase is done.",
  inputSchema: {
    role: z.string().min(2).describe("Target role, e.g. 'Data Analyst' or 'Frontend Engineer'"),
    background: z
      .string()
      .optional()
      .describe("Where the person is starting from, e.g. 'final year B.Com, knows Excel'"),
  },
  handler: async ({ role, background }) => {
    rateLimit("ai");
    const roadmap = await buildRoadmap(role, background);
    if (!roadmap.phases.length) {
      return {
        content: [
          { type: "text" as const, text: `Could not build a roadmap for "${role}". Try again.` },
        ],
      };
    }

    const summary = roadmap.phases
      .map((p, i) =>
        [
          `Phase ${i + 1}: ${p.phase} — ${p.duration} (${p.difficulty})`,
          p.description && `  ${p.description}`,
          `  Topics: ${p.topics.map((t) => t.name).join(", ")}`,
          `  Tools: ${p.tools.join(", ")}`,
          `  Resources: ${p.resources.map((r) => `${r.title}${r.author ? ` by ${r.author}` : ""} [${r.type}]`).join("; ")}`,
          `  Projects: ${p.projects.join(" | ")}`,
          p.milestone && `  Milestone: ${p.milestone}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");

    const header = [
      `Roadmap to ${role}`,
      roadmap.overview,
      `Total duration: ${roadmap.totalDuration} · ${roadmap.phases.length} phases`,
      roadmap.prerequisites.length ? `Prerequisites: ${roadmap.prerequisites.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text" as const, text: `${header}\n\n${summary}` }],
      structuredContent: roadmap,
    };
  },
  outputSchema: {
    role: z.string(),
    overview: z.string(),
    totalDuration: z.string(),
    prerequisites: z.array(z.string()),
    phases: z.array(
      z.object({
        phase: z.string(),
        duration: z.string(),
        difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
        description: z.string(),
        topics: z.array(z.object({ name: z.string(), detail: z.string() })),
        tools: z.array(z.string()),
        resources: z.array(
          z.object({
            title: z.string(),
            author: z.string(),
            type: z.enum(["Course", "Book", "Website", "YouTube", "Tool", "Docs"]),
          }),
        ),
        projects: z.array(z.string()),
        milestone: z.string(),
      }),
    ),
  },
});
