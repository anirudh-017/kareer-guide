import { describe, expect, it } from "vitest";

import { countryCodeFor } from "./countries";
import {
  clean,
  decodeEntities,
  dedupe,
  locationScore,
  locationTokens,
  recent,
  scoreJob,
} from "./jobs.server";
import type { Job } from "./types";

const job = (over: Partial<Job> = {}): Job => ({
  title: "Frontend Engineer",
  company: "Acme",
  location: "Bangalore, Karnataka",
  description: "React and TypeScript work.",
  applyLink: "https://example.com/1",
  source: "Adzuna",
  postedAt: new Date().toISOString(),
  jobType: "full_time",
  ...over,
});

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("clean", () => {
  it("strips tags and collapses whitespace", () => {
    expect(clean("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes escaped markup before stripping it", () => {
    // WeWorkRemotely double-escapes its HTML. Strip before decoding and the
    // description starts with 'img src="..."' instead of the actual text.
    expect(clean("&lt;img src=&quot;x.png&quot; /&gt;&lt;p&gt;Real text&lt;/p&gt;")).toBe(
      "Real text",
    );
  });

  it("decodes numeric entities and keeps ampersands", () => {
    expect(clean("Ben &amp; Jerry&#39;s")).toBe("Ben & Jerry's");
  });

  it("handles null and undefined", () => {
    expect(clean(null)).toBe("");
    expect(clean(undefined)).toBe("");
  });
});

describe("decodeEntities", () => {
  it("decodes entities in text that never goes through clean(), like titles", () => {
    // Regression guard: "Senior Java &amp; React Developer" rendered literally
    // in job cards because only descriptions were being cleaned.
    expect(decodeEntities("Senior Java &amp; React Developer")).toBe(
      "Senior Java & React Developer",
    );
    expect(decodeEntities("Dev &lt;script&gt; &quot;role&quot;")).toBe('Dev <script> "role"');
    expect(decodeEntities("plain title")).toBe("plain title");
  });
});

describe("locationTokens", () => {
  it("splits into words worth matching and drops short noise", () => {
    expect(locationTokens("Bengaluru, India")).toEqual(["bengaluru", "india"]);
    expect(locationTokens("")).toEqual([]);
  });
});

describe("locationScore", () => {
  const tokens = locationTokens("Bengaluru, India");

  it("scores nothing when the user gave no location", () => {
    expect(locationScore(job(), [], "in")).toBe(0);
  });

  it("ranks a direct place match highest", () => {
    expect(locationScore(job({ location: "Bengaluru, Karnataka" }), tokens, "in")).toBe(12);
  });

  it("keeps remote roles competitive with in-country ones", () => {
    // Regression guard: scoring remote far below in-country wiped every remote
    // board out of the results the moment a user typed a city.
    const remote = locationScore(
      job({ location: "Anywhere in the World", source: "WeWorkRemotely" }),
      tokens,
      "in",
    );
    const inCountry = locationScore(job({ location: "Noida", source: "Adzuna" }), tokens, "in");
    expect(remote).toBeGreaterThan(0);
    expect(inCountry - remote).toBeLessThanOrEqual(1);
  });

  it("gives an unrelated foreign location nothing", () => {
    expect(locationScore(job({ location: "Berlin", source: "Arbeitnow" }), tokens, "in")).toBe(0);
  });

  it("trusts Adzuna's country-scoped endpoint over its location string", () => {
    expect(locationScore(job({ location: "", source: "Adzuna" }), tokens, "in")).toBe(1);
    expect(locationScore(job({ location: "Unknown", source: "Adzuna" }), tokens, "in")).toBe(8);
  });
});

describe("scoreJob", () => {
  const skills = ["react", "typescript", "frontend"];

  it("requires a title hit or two skill matches", () => {
    const unrelated = job({ title: "Chef", description: "Cook food." });
    expect(scoreJob(unrelated, skills, [], "in")).toBe(0);
  });

  it("does not let a location match rescue an unrelated role", () => {
    const unrelated = job({ title: "Chef", description: "Cook food.", location: "Bengaluru" });
    expect(scoreJob(unrelated, skills, locationTokens("Bengaluru, India"), "in")).toBe(0);
  });

  it("adds location on top of the skill score", () => {
    const target = job({ title: "React Engineer", location: "Bengaluru" });
    const withLoc = scoreJob(target, skills, locationTokens("Bengaluru, India"), "in");
    const withoutLoc = scoreJob(target, skills, [], "in");
    expect(withLoc).toBeGreaterThan(withoutLoc);
  });

  it("weights a title match above a body-only mention", () => {
    const inTitle = scoreJob(
      job({ title: "React Developer", description: "" }),
      ["react"],
      [],
      "in",
    );
    const inBody = scoreJob(
      job({ title: "Developer", description: "react and typescript" }),
      ["react", "typescript"],
      [],
      "in",
    );
    expect(inTitle).toBeGreaterThan(0);
    expect(inBody).toBeGreaterThan(0);
  });
});

describe("recent", () => {
  it("keeps fresh postings and drops stale ones", () => {
    expect(recent(job({ postedAt: daysAgo(2) }))).toBe(true);
    expect(recent(job({ postedAt: daysAgo(30) }))).toBe(false);
  });

  it("keeps postings with no or unparseable date, as scraped sources have none", () => {
    expect(recent(job({ postedAt: null }))).toBe(true);
    expect(recent(job({ postedAt: "not a date" }))).toBe(true);
  });
});

describe("dedupe", () => {
  it("removes repeats of the same company and title", () => {
    const out = dedupe([
      job({ applyLink: "https://a.example" }),
      job({ applyLink: "https://b.example" }),
    ]);
    expect(out).toHaveLength(1);
  });

  it("drops entries with no title or no apply link", () => {
    expect(dedupe([job({ title: "" })])).toHaveLength(0);
    expect(dedupe([job({ applyLink: "" })])).toHaveLength(0);
  });

  it("keeps genuinely different roles at one company", () => {
    expect(
      dedupe([job({ title: "Frontend Engineer" }), job({ title: "Backend Engineer" })]),
    ).toHaveLength(2);
  });
});

describe("countryCodeFor", () => {
  it("maps Indian cities and the country name", () => {
    expect(countryCodeFor("Bengaluru, India")).toBe("in");
    expect(countryCodeFor("Pune")).toBe("in");
  });

  it("maps other supported markets", () => {
    expect(countryCodeFor("London")).toBe("gb");
    expect(countryCodeFor("New York")).toBe("us");
    expect(countryCodeFor("Berlin, Germany")).toBe("de");
  });

  it("falls back to India, the app's primary market", () => {
    expect(countryCodeFor("")).toBe("in");
    expect(countryCodeFor(undefined)).toBe("in");
    expect(countryCodeFor("Atlantis")).toBe("in");
  });
});
