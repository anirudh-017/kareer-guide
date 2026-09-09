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
          // accept-language matters: without it Nominatim answers in the local
          // script, and a Kannada place name matches no job listing on earth.
          `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = (await res.json()) as { address?: NominatimAddress };
        const a = data.address ?? {};
        // Keep the state alongside the locality. Outside a city Nominatim falls
        // through to the district — "Rangareddy" — which appears in no listing,
        // so the filter matched nothing and a 30-result search rendered empty.
        // "Rangareddy, Telangana, India" still carries a token boards do use.
        const locality = a.city ?? a.town ?? a.state_district;
        setLocation([locality, a.state, a.country].filter(Boolean).join(", "));
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
      <div className="inline-flex rounded-full border border-[#71766f]/35 bg-background/80 p-1.5 backdrop-blur-md shadow-sm gap-1">
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
            className={`btn-standard flex items-center gap-2 rounded-full px-5 py-2 font-mono text-xs font-semibold tracking-wider transition-all duration-200 ${
              mode === value
                ? "bg-[#0b3b2a] text-[#fbfbfa] font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-[#71766f]/15"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === "resume" && (
        <label className="mt-8 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-[#71766f]/40 bg-card/40 p-10 text-center transition-colors hover:border-[#0b3b2a]/70 hover:bg-[#0b3b2a]/5">
          <Upload className="h-6 w-6 text-[#0b3b2a]" />
          <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
            {fileName || "CHOOSE PDF, DOCX OR TXT (MAX 10MB)"}
          </span>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}

      {/* Role type */}
      <p className="mt-8 font-mono text-xs font-semibold tracking-wider text-[#a8b3ad]">
        WHAT TYPE OF ROLE?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ROLE_TYPES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleType(r.value)}
            aria-pressed={roleType === r.value}
            className={`btn-standard rounded-full border px-5 py-2 font-mono text-xs tracking-wider transition-all ${
              roleType === r.value
                ? "border-[#0b3b2a] bg-[#0b3b2a] font-bold text-[#fbfbfa] shadow-sm"
                : "border-border/40 bg-background/50 text-muted-foreground hover:border-[#0b3b2a]/40 hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Location */}
      <p className="mt-8 font-mono text-xs font-semibold tracking-wider text-[#a8b3ad]">
        YOUR LOCATION (FOR NEARBY JOBS)
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-border/40 bg-background/60 px-4 py-3 font-mono text-xs text-foreground focus:border-[#0b3b2a] focus:outline-none"
          placeholder="Bengaluru, India"
          aria-label="Your location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          className="btn-standard flex items-center justify-center rounded-xl border border-border/40 bg-background/60 px-4 text-muted-foreground transition-all hover:border-[#0b3b2a]/60 hover:text-foreground"
          onClick={detectLocation}
          aria-label="Detect my location"
          title="Detect my location"
        >
          <MapPin className="h-4 w-4 text-[#0b3b2a]" />
        </button>
      </div>

      {mode === "skills" && (
        <>
          {/* Skill entry */}
          <div className="mt-6 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border/40 bg-background/60 px-4 py-3 font-mono text-xs text-foreground focus:border-[#0b3b2a] focus:outline-none"
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
              className="btn-standard flex items-center justify-center rounded-xl border border-border/40 bg-[#0b3b2a]/20 px-5 text-foreground transition-all hover:bg-[#0b3b2a]/30 hover:border-[#0b3b2a]/60"
              onClick={() => addSkill(skillInput)}
              aria-label="Add skill"
              title="Add skill"
            >
              <Plus className="h-4 w-4 text-[#0b3b2a]" />
            </button>
          </div>

          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-2 rounded-lg bg-[#0b3b2a] px-3 py-1.5 font-mono text-xs font-semibold text-[#fbfbfa] shadow-sm"
                >
                  {s}
                  <button
                    onClick={() => removeSkill(s)}
                    aria-label={`Remove ${s}`}
                    className="hover:opacity-75"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="mt-8 font-mono text-xs font-semibold tracking-wider text-[#a8b3ad]">
            POPULAR SKILLS
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_SKILLS.filter(
              (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()),
            ).map((s) => (
              <button
                key={s}
                onClick={() => addSkill(s)}
                className="btn-standard rounded-full border border-border/40 bg-background/40 px-3.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-[#0b3b2a]/60 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        disabled={busy}
        className="btn-standard mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3b2a] py-4 font-mono text-xs font-bold tracking-wider text-[#fbfbfa] shadow-lg transition-all hover:bg-[#0b3b2a]/90 hover:shadow-xl disabled:opacity-50"
        onClick={submit}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        <span>{busy ? status || "WORKING…" : "FIND MY JOBS"}</span>
      </button>
    </Page>
  );
}
