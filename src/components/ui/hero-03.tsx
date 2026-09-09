import { Link } from "@tanstack/react-router";
import { Briefcase, Map, Target } from "lucide-react";

import { DottedField } from "@/components/ui/dotted-field";
import { Separator } from "@/components/ui/separator";

/**
 * Editorial hero: oversized light type, a dotted backdrop, and small columns of
 * micro-copy set against the headline.
 *
 * Adapted from the 21st.dev `hero-03` layout. The structure is kept — dotted
 * radial field, three headline rows with an icon standing in for a letter, the
 * separator/credit row, image card and the rotated side tab — but every string
 * is Kareer Guide's own, and the icon links go to real routes rather than the
 * original's dead `href="#"` anchors.
 */

const NAV = [
  { to: "/recommendations", label: "Job Match" },
  { to: "/dream-job", label: "Dream Job" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/tailor-resume", label: "Tailor Resume" },
  { to: "/saved-jobs", label: "Saved Jobs" },
] as const;

/** The corner cluster: the product's three entry points, not social handles. */
const ENTRY_POINTS = [
  { to: "/recommendations", label: "Job Match", icon: Briefcase },
  { to: "/dream-job", label: "Dream Job", icon: Target },
  { to: "/roadmap", label: "Roadmap", icon: Map },
] as const;

export function HeroSection03() {
  return (
    <div className="relative min-h-screen">
      <DottedField drift />

      {/* On mobile the fixed theme/MENU cluster sits at top-4 left-4, so the
            wordmark starts below it rather than underneath it. */}
      <header className="rise relative flex items-center justify-between px-6 pt-16 md:px-8 md:pt-6">
        <Link to="/" className="text-2xl font-bold italic">
          kareerguide.in
        </Link>
        <nav aria-label="Primary" className="hidden gap-6 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground transition-opacity hover:opacity-60"
              activeProps={{ className: "font-semibold text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative pb-20 pt-20">
        <div className="relative flex w-full flex-col justify-center gap-2 px-6 md:items-center">
          <div className="rise items-center gap-6 md:flex" style={{ animationDelay: "80ms" }}>
            <p className="max-w-[220px] text-start text-xs leading-5 text-muted-foreground md:max-w-[180px] md:text-right md:text-sm">
              AI job matching, resume tailoring and career roadmaps. Built for India, ready for
              anywhere.
            </p>
            <h1 className="text-6xl font-light leading-none tracking-wider md:text-7xl xl:text-[10rem]">
              DREAM
            </h1>
          </div>

          <div className="rise items-center gap-6 md:flex" style={{ animationDelay: "200ms" }}>
            <h1 className="flex text-6xl font-light leading-none tracking-wider md:text-7xl xl:text-[10rem]">
              <span>J</span>
              <Target
                strokeWidth={1}
                className="size-14 text-primary md:size-18 lg:size-40"
                aria-hidden="true"
              />
              <span>BS</span>
            </h1>
            <p className="max-w-[250px] pt-8 text-xs leading-5 text-muted-foreground md:max-w-[180px] md:text-sm">
              Thirteen job boards, merged and de-duplicated. Nothing older than ten days.
            </p>
          </div>

          <div className="rise items-center gap-6 md:flex" style={{ animationDelay: "320ms" }}>
            <h1 className="text-6xl font-light leading-none tracking-wider md:flex md:text-7xl xl:text-[10rem]">
              <span>MADE</span>
              <span className="hidden lg:block" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="160"
                  height="160"
                  viewBox="0 0 24 24"
                  fill="var(--pink)"
                >
                  <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                </svg>
              </span>
              <span className="block lg:hidden" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="70"
                  height="70"
                  viewBox="0 0 24 24"
                  fill="var(--pink)"
                >
                  <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                </svg>
              </span>
              <span>REAL</span>
            </h1>
          </div>
        </div>

        <div
          className="rise mx-auto w-full max-w-7xl gap-3 px-6"
          style={{ animationDelay: "440ms" }}
        >
          <div className="grid items-center gap-3 md:mx-8 md:flex md:justify-end">
            <Separator className="mx-auto my-6 w-full max-w-3xl" />
            <div className="whitespace-nowrap text-xs md:text-sm">
              NO ACCOUNTS · NO PASSWORDS · FREE
            </div>
            <div className="flex w-full items-end gap-3">
              <span className="text-2xl font-thin md:text-4xl">CAREER</span>
              <span
                className="text-3xl font-bold italic md:text-5xl"
                style={{ color: "var(--pink)" }}
              >
                guide
              </span>
            </div>
          </div>
        </div>

        <div className="items-end gap-6 px-6 pt-12 md:flex md:px-20">
          <div className="mb-8 h-48 w-full max-w-84 overflow-hidden rounded-md border shadow-lg md:mb-0 md:w-84">
            <img
              src="/og-image.png"
              alt="Kareer Guide"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <p className="pt-8 text-xs leading-5 text-muted-foreground md:text-sm">
            Upload a resume or just type your skills. We read them properly, match them against live
            listings, rewrite your resume for the job you actually want, and map the exact path to
            get there.
          </p>
        </div>

        <div className="mt-10 flex justify-end gap-6 px-6 md:absolute md:bottom-8 md:right-12 md:mt-0 md:px-0">
          {ENTRY_POINTS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className="transition-opacity hover:opacity-60"
            >
              <Icon className="size-5" strokeWidth={1.5} />
            </Link>
          ))}
        </div>

        <div className="fixed right-0 top-1/2 z-20 hidden h-36 -translate-y-1/2 transform items-center md:flex">
          <div className="bg-foreground px-3 py-6 text-sm font-bold text-background">
            <span className="rotate-180 [writing-mode:vertical-rl]">Free To Use</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HeroSection03;
