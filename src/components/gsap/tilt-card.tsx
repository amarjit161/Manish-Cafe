"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function TiltCard({
  children,
  className,
  maxTilt = 10,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const quickX = useRef<gsap.QuickToFunc | null>(null);
  const quickY = useRef<gsap.QuickToFunc | null>(null);

  function ensureQuickSetters(el: HTMLDivElement) {
    if (!quickX.current) {
      quickX.current = gsap.quickTo(el, "rotateY", { duration: 0.4, ease: "power3.out" });
      quickY.current = gsap.quickTo(el, "rotateX", { duration: 0.4, ease: "power3.out" });
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reducedMotion || !ref.current) return;
    const el = ref.current;
    ensureQuickSetters(el);
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    quickY.current?.(px * maxTilt);
    quickX.current?.(-py * maxTilt);
  }

  function handleMouseLeave() {
    if (reducedMotion || !ref.current) return;
    ensureQuickSetters(ref.current);
    quickX.current?.(0);
    quickY.current?.(0);
  }

  return (
    <div style={{ perspective: 800 }}>
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={className}
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
