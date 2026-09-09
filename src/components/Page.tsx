import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Nav } from "./Nav";

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
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 pb-16 pt-28 md:px-12 md:pt-36">
        <h1 className="text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
