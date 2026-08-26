"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Shared mouse/scroll target (refs, never React state) ─────────────────────
// Stored outside the component so Stars + BrightStars share the same values
// without prop-drilling and without triggering any re-renders.
interface ParallaxTarget {
  mouseX: number; // normalised -1…1
  mouseY: number;
  scrollY: number; // px
  // Current (lerped) values
  curX: number;
  curY: number;
  curScroll: number;
}

// ─── Stars layer ──────────────────────────────────────────────────────────────

function Stars({
  count = 2200,
  parallax,
  speed = 1,
}: {
  count?: number;
  parallax: React.MutableRefObject<ParallaxTarget>;
  speed?: number;
}) {
  const ref = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    return { positions, sizes };
  }, [count]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const p = parallax.current;

    // Lerp current values toward targets (smooth follow)
    const lf = 1 - Math.pow(0.04, delta); // ~4% per frame at 60fps
    p.curX      += (p.mouseX  - p.curX)      * lf;
    p.curY      += (p.mouseY  - p.curY)      * lf;
    p.curScroll += (p.scrollY - p.curScroll) * lf;

    // Base rotation drift (unchanged from Phase 1)
    ref.current.rotation.y += delta * 0.012;
    ref.current.rotation.x += delta * 0.004;

    // Parallax offset — layer multiplier keeps near/far layers moving differently
    ref.current.rotation.y += p.curX * 0.0006 * speed;
    ref.current.rotation.x += p.curY * 0.0004 * speed;
    // Scroll: push the field slightly up as user scrolls down
    ref.current.position.y = -p.curScroll * 0.003 * speed;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes,     1]} />
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

// ─── Bright (closer) stars layer ──────────────────────────────────────────────

function BrightStars({
  count = 300,
  parallax,
}: {
  count?: number;
  parallax: React.MutableRefObject<ParallaxTarget>;
}) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 180;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 180;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const p = parallax.current;
    // Bright layer moves ~1.6× more than dim layer → depth illusion
    ref.current.rotation.y -= delta * 0.006;
    ref.current.rotation.y += p.curX * 0.001;
    ref.current.rotation.x += p.curY * 0.0006;
    ref.current.position.y  = -p.curScroll * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
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

// ─── Exported component ───────────────────────────────────────────────────────

export default function Starfield() {
  // Shared mutable target — never triggers re-renders
  const parallax = useRef<ParallaxTarget>({
    mouseX: 0, mouseY: 0, scrollY: 0,
    curX: 0,   curY: 0,   curScroll: 0,
  });

  // Attach DOM listeners once — passive, cleaned up on unmount
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      parallax.current.mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      parallax.current.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function onScroll() {
      parallax.current.scrollY = window.scrollY;
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll",    onScroll,    { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll",    onScroll);
    };
  }, []);

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
        <Stars      parallax={parallax} speed={1}   />
        <BrightStars parallax={parallax}             />
      </Canvas>
    </div>
  );
}
