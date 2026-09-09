import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/recommendations", label: "JOB MATCH" },
  { to: "/saved-jobs", label: "SAVED JOBS" },
  { to: "/tailor-resume", label: "TAILOR RESUME" },
  { to: "/roadmap", label: "ROADMAP" },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border px-6 py-10 md:px-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="label">KAREER GUIDE — AI JOB SEARCH & CAREER ROADMAPS</p>
          <p className="label mt-2 text-muted-foreground">
            © {new Date().getFullYear()} KAREERGUIDE.IN · BUILT FOR STUDENTS & PROFESSIONALS
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="label text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
