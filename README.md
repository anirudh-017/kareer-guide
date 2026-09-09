# Career Navigator AI

# Kareer Guide — Master Build Prompt

Copy everything below the line into your AI builder of choice to recreate this project from scratch.

---

# MASTER PROMPT: Build "Kareer Guide"

Build a complete, production-ready AI career platform called **Kareer Guide** (domain: kareerguide.in). It is a smart job-finding and career-planning app for students and professionals, focused on India but global-ready. Deploy it on **Vercel**.

---

## 1. TECH STACK

**Frontend**
- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS v3 + shadcn/ui (Radix primitives)
- React Router DOM (BrowserRouter, SPA)
- react-helmet-async for per-page SEO meta
- lucide-react for icons
- next-themes / custom dark mode (localStorage-persisted, with an inline `<script>` in `index.html` head to apply the theme before first paint — no flash)
- jspdf (PDF export of roadmaps and tailored resumes)
- pdfjs-dist 3.11.174 (PDF resume parsing in the browser) + mammoth 1.8.0 (DOCX parsing)
- @lovable.dev/mcp-js (MCP server plugin)

**Backend (serverless edge functions)**
- One Supabase Edge Function (Deno, TypeScript) named `jobsy-ai` with `verify_jwt = false` — handles ALL AI work and job aggregation. No other backend. No database required — all user data lives in `localStorage`/`sessionStorage`. No authentication of any kind.
- AI model: `google/gemini-3-flash-preview` via an OpenAI-compatible chat-completions gateway (Lovable AI Gateway). NEVER use DeepSeek-R1 (it times out).

**Hosting & deployment**
- Vercel. Include `vercel.json` with SPA rewrite so refresh never 404s:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Secrets / env vars (stored as edge-function secrets)**
- `LOVABLE_API_KEY` — AI gateway key
- `RAPIDAPI_KEY` — JSearch + Internships API on RapidAPI
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
- `JOOBLE_API_KEY`, `FINDWORK_API_KEY`
- `FIRECRAWL_API_KEY` — web scraping/search
- Frontend `.env` only holds public values: Supabase URL + anon/publishable key, `VITE_GOOGLE_MAPS_API_KEY` (optional).

---

## 2. DESIGN SYSTEM (exact UI language)

- **Style**: brutalist-editorial, minimal, high contrast. Light mode = white bg / black text; dark mode = #1A1A1A bg / white text. Sharp corners (no border-radius), 1px solid borders, uppercase 11px semibold tracking-wider labels.
- **Accent**: hot pink `#FA76FF` used as a slide-up hover fill on buttons/nav items (translate-y-full → 0).
- **Navbar**: fixed, top-8 left-8, rendered via React portal to `document.body`. Dark-mode toggle sits in the first slot (no logo image). Links as adjacent bordered boxes: KAREER GUIDE | JOB MATCH | SAVED JOBS | TAILOR RESUME | ROADMAP. Mobile: "MENU" button opens a full-screen overlay with staggered fade-in links.
- **Hero branding**: the word "KAREER GUIDE" where the leading letter animates in a loop, flipping between "K" and "C" ("CAREER GUIDE" ↔ "KAREER GUIDE"). Both letters share one CSS grid cell, baseline-aligned, `aria-label="Kareer Guide"`.
- **Home CTAs** (all caps, exact text): "KNOW WHICH JOB SUITS YOU BEST" → /recommendations, "KNOW HOW TO START LEARNING" → /roadmap, plus a "TAILOR YOUR RESUME" CTA → /tailor-resume.
- **Mobile**: vertical stacking everywhere, secondary metadata hidden on small screens, responsive font scaling on the hero title.
- Persistent dark/light mode toggle.

---

## 3. PAGES & FEATURES (all routes)

### `/` — Home (Jobsy)
Hero with animated K/C branding, tagline about AI job matching, the 3 CTAs above, footer. SEO: title "Kareer Guide — AI Job Search & Career Roadmaps in India".

