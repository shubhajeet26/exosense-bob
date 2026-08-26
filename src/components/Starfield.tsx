"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Individual star field mesh — instanced points for performance
function Stars({ count = 2200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  // Generate random positions once
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    return { positions, sizes };
  }, [count]);

  // Slow rotation drift
  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.012;
      ref.current.rotation.x += delta * 0.004;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        color="#c8d8ff"
        transparent
        opacity={0.85}
        fog={false}
      />
    </points>
  );
}

// A second, slower, slightly brighter sparse layer for depth
function BrightStars({ count = 300 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 180;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 180;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.006;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.65}
        sizeAttenuation
        color="#e0ecff"
        transparent
        opacity={0.95}
        fog={false}
      />
    </points>
  );
}

export default function Starfield() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75, near: 0.1, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Stars />
        <BrightStars />
      </Canvas>
    </div>
  );
}
