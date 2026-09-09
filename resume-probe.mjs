const RESUME = `PRIYA SHARMA
Pune, Maharashtra | priya.sharma@example.com | +91 98765 43210

SUMMARY
B.Com graduate moving into data analytics. Comfortable with Excel and learning SQL.

EXPERIENCE
Accounts Assistant, Kanyakumari Traders, Pune — Jun 2024 to present
- Handled monthly reconciliation of vendor invoices in Excel.
- Made reports for the manager every week.
- Was responsible for filing GST returns on time.

Intern, Shree Logistics, Pune — Jan 2024 to May 2024
- Helped the finance team with data entry.
- Made a dashboard in Excel for shipment tracking.

EDUCATION
B.Com, Savitribai Phule Pune University, 2024

SKILLS
Excel, Tally, GST filing, basic SQL, communication, MS Word`;

const JD = `Data Analyst - Fintech, Bengaluru
We need a data analyst to own reporting for our lending product. You will write SQL
against Postgres, build dashboards in Power BI, run cohort and funnel analysis, and
partner with product managers. Requirements: 0-2 years experience, strong SQL,
Excel, Python (pandas) a plus, and clear written communication.`;

const post = async (name, args) => {
  const t0 = Date.now();
  const res = await fetch("http://localhost:8080/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e6),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const raw = await res.text();
  const ms = Date.now() - t0;
  const payload = JSON.parse(raw.split("data: ")[1]);
  if (payload.error) {
    console.log(`${name}: ERROR after ${ms}ms ->`, JSON.stringify(payload.error).slice(0, 300));
    return null;
  }
  return { ms, result: payload.result };
};

const r = await post("analyze_resume_for_job", {
  resumeText: RESUME,
  jobDescription: JD,
  region: "India",
  companyProfile: "Startup",
});
if (r) {
  const a = r.result.structuredContent;
  console.log(`analyze_resume_for_job OK in ${r.ms}ms`);
  console.log("  score:", a.score, "| fitScore:", a.fitScore);
  console.log(
    "  signals:",
    a.atsFit.length + a.reviewerLens.length + a.executiveClarity.length,
    "(spec wants 15)",
  );
  console.log("  missingKeywords:", a.missingKeywords.join(", "));
  console.log("  redFlags:", a.redFlags.length, "| priorityFixes:", a.priorityFixes.length);
  console.log("  bulletRewrites:", a.bulletRewrites.length);
  console.log("  sample rewrite ->", (a.bulletRewrites[0]?.after ?? "").slice(0, 160));
  console.log("  summaryRewrite:", (a.summaryRewrite ?? "").slice(0, 140));
}
