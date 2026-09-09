export type Job = {
  title: string;
  company: string;
  location: string;
  description: string;
  applyLink: string;
  source: string;
  postedAt: string | null;
  jobType: string;
};

export type SavedJob = Job & {
  id: string;
  savedAt: string;
  tailoredResume?: string;
  tailoredScore?: number;
  tailoredFitScore?: number;
};

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

/** A topic to learn, with the one-line reason it matters. */
export type RoadmapTopic = { name: string; detail: string };

export type ResourceType = "Course" | "Book" | "Website" | "YouTube" | "Tool" | "Docs";

export type RoadmapResource = {
  title: string;
  /** Author, instructor or publisher — omitted for sites and docs. */
  author: string;
  type: ResourceType;
};

export type RoadmapPhase = {
  phase: string;
  duration: string;
  difficulty: Difficulty;
  /** Why this phase exists and what it unlocks — 2-3 sentences. */
  description: string;
  topics: RoadmapTopic[];
  tools: string[];
  resources: RoadmapResource[];
  projects: string[];
  /** The single check that proves the phase is done. */
  milestone: string;
};

export type Roadmap = {
  role: string;
  /** Market context: what the work is, who hires for it, what it pays. */
  overview: string;
  /** End-to-end estimate, e.g. "6-9 Months". */
  totalDuration: string;
  prerequisites: string[];
  phases: RoadmapPhase[];
};

export type Signal = { name: string; score: number; note: string };

export type ResumeAnalysis = {
  score: number;
  fitScore: number;
  missingKeywords: string[];
  redFlags: string[];
  atsFit: Signal[];
  reviewerLens: Signal[];
  executiveClarity: Signal[];
  priorityFixes: string[];
  bulletRewrites: { before: string; after: string }[];
  summaryRewrite: string;
  benchmark: string;
};
