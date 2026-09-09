import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Clock,
  Code2,
  Download,
  Layers,
  Loader2,
  Map,
  Target,
  Wrench,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Footer } from "@/components/Footer";
import { RoadmapIllustration } from "@/components/illustrations";
import { Nav } from "@/components/Nav";
import { DottedField } from "@/components/ui/dotted-field";
import { Reveal } from "@/components/Reveal";
import { seo } from "@/lib/seo";
import { generateRoadmap } from "@/lib/jobsy.functions";
import { downloadRoadmapPdf } from "@/lib/roadmapPdf";
import type { Difficulty, Roadmap } from "@/lib/types";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    seo({
      title: "Career Roadmap Generator",
      description:
        "Enter a target role and get a complete learning roadmap — market overview, prerequisites, and phases with topics, tools, real resources, projects and milestones. Download it as a PDF.",
      path: "/roadmap",
      keywords: [
        "career roadmap generator",
        "learning path",
        "free learning resources",
        "how to become a backend developer",
      ],
    }),
  component: RoadmapPage,
});

/** Quick-pick roles, so the empty input is never a blank page to stare at. */
const POPULAR_PROFESSIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "UI/UX Designer",
  "DevOps Engineer",
  "Product Manager",
  "Machine Learning Engineer",
  "Cybersecurity Analyst",
  "Mobile Developer",
  "Cloud Architect",
  "Full Stack Developer",
  "Business Analyst",
  "Blockchain Developer",
  "Game Developer",
  "Technical Writer",
  "QA Engineer",
] as const;

/** Difficulty reads at a glance, so it carries colour rather than just text. */
const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Beginner: "#2e9e6b",
  Intermediate: "#e0a100",
  Advanced: "#dd6a57",
};

function DifficultyPill({ level }: { level: Difficulty }) {
  return (
    <span
      className="label border px-2 py-1 text-[10px]"
      style={{ color: DIFFICULTY_STYLE[level], borderColor: DIFFICULTY_STYLE[level] }}
    >
      {level}
    </span>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: typeof BookOpen; children: string }) {
  return (
    <p className="label mt-6 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </p>
  );
}

