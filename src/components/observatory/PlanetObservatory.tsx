"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore, scorePlanet } from "@/lib/scoring";
import HudPanel from "../dashboard/HudPanel";
import { Spinner } from "../dashboard/States";

interface PlanetObservatoryProps {
  planet: Exoplanet | null;
  allPlanets: Exoplanet[];
  onSelectPlanet: (planet: Exoplanet) => void;
  onNavigateToStarMap?: () => void;
  onNavigateToCompare?: (planet: Exoplanet) => void;
  onNavigateToMissionControl?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (planetName: string) => void;
  profile?: string | null;
  profileStatus?: "idle" | "loading" | "success" | "error";
  profileError?: string | null;
}

function tempToColor(eqt: number | null): THREE.Color {
  const t = eqt ?? 500;
  if (t < 300) return new THREE.Color("#4338ca"); // Cryogenic (indigo/violet)
  if (t < 600) return new THREE.Color("#0891b2"); // Cool / Temperate (cyan)
  if (t < 1000) return new THREE.Color("#059669"); // Warm Temperate (emerald)
  if (t < 1500) return new THREE.Color("#d97706"); // Warm (amber)
  if (t < 2500) return new THREE.Color("#ea580c"); // Hot (orange)
  if (t < 3500) return new THREE.Color("#dc2626"); // Hyperthermal (red)
  return new THREE.Color("#60a5fa"); // Blue-white
}

function visualRadius(pl_rade: number | null): number {
  const r = pl_rade ?? 1;
  const clamped = Math.min(Math.max(r, 0.5), 20);
  return 1.2 + (Math.log(clamped) / Math.log(20)) * 1.5;
}

function Planet3DScene({ planet }: { planet: Exoplanet }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => tempToColor(planet.pl_eqt), [planet.pl_eqt]);
  const radius = useMemo(() => visualRadius(planet.pl_rade), [planet.pl_rade]);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 4, 6]} intensity={1.8} color="#fffcf5" />
      <directionalLight position={[-5, -3, -4]} intensity={0.5} color="#818cf8" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#22d3ee" distance={20} />

      {/* Main Planetary Body */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color={color}
          roughness={0.65}
          metalness={0.15}
          emissive={color}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Atmospheric Haze Shell */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[radius * 1.08, 48, 48]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle Orbital Plane Ring */}
      <group rotation={[Math.PI / 2.3, 0, 0]}>
        <mesh>
          <ringGeometry args={[radius * 2.1, radius * 2.15, 64]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
        minDistance={3}
        maxDistance={15}
        autoRotate={false}
      />
    </>
  );
}

function TelemetryMetric({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  highlight?: boolean;
}) {
  const isAvailable = value != null && value !== "";
  const displayVal = isAvailable ? String(value) : "DATA UNAVAILABLE";

  return (
    <div className="flex justify-between items-baseline gap-2 py-2 border-b border-[var(--border)]/60 last:border-0 font-mono text-xs">
      <span className="text-[0.62rem] tracking-wider uppercase text-[var(--muted)] shrink-0">
        {label}
      </span>
      <span
        className={`text-right font-medium tabular-nums ${
          !isAvailable
            ? "text-[var(--muted)] text-[0.6rem] tracking-widest uppercase italic"
            : highlight
            ? "text-[var(--accent-cyan-bright)] font-bold"
            : "text-slate-100"
        }`}
      >
        {displayVal} {isAvailable && unit && <span className="text-[var(--muted-light)] text-[0.65rem]">{unit}</span>}
      </span>
    </div>
  );
}

