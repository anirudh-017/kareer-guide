import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Plus, Sparkles, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { analyzeResume, searchJobs } from "@/lib/jobsy.functions";
import { countryCodeFor } from "@/lib/countries";
import type { RoleType } from "@/lib/jobs.server";
import { extractResumeText } from "@/lib/resumeParse";
import { SK, writeJson } from "@/lib/session";

export const Route = createFileRoute("/recommendations")({
  head: () =>
    seo({
      title: "Job Match — Upload Your Resume",
      description:
        "Upload a PDF or DOCX resume, or pick your skills, and Kareer Guide finds live jobs, internships and part-time roles that match you.",
      path: "/recommendations",
      keywords: [
        "resume job matching",
        "upload resume find jobs",
        "skill based job search",
        "internship search india",
      ],
    }),
  component: Recommendations,
});

/**
 * Quick-add skills. Deliberately not all-technical — this is a careers product
 * for every student, so design, business and communication skills sit here too.
 */
const POPULAR_SKILLS = [
  "JavaScript",
  "Python",
  "React",
  "Node.js",
  "SQL",
  "Java",
  "TypeScript",
  "Machine Learning",
  "Data Analysis",
  "AWS",
  "Docker",
  "Git",
  "HTML/CSS",
  "C++",
  "Figma",
  "UI/UX Design",
  "Project Management",
  "Communication",
  "Leadership",
  "Marketing",
  "Sales",
  "Excel",
  "Photoshop",
  "Writing",
  "Public Speaking",
  "Accounting",
  "Finance",
  "Statistics",
  "R",
] as const;

const ROLE_TYPES: { value: RoleType; label: string }[] = [
  { value: "full-time", label: "FULL-TIME JOB" },
  { value: "internship", label: "INTERNSHIP" },
  { value: "part-time", label: "PART-TIME" },
];

type NominatimAddress = {
  city?: string;
  town?: string;
  state_district?: string;
  state?: string;
  country?: string;
};

function Recommendations() {
  const navigate = useNavigate();
  const doAnalyze = useServerFn(analyzeResume);
  const doSearch = useServerFn(searchJobs);

  const [mode, setMode] = useState<"resume" | "skills">("skills");
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [location, setLocation] = useState("");
  const [roleType, setRoleType] = useState<RoleType>("full-time");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function addSkill(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (skills.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((current) => [...current, name]);
    setSkillInput("");
  }

  const removeSkill = (name: string) => setSkills((c) => c.filter((s) => s !== name));

  async function handleFile(file: File) {
    try {
      setStatus("Reading your resume…");
      const text = await extractResumeText(file);
      if (text.length < 50) throw new Error("Could not read enough text from that file");
      setResumeText(text);
      setFileName(file.name);
      setStatus("");
      toast.success("Resume loaded");
    } catch (e) {
      setStatus("");
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = (await res.json()) as { address?: NominatimAddress };
        const a = data.address ?? {};
        setLocation(
          [a.city ?? a.town ?? a.state_district ?? a.state, a.country].filter(Boolean).join(", "),
        );
      } catch {
        toast.error("Could not detect your location");
      }
    });
  }

  async function submit() {
    setBusy(true);
    try {
      let skillList: string[];
      if (mode === "resume") {
        if (!resumeText) throw new Error("Upload a resume first");
        setStatus("Understanding your skills…");
        skillList = (await doAnalyze({ data: { resumeText } })).skills;
        if (!skillList.length) throw new Error("Could not read any skills from that resume");
        sessionStorage.setItem(SK.resumeText, resumeText);
      } else {
        // A skill typed but not yet committed shouldn't be silently dropped.
        skillList = skillInput.trim() ? [...skills, skillInput.trim()] : skills;
        if (!skillList.length) throw new Error("Add at least one skill");
      }
      writeJson(SK.skills, skillList);
      setStatus("Searching live job boards…");
      const { jobs } = await doSearch({
        data: {
          skills: skillList,
          location,
          roleType,
          countryCode: countryCodeFor(location),
        },
      });
      if (!jobs.length)
        throw new Error("No fresh matches right now — try broader skills or a different location");
      writeJson(SK.jobs, jobs);
      // /jobs pre-fills its location filter from this, so the location the user
      // typed here keeps working on the results page instead of being dropped.
      sessionStorage.setItem(SK.searchLocation, location);
      navigate({ to: "/jobs" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <Page
      title="Know What Suits You Best"
      intro="Upload your resume or select skills — we'll find real jobs from LinkedIn, Naukri, Internshala & more."
    >
      {/* Source of skills */}
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
        {(
          [
            { value: "resume", label: "UPLOAD RESUME", icon: Upload },
            { value: "skills", label: "SELECT SKILLS", icon: Sparkles },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`flex items-center justify-center gap-3 px-6 py-5 text-sm font-semibold tracking-wider ${
              mode === value
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "resume" && (
        <label className="mt-8 flex cursor-pointer flex-col items-center gap-3 border border-dashed border-border p-10 text-center">
          <Upload className="h-6 w-6" />
          <span className="label">{fileName || "CHOOSE PDF, DOCX OR TXT (MAX 10MB)"}</span>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}

      {/* Role type */}
      <p className="label mt-8 text-muted-foreground">WHAT TYPE OF ROLE?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ROLE_TYPES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleType(r.value)}
            aria-pressed={roleType === r.value}
            className={`border border-border px-5 py-3 text-sm tracking-wider ${
              roleType === r.value
                ? "bg-foreground font-bold text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Location */}
      <p className="label mt-8 text-muted-foreground">YOUR LOCATION (FOR NEARBY JOBS)</p>
      <div className="mt-3 flex">
        <input
          className="input-brutal px-5 py-4 text-base"
          placeholder="Bengaluru, India"
          aria-label="Your location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          className="btn-brutal -ml-px shrink-0 px-5"
          onClick={detectLocation}
          aria-label="Detect my location"
          title="Detect my location"
        >
          <span className="relative z-10">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="nav-fill" />
        </button>
      </div>

      {mode === "skills" && (
        <>
          {/* Skill entry */}
          <div className="mt-6 flex">
            <input
              className="input-brutal px-5 py-4 text-base"
              placeholder="Type a skill and press Enter…"
              aria-label="Add a skill"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
            />
            <button
              className="btn-brutal -ml-px shrink-0 px-5"
              onClick={() => addSkill(skillInput)}
              aria-label="Add skill"
              title="Add skill"
            >
              <span className="relative z-10">
                <Plus className="h-4 w-4" />
              </span>
              <span className="nav-fill" />
            </button>
          </div>

          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="label flex items-center gap-2 border border-border px-3 py-2"
                  style={{ background: "var(--pink)", color: "#000" }}
                >
                  {s}
                  <button onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="label mt-8 text-muted-foreground">POPULAR SKILLS</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_SKILLS.filter(
              (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()),
            ).map((s) => (
              <button
                key={s}
                onClick={() => addSkill(s)}
                className="border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        disabled={busy}
        className="btn-brutal mt-10 w-full py-5 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={submit}
      >
        <span className="relative z-10 flex items-center gap-3 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? status || "WORKING…" : "FIND JOBS"}
        </span>
        {!busy && <span className="nav-fill" />}
      </button>
    </Page>
  );
}
