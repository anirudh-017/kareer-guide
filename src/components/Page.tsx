import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export function Page({
  title,
  intro,
  art,
  children,
}: {
  title: string;
  intro?: string;
  /**
   * Decorative illustration for the page header. Purely atmospheric — it is
   * hidden from assistive tech and dropped entirely on narrow screens, so the
   * heading must still say everything the page is about on its own.
   */
  art?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="site-shell">
      <Nav />
      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link to="/">Workspace</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>
        <header className={`page-heading page-enter${art ? " page-heading-art" : ""}`}>
          <div className="page-heading-copy">
            <p className="eyebrow">A step toward what’s next</p>
            <h1>{title}</h1>
            {intro && <p className="page-intro">{intro}</p>}
          </div>
          {art && <div className="page-art">{art}</div>}
        </header>
        <div className="page-content page-enter">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
