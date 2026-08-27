"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { NavTab } from "../AppHeader";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  allPlanets: Exoplanet[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectPlanet: (planet: Exoplanet) => void;
  onOpenObservatory: (planet: Exoplanet) => void;
  onOpenCompare: (planet: Exoplanet) => void;
  onOpenStarMapWithTarget: (planet: Exoplanet) => void;
  onToggleFavorite: (name: string) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  allPlanets,
  onNavigateTab,
  onSelectPlanet,
  onOpenObservatory,
  onOpenCompare,
  onOpenStarMapWithTarget,
  onToggleFavorite,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered by parent if wired
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Planet search results
  const planetResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allPlanets
      .filter((p) => p.pl_name.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allPlanets, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm select-none font-mono">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl rounded-xl bg-[#030616] border border-[var(--accent-cyan)]/60 shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2.5 bg-[#050b24]">
          <span className="text-[var(--accent-cyan-bright)] text-sm">⌘</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Type a command, exoplanet name, or host star..."
            className="w-full bg-transparent text-xs text-white placeholder:text-[var(--muted)] focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#0b122c] border border-[var(--border)] text-[0.55rem] text-[var(--muted-light)]">
            ESC
          </kbd>
        </div>

        <div className="p-2.5 max-h-96 overflow-y-auto space-y-3 text-xs">
          {/* Planet Search Matches */}
          {planetResults.length > 0 && (
            <div className="space-y-1">
              <span className="text-[0.55rem] text-[var(--muted)] uppercase font-bold tracking-wider px-2 block">
                MATCHING CANDIDATE WORLDS
              </span>
              {planetResults.map((planet) => (
                <div
                  key={planet.pl_name}
                  className="px-2.5 py-2 rounded-lg bg-[#04081c] hover:bg-[#070e2c] border border-[var(--border)]/40 hover:border-[var(--accent-cyan)]/50 transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[var(--accent-cyan-bright)]">{planet.pl_name}</span>
                    <span className="text-[0.62rem] text-[var(--muted-light)] ml-2">
                      Host: {planet.hostname} · {planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} pc` : "Dist ?"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onOpenObservatory(planet);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)] text-[0.58rem] font-bold uppercase cursor-pointer"
                    >
                      🔭 View
                    </button>
                    <button
                      onClick={() => {
                        onOpenStarMapWithTarget(planet);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-[#060c28] text-[var(--muted-light)] text-[0.58rem] uppercase cursor-pointer hover:text-white"
                    >
                      🌌 Map
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Navigation Commands */}
          <div className="space-y-1">
            <span className="text-[0.55rem] text-[var(--muted)] uppercase font-bold tracking-wider px-2 block">
              QUICK COMMAND DIRECTIVES
            </span>

            {[
              { label: "Open Mission Control Dashboard", tab: "dashboard" as NavTab, icon: "🛰️" },
              { label: "Open Deep Space Star Map", tab: "starmap" as NavTab, icon: "🌌" },
              { label: "Open Mission Intelligence Engine", tab: "intelligence" as NavTab, icon: "⚡" },
              { label: "Open Exoplanet Discovery Center", tab: "discovery" as NavTab, icon: "🔍" },
              { label: "Open Discovery Timeline", tab: "timeline" as NavTab, icon: "📈" },
              { label: "Open Dual World Comparison", tab: "compare" as NavTab, icon: "⚖️" },
              { label: "Open My Mission Manifest", tab: "favorites" as NavTab, icon: "⭐" },
            ].map((cmd) => (
              <button
                key={cmd.tab}
                onClick={() => {
                  onNavigateTab(cmd.tab);
                  onClose();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-white/5 flex items-center justify-between text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>{cmd.icon}</span>
                  <span className="text-xs">{cmd.label}</span>
                </div>
                <span className="text-[0.6rem] text-[var(--muted)] uppercase">Jump ↵</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
