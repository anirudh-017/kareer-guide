/** Shared shapes for the Dream Job / Dream Company feature. */

export type SkillRating = "beginner" | "intermediate" | "advanced" | "expert";

/** What the user typed/entered about themselves. */
export type DreamProfile = {
  education: {
    level: string;
    degree: string;
    branch: string;
    college: string;
    graduationYear: string;
    gpa: string;
  };
  experience: {
    level: string; // Student | Fresher | 0–1 years | 1–2 years | 2–5 years | 5+ years
    jobTitle: string;
    internships: string;
    projects: string;
  };
};

export type RatedSkill = { name: string; rating: SkillRating };

/** What the target job demands, extracted from a listing or an AI profile. */
export type DreamRequirements = {
  company: string;
  role: string;
  /** Proficiency bar per required skill, e.g. { javascript: "advanced" }. */
  requiredLevels: Record<string, string>;
  /** Where the requirements came from. */
  source: "official-listing" | "ai-knowledge";
  sourceUrl: string;
  sourceName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  education: string;
  experience: string;
  locations: string[];
  jobType: string;
  seniority: string;
  isVerified: boolean;
  /** Short disclaimer when the listing could not be verified live. */
  verificationNote: string;
  analyzedAt: string;
};

export type GapStatus = "match" | "partial" | "missing";

export type SkillGap = {
  skill: string;
  kind: "required" | "preferred";
  requiredLevel: string;
  yourLevel: string;
  status: GapStatus;
};

export type RoadmapTask = {
  id: string;
  title: string;
  done: boolean;
};

export type RoadmapPhase = {
  phase: string;
  duration: string;
  why: string;
  skills: string[];
  topics: string[];
  resources: string[];
  practice: string[];
  outcome: string;
  tasks: RoadmapTask[];
};

export type ProjectIdea = {
  idea: string;
  technologies: string[];
  features: string[];
  difficulty: string;
  duration: string;
  demonstrates: string[];
  whyItHelps: string;
};

export type InterviewPrep = {
  technical: string[];
  behavioral: string[];
  practicePlatforms: string[];
  suggestedDuration: string;
};

export type ReadinessBreakdown = {
  label: string;
  score: number;
};

export type DreamMatch = {
  /** The single-word-level match percentage the user sees big. */
  match: number;
  category: "strong" | "good" | "moderate" | "early";
  eligible: boolean;
  strengths: string[];
  explanation: string;
  skillGaps: SkillGap[];
  requirementsMet: { requirement: string; status: GapStatus; yourEvidence: string }[];
};

export type DreamAnalysis = {
  id: string;
  createdAt: string;
  company: string;
  role: string;
  requirements: DreamRequirements;
  match: DreamMatch;
  roadmap: RoadmapPhase[];
  projects: ProjectIdea[];
  interviewPrep: InterviewPrep;
  readiness: ReadinessBreakdown[];
  overallReadiness: number;
  /**
   * The model's own estimate of the user's level per requirement, keyed by
   * requirement text. Used as the fallback when literal skill matching finds
   * nothing — job requirements are often phrased as prose ("Experience with
   * front-end technologies") that no skill chip will ever match literally.
   */
  aiSkillLevels: Record<string, string>;
  /** Match score of the previous saved analysis, when re-analyzing. */
  previousMatch?: number;
};

export type SavedDreamJob = DreamAnalysis & {
  profile: DreamProfile;
  skills: RatedSkill[];
};

/** Payload sent from the wizard to the server. */
export type DreamAnalyzeInput = {
  company: string;
  role: string;
  profile: DreamProfile;
  skills: RatedSkill[];
  /** Raw resume text, when the user uploaded one. */
  resumeText?: string;
};