export default function PlanetObservatory({
  planet,
  allPlanets,
  onSelectPlanet,
  onNavigateToStarMap,
  onNavigateToCompare,
  onNavigateToMissionControl,
  isFavorite = false,
  onToggleFavorite,
  profile,
  profileStatus = "idle",
  profileError,
}: PlanetObservatoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fallback to first planet if none selected
  const activePlanet = planet || allPlanets[0] || null;

  const score: PlanetScore | null = useMemo(() => {
    return activePlanet ? scorePlanet(activePlanet) : null;
  }, [activePlanet]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allPlanets
      .filter((p) => p.pl_name.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allPlanets, searchQuery]);

  // Canvas Mission Card Export
  const handleExportMissionCard = useCallback(() => {
    if (!activePlanet) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#02040a");
    bgGrad.addColorStop(0.5, "#060c24");
    bgGrad.addColorStop(1, "#020512");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Frame border
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 550);

    // Corner brackets
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(30, 60); ctx.lineTo(30, 30); ctx.lineTo(60, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1140, 30); ctx.lineTo(1170, 30); ctx.lineTo(1170, 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 570); ctx.lineTo(30, 600); ctx.lineTo(60, 600); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1140, 600); ctx.lineTo(1170, 600); ctx.lineTo(1170, 570); ctx.stroke();

    // Header Title
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#22d3ee";
    ctx.fillText("EXOSENSE // PLANETARY INTELLIGENCE CARD", 70, 90);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("VERIFIED NASA EXOPLANET ARCHIVE TELEMETRY", 70, 115);

    // Planet Name
    ctx.font = "bold 44px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(activePlanet.pl_name, 70, 180);

    // Subtitle
    ctx.font = "16px monospace";
    ctx.fillStyle = "#a78bfa";
    ctx.fillText(`HOST SYSTEM: ${activePlanet.hostname} · DISC. ${activePlanet.disc_year ?? "Unknown"} (${activePlanet.discoverymethod ?? "Method ?"})`, 70, 215);

    // Score Badge Box
    ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(850, 70, 280, 120);
    ctx.strokeRect(850, 70, 280, 120);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("EXOSENSE SCORE", 870, 105);

    ctx.font = "bold 48px monospace";
    ctx.fillStyle = "#22d3ee";
    ctx.fillText(`${score?.score ?? "—"}/100`, 870, 160);

    // 4 Telemetry Spec Boxes
    const metrics = [
      { label: "PLANETARY RADIUS", val: activePlanet.pl_rade != null ? `${activePlanet.pl_rade.toFixed(2)} R⊕` : "UNAVAILABLE" },
      { label: "EQUILIBRIUM TEMP", val: activePlanet.pl_eqt != null ? `${activePlanet.pl_eqt.toFixed(0)} K` : "UNAVAILABLE" },
      { label: "DISTANCE FROM EARTH", val: activePlanet.sy_dist != null ? `${activePlanet.sy_dist.toFixed(1)} pc` : "UNAVAILABLE" },
      { label: "ORBITAL PERIOD", val: activePlanet.pl_orbper != null ? `${activePlanet.pl_orbper.toFixed(2)} d` : "UNAVAILABLE" },
    ];

    metrics.forEach((m, idx) => {
      const x = 70 + idx * 270;
      const y = 255;
      ctx.fillStyle = "rgba(13, 20, 43, 0.85)";
      ctx.strokeStyle = "#172346";
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, 250, 85);
      ctx.strokeRect(x, y, 250, 85);

      ctx.font = "11px monospace";
      ctx.fillStyle = "#64748b";
      ctx.fillText(m.label, x + 15, y + 28);

      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(m.val, x + 15, y + 60);
    });

    // AI Summary Box
    ctx.fillStyle = "rgba(5, 10, 34, 0.9)";
    ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
    ctx.fillRect(70, 365, 1060, 160);
    ctx.strokeRect(70, 365, 1060, 160);

    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("AI MISSION COPILOT INTELLIGENCE SYNTHESIS", 90, 395);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    const summaryText = profile || "Planetary characteristics and orbital parameters cataloged by NASA Exoplanet Archive and verified by Exosense.";
    
    // Simple text wrapper
    const words = summaryText.split(" ");
    let line = "";
    let y = 425;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metricsText = ctx.measureText(testLine);
      if (metricsText.width > 1000 && n > 0) {
        ctx.fillText(line, 90, y);
        line = words[n] + " ";
        y += 24;
        if (y > 495) break;
      } else {
        line = testLine;
      }
    }
    if (y <= 495) ctx.fillText(line, 90, y);

    // Footer Disclaimer
    ctx.font = "11px monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText("EXOSENSE EXPLORATION PLATFORM · DATA SOURCE: NASA EXOPLANET ARCHIVE · ILLUSTRATIVE 3D MODEL", 70, 565);

    // Download trigger
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Exosense_MissionCard_${activePlanet.pl_name.replace(/\s+/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [activePlanet, score, profile]);

  if (!activePlanet) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center bg-[#01030b] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--muted)] gap-3">
        <span className="text-sm text-slate-300">NO EXOPLANET TARGET SELECTED</span>
        <p className="text-[0.68rem] text-[var(--muted-light)]">
          Select a candidate world from Mission Control or the Deep Space Star Map to enter the Observatory.
        </p>
        {onNavigateToStarMap && (
          <button
            onClick={onNavigateToStarMap}
            className="px-4 py-2 rounded bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] font-bold uppercase tracking-wider hover:bg-[var(--accent-cyan)]/30 transition-all cursor-pointer"
          >
            🌌 Open Star Map
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 select-none font-mono">
      {/* ── Observatory Command Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md">
        {/* Left: Target Identity Banner */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30 flex items-center justify-center text-lg text-[var(--accent-cyan-bright)] font-bold">
            🔭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-wider text-white">
                {activePlanet.pl_name}
              </h2>
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] font-bold uppercase">
                TARGET OBSERVATORY
              </span>
            </div>
            <p className="text-[0.65rem] text-[var(--muted-light)] uppercase tracking-wider">
              Host System: {activePlanet.hostname} · Disc. {activePlanet.disc_year ?? "Unknown"} ({activePlanet.discoverymethod ?? "Method ?"})
            </p>
          </div>
        </div>

        {/* Center: Quick Target Switcher Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Switch target world..."
            className="w-full bg-[#05091c] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
          />
          <AnimatePresence>
            {isSearchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 rounded bg-[#030718]/95 border border-[var(--border)] shadow-2xl z-30 max-h-48 overflow-y-auto text-xs"
              >
                {searchResults.map((p) => (
                  <button
                    key={p.pl_name}
                    onClick={() => {
                      onSelectPlanet(p);
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--accent-cyan)]/15 border-b border-[var(--border)]/40 last:border-0 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-[var(--accent-cyan-bright)]">{p.pl_name}</span>
                    <span className="text-[0.65rem] text-[var(--muted)]">{p.sy_dist != null ? `${p.sy_dist.toFixed(1)} pc` : "—"}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Quick Action Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportMissionCard}
            className="px-3 py-1.5 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Download PNG Planetary Mission Card"
          >
            <span>📥 Export Card</span>
          </button>

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(activePlanet.pl_name)}
              className={`px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                isFavorite
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-[#060c28] border-[var(--border)] text-[var(--muted-light)] hover:text-white"
              }`}
            >
              <span>{isFavorite ? "★ Saved in Mission" : "☆ Save to Mission"}</span>
            </button>
          )}

          {onNavigateToCompare && (
            <button
              onClick={() => onNavigateToCompare(activePlanet)}
              className="px-3 py-1.5 rounded bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30 border border-[var(--accent-violet)]/40 text-[var(--accent-violet-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚖️ Compare World</span>
            </button>
          )}

          {onNavigateToStarMap && (
            <button
              onClick={onNavigateToStarMap}
              className="px-3 py-1.5 rounded bg-[#070e28] hover:bg-[#0c1640] border border-[var(--border)] hover:border-[var(--accent-cyan)] text-[var(--muted-light)] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🌌 Star Map</span>
            </button>
          )}

          {onNavigateToMissionControl && (
            <button
              onClick={onNavigateToMissionControl}
              className="px-3 py-1.5 rounded bg-[#070e28] hover:bg-[#0c1640] border border-[var(--border)] text-[var(--muted-light)] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              🛰️ Mission Control
            </button>
          )}
        </div>
      </div>

      {/* ── Main Observatory Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center: Large 3D Planet Viewport & Orbital Diagram (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 3D Visualizer HUD Canvas */}
          <HudPanel
            title={`${activePlanet.pl_name} // 3D MODEL`}
            moduleCode="OBS-3D"
            badge={{ text: "INTERACTIVE MESH", variant: "cyan" }}
            cornerAccent="cyan"
            className="flex flex-col"
            noPadding
          >
            <div className="relative w-full h-[400px] sm:h-[460px] bg-[#020512] overflow-hidden">
              <Canvas
                camera={{ position: [0, 0, 7.5], fov: 45 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 1.5]}
              >
                <color attach="background" args={["#01040f"]} />
                <Planet3DScene planet={activePlanet} />
              </Canvas>

              {/* Viewport Overlay Badges */}
              <div className="absolute top-3 left-3 pointer-events-none">
                <div className="px-2 py-1 rounded bg-[#030616]/80 border border-[var(--border)] text-[0.6rem] text-[var(--muted-light)]">
                  ROTATION: ~0.20 rad/s · DRAG TO ORBIT
                </div>
              </div>

              {/* Bottom Disclaimer */}
              <div className="absolute bottom-3 left-3 right-3 pointer-events-none text-center">
                <div className="inline-block px-3 py-1 rounded bg-[#020510]/85 border border-[var(--border)]/70 text-[0.56rem] text-[var(--muted)] shadow-md">
                  Illustrative 3D visualization. Physical properties are scaled from NASA parameters; surface texture is a rendered model and not photographic imagery.
                </div>
              </div>
            </div>
          </HudPanel>

          {/* Visual Size Scale & Habitable Zone Architecture */}
          <HudPanel
            title="Physical Scale & Habitable Zone Profile"
            moduleCode="SCALE-HZ"
            badge={{ text: "COMPARATIVE METRICS", variant: "cyan" }}
            cornerAccent="cyan"
          >
            <div className="space-y-4">
              {/* Planetary Radius Silhouette Comparison */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[0.6rem] text-[var(--muted-light)] uppercase font-bold">
                  <span>RELATIVE PHYSICAL SCALE (EARTH vs TARGET vs JUPITER)</span>
                  <span className="text-[var(--accent-cyan-bright)]">
                    {activePlanet.pl_rade != null ? `${activePlanet.pl_rade.toFixed(2)} R⊕` : "RADIUS ?"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#020512] border border-[var(--border)] flex items-end justify-around gap-2 h-24">
                  {/* Earth (1.00 R⊕) */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="rounded-full bg-blue-500/80 border border-blue-300 shadow-[0_0_8px_#3b82f6]"
                      style={{ width: 20, height: 20 }}
                    />
                    <span className="text-[0.55rem] text-[var(--muted-light)]">Earth (1.0 R⊕)</span>
                  </div>

                  {/* Target Planet */}
                  <div className="flex flex-col items-center gap-1">
                    {activePlanet.pl_rade != null ? (
                      <div
                        className="rounded-full bg-[var(--accent-cyan)] border border-white/80 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                        style={{
                          width: Math.min(Math.max(activePlanet.pl_rade * 20, 10), 64),
                          height: Math.min(Math.max(activePlanet.pl_rade * 20, 10), 64),
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full border border-dashed border-[var(--muted)] flex items-center justify-center text-[0.5rem] text-[var(--muted)]"
                        style={{ width: 24, height: 24 }}
                      >
                        ?
                      </div>
                    )}
                    <span className="text-[0.55rem] font-bold text-[var(--accent-cyan-bright)] truncate max-w-[110px]">
                      {activePlanet.pl_name} ({activePlanet.pl_rade != null ? `${activePlanet.pl_rade.toFixed(2)} R⊕` : "—"})
                    </span>
                  </div>

                  {/* Jupiter (11.20 R⊕) */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="rounded-full bg-amber-600/40 border border-amber-400"
                      style={{ width: 56, height: 56 }}
                    />
                    <span className="text-[0.55rem] text-[var(--muted-light)]">Jupiter (11.2 R⊕)</span>
                  </div>
                </div>
              </div>

              {/* Habitable Zone Thermal Gauge */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[0.6rem] text-[var(--muted-light)] uppercase font-bold">
                  <span>THERMAL REGIME // GOLDILOCKS ZONE</span>
                  <span className="text-[var(--accent-violet-bright)]">
                    {activePlanet.pl_eqt != null ? `${activePlanet.pl_eqt.toFixed(0)} K` : "TEMP UNAVAILABLE"}
                  </span>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg bg-[#020512] border border-[var(--border)]">
                  <div className="h-3 rounded overflow-hidden flex text-[0.5rem] font-bold text-center text-black font-mono">
                    <div className="w-1/3 bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center opacity-85">
                      CRYO (&lt;200K)
                    </div>
                    <div className="w-1/3 bg-emerald-400 flex items-center justify-center shadow-inner">
                      HABITABLE (200-350K)
                    </div>
                    <div className="w-1/3 bg-gradient-to-r from-amber-400 to-red-500 flex items-center justify-center opacity-85">
                      HOT (&gt;350K)
                    </div>
                  </div>

                  <div className="flex justify-between text-[0.55rem] text-[var(--muted)] pt-0.5">
                    <span>Extreme Cold</span>
                    <span className="text-emerald-400 font-semibold">
                      {activePlanet.pl_eqt != null && activePlanet.pl_eqt >= 200 && activePlanet.pl_eqt <= 350
                        ? "✓ INSIDE TEMPERATE RANGE"
                        : activePlanet.pl_eqt != null && activePlanet.pl_eqt > 350
                        ? "⚠ HYPER-THERMAL REGIME"
                        : activePlanet.pl_eqt != null
                        ? "⚠ SUB-FREEZE REGIME"
                        : "UNMEASURED IN NASA ARCHIVE"}
                    </span>
                    <span>Extreme Heat</span>
                  </div>
                </div>
              </div>
            </div>
          </HudPanel>

          {/* Stylized Orbital Architecture Diagram */}
          <HudPanel
            title="Orbital Architecture"
            moduleCode="ORB-DYN"
            badge={{ text: "SYSTEM TELEMETRY", variant: "violet" }}
            cornerAccent="blue"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded bg-[#04081c] border border-[var(--border)] text-center space-y-1">
                <span className="text-[0.6rem] text-[var(--muted)] uppercase block">Semi-Major Axis</span>
                <span className="text-sm font-bold text-[var(--accent-cyan-bright)] tabular-nums">
                  {activePlanet.pl_orbsmax != null ? `${activePlanet.pl_orbsmax.toFixed(3)} AU` : "DATA UNAVAILABLE"}
                </span>
                <span className="text-[0.58rem] text-[var(--muted)] block">Distance from Star</span>
              </div>

              <div className="p-3 rounded bg-[#04081c] border border-[var(--border)] text-center space-y-1">
                <span className="text-[0.6rem] text-[var(--muted)] uppercase block">Orbital Period</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {activePlanet.pl_orbper != null ? `${activePlanet.pl_orbper.toFixed(2)} d` : "DATA UNAVAILABLE"}
                </span>
                <span className="text-[0.58rem] text-[var(--muted)] block">Year Duration</span>
              </div>

              <div className="p-3 rounded bg-[#04081c] border border-[var(--border)] text-center space-y-1">
                <span className="text-[0.6rem] text-[var(--muted)] uppercase block">Host Star Temp</span>
                <span className="text-sm font-bold text-[var(--accent-amber)] tabular-nums">
                  {activePlanet.st_teff != null ? `${activePlanet.st_teff.toFixed(0)} K` : "DATA UNAVAILABLE"}
                </span>
                <span className="text-[0.58rem] text-[var(--muted)] block">Stellar Effective Temp</span>
              </div>
            </div>
          </HudPanel>

          {/* Grounded AI Mission Analysis Brief */}
          <HudPanel
            title="AI Mission Intelligence Brief"
            moduleCode="GEMINI-AI"
            badge={{ text: "SYNTHESIZED PROFILE", variant: "violet" }}
            cornerAccent="cyan"
          >
            <div className="space-y-3 text-xs">
              {profileStatus === "loading" && (
                <div className="flex items-center gap-2 text-[var(--accent-violet-bright)] p-3">
                  <Spinner size={14} />
                  <span className="text-[0.68rem] tracking-wider uppercase animate-pulse">
                    Synthesizing plain-language planet intelligence profile…
                  </span>
                </div>
              )}

              {profileStatus === "error" && profileError && (
                <div className="p-3 rounded bg-red-950/20 border border-red-800/40 text-red-300 text-xs">
                  ⚠ {profileError}
                </div>
              )}

              {profile && profileStatus === "success" && (
                <div className="p-3.5 rounded bg-[#050a22] border border-[var(--border)] space-y-2 font-sans text-slate-200 leading-relaxed text-xs">
                  <p>{profile}</p>
                </div>
              )}

              {!profile && profileStatus === "idle" && (
                <p className="text-[0.68rem] text-[var(--muted-light)] italic p-2">
                  Select or inspect target world to receive AI profile telemetry.
                </p>
              )}
            </div>
          </HudPanel>
        </div>

        {/* Right: Full Telemetry Matrix & Exosense Interest Score (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Exosense Interest Score Card */}
          {score && (
            <HudPanel
              title="Exosense Interest Score"
              moduleCode="METRIC-01"
              badge={{
                text: `${score.score}/100`,
                variant: score.score >= 60 ? "emerald" : score.score >= 35 ? "amber" : "muted",
              }}
              cornerAccent="cyan"
            >
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.62rem] text-[var(--muted-light)] uppercase tracking-wider font-bold">
                    EXPLORATORY INTEREST RATING
                  </span>
                  <span className="text-2xl font-black tabular-nums text-[var(--accent-cyan-bright)]">
                    {score.score}<span className="text-xs text-[var(--muted)]">/100</span>
                  </span>
                </div>

                {/* Score Factor Breakdown Bars */}
                <div className="space-y-2 pt-1 border-t border-[var(--border)]/60">
                  {score.factors.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex justify-between text-[0.6rem]">
                        <span className="text-slate-300">{f.name}</span>
                        <span className="text-[var(--muted-light)] tabular-nums">
                          {f.available ? `${(f.value * 100).toFixed(0)}%` : "UNAVAILABLE"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#020512] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${f.available ? f.value * 100 : 0}%`,
                            backgroundColor: f.available ? "#06b6d4" : "#334155",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[0.62rem] text-[var(--muted-light)] leading-snug pt-1">
                  {score.explanation}
                </p>

                <div className="p-2 rounded bg-[#020512] border border-[var(--border)] text-[0.55rem] text-[var(--muted)] leading-tight">
                  Exploratory/comparative metric computed deterministically from data completeness, radius, and temperature. Not a validated scientific habitability determination.
                </div>
              </div>
            </HudPanel>
          )}

          {/* Planetary Physical Telemetry */}
          <HudPanel
            title="Planetary Physical Telemetry"
            moduleCode="PHYS-MAT"
            badge={{ text: "NASA ARCHIVE", variant: "cyan" }}
            cornerAccent="cyan"
          >
            <div className="space-y-0.5">
              <TelemetryMetric label="Planet Radius" value={activePlanet.pl_rade != null ? activePlanet.pl_rade.toFixed(2) : null} unit="Earth radii (R⊕)" highlight />
              <TelemetryMetric label="Planet Mass" value={activePlanet.pl_masse != null ? activePlanet.pl_masse.toFixed(2) : null} unit="Earth masses (M⊕)" />
              <TelemetryMetric label="Equilibrium Temp" value={activePlanet.pl_eqt != null ? activePlanet.pl_eqt.toFixed(0) : null} unit="Kelvin (K)" highlight />
              <TelemetryMetric label="Orbital Period" value={activePlanet.pl_orbper != null ? activePlanet.pl_orbper.toFixed(2) : null} unit="days" />
              <TelemetryMetric label="Semi-Major Axis" value={activePlanet.pl_orbsmax != null ? activePlanet.pl_orbsmax.toFixed(3) : null} unit="AU" />
              <TelemetryMetric label="Distance from Earth" value={activePlanet.sy_dist != null ? activePlanet.sy_dist.toFixed(1) : null} unit="parsecs (pc)" highlight />
            </div>
          </HudPanel>

          {/* Host Star & Discovery Record */}
          <HudPanel
            title="Host Star & Discovery Record"
            moduleCode="HOST-REC"
            badge={{ text: "CATALOG SPEC", variant: "blue" }}
            cornerAccent="blue"
          >
            <div className="space-y-0.5">
              <TelemetryMetric label="Host Star Name" value={activePlanet.hostname} highlight />
              <TelemetryMetric label="Stellar Temperature" value={activePlanet.st_teff != null ? activePlanet.st_teff.toFixed(0) : null} unit="K" />
              <TelemetryMetric label="Stellar Radius" value={activePlanet.st_rad != null ? activePlanet.st_rad.toFixed(2) : null} unit="Solar radii (R☉)" />
              <TelemetryMetric label="Stellar Mass" value={activePlanet.st_mass != null ? activePlanet.st_mass.toFixed(2) : null} unit="Solar masses (M☉)" />
              <TelemetryMetric label="Discovery Year" value={activePlanet.disc_year} />
              <TelemetryMetric label="Discovery Technique" value={activePlanet.discoverymethod} highlight />
              <TelemetryMetric label="Archive Source" value="NASA Exoplanet Archive (pscomppars)" />
            </div>
          </HudPanel>
        </div>
      </div>
    </div>
  );
}
