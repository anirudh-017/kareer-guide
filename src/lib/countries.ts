/**
 * Adzuna is the only source that needs an explicit country, and it 404s on an
 * unsupported code — so map the user's free-text location onto the countries
 * Adzuna actually serves and fall back to India (the app's primary market).
 */
const ADZUNA_COUNTRIES: Record<string, string[]> = {
  in: [
    "india",
    "bharat",
    "bengaluru",
    "bangalore",
    "mumbai",
    "delhi",
    "hyderabad",
    "chennai",
    "pune",
    "kolkata",
    "noida",
    "gurgaon",
    "gurugram",
    "ahmedabad",
    "kochi",
    "jaipur",
  ],
  us: [
    "united states",
    "usa",
    "u.s.",
    "america",
    "new york",
    "san francisco",
    "seattle",
    "austin",
    "boston",
    "chicago",
    "los angeles",
  ],
  gb: [
    "united kingdom",
    "uk",
    "england",
    "scotland",
    "wales",
    "london",
    "manchester",
    "birmingham",
    "edinburgh",
  ],
  ca: ["canada", "toronto", "vancouver", "montreal", "ottawa", "calgary"],
  au: ["australia", "sydney", "melbourne", "brisbane", "perth"],
  de: ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "frankfurt"],
  fr: ["france", "paris", "lyon", "marseille"],
  nl: ["netherlands", "holland", "amsterdam", "rotterdam"],
  ie: ["ireland", "dublin", "cork"],
  sg: ["singapore"],
  nz: ["new zealand", "auckland", "wellington"],
  za: ["south africa", "johannesburg", "cape town"],
  br: ["brazil", "brasil", "sao paulo", "são paulo", "rio de janeiro"],
  mx: ["mexico", "méxico", "mexico city"],
  es: ["spain", "españa", "madrid", "barcelona"],
  it: ["italy", "italia", "rome", "roma", "milan", "milano"],
  pl: ["poland", "polska", "warsaw", "krakow"],
  at: ["austria", "vienna", "wien"],
  ch: ["switzerland", "zurich", "zürich", "geneva"],
  be: ["belgium", "brussels", "antwerp"],
  se: ["sweden", "stockholm", "gothenburg"],
  ae: ["uae", "united arab emirates", "dubai", "abu dhabi"],
};

export const DEFAULT_COUNTRY = "in";

/** Best-effort ISO-3166 alpha-2 for a free-text location. */
export function countryCodeFor(location: string | undefined): string {
  const q = (location ?? "").toLowerCase().trim();
  if (!q) return DEFAULT_COUNTRY;
  for (const [code, needles] of Object.entries(ADZUNA_COUNTRIES)) {
    if (needles.some((n) => q.includes(n))) return code;
  }
  return DEFAULT_COUNTRY;
}
