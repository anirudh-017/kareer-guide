import { describe, expect, it } from "vitest";

import { parseJson } from "./ai.server";

describe("parseJson", () => {
  it("parses a plain JSON response", () => {
    expect(parseJson('{"score":80}', {})).toEqual({ score: 80 });
  });

  it("unwraps a fenced ```json block", () => {
    expect(parseJson('```json\n["react","typescript"]\n```', [])).toEqual(["react", "typescript"]);
  });

  it("finds JSON buried in prose, which models add despite instructions", () => {
    expect(parseJson('Sure! Here is the result:\n{"a":1}\nHope that helps.', {})).toEqual({ a: 1 });
  });

  it("returns the fallback rather than throwing on unparseable text", () => {
    const fallback = { score: 0 };
    expect(parseJson("I could not do that", fallback)).toBe(fallback);
    expect(parseJson("", fallback)).toBe(fallback);
  });

  it("returns the fallback on malformed JSON", () => {
    const fallback: string[] = [];
    expect(parseJson('{"broken": ', fallback)).toBe(fallback);
  });

  it("handles nested objects and arrays", () => {
    const text = '```\n{"phases":[{"skills":["sql"]}]}\n```';
    expect(parseJson(text, {})).toEqual({ phases: [{ skills: ["sql"] }] });
  });
});
