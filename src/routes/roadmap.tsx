import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/Page";
import { seo } from "@/lib/seo";
import { generateRoadmap } from "@/lib/jobsy.functions";
import type { RoadmapPhase } from "@/lib/types";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    seo({
      title: "Career Roadmap Generator",
      description:
        "Enter a target role and get a free 6-8 phase career roadmap with skills, free resources, projects and milestones. Download it as a PDF.",
      path: "/roadmap",
      keywords: [
        "career roadmap generator",
        "learning path",
        "free learning resources",
        "how to become a data analyst",
      ],
    }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const run = useServerFn(generateRoadmap);
  const [role, setRole] = useState("");
  const [background, setBackground] = useState("");
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (role.trim().length < 2) {
      toast.error("Enter a target role");
      return;
    }
    setBusy(true);
    try {
      const { phases } = await run({ data: { role, background } });
      if (!phases.length) throw new Error("Could not build a roadmap, try again");
      setPhases(phases);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth() - 80;
    let y = 60;
    const line = (text: string, size: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const l of doc.splitTextToSize(text, width) as string[]) {
        if (y > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          y = 60;
        }
        doc.text(l, 40, y);
        y += size + 5;
      }
    };
    line(`Career Roadmap: ${role}`, 18, true);
    y += 8;
    phases.forEach((p, i) => {
      y += 10;
      line(`Phase ${i + 1}: ${p.phase} (${p.duration})`, 13, true);
      line(`Skills: ${(p.skills ?? []).join(", ")}`, 10);
      line(`Resources: ${(p.resources ?? []).join(", ")}`, 10);
      line(`Projects: ${(p.projects ?? []).join(", ")}`, 10);
      line(`Milestones: ${(p.milestones ?? []).join(", ")}`, 10);
    });
    doc.save(`kareer-guide-roadmap-${role.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  }

  return (
    <Page
      title="Career Roadmap"
      intro="Tell us the role you want. We'll break the path into phases with skills, free resources, projects and milestones."
    >
      <div className="card-brutal">
        <p className="label mb-2">TARGET ROLE</p>
        <input
          className="input-brutal"
          placeholder="Data Analyst, Frontend Engineer, Product Manager…"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <p className="label mb-2 mt-4">YOUR BACKGROUND (OPTIONAL)</p>
        <textarea
          className="input-brutal h-24"
          placeholder="Final year B.Com student, knows Excel basics…"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
        />
        <button
          disabled={busy}
          className="btn-brutal mt-6 w-full disabled:opacity-60"
          onClick={submit}
        >
          <span className="relative z-10 flex items-center gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "BUILDING YOUR ROADMAP…" : "GENERATE ROADMAP"}
          </span>
          <span className="nav-fill" />
        </button>
      </div>

      {phases.length > 0 && (
        <>
          <button className="btn-brutal mt-8" onClick={downloadPdf}>
            <span className="relative z-10 flex items-center gap-2">
              <Download className="h-3 w-3" /> DOWNLOAD PDF
            </span>
            <span className="nav-fill" />
          </button>
          <div className="mt-6 border border-border">
            {phases.map((p, i) => (
              <section key={i} className="-mt-px border-t border-border p-6">
                <p className="label text-muted-foreground">
                  PHASE {i + 1} · {p.duration}
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">{p.phase}</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-4">
                  {[
                    ["SKILLS", p.skills],
                    ["FREE RESOURCES", p.resources],
                    ["PROJECTS", p.projects],
                    ["MILESTONES", p.milestones],
                  ].map(([h, items]) => (
                    <div key={h as string}>
                      <p className="label">{h as string}</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {((items as string[]) ?? []).map((it, k) => (
                          <li key={k}>· {it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
