import type { SavedDreamJob } from "./dream/types";

/**
 * Saved Dream Job analyses — localStorage, like savedJobs.ts. The app has no
 * accounts by design, so "logged-in users save their analyses" becomes
 * "this device keeps them", matching the rest of the product.
 */

const KEY = "kg.dreamJobs";

export function getDreamJobs(): SavedDreamJob[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedDreamJob[];
  } catch {
    return [];
  }
}

function write(jobs: SavedDreamJob[]) {
  localStorage.setItem(KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event("kg-dream-jobs"));
}

export function saveDreamJob(analysis: SavedDreamJob): void {
  const jobs = getDreamJobs();
  const idx = jobs.findIndex((j) => j.id === analysis.id);
  if (idx >= 0) jobs[idx] = analysis;
  else jobs.unshift(analysis);
  write(jobs);
}

export function removeDreamJob(id: string): void {
  write(getDreamJobs().filter((j) => j.id !== id));
}

export function getDreamJob(id: string): SavedDreamJob | undefined {
  return getDreamJobs().find((j) => j.id === id);
}

/** Toggle one roadmap task and persist. */
export function toggleRoadmapTask(id: string, phaseIndex: number, taskId: string): void {
  const jobs = getDreamJobs().map((j) => {
    if (j.id !== id) return j;
    const phase = j.roadmap[phaseIndex];
    if (!phase) return j;
    const tasks = phase.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
    return {
      ...j,
      roadmap: j.roadmap.map((p, i) => (i === phaseIndex ? { ...p, tasks } : p)),
    };
  });
  write(jobs);
}

/** Roadmap completion % across all phases. */
export function roadmapProgress(roadmap: { tasks: { id: string; done: boolean }[] }[]): number {
  const all = roadmap.flatMap((p) => p.tasks);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}
