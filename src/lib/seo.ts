/**
 * Per-page SEO head builder.
 *
 * TanStack Start's `head()` replaces react-helmet-async here: every route calls
 * `seo({...})` and spreads the result, so titles, canonicals and OG/Twitter
 * cards stay consistent and absolute. Titles are suffixed "| Kareer Guide"
 * unless the page passes `bareTitle` (the home page owns the brand title).
 */

export const SITE_URL = "https://kareerguide.in";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

type SeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** Skip the "| Kareer Guide" suffix (home page only). */
  bareTitle?: boolean;
};

export function seo({ title, description, path, keywords, bareTitle }: SeoInput) {
  const fullTitle = bareTitle ? title : `${title} | Kareer Guide`;
  const url = absolute(path);

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      ...(keywords?.length ? [{ name: "keywords", content: keywords.join(", ") }] : []),
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
