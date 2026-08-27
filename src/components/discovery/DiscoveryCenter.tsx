"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore, scorePlanet } from "@/lib/scoring";
import HudPanel from "../dashboard/HudPanel";

type DiscoveryCategory =
  | "top-scores"
  | "closest"
  | "earth-sized"
  | "super-earths"
  | "temperate"
  | "recent";

interface DiscoveryCenterProps {
  planets: Exoplanet[];
  favoriteNames: string[];
  onToggleFavorite: (name: string) => void;
  onNavigateToObservatory: (planet: Exoplanet) => void;
  onNavigateToCompare: (planet: Exoplanet) => void;
  onNavigateToStarMapWithTarget: (planet: Exoplanet) => void;
  onNavigateToTimeline: () => void;
  onAskCopilot?: (query: string) => void;
}

export default function DiscoveryCenter({
  planets,
  favoriteNames,
  onToggleFavorite,
  onNavigateToObservatory,
  onNavigateToCompare,
  onNavigateToStarMapWithTarget,
  onNavigateToTimeline,
  onAskCopilot,
}: DiscoveryCenterProps) {
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>("top-scores");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. High-level dataset stats calculated strictly from real data
  const stats = useMemo(() => {
    const withTemp = planets.filter((p) => p.pl_eqt != null).length;
    const withDist = planets.filter((p) => p.sy_dist != null).length;
    const methods = new Set(planets.map((p) => p.discoverymethod).filter(Boolean)).size;
    const years = planets.map((p) => p.disc_year).filter((y): y is number => y != null);
    const maxYear = years.length > 0 ? Math.max(...years) : 2026;

    return {
      total: planets.length,
      withTemp,
      withDist,
      methods,
      maxYear,
    };
  }, [planets]);

  // 2. Pre-score and categorize worlds
  const scoredPlanets = useMemo(() => {
    return planets.map((p) => ({
      planet: p,
      score: scorePlanet(p),
    }));
  }, [planets]);

  // 3. Filter and rank based on selected category & search
  const rankedPlanets = useMemo(() => {
    let list = [...scoredPlanets];

    // Category filter
    switch (activeCategory) {
      case "top-scores":
        list.sort((a, b) => b.score.score - a.score.score);
        break;
      case "closest":
        list = list.filter((item) => item.planet.sy_dist != null);
        list.sort((a, b) => (a.planet.sy_dist ?? 99999) - (b.planet.sy_dist ?? 99999));
        break;
      case "earth-sized":
        list = list.filter(
          (item) => item.planet.pl_rade != null && item.planet.pl_rade >= 0.8 && item.planet.pl_rade <= 1.25
        );
        list.sort((a, b) => b.score.score - a.score.score);
        break;
      case "super-earths":
        list = list.filter(
          (item) => item.planet.pl_rade != null && item.planet.pl_rade > 1.25 && item.planet.pl_rade <= 2.0
        );
        list.sort((a, b) => b.score.score - a.score.score);
        break;
      case "temperate":
        list = list.filter(
          (item) => item.planet.pl_eqt != null && item.planet.pl_eqt >= 200 && item.planet.pl_eqt <= 350
        );
        list.sort((a, b) => b.score.score - a.score.score);
        break;
      case "recent":
        list = list.filter((item) => item.planet.disc_year != null);
        list.sort((a, b) => (b.planet.disc_year ?? 0) - (a.planet.disc_year ?? 0));
        break;
    }

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.planet.pl_name.toLowerCase().includes(q) ||
          item.planet.hostname.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 30);
  }, [scoredPlanets, activeCategory, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-6 select-none font-mono">
      {/* ── Immersive Discovery Hero Header ── */}
      <div className="p-6 rounded-xl bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-cyan)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] tracking-widest uppercase">
              EXOPLANET DISCOVERY CENTER
            </span>
            <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded bg-[var(--accent-violet)]/20 border border-[var(--accent-violet)]/40 text-[var(--accent-violet-bright)] tracking-widest uppercase">
              DATA PATTERNS & INTELLIGENCE
            </span>
          </div>

          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-wider text-white uppercase font-mono">
              DISCOVER DISTANT WORLDS
            </h1>
            <p className="text-xs text-[var(--muted-light)] mt-1 max-w-2xl leading-relaxed">
              Explore the NASA exoplanet catalog through comparative ranking, physical regimes, and AI-assisted orbital analysis.
            </p>
          </div>

          {/* Real-time Dataset Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-[#04081c] border border-[var(--border)]">
              <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Indexed Catalog</span>
              <span className="text-lg font-bold text-white tabular-nums">
                {stats.total.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#04081c] border border-[var(--border)]">
              <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Thermal Coverage</span>
              <span className="text-lg font-bold text-[var(--accent-violet-bright)] tabular-nums">
                {stats.withTemp.toLocaleString()} <span className="text-xs text-[var(--muted)]">worlds</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#04081c] border border-[var(--border)]">
              <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Observation Regimes</span>
              <span className="text-lg font-bold text-[var(--accent-cyan-bright)] tabular-nums">
                {stats.methods} <span className="text-xs text-[var(--muted)]">techniques</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#04081c] border border-[var(--border)]">
              <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Latest Discovery</span>
              <span className="text-lg font-bold text-amber-400 tabular-nums">
                Year {stats.maxYear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Exploration Categories & Search Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-[#030616]/80 border border-[var(--border)]">
        {/* Category Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          {[
            { id: "top-scores", label: "TOP SCORES", icon: "🏆" },
            { id: "closest", label: "CLOSEST WORLDS", icon: "📍" },
            { id: "earth-sized", label: "EARTH-SIZED", icon: "🌍" },
            { id: "super-earths", label: "SUPER-EARTHS", icon: "🪐" },
            { id: "temperate", label: "TEMPERATE (200-350 K)", icon: "🌡️" },
            { id: "recent", label: "RECENT DISCOVERIES", icon: "✨" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as DiscoveryCategory)}
                className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer text-[0.65rem] font-bold uppercase tracking-wider ${
                  isActive
                    ? "bg-[var(--accent-cyan)]/25 text-[var(--accent-cyan-bright)] border border-[var(--accent-cyan)] shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-[#060b22] border border-[var(--border)] text-[var(--muted-light)] hover:text-white"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Discovery Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate or star..."
            className="w-full bg-[#05091c] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
          />
        </div>
      </div>

      {/* ── AI Discovery Directive Suggestions ── */}
      {onAskCopilot && (
        <div className="p-3 rounded-lg bg-[#04081c]/70 border border-[var(--border)]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[0.62rem] text-[var(--muted)] uppercase font-bold">
            ⚡ COPILOT DISCOVERY DIRECTIVES:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              "What should I explore in this dataset?",
              "Explain the top highest-scoring discoveries.",
              "Analyze discovery timeline trends.",
            ].map((query) => (
              <button
                key={query}
                onClick={() => onAskCopilot(query)}
                className="px-2.5 py-1 rounded bg-[#060c28] hover:bg-[#0e1b50] border border-[var(--border)] hover:border-[var(--accent-violet)] text-[0.62rem] text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Ranked Discovery Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rankedPlanets.map(({ planet, score }, idx) => {
          const rankNum = String(idx + 1).padStart(2, "0");
          const isSaved = favoriteNames.includes(planet.pl_name);

          return (
            <motion.div
              key={planet.pl_name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
              className="p-4 rounded-lg bg-[#03071c]/90 border border-[var(--border)] hover:border-[var(--accent-cyan)]/50 transition-all flex flex-col justify-between gap-3 shadow-md"
            >
              <div>
                {/* Header with Rank & Favorite Button */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--accent-cyan)] opacity-70">
                      #{rankNum}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {planet.pl_name}
                      </h3>
                      <p className="text-[0.62rem] text-[var(--muted-light)]">
                        Host Star: {planet.hostname} · {planet.discoverymethod || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFavorite(planet.pl_name)}
                    className={`p-1 rounded transition-colors cursor-pointer text-sm ${
                      isSaved
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-[var(--muted)] hover:text-white"
                    }`}
                    title={isSaved ? "Remove from Mission Favorites" : "Save to Mission Favorites"}
                  >
                    {isSaved ? "★" : "☆"}
                  </button>
                </div>

                {/* Telemetry Matrix Grid */}
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

              {/* Discovery Card Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border)]/50">
                <button
                  onClick={() => onNavigateToObservatory(planet)}
                  className="py-1.5 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] hover:border-[var(--accent-cyan)] text-[0.6rem] font-bold text-[var(--accent-cyan-bright)] transition-colors cursor-pointer text-center"
                >
                  🔭 Observatory
                </button>

                <button
                  onClick={() => onNavigateToStarMapWithTarget(planet)}
                  className="py-1.5 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] text-[0.6rem] font-semibold text-[var(--muted-light)] hover:text-white transition-colors cursor-pointer text-center"
                >
                  🌌 Star Map
                </button>

                <button
                  onClick={() => onNavigateToCompare(planet)}
                  className="py-1.5 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] hover:border-[var(--accent-violet)] text-[0.6rem] font-bold text-[var(--accent-violet-bright)] transition-colors cursor-pointer text-center"
                >
                  ⚖️ Compare
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
