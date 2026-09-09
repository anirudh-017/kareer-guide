import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText } from "ai";

/**
 * Two AI providers, either of which can carry the whole app.
 *
 * The spec asks for Gemini 3 Flash via the Lovable gateway, so that stays the
 * preference for resume work whenever LOVABLE_API_KEY is present. Groq runs
 * roadmaps by request, and picks up everything else when no gateway key is
 * configured — which is what keeps the app working on a Groq key alone.
 *
 * Each helper falls back to the other provider rather than failing, and logs
 * the swap: quietly changing which model wrote a resume is worse than saying so.
 */

export function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  // Surfaced verbatim in a toast, so make it actionable rather than cryptic.
  if (!key) {
    throw new Error(
      "AI is not configured on the server yet (LOVABLE_API_KEY is missing). See .env.example.",
    );
  }
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const MODEL = "google/gemini-3-flash-preview";

/** Groq's OpenAI-compatible endpoint. */
export function groqGateway() {
  const key = process.env["GROQ_API_KEY"];
  if (!key) {
    throw new Error(
      "AI is not configured on the server yet (GROQ_API_KEY is missing). See .env.example.",
    );
  }
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${key}` },
  });
}

export const GROQ_MODEL = "openai/gpt-oss-120b";

const hasLovable = () => Boolean(process.env["LOVABLE_API_KEY"]);
const hasGroq = () => Boolean(process.env["GROQ_API_KEY"]);

/**
 * Every caller here asks for a single JSON document, and a truncated one is
 * worthless — `parseJson` can only fall back to an empty result, which reaches
 * the user as a blank roadmap. The SDK's default cap silently cut the Dream Job
 * coaching response mid-object, so state a ceiling large enough for the biggest
 * response we ask for (roadmap + projects + interview prep ≈ 3k tokens).
 */
const MAX_OUTPUT_TOKENS = 12_000;

/** Warn once per provider swap per process, not once per request. */
const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

function assertConfigured() {
  if (!hasLovable() && !hasGroq()) {
    throw new Error(
      "AI is not configured on the server yet — set GROQ_API_KEY or LOVABLE_API_KEY. See .env.example.",
    );
  }
}

async function viaLovable(prompt: string, system?: string): Promise<string> {
  const g = gateway();
  // Streamed under the hood: the gateway is slower, and streaming avoids
  // hitting an idle-response timeout on the longer resume prompts.
  const result = streamText({
    model: g(MODEL),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    ...(system ? { system } : {}),
    prompt,
  });
  return await result.text;
}

async function viaGroq(prompt: string, system?: string): Promise<string> {
  const g = groqGateway();
  const { text } = await generateText({
    model: g(GROQ_MODEL),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    ...(system ? { system } : {}),
    prompt,
  });
  return text;
}

/**
 * General-purpose completion: skill extraction, resume analysis, tailoring.
 * Prefers the Lovable gateway (Gemini) per the spec, falls back to Groq.
 */
export async function ai(prompt: string, system?: string): Promise<string> {
  assertConfigured();
  if (!hasLovable()) {
    warnOnce("[ai] LOVABLE_API_KEY missing — resume features are running on Groq");
    return viaGroq(prompt, system);
  }
  return viaLovable(prompt, system);
}

/** Roadmap generation. Pinned to Groq by request; falls back to the gateway. */
export async function aiGroq(prompt: string, system?: string): Promise<string> {
  assertConfigured();
  if (!hasGroq()) {
    warnOnce("[ai] GROQ_API_KEY missing — roadmaps are running on the Lovable gateway");
    return viaLovable(prompt, system);
  }
  return viaGroq(prompt, system);
}

/** Short, latency-sensitive completion. Same preference order as `ai`. */
export async function aiShort(prompt: string, system?: string): Promise<string> {
  assertConfigured();
  if (!hasLovable()) return viaGroq(prompt, system);
  const g = gateway();
  const { text } = await generateText({
    model: g(MODEL),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    ...(system ? { system } : {}),
    prompt,
  });
  return text;
}

/** Pull the first JSON object/array out of a model response. */
export function parseJson<T>(text: string, fallback: T): T {
  const cleaned = text
    .replace(/```json/gi, "```")
    .split("```")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates = [text, ...cleaned];
  for (const c of candidates) {
    const start = c.search(/[[{]/);
    if (start === -1) continue;
    const end = Math.max(c.lastIndexOf("}"), c.lastIndexOf("]"));
    if (end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1)) as T;
    } catch {
      /* try next */
    }
  }
  return fallback;
}
