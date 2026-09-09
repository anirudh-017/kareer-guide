/**
 * Input sanity checks for the free-text fields the AI acts on.
 *
 * The zod validators upstream check *shape* — a role is a string of at least
 * two characters. Nothing checked *meaning*, so "asdfgh qwerty" passed and the
 * model, having been ordered to produce a roadmap, produced one. Worse, for
 * "ghgh jkjk lolol" it quietly answered about a Full Stack Web Developer
 * instead: a confident, plausible, entirely fabricated answer the user has no
 * way to identify as wrong.
 *
 * This is the cheap first line: pure string heuristics, no model call, so
 * obvious keyboard mash never reaches a paid request. The model's own
 * "did you recognise this?" check in jobsy.core is the second line, for input
 * that is well-formed but still meaningless.
 *
 * The bias is deliberately toward *accepting*: a wrongly rejected real role is
 * a broken product, while a wrongly accepted fake one still meets the model
 * check behind it. Every rule below therefore keys on a strong signal.
 */

/** Rows of a QWERTY keyboard, used to spot finger-mashing like "asdfgh". */
const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const VOWELS = /[aeiouy]/;

/** Four or more of the same character in a row: "zzzz", "aaaaargh". */
const REPEATED_CHAR = /(.)\1{3,}/;

/**
 * A short unit repeated to fill the token: "ghgh", "jkjk", "lolol", "abcabc".
 * The trailing allowance catches odd-length mash like "lolol" (lo·lo·l).
 */
const REPEATED_UNIT = /^(.{2,3})\1+.{0,2}$/;

/** Does the token contain four or more keys adjacent on one keyboard row? */
function hasKeyboardRun(token: string): boolean {
  for (const row of KEYBOARD_ROWS) {
    const reversed = [...row].reverse().join("");
    for (let i = 0; i + 4 <= token.length; i++) {
      const slice = token.slice(i, i + 4);
      if (row.includes(slice) || reversed.includes(slice)) return true;
    }
  }
  return false;
}

/**
 * Is this single word almost certainly not a word?
 *
 * Acronyms are the trap here: QA, UX, PM, SQL, AWS, PHP, SRE and SDET are all
 * real and all vowel-poor, so the no-vowel rule only fires from six characters
 * up — long enough that no common acronym reaches it.
 */
export function isGibberishToken(token: string): boolean {
  const t = token.toLowerCase();
  if (t.length < 4) return false; // too short to judge; acronyms live here
  if (REPEATED_CHAR.test(t)) return true;
  if (REPEATED_UNIT.test(t)) return true;
  if (hasKeyboardRun(t)) return true;
  if (t.length >= 6 && !VOWELS.test(t)) return true;
  if (t.length >= 8) {
    const vowels = [...t].filter((c) => VOWELS.test(c)).length;
    if (vowels / t.length < 0.15) return true;
  }
  return false;
}

/**
 * Does the whole phrase read as mash?
 *
 * Every judgeable word has to look like mash before the phrase is rejected, so
 * "senior asdfgh developer" is let through — it has a real role in it, and the
 * model check downstream is better placed to decide what that means than a
 * regex is.
 */
export function looksLikeGibberish(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length >= 4);
  if (!tokens.length) return false;
  return tokens.every(isGibberishToken);
}

/** Thrown for input the user can fix by typing something else. */
export class InvalidInputError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

/**
 * Guard a free-text field that the AI will answer *about*.
 * @throws InvalidInputError with a message written to be shown to the user.
 */
export function assertMeaningful(value: string, field: string): void {
  const trimmed = value.trim();
  if (looksLikeGibberish(trimmed)) {
    throw new InvalidInputError(
      `“${trimmed.slice(0, 40)}” doesn’t look like a real ${field}. Try something like “Data Scientist” or “Frontend Developer”.`,
    );
  }
}
