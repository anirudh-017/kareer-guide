/**
 * Every sessionStorage key the app uses, in one place.
 *
 * `tailorJob` in particular is a hand-off, not a preference: it must be cleared
 * once consumed, otherwise opening /tailor-resume from the nav weeks later
 * re-runs a paid analysis against a stale job description.
 */
export const SK = {
  resumeText: "kg.resumeText",
  skills: "kg.skills",
  jobs: "kg.jobs",
  searchLocation: "kg.searchLocation",
  tailorJob: "kg.tailorJob",
  tailorContext: "kg.tailorContext",
  jd: "kg.jd",
  region: "kg.region",
  profile: "kg.profile",
  analysis: "kg.analysis",
  tailored: "kg.tailored",
} as const;

export type TailorHandoff = {
  jobDescription: string;
  title: string;
  company: string;
  location: string;
  applyLink: string;
  savedId: string;
};

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function clear(key: string) {
  sessionStorage.removeItem(key);
}
