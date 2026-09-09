import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2, Search, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { analyzeDreamJob, parseDreamResume } from "@/lib/dream.functions";
import {
  NO_COMPANY,
  POPULAR_ROLES,
  SKILL_SUGGESTIONS,
  findCompany,
  searchCompanies,
} from "@/lib/dream/companies";
import { ratingLabel } from "@/lib/dream/match";
import type { ExtractedResume } from "@/lib/dream/dream.server";
import type { DreamProfile, RatedSkill, SkillRating } from "@/lib/dream/types";
import { extractResumeText } from "@/lib/resumeParse";
import { SK, clear, readJson, writeJson } from "@/lib/session";

export const Route = createFileRoute("/dream-job")({
  head: () =>
    seo({
      title: "Dream Job — Career Gap Analysis",
      description:
        "Pick your dream company and role, add your skills, and get an AI eligibility check, skill-gap analysis and a personalized roadmap to become a strong candidate.",
      path: "/dream-job",
      keywords: [
        "dream job analysis",
        "career gap analysis",
        "am i eligible",
        "google software engineer requirements",
        "skill roadmap",
      ],
    }),
  component: DreamJobWizard,
});

const STEPS = ["Company", "Role", "Profile", "Skills", "Review"] as const;

const EMPTY_PROFILE: DreamProfile = {
  education: { level: "", degree: "", branch: "", college: "", graduationYear: "", gpa: "" },
  experience: { level: "", jobTitle: "", internships: "", projects: "" },
};

/** Fields the user left blank, filled from the resume — their input always wins. */
function pickBlanks<T extends Record<string, string>>(current: T, incoming: T): Partial<T> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(incoming)) {
    const mine = current[key]?.trim();
    const theirs = incoming[key]?.trim();
    if (!mine && theirs) out[key] = theirs;
  }
  return out as Partial<T>;
}

const EXPERIENCE_LEVELS = ["Student", "Fresher", "0–1 years", "1–2 years", "2–5 years", "5+ years"];
const EDU_LEVELS = ["10th", "12th", "Diploma", "Bachelor's", "Master's", "PhD", "Bootcamp"];
const RATINGS: SkillRating[] = ["beginner", "intermediate", "advanced", "expert"];

