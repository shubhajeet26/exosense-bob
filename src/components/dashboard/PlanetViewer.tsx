"use client";

import { useRef, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore } from "@/lib/scoring";
import { Spinner } from "./States";
import HudPanel from "./HudPanel";

function tempToColor(eqt: number | null): THREE.Color {
  const t = eqt ?? 500;
  if (t < 300) return new THREE.Color("#3b3f8c");
  if (t < 600) return new THREE.Color("#2d6a8a");
  if (t < 1000) return new THREE.Color("#c8873a");
  if (t < 2000) return new THREE.Color("#c8472a");
  if (t < 3500) return new THREE.Color("#e05510");
  return new THREE.Color("#8ab4ff");
}

function visualRadius(pl_rade: number | null): number {
  const r = pl_rade ?? 1;
  const clamped = Math.min(Math.max(r, 0.5), 20);
  return 0.6 + (Math.log(clamped) / Math.log(20)) * 1.6;
}

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
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 3, 5]} intensity={1.5} color="#fff8f0" />
      <directionalLight position={[-3, -2, -3]} intensity={0.4} color="#4466ff" />

      {/* Main Planet Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
      </mesh>

      {/* Atmospheric Glow Shell */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function TelemetryRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-b border-[var(--border)]/60 last:border-0 font-mono">
      <span className="text-[0.62rem] tracking-widest uppercase text-[var(--muted)] shrink-0">
        {label}
      </span>
      <span className="text-xs text-[var(--foreground)] text-right font-medium tabular-nums">
        {value} {unit && <span className="text-[var(--muted-light)] text-[0.65rem]">{unit}</span>}
      </span>
    </div>
  );
}

function fmt(v: number | null, decimals: number): string {
  return v != null ? v.toFixed(decimals) : "—";
}

