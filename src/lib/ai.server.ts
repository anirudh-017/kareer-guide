import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText } from "ai";

export function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
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

/** Streams under the hood (long jobs), returns the full text. */
export async function ai(prompt: string, system?: string): Promise<string> {
  const g = gateway();
  const result = streamText({
    model: g(MODEL),
    ...(system ? { system } : {}),
    prompt,
  });
  return await result.text;
}

export async function aiShort(prompt: string, system?: string): Promise<string> {
  const g = gateway();
  const { text } = await generateText({
    model: g(MODEL),
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
