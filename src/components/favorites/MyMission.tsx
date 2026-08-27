"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { scorePlanet } from "@/lib/scoring";
import HudPanel from "../dashboard/HudPanel";

interface MyMissionProps {
  allPlanets: Exoplanet[];
  favoriteNames: string[];
  onToggleFavorite: (name: string) => void;
  onClearFavorites: () => void;
  onNavigateToObservatory: (planet: Exoplanet) => void;
  onNavigateToCompare: (planet: Exoplanet) => void;
  onNavigateToStarMap: () => void;
  onNavigateToDiscovery: () => void;
}

export default function MyMission({
  allPlanets,
  favoriteNames,
  onToggleFavorite,
  onClearFavorites,
  onNavigateToObservatory,
  onNavigateToCompare,
  onNavigateToStarMap,
  onNavigateToDiscovery,
}: MyMissionProps) {
  // Reconstruct saved planets from the real NASA dataset
  const savedPlanets = useMemo(() => {
    const planetMap = new Map<string, Exoplanet>();
    for (const p of allPlanets) {
      planetMap.set(p.pl_name, p);
    }
    return favoriteNames
      .map((name) => planetMap.get(name))
      .filter((p): p is Exoplanet => p != null);
  }, [allPlanets, favoriteNames]);

  return (
    <div className="w-full flex flex-col gap-5 select-none font-mono">
      {/* ── My Mission Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg text-amber-300 font-bold">
            ⭐
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-wider text-white">
                MY MISSION MANIFEST
              </h2>
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase">
                {savedPlanets.length} {savedPlanets.length === 1 ? "WORLD" : "WORLDS"} SAVED
              </span>
            </div>
            <p className="text-[0.65rem] text-[var(--muted-light)] uppercase tracking-wider">
              Personal mission portfolio of high-interest candidate exoplanets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedPlanets.length > 0 && (
            <button
              onClick={onClearFavorites}
              className="px-3 py-1.5 rounded bg-red-950/20 hover:bg-red-900/30 border border-red-800/40 text-red-300 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Clear Manifest
            </button>
          )}

          <button
            onClick={onNavigateToDiscovery}
            className="px-3 py-1.5 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            🔍 Discovery Center
          </button>

          <button
            onClick={onNavigateToStarMap}
            className="px-3 py-1.5 rounded bg-[#070e28] hover:bg-[#0c1640] border border-[var(--border)] text-[var(--muted-light)] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            🌌 Star Map
          </button>
        </div>
      </div>

      {/* ── Saved Worlds Grid or Empty State ── */}
      {savedPlanets.length === 0 ? (
        <div className="w-full h-[450px] flex flex-col items-center justify-center bg-[#020512] border border-[var(--border)] rounded-lg text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#050b24] border border-dashed border-amber-500/40 flex items-center justify-center text-2xl text-amber-400">
            ⭐
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-wider">
              MISSION MANIFEST EMPTY
            </h3>
            <p className="text-xs text-[var(--muted-light)] max-w-md">
              No candidate worlds have been saved to your mission list yet. Bookmark high-interest planets from the Discovery Center, Star Map, or Mission Control.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onNavigateToDiscovery}
              className="px-4 py-2 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              🔍 Open Discovery Center
            </button>
            <button
              onClick={onNavigateToStarMap}
              className="px-4 py-2 rounded bg-[#070e28] hover:bg-[#0c1640] border border-[var(--border)] text-[var(--muted-light)] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              🌌 Explore Star Map
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedPlanets.map((planet) => {
            const score = scorePlanet(planet);
            return (
              <motion.div
                key={planet.pl_name}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-4 rounded-lg bg-[#03071c]/90 border border-[var(--border)] hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {planet.pl_name}
                      </h3>
                      <p className="text-[0.62rem] text-[var(--muted-light)]">
                        Host Star: {planet.hostname}
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleFavorite(planet.pl_name)}
                      className="p-1 rounded text-amber-400 hover:text-red-400 transition-colors cursor-pointer text-sm"
                      title="Remove from Mission Favorites"
                    >
                      ★
                    </button>
                  </div>

                  {/* Core Telemetry Specs */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded bg-[#020512] border border-[var(--border)] text-xs">
                    <div>
                      <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Exosense Score</span>
                      <span className="font-bold text-[var(--accent-cyan-bright)]">
                        {score.score}/100
                      </span>
                    </div>

                    <div>
                      <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Distance</span>
                      <span className="text-slate-200">
                        {planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} pc` : "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Radius</span>
                      <span className="text-slate-200">
                        {planet.pl_rade != null ? `${planet.pl_rade.toFixed(2)} R⊕` : "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Eq. Temp</span>
                      <span className="text-[var(--accent-violet-bright)]">
                        {planet.pl_eqt != null ? `${planet.pl_eqt.toFixed(0)} K` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]/50">
                  <button
                    onClick={() => onNavigateToObservatory(planet)}
                    className="py-1.5 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] hover:border-[var(--accent-cyan)] text-[0.62rem] font-bold text-[var(--accent-cyan-bright)] transition-colors cursor-pointer text-center"
                  >
                    🔭 Observatory
                  </button>

                  <button
                    onClick={() => onNavigateToCompare(planet)}
                    className="py-1.5 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] hover:border-[var(--accent-violet)] text-[0.62rem] font-bold text-[var(--accent-violet-bright)] transition-colors cursor-pointer text-center"
                  >
                    ⚖️ Compare
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
