import { describe, expect, it } from "vitest";

import {
  buildSkillGaps,
  computeMatchScore,
  containsSkill,
  findUserSkill,
  gapStatusFor,
  matchCategory,
  normalizeLevel,
} from "./match";
import type { RatedSkill } from "./types";

const skill = (name: string, rating: RatedSkill["rating"] = "intermediate"): RatedSkill => ({
  name,
  rating,
});

describe("containsSkill", () => {
  it("requires a word boundary, so Java is not JavaScript", () => {
    // The headline match % is built on this. Plain substring matching told
    // JavaScript-only candidates they met a Java requirement.
    expect(containsSkill("javascript", "java")).toBe(false);
    expect(containsSkill("reactive programming", "react")).toBe(false);
  });

  it("still matches genuine variants", () => {
    expect(containsSkill("java 8", "java")).toBe(true);
    expect(containsSkill("react native", "react")).toBe(true);
    expect(containsSkill("c++ programming", "c++")).toBe(true);
  });

  it("ignores needles under three characters, which are too loose to trust", () => {
    expect(containsSkill("google cloud", "go")).toBe(false);
    expect(containsSkill("c++", "c")).toBe(false);
  });
});

describe("findUserSkill", () => {
  it("does not credit Java to someone who only listed JavaScript", () => {
    expect(findUserSkill([skill("JavaScript")], "Java")).toBeUndefined();
  });

  it("matches exactly, ignoring case and punctuation", () => {
    expect(findUserSkill([skill("Node.js")], "node.js")?.name).toBe("Node.js");
    expect(findUserSkill([skill("react")], "React")?.name).toBe("react");
  });

  it("resolves aliases", () => {
    expect(findUserSkill([skill("JS")], "JavaScript")?.name).toBe("JS");
    expect(findUserSkill([skill("DSA")], "Data Structures")?.name).toBe("DSA");
    expect(findUserSkill([skill("k8s")], "Kubernetes")?.name).toBe("k8s");
  });

  it("prefers the longest matching skill name", () => {
    const skills = [skill("ML"), skill("Machine Learning", "advanced")];
    expect(findUserSkill(skills, "Machine Learning")?.rating).toBe("advanced");
  });

  it("returns undefined when nothing matches", () => {
    expect(findUserSkill([skill("Python")], "Kubernetes")).toBeUndefined();
    expect(findUserSkill([], "React")).toBeUndefined();
  });
});

describe("normalizeLevel", () => {
  it("maps recruiter phrasing onto a rating", () => {
    expect(normalizeLevel("strong")).toBe("advanced");
    expect(normalizeLevel("deep expertise")).toBe("advanced");
    expect(normalizeLevel("solid working knowledge")).toBe("intermediate");
    expect(normalizeLevel("basic awareness")).toBe("beginner");
  });

  it("defaults to intermediate for anything unrecognised", () => {
    expect(normalizeLevel("")).toBe("intermediate");
    expect(normalizeLevel("purple")).toBe("intermediate");
  });
});

describe("gapStatusFor", () => {
  it("counts meeting or exceeding the bar as a match", () => {
    expect(gapStatusFor(skill("React", "advanced"), "advanced")).toBe("match");
    expect(gapStatusFor(skill("React", "expert"), "advanced")).toBe("match");
  });

  it("counts one step below as partial and two as missing", () => {
    expect(gapStatusFor(skill("React", "intermediate"), "advanced")).toBe("partial");
    expect(gapStatusFor(skill("React", "beginner"), "advanced")).toBe("missing");
  });

  it("counts an absent skill as missing", () => {
    expect(gapStatusFor(undefined, "intermediate")).toBe("missing");
  });
});

