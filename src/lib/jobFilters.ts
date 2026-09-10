import type { Job } from "./types";

/**
 * Client-side classification and filtering for the results page.
 *
 * Job boards don't agree on how to describe seniority or employment type, so
 * these derive both from the text. Pure and framework-free so they can be
 * tested directly.
 */

/** Seniority inferred from the title and body, since few boards state it. */
export function experienceOf(job: Job): "entry" | "mid" | "senior" {
  const t = `${job.title} ${job.description}`.toLowerCase();
  if (/\b(senior|sr\.|lead|principal|staff|head of|manager|architect)\b/.test(t)) return "senior";
  // "Freshers" is the standard phrasing in Indian listings, so the plural has
  // to match too — \bfresher\b alone silently misses most of them.
  if (
    /\b(interns?|internships?|trainees?|freshers?|graduates?|entry[- ]level|junior|jr\.)\b/.test(t)
  )
    return "entry";
  return "mid";
}

export function typeOf(job: Job): string {
  const t = `${job.jobType} ${job.title}`.toLowerCase();
  if (t.includes("intern")) return "internship";
  // Boards spell this "part-time", "part time" and "parttime".
  if (/part[\s_-]?time/.test(t)) return "part-time";
  if (t.includes("remote")) return "remote";
  return "full-time";
}

/**
 * How every layer decides a listing is remote. Shared with jobs.server so
 * the two cannot drift: the client copy used to omit "distributed", "work
 * from home" and "wfh", so a WFH role was promoted to the top of the results
 * by the ranking and then hidden by the location filter.
 */
export const REMOTE = /\b(remote|anywhere|worldwide|distributed|work from home|wfh)\b/;

/**
 * Match a job's location against what the user typed, token by token.
 *
 * A whole-string compare fails on exactly the input the results page pre-fills:
 * "Bengaluru, India" is not a substring of Adzuna's "India" or "Bangalore,
 * Karnataka". Matching any single token keeps a broad search broad while a
 * one-word filter ("goa") still narrows hard. Remote roles always qualify —
 * they are open to the user wherever they are.
 */
export function matchesLocation(jobLocation: string, filter: string): boolean {
  const where = jobLocation.toLowerCase();
  // Split on any non-alphanumeric character, Unicode-aware. The old [^a-z0-9]
  // class treated every non-Latin character as a separator, so a place name in
  // a local script deleted itself rather than becoming a token.
  //
  // \p{M} matters as much as \p{L}: Indic scripts carry vowel signs and viramas
  // as combining marks, so letters alone still shatter ರಂಗಾರೆಡ್ಡಿ into single
  // characters that the length filter then discards.
  const tokens = filter
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((t) => t.length > 2);
  if (!tokens.length) return true;
  if (REMOTE.test(where)) return true;
  return tokens.some((t) => where.includes(t));
}