### `/recommendations` — Job Match (input page)
User either **uploads a resume** (PDF/DOCX/TXT, parsed client-side with pdfjs-dist/mammoth) or **enters skills manually**. Optional location input (geolocation via browser + Nominatim reverse geocoding). On submit, calls the edge function (`resume-analyze` to extract a skill set, then `resume-search`; or `skill-search` for manual skills), stores results in `sessionStorage`, and navigates to `/jobs`.

### `/jobs` — Job Results
Grid of job cards: title, company, location, source badge, posted date, "Apply Now" (external link), "Save Job", and "Tailor Resume" buttons. **Client-side filters**: search text, location, job type (full-time / internship / remote), experience level (entry/mid/senior, detected via regex on title+description), source, and sort. A "Jobs found" counter that updates live with the filters. NO salary filter. Jobs sorted most-recently-posted first. Clicking "Tailor Resume" auto-saves the job and navigates to `/tailor-resume` with the job description, title, company, location, apply link, and the user's resume text pre-filled via sessionStorage — analysis starts automatically.

### `/saved-jobs` — Saved Jobs
Persistent shortlist (localStorage via a `savedJobs.ts` helper). Each card shows the job, whether a tailored resume exists for it (with score), and buttons: Apply Now / Tailor Resume / View Tailored Resume / Remove.

### `/roadmap` — Career Roadmap
User enters a target role; edge function (`roadmap` type) returns an AI-generated **6–8 phase roadmap** (phases with skills, resources, milestones, timelines). Exportable to a multi-page PDF via jspdf.

### `/tailor-resume` — Resume Tailoring (nexusdoc.io-style review workspace)
Inputs: target **region** dropdown (34 countries with flags + Global) and **company profile** dropdown (Standard Professional, Large MNC/Fortune 500, Vendor/Staffing, Implementation Partner, Startup, Public Sector, Others). Resume via **Upload File** or **Paste Text** tabs (PDF/DOCX/TXT, ≤10MB). Optional **job description** textarea (unlocks JD Fit score). "ANALYZE DOCUMENT" button.

### `/resume-analysis` — Analysis Review
Shows overall score + JD fit score, **15 hiring signals** grouped into ATS Fit / Reviewer Lens / Executive Clarity (each with score + note), priority fixes, recruiter red flags, a **missing-keyword picker** (chips the user toggles), **suggested bullet rewrites using the Google XYZ formula** ("Accomplished X as measured by Y by doing Z"), and a summary rewrite. "APPLY AND GENERATE TAILORED RESUME" sends the approved keywords/bullets/red flags back to the edge function.

### `/tailored-resume` — Tailored Result
Final tailored resume text with final Resume Score + JD Fit badges (color-coded), preview, download as .txt and .pdf (jspdf). If the job was saved, the tailored resume + score is attached to that saved-job record, with a direct "Apply Now" link to the exact job it was tailored for.

### `*` — 404 NotFound page.

---

## 4. EDGE FUNCTION `jobsy-ai` (the engine)

Single Deno edge function, CORS-open, routing on `body.type`:

### Job aggregation (used by `resume-search` and `skill-search`)
Query **all sources in parallel** with `Promise.all`, each wrapped in a `wrap(name, promise)` helper that catches failures and returns `[]` so one dead source never breaks the search. Each source has an **8-second timeout** via `Promise.race`. Sources:
1. **RapidAPI JSearch** (`jsearch.p.rapidapi.com/search`, ~30 results, publisher as source)
2. **Adzuna** (country-coded endpoint, 1 page; internships trigger an extra "… intern trainee" query)
3. **Remotive** (`remotive.com/api/remote-jobs`)
4. **Arbeitnow** (`arbeitnow.com/api/job-board-api`)
5. **Jobicy** (`jobicy.com/api/v2/remote-jobs?count=100`)
6. **RemoteOK** (`remoteok.com/api`, with browser-like headers to bypass blocking)
7. **The Muse** (`themuse.com/api/public/jobs`, paginated — good for internships)
8. **Himalayas** (`himalayas.app/jobs/api`, offset-paginated, limit 100)
9. **Career Nest**
10. **Jooble** (needs key)
11. **Findwork.dev** (needs key)
12. **RapidAPI Internships API** (`internships-api.p.rapidapi.com/active-jb-7d`) — only for internship searches
13. **Firecrawl** (`api.firecrawl.dev/v2/search`) scraping **Internshala**, **LinkedIn Jobs**, **Indeed** — LinkedIn URLs normalized: strip tracking params, reject non-job paths, unwrap search-engine redirects.

