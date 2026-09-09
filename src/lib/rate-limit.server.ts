import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * Best-effort abuse protection for the public, unauthenticated endpoints.
 *
 * The app has no accounts by design, so every server function and MCP tool is
 * reachable by anyone — and each AI call spends real credits. This caps how
 * often one caller can trigger them.
 *
 * Deliberately in-memory: it needs no infrastructure and blunts the obvious
 * abuse (a script in a loop). It is NOT a hard guarantee — serverless isolates
 * are per-region and short-lived, so a determined caller spread across regions
 * gets more than the stated limit. If this ever needs to be exact, move the
 * counters to Durable Objects / KV and keep this interface.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

/** Stop the Map growing without bound in a long-lived isolate. */
function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
}

export type Limit = { limit: number; windowMs: number };

const MINUTE = 60_000;

export const LIMITS = {
  /** Resume analysis, skill extraction, roadmaps — one model call each. */
  ai: { limit: 12, windowMs: 10 * MINUTE },
  /** Tailoring chains up to 8 model calls, so it gets its own tighter cap. */
  tailor: { limit: 6, windowMs: 10 * MINUTE },
  /** Job search costs upstream API quota rather than AI credits. */
  search: { limit: 20, windowMs: 10 * MINUTE },
} as const satisfies Record<string, Limit>;

let warnedNoIp = false;

/**
 * Identify the caller. Cloudflare sets CF-Connecting-IP and overwrites any
 * client-supplied value, so it is trustworthy where the app is deployed;
 * X-Forwarded-For is the fallback for other proxies and is spoofable, which is
 * acceptable for a best-effort limiter but not for anything security-critical.
 */
function callerKey(): string | null {
  try {
    const cf = getRequestHeader("cf-connecting-ip" as never);
    if (cf) return cf;
    const ip = getRequestIP({ xForwardedFor: true });
    return ip ?? null;
  } catch {
    return null;
  }
}

export class RateLimitError extends Error {
  readonly statusCode = 429;
  constructor(retryAfterSeconds: number) {
    const mins = Math.ceil(retryAfterSeconds / 60);
    super(
      `You've made a lot of requests in a short time. Try again in ${
        mins <= 1 ? "a minute" : `${mins} minutes`
      }.`,
    );
    this.name = "RateLimitError";
  }
}

/**
 * Count one use of `name` against the caller's quota.
 * @throws RateLimitError when the caller is over the limit.
 */
export function rateLimit(name: keyof typeof LIMITS): void {
  const key = callerKey();
  if (!key) {
    // No usable client address (local dev, an unusual host). Limiting every
    // caller as one shared bucket would be worse than not limiting at all.
    if (!warnedNoIp) {
      warnedNoIp = true;
      console.warn("[rate-limit] no client IP available — rate limiting is inactive");
    }
    return;
  }

  const { limit, windowMs } = LIMITS[name];
  const now = Date.now();
  prune(now);

  const bucketKey = `${name}:${key}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new RateLimitError(Math.ceil((current.resetAt - now) / 1000));
  }

  current.count += 1;
}
