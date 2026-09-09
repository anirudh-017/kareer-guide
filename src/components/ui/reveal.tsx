import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades and lifts its children into view the first time they are scrolled to.
 *
 * The hidden state is applied only after mount, and only when the visitor has
 * not asked for reduced motion — so with JavaScript disabled, or with motion
 * turned down, the content simply renders. Nothing can be left invisible.
 *
 * Reveals once and then stops observing: re-animating on every scroll past is
 * distracting on a page people are reading.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger, in ms, for items revealed as a group. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Already on screen at mount (short pages, deep links, restored scroll):
    // show it straight away rather than hiding then re-revealing.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      setState("shown");
      return;
    }

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setState("shown");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      {...(state === "idle" ? {} : { "data-reveal": state })}
      style={state === "shown" && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
