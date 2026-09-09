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

  it("recognises part-time however the board spells it", () => {
    expect(typeOf(job({ jobType: "part-time" }))).toBe("part-time");
    expect(typeOf(job({ jobType: "part time" }))).toBe("part-time");
    expect(typeOf(job({ jobType: "parttime" }))).toBe("part-time");
    expect(typeOf(job({ jobType: "", title: "Part-Time Sales Associate" }))).toBe("part-time");
  });

  it("still ranks internship above part-time when a listing says both", () => {
    expect(typeOf(job({ jobType: "part-time internship" }))).toBe("internship");
  });
});

describe("matchesLocation with a detected location", () => {
  /*
   * From a live report: geolocation outside a city centre gave Nominatim no
   * city or town, so it fell through to the district and answered in the local
   * script — "ರಂಗಾರೆಡ್ಡಿ, India". The search returned 30 results and the page
   * rendered "0 jobs found", because no listing names that district and the
   * tokenizer deleted the non-Latin word entirely.
   */
  it("keeps a non-Latin word as a token instead of deleting it", () => {
    expect(matchesLocation("ರಂಗಾರೆಡ್ಡಿ campus", "ರಂಗಾರೆಡ್ಡಿ, India")).toBe(true);
    // The old [^a-z0-9] split reduced that filter to ["india"], which matches
    // nothing, since boards write "Hyderabad, Telangana" and never "India".
    expect(matchesLocation("Hyderabad, Telangana", "India")).toBe(false);
  });

  it("matches once the state travels with the district", () => {
    // What detectLocation now produces for the same coordinates.
    const filter = "Rangareddy, Telangana, India";
    expect(matchesLocation("Hyderabad, Telangana", filter)).toBe(true);
    expect(matchesLocation("Secunderabad, Telangana", filter)).toBe(true);
    expect(matchesLocation("Remote", filter)).toBe(true);
  });

  it("still narrows to the region the user is in", () => {
    const filter = "Rangareddy, Telangana, India";
    expect(matchesLocation("Berlin, Germany", filter)).toBe(false);
    expect(matchesLocation("Bangalore, Karnataka", filter)).toBe(false);
  });
});
