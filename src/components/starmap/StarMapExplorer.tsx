"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { FilterValues, DEFAULT_FILTERS } from "@/lib/filterDefaults";
import { PlanetScore, scorePlanet } from "@/lib/scoring";
import {
  calculatePlanet3DPositions,
  Planet3DPosition,
  METHOD_PALETTE,
} from "@/lib/coordinates";
import HudPanel from "../dashboard/HudPanel";
import { Spinner } from "../dashboard/States";

const StarMapCanvas = dynamic(() => import("./StarMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#01030b] font-mono text-xs text-[var(--accent-cyan)] gap-3">
      <div className="w-16 h-16 rounded-full border border-dashed border-[var(--accent-cyan)] animate-radar-sweep opacity-60" />
      <span className="tracking-widest uppercase animate-pulse">Initializing Deep Space Star Map…</span>
    </div>
  ),
});

interface StarMapExplorerProps {
  planets: Exoplanet[];
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  selectedPlanet: Exoplanet | null;
  onSelectPlanet: (planet: Exoplanet | null) => void;
  onOpenObservatory?: (planet: Exoplanet) => void;
  profile?: string | null;
  profileStatus?: "idle" | "loading" | "success" | "error";
  profileError?: string | null;
}

export default function StarMapExplorer({
  planets,
  filters,
  onFilterChange,
  selectedPlanet,
  onSelectPlanet,
  onOpenObservatory,
  profile,
  profileStatus,
  profileError,
}: StarMapExplorerProps) {
  // Visual Color Mode: "temp" | "method" | "radius"
  const [colorMode, setColorMode] = useState<"temp" | "method" | "radius">("temp");
  const [hoveredPlanet, setHoveredPlanet] = useState<Exoplanet | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 1. Calculate 3D positions for all currently filtered planets
  const nodes: Planet3DPosition[] = useMemo(() => {
    return calculatePlanet3DPositions(planets, colorMode);
  }, [planets, colorMode]);

  // 2. Lookup map for fast position resolution
  const nodeMap = useMemo(() => {
    const map = new Map<string, Planet3DPosition>();
    for (const node of nodes) {
      map.set(node.planet.pl_name, node);
    }
    return map;
  }, [nodes]);

  // 3. Search suggestions
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return planets
      .filter(
        (p) =>
          p.pl_name.toLowerCase().includes(q) ||
          p.hostname.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [planets, searchQuery]);

  // Handle selecting a planet from search or map
  const handleSelect = useCallback(
    (planet: Exoplanet) => {
      onSelectPlanet(planet);
      const node = nodeMap.get(planet.pl_name);
      if (node) {
        setFocusTarget(node.position);
      }
    },
    [nodeMap, onSelectPlanet]
  );

  const handleRecenterSol = useCallback(() => {
    setFocusTarget([0, 0, 0]);
    onSelectPlanet(null);
  }, [onSelectPlanet]);

  const handleToggleFullscreen = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Compute selected planet score
  const selectedScore: PlanetScore | null = useMemo(() => {
    return selectedPlanet ? scorePlanet(selectedPlanet) : null;
  }, [selectedPlanet]);

  // Active discovery methods in view with counts
  const methodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of planets) {
      const m = p.discoverymethod || "Unknown";
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [planets]);

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-[calc(100vh-80px)] min-h-[640px] flex flex-col bg-[#01030b] overflow-hidden border border-[var(--border)] rounded-lg select-none"
    >
      {/* ── 3D Star Map WebGL Canvas (Full Background) ── */}
      <div className="absolute inset-0 z-0">
        <StarMapCanvas
          nodes={nodes}
          selectedPlanet={selectedPlanet}
          onSelectPlanet={handleSelect}
          hoveredPlanet={hoveredPlanet}
          onHoverPlanet={setHoveredPlanet}
          focusTarget={focusTarget}
        />
      </div>

      {/* ── Top HUD Telemetry Ribbon ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-[#030614]/85 backdrop-blur-md border-b border-[var(--border)]/80">
        {/* Left: Sector & World Counter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.62rem] font-bold tracking-widest text-[var(--accent-cyan)] uppercase px-2 py-0.5 rounded bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30">
            SECTOR: MILKY WAY
          </span>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--foreground)]">
            <span className="text-[var(--muted)]">WORLDS IN VIEW:</span>
            <span className="font-bold text-[var(--accent-cyan-bright)] tabular-nums">
              {planets.length.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Center: Search & Quick Target Focus */}
        <div className="relative w-full sm:w-72">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search planet or host star..."
              className="w-full bg-[#05091c]/90 border border-[var(--border)] rounded px-3 py-1.5 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-xs text-[var(--muted)] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 rounded bg-[#030718]/95 border border-[var(--border)] shadow-2xl z-30 max-h-60 overflow-y-auto font-mono text-xs"
              >
                {searchResults.map((planet) => (
                  <button
                    key={planet.pl_name}
                    onClick={() => {
                      handleSelect(planet);
                      setSearchQuery("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--accent-cyan)]/15 border-b border-[var(--border)]/40 last:border-0 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[var(--accent-cyan-bright)] block">
                        {planet.pl_name}
                      </span>
                      <span className="text-[0.6rem] text-[var(--muted)]">
                        Host: {planet.hostname} · {planet.discoverymethod || "Unknown"}
                      </span>
                    </div>
                    <span className="text-[0.65rem] text-slate-300 tabular-nums">
                      {planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} pc` : "—"}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Color Mode & Filter Toggle */}
        <div className="flex items-center gap-2">
          {/* Color Mode Switcher */}
          <div className="hidden md:flex items-center gap-1 p-0.5 rounded bg-[#050a20] border border-[var(--border)] font-mono text-[0.6rem]">
            <span className="text-[var(--muted)] px-1.5">COLOR:</span>
            <button
              onClick={() => setColorMode("temp")}
              className={`px-2 py-0.5 rounded transition-colors ${
                colorMode === "temp"
                  ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)] border border-[var(--accent-cyan)]/40 font-bold"
                  : "text-[var(--muted-light)] hover:text-white"
              }`}
            >
              TEMP
            </button>
            <button
              onClick={() => setColorMode("method")}
              className={`px-2 py-0.5 rounded transition-colors ${
                colorMode === "method"
                  ? "bg-[var(--accent-violet)]/20 text-[var(--accent-violet-bright)] border border-[var(--accent-violet)]/40 font-bold"
                  : "text-[var(--muted-light)] hover:text-white"
              }`}
            >
              METHOD
            </button>
            <button
              onClick={() => setColorMode("radius")}
              className={`px-2 py-0.5 rounded transition-colors ${
                colorMode === "radius"
                  ? "bg-[var(--accent-blue)]/20 text-[var(--accent-blue-bright)] border border-[var(--accent-blue)]/40 font-bold"
                  : "text-[var(--muted-light)] hover:text-white"
              }`}
            >
              RADIUS
            </button>
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`font-mono text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
              showFilterDrawer
                ? "bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan-bright)]"
                : "bg-[#05091c] border-[var(--border)] text-[var(--muted-light)] hover:text-white"
            }`}
          >
            <span>FILTERS</span>
            <span className="text-[0.6rem]">{showFilterDrawer ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* ── Collapsible HUD Filter Drawer ── */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-20 bg-[#04081c]/95 border-b border-[var(--border)] px-4 py-3 font-mono text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              {/* Year Filter */}
              <div>
                <label className="text-[0.6rem] text-[var(--muted-light)] uppercase block mb-1">
                  Discovery Window (1990 – 2026)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filters.yearMin}
                    min={1990}
                    max={2026}
                    onChange={(e) =>
                      onFilterChange({ ...filters, yearMin: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                  <span>→</span>
                  <input
                    type="number"
                    value={filters.yearMax}
                    min={1990}
                    max={2026}
                    onChange={(e) =>
                      onFilterChange({ ...filters, yearMax: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Radius Filter */}
              <div>
                <label className="text-[0.6rem] text-[var(--muted-light)] uppercase block mb-1">
                  Radius Range (R⊕)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filters.radiusMin}
                    min={0}
                    step={0.5}
                    onChange={(e) =>
                      onFilterChange({ ...filters, radiusMin: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                  <span>→</span>
                  <input
                    type="number"
                    value={filters.radiusMax}
                    min={0}
                    step={0.5}
                    onChange={(e) =>
                      onFilterChange({ ...filters, radiusMax: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Distance Filter */}
              <div>
                <label className="text-[0.6rem] text-[var(--muted-light)] uppercase block mb-1">
                  Distance Range (pc)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filters.distanceMin}
                    min={0}
                    step={25}
                    onChange={(e) =>
                      onFilterChange({ ...filters, distanceMin: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                  <span>→</span>
                  <input
                    type="number"
                    value={filters.distanceMax}
                    min={0}
                    step={25}
                    onChange={(e) =>
                      onFilterChange({ ...filters, distanceMax: Number(e.target.value) })
                    }
                    className="w-20 bg-[#020512] border border-[var(--border)] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Reset Action */}
              <div className="flex justify-end items-center gap-2 pt-2">
                <button
                  onClick={() => onFilterChange({ ...DEFAULT_FILTERS })}
                  className="px-3 py-1 rounded bg-[#070e28] border border-[var(--border)] hover:border-[var(--accent-cyan)] text-[var(--muted-light)] hover:text-white transition-colors"
                >
                  RESET PARAMETERS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Star Map Viewport Interactivity Deck ── */}
      <div className="relative flex-1 pointer-events-none">
        {/* Top-Left: Discovery Method Legend Bar */}
        <div className="absolute top-3 left-3 z-10 pointer-events-auto max-w-md hidden sm:block">
          <div className="p-2 rounded bg-[#030718]/80 backdrop-blur-md border border-[var(--border)]/70 space-y-1.5 font-mono">
            <span className="text-[0.58rem] tracking-widest uppercase text-[var(--muted)] block">
              OBSERVATION REGIMES
            </span>
            <div className="flex flex-wrap gap-1.5">
              {methodStats.slice(0, 6).map(([method, count]) => {
                const isCurrent = filters.discoveryMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() =>
                      onFilterChange({
                        ...filters,
                        discoveryMethod: isCurrent ? "" : method,
                      })
                    }
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.58rem] border transition-colors ${
                      isCurrent
                        ? "bg-[var(--accent-cyan)]/25 border-[var(--accent-cyan)] text-white font-bold"
                        : "bg-[#060b22] border-[var(--border)] text-[var(--muted-light)] hover:text-white"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: METHOD_PALETTE[method] ?? "#94a3b8" }}
                    />
                    <span>{method}</span>
                    <span className="text-[var(--muted)]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom-Left: Map Navigation HUD Controls */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-auto flex items-center gap-1.5 p-1 rounded bg-[#030718]/85 backdrop-blur-md border border-[var(--border)] font-mono text-xs">
          <button
            onClick={handleRecenterSol}
            className="px-2 py-1 rounded bg-[#060b22] border border-[var(--border)] text-[var(--muted-light)] hover:text-[var(--accent-cyan-bright)] transition-colors text-[0.62rem]"
            title="Recenter Camera to Sol Origin"
          >
            ☉ SOL RECENTER
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="px-2 py-1 rounded bg-[#060b22] border border-[var(--border)] text-[var(--muted-light)] hover:text-white transition-colors text-[0.62rem]"
            title="Toggle Fullscreen"
          >
            ⛶ FULLSCREEN
          </button>
        </div>

        {/* Bottom-Center: Scientific Transparency Disclaimer */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto hidden md:block">
          <div className="px-3 py-1 rounded bg-[#020512]/90 border border-[var(--border)]/60 text-[0.58rem] font-mono text-[var(--muted)] text-center shadow-lg">
            Exploratory spatial visualization — coordinates mapped from NASA RA/Dec with normalized distance scaling.
          </div>
        </div>

        {/* Right Dock: Selected Planet "WORLD INTELLIGENCE" HUD Panel */}
        <AnimatePresence>
          {selectedPlanet && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-3 right-3 bottom-3 z-20 w-80 lg:w-96 pointer-events-auto flex flex-col"
            >
              <HudPanel
                title={selectedPlanet.pl_name}
                moduleCode="INTEL-01"
                badge={{ text: "TARGET LOCKED", variant: "violet" }}
                headerRight={
                  <button
                    onClick={() => onSelectPlanet(null)}
                    className="font-mono text-xs text-[var(--muted)] hover:text-white px-1.5 py-0.5"
                  >
                    ✕
                  </button>
                }
                cornerAccent="cyan"
                className="h-full flex flex-col overflow-y-auto"
              >
                <div className="space-y-3 font-mono">
                  {/* Primary Telemetry Grid */}
                  <div className="p-2.5 rounded bg-[#04081c] border border-[var(--border)] space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Host Star</span>
                      <span className="font-semibold text-white">{selectedPlanet.hostname}</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Distance from Earth</span>
                      <span className="font-semibold text-[var(--accent-cyan-bright)]">
                        {selectedPlanet.sy_dist != null ? `${selectedPlanet.sy_dist.toFixed(1)} pc` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Planet Radius</span>
                      <span className="font-semibold text-white">
                        {selectedPlanet.pl_rade != null ? `${selectedPlanet.pl_rade.toFixed(2)} R⊕` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Planet Mass</span>
                      <span className="font-semibold text-white">
                        {selectedPlanet.pl_masse != null ? `${selectedPlanet.pl_masse.toFixed(2)} M⊕` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Equilibrium Temp</span>
                      <span className="font-semibold text-[var(--accent-violet-bright)]">
                        {selectedPlanet.pl_eqt != null ? `${selectedPlanet.pl_eqt.toFixed(0)} K` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Orbital Period</span>
                      <span className="font-semibold text-white">
                        {selectedPlanet.pl_orbper != null ? `${selectedPlanet.pl_orbper.toFixed(2)} days` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)] uppercase text-[0.6rem]">Discovery</span>
                      <span className="text-slate-300">
                        {selectedPlanet.disc_year ?? "—"} ({selectedPlanet.discoverymethod || "—"})
                      </span>
                    </div>
                  </div>

                  {/* Exosense Interest Score */}
                  {selectedScore && (
                    <div className="p-2.5 rounded bg-[#04081c] border border-[var(--border)] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[0.62rem] text-[var(--muted)] uppercase">Interest Metric</span>
                        <span className="font-bold text-[var(--accent-cyan-bright)]">
                          {selectedScore.score}/100
                        </span>
                      </div>
                      <p className="text-[0.6rem] text-[var(--muted-light)] leading-snug">
                        {selectedScore.explanation}
                      </p>
                    </div>
                  )}

                  {/* AI Profile Section */}
                  {profile && (
                    <div className="p-2.5 rounded bg-[#04081c] border border-[var(--border)] space-y-1">
                      <span className="text-[0.6rem] text-[var(--accent-violet-bright)] uppercase font-bold block">
                        Gemini AI Briefing
                      </span>
                      <p className="text-[0.68rem] text-slate-200 leading-relaxed font-sans">
                        {profile}
                      </p>
                    </div>
                  )}

                  {/* Primary Action Button: Open in 3D Observatory */}
                  {onOpenObservatory && (
                    <button
                      onClick={() => onOpenObservatory(selectedPlanet)}
                      className="w-full py-2 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/50 text-[var(--accent-cyan-bright)] text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
                    >
                      🔭 Open in 3D Observatory
                    </button>
                  )}
                </div>
              </HudPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
