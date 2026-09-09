import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Check, FileCheck2, Route as RouteIcon, Target } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import GlyphPortal from "@/components/ui/glyph-portal";
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

/**
 * The three tools, rendered inside the portal's green interior. They are the
 * payoff for scrolling through the word, so they carry the real links rather
 * than repeating as a second card grid further down the page.
 */
const TOOLS = [
  {
    no: "01",
    to: "/roadmap",
    title: "Career roadmaps",
    copy: "A target role in, a phased learning path out — topics, projects, real resources, and a milestone that proves each phase is done.",
  },
  {
    no: "02",
    to: "/dream-job",
    title: "Dream job gap analysis",
    copy: "Benchmark what you have against the hiring bar at the company you actually want, then work the gap it finds.",
  },
  {
    no: "03",
    to: "/recommendations",
    title: "Live job match",
    copy: "Your resume read for skills, then matched against openings pulled live from a dozen boards.",
  },
] as const;

function Home() {
  return (
    <div className="site-shell">
      <Nav />
      <main id="main-content" tabIndex={-1}>
        <GlyphPortal
          className="portal-hero"
          word="KAREER"
          scrollLength={2.4}
          enterLabel="Show me the path"
          fontWeight={900}
          front={
            <>
              <p className="portal-eyebrow">You already know where you want to end up.</p>
              <p className="portal-support">This is the part in between.</p>
              <span className="portal-scroll">Free, no sign-up — scroll to begin ↓</span>
            </>
          }
        >
          <div className="portal-copy portal-on-field">
            <h1>
              A roadmap to the role, an honest read on the gap, and the jobs that are open right
              now.
            </h1>
            <div className="portal-features">
              {TOOLS.map((tool) => (
                <Link key={tool.no} to={tool.to} className="portal-feature portal-feature-link">
                  <h3>
                    <span className="portal-no">{tool.no}</span>
                    {tool.title}
                  </h3>
                  <p>{tool.copy}</p>
                  <span className="portal-feature-cta">
                    Open <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </GlyphPortal>

        <div className="home-main">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              <Link to="/tailor-resume" className="saved-strip">
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

              <Link to="/saved-jobs" className="saved-strip">
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
