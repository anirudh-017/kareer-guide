import { defineMcp } from "@lovable.dev/mcp-js";

import analyzeResumeForJob from "./tools/analyze-resume-for-job";
import generateCareerRoadmap from "./tools/generate-career-roadmap";
import searchJobs from "./tools/search-jobs";

/**
 * Kareer Guide's MCP surface, served at POST /mcp.
 *
 * Unauthenticated by design — the app itself has no accounts (see the hard
 * rules in kareer-guide-master-prompt.md). Tools read their keys from the
 * server environment inside their handlers, never at module load.
 */
export default defineMcp({
  name: "kareer-guide-mcp",
  title: "Kareer Guide",
  version: "1.0.0",
  instructions:
    "Career tooling for students and professionals, India-first but global. Use `search_jobs` to find live jobs and internships by skill, `generate_career_roadmap` to lay out a learning path to a target role, and `analyze_resume_for_job` to score a resume against a job description before applying.",
  tools: [searchJobs, generateCareerRoadmap, analyzeResumeForJob],
});
