import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/Page";

export const Route = createFileRoute("/tailored-resume")({
  head: () => ({
    meta: [
      { title: "Your Tailored Resume | Kareer Guide" },
      {
        name: "description",
        content: "Download your ATS-ready tailored resume as text or PDF and apply to the exact job it was written for.",
      },
      { property: "og:title", content: "Your Tailored Resume | Kareer Guide" },
      { property: "og:description", content: "ATS-ready resume, scored and ready to download." },
      { property: "og:url", content: "/tailored-resume" },
    ],
    links: [{ rel: "canonical", href: "/tailored-resume" }],
  }),
  component: TailoredResume,
});

type Result = {
  tailoredResume: string;
  score: number;
  fitScore: number;
  job?: { title?: string; company?: string; applyLink?: string } | null;
};

function Badge({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#16a34a" : value >= 60 ? "#ca8a04" : "#dc2626";
  return (
    <div className="bg-background p-6">
      <p className="label text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function TailoredResume() {
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("kg.tailored");
    if (raw) setR(JSON.parse(raw) as Result);
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
        <p className="text-sm text-muted-foreground">Nothing here yet — start from Tailor Resume.</p>
      </Page>
    );

  return (
    <Page title="Tailored Resume" intro="Rewritten for the role, scored, and ready to send.">
      <div className="grid gap-px border border-border bg-border md:grid-cols-2">
        <Badge label="RESUME SCORE" value={r.score} />
        <Badge label="JD FIT SCORE" value={r.fitScore} />
      </div>

      <div className="mt-6 flex flex-wrap gap-px">
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
              APPLY TO {(r.job.company ?? "THIS JOB").toUpperCase()} <ExternalLink className="h-3 w-3" />
            </span>
            <span className="nav-fill" />
          </a>
        )}
      </div>

      <pre className="card-brutal mt-6 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
        {r.tailoredResume}
      </pre>
    </Page>
  );
}
