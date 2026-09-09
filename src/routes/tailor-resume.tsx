import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ResumeIllustration } from "@/components/illustrations";
import { Page } from "@/components/Page";
import { ResumeUpload } from "@/components/ResumeUpload";
import { WorkflowAside } from "@/components/WorkflowAside";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [reading, setReading] = useState(false);
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
    setReading(true);
    setResumeText("");
    setFileName("");
    try {
      const text = await extractResumeText(file);
      if (text.length < 50) throw new Error("Could not read enough text from that file");
      setResumeText(text);
      setFileName(file.name);
      toast.success("Resume loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    } finally {
      setReading(false);
    }
  }

  return (
    <Page
      art={<ResumeIllustration />}
      title="Your resume, refined."
      intro="A focused review for the role you want. Bring out your strengths, improve the fit, and keep every fact true."
    >
      {jobMeta && (
        <div className="card-brutal mb-6">
          <p className="eyebrow">Tailoring for</p>
          <p className="mt-2 text-lg font-semibold">
            {jobMeta.title} · {jobMeta.company}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{jobMeta.location}</p>
        </div>
      )}
      <div className="form-layout">
        <form
          className="card-brutal"
          onSubmit={(event) => {
            event.preventDefault();
            void analyze(resumeText, jobDescription, jobMeta);
          }}
          aria-busy={busy || reading}
        >
          <fieldset disabled={busy || reading} className="min-w-0">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="tailor-region" className="field-label">
                  Target region
                </label>
                <select
                  id="tailor-region"
                  className="input-brutal"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                >
                  {REGIONS.map((region) => (
                    <option key={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tailor-profile" className="field-label">
                  Company profile
                </label>
                <select
                  id="tailor-profile"
                  className="input-brutal"
                  value={companyProfile}
                  onChange={(event) => setCompanyProfile(event.target.value)}
                >
                  {PROFILES.map((profile) => (
                    <option key={profile}>{profile}</option>
                  ))}
                </select>
              </div>
            </div>
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as "upload" | "paste")}
              className="mt-6"
            >
              <TabsList className="form-tabs" aria-label="Resume input">
                <TabsTrigger value="upload">Upload file</TabsTrigger>
                <TabsTrigger value="paste">Paste text</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-5">
                <ResumeUpload
                  fileName={fileName}
                  reading={reading}
                  disabled={busy}
                  onFile={handleFile}
                />
              </TabsContent>
              <TabsContent value="paste" className="mt-5">
                <label htmlFor="resume-text" className="field-label">
                  Your resume
                </label>
                <textarea
                  id="resume-text"
                  className="input-brutal min-h-56"
                  placeholder="Paste your resume text here…"
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                />
              </TabsContent>
            </Tabs>
            <label htmlFor="job-description" className="field-label mt-6">
              Job description <span>(optional)</span>
            </label>
            <textarea
              id="job-description"
              className="input-brutal min-h-40"
              placeholder="Paste the job description you want to tailor your resume to…"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              aria-describedby="jd-help"
            />
            <p id="jd-help" className="mt-2 text-sm text-muted-foreground">
              Add a job description to see how closely your resume fits.
            </p>
          </fieldset>
          <button type="submit" disabled={busy || reading} className="btn-brutal mt-6 w-full">
            <span className="relative z-10 flex items-center gap-2">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {busy ? "Reviewing your resume…" : "Review my resume"}
            </span>
            <span className="nav-fill" />
          </button>
          <div role="status" aria-live="polite">
            {(busy || reading) && (
              <p className="status-message">
                {reading
                  ? "Reading your file…"
                  : "Checking your experience, keywords, and fit. This may take a minute."}
              </p>
            )}
          </div>
        </form>
        <WorkflowAside
          title="Your story. Sharper focus."
          steps={[
            "Upload your resume and add the role you’re aiming for.",
            "Review your score, hiring signals, and suggested edits.",
            "Approve the changes and download your tailored resume.",
          ]}
          note="Your resume text and job description are sent for AI analysis when you request a review."
        />
      </div>
    </Page>
  );
}
