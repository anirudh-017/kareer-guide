/**
 * Flat illustrations, drawn to the Storyset palette the platform now uses.
 *
 * Every fill is a theme token rather than a literal, so the same markup works
 * on both grounds: `--ink` and `--mist` swap roles in dark mode, which keeps
 * the figures dark-on-light and light-on-dark without a second drawing.
 *
 * Inline SVG rather than files in `public/`: it inherits the theme, scales to
 * any hero size without blurring, and costs no extra request. Each is a few
 * hundred bytes gzipped.
 *
 * These are original drawings in the Storyset *style* — deliberately not
 * traces of the reference art, so nothing here carries a Freepik licence.
 */
import type { SVGProps } from "react";

const ink = "var(--ink, #263238)";
const slate = "var(--slate, #37474f)";
const steel = "var(--steel, #455a64)";
const sun = "var(--sunburst, #ffc727)";
const mist = "var(--mist, #ebebeb)";
const card = "var(--card, #ffffff)";

// viewBox is fixed per drawing, so it is not part of the public prop surface —
// spreading a caller-supplied one would silently crop the art.
type Props = Omit<SVGProps<SVGSVGElement>, "viewBox"> & { title?: string };

/** Shared wrapper: labelled for screen readers, or hidden when purely decorative. */
function Svg({ title, children, viewBox, ...rest }: Omit<Props, "viewBox"> & { viewBox: string }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** The ground every scene stands on. */
function Ground({ y = 268, w = 360, x = 20 }: { y?: number; w?: number; x?: number }) {
  return <rect x={x} y={y} width={w} height="3" rx="1.5" fill={mist} />;
}

/* -------------------------------------------------------------------------- */

/**
 * Three figures celebrating — the platform's hero note. Mirrors the reference
 * scene's composition: two outer figures leaning in, hands meeting above a
 * centre figure, feet and highlights in the signature yellow.
 */
export function CollaborationIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 400 300" {...props}>
      <ellipse cx="200" cy="272" rx="150" ry="10" fill={mist} opacity="0.55" />

      {/* speech dots */}
      <circle cx="330" cy="52" r="4" fill={steel} opacity="0.5" />
      <circle cx="344" cy="52" r="4" fill={steel} opacity="0.5" />
      <circle cx="358" cy="52" r="4" fill={steel} opacity="0.5" />

      {/* left figure */}
      <g>
        <path d="M126 118c0-16 10-27 24-27s24 11 24 27l-5 54h-38z" fill={sun} />
        <path d="M150 91c-14 0-24 11-24 27l3 26h42l3-26c0-16-10-27-24-27z" fill={sun} />
        <rect x="132" y="168" width="16" height="72" rx="8" fill={slate} />
        <rect x="153" y="168" width="16" height="72" rx="8" fill={ink} />
        <path d="M140 240l-14 14a7 7 0 0 0 5 12h20a6 6 0 0 0 6-7l-2-19z" fill={sun} />
        <path d="M161 240l-12 16a7 7 0 0 0 6 11h18a6 6 0 0 0 6-8l-5-19z" fill={sun} />
        <circle cx="150" cy="70" r="18" fill={ink} />
        <path d="M138 62c2-12 20-16 26-6 5 8 2 12 2 12l-4-6c-6 4-18 4-24 0z" fill={ink} />
        <path d="M133 100c-8 4-14-14-19-30" stroke={ink} strokeWidth="11" strokeLinecap="round" />
      </g>

      {/* right figure */}
      <g>
        <path d="M226 118c0-16 10-27 24-27s24 11 24 27l-5 54h-38z" fill={steel} />
        <rect x="232" y="168" width="16" height="72" rx="8" fill={ink} />
        <rect x="253" y="168" width="16" height="72" rx="8" fill={slate} />
        <path d="M240 240l-14 14a7 7 0 0 0 5 12h20a6 6 0 0 0 6-7l-2-19z" fill={sun} />
        <path d="M261 240l-12 16a7 7 0 0 0 6 11h18a6 6 0 0 0 6-8l-5-19z" fill={sun} />
        <circle cx="250" cy="70" r="18" fill={ink} />
        <path d="M267 100c8 4 14-14 19-30" stroke={ink} strokeWidth="11" strokeLinecap="round" />
        <rect x="264" y="128" width="22" height="30" rx="3" fill={sun} />
      </g>

      {/* centre figure, hands raised into the high five */}
      <g>
        <path d="M176 122c0-17 11-29 24-29s24 12 24 29l-4 58h-40z" fill={slate} />
        <rect
          x="182"
          y="176"
          width="17"
          height="76"
          rx="8"
          fill={mist}
          stroke={steel}
          strokeWidth="2"
        />
        <rect
          x="203"
          y="176"
          width="17"
          height="76"
          rx="8"
          fill={mist}
          stroke={steel}
          strokeWidth="2"
        />
        <path d="M190 252l-15 15a7 7 0 0 0 5 12h21a6 6 0 0 0 6-7l-2-20z" fill={sun} />
        <path d="M212 252l-13 17a7 7 0 0 0 6 11h19a6 6 0 0 0 6-8l-5-20z" fill={sun} />
        <circle cx="200" cy="70" r="19" fill={ink} />
        <path d="M183 104c-6-10 4-30 12-34" stroke={ink} strokeWidth="11" strokeLinecap="round" />
        <path d="M217 104c6-10-4-30-12-34" stroke={ink} strokeWidth="11" strokeLinecap="round" />
      </g>

      {/* the clap */}
      <circle cx="200" cy="30" r="9" fill={sun} />
      <path
        d="M186 20l-7-9M214 20l7-9M200 14V2"
        stroke={sun}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * A resume under review: the document, a scoring panel, and the checks that
 * come back. Used wherever the app is reading or rewriting a CV.
 */
export function ResumeIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 400 300" {...props}>
      <ellipse cx="200" cy="274" rx="140" ry="9" fill={mist} opacity="0.55" />
      <circle cx="200" cy="140" r="108" fill={sun} opacity="0.14" />

      {/* the document */}
      <rect
        x="96"
        y="46"
        width="150"
        height="196"
        rx="10"
        fill={card}
        stroke={mist}
        strokeWidth="3"
      />
      <rect x="118" y="74" width="62" height="10" rx="5" fill={ink} />
      <rect x="118" y="96" width="106" height="6" rx="3" fill={mist} />
      <rect x="118" y="112" width="86" height="6" rx="3" fill={mist} />
      <rect x="118" y="140" width="46" height="8" rx="4" fill={sun} />
      <rect x="118" y="160" width="106" height="6" rx="3" fill={mist} />
      <rect x="118" y="176" width="94" height="6" rx="3" fill={mist} />
      <rect x="118" y="192" width="70" height="6" rx="3" fill={mist} />

      {/* score card */}
      <rect x="212" y="150" width="106" height="86" rx="12" fill={ink} />
      <rect x="230" y="170" width="42" height="8" rx="4" fill={sun} />
      <rect x="230" y="188" width="70" height="5" rx="2.5" fill={card} opacity="0.35" />
      <rect x="230" y="202" width="54" height="5" rx="2.5" fill={card} opacity="0.35" />
      <circle cx="296" cy="176" r="10" fill={sun} />

      {/* approvals */}
      <circle cx="268" cy="72" r="22" fill={sun} />
      <path
        d="M258 72l7 7 14-15"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="322" cy="112" r="13" fill={mist} />
      <path
        d="M316 112l4 4 9-9"
        stroke={steel}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Ground y={266} x={70} w={260} />
    </Svg>
  );
}

