"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function HeroIntro({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        Array.from(ref.current!.children),
        { opacity: 0, y: 28, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          stagger: 0.14,
          ease: "power3.out",
          delay: 0.1,
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
