"use client";

import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore, scorePlanet } from "@/lib/scoring";
import HudPanel from "../dashboard/HudPanel";
import { Spinner } from "../dashboard/States";

interface WorldComparisonProps {
  allPlanets: Exoplanet[];
  initialPlanetA?: Exoplanet | null;
  initialPlanetB?: Exoplanet | null;
  onNavigateToObservatory?: (planet: Exoplanet) => void;
  onNavigateToStarMap?: () => void;
  onNavigateToMissionControl?: () => void;
}

function tempToColor(eqt: number | null): THREE.Color {
  const t = eqt ?? 500;
  if (t < 300) return new THREE.Color("#4338ca");
  if (t < 600) return new THREE.Color("#0891b2");
  if (t < 1000) return new THREE.Color("#059669");
  if (t < 1500) return new THREE.Color("#d97706");
  if (t < 2500) return new THREE.Color("#ea580c");
  return new THREE.Color("#dc2626");
}

function visualRadius(pl_rade: number | null): number {
  const r = pl_rade ?? 1;
  const clamped = Math.min(Math.max(r, 0.5), 20);
  return 0.9 + (Math.log(clamped) / Math.log(20)) * 1.3;
}

function MiniPlanetSphere({ planet }: { planet: Exoplanet }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => tempToColor(planet.pl_eqt), [planet.pl_eqt]);
  const radius = useMemo(() => visualRadius(planet.pl_rade), [planet.pl_rade]);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 4, 5]} intensity={1.5} color="#fffcf5" />
      <directionalLight position={[-3, -2, -3]} intensity={0.4} color="#818cf8" />
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.08, 24, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function MetricComparisonBar({
  label,
  valA,
  valB,
  unit,
  format = (v) => v.toFixed(2),
}: {
  label: string;
  valA: number | null;
  valB: number | null;
  unit: string;
  format?: (v: number) => string;
}) {
  const isAvailA = valA != null;
  const isAvailB = valB != null;

  const maxVal = Math.max(valA ?? 1, valB ?? 1, 1);
  const pctA = isAvailA ? Math.min(100, Math.max(5, ((valA as number) / maxVal) * 100)) : 0;
  const pctB = isAvailB ? Math.min(100, Math.max(5, ((valB as number) / maxVal) * 100)) : 0;

  return (
    <div className="space-y-1.5 p-2.5 rounded bg-[#04081c] border border-[var(--border)] font-mono text-xs">
      <div className="flex justify-between items-center text-[0.62rem] uppercase tracking-wider text-[var(--muted-light)]">
        <span className="font-bold text-[var(--accent-cyan-bright)]">
          {isAvailA ? `${format(valA as number)} ${unit}` : "UNAVAILABLE"}
        </span>
        <span className="text-[var(--muted)] font-semibold">{label}</span>
        <span className="font-bold text-[var(--accent-violet-bright)]">
          {isAvailB ? `${format(valB as number)} ${unit}` : "UNAVAILABLE"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* World A bar (Right aligned) */}
        <div className="w-full h-2 rounded bg-[#020512] flex justify-end overflow-hidden">
          <div
            className="h-full rounded bg-[var(--accent-cyan)] transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
        </div>
        {/* World B bar (Left aligned) */}
        <div className="w-full h-2 rounded bg-[#020512] flex justify-start overflow-hidden">
          <div
            className="h-full rounded bg-[var(--accent-violet)] transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PlanetSelector({
  label,
  selectedPlanet,
  allPlanets,
  onSelect,
  accentColor,
}: {
  label: string;
  selectedPlanet: Exoplanet;
  allPlanets: Exoplanet[];
  onSelect: (p: Exoplanet) => void;
  accentColor: "cyan" | "violet";
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allPlanets
      .filter((p) => p.pl_name.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allPlanets, query]);

  const borderClass = accentColor === "cyan" ? "border-[var(--accent-cyan)]/40" : "border-[var(--accent-violet)]/40";
  const badgeClass = accentColor === "cyan" ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)]" : "bg-[var(--accent-violet)]/20 text-[var(--accent-violet-bright)]";

  return (
    <div className={`p-3.5 rounded-lg bg-[#04081c]/90 border ${borderClass} space-y-2 relative`}>
      <div className="flex items-center justify-between">
        <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded tracking-widest uppercase ${badgeClass}`}>
          {label}
        </span>
        <span className="text-xs font-bold text-white truncate max-w-[160px]">
          {selectedPlanet.pl_name}
        </span>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search and swap world..."
          className="w-full bg-[#020512] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-white transition-colors"
        />

        <AnimatePresence>
          {isOpen && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 rounded bg-[#020514] border border-[var(--border)] shadow-2xl z-40 max-h-48 overflow-y-auto text-xs"
            >
              {results.map((p) => (
                <button
                  key={p.pl_name}
                  onClick={() => {
                    onSelect(p);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-white/10 border-b border-[var(--border)]/40 last:border-0 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-bold text-white">{p.pl_name}</span>
                  <span className="text-[0.62rem] text-[var(--muted)]">{p.hostname}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WorldComparison({
  allPlanets,
  initialPlanetA,
  initialPlanetB,
  onNavigateToObservatory,
  onNavigateToStarMap,
  onNavigateToMissionControl,
}: WorldComparisonProps) {
  // Ensure we have two distinct planets
  const [planetA, setPlanetA] = useState<Exoplanet>(
    initialPlanetA || allPlanets[0] || ({ pl_name: "Target A", hostname: "Host A" } as Exoplanet)
  );

  const [planetB, setPlanetB] = useState<Exoplanet>(
    initialPlanetB || allPlanets[1] || allPlanets[0] || ({ pl_name: "Target B", hostname: "Host B" } as Exoplanet)
  );

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const scoreA: PlanetScore = useMemo(() => scorePlanet(planetA), [planetA]);
  const scoreB: PlanetScore = useMemo(() => scorePlanet(planetB), [planetB]);

  function handleSwap() {
    const temp = planetA;
    setPlanetA(planetB);
    setPlanetB(temp);
    setAnalysis(null);
    setAnalysisStatus("idle");
  }

  async function handleAnalyzeComparison() {
    if (planetA.pl_name === planetB.pl_name) {
      setAnalysisStatus("error");
      setAnalysisError("Cannot compare a world with itself. Select two distinct exoplanets.");
      return;
    }

    setAnalysisStatus("loading");
    setAnalysisError(null);

    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planetA, planetB }),
      });

      const data = await res.json();
      if (data.error) {
        setAnalysisStatus("error");
        setAnalysisError(data.error);
      } else if (data.analysis) {
        setAnalysis(data.analysis);
        setAnalysisStatus("success");
      }
    } catch {
      setAnalysisStatus("error");
      setAnalysisError("Telemetry connection to comparative AI interrupted.");
    }
  }

  const isSamePlanet = planetA.pl_name === planetB.pl_name;

  return (
    <div className="w-full flex flex-col gap-5 select-none font-mono">
      {/* ── Top Header & Mode Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-violet)]/15 border border-[var(--accent-violet)]/30 flex items-center justify-center text-lg text-[var(--accent-violet-bright)] font-bold">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-wider text-white">
                DUAL WORLD ANALYSIS
              </h2>
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded bg-[var(--accent-violet)]/20 border border-[var(--accent-violet)]/40 text-[var(--accent-violet-bright)] font-bold uppercase">
                COMPARISON STATION
              </span>
            </div>
            <p className="text-[0.65rem] text-[var(--muted-light)] uppercase tracking-wider">
              Simultaneous NASA physical parameter and Exosense score evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToObservatory && (
            <button
              onClick={() => onNavigateToObservatory(planetA)}
              className="px-3 py-1.5 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🔭 Open Observatory</span>
            </button>
          )}

          {onNavigateToStarMap && (
            <button
              onClick={onNavigateToStarMap}
              className="px-3 py-1.5 rounded bg-[#070e28] hover:bg-[#0c1640] border border-[var(--border)] text-[var(--muted-light)] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
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

      {/* ── World Selector Deck ── */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
        <div className="md:col-span-5">
          <PlanetSelector
            label="WORLD A"
            selectedPlanet={planetA}
            allPlanets={allPlanets}
            onSelect={(p) => {
              setPlanetA(p);
              setAnalysis(null);
            }}
            accentColor="cyan"
          />
        </div>

        <div className="md:col-span-1 flex justify-center">
          <button
            onClick={handleSwap}
            className="p-2.5 rounded-full bg-[#060c28] hover:bg-[#0e1b50] border border-[var(--border)] hover:border-[var(--accent-cyan)] text-[var(--accent-cyan-bright)] transition-all cursor-pointer shadow-md"
            title="Swap World A and World B"
          >
            ⇄
          </button>
        </div>

        <div className="md:col-span-5">
          <PlanetSelector
            label="WORLD B"
            selectedPlanet={planetB}
            allPlanets={allPlanets}
            onSelect={(p) => {
              setPlanetB(p);
              setAnalysis(null);
            }}
            accentColor="violet"
          />
        </div>
      </div>

      {isSamePlanet && (
        <div className="p-3 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs font-mono text-center">
          ⚠ Both selectors currently target the same planet ({planetA.pl_name}). Select another world on either side to compute a comparative matrix.
        </div>
      )}

      {/* ── Dual 3D Mini-Observatory Spheres ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* World A Mini 3D */}
        <HudPanel
          title={`${planetA.pl_name} // 3D PROJECTION`}
          moduleCode="WORLD-A"
          badge={{ text: "CYAN SPEC", variant: "cyan" }}
          cornerAccent="cyan"
          noPadding
        >
          <div className="relative w-full h-[220px] bg-[#020512] overflow-hidden">
            <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ antialias: true, alpha: false }}>
              <color attach="background" args={["#01030d"]} />
              <MiniPlanetSphere planet={planetA} />
            </Canvas>
            <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[0.6rem] font-mono text-[var(--muted-light)]">
              <span>{planetA.pl_rade != null ? `${planetA.pl_rade.toFixed(2)} R⊕` : "Radius ?"}</span>
              <span>{planetA.pl_eqt != null ? `${planetA.pl_eqt.toFixed(0)} K` : "Temp ?"}</span>
            </div>
          </div>
        </HudPanel>

        {/* World B Mini 3D */}
        <HudPanel
          title={`${planetB.pl_name} // 3D PROJECTION`}
          moduleCode="WORLD-B"
          badge={{ text: "VIOLET SPEC", variant: "violet" }}
          cornerAccent="blue"
          noPadding
        >
          <div className="relative w-full h-[220px] bg-[#020512] overflow-hidden">
            <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ antialias: true, alpha: false }}>
              <color attach="background" args={["#01030d"]} />
              <MiniPlanetSphere planet={planetB} />
            </Canvas>
            <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[0.6rem] font-mono text-[var(--muted-light)]">
              <span>{planetB.pl_rade != null ? `${planetB.pl_rade.toFixed(2)} R⊕` : "Radius ?"}</span>
              <span>{planetB.pl_eqt != null ? `${planetB.pl_eqt.toFixed(0)} K` : "Temp ?"}</span>
            </div>
          </div>
        </HudPanel>
      </div>

      {/* ── Comparative Metrics Matrix ── */}
      <HudPanel
        title="Physical & Observational Parameter Differential"
        moduleCode="DIFF-MAT"
        badge={{ text: "DUAL TELEMETRY", variant: "cyan" }}
        cornerAccent="cyan"
      >
        <div className="space-y-2">
          <MetricComparisonBar
            label="Exosense Interest Score"
            valA={scoreA.score}
            valB={scoreB.score}
            unit="/ 100"
            format={(v) => v.toFixed(0)}
          />
          <MetricComparisonBar
            label="Planet Radius"
            valA={planetA.pl_rade}
            valB={planetB.pl_rade}
            unit="R⊕"
          />
          <MetricComparisonBar
            label="Equilibrium Temperature"
            valA={planetA.pl_eqt}
            valB={planetB.pl_eqt}
            unit="K"
            format={(v) => v.toFixed(0)}
          />
          <MetricComparisonBar
            label="Distance from Earth"
            valA={planetA.sy_dist}
            valB={planetB.sy_dist}
            unit="pc"
            format={(v) => v.toFixed(1)}
          />
          <MetricComparisonBar
            label="Orbital Period"
            valA={planetA.pl_orbper}
            valB={planetB.pl_orbper}
            unit="days"
          />
          <MetricComparisonBar
            label="Semi-Major Axis"
            valA={planetA.pl_orbsmax}
            valB={planetB.pl_orbsmax}
            unit="AU"
            format={(v) => v.toFixed(3)}
          />
        </div>
      </HudPanel>

      {/* ── Grounded Gemini Comparative Intelligence Briefing ── */}
      <HudPanel
        title="AI Comparative Intelligence Briefing"
        moduleCode="COMP-AI"
        badge={{ text: "GEMINI REASONING", variant: "violet" }}
        headerRight={
          <button
            onClick={handleAnalyzeComparison}
            disabled={analysisStatus === "loading" || isSamePlanet}
            className="px-3 py-1 rounded bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30 border border-[var(--accent-violet)]/40 text-[var(--accent-violet-bright)] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            {analysisStatus === "loading" ? <Spinner size={12} /> : "⚡ Analyze Comparison"}
          </button>
        }
        cornerAccent="cyan"
      >
        <div className="space-y-3 font-mono text-xs">
          {analysisStatus === "loading" && (
            <div className="flex items-center gap-2 text-[var(--accent-violet-bright)] p-3">
              <Spinner size={14} />
              <span className="text-[0.68rem] tracking-wider uppercase animate-pulse">
                Evaluating comparative observational divergence with Gemini…
              </span>
            </div>
          )}

          {analysisStatus === "error" && analysisError && (
            <div className="p-3 rounded bg-red-950/20 border border-red-800/40 text-red-300">
              ⚠ {analysisError}
            </div>
          )}

          {analysis && analysisStatus === "success" && (
            <div className="p-3.5 rounded bg-[#050a22] border border-[var(--border)] space-y-2 font-sans text-slate-200 leading-relaxed">
              <div className="whitespace-pre-line leading-relaxed">{analysis}</div>
            </div>
          )}

          {!analysis && analysisStatus === "idle" && (
            <div className="flex items-center justify-between p-3 rounded bg-[#04081c] border border-[var(--border)] text-[var(--muted-light)]">
              <span>Click "Analyze Comparison" to generate a grounded scientific evaluation between {planetA.pl_name} and {planetB.pl_name}.</span>
              <button
                onClick={handleAnalyzeComparison}
                disabled={isSamePlanet}
                className="px-3 py-1 rounded bg-[var(--accent-violet)]/20 text-[var(--accent-violet-bright)] font-bold text-xs uppercase cursor-pointer"
              >
                Synthesize
              </button>
            </div>
          )}
        </div>
      </HudPanel>
    </div>
  );
}