/**
 * The roadmap: phases climbing left to right, the current one flagged. Shape
 * echoes the product — foundations at the bottom, job-ready at the top.
 */
export function RoadmapIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 400 300" {...props}>
      <ellipse cx="200" cy="274" rx="150" ry="9" fill={mist} opacity="0.55" />

      {/* the path */}
      <path
        d="M40 244c46 0 46-42 92-42s46-52 92-52 50-58 96-58"
        stroke={mist}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="1 22"
      />

      {/* phase columns */}
      <rect x="52" y="212" width="52" height="42" rx="8" fill={mist} />
      <rect x="128" y="170" width="52" height="84" rx="8" fill={steel} />
      <rect x="204" y="122" width="52" height="132" rx="8" fill={slate} />
      <rect x="280" y="66" width="52" height="188" rx="8" fill={sun} />

      <circle cx="78" cy="196" r="9" fill={steel} />
      <circle cx="154" cy="154" r="9" fill={steel} />
      <circle cx="230" cy="106" r="9" fill={steel} />

      {/* the flag on the final phase */}
      <path d="M306 66V22" stroke={ink} strokeWidth="6" strokeLinecap="round" />
      <path d="M306 26h38l-9 13 9 13h-38z" fill={ink} />

      {/* milestone ticks */}
      <path
        d="M296 108l7 7 15-16"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M220 160l7 7 15-16"
        stroke={sun}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Ground y={254} x={30} w={340} />
    </Svg>
  );
}

