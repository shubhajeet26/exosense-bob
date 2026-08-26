"use client";

import { useRef, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Exoplanet } from "@/lib/nasa";

// ─── Temperature → colour mapping ─────────────────────────────────────────────
// Cold (<300 K)  : deep navy/violet
// Temperate (~300–700 K) : muted blue-green
// Warm (700–1500 K)      : amber-orange
// Hot (1500–3000 K)      : orange-red
// Very hot (>3000 K)     : white-blue (stellar)

function tempToColor(eqt: number | null): THREE.Color {
  const t = eqt ?? 500; // fallback: lukewarm
  if (t < 300)        return new THREE.Color("#3b3f8c"); // cold — deep violet
  if (t < 600)        return new THREE.Color("#2d6a8a"); // cool — teal-blue
  if (t < 1000)       return new THREE.Color("#c8873a"); // warm — amber
  if (t < 2000)       return new THREE.Color("#c8472a"); // hot — orange-red
  if (t < 3500)       return new THREE.Color("#e05510"); // very hot — red
  return               new THREE.Color("#8ab4ff");        // extreme — blue-white
}

// Visual radius: clamp pl_rade to 0.5–4 (Earth radii) → sphere radius 0.6–2.2
function visualRadius(pl_rade: number | null): number {
  const r = pl_rade ?? 1;
  const clamped = Math.min(Math.max(r, 0.5), 20);
  // Log-compress so Jupiter-sized planets don't dwarf everything
  return 0.6 + (Math.log(clamped) / Math.log(20)) * 1.6;
}

// ─── Rotating sphere inside the Canvas ───────────────────────────────────────

function PlanetSphere({
  radius,
  color,
}: {
  radius: number;
  color: THREE.Color;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <>
      {/* Ambient + directional light — subtle star-like lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 3, 5]} intensity={1.4} color="#fff8f0" />
      <directionalLight position={[-3, -2, -3]} intensity={0.3} color="#4466ff" />

      {/* Planet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color={color}
          roughness={0.72}
          metalness={0.08}
        />
      </mesh>

      {/* Faint atmosphere halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ─── Info rows ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[0.65rem] tracking-widest uppercase text-[var(--muted)] shrink-0">
        {label}
      </span>
      <span className="text-xs text-[var(--foreground)] text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function fmt(v: number | null, decimals: number, unit: string): string {
  return v != null ? `${v.toFixed(decimals)} ${unit}` : "—";
}

// ─── Main exported component ──────────────────────────────────────────────────

interface Props {
  planet: Exoplanet | null;
  onClose: () => void;
}

function PlanetViewerInner({ planet, onClose }: Props) {
  const color  = tempToColor(planet?.pl_eqt ?? null);
  const radius = visualRadius(planet?.pl_rade ?? null);

  return (
    <AnimatePresence>
      {planet && (
        <motion.div
          key={planet.pl_name}
          className="rounded-xl border border-[var(--border)] overflow-hidden"
          style={{ background: "rgba(11,14,31,0.88)", backdropFilter: "blur(12px)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "#a78bfa" }}
              >
                {planet.pl_name}
              </h3>
              <p className="text-[0.65rem] text-[var(--muted)] mt-0.5">
                Illustrative model — not scientifically precise
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close planet viewer"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg leading-none cursor-pointer px-1"
            >
              ✕
            </button>
          </div>

          {/* Body: canvas + info side-by-side on wide, stacked on narrow */}
          <div className="flex flex-col sm:flex-row">
            {/* 3D canvas */}
            <div className="w-full sm:w-48 h-48 shrink-0 bg-[var(--background)]">
              <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
                style={{ background: "transparent" }}
              >
                <PlanetSphere radius={radius} color={color} />
              </Canvas>
            </div>

            {/* Info panel */}
            <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-0">
              <InfoRow label="Host Star"    value={planet.hostname || "—"} />
              <InfoRow label="Radius"       value={fmt(planet.pl_rade, 2, "R⊕")} />
              <InfoRow label="Mass"         value={fmt(planet.pl_masse, 2, "M⊕")} />
              <InfoRow label="Eq. Temp."    value={planet.pl_eqt != null ? `${planet.pl_eqt.toFixed(0)} K` : "—"} />
              <InfoRow label="Orbital Period" value={fmt(planet.pl_orbper, 2, "days")} />
              <InfoRow label="Semi-major axis" value={fmt(planet.pl_orbsmax, 3, "AU")} />
              <InfoRow label="Distance"     value={fmt(planet.sy_dist, 1, "pc")} />
              <InfoRow label="Discovery"    value={planet.disc_year != null ? String(planet.disc_year) : "—"} />
              <InfoRow label="Method"       value={planet.discoverymethod || "—"} />
            </div>
          </div>

          {/* Temperature colour legend */}
          <div className="px-4 pb-3 pt-1 flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: `#${color.getHexString()}` }}
            />
            <span className="text-[0.62rem] text-[var(--muted)]">
              Colour represents estimated equilibrium temperature
              {planet.pl_eqt != null ? ` (${planet.pl_eqt.toFixed(0)} K)` : " (unknown)"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PlanetViewer = memo(PlanetViewerInner);
export default PlanetViewer;
