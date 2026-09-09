import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Content remains visible without JavaScript or when reduced motion is enabled. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || preference.matches || !("IntersectionObserver" in window)) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.dataset["reveal"] = "pending";
    const show = () => {
      element.dataset["reveal"] = "visible";
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    element.addEventListener("focusin", show);
    preference.addEventListener("change", show);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", show);
      preference.removeEventListener("change", show);
      delete element.dataset["reveal"];
    };
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