/**
 * Job search: a stack of live listings behind a lens. The yellow card is the
 * match — the one the ranking pipeline pushed to the top.
 */
export function JobSearchIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 400 300" {...props}>
      <ellipse cx="200" cy="274" rx="140" ry="9" fill={mist} opacity="0.55" />
      <circle cx="196" cy="140" r="112" fill={sun} opacity="0.12" />

      {/* listing stack */}
      <rect
        x="86"
        y="60"
        width="168"
        height="46"
        rx="10"
        fill={card}
        stroke={mist}
        strokeWidth="3"
      />
      <circle cx="112" cy="83" r="12" fill={mist} />
      <rect x="134" y="72" width="76" height="8" rx="4" fill={ink} />
      <rect x="134" y="88" width="48" height="6" rx="3" fill={mist} />

      <rect x="86" y="118" width="168" height="46" rx="10" fill={sun} />
      <circle cx="112" cy="141" r="12" fill={ink} opacity="0.15" />
      <rect x="134" y="130" width="88" height="8" rx="4" fill={ink} />
      <rect x="134" y="146" width="56" height="6" rx="3" fill={ink} opacity="0.4" />

      <rect
        x="86"
        y="176"
        width="168"
        height="46"
        rx="10"
        fill={card}
        stroke={mist}
        strokeWidth="3"
      />
      <circle cx="112" cy="199" r="12" fill={mist} />
      <rect x="134" y="188" width="66" height="8" rx="4" fill={ink} />
      <rect x="134" y="204" width="52" height="6" rx="3" fill={mist} />

      {/* lens */}
      <circle cx="272" cy="118" r="52" fill={card} fillOpacity="0.5" stroke={ink} strokeWidth="9" />
      <path d="M310 158l30 30" stroke={ink} strokeWidth="14" strokeLinecap="round" />
      <path d="M252 112a20 20 0 0 1 20-20" stroke={sun} strokeWidth="7" strokeLinecap="round" />
      <Ground y={252} x={60} w={280} />
    </Svg>
  );
}

/**
 * Dream job: the target role on a summit, with the gap below it measured out.
 * Deliberately not a trophy — the feature is about the distance, not the prize.
 */
export function DreamJobIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 400 300" {...props}>
      <ellipse cx="200" cy="274" rx="150" ry="9" fill={mist} opacity="0.55" />
      <circle cx="286" cy="66" r="34" fill={sun} opacity="0.9" />

      {/* summit */}
      <path d="M40 254L146 96l58 84 40-56 116 130z" fill={slate} />
      <path d="M146 96l58 84 40-56 116 130H196z" fill={ink} opacity="0.35" />
      <path d="M146 96l30 44h-60z" fill={mist} />
      <path d="M244 124l24 34h-48z" fill={mist} />

      {/* flag */}
      <path d="M146 96V34" stroke={ink} strokeWidth="6" strokeLinecap="round" />
      <path d="M146 38h44l-10 13 10 13h-44z" fill={sun} />

      {/* climber */}
      <circle cx="112" cy="206" r="13" fill={ink} />
      <path d="M112 220v26" stroke={ink} strokeWidth="12" strokeLinecap="round" />
      <path d="M112 246l-14 16M112 246l14 16" stroke={ink} strokeWidth="10" strokeLinecap="round" />
      <path d="M112 228l-20-10M112 228l22-14" stroke={sun} strokeWidth="9" strokeLinecap="round" />
      <Ground y={254} x={20} w={360} />
    </Svg>
  );
}

/**
 * Saved jobs / empty states: a bookmarked shortlist. Small by design — it sits
 * inside cards rather than above the fold.
 */
export function SavedIllustration(props: Props) {
  return (
    <Svg viewBox="0 0 300 220" {...props}>
      <ellipse cx="150" cy="198" rx="96" ry="8" fill={mist} opacity="0.55" />
      <circle cx="150" cy="104" r="80" fill={sun} opacity="0.12" />
      <rect
        x="72"
        y="40"
        width="118"
        height="140"
        rx="12"
        fill={card}
        stroke={mist}
        strokeWidth="3"
      />
      <rect x="94" y="70" width="60" height="8" rx="4" fill={ink} />
      <rect x="94" y="90" width="74" height="6" rx="3" fill={mist} />
      <rect x="94" y="108" width="52" height="6" rx="3" fill={mist} />
      <rect x="94" y="134" width="66" height="6" rx="3" fill={mist} />
      <path d="M196 34h34a8 8 0 0 1 8 8v78l-25-18-25 18V42a8 8 0 0 1 8-8z" fill={sun} />
      <path
        d="M204 74l7 7 16-17"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
