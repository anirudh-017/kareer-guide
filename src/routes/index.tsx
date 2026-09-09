import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Briefcase,
  Check,
  CheckCircle2,
  Compass,
  FileCheck2,
  Globe2,
  Route as RouteIcon,
  Sparkles,
  Target,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { CollaborationIllustration } from "@/components/illustrations";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Kareer Guide - AI Job Search, Dream Job & Career Roadmaps",
      description:
        "Step-by-step career roadmaps, dream company gap analysis, and live job matching. Built for students and professionals in India.",
      path: "/",
      keywords: [
        "ai career roadmap",
        "dream job gap analysis",
        "resume job match india",
        "internships india",
        "ats resume checker",
      ],
      bareTitle: true,
    }),
  component: Home,
});

const POPULAR_ROLES = [
  "Frontend",
  "Full Stack",
  "AI / ML",
  "DevOps",
  "Data Science",
  "Product Manager",
];

function Home() {
  const handleCardMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  const handleCardLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--mouse-x", "-999px");
    e.currentTarget.style.setProperty("--mouse-y", "-999px");
  };

  return (
    <div className="site-shell">
      <Nav />
      <main id="main-content" className="home-main" tabIndex={-1}>
        {/* Intro Banner */}
        <section className="home-intro page-enter" aria-labelledby="home-title">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-icon">
                <Compass size={14} aria-hidden="true" />
              </span>
              AI Career Platform
            </p>
            <h1 id="home-title">
              Clear direction.
              <br />
              <span className="headline-secondary">For your career.</span>
            </h1>
          </div>
          <div className="home-intro-aside">
            <CollaborationIllustration className="home-hero-art" />
            <p>Structured roadmaps, company benchmarks, and live job matching.</p>
            <div className="intro-meta">
              <Globe2 size={15} aria-hidden="true" />
              <span>Built for India • Free • Zero Sign-up</span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CARDS: ROADMAP (PRIMARY) + DREAM JOB + JOB MATCH                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Career tools" className="tool-grid">
          {/* 01: CAREER ROADMAP - PRIMARY HERO FUNCTION */}
          <Link
            to="/roadmap"
            className="tool-card tool-roadmap page-enter"
            onPointerMove={handleCardMove}
            onPointerLeave={handleCardLeave}
          >
            <div className="tool-topline">
              <span className="tool-tag">
                <Sparkles size={14} aria-hidden="true" />
                Step-by-Step
              </span>
              <span className="tool-number">01 / ROADMAP</span>
            </div>

            <div className="match-heading">
              <h2>
                AI Career
                <br />
                Roadmaps.
              </h2>
              <div className="tool-icon match-icon">
                <RouteIcon strokeWidth={1.5} aria-hidden="true" />
              </div>
            </div>

            <p className="tool-description">
              Curated learning paths, milestone projects, and exportable PDF roadmaps for any target
              role.
            </p>

            {/* Quick role pills */}
            <div className="role-pills">
              {POPULAR_ROLES.map((r) => (
                <span key={r} className="role-pill">
                  {r}
                </span>
              ))}
            </div>

            <div className="feature-bullets">
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Free courses & official documentation</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Portfolio milestone projects</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Instant PDF progress export</span>
              </div>
            </div>

            <div className="tool-bottom">
              <span className="card-cta">
                Build roadmap <ArrowUpRight size={20} aria-hidden="true" />
              </span>
              <span className="tool-hint">Free • All Levels</span>
            </div>
          </Link>

          {/* 02: DREAM JOB GAP ANALYSIS */}
          <Link
            to="/dream-job"
            className="tool-card tool-dream page-enter"
            onPointerMove={handleCardMove}
            onPointerLeave={handleCardLeave}
          >
            <div className="tool-topline">
              <span className="tool-tag">
                <Target size={14} aria-hidden="true" />
                Benchmark
              </span>
              <span className="tool-number">02 / DREAM JOB</span>
            </div>

            <div>
              <h2>
                Target companies.
                <br />
                Bridge the gap.
              </h2>
              <p className="tool-description">
                Benchmark your skills directly against hiring bars at 50+ top tech companies.
              </p>
            </div>

            <div className="feature-bullets">
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>50+ top company hiring profiles</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Instant skill gap analysis</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>30-60-90 day action plan</span>
              </div>
            </div>

            <div className="tool-bottom">
              <span className="text-cta">Check eligibility</span>
              <span className="card-arrow">
                <ArrowUpRight size={21} aria-hidden="true" />
              </span>
            </div>
          </Link>

          {/* 03: LIVE JOB MATCH */}
          <Link
            to="/recommendations"
            className="tool-card tool-match page-enter"
            onPointerMove={handleCardMove}
            onPointerLeave={handleCardLeave}
          >
            <div className="tool-topline">
              <span className="tool-tag">
                <Briefcase size={14} aria-hidden="true" />
                Live Openings
              </span>
              <span className="tool-number">03 / LIVE MATCH</span>
            </div>

            <div>
              <h2>
                Match skills.
                <br />
                Zero ghost jobs.
              </h2>
              <p className="tool-description">
                Scan 13+ verified job boards for live postings matched to your resume or skills.
              </p>
            </div>

            <div className="feature-bullets">
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>13+ verified job boards</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Postings under 10 days active</span>
              </div>
              <div className="feature-bullet">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Deep semantic relevance match</span>
              </div>
            </div>

            <div className="tool-bottom">
              <span className="text-cta">Find matching jobs</span>
              <span className="card-arrow">
                <ArrowUpRight size={21} aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* RESUME STUDIO & SAVED JOBS FEATURE STRIPS                        */}
        {/* ---------------------------------------------------------------- */}
        <Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Resume Studio Banner */}
            <Link
              to="/tailor-resume"
              className="saved-strip"
              onPointerMove={handleCardMove}
              onPointerLeave={handleCardLeave}
            >
              <span className="saved-icon">
                <FileCheck2 size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <h2>ATS Resume Studio</h2>
                <p>Pinpoint keyword gaps and optimize bullets for target job descriptions.</p>
              </div>
              <span className="inline-link">
                Tailor resume <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>

            {/* Saved Jobs Banner */}
            <Link
              to="/saved-jobs"
              className="saved-strip"
              onPointerMove={handleCardMove}
              onPointerLeave={handleCardLeave}
            >
              <span className="saved-icon">
                <Bookmark size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <h2>Saved Items</h2>
                <p>Access your bookmarked openings, company checks, and learning roadmaps.</p>
              </div>
              <span className="inline-link">
                View saved <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </div>
        </Reveal>

        {/* Core Principles */}
        <Reveal className="approach-section">
          <div className="section-caption">
            <span className="eyebrow">Focused. Fast. Private.</span>
            <span className="section-line" />
          </div>
          <div className="principles-grid">
            <div>
              <RouteIcon size={23} strokeWidth={1.4} aria-hidden="true" />
              <h2>Structured Roadmaps</h2>
              <p>Step-by-step milestone curriculum with curated, paywall-free resources.</p>
            </div>
            <div>
              <Target size={23} strokeWidth={1.4} aria-hidden="true" />
              <h2>Hiring Bar Benchmarks</h2>
              <p>
                Calibrated against actual role requirements from leading tech engineering teams.
              </p>
            </div>
            <div>
              <Check size={23} strokeWidth={1.4} aria-hidden="true" />
              <h2>Zero Sign-Up</h2>
              <p>100% free and private. No accounts, passwords, or data tracking required.</p>
            </div>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
