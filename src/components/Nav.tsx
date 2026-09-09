import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LINKS = [
  { to: "/", label: "KAREER GUIDE" },
  { to: "/recommendations", label: "JOB MATCH" },
  { to: "/saved-jobs", label: "SAVED JOBS" },
  { to: "/tailor-resume", label: "TAILOR RESUME" },
  { to: "/roadmap", label: "ROADMAP" },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kg-theme", next ? "dark" : "light");
  };

  return (
    <button onClick={toggle} className="nav-box" aria-label="Toggle dark mode">
      <span className="nav-fill" />
      <span className="relative z-10 flex items-center">
        {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function NavInner() {
  const [open, setOpen] = useState(false);

  // A full-screen overlay that traps neither Escape nor the page scroll feels
  // broken on mobile — you can scroll the page behind it and have no key out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed left-4 top-4 z-50 hidden md:left-8 md:top-8 md:flex"
      >
        <ThemeToggle />
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="nav-box -ml-px">
            <span className="nav-fill" />
            <span className="relative z-10">{l.label}</span>
          </Link>
        ))}
      </nav>

      <div className="fixed left-4 top-4 z-50 flex md:hidden">
        <ThemeToggle />
        <button
          className="nav-box -ml-px"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className="nav-fill" />
          <span className="relative z-10">MENU</span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[60] flex flex-col items-start justify-center gap-2 bg-background px-6"
        >
          <button
            className="nav-box absolute right-4 top-4"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <span className="relative z-10">CLOSE</span>
          </button>
          {LINKS.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="menu-item text-3xl font-bold tracking-tight"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function Nav() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // There is no document.body to portal into during SSR. Rendering the nav in
  // place instead of null keeps every internal link in the server HTML — which
  // is what crawlers follow — and the first client render matches it exactly,
  // so hydration stays clean. Once mounted we hand off to the portal.
  if (!mounted) return <NavInner />;
  return createPortal(<NavInner />, document.body);
}
