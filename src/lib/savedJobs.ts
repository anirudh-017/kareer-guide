import type { Job, SavedJob } from "./types";

const KEY = "kg.savedJobs";

export function jobId(job: Job) {
  return `${job.company}::${job.title}`.toLowerCase().replace(/\s+/g, "-");
}

export function getSavedJobs(): SavedJob[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedJob[];
  } catch {
    return [];
  }
}

function write(jobs: SavedJob[]) {
  localStorage.setItem(KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event("kg-saved-jobs"));
}

export function saveJob(job: Job): SavedJob {
  const jobs = getSavedJobs();
  const id = jobId(job);
  const existing = jobs.find((j) => j.id === id);
  if (existing) return existing;
  const saved: SavedJob = { ...job, id, savedAt: new Date().toISOString() };
  write([saved, ...jobs]);
  return saved;
}

export function removeJob(id: string) {
  write(getSavedJobs().filter((j) => j.id !== id));
}

export function isSaved(job: Job) {
  return getSavedJobs().some((j) => j.id === jobId(job));
}

export function attachTailoredResume(
  id: string,
  tailoredResume: string,
  tailoredScore: number,
  tailoredFitScore: number,
) {
  const jobs = getSavedJobs().map((j) =>
    j.id === id ? { ...j, tailoredResume, tailoredScore, tailoredFitScore } : j,
  );
  write(jobs);
}