function RoadmapPage() {
  const run = useServerFn(generateRoadmap);
  const [role, setRole] = useState("");
  const [background, setBackground] = useState("");
  const [showBackground, setShowBackground] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const [busy, setBusy] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const ready = role.trim().length >= 2;
  const allOpen = roadmap ? open.size === roadmap.phases.length : false;

  function togglePhase(i: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function submit() {
    if (!ready) {
      toast.error("Enter a target role");
      return;
    }
    setBusy(true);
    try {
      const result = await run({ data: { role, background } });
      if (!result.phases.length) throw new Error("Could not build a roadmap, try again");
      setRoadmap(result);
      // Only the first phase starts open: six expanded phases is a wall of text.
      setOpen(new Set([0]));
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <DottedField />
      <Nav />
      <main className="relative z-10 mx-auto w-full max-w-[60rem] px-6 pb-24 pt-28 md:pt-36">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Kareer Guide
        </Link>

        <div className="page-heading-art mt-8">
          <div className="page-heading-copy">
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">Know How to Start</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Enter your dream profession and get a comprehensive learning roadmap with topics,
              projects, tools, and resources.
            </p>
          </div>
          <div className="page-art">
            <RoadmapIllustration />
          </div>
        </div>

        <input
          className="input-brutal mt-10 px-5 py-4 text-base"
          placeholder="e.g. Data Scientist, UX Designer…"
          aria-label="Target profession"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) {
              e.preventDefault();
              void submit();
            }
          }}
        />

        <p className="label mt-8 text-muted-foreground">POPULAR PROFESSIONS</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_PROFESSIONS.map((p) => {
            const selected = role.trim().toLowerCase() === p.toLowerCase();
            return (
              <button
                key={p}
                type="button"
                onClick={() => setRole(p)}
                aria-pressed={selected}
                className={`border border-border px-4 py-2.5 text-sm transition-colors ${
                  selected
                    ? "bg-foreground font-bold text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Optional context, hidden by default so it never competes with the
            one question this page is really asking. */}
        <button
          type="button"
          onClick={() => setShowBackground((v) => !v)}
          aria-expanded={showBackground}
          className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showBackground ? "rotate-180" : ""}`}
          />
          Add your background for a more personal roadmap (optional)
        </button>
        {showBackground && (
          <textarea
            className="input-brutal mt-3 h-24"
            placeholder="Final year B.Com student, knows Excel basics…"
            aria-label="Your background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        )}

        <button
          type="button"
          disabled={busy || !ready}
          onClick={submit}
          className="btn-brutal mt-10 w-full py-5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center gap-3 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
            {busy ? "BUILDING YOUR ROADMAP…" : "GENERATE ROADMAP"}
          </span>
          {ready && !busy && <span className="nav-fill" />}
        </button>

        {roadmap && (
          <div ref={resultsRef} className="mt-16 scroll-mt-28">
            {/* Overview */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">{roadmap.role}</h2>
              <button className="btn-brutal" onClick={() => downloadRoadmapPdf(roadmap)}>
                <span className="relative z-10 flex items-center gap-2">
                  <Download className="h-3 w-3" /> DOWNLOAD PDF
                </span>
                <span className="nav-fill" />
              </button>
            </div>

            {roadmap.overview && (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {roadmap.overview}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-6">
              {roadmap.totalDuration && (
                <span className="label flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {roadmap.totalDuration}
                </span>
              )}
              <span className="label flex items-center gap-2 text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> {roadmap.phases.length} PHASES
              </span>
            </div>

            {roadmap.prerequisites.length > 0 && (
              <div className="card-brutal mt-8">
                <p className="label">PREREQUISITES</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {roadmap.prerequisites.map((pre, k) => (
                    <li key={`${k}-${pre}`}>· {pre}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                className="label text-muted-foreground transition-colors hover:text-foreground"
                onClick={() =>
                  setOpen(allOpen ? new Set() : new Set(roadmap.phases.map((_, i) => i)))
                }
              >
                {allOpen ? "COLLAPSE ALL" : "EXPAND ALL"}
              </button>
            </div>

            {/* Phase timeline */}
            <ol className="mt-3 space-y-px">
              {roadmap.phases.map((p, i) => {
                const isOpen = open.has(i);
                return (
                  <li key={`${i}-${p.phase}`}>
                    <Reveal delay={Math.min(i, 5) * 70} className="border border-border">
                      <button
                        className="flex w-full items-center gap-4 p-5 text-left"
                        onClick={() => togglePhase(i)}
                        aria-expanded={isOpen}
                      >
                        <span className="label shrink-0 text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-bold">{p.phase}</span>
                          <DifficultyPill level={p.difficulty} />
                        </span>
                        <span className="label ml-auto shrink-0 text-muted-foreground">
                          {p.duration}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-border p-6">
                          {p.description && (
                            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                              {p.description}
                            </p>
                          )}

                          {p.topics.length > 0 && (
                            <>
                              <SectionLabel icon={BookOpen}>TOPICS &amp; SKILLS</SectionLabel>
                              <ul className="mt-3 space-y-px border border-border bg-border">
                                {p.topics.map((t, k) => (
                                  <li key={`${k}-${t.name}`} className="bg-background p-4">
                                    <p className="text-sm font-bold">{t.name}</p>
                                    {t.detail && (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {t.detail}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {p.tools.length > 0 && (
                            <>
                              <SectionLabel icon={Wrench}>TOOLS &amp; TECHNOLOGIES</SectionLabel>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {p.tools.map((t, k) => (
                                  <span
                                    key={`${k}-${t}`}
                                    className="label border border-border px-3 py-1.5"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}

                          {p.resources.length > 0 && (
                            <>
                              <SectionLabel icon={BookOpen}>RECOMMENDED RESOURCES</SectionLabel>
                              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                {p.resources.map((r, k) => (
                                  <li key={`${k}-${r.title}`}>
                                    · {r.title}
                                    {r.author && ` by ${r.author}`}{" "}
                                    <span className="label" style={{ color: "var(--pink)" }}>
                                      [{r.type}]
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {p.projects.length > 0 && (
                            <>
                              <SectionLabel icon={Code2}>HANDS-ON PROJECTS</SectionLabel>
                              <ol className="mt-3 space-y-px border border-border bg-border">
                                {p.projects.map((proj, k) => (
                                  <li
                                    key={`${k}-${proj}`}
                                    className="flex gap-3 bg-background p-4 text-sm"
                                  >
                                    <span className="label shrink-0 text-muted-foreground">
                                      {k + 1}.
                                    </span>
                                    <span>{proj}</span>
                                  </li>
                                ))}
                              </ol>
                            </>
                          )}

                          {p.milestone && (
                            <div
                              className="mt-6 border-l-2 bg-muted p-4"
                              style={{ borderColor: "var(--pink)" }}
                            >
                              <p className="label flex items-center gap-2 text-muted-foreground">
                                <Target className="h-3.5 w-3.5" /> MILESTONE
                              </p>
                              <p className="mt-1 text-sm font-bold">{p.milestone}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
