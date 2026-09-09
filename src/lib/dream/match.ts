import type { GapStatus, RatedSkill, SkillGap, SkillRating } from "./types";

/**
 * Client-side skill matching — fast, deterministic, and used to render the
 * gap table instantly. The AI analysis refines these levels server-side, but
 * the local pass already gives a sane baseline (and powers the wizard's live
 * "requirements you already meet" preview).
 */

const RATING_ORDER: SkillRating[] = ["beginner", "intermediate", "advanced", "expert"];

export function ratingValue(r: SkillRating): number {
  return RATING_ORDER.indexOf(r);
}

export function ratingLabel(r: SkillRating): string {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .trim();

/** Merge synonyms: "js" ≈ "javascript", "dsa" ≈ "data structures". */
const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  dsa: "data structures",
  "data structures and algorithms": "data structures",
  "data structures & algorithms": "data structures",
  ml: "machine learning",
  ai: "machine learning",
  node: "node.js",
  nodejs: "node.js",
  nextjs: "next.js",
  aws: "aws",
  gcp: "gcp",
  k8s: "kubernetes",
  rest: "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  reactjs: "react",
  "react.js": "react",
  spring: "spring boot",
  c: "c",
  cpp: "c++",
};

function canonical(skill: string): string {
  const n = norm(skill);
  return ALIASES[n] ?? n;
}

/**
 * Whole-word containment.
 *
 * Plain `.includes` made "javascript" satisfy a "java" requirement — a false
 * match that inflates the headline percentage and tells someone they are ready
 * for a job they are not. Requiring a word boundary keeps the matches that
 * should hold ("react" in "react native", "java" in "java 8") and drops the
 * ones that shouldn't ("java" in "javascript", "react" in "reactive").
 *
 * Names under three characters ("c", "r", "go") only ever match exactly, since
 * a boundary check on them is still too loose to be meaningful.
 */
export function containsSkill(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

/** Find the user's skill record matching a requirement, if any. */
export function findUserSkill(skills: RatedSkill[], requirement: string): RatedSkill | undefined {
  const req = canonical(requirement);
  // Longest-name-first so "machine learning" wins over a stray "ml" chip.
  const sorted = [...skills].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((s) => {
    const u = canonical(s.name);
    return u === req || containsSkill(u, req) || containsSkill(req, u);
  });
}

/**
 * Compare one user skill against the level a requirement asks for.
 * A rating two+ steps below the bar is "missing", one step below is "partial".
 */
export function gapStatusFor(skill: RatedSkill | undefined, requiredLevel: string): GapStatus {
  if (!skill) return "missing";
  const reqIdx = RATING_ORDER.indexOf(normalizeLevel(requiredLevel));
  if (reqIdx === -1) return "match"; // requirement doesn't state a level
  const diff = ratingValue(skill.rating) - reqIdx;
  if (diff >= 0) return "match";
  if (diff === -1) return "partial";
  return "missing";
}

/** Map a free-text required level ("strong", "solid", "expertise") to a rating. */
export function normalizeLevel(level: string): SkillRating {
  const l = level.toLowerCase();
  if (/(expert|deep|strong|advanced|senior|extensive|mastery)/.test(l)) return "advanced";
  if (/(proficien|solid|working|good|intermediate|familiar with production)/.test(l))
    return "intermediate";
  if (/(basic|beginner|entry|awareness|exposure|fundamental)/.test(l)) return "beginner";
  return "intermediate";
}

/** Case-insensitive lookup into the model's per-requirement level estimates. */
function aiLevelFor(
  aiSkillLevels: Record<string, string>,
  requirement: string,
): SkillRating | undefined {
  const want = canonical(requirement);
  for (const [key, value] of Object.entries(aiSkillLevels)) {
    if (canonical(key) !== want) continue;
    const v = String(value).toLowerCase().trim();
    if (v === "none") return undefined;
    return RATING_ORDER.includes(v as SkillRating) ? (v as SkillRating) : undefined;
  }
  return undefined;
}

/**
 * Build the full gap table: requirements vs the user's rated skills.
 *
 * Literal matching is tried first because it is deterministic and explainable.
 * When it finds nothing we fall back to the model's own read of the user's
 * level for that requirement: real listings phrase requirements as prose
 * ("Experience with front-end technologies"), which no skill chip matches
 * literally — and scoring those as "missing" wrongly tells a qualified
 * candidate they are not eligible.
 */
export function buildSkillGaps(
  skills: RatedSkill[],
  requiredSkills: string[],
  preferredSkills: string[],
  requiredLevels: Record<string, string> = {},
  aiSkillLevels: Record<string, string> = {},
): SkillGap[] {
  const gaps: SkillGap[] = [];
  const push = (skill: string, kind: "required" | "preferred") => {
    const existing = gaps.find((g) => canonical(g.skill) === canonical(skill));
    if (existing) return;
    const matched = findUserSkill(skills, skill);
    const inferred = matched ? undefined : aiLevelFor(aiSkillLevels, skill);
    const user = matched ?? (inferred ? { name: skill, rating: inferred } : undefined);
    const requiredLevel = requiredLevels[canonical(skill)] ?? "intermediate";
    gaps.push({
      skill,
      kind,
      requiredLevel: ratingLabel(normalizeLevel(requiredLevel)),
      yourLevel: user ? ratingLabel(user.rating) : "None",
      status: gapStatusFor(user, requiredLevel),
    });
  };
  requiredSkills.forEach((s) => push(s, "required"));
  preferredSkills.forEach((s) => push(s, "preferred"));
  return gaps;
}

/** Weighted overall match: required skills matter 3× more than preferred ones. */
export function computeMatchScore(gaps: SkillGap[]): number {
  if (!gaps.length) return 0;
  let score = 0;
  let weight = 0;
  for (const g of gaps) {
    const w = g.kind === "required" ? 3 : 1;
    weight += w;
    score += g.status === "match" ? w : g.status === "partial" ? w * 0.5 : 0;
  }
  return Math.round((score / weight) * 100);
}

export function matchCategory(match: number): "strong" | "good" | "moderate" | "early" {
  if (match >= 80) return "strong";
  if (match >= 60) return "good";
  if (match >= 40) return "moderate";
  return "early";
}

export function matchHeadline(category: string): string {
  switch (category) {
    case "strong":
      return "Strong match";
    case "good":
      return "Good match — some improvements required";
    case "moderate":
      return "Moderate match — significant skill gaps";
    default:
      return "Early stage — substantial preparation required";
  }
}
