import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { tailorAnalyze } from "@/lib/jobsy.functions";
import { extractResumeText } from "@/lib/resumeParse";
import { SK, clear, readJson, writeJson, type TailorHandoff } from "@/lib/session";

export const Route = createFileRoute("/tailor-resume")({
  head: () =>
    seo({
      title: "Tailor Your Resume to Any Job",
      description:
        "Upload your resume, paste a job description, and get a recruiter-grade review plus a rewritten, ATS-ready resume.",
      path: "/tailor-resume",
      keywords: [
        "resume tailoring",
        "ats resume optimizer",
        "job description match",
        "resume rewrite ai",
      ],
    }),
  component: TailorResume,
});

const REGIONS = [
  "🌍 Global",
  "🇮🇳 India",
  "🇺🇸 United States",
  "🇬🇧 United Kingdom",
  "🇨🇦 Canada",
  "🇦🇺 Australia",
  "🇩🇪 Germany",
  "🇫🇷 France",
  "🇳🇱 Netherlands",
  "🇮🇪 Ireland",
  "🇸🇬 Singapore",
  "🇦🇪 UAE",
  "🇸🇦 Saudi Arabia",
  "🇶🇦 Qatar",
  "🇯🇵 Japan",
  "🇰🇷 South Korea",
  "🇨🇳 China",
  "🇭🇰 Hong Kong",
  "🇳🇿 New Zealand",
  "🇿🇦 South Africa",
  "🇧🇷 Brazil",
  "🇲🇽 Mexico",
  "🇦🇷 Argentina",
  "🇪🇸 Spain",
  "🇮🇹 Italy",
  "🇸🇪 Sweden",
  "🇳🇴 Norway",
  "🇩🇰 Denmark",
  "🇫🇮 Finland",
  "🇵🇱 Poland",
  "🇨🇭 Switzerland",
  "🇦🇹 Austria",
  "🇧🇪 Belgium",
  "🇵🇹 Portugal",
  "🇲🇾 Malaysia",
] as const;

const PROFILES = [
  "Standard Professional",
  "Large MNC / Fortune 500",
  "Vendor / Staffing",
  "Implementation Partner",
  "Startup",
  "Public Sector",
  "Others",
] as const;

function TailorResume() {
  const navigate = useNavigate();
  const run = useServerFn(tailorAnalyze);

  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [region, setRegion] = useState<string>(REGIONS[1]);
  const [companyProfile, setCompanyProfile] = useState<string>(PROFILES[0]);
  const [jobMeta, setJobMeta] = useState<TailorHandoff | null>(null);
  const [busy, setBusy] = useState(false);
  const autoStarted = useRef(false);

  const analyze = useCallback(
    async (text: string, jd: string, job: TailorHandoff | null) => {
      if (text.trim().length < 50) {
        toast.error("Add your resume first");
        return;
      }
      setBusy(true);
      try {
        const analysis = await run({
          data: {
            resumeText: text,
            ...(jd ? { jobDescription: jd } : {}),
            region,
            companyProfile,
          },
        });
        sessionStorage.setItem(SK.resumeText, text);
        sessionStorage.setItem(SK.jd, jd);
        sessionStorage.setItem(SK.region, region);
        sessionStorage.setItem(SK.profile, companyProfile);
        sessionStorage.setItem(SK.analysis, JSON.stringify(analysis));
        // The job this analysis belongs to, carried forward so /resume-analysis
        // can attach the finished resume back to the saved-job record.
        if (job) writeJson(SK.tailorContext, job);
        else clear(SK.tailorContext);
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
    const saved = sessionStorage.getItem(SK.resumeText) ?? "";
    if (saved) {
      setResumeText(saved);
      setTab("paste");
    }

    const meta = readJson<TailorHandoff>(SK.tailorJob);
    if (!meta) return;
    // One-shot hand-off from /jobs or /saved-jobs. Consume it immediately so a
    // later visit from the nav starts clean instead of re-analysing a stale job.
    clear(SK.tailorJob);
    setJobMeta(meta);
    setJobDescription(meta.jobDescription ?? "");
    if (saved && !autoStarted.current) {
      autoStarted.current = true;
      void analyze(saved, meta.jobDescription ?? "", meta);
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
          <select
            className="input-brutal"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
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
          onClick={() => analyze(resumeText, jobDescription, jobMeta)}
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
