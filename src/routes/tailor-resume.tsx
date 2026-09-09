import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { tailorAnalyze } from "@/lib/jobsy.functions";
import { extractResumeText } from "@/lib/resumeParse";

export const Route = createFileRoute("/tailor-resume")({
  head: () => ({
    meta: [
      { title: "Tailor Your Resume to Any Job | Kareer Guide" },
      {
        name: "description",
        content:
          "Upload your resume, paste a job description, and get a recruiter-grade review plus a rewritten, ATS-ready resume.",
      },
      { property: "og:title", content: "Tailor Your Resume | Kareer Guide" },
      { property: "og:description", content: "Recruiter-grade resume review and rewrite." },
      { property: "og:url", content: "/tailor-resume" },
    ],
    links: [{ rel: "canonical", href: "/tailor-resume" }],
  }),
  component: TailorResume,
});

const REGIONS = [
  "🌍 Global", "🇮🇳 India", "🇺🇸 United States", "🇬🇧 United Kingdom", "🇨🇦 Canada", "🇦🇺 Australia",
  "🇩🇪 Germany", "🇫🇷 France", "🇳🇱 Netherlands", "🇮🇪 Ireland", "🇸🇬 Singapore", "🇦🇪 UAE",
  "🇸🇦 Saudi Arabia", "🇶🇦 Qatar", "🇯🇵 Japan", "🇰🇷 South Korea", "🇨🇳 China", "🇭🇰 Hong Kong",
  "🇳🇿 New Zealand", "🇿🇦 South Africa", "🇧🇷 Brazil", "🇲🇽 Mexico", "🇦🇷 Argentina", "🇪🇸 Spain",
  "🇮🇹 Italy", "🇸🇪 Sweden", "🇳🇴 Norway", "🇩🇰 Denmark", "🇫🇮 Finland", "🇵🇱 Poland",
  "🇨🇭 Switzerland", "🇦🇹 Austria", "🇧🇪 Belgium", "🇵🇹 Portugal", "🇲🇾 Malaysia",
];

const PROFILES = [
  "Standard Professional",
  "Large MNC / Fortune 500",
  "Vendor / Staffing",
  "Implementation Partner",
  "Startup",
  "Public Sector",
  "Others",
];

function TailorResume() {
  const navigate = useNavigate();
  const run = useServerFn(tailorAnalyze);

  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [region, setRegion] = useState(REGIONS[1]);
  const [companyProfile, setCompanyProfile] = useState(PROFILES[0]);
  const [jobMeta, setJobMeta] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const autoStarted = useRef(false);

  const analyze = useCallback(
    async (text: string, jd: string) => {
      if (text.trim().length < 50) return toast.error("Add your resume first");
      setBusy(true);
      try {
        const analysis = await run({
          data: { resumeText: text, jobDescription: jd || undefined, region, companyProfile },
        });
        sessionStorage.setItem("kg.resumeText", text);
        sessionStorage.setItem("kg.jd", jd);
        sessionStorage.setItem("kg.region", region);
        sessionStorage.setItem("kg.profile", companyProfile);
        sessionStorage.setItem("kg.analysis", JSON.stringify(analysis));
        navigate({ to: "/resume-analysis" });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setBusy(false);
      }
    },
    [companyProfile, navigate, region, run],
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("kg.tailorJob");
    const saved = sessionStorage.getItem("kg.resumeText") ?? "";
    if (saved) {
      setResumeText(saved);
      setTab("paste");
    }
    if (raw) {
      const meta = JSON.parse(raw) as Record<string, string>;
      setJobMeta(meta);
      setJobDescription(meta.jobDescription ?? "");
      if (saved && !autoStarted.current) {
        autoStarted.current = true;
        void analyze(saved, meta.jobDescription ?? "");
      }
    }
  }, [analyze]);

  async function handleFile(file: File) {
    try {
      const text = await extractResumeText(file);
      setResumeText(text);
      setFileName(file.name);
      toast.success("Resume loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  return (
    <Page
      title="Tailor Resume"
      intro="A recruiter-grade review of your resume against a specific job, then a rewrite that keeps every fact true."
    >
      {jobMeta && (
        <div className="card-brutal mb-6">
          <p className="label text-muted-foreground">TAILORING FOR</p>
          <p className="mt-1 font-bold">
            {jobMeta.title} — {jobMeta.company}
          </p>
          <p className="label mt-1 text-muted-foreground">{jobMeta.location}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="label mb-2">TARGET REGION</p>
          <select className="input-brutal" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="label mb-2">COMPANY PROFILE</p>
          <select
            className="input-brutal"
            value={companyProfile}
            onChange={(e) => setCompanyProfile(e.target.value)}
          >
            {PROFILES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex">
        {(["upload", "paste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn-brutal -ml-px ${tab === t ? "bg-foreground text-background" : ""}`}
          >
            <span className="relative z-10">{t === "upload" ? "UPLOAD FILE" : "PASTE TEXT"}</span>
          </button>
        ))}
      </div>

      <div className="card-brutal mt-6">
        {tab === "upload" ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 border border-dashed border-border p-10 text-center">
            <Upload className="h-6 w-6" />
            <span className="label">{fileName || "PDF, DOCX OR TXT · MAX 10MB"}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <textarea
            className="input-brutal h-56"
            placeholder="Paste your resume text here…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        )}

        <p className="label mb-2 mt-6">JOB DESCRIPTION (OPTIONAL — UNLOCKS JD FIT SCORE)</p>
        <textarea
          className="input-brutal h-40"
          placeholder="Paste the job description…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <button
          disabled={busy}
          className="btn-brutal mt-6 w-full disabled:opacity-60"
          onClick={() => analyze(resumeText, jobDescription)}
        >
          <span className="relative z-10 flex items-center gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "ANALYZING…" : "ANALYZE DOCUMENT"}
          </span>
          <span className="nav-fill" />
        </button>
      </div>
    </Page>
  );
}