function DreamJobWizard() {
  const navigate = useNavigate();
  const run = useServerFn(analyzeDreamJob);
  const parse = useServerFn(parseDreamResume);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTicker = useCallback(() => {
    if (tickRef.current === null) return;
    clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);
  // Navigating away mid-analysis must not leave the ticker running either.
  useEffect(() => stopTicker, [stopTicker]);

  // Step 1 — company
  const [companyQuery, setCompanyQuery] = useState("");
  const [company, setCompany] = useState("");
  const [noCompany, setNoCompany] = useState(false);

  // Step 2 — role
  const [role, setRole] = useState("");

  // Step 3 — profile
  const [profile, setProfile] = useState<DreamProfile>(EMPTY_PROFILE);

  // Step 4 — skills + optional resume
  const [skills, setSkills] = useState<RatedSkill[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillRating, setSkillRating] = useState<SkillRating>("intermediate");
  const [resumeName, setResumeName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedResume | null>(null);
  const [resumed, setResumed] = useState(false);
  const [previousMatch, setPreviousMatch] = useState<number | null>(null);

  // "Re-analyze" from History or the results page stashes the previous profile
  // here. Without this the wizard reopened empty and the user had to retype
  // everything, which defeats the whole track-your-improvement loop.
  useEffect(() => {
    const savedCompany = sessionStorage.getItem(SK.dreamCompany) ?? "";
    const savedRole = sessionStorage.getItem(SK.dreamRole) ?? "";
    const savedProfile = readJson<DreamProfile>(SK.dreamProfile);
    const savedSkills = readJson<RatedSkill[]>(SK.dreamSkills);
    setPreviousMatch(readJson<{ match: number }>(SK.dreamPrevious)?.match ?? null);
    if (!savedCompany && !savedRole && !savedProfile && !savedSkills?.length) return;

    if (savedCompany) {
      setCompany(savedCompany);
      setCompanyQuery(savedCompany);
    } else if (savedRole) {
      // A previous run with no company chosen — keep that choice.
      setNoCompany(true);
    }
    if (savedRole) setRole(savedRole);
    if (savedProfile) setProfile(savedProfile);
    if (savedSkills?.length) setSkills(savedSkills);
    setResumed(true);
  }, []);

  /** Clear the carried-over profile and start a brand-new analysis. */
  function startFresh() {
    [
      SK.dreamCompany,
      SK.dreamRole,
      SK.dreamProfile,
      SK.dreamSkills,
      SK.dreamPrevious,
      SK.dreamResult,
    ].forEach(clear);
    setCompany("");
    setCompanyQuery("");
    setNoCompany(false);
    setRole("");
    setProfile(EMPTY_PROFILE);
    setSkills([]);
    setResumeName("");
    setResumeText("");
    setExtracted(null);
    setPreviousMatch(null);
    setResumed(false);
    setStep(0);
  }

  const companyHits = useMemo(() => searchCompanies(companyQuery), [companyQuery]);
  const selectedCompany = useMemo(
    () => (noCompany || !company.trim() ? null : findCompany(company)),
    [company, noCompany],
  );
  const roleHits = useMemo(() => {
    const q = role.trim().toLowerCase();
    if (!q) return POPULAR_ROLES.slice(0, 12).map((r) => r.name);
    const hits = POPULAR_ROLES.filter(
      (r) => r.name.toLowerCase().includes(q) || r.aliases.some((a) => a.includes(q)),
    ).map((r) => r.name);
    return hits.length ? hits : [role.trim()];
  }, [role]);

  const addSkill = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return;
    setSkills([...skills, { name: n, rating: skillRating }]);
    setSkillInput("");
  };

  /**
   * Read the file in the browser, then have the server pull structured fields
   * out of it and merge them in. Anything the user already typed wins — the
   * resume fills blanks and adds skills, it never overwrites their own input.
   */
  async function handleResume(file: File) {
    setResumeBusy(true);
    setExtracted(null);
    try {
      const text = await extractResumeText(file);
      if (text.length < 50) throw new Error("Could not read enough text from that file");
      setResumeText(text);
      setResumeName(file.name);

      const parsed = await parse({ data: { resumeText: text } });

      setProfile((current) => ({
        education: {
          ...current.education,
          ...pickBlanks(current.education, parsed.profile.education),
        },
        experience: {
          ...current.experience,
          ...pickBlanks(current.experience, parsed.profile.experience),
        },
      }));

      // Merge before dispatching: a count computed inside a state updater is
      // not available yet on the line after setSkills, so the toast read 0.
      const seen = new Set(skills.map((s) => s.name.toLowerCase()));
      const fresh = parsed.skills.filter((s) => {
        const key = s.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const added = fresh.length;
      if (added) setSkills((current) => [...current, ...fresh]);

      setExtracted(parsed);
      toast.success(
        `Resume analyzed successfully — ${added} skill${added === 1 ? "" : "s"} added. Edit anything before analyzing.`,
      );
    } catch (e) {
      // A parse failure must not lose the upload: the raw text still reaches
      // the analysis, so the user can carry on and fill the form by hand.
      toast.error(
        e instanceof Error
          ? `${e.message} — you can still fill the form in manually`
          : "Could not read that file",
      );
    } finally {
      setResumeBusy(false);
    }
  }

  async function submit() {
    if (!role.trim()) {
      toast.error("Enter a target role");
      setStep(1);
      return;
    }
    if (!skills.length) {
      toast.error("Add at least one skill");
      setStep(3);
      return;
    }
    setBusy(true);
    // Persist the wizard state so /results and re-analysis can reuse it.
    // Company and role are plain strings read back with getItem, so they must
    // be stored raw — writeJson would wrap them in literal quote characters
    // that then render as part of the company name.
    sessionStorage.setItem(SK.dreamCompany, noCompany ? "" : company.trim());
    sessionStorage.setItem(SK.dreamRole, role.trim());
    writeJson(SK.dreamProfile, profile);
    writeJson(SK.dreamSkills, skills);
    try {
      const steps = [
        "Understanding your current skills…",
        "Analyzing target role…",
        "Checking company requirements…",
        "Comparing your skills…",
        "Identifying skill gaps…",
        "Building your personalized roadmap…",
      ];
      let si = 0;
      setStatus(steps[0] ?? "");
      // Held outside the try/catch flow via `finally` below: on a failed
      // analysis the old code skipped clearInterval and left this firing
      // setStatus every 2.5s for the life of the page.
      tickRef.current = setInterval(() => {
        si = Math.min(si + 1, steps.length - 1);
        setStatus(steps[si] ?? "");
      }, 2500);

      const result = await run({
        data: {
          company: noCompany ? "" : company.trim(),
          role: role.trim(),
          profile,
          skills,
          ...(resumeText ? { resumeText } : {}),
        },
      });

      sessionStorage.setItem(SK.dreamResult, JSON.stringify(result));
      navigate({ to: "/dream-job/results" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      stopTicker();
      setBusy(false);
      setStatus("");
    }
  }

  const canNext =
    (step === 0 && (noCompany || company.trim().length > 0)) ||
    (step === 1 && role.trim().length >= 2) ||
    step === 2 ||
    (step === 3 && skills.length > 0) ||
    step === 4;

  return (
    <Page
      title="Dream Job"
      intro="Tell us where you want to work and what you know today. We compare the two and map the gap."
    >
      {/* Stepper */}
      <div className="grid grid-cols-5 gap-px border border-border bg-border">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={`bg-background p-3 text-left ${i === step ? "outline outline-2 -outline-offset-2 outline-[var(--pink)]" : ""}`}
            aria-current={i === step ? "step" : undefined}
          >
            <p className="label text-muted-foreground">
              STEP {i + 1} {i < step && "✓"}
            </p>
            <p className="mt-1 hidden text-sm font-bold sm:block">{s}</p>
          </button>
        ))}
      </div>

      {resumed && !busy && (
        <div className="card-brutal mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm">
            <span className="font-bold">Your previous profile is loaded.</span>{" "}
            <span className="text-muted-foreground">
              Update anything that has changed — new skills, a higher rating, fresh projects — then
              re-analyze to see how much your match moved.
              {previousMatch !== null && ` Last match: ${previousMatch}%.`}
            </span>
          </p>
          <button className="btn-brutal shrink-0" onClick={startFresh}>
            <span className="relative z-10">START FRESH</span>
            <span className="nav-fill" />
          </button>
        </div>
      )}

      {busy ? (
        <div className="card-brutal mt-8" role="status" aria-live="polite">
          <p className="label flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status || "ANALYZING…"}
          </p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {[
              "Understanding your current skills",
              "Analyzing target role",
              "Checking company requirements",
              "Comparing your skills",
              "Identifying skill gaps",
              "Building your personalized roadmap",
            ].map((s, i) => (
              <p key={s}>
                {status.startsWith(s.slice(0, 12)) ? "✓" : "·"} {s}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* STEP 1 — company */}
          {step === 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                What is your Dream Company?
              </h2>
              <div className="mt-4 flex">
                <input
                  className="input-brutal"
                  placeholder="Search a company or type your own…"
                  value={companyQuery}
                  onChange={(e) => {
                    setCompanyQuery(e.target.value);
                    setCompany(e.target.value);
                    setNoCompany(false);
                  }}
                />
                <span className="btn-brutal -ml-px shrink-0 pointer-events-none">
                  <span className="relative z-10">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-px border border-border bg-border">
                {companyHits.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setCompany(c.name);
                      setNoCompany(false);
                    }}
                    className={`bg-background px-4 py-2 text-sm ${company === c.name ? "font-bold" : "text-muted-foreground"}`}
                    style={
                      company === c.name ? { background: "var(--pink)", color: "#000" } : undefined
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setNoCompany(true);
                  setCompany("");
                }}
                className={`btn-brutal mt-6 ${noCompany ? "bg-foreground text-background" : ""}`}
              >
                <span className="relative z-10">I DON'T HAVE A SPECIFIC COMPANY</span>
                <span className="nav-fill" />
              </button>
              {noCompany && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No problem — we'll analyze your target role and industry instead.
                </p>
              )}
            </div>
          )}

          {/* STEP 2 — role */}
          {step === 1 && (
            <div className="mt-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                What role are you targeting?
              </h2>
              <input
                className="input-brutal mt-4"
                placeholder="Software Engineer, Data Analyst, Product Manager…"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-px border border-border bg-border">
                {roleHits.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`bg-background px-4 py-2 text-sm ${role === r ? "font-bold" : "text-muted-foreground"}`}
                    style={role === r ? { background: "var(--pink)", color: "#000" } : undefined}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Only ever the company's own careers portal — never a scraped
                  or guessed application URL. */}
              {selectedCompany && (
                <p className="mt-6 text-sm text-muted-foreground">
                  Browsing what {selectedCompany.name} is hiring for right now can help you pick the
                  exact title:{" "}
                  <a
                    href={selectedCompany.careersUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline underline-offset-4"
                  >
                    {selectedCompany.careersName} ↗
                  </a>
                </p>
              )}
            </div>
          )}

          {/* STEP 3 — profile */}
          {step === 2 && (
            <div className="mt-8 space-y-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Your education</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <select
                    className="input-brutal"
                    aria-label="Education level"
                    value={profile.education.level}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, level: e.target.value },
                      })
                    }
                  >
                    <option value="">LEVEL</option>
                    {EDU_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <input
                    className="input-brutal"
                    placeholder="Degree (B.Tech CSE…)"
                    value={profile.education.degree}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, degree: e.target.value },
                      })
                    }
                  />
                  <input
                    className="input-brutal"
                    placeholder="Branch / specialization"
                    value={profile.education.branch}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, branch: e.target.value },
                      })
                    }
                  />
                  <input
                    className="input-brutal md:col-span-2"
                    placeholder="College / university"
                    value={profile.education.college}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, college: e.target.value },
                      })
                    }
                  />
                  <input
                    className="input-brutal"
                    placeholder="Graduation year"
                    value={profile.education.graduationYear}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, graduationYear: e.target.value },
                      })
                    }
                  />
                  <input
                    className="input-brutal"
                    placeholder="GPA / % (optional)"
                    value={profile.education.gpa}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        education: { ...profile.education, gpa: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Your experience</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <select
                    className="input-brutal"
                    aria-label="Experience level"
                    value={profile.experience.level}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        experience: { ...profile.experience, level: e.target.value },
                      })
                    }
                  >
                    <option value="">EXPERIENCE LEVEL</option>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <input
                    className="input-brutal"
                    placeholder="Current / previous job title"
                    value={profile.experience.jobTitle}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        experience: { ...profile.experience, jobTitle: e.target.value },
                      })
                    }
                  />
                  <textarea
                    className="input-brutal"
                    placeholder="Internship experience…"
                    value={profile.experience.internships}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        experience: { ...profile.experience, internships: e.target.value },
                      })
                    }
                  />
                  <textarea
                    className="input-brutal"
                    placeholder="Relevant projects…"
                    value={profile.experience.projects}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        experience: { ...profile.experience, projects: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — skills */}
          {step === 3 && (
            <div className="mt-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">Your skills</h2>
              <div className="mt-4 flex">
                <input
                  className="input-brutal"
                  placeholder="Type a skill and press Enter…"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                />
                <div className="flex shrink-0">
                  {RATINGS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSkillRating(r)}
                      className={`btn-brutal -ml-px ${skillRating === r ? "bg-foreground text-background" : ""}`}
                      title={`Rate next skill as ${ratingLabel(r)}`}
                    >
                      <span className="relative z-10">{r.charAt(0).toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s.name}
                      className="label flex items-center gap-2 border border-border px-3 py-2"
                    >
                      {s.name} · {ratingLabel(s.rating)}
                      <button
                        onClick={() => setSkills(skills.filter((x) => x.name !== s.name))}
                        aria-label={`Remove ${s.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {Object.entries(SKILL_SUGGESTIONS).map(([group, list]) => (
                <div key={group} className="mt-6">
                  <p className="label text-muted-foreground">{group.toUpperCase()}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {list.map((s) => (
                      <button
                        key={s}
                        onClick={() => addSkill(s)}
                        className="label border border-border px-3 py-2 hover:bg-muted"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="card-brutal mt-8">
                <p className="label">OPTIONAL — UPLOAD RESUME (PDF / DOCX / TXT)</p>
                <label className="mt-3 flex cursor-pointer flex-col items-center gap-3 border border-dashed border-border p-8 text-center">
                  {resumeBusy ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                  <span className="label">
                    {resumeBusy ? "READING YOUR RESUME…" : resumeName || "CHOOSE FILE (MAX 10MB)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    disabled={resumeBusy}
                    onChange={(e) => e.target.files?.[0] && handleResume(e.target.files[0])}
                  />
                </label>

                {extracted && (
                  <div className="mt-4">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      <Check className="h-3.5 w-3.5" style={{ color: "var(--pink)" }} />
                      Resume analyzed successfully
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Skills were added above and blank profile fields were filled in — everything
                      stays editable, and nothing you typed yourself was overwritten.
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="label text-muted-foreground">EDUCATION FOUND</dt>
                        <dd className="mt-1">
                          {[
                            extracted.profile.education.level,
                            extracted.profile.education.degree,
                            extracted.profile.education.branch,
                            extracted.profile.education.college,
                            extracted.profile.education.graduationYear,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Nothing detected"}
                        </dd>
                      </div>
                      <div>
                        <dt className="label text-muted-foreground">EXPERIENCE FOUND</dt>
                        <dd className="mt-1">
                          {[
                            extracted.profile.experience.level,
                            extracted.profile.experience.jobTitle,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Nothing detected"}
                        </dd>
                      </div>
                      {extracted.profile.experience.projects && (
                        <div className="md:col-span-2">
                          <dt className="label text-muted-foreground">PROJECTS FOUND</dt>
                          <dd className="mt-1">{extracted.profile.experience.projects}</dd>
                        </div>
                      )}
                      {extracted.certifications.length > 0 && (
                        <div className="md:col-span-2">
                          <dt className="label text-muted-foreground">CERTIFICATIONS FOUND</dt>
                          <dd className="mt-1">{extracted.certifications.join(", ")}</dd>
                        </div>
                      )}
                    </dl>
                    <button className="btn-brutal mt-4" onClick={() => setStep(2)}>
                      <span className="relative z-10">REVIEW MY PROFILE</span>
                      <span className="nav-fill" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — review */}
          {step === 4 && (
            <div className="mt-8 card-brutal">
              <h2 className="text-2xl font-black uppercase tracking-tight">Ready to analyze</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dream company</dt>
                  <dd className="font-bold">{noCompany ? "No specific company" : company}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Target role</dt>
                  <dd className="font-bold">{role}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Skills</dt>
                  <dd className="text-right font-bold">
                    {skills.map((s) => `${s.name} (${ratingLabel(s.rating)})`).join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Resume</dt>
                  <dd className="font-bold">{resumeName || "Not uploaded"}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-8 flex gap-px">
            {step > 0 && (
              <button className="btn-brutal" onClick={() => setStep(step - 1)}>
                <span className="relative z-10 flex items-center gap-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> BACK
                </span>
                <span className="nav-fill" />
              </button>
            )}
            {step < 4 ? (
              <button
                className="btn-brutal -ml-px flex-1 disabled:opacity-60"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
              >
                <span className="relative z-10 flex items-center gap-2">
                  NEXT <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="nav-fill" />
              </button>
            ) : (
              <button
                className="btn-brutal -ml-px flex-1"
                onClick={submit}
                style={{ background: "var(--pink)", color: "#000" }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> ANALYZE MY DREAM JOB
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
