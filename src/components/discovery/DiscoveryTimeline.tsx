"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { FilterValues } from "@/lib/filterDefaults";
import HudPanel from "../dashboard/HudPanel";

interface DiscoveryTimelineProps {
  planets: Exoplanet[];
  onApplyYearFilter?: (year: number) => void;
  onNavigateToObservatory?: (planet: Exoplanet) => void;
}

interface YearStat {
  year: number;
  count: number;
  cumulative: number;
  topMethod: string;
}

export default function DiscoveryTimeline({
  planets,
  onApplyYearFilter,
  onNavigateToObservatory,
}: DiscoveryTimelineProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // 1. Compute yearly discovery stats from real NASA dataset
  const { timelineData, peakYear, totalWithYear } = useMemo<{
    timelineData: YearStat[];
    peakYear: YearStat | null;
    totalWithYear: number;
  }>(() => {
    const yearCounts: Record<number, { count: number; methods: Record<string, number> }> = {};

    let total = 0;
    for (const p of planets) {
      if (p.disc_year != null && p.disc_year >= 1990 && p.disc_year <= 2026) {
        const y = Math.round(p.disc_year);
        total++;
        if (!yearCounts[y]) {
          yearCounts[y] = { count: 0, methods: {} };
        }
        yearCounts[y].count += 1;
        const m = p.discoverymethod || "Unknown";
        yearCounts[y].methods[m] = (yearCounts[y].methods[m] || 0) + 1;
      }
    }

    const sortedYears = Object.keys(yearCounts)
      .map(Number)
      .sort((a, b) => a - b);

    let cumulative = 0;
    let maxCount = 0;
    let peakY: YearStat | null = null;

    const data: YearStat[] = sortedYears.map((year) => {
      const entry = yearCounts[year];
      cumulative += entry.count;
      if (entry.count > maxCount) {
        maxCount = entry.count;
      }

      // Top method this year
      let topMethod = "Transit";
      let topMCount = 0;
      for (const [m, cnt] of Object.entries(entry.methods)) {
        if (cnt > topMCount) {
          topMCount = cnt;
          topMethod = m;
        }
      }

      const stat: YearStat = {
        year,
        count: entry.count,
        cumulative,
        topMethod,
      };

      if (!peakY || entry.count > peakY.count) {
        peakY = stat;
      }

      return stat;
    });

    return { timelineData: data, peakYear: peakY, totalWithYear: total };
  }, [planets]);

  // Planets for the currently selected year
  const selectedYearPlanets = useMemo(() => {
    if (!selectedYear) return [];
    return planets.filter((p) => p.disc_year === selectedYear);
  }, [planets, selectedYear]);

  return (
    <div className="w-full flex flex-col gap-5 select-none font-mono">
      {/* ── Timeline Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#030616]/90 border border-[var(--border)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue)]/15 border border-[var(--accent-blue)]/30 flex items-center justify-center text-lg text-[var(--accent-blue-bright)] font-bold">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-wider text-white">
                EXOPLANET DISCOVERY TIMELINE
              </h2>
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] font-bold uppercase">
                HISTORICAL EVOLUTION
              </span>
            </div>
            <p className="text-[0.65rem] text-[var(--muted-light)] uppercase tracking-wider">
              Chronological discovery catalog distribution (1990 – 2026)
            </p>
          </div>
        </div>

        {/* High-level timeline stats */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1 rounded bg-[#04081c] border border-[var(--border)] text-right">
            <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Historical Peak</span>
            <span className="text-sm font-bold text-[var(--accent-cyan-bright)]">
              {peakYear ? `${peakYear.year} (${peakYear.count.toLocaleString()} worlds)` : "—"}
            </span>
          </div>
          <div className="px-3 py-1 rounded bg-[#04081c] border border-[var(--border)] text-right">
            <span className="text-[0.58rem] text-[var(--muted)] uppercase block">Temporal Coverage</span>
            <span className="text-sm font-bold text-white">
              {timelineData.length > 0 ? `${timelineData[0].year} → ${timelineData[timelineData.length - 1].year}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Timeline Chart ── */}
      <HudPanel
        title="Annual & Cumulative Discovery Wave"
        moduleCode="TIME-01"
        badge={{ text: "INTERACTIVE TEMPORAL CHART", variant: "cyan" }}
        cornerAccent="cyan"
      >
        <div className="space-y-3">
          <p className="text-[0.62rem] text-[var(--muted-light)] leading-relaxed">
            Click on any historical year or hover over data points to inspect discoveries, dominant observational regimes, and isolate cohorts.
          </p>

          <div className="w-full h-[320px] bg-[#020512]/90 rounded-lg border border-[var(--border)]/70 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timelineData}
                margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    setSelectedYear(Number(e.activeLabel));
                  }
                }}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#121b38" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#475569"
                  tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#475569"
                  tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#475569"
                  tick={{ fill: "#a78bfa", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as YearStat;
                      return (
                        <div className="p-3 rounded-lg bg-[#030616]/95 border border-[var(--accent-cyan)] shadow-2xl font-mono text-xs space-y-1">
                          <div className="flex justify-between items-center gap-3 border-b border-[var(--border)] pb-1">
                            <span className="font-bold text-white">YEAR {label}</span>
                            <span className="text-[0.6rem] text-[var(--accent-cyan-bright)]">CLICK TO FOCUS</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[0.65rem]">
                            <span className="text-[var(--muted)]">Annual Discoveries:</span>
                            <span className="font-bold text-[var(--accent-cyan-bright)] tabular-nums">
                              {data.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-[0.65rem]">
                            <span className="text-[var(--muted)]">Cumulative Total:</span>
                            <span className="font-bold text-[var(--accent-violet-bright)] tabular-nums">
                              {data.cumulative.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-[0.65rem]">
                            <span className="text-[var(--muted)]">Primary Technique:</span>
                            <span className="text-slate-300">{data.topMethod}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Cumulative Wave (Area) */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
                {/* Annual Discoveries (Bar) */}
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  fill="#06b6d4"
                  radius={[3, 3, 0, 0]}
                  opacity={0.85}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </HudPanel>

      {/* ── Selected Year Inspection Drawer ── */}
      <AnimatePresence>
        {selectedYear && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <HudPanel
              title={`HISTORICAL COHORT // YEAR ${selectedYear}`}
              moduleCode="YEAR-EXP"
              badge={{ text: `${selectedYearPlanets.length} WORLDS DISCOVERED`, variant: "violet" }}
              headerRight={
                <div className="flex items-center gap-2">
                  {onApplyYearFilter && (
                    <button
                      onClick={() => onApplyYearFilter(selectedYear)}
                      className="px-3 py-1 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan-bright)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🚀 Filter Mission Control to {selectedYear}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedYear(null)}
                    className="text-[var(--muted)] hover:text-white px-2 py-0.5 text-xs rounded border border-[var(--border)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              }
              cornerAccent="cyan"
            >
              <div className="space-y-3 font-mono">
                <p className="text-[0.65rem] text-[var(--muted-light)]">
                  Top discovered worlds logged in {selectedYear} with observational telemetry:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {selectedYearPlanets.slice(0, 12).map((planet) => (
                    <div
                      key={planet.pl_name}
                      className="p-2.5 rounded bg-[#04081c] border border-[var(--border)] hover:border-[var(--accent-cyan)]/50 transition-all flex flex-col justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-[var(--accent-cyan-bright)] truncate max-w-[150px]">
                            {planet.pl_name}
                          </span>
                          <span className="text-[0.6rem] text-[var(--muted)]">
                            {planet.discoverymethod || "Unknown"}
                          </span>
                        </div>
                        <p className="text-[0.62rem] text-[var(--muted-light)]">
                          Host: {planet.hostname} · {planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} pc` : "Dist ?"}
                        </p>
                      </div>

                      {onNavigateToObservatory && (
                        <button
                          onClick={() => onNavigateToObservatory(planet)}
                          className="w-full py-1 rounded bg-[#060c28] hover:bg-[#0e1b50] border border-[var(--border)] text-[0.62rem] font-bold text-slate-200 hover:text-white transition-colors cursor-pointer text-center"
                        >
                          🔭 Open in Observatory
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </HudPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
