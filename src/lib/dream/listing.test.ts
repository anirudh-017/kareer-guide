import { describe, expect, it } from "vitest";

import { isOwnDomain } from "./dream.server";

describe("isOwnDomain", () => {
  it("accepts the company's own careers host", () => {
    expect(
      isOwnDomain(
        "https://careers.google.com/jobs/results/123",
        "https://www.google.com/about/careers/applications/",
      ),
    ).toBe(true);
  });

  it("ignores a www prefix", () => {
    expect(isOwnDomain("https://www.microsoft.com/x", "https://careers.microsoft.com/")).toBe(true);
  });

  it("rejects an aggregator redirect", () => {
    // Spec §19: the apply button must never send someone to a job board.
    expect(isOwnDomain("https://www.adzuna.in/details/456", "https://careers.microsoft.com/")).toBe(
      false,
    );
    expect(
      isOwnDomain("https://weworkremotely.com/remote-jobs/x", "https://careers.google.com/"),
    ).toBe(false);
  });

  it("is false when either URL is missing or unparseable", () => {
    expect(isOwnDomain("", "https://careers.google.com/")).toBe(false);
    expect(isOwnDomain("https://careers.google.com/", undefined)).toBe(false);
    expect(isOwnDomain("not a url", "https://careers.google.com/")).toBe(false);
  });
});
