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

export type RoadmapPhase = {
  phase: string;
  duration: string;
  skills: string[];
  resources: string[];
  projects: string[];
  milestones: string[];
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
