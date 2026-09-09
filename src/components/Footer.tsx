import { Link } from "@tanstack/react-router";
const LINKS = [
  { to: "/recommendations", label: "Job match" },
  { to: "/tailor-resume", label: "Resume studio" },
  { to: "/roadmap", label: "Career roadmap" },
  { to: "/saved-jobs", label: "Saved jobs" },
] as const;
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="font-semibold">A clearer way forward.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kareer Guide
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="footer-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
