"use client";

import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { SceneVariant } from "@/components/three/scene-canvas";

const SceneCanvas = dynamic(
  () => import("@/components/three/scene-canvas").then((m) => m.SceneCanvas),
  { ssr: false },
);

const STATIC_GRADIENT: Record<SceneVariant, string> = {
  brand: "radial-gradient(circle at 50% 50%, #fd761a33, transparent 60%), radial-gradient(circle at 30% 70%, #4d7cc733, transparent 55%)",
  gaming: "radial-gradient(circle at 50% 50%, #ff7a1a3d, transparent 60%), radial-gradient(circle at 30% 70%, #22d3ee33, transparent 55%)",
  seva: "radial-gradient(circle at 50% 50%, #2d7dd233, transparent 60%), radial-gradient(circle at 30% 70%, #0f8a3c2b, transparent 55%)",
};

export function HeroCanvas({
  variant,
  interactive = false,
  className,
}: {
  variant: SceneVariant;
  interactive?: boolean;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return (
      <div
        className={className}
        style={{ position: "absolute", inset: 0, background: STATIC_GRADIENT[variant] }}
      />
    );
  }

  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      <SceneCanvas variant={variant} interactive={interactive} />
    </div>
  );
}
