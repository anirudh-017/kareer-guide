import { describe, expect, it } from "vitest";
import { isGibberishToken, looksLikeGibberish } from "./validate";

/**
 * The false-positive list matters more than the false-negative one: letting a
 * fake role through costs one model call that the downstream check catches,
 * while rejecting a real role breaks the product for that user outright.
 */
const REAL_ROLES = [
  "Data Scientist",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Cybersecurity Analyst",
  "UI/UX Designer",
  "Product Manager",
  "Business Analyst",
  "Blockchain Developer",
  "Game Developer",
  "Technical Writer",
  "QA Engineer",
  "Cloud Architect",
  "Mobile Developer",
  "Scrum Master",
  "Data Engineer",
  "Solutions Architect",
  "Embedded Systems Engineer",
  "Chartered Accountant",
  "Investment Banker",
  "Civil Engineer",
  "Graphic Designer",
  "Content Strategist",
  "Digital Marketer",
  "Human Resources Manager",
  "Teacher",
  "Nurse",
  // Vowel-poor but entirely real — the acronym trap.
  "SDET",
  "SRE",
  "QA",
  "SQL Developer",
  "AWS Architect",
  "PHP Developer",
  "C++ Developer",
  "Node.js Developer",
  ".NET Developer",
  "iOS Developer",
];

const MASH = [
  "asdfgh qwerty",
  "zzzz",
  "ghgh jkjk lolol",
  "asdasdasd",
  "qwertyuiop",
  "aaaaaaa",
  "lkjhgf",
  "zxcvbnm",
  "hjkl",
  "abcabcabc",
  "sdfghjk",
  "mnbvcx",
];

describe("looksLikeGibberish", () => {
  it.each(REAL_ROLES)("accepts %s", (role) => {
    expect(looksLikeGibberish(role)).toBe(false);
  });

  it.each(MASH)("rejects %s", (mash) => {
    expect(looksLikeGibberish(mash)).toBe(true);
  });

  it("ignores tokens too short to judge", () => {
    expect(looksLikeGibberish("QA")).toBe(false);
    expect(looksLikeGibberish("PM")).toBe(false);
    expect(looksLikeGibberish("")).toBe(false);
  });

  it("keeps a phrase that contains one real word", () => {
    // The model check downstream is better placed to interpret this than a regex.
    expect(looksLikeGibberish("senior asdfgh developer")).toBe(false);
  });
});

describe("isGibberishToken", () => {
  it("catches repeated characters", () => {
    expect(isGibberishToken("zzzz")).toBe(true);
    expect(isGibberishToken("noooo")).toBe(true); // four o's clears the threshold
    expect(isGibberishToken("nooo")).toBe(false); // three does not
  });

  it("catches a repeated unit", () => {
    expect(isGibberishToken("ghgh")).toBe(true);
    expect(isGibberishToken("lolol")).toBe(true);
  });

  it("catches keyboard runs", () => {
    expect(isGibberishToken("asdf")).toBe(true);
    expect(isGibberishToken("poiu")).toBe(true);
  });

  it("only applies the vowel rule to long tokens", () => {
    expect(isGibberishToken("sdet")).toBe(false);
    expect(isGibberishToken("bcdfghjk")).toBe(true);
  });
});
