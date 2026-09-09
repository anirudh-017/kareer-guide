import { describe, expect, it } from "vitest";

import { experienceOf, matchesLocation, typeOf } from "./jobFilters";
import type { Job } from "./types";

const job = (over: Partial<Job> = {}): Job => ({
  title: "Frontend Engineer",
  company: "Acme",
  location: "Bangalore, Karnataka",
  description: "Build things with React.",
  applyLink: "https://example.com/1",
  source: "Adzuna",
  postedAt: new Date().toISOString(),
  jobType: "full_time",
  ...over,
});

describe("matchesLocation", () => {
  it("matches a single token of a multi-word filter", () => {
    // The results page pre-fills this filter with the whole search string, so
    // a substring compare against "India" or "Bangalore, Karnataka" fails.
    expect(matchesLocation("India", "Bengaluru, India")).toBe(true);
    expect(matchesLocation("Bangalore, Karnataka", "Bengaluru, India")).toBe(false);
    expect(matchesLocation("Bengaluru, Karnataka", "Bengaluru, India")).toBe(true);
  });

  it("narrows on a single-word filter", () => {
    expect(matchesLocation("North Goa, Goa", "goa")).toBe(true);
    expect(matchesLocation("Noida, Uttar Pradesh", "goa")).toBe(false);
  });

  it("always keeps remote roles, which are open from anywhere", () => {
    expect(matchesLocation("Anywhere in the World", "Bengaluru, India")).toBe(true);
    expect(matchesLocation("Remote", "Berlin")).toBe(true);
    expect(matchesLocation("Worldwide", "Tokyo")).toBe(true);
  });

  it("ignores noise tokens shorter than three characters", () => {
    // "in" would otherwise match every location containing those letters.
    expect(matchesLocation("Berlin", "in")).toBe(true);
    expect(matchesLocation("Berlin", "us")).toBe(true);
  });

  it("treats an empty filter as no filter", () => {
    expect(matchesLocation("Anywhere", "")).toBe(true);
    expect(matchesLocation("Pune", "   ")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(matchesLocation("PUNE, MAHARASHTRA", "pune")).toBe(true);
  });
});

describe("experienceOf", () => {
  it("reads seniority out of the title", () => {
    expect(experienceOf(job({ title: "Senior Frontend Engineer" }))).toBe("senior");
    expect(experienceOf(job({ title: "Lead Developer" }))).toBe("senior");
    expect(experienceOf(job({ title: "Engineering Manager" }))).toBe("senior");
  });

  it("recognises entry level and internships", () => {
    expect(experienceOf(job({ title: "Frontend Intern" }))).toBe("entry");
    expect(experienceOf(job({ title: "Junior Developer" }))).toBe("entry");
    expect(experienceOf(job({ title: "Graduate Trainee" }))).toBe("entry");
    expect(experienceOf(job({ title: "Developer", description: "Freshers welcome" }))).toBe(
      "entry",
    );
  });

  it("defaults to mid", () => {
    expect(experienceOf(job({ title: "Frontend Engineer", description: "React work" }))).toBe(
      "mid",
    );
  });

  it("prefers senior when a title carries both signals", () => {
    expect(experienceOf(job({ title: "Senior Engineer, Graduate Programme" }))).toBe("senior");
  });
});

describe("typeOf", () => {
  it("classifies from jobType and title together", () => {
    expect(typeOf(job({ jobType: "internship" }))).toBe("internship");
    expect(typeOf(job({ jobType: "", title: "Frontend Intern" }))).toBe("internship");
    expect(typeOf(job({ jobType: "remote" }))).toBe("remote");
    expect(typeOf(job({ jobType: "full_time" }))).toBe("full-time");
  });
});
