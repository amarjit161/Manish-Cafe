"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function Reveal({
  children,
  className,
  stagger = false,
  y = 36,
  duration = 0.8,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  y?: number;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion || !ref.current) return;

    const targets = stagger ? Array.from(ref.current.children) : ref.current;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          stagger: stagger ? 0.12 : 0,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 88%",
            once: true,
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [reducedMotion, stagger, y, duration, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