All results normalized to one shape: `{ title, company, location, description, applyLink, source, postedAt, jobType }`.

**Relevance + ranking pipeline:**
- Build skill-focused queries from the user's skills (max ~3 query variants for resume search).
- Score each job: title match OR ≥2 distinct skill matches required to survive; scoring rewards skill overlaps.
- **Recency filter**: jobs with a `postedAt` older than **10 days** are excluded; dateless jobs (e.g. scraped ones) are kept but dated sources are strictly enforced.
- **Dedup** by company+title.
- Sort by `postedAt` descending (most recent first).
- **Fallback ladder**: try ≥50% match first; if <5 results, relax to ≥30%; if still low, return the top 30 by score. Never return an empty page when jobs exist.

### `resume-analyze`
Extracts a structured skill set from resume text via Gemini (JSON array of skills).

### `roadmap`
Gemini generates a 6–8 phase career roadmap JSON (phase name, duration, skills, free resources, project ideas, milestones).

### `tailor-resume` (two stages + score loop)
- **Stage 1 — Analysis**: recruiter-persona prompt → match score, 5 missing keywords, 3 red flags, 15 signals across the 3 sections, priority fixes, XYZ-formula bullet rewrites, summary rewrite, benchmark text.
- **Stage 2 — Apply** (with approved keywords/bullets/red flags): rewrites the resume naturally (no keyword stuffing), removes red flags, applies XYZ bullets, then an **ATS "stop the scroll" polish pass**.
- **Score-and-refine loop**: after generation, internally re-scores the resume; if below 85, runs up to 3 refinement passes feeding back gaps/missing keywords. Returns `{ tailoredResume, score, fitScore }`.

---

## 5. MCP SERVER (agent integrations)

Expose an MCP endpoint at `/functions/v1/mcp` using `@lovable.dev/mcp-js` with three tools:
1. `search_jobs` — search jobs/internships by skills
2. `generate_career_roadmap` — roadmap for a target role
3. `analyze_resume_for_job` — resume vs JD analysis

---

## 6. SEO

- `index.html`: title "Kareer Guide — AI Job Search & Career Roadmaps in India", meta description about AI job search + resume matching in India, OG + Twitter cards, canonical `https://kareerguide.in`, JSON-LD WebSite/Organization schema, Google Tag Manager, explicit favicon link.
- Per-page `<SEOHead>` component (react-helmet-async) with unique title/description/keywords; every title suffixed "| Kareer Guide".
- `public/robots.txt` (allow all + sitemap) and `public/sitemap.xml` listing all routes.
- Single H1 per page, semantic HTML, alt text, lazy loading, responsive viewport.

## 7. HARD RULES

- No user authentication, no accounts, no event-management features — ever.
- No database tables; persistence is localStorage/sessionStorage only.
- All AI calls go through the edge function; never call AI from the client.
- Gemini-3-Flash only; DeepSeek forbidden.
- Mobile-first responsive; the K/C hero animation must be baseline-aligned on all screens.
- `vercel.json` SPA rewrite is mandatory.
- Job type and experience filtering live as filters on the results page — NO pop-up questionnaires after resume upload.

## 8. DELIVERABLES

Full source tree: Vite + React + TS app with all pages/components above, the `jobsy-ai` edge function, MCP manifest, `tailwind.config.ts`, `index.html` with full SEO, `vercel.json`, `robots.txt`, `sitemap.xml`. App must `npm run build` cleanly and deploy to Vercel with zero config beyond env vars.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d56c57d-974a-4810-b47e-0b93acadb14f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
