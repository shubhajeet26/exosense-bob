"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import {
  PlanetRecommendation,
  getRecommendedWorlds,
  analyzeMissionCollection,
  MissionPattern,
} from "@/lib/recommendations";
import HudPanel from "../dashboard/HudPanel";
import { Spinner } from "../dashboard/States";

interface MissionIntelligenceProps {
  allPlanets: Exoplanet[];
  filteredPlanets: Exoplanet[];
  selectedPlanet: Exoplanet | null;
  favoriteNames: string[];
  onToggleFavorite: (name: string) => void;
  onNavigateToObservatory: (planet: Exoplanet) => void;
  onNavigateToCompare: (planet: Exoplanet) => void;
  onNavigateToStarMapWithTarget: (planet: Exoplanet) => void;
  onNavigateToDiscovery: () => void;
}

export default function MissionIntelligence({
  allPlanets,
  filteredPlanets,
  selectedPlanet,
  favoriteNames,
  onToggleFavorite,
  onNavigateToObservatory,
  onNavigateToCompare,
  onNavigateToStarMapWithTarget,
  onNavigateToDiscovery,
}: MissionIntelligenceProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingStatus, setBriefingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [briefingError, setBriefingError] = useState<string | null>(null);

  // 1. Saved Planets & Personal Pattern
  const savedPlanets = useMemo(() => {
    const planetMap = new Map<string, Exoplanet>();
    for (const p of allPlanets) {
      planetMap.set(p.pl_name, p);
    }
    return favoriteNames
      .map((name) => planetMap.get(name))
      .filter((p): p is Exoplanet => p != null);
  }, [allPlanets, favoriteNames]);

  const missionPattern: MissionPattern = useMemo(() => {
    return analyzeMissionCollection(savedPlanets);
  }, [savedPlanets]);

  // 2. Deterministic Recommendations (from current active dataset)
  const recommendations: PlanetRecommendation[] = useMemo(() => {
    const dataset = filteredPlanets.length > 0 ? filteredPlanets : allPlanets;
    return getRecommendedWorlds(dataset, favoriteNames, 5);
  }, [filteredPlanets, allPlanets, favoriteNames]);

  // 3. Pattern Explorer Distribution Analytics
  const patternStats = useMemo(() => {
    const dataset = filteredPlanets.length > 0 ? filteredPlanets : allPlanets;

    // Radius distribution
    let earthSized = 0; // <= 1.25
    let superEarth = 0; // 1.25 - 2.0
    let subNeptune = 0; // 2.0 - 4.0
    let jovian = 0; // > 4.0
    let radiusUnavail = 0;

    // Thermal distribution
    let temperate = 0; // 200 - 350 K
    let hot = 0; // 350 - 1000 K
    let extreme = 0; // > 1000 K
    let cold = 0; // < 200 K
    let tempUnavail = 0;

    // Distance distribution
    let nearby = 0; // <= 50 pc
    let midDist = 0; // 50 - 300 pc
    let farDist = 0; // > 300 pc

    for (const p of dataset) {
      if (p.pl_rade != null) {
        if (p.pl_rade <= 1.25) earthSized++;
        else if (p.pl_rade <= 2.0) superEarth++;
        else if (p.pl_rade <= 4.0) subNeptune++;
        else jovian++;
      } else {
        radiusUnavail++;
      }

      if (p.pl_eqt != null) {
        if (p.pl_eqt < 200) cold++;
        else if (p.pl_eqt <= 350) temperate++;
        else if (p.pl_eqt <= 1000) hot++;
        else extreme++;
      } else {
        tempUnavail++;
      }

      if (p.sy_dist != null) {
        if (p.sy_dist <= 50) nearby++;
        else if (p.sy_dist <= 300) midDist++;
        else farDist++;
      }
    }

    return {
      radius: { earthSized, superEarth, subNeptune, jovian, radiusUnavail },
      thermal: { cold, temperate, hot, extreme, tempUnavail },
      distance: { nearby, midDist, farDist },
      total: dataset.length,
    };
  }, [filteredPlanets, allPlanets]);

  // 4. Request Grounded Gemini Mission Briefing
  const handleGenerateBriefing = useCallback(async () => {
    if (recommendations.length === 0) return;
    setBriefingStatus("loading");
    setBriefingError(null);

    try {
      const candidatesPayload = recommendations.map((r) => ({
        pl_name: r.planet.pl_name,
        score: r.score,
        pl_rade: r.planet.pl_rade ?? undefined,
        pl_eqt: r.planet.pl_eqt ?? undefined,
        sy_dist: r.planet.sy_dist ?? undefined,
        reasons: r.reasons,
      }));

      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: candidatesPayload,
          savedSummary: {
            totalSaved: missionPattern.totalSaved,
            avgScore: missionPattern.avgScore,
            dominantSizeRegime: missionPattern.dominantSizeRegime,
          },
          filteredCount: filteredPlanets.length,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setBriefingStatus("error");
        setBriefingError(data.error);
      } else if (data.briefing) {
        setBriefing(data.briefing);
        setBriefingStatus("success");
      }
    } catch {
      setBriefingStatus("error");
      setBriefingError("AI Mission Briefing service temporarily unreachable. Deterministic recommendations remain active.");
    }
  }, [recommendations, missionPattern, filteredPlanets.length]);

  return (
    <div className="w-full flex flex-col gap-5 select-none font-mono">
      {/* ── Top Header & Status ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30 flex items-center justify-center text-lg text-[var(--accent-cyan-bright)] font-bold">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-wider text-white">
                MISSION INTELLIGENCE
              </h2>
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] font-bold uppercase">
                ADVANCED EXPLORATION ENGINE
              </span>
            </div>
            <p className="text-[0.65rem] text-[var(--muted-light)] uppercase tracking-wider">
              Deterministic priority ranking & grounded AI synthesis over real NASA telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateBriefing}
            disabled={briefingStatus === "loading"}
            className="px-3.5 py-1.5 rounded bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30 border border-[var(--accent-violet)]/40 text-[var(--accent-violet-bright)] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            {briefingStatus === "loading" ? <Spinner size={12} /> : "⚡ Generate AI Mission Briefing"}
          </button>
        </div>
      </div>

      {/* ── Mission Path & Next Action Ribbon ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Workflow Stages */}
        <div className="md:col-span-8 p-3 rounded-lg bg-[#04081c]/80 border border-[var(--border)] flex items-center justify-between text-xs overflow-x-auto">
          {[
            { step: "01", label: "DISCOVER", done: true },
            { step: "02", label: "INVESTIGATE", done: selectedPlanet != null },
            { step: "03", label: "COMPARE", done: false },
            { step: "04", label: "SAVE", done: savedPlanets.length > 0 },
            { step: "05", label: "ANALYZE", done: briefingStatus === "success" },
          ].map((s, idx) => (
            <div key={s.step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1 px-2 py-1 rounded border text-[0.62rem] font-bold ${
                s.done
                  ? "bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)]/50 text-[var(--accent-cyan-bright)]"
                  : "bg-[#020512] border-[var(--border)] text-[var(--muted)]"
              }`}>
                <span>{s.step}</span>
                <span>{s.label}</span>
              </div>
              {idx < 4 && <span className="text-[var(--muted)] text-[0.6rem]">→</span>}
            </div>
          ))}
        </div>

        {/* Dynamic Next Action Directive */}
        <div className="md:col-span-4 p-3 rounded-lg bg-[#050b24] border border-[var(--accent-cyan)]/30 flex items-center justify-between text-xs">
          <div>
            <span className="text-[0.55rem] text-[var(--muted)] uppercase block font-bold">NEXT DIRECTIVE</span>
            <span className="text-[0.68rem] font-bold text-white">
              {selectedPlanet
                ? `Investigate ${selectedPlanet.pl_name} in Observatory`
                : savedPlanets.length > 0
                ? "Synthesize Saved Mission Intelligence"
                : "Explore Recommended Candidates"}
            </span>
          </div>
          {selectedPlanet ? (
            <button
              onClick={() => onNavigateToObservatory(selectedPlanet)}
              className="px-2 py-1 rounded bg-[var(--accent-cyan)]/25 text-[var(--accent-cyan-bright)] text-[0.6rem] font-bold uppercase cursor-pointer"
            >
              Open 🔭
            </button>
          ) : (
            <button
              onClick={onNavigateToDiscovery}
              className="px-2 py-1 rounded bg-[var(--accent-cyan)]/25 text-[var(--accent-cyan-bright)] text-[0.6rem] font-bold uppercase cursor-pointer"
            >
              Explore 🔍
            </button>
          )}
        </div>
      </div>

      {/* ── AI Mission Briefing Section ── */}
      <AnimatePresence>
        {(briefing || briefingStatus === "loading" || briefingStatus === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <HudPanel
              title="EXECUTIVE MISSION INTELLIGENCE BRIEFING"
              moduleCode="AI-BRIEF"
              badge={{ text: "GEMINI SYNTHESIS", variant: "violet" }}
              cornerAccent="blue"
            >
              <div className="space-y-3 font-mono text-xs">
                {briefingStatus === "loading" && (
                  <div className="flex items-center gap-2 text-[var(--accent-violet-bright)] p-3">
                    <Spinner size={14} />
                    <span className="text-[0.68rem] tracking-wider uppercase animate-pulse">
                      Synthesizing observational telemetry and mission priorities…
                    </span>
                  </div>
                )}

                {briefingStatus === "error" && briefingError && (
                  <div className="p-3 rounded bg-red-950/20 border border-red-800/40 text-red-300">
                    ⚠ {briefingError}
                  </div>
                )}

                {briefing && briefingStatus === "success" && (
                  <div className="p-3.5 rounded bg-[#04081c] border border-[var(--border)] text-slate-200 font-sans text-xs leading-relaxed space-y-2">
                    <div className="whitespace-pre-line leading-relaxed">{briefing}</div>
                  </div>
                )}
              </div>
            </HudPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "What Should I Explore Next?" Recommendations Deck ── */}
      <HudPanel
        title="WHAT SHOULD I EXPLORE NEXT? // PRIORITY CANDIDATE WORLDS"
        moduleCode="REC-01"
        badge={{ text: "DETERMINISTIC RANKING", variant: "cyan" }}
        cornerAccent="cyan"
      >
        <div className="space-y-4">
          <p className="text-[0.62rem] text-[var(--muted-light)] leading-relaxed">
            Prioritized candidate worlds evaluated by the Exosense recommendation engine based on data completeness, proximity, temperate equilibrium temperature, and suitability metrics.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(({ planet, score, dataCompleteness, explorationPriority, reasons }, idx) => {
              const rankNum = String(idx + 1).padStart(2, "0");
              const isSaved = favoriteNames.includes(planet.pl_name);

              const priorityBadge =
                explorationPriority === "HIGH"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : explorationPriority === "MEDIUM"
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-500/20 border-slate-500/50 text-slate-300";

              return (
                <div
                  key={planet.pl_name}
                  className="p-4 rounded-lg bg-[#03071c] border border-[var(--border)] hover:border-[var(--accent-cyan)]/50 transition-all flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--accent-cyan)] opacity-70">
                          #{rankNum}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            {planet.pl_name}
                          </h3>
                          <p className="text-[0.6rem] text-[var(--muted-light)]">
                            Host: {planet.hostname} ({planet.discoverymethod || "Unknown"})
                          </p>
                        </div>
                      </div>

                      <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded border uppercase ${priorityBadge}`}>
                        {explorationPriority} PRIORITY
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded bg-[#020512] border border-[var(--border)] text-xs">
                      <div>
                        <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Exosense</span>
                        <span className="font-bold text-[var(--accent-cyan-bright)]">{score}/100</span>
                      </div>
                      <div>
                        <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Radius</span>
                        <span className="text-slate-200">{planet.pl_rade != null ? `${planet.pl_rade.toFixed(2)} R⊕` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Distance</span>
                        <span className="text-slate-200">{planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} pc` : "—"}</span>
                      </div>
                    </div>

                    {/* Data Completeness Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[0.58rem] text-[var(--muted-light)]">
                        <span>DATA COMPLETENESS</span>
                        <span className="font-bold text-[var(--accent-violet-bright)]">{dataCompleteness}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#020512] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)]"
                          style={{ width: `${dataCompleteness}%` }}
                        />
                      </div>
                    </div>

                    {/* Grounded Bullet Reasons */}
                    <div className="mt-3 space-y-1 border-t border-[var(--border)]/50 pt-2 text-[0.62rem] text-slate-300">
                      {reasons.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-[var(--accent-cyan)]">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[var(--border)]/50 text-[0.58rem] font-bold">
                    <button
                      onClick={() => onNavigateToObservatory(planet)}
                      className="py-1 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] text-[var(--accent-cyan-bright)] text-center cursor-pointer"
                    >
                      🔭 View
                    </button>
                    <button
                      onClick={() => onNavigateToStarMapWithTarget(planet)}
                      className="py-1 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] text-[var(--muted-light)] hover:text-white text-center cursor-pointer"
                    >
                      🌌 Map
                    </button>
                    <button
                      onClick={() => onNavigateToCompare(planet)}
                      className="py-1 rounded bg-[#060c28] hover:bg-[#0c1642] border border-[var(--border)] text-[var(--accent-violet-bright)] text-center cursor-pointer"
                    >
                      ⚖️ Diff
                    </button>
                    <button
                      onClick={() => onToggleFavorite(planet.pl_name)}
                      className={`py-1 rounded border text-center cursor-pointer ${
                        isSaved ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-[#060c28] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {isSaved ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HudPanel>

      {/* ── Pattern Explorer & My Mission Insights Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pattern Explorer (7 cols) */}
        <div className="lg:col-span-7">
          <HudPanel
            title="DATASET PATTERN EXPLORER"
            moduleCode="PATTERNS"
            badge={{ text: `${patternStats.total} WORLDS ANALYZED`, variant: "cyan" }}
            cornerAccent="cyan"
          >
            <div className="space-y-4 font-mono text-xs">
              {/* Planetary Radius Regimes */}
              <div className="space-y-1.5">
                <span className="text-[0.6rem] text-[var(--muted)] uppercase font-bold block">
                  PLANETARY RADIUS REGIMES
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-[0.62rem]">
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">≤ 1.25 R⊕</span>
                    <span className="font-bold text-[var(--accent-cyan-bright)]">{patternStats.radius.earthSized}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">1.25–2.0 R⊕</span>
                    <span className="font-bold text-[var(--accent-cyan-bright)]">{patternStats.radius.superEarth}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">2.0–4.0 R⊕</span>
                    <span className="font-bold text-slate-300">{patternStats.radius.subNeptune}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">&gt; 4.0 R⊕</span>
                    <span className="font-bold text-amber-400">{patternStats.radius.jovian}</span>
                  </div>
                </div>
              </div>

              {/* Thermal Regimes */}
              <div className="space-y-1.5">
                <span className="text-[0.6rem] text-[var(--muted)] uppercase font-bold block">
                  THERMAL PROFILES
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-[0.62rem]">
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">&lt; 200 K</span>
                    <span className="font-bold text-indigo-400">{patternStats.thermal.cold}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">200–350 K</span>
                    <span className="font-bold text-emerald-400">{patternStats.thermal.temperate}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">350–1000 K</span>
                    <span className="font-bold text-amber-400">{patternStats.thermal.hot}</span>
                  </div>
                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                    <span className="text-[var(--muted)] block">&gt; 1000 K</span>
                    <span className="font-bold text-red-400">{patternStats.thermal.extreme}</span>
                  </div>
                </div>
              </div>
            </div>
          </HudPanel>
        </div>

        {/* Personalized Mission Pattern (5 cols) */}
        <div className="lg:col-span-5">
          <HudPanel
            title="YOUR MISSION PATTERN"
            moduleCode="MY-PAT"
            badge={{ text: `${savedPlanets.length} SAVED`, variant: "violet" }}
            cornerAccent="blue"
          >
            <div className="space-y-3 font-mono text-xs">
              {savedPlanets.length === 0 ? (
                <div className="p-4 rounded bg-[#020512] border border-[var(--border)] text-center space-y-2">
                  <span className="text-amber-400 text-base">⭐</span>
                  <p className="text-[0.65rem] text-[var(--muted-light)]">
                    No worlds saved to My Mission yet. Bookmark candidates across the catalog to unlock personalized collection insights.
                  </p>
                  <button
                    onClick={onNavigateToDiscovery}
                    className="px-3 py-1 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)] text-[0.62rem] font-bold uppercase cursor-pointer"
                  >
                    Open Discovery Center
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded bg-[#020512] border border-[var(--border)] space-y-1">
                    <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Dominant Size Classification</span>
                    <span className="font-bold text-white">{missionPattern.dominantSizeRegime}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                      <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Avg Exosense</span>
                      <span className="font-bold text-[var(--accent-cyan-bright)]">
                        {missionPattern.avgScore != null ? `${missionPattern.avgScore}/100` : "—"}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[#020512] border border-[var(--border)]">
                      <span className="text-[0.55rem] text-[var(--muted)] uppercase block">Avg Distance</span>
                      <span className="font-bold text-slate-200">
                        {missionPattern.avgDistance != null ? `${missionPattern.avgDistance} pc` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#020512] border border-[var(--border)] flex justify-between items-center text-[0.62rem]">
                    <span className="text-[var(--muted)]">Thermal Data Coverage:</span>
                    <span className="font-bold text-[var(--accent-violet-bright)]">{missionPattern.tempCoveragePct}%</span>
                  </div>
                </div>
              )}
            </div>
          </HudPanel>
        </div>
      </div>
    </div>
  );
}
