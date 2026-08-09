"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  PresentationControls,
  Sparkles,
} from "@react-three/drei";
import type { Group } from "three";

export type SceneVariant = "brand" | "gaming" | "seva";

const VARIANT_CONFIG: Record<
  SceneVariant,
  {
    colorA: string;
    colorB: string;
    particleColor: string;
    lightA: string;
    lightB: string;
    speed: number;
  }
> = {
  brand: {
    colorA: "#1e3a5f",
    colorB: "#fd761a",
    particleColor: "#adc8f5",
    lightA: "#fd761a",
    lightB: "#4d7cc7",
    speed: 0.35,
  },
  gaming: {
    colorA: "#0a1628",
    colorB: "#ff7a1a",
    particleColor: "#22d3ee",
    lightA: "#ff7a1a",
    lightB: "#22d3ee",
    speed: 0.6,
  },
  seva: {
    colorA: "#1e3a5f",
    colorB: "#0f8a3c",
    particleColor: "#8aa4cf",
    lightA: "#2d7dd2",
    lightB: "#0f8a3c",
    speed: 0.2,
  },
};

function RotatingRig({ variant }: { variant: SceneVariant }) {
  const group = useRef<Group>(null);
  const config = VARIANT_CONFIG[variant];
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * config.speed;
    group.current.rotation.x += (pointer.y * 0.25 - group.current.rotation.x) * 0.03;
    group.current.rotation.z += (-pointer.x * 0.15 - group.current.rotation.z) * 0.03;
  });

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.1}>
        {variant === "seva" ? (
          <mesh castShadow>
            <torusGeometry args={[1.05, 0.32, 24, 96]} />
            <MeshDistortMaterial
              color={config.colorA}
              distort={0.15}
              speed={1.2}
              roughness={0.35}
              metalness={0.4}
              emissive={config.colorB}
              emissiveIntensity={0.25}
            />
          </mesh>
        ) : variant === "gaming" ? (
          <mesh castShadow>
            <octahedronGeometry args={[1.35, 0]} />
            <MeshWobbleMaterial
              color={config.colorB}
              factor={0.4}
              speed={2.2}
              roughness={0.25}
              metalness={0.5}
              emissive={config.colorB}
              emissiveIntensity={0.7}
            />
          </mesh>
        ) : (
          <mesh castShadow>
            <icosahedronGeometry args={[1.3, 1]} />
            <MeshDistortMaterial
              color={config.colorA}
              distort={0.28}
              speed={1.4}
              roughness={0.3}
              metalness={0.4}
              emissive={config.colorB}
              emissiveIntensity={0.3}
            />
          </mesh>
        )}
      </Float>
      <Sparkles
        count={variant === "gaming" ? 90 : 55}
        scale={6}
        size={variant === "gaming" ? 2.5 : 1.8}
        speed={0.3}
        color={config.particleColor}
      />
    </group>
  );
}

export function SceneCanvas({
  variant,
  interactive = false,
}: {
  variant: SceneVariant;
  interactive?: boolean;
}) {
  const config = VARIANT_CONFIG[variant];

  const content = (
    <>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={[config.lightA, config.lightB, 1.4]} />
      <pointLight position={[3, 3, 4]} intensity={220} color={config.lightA} />
      <pointLight position={[-3, -2, -3]} intensity={160} color={config.lightB} />
      <RotatingRig variant={variant} />
    </>
  );

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      {interactive ? (
        <PresentationControls
          global
          cursor
          snap
          polar={[-0.3, 0.3]}
          azimuth={[-0.4, 0.4]}
          speed={1.2}
        >
          {content}
        </PresentationControls>
      ) : (
        content
      )}
    </Canvas>
  );
}
