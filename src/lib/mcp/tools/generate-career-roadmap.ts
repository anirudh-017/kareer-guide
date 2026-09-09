import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { buildRoadmap } from "@/lib/jobsy.core";
import { rateLimit } from "@/lib/rate-limit.server";

export default defineTool({
  name: "generate_career_roadmap",
  title: "Generate a career roadmap",
  description:
    "Build a 6-8 phase learning path to a target role. Each phase carries the skills to learn, free resources, project ideas and the milestones that mark it complete.",
  inputSchema: {
    role: z.string().min(2).describe("Target role, e.g. 'Data Analyst' or 'Frontend Engineer'"),
    background: z
      .string()
      .optional()
      .describe("Where the person is starting from, e.g. 'final year B.Com, knows Excel'"),
  },
  handler: async ({ role, background }) => {
    rateLimit("ai");
    const phases = await buildRoadmap(role, background);
    if (!phases.length) {
      return {
        content: [
          { type: "text" as const, text: `Could not build a roadmap for "${role}". Try again.` },
        ],
      };
    }

    const summary = phases
      .map(
        (p, i) =>
          `Phase ${i + 1}: ${p.phase} (${p.duration})\n  Skills: ${(p.skills ?? []).join(", ")}\n  Resources: ${(p.resources ?? []).join(", ")}\n  Projects: ${(p.projects ?? []).join(", ")}\n  Milestones: ${(p.milestones ?? []).join(", ")}`,
      )
      .join("\n\n");

    return {
      content: [{ type: "text" as const, text: `Roadmap to ${role}:\n\n${summary}` }],
      structuredContent: { phases },
    };
  },
  outputSchema: {
    phases: z.array(
      z.object({
        phase: z.string(),
        duration: z.string(),
        skills: z.array(z.string()),
        resources: z.array(z.string()),
        projects: z.array(z.string()),
        milestones: z.array(z.string()),
      }),
    ),
  },
});
