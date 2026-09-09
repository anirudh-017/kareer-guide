import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Moon, Sun, Target } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LINKS = [
  { to: "/roadmap", label: "Career roadmap", detail: "Step-by-step path to your target role" },
  { to: "/dream-job", label: "Dream job", detail: "Target top companies & gap analysis" },
  { to: "/recommendations", label: "Job match", detail: "Live jobs & internships tailored to you" },
  { to: "/tailor-resume", label: "Resume studio", detail: "Tailor your resume for ATS success" },
  { to: "/saved-jobs", label: "Saved jobs", detail: "Keep your saved roles and plans" },
] as const;

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Kareer Guide home">
      <img
        src="/logo-icon.png"
        alt="Kareer Guide"
        width="36"
        height="36"
        className="brand-logo-img"
      />
      <span className="brand-name">
        Kareer<span className="brand-light">Guide</span>
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        document.documentElement.style.colorScheme = next ? "dark" : "light";
        setDark(next);
        try {
          localStorage.setItem("kg-theme", next ? "dark" : "light");
        } catch {
          /* The toggle still works with storage blocked. */
        }
      }}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = (to: string) =>
    pathname === to ||
    (to === "/roadmap" && pathname.startsWith("/roadmap")) ||
    (to === "/dream-job" && pathname.startsWith("/dream-job")) ||
    (to === "/recommendations" && pathname === "/jobs") ||
    (to === "/tailor-resume" && ["/resume-analysis", "/tailored-resume"].includes(pathname));
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Primary">
            {LINKS.map((link, index) => {
              const isFirstThree = index < 3;
              const isActive = active(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link ${isFirstThree ? "nav-link-trio" : ""}`}
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="theme-toggle mobile-menu-trigger"
                  aria-label="Open navigation"
                >
                  <Menu size={21} />
                </button>
              </SheetTrigger>
              <SheetContent className="mobile-menu w-[min(90vw,26rem)] sm:max-w-none">
                <SheetTitle className="mb-2 mt-8 text-2xl">Your next move.</SheetTitle>
                <SheetDescription>Choose where you want to begin.</SheetDescription>
                <nav aria-label="Mobile" className="mt-10 flex flex-col gap-2">
                  <Link to="/" onClick={() => setOpen(false)} className="mobile-nav-link">
                    Home <ArrowUpRight size={18} />
                  </Link>
                  {LINKS.map((link, index) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className="mobile-nav-link menu-item"
                      data-active={active(link.to)}
                      aria-current={active(link.to) ? "page" : undefined}
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <span>
                        {link.label}
                        <small>{link.detail}</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
