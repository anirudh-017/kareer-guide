import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { DottedField } from "./ui/dotted-field";
import { Reveal } from "./ui/reveal";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

/**
 * The shell every inner page sits in.
 *
 * Carries the editorial treatment set by the hero and the roadmap page: dotted
 * backdrop, a back link, a title-case heading that rises in on load, and
 * content that reveals as it is scrolled to. Changing it here keeps all the
 * inner pages in step rather than each drifting on its own.
 */
export function Page({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <DottedField />
      <Nav />
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28 md:px-12 md:pt-36">
        <Link
          to="/"
          className="rise inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Kareer Guide
        </Link>

        <h1
          className="rise mt-8 text-4xl font-black tracking-tight md:text-5xl"
          style={{ animationDelay: "60ms" }}
        >
          {title}
        </h1>

        {intro && (
          <p
            className="rise mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground"
            style={{ animationDelay: "140ms" }}
          >
            {intro}
          </p>
        )}

        <Reveal className="mt-10">{children}</Reveal>
      </main>
      <Footer />
    </div>
  );
}
