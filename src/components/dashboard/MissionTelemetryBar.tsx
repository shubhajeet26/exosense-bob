"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";

interface MissionTelemetryBarProps {
  planets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
  totalFiltered: number;
  isLoading: boolean;
  favoritesCount?: number;
}

export default function MissionTelemetryBar({
  planets,
  selectedPlanet,
  totalFiltered,
  isLoading,
  favoritesCount = 0,
}: MissionTelemetryBarProps) {
  const { uniqueMethods, avgRadius, avgDist } = useMemo(() => {
    if (planets.length === 0) {
      return { uniqueMethods: 0, avgRadius: "—", avgDist: "—" };
    }
    const methods = new Set(planets.map((p) => p.discoverymethod).filter(Boolean)).size;
    const withRadius = planets.filter((p) => p.pl_rade != null);
    const avgR =
      withRadius.length > 0
        ? (withRadius.reduce((s, p) => s + p.pl_rade!, 0) / withRadius.length).toFixed(2)
        : "—";

    const withDist = planets.filter((p) => p.sy_dist != null);
    const avgD =
      withDist.length > 0
        ? (withDist.reduce((s, p) => s + p.sy_dist!, 0) / withDist.length).toFixed(1)
        : "—";

    return { uniqueMethods: methods, avgRadius: avgR, avgDist: avgD };
  }, [planets]);

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* Metric 1: Indexed Worlds */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        whileHover={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>INDEXED WORLDS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base lg:text-lg font-bold font-mono text-[var(--foreground)] tabular-nums">
            {isLoading ? "..." : planets.length.toLocaleString()}
          </span>
          <span className="text-[0.6rem] font-mono text-[var(--muted-light)]">TARGETS</span>
        </div>
      </motion.div>

      {/* Metric 2: Active In Matrix */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        whileHover={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>MATRIX SCOPE</span>
          <span className="text-[0.58rem] font-mono text-[var(--accent-cyan-bright)]">ACTIVE</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base lg:text-lg font-bold font-mono text-[var(--accent-cyan-bright)] tabular-nums">
            {totalFiltered.toLocaleString()}
          </span>
          <span className="text-[0.6rem] font-mono text-[var(--muted-light)]">TELEMETRY</span>
        </div>
      </motion.div>

      {/* Metric 3: Discovery Methods */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        whileHover={{ borderColor: "rgba(139, 92, 246, 0.4)" }}
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>OBSERVATION METHODS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base lg:text-lg font-bold font-mono text-[var(--accent-violet-bright)] tabular-nums">
            {uniqueMethods}
          </span>
          <span className="text-[0.6rem] font-mono text-[var(--muted-light)]">REGIMES</span>
        </div>
      </motion.div>

      {/* Metric 4: Mean Radius */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        whileHover={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>MEAN RADIUS</span>
          <span className="text-[0.58rem] font-mono text-[var(--muted)]">R⊕</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base lg:text-lg font-bold font-mono text-[var(--foreground)] tabular-nums">
            {avgRadius}
          </span>
          <span className="text-[0.6rem] font-mono text-[var(--muted-light)]">EARTH RADII</span>
        </div>
      </motion.div>

      {/* Metric 5: Distance Reach */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        whileHover={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>DEEP RANGE</span>
          <span className="text-[0.58rem] font-mono text-[var(--muted)]">PARSECS</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base lg:text-lg font-bold font-mono text-[var(--foreground)] tabular-nums">
            {avgDist}
          </span>
          <span className="text-[0.6rem] font-mono text-[var(--muted-light)]">AVG PC</span>
        </div>
      </motion.div>

      {/* Metric 6: Selected Target Lock & Saved Manifest */}
      <motion.div
        className="hud-panel-subtle rounded-lg p-2.5 border border-[var(--border)] flex flex-col justify-between"
        style={
          selectedPlanet
            ? {
                borderColor: "rgba(139, 92, 246, 0.6)",
                background: "rgba(139, 92, 246, 0.08)",
              }
            : {}
        }
      >
        <div className="flex items-center justify-between text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted)]">
          <span>{selectedPlanet ? "TARGET LOCK" : "MY MISSION"}</span>
          <span
            className="text-[0.58rem] font-mono font-bold text-amber-400"
          >
            ★ {favoritesCount}
          </span>
        </div>
        <div className="mt-1 truncate">
          <span
            className="text-xs lg:text-sm font-bold font-mono truncate block"
            style={{ color: selectedPlanet ? "#c4b5fd" : "var(--muted-light)" }}
          >
            {selectedPlanet ? selectedPlanet.pl_name : `${favoritesCount} SAVED WORLDS`}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
