/**
 * Curated company + role data for the Dream Job wizard.
 *
 * Careers URLs are the companies' real, well-known career portals — used as the
 * fallback "View Official Careers" target when no live listing could be
 * verified. Aliases let "goog", "FAANG search" etc. still find the company.
 * Skills hints feed the wizard's quick-add chips only; the AI analysis is what
 * actually decides requirements.
 */

export type DreamCompany = {
  name: string;
  careersUrl: string;
  careersName: string;
  aliases: string[];
  popular?: boolean;
};

export const POPULAR_COMPANIES: DreamCompany[] = [
  {
    name: "Google",
    careersUrl: "https://www.google.com/about/careers/applications/",
    careersName: "Google Careers",
    aliases: ["goog", "alphabet"],
    popular: true,
  },
  {
    name: "Microsoft",
    careersUrl: "https://careers.microsoft.com/",
    careersName: "Microsoft Careers",
    aliases: ["msft"],
    popular: true,
  },
  {
    name: "Amazon",
    careersUrl: "https://www.amazon.jobs/en/",
    careersName: "Amazon Jobs",
    aliases: ["aws", "amazn"],
    popular: true,
  },
  {
    name: "Apple",
    careersUrl: "https://jobs.apple.com/en-us/",
    careersName: "Apple Jobs",
    aliases: ["aapl"],
    popular: true,
  },
  {
    name: "Meta",
    careersUrl: "https://www.metacareers.com/",
    careersName: "Meta Careers",
    aliases: ["facebook", "fb", "instagram", "whatsapp"],
    popular: true,
  },
  {
    name: "NVIDIA",
    careersUrl: "https://www.nvidia.com/en-in/about-nvidia/careers/",
    careersName: "NVIDIA Careers",
    aliases: ["nvidia", "gpu"],
    popular: true,
  },
  {
    name: "Adobe",
    careersUrl: "https://careers.adobe.com/",
    careersName: "Adobe Careers",
    aliases: ["photoshop"],
    popular: true,
  },
  {
    name: "Netflix",
    careersUrl: "https://explore.jobs.netflix.net/",
    careersName: "Netflix Jobs",
    aliases: ["netflix"],
    popular: true,
  },
  {
    name: "OpenAI",
    careersUrl: "https://openai.com/careers/",
    careersName: "OpenAI Careers",
    aliases: ["chatgpt", "gpt"],
    popular: true,
  },
  {
    name: "IBM",
    careersUrl: "https://www.ibm.com/careers/",
    careersName: "IBM Careers",
    aliases: ["big blue"],
    popular: true,
  },
  {
    name: "Deloitte",
    careersUrl: "https://www.deloitte.com/global/en/careers.html",
    careersName: "Deloitte Careers",
    aliases: ["deloitte usi", "deloitte india"],
    popular: true,
  },
  {
    name: "TCS",
    careersUrl: "https://www.tcs.com/careers",
    careersName: "TCS Careers",
    aliases: ["tata consultancy", "tata consultancy services"],
    popular: true,
  },
  {
    name: "Infosys",
    careersUrl: "https://www.infosys.com/careers/",
    careersName: "Infosys Careers",
    aliases: ["infosys bpm"],
    popular: true,
  },
  {
    name: "Accenture",
    careersUrl: "https://www.accenture.com/in-en/careers",
    careersName: "Accenture Careers",
    aliases: ["accenture india"],
    popular: true,
  },
  {
    name: "Wipro",
    careersUrl: "https://careers.wipro.com/",
    careersName: "Wipro Careers",
    aliases: ["wipro"],
    popular: true,
  },
  {
    name: "Flipkart",
    careersUrl: "https://www.flipkartcareers.com/",
    careersName: "Flipkart Careers",
    aliases: ["flipkart"],
    popular: true,
  },
  {
    name: "Swiggy",
    careersUrl: "https://careers.swiggy.com/",
    careersName: "Swiggy Careers",
    aliases: ["swiggy"],
    popular: true,
  },
  {
    name: "Zomato",
    careersUrl: "https://www.zomato.com/careers",
    careersName: "Zomato Careers",
    aliases: ["zomato", "eternal"],
    popular: true,
  },
  {
    name: "Paytm",
    careersUrl: "https://paytm.com/careers",
    careersName: "Paytm Careers",
    aliases: ["paytm"],
    popular: true,
  },
  {
    name: "Razorpay",
    careersUrl: "https://razorpay.com/jobs/",
    careersName: "Razorpay Jobs",
    aliases: ["razorpay"],
    popular: true,
  },
];

/** For "I don't have a specific company" — role-focused analysis. */
export const NO_COMPANY: DreamCompany = {
  name: "",
  careersUrl: "",
  careersName: "",
  aliases: [],
};

export function findCompany(query: string): DreamCompany | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return POPULAR_COMPANIES.find(
    (c) => c.name.toLowerCase() === q || c.aliases.some((a) => q === a || q.includes(a)),
  );
}

export function searchCompanies(query: string): DreamCompany[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_COMPANIES.filter((c) => c.popular);
  const hits = POPULAR_COMPANIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.includes(q) || q.includes(a)),
  );
  return hits.length ? hits : POPULAR_COMPANIES.filter((c) => c.popular);
}

export type DreamRole = { name: string; aliases: string[] };

export const POPULAR_ROLES: DreamRole[] = [
  { name: "Software Engineer", aliases: ["sde", "software developer", "swe"] },
  { name: "Frontend Developer", aliases: ["front end", "ui developer", "react developer"] },
  { name: "Backend Developer", aliases: ["back end", "node developer", "api developer"] },
  { name: "Full Stack Developer", aliases: ["fullstack", "mern", "mean"] },
  { name: "Data Scientist", aliases: ["ds", "data science"] },
  { name: "Machine Learning Engineer", aliases: ["ml engineer", "mle"] },
  { name: "AI Engineer", aliases: ["artificial intelligence", "genai", "llm engineer"] },
  { name: "Data Analyst", aliases: ["bi analyst", "analytics"] },
  { name: "DevOps Engineer", aliases: ["sre", "platform engineer", "site reliability"] },
  { name: "Cloud Engineer", aliases: ["aws engineer", "azure engineer", "gcp engineer"] },
  { name: "Cybersecurity Engineer", aliases: ["security engineer", "soc analyst"] },
  { name: "Product Manager", aliases: ["pm", "product owner"] },
  { name: "UI/UX Designer", aliases: ["product designer", "ux designer", "ui designer"] },
  {
    name: "Mobile Developer",
    aliases: ["android developer", "ios developer", "flutter developer"],
  },
  { name: "QA Engineer", aliases: ["test engineer", "sdet", "automation tester"] },
];

/** Skills offered as quick-add chips in the wizard, grouped for display. */
export const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Languages: ["JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "SQL"],
  Frontend: ["React", "Next.js", "HTML", "CSS", "Tailwind CSS", "Redux", "Angular", "Vue"],
  Backend: ["Node.js", "Express", "Django", "Spring Boot", "REST APIs", "GraphQL", "Microservices"],
  Data: [
    "Machine Learning",
    "Deep Learning",
    "Pandas",
    "NumPy",
    "Power BI",
    "Tableau",
    "TensorFlow",
    "PyTorch",
  ],
  "Cloud & DevOps": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform"],
  Fundamentals: [
    "Data Structures",
    "Algorithms",
    "System Design",
    "Git",
    "OOP",
    "DBMS",
    "Operating Systems",
    "Computer Networks",
  ],
};
