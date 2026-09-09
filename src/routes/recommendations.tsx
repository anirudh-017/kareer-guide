import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { analyzeResume, searchJobs } from "@/lib/jobsy.functions";
import { extractResumeText } from "@/lib/resumeParse";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Job Match — Upload Your Resume | Kareer Guide" },
      {
        name: "description",
        content:
          "Upload a PDF or DOCX resume, or type your skills, and Kareer Guide finds live jobs and internships that match you.",
      },
      { property: "og:title", content: "Job Match | Kareer Guide" },
      { property: "og:description", content: "Match your resume to live jobs and internships." },
      { property: "og:url", content: "/recommendations" },
    ],
    links: [{ rel: "canonical", href: "/recommendations" }],
  }),
  component: Recommendations,
});

function Recommendations() {
  const navigate = useNavigate();
  const doAnalyze = useServerFn(analyzeResume);
  const doSearch = useServerFn(searchJobs);

  const [mode, setMode] = useState<"resume" | "skills">("resume");
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [internship, setInternship] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

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
    if (!navigator.geolocation) return toast.error("Location is not available in this browser");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = (await res.json()) as { address?: Record<string, string> };
        const a = data.address ?? {};
        setLocation([a.city ?? a.town ?? a.state_district ?? a.state, a.country].filter(Boolean).join(", "));
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
        sessionStorage.setItem("kg.resumeText", resumeText);
      } else {
        skillList = skills
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!skillList.length) throw new Error("Enter at least one skill");
      }
      sessionStorage.setItem("kg.skills", JSON.stringify(skillList));
      setStatus("Searching live job boards…");
      const { jobs } = await doSearch({ data: { skills: skillList, location, internship } });
      sessionStorage.setItem("kg.jobs", JSON.stringify(jobs));
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
      title="Job Match"
      intro="Give us your resume or just your skills. We read them, then search thousands of live listings for the roles that actually fit."
    >
      <div className="flex">
        {(["resume", "skills"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`btn-brutal -ml-px ${mode === m ? "bg-foreground text-background" : ""}`}
          >
            <span className="relative z-10">{m === "resume" ? "UPLOAD RESUME" : "ENTER SKILLS"}</span>
            {mode !== m && <span className="nav-fill" />}
          </button>
        ))}
      </div>

      <div className="mt-6 card-brutal">
        {mode === "resume" ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 border border-dashed border-border p-10 text-center">
            <Upload className="h-6 w-6" />
            <span className="label">{fileName || "CHOOSE PDF, DOCX OR TXT (MAX 10MB)"}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <textarea
            className="input-brutal h-40"
            placeholder="react, typescript, data analysis, python, product management…"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="label mb-2">LOCATION (OPTIONAL)</p>
            <div className="flex">
              <input
                className="input-brutal"
                placeholder="Bengaluru, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button className="btn-brutal -ml-px shrink-0" onClick={detectLocation}>
                <span className="relative z-10">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <span className="nav-fill" />
              </button>
            </div>
          </div>
          <div>
            <p className="label mb-2">LOOKING FOR</p>
            <div className="flex">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setInternship(v)}
                  className={`btn-brutal -ml-px flex-1 ${internship === v ? "bg-foreground text-background" : ""}`}
                >
                  <span className="relative z-10">{v ? "INTERNSHIPS" : "JOBS"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button disabled={busy} className="btn-brutal mt-6 w-full disabled:opacity-60" onClick={submit}>
          <span className="relative z-10 flex items-center gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? status || "WORKING…" : "FIND MY JOBS"}
          </span>
          <span className="nav-fill" />
        </button>
      </div>
    </Page>
  );
}
