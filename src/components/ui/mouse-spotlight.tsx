import React, { useEffect, useRef, useState } from "react";

/**
 * Global ambient cursor glow that softly tracks the mouse across the page
 * with silky inertia. Disabled on touch devices and under prefers-reduced-motion.
 */
export function MouseSpotlight() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check if device supports hover / fine pointer and does not prefer reduced motion
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!hasFinePointer || prefersReducedMotion) return;
    setEnabled(true);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let isVisible = false;
    let animationFrameId: number;

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        if (glowRef.current) {
          glowRef.current.style.opacity = "1";
        }
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    };

    const updatePosition = () => {
      // Smooth lerp interpolation for silky motion
      currentX += (mouseX - currentX) * 0.12;
      currentY += (mouseY - currentY) * 0.12;

      if (glowRef.current) {
        glowRef.current.style.left = `${currentX}px`;
        glowRef.current.style.top = `${currentY}px`;
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    animationFrameId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="cursor-ambient-glow"
      style={{ opacity: 0 }}
    />
  );
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

/**
 * Card container that dynamically illuminates its border and surface based
 * on the local pointer coordinates.
 */
export function SpotlightCard({
  children,
  className = "",
  glowColor,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--mouse-x", `-999px`);
    cardRef.current.style.setProperty("--mouse-y", `-999px`);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`spotlight-card ${className}`}
      {...props}
    >
      <div className="spotlight-card-surface" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
