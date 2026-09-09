import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Page";
import { ScoreCard } from "@/components/ScoreCard";
import { seo } from "@/lib/seo";
import { SK, readJson } from "@/lib/session";

export const Route = createFileRoute("/tailored-resume")({
  head: () =>
    seo({
      title: "Your Tailored Resume",
      description:
        "Download your ATS-ready tailored resume as text or PDF and apply to the exact job it was written for.",
      path: "/tailored-resume",
      keywords: ["tailored resume download", "ats ready resume", "resume pdf export"],
    }),
  component: TailoredResume,
});

type Result = {
  tailoredResume: string;
  score: number;
  fitScore: number;
  job?: { title?: string; company?: string; applyLink?: string } | null;
};

function TailoredResume() {
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    setR(readJson<Result>(SK.tailored));
  }, []);

  function downloadTxt() {
    if (!r) return;
    const blob = new Blob([r.tailoredResume], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tailored-resume.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadPdf() {
    if (!r) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth() - 80;
    let y = 55;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    for (const raw of r.tailoredResume.split("\n")) {
      for (const l of doc.splitTextToSize(raw || " ", width) as string[]) {
        if (y > doc.internal.pageSize.getHeight() - 45) {
          doc.addPage();
          y = 55;
        }
        doc.text(l, 40, y);
        y += 15;
      }
    }
    doc.save("tailored-resume.pdf");
  }

  if (!r)
    return (
      <Page title="Tailored Resume">
        <p className="text-sm text-muted-foreground">
          Nothing here yet — start from Tailor Resume.
        </p>
      </Page>
    );

  return (
    <Page title="Tailored Resume" intro="Rewritten for the role, scored, and ready to send.">
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard label="RESUME SCORE" value={r.score} />
        <ScoreCard label="JD FIT SCORE" value={r.fitScore} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-brutal" onClick={downloadTxt}>
          <span className="relative z-10 flex items-center gap-2">
            <Download className="h-3 w-3" /> DOWNLOAD .TXT
          </span>
          <span className="nav-fill" />
        </button>
        <button className="btn-brutal -ml-px" onClick={downloadPdf}>
          <span className="relative z-10 flex items-center gap-2">
            <Download className="h-3 w-3" /> DOWNLOAD PDF
          </span>
          <span className="nav-fill" />
        </button>
        {r.job?.applyLink && (
          <a href={r.job.applyLink} target="_blank" rel="noreferrer" className="btn-brutal -ml-px">
            <span className="relative z-10 flex items-center gap-2">
              APPLY TO {(r.job.company ?? "THIS JOB").toUpperCase()}{" "}
              <ExternalLink className="h-3 w-3" />
            </span>
            <span className="nav-fill" />
          </a>
        )}
      </div>

      <pre className="card-brutal mt-6 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
        {r.tailoredResume}
      </pre>
    </Page>
  );
}
