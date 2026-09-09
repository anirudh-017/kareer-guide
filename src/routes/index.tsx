import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { HeroSection03 } from "@/components/ui/hero-03";
import { Reveal } from "@/components/ui/reveal";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Kareer Guide — AI Job Search & Career Roadmaps in India",
      description:
        "Upload your resume and get matched to live jobs and internships, tailor your resume to any job description, and follow an AI career roadmap. Built for India.",
      path: "/",
      keywords: [
        "ai job search india",
        "resume job match",
        "internships india",
        "career roadmap",
        "ats resume checker",
      ],
      bareTitle: true,
    }),
  component: Home,
});

const CTAS = [
  { to: "/recommendations", label: "KNOW WHICH JOB SUITS YOU BEST" },
  { to: "/roadmap", label: "KNOW HOW TO START LEARNING" },
  { to: "/tailor-resume", label: "TAILOR YOUR RESUME" },
] as const;

function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* The hero carries its own header, so Nav only supplies the mobile
          toggle and MENU overlay here. */}
      <Nav mobileOnly />
      <HeroSection03 />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 md:px-12">
        <div className="flex flex-col border-t border-border">
          {CTAS.map((c, i) => (
            <Reveal key={c.to} delay={i * 90}>
              <Link
                key={c.to}
                to={c.to}
                className="btn-brutal -mt-px justify-between border-x-0 px-0 py-6 text-left md:py-8"
              >
                <span className="relative z-10 flex w-full items-center justify-between px-2 md:px-4">
                  <span className="text-sm font-bold tracking-wider md:text-xl">{c.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 md:h-6 md:w-6" />
                </span>
                <span className="nav-fill" />
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-px border border-border bg-border md:grid-cols-3">
          {[
            [
              "13 JOB SOURCES",
              "LinkedIn, Internshala, Indeed, Adzuna, Remotive, WeWorkRemotely and more, merged and de-duplicated.",
            ],
            ["FRESH ONLY", "Postings older than 10 days are filtered out, newest first."],
            ["NO SIGN-UP", "No accounts, no passwords. Everything stays on your device."],
          ].map(([h, p], i) => (
            <Reveal key={h} delay={i * 110} className="bg-background">
              <div className="p-6">
                <p className="label">{h}</p>
                <p className="mt-3 text-sm text-muted-foreground">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
