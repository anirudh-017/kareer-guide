/**
 * The dotted radial backdrop from the hero, shared so every page sits on the
 * same texture. Purely decorative: it is inert to pointer events and hidden
 * from assistive tech, and inverts with the theme.
 *
 * Place inside a `relative` parent; siblings need to sit above it.
 *
 * @param drift Slowly animate the dot grid. Reserved for the hero — a moving
 * background behind a form or a table is a distraction, not an effect. Honours
 * prefers-reduced-motion via the `.drift` rule in styles.css.
 */
export function DottedField({ drift = false }: { drift?: boolean } = {}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle,_black_1px,_transparent_1px)] opacity-15 [background-size:20px_20px] dark:bg-[radial-gradient(circle,_white_1px,_transparent_1px)] ${
        drift ? "drift" : ""
      }`}
    />
  );
}