function DeterministicScoreCard({ score }: { score: PlanetScore }) {
  const pct = Math.min(100, Math.max(0, score.score));
  const color = pct >= 60 ? "#34d399" : pct >= 35 ? "#f59e0b" : "#64748b";

  return (
    <div className="p-3 rounded bg-[#050a22] border border-[var(--border)] space-y-2 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[0.65rem] tracking-widest uppercase text-[var(--muted-light)] font-bold">
            EXOSENSE INTEREST SCORE
          </span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {score.score}/100
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-[#0d1430] overflow-hidden border border-[var(--border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Explanation */}
      <p className="text-[0.6rem] text-[var(--muted-light)] leading-snug">
        {score.explanation}
      </p>

      {/* Deterministic Disclaimer */}
      <p className="text-[0.55rem] text-[var(--muted)] italic pt-1 border-t border-[var(--border)]/50">
        Deterministic exploratory metric — not a scientific habitability determination.
      </p>
    </div>
  );
}

export type ProfileStatus = "idle" | "loading" | "success" | "error";

interface Props {
  planet: Exoplanet | null;
  onClose: () => void;
  profile: string | null;
  profileStatus: ProfileStatus;
  profileError: string | null;
  score: PlanetScore | null;
}

function PlanetViewerInner({ planet, onClose, profile, profileStatus, profileError, score }: Props) {
  if (!planet) return null;

  const color = tempToColor(planet.pl_eqt ?? null);
  const radius = visualRadius(planet.pl_rade ?? null);

  return (
    <HudPanel
      title={`TARGET OBSERVATORY // ${planet.pl_name}`}
      moduleCode="OBS-01"
      badge={{ text: "TARGET LOCKED", variant: "violet" }}
      headerRight={
        <button
          onClick={onClose}
          aria-label="Close planet viewer"
          className="font-mono text-xs text-[var(--muted)] hover:text-white px-2 py-0.5 rounded border border-[var(--border)] hover:border-red-400 transition-colors cursor-pointer"
        >
          [ ✕ CLOSE ]
        </button>
      }
      cornerAccent="cyan"
    >
      <div className="space-y-4">
        {/* Top Split: 3D Holographic Canvas + Telemetry Matrix */}
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* 3D Planet Viewport with Sci-Fi Reticle */}
          <div className="relative w-full lg:w-72 h-64 shrink-0 rounded-lg bg-[#020512] border border-[var(--border)] overflow-hidden flex items-center justify-center">
            {/* Holographic Crosshair Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-2 left-2 text-[0.55rem] font-mono text-[var(--accent-cyan)] opacity-75">
                RETICLE // LOCK 01
              </div>
              <div className="absolute bottom-2 left-2 text-[0.55rem] font-mono text-[var(--muted)]">
                ILLUSTRATIVE 3D MESH
              </div>
              <div className="absolute top-2 right-2 text-[0.55rem] font-mono text-[var(--accent-violet-bright)]">
                {planet.pl_eqt != null ? `${planet.pl_eqt.toFixed(0)} K` : "TEMP UNKNOWN"}
              </div>
              {/* Center crosshair marks */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-48 h-48 rounded-full border border-dashed border-[var(--accent-cyan)] animate-radar-sweep" />
              </div>
            </div>

            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 1.5]}
              style={{ background: "transparent" }}
            >
              <PlanetSphere radius={radius} color={color} />
            </Canvas>
          </div>

          {/* Planetary Telemetry Matrix */}
          <div className="flex-1 w-full space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <TelemetryRow label="HOST STAR" value={planet.hostname || "—"} />
              <TelemetryRow label="DISCOVERY YEAR" value={planet.disc_year != null ? String(planet.disc_year) : "—"} />
              <TelemetryRow label="DISCOVERY METHOD" value={planet.discoverymethod || "—"} />
              <TelemetryRow label="PLANETARY RADIUS" value={fmt(planet.pl_rade, 2)} unit="R⊕" />
              <TelemetryRow label="PLANETARY MASS" value={fmt(planet.pl_masse, 2)} unit="M⊕" />
              <TelemetryRow label="EQUILIBRIUM TEMP" value={planet.pl_eqt != null ? `${planet.pl_eqt.toFixed(0)}` : "—"} unit="K" />
              <TelemetryRow label="ORBITAL PERIOD" value={fmt(planet.pl_orbper, 2)} unit="DAYS" />
              <TelemetryRow label="SEMI-MAJOR AXIS" value={fmt(planet.pl_orbsmax, 3)} unit="AU" />
              <TelemetryRow label="DISTANCE FROM EARTH" value={fmt(planet.sy_dist, 1)} unit="PC" />
              <TelemetryRow label="STELLAR TEMP" value={planet.st_teff != null ? `${planet.st_teff.toFixed(0)}` : "—"} unit="K" />
            </div>

            {/* Color temperature telemetry tag */}
            <div className="pt-2 flex items-center gap-2 font-mono text-[0.6rem] text-[var(--muted-light)]">
              <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: `#${color.getHexString()}` }} />
              <span>Thermal profile hue mapped to estimated equilibrium temperature</span>
            </div>
          </div>
        </div>

        {/* Lower Split: Deterministic Score + Gemini AI Planetary Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
          {/* Exosense Interest Score */}
          {score && <DeterministicScoreCard score={score} />}

          {/* Gemini AI Planetary Profile */}
          <div className="p-3 rounded bg-[#050a22] border border-[var(--border)] space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill="#a78bfa" />
                </svg>
                <span className="text-[0.65rem] tracking-widest uppercase text-[var(--accent-violet-bright)] font-bold">
                  AI PLANETARY PROFILE
                </span>
              </div>
              {profileStatus === "loading" && <Spinner size={12} />}
            </div>

            <AnimatePresence mode="wait">
              {profileStatus === "loading" && (
                <motion.p
                  key="loading"
                  className="text-xs text-[var(--muted-light)] animate-pulse"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  Synthesizing planetary profile with Gemini AI…
                </motion.p>
              )}
              {profileStatus === "success" && profile && (
                <motion.p
                  key="profile"
                  className="text-xs text-[var(--foreground)] leading-relaxed font-sans"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {profile}
                </motion.p>
              )}
              {profileStatus === "error" && (
                <motion.p
                  key="error"
                  className="text-[0.65rem] text-amber-400"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  ⚠ {profileError ?? "AI profile telemetry unavailable."}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="text-[0.55rem] text-[var(--muted)] italic pt-1 border-t border-[var(--border)]/50">
              NASA verified planetary parameters synthesized by Gemini AI.
            </p>
          </div>
        </div>
      </div>
    </HudPanel>
  );
}

const PlanetViewer = memo(PlanetViewerInner);
export default PlanetViewer;