describe("computeMatchScore", () => {
  const gap = (kind: "required" | "preferred", status: "match" | "partial" | "missing") => ({
    skill: `${kind}-${status}`,
    kind,
    requiredLevel: "Intermediate",
    yourLevel: "Intermediate",
    status,
  });

  it("returns 0 with no requirements rather than dividing by zero", () => {
    expect(computeMatchScore([])).toBe(0);
  });

  it("scores a full match at 100", () => {
    expect(computeMatchScore([gap("required", "match"), gap("preferred", "match")])).toBe(100);
  });

  it("weights required skills three times a preferred one", () => {
    // Missing one required hurts far more than missing one preferred.
    const missingRequired = computeMatchScore([
      gap("required", "missing"),
      gap("preferred", "match"),
    ]);
    const missingPreferred = computeMatchScore([
      gap("required", "match"),
      gap("preferred", "missing"),
    ]);
    expect(missingPreferred).toBeGreaterThan(missingRequired);
  });

  it("never marks someone ineligible purely for lacking preferred skills", () => {
    // Spec §7: a missing nice-to-have must not sink the candidate.
    const score = computeMatchScore([
      gap("required", "match"),
      gap("required", "match"),
      gap("preferred", "missing"),
      gap("preferred", "missing"),
    ]);
    expect(matchCategory(score)).toBe("good");
  });

  it("counts a partial as half credit", () => {
    expect(computeMatchScore([gap("required", "partial")])).toBe(50);
  });
});

describe("buildSkillGaps", () => {
  it("lists required and preferred skills with the user's level", () => {
    const gaps = buildSkillGaps(
      [skill("React", "advanced")],
      ["React", "TypeScript"],
      ["GraphQL"],
      {
        react: "advanced",
        typescript: "intermediate",
      },
    );
    expect(gaps).toHaveLength(3);
    expect(gaps.find((g) => g.skill === "React")).toMatchObject({
      kind: "required",
      yourLevel: "Advanced",
      status: "match",
    });
    expect(gaps.find((g) => g.skill === "TypeScript")).toMatchObject({
      yourLevel: "None",
      status: "missing",
    });
    expect(gaps.find((g) => g.skill === "GraphQL")?.kind).toBe("preferred");
  });

  it("does not list the same skill twice when it is both required and preferred", () => {
    const gaps = buildSkillGaps([skill("React")], ["React"], ["react"]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.kind).toBe("required");
  });
});

describe("matchCategory", () => {
  it("bands the score the way the results page labels it", () => {
    expect(matchCategory(85)).toBe("strong");
    expect(matchCategory(80)).toBe("strong");
    expect(matchCategory(79)).toBe("good");
    expect(matchCategory(60)).toBe("good");
    expect(matchCategory(59)).toBe("moderate");
    expect(matchCategory(40)).toBe("moderate");
    expect(matchCategory(39)).toBe("early");
    expect(matchCategory(0)).toBe("early");
  });
});

describe("buildSkillGaps with the model's level estimates", () => {
  it("falls back to the AI estimate when a prose requirement matches no skill", () => {
    // Real listings say "Experience with front-end technologies", which no
    // skill chip matches literally. Scoring that as missing told a React
    // developer they did not meet a front-end requirement.
    const gaps = buildSkillGaps(
      [skill("React", "advanced")],
      ["Experience with front-end technologies"],
      [],
      {},
      { "Experience with front-end technologies": "advanced" },
    );
    expect(gaps[0]).toMatchObject({ yourLevel: "Advanced", status: "match" });
  });

  it("prefers the user's own rating over the model's estimate", () => {
    const gaps = buildSkillGaps(
      [skill("React", "beginner")],
      ["React"],
      [],
      { react: "advanced" },
      {
        React: "expert",
      },
    );
    expect(gaps[0]).toMatchObject({ yourLevel: "Beginner", status: "missing" });
  });

  it('treats an AI level of "none" as genuinely missing', () => {
    const gaps = buildSkillGaps([], ["Kubernetes"], [], {}, { Kubernetes: "none" });
    expect(gaps[0]).toMatchObject({ yourLevel: "None", status: "missing" });
  });

  it("ignores an unrecognised AI level rather than trusting it", () => {
    const gaps = buildSkillGaps([], ["Kubernetes"], [], {}, { Kubernetes: "wizard" });
    expect(gaps[0]?.status).toBe("missing");
  });

  it("still works when no estimates are supplied at all", () => {
    const gaps = buildSkillGaps([skill("React")], ["React"], []);
    expect(gaps[0]?.status).toBe("match");
  });
});
