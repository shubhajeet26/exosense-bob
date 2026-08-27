"use client";

import { useMemo, memo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { Exoplanet } from "@/lib/nasa";
import HudPanel from "./HudPanel";

const MAX_CHART_POINTS = 600;

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

const METHOD_COLORS: Record<string, string> = {
  "Transit": "#38bdf8",                       // sky blue
  "Radial Velocity": "#a78bfa",               // violet
  "Imaging": "#34d399",                       // emerald
  "Microlensing": "#f59e0b",                  // amber
  "Astrometry": "#f472b6",                    // pink
  "Eclipse Timing Variations": "#22d3ee",     // cyan
  "Transit Timing Variations": "#fb923c",     // orange
  "Orbital Brightness Modulation": "#e879f9", // fuchsia
  "Pulsar Timing": "#a3e635",                 // lime
  "Pulsation Timing Variations": "#fbbf24",   // yellow
  "Disk Kinematics": "#60a5fa",               // light blue
};
const FALLBACK_COLOR = "#94a3b8";

interface TooltipPayload {
  pl_name: string;
  hostname: string;
  pl_orbsmax: number | null;
  pl_rade: number | null;
  discoverymethod: string | null;
  disc_year: number | null;
  sy_dist: number | null;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="hud-panel rounded-md p-3 text-xs space-y-1.5 shadow-2xl border border-[var(--accent-cyan)]/40 font-mono"
      style={{ background: "rgba(3, 7, 20, 0.95)", minWidth: 200 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1 mb-1">
        <span className="font-bold text-[var(--accent-cyan-bright)] text-xs tracking-wider uppercase">
          {d.pl_name}
        </span>
        <span className="text-[0.6rem] text-[var(--muted-light)]">{d.disc_year ?? "YEAR ?"}</span>
      </div>
      <p className="text-[var(--muted-light)] flex justify-between">
        <span>HOST STAR:</span>
        <span className="text-[var(--foreground)] font-semibold">{d.hostname}</span>
      </p>
      <p className="text-[var(--muted-light)] flex justify-between">
        <span>SEMI-MAJOR:</span>
        <span className="text-[var(--foreground)] font-semibold">
          {d.pl_orbsmax != null ? `${d.pl_orbsmax.toFixed(3)} AU` : "—"}
        </span>
      </p>
      <p className="text-[var(--muted-light)] flex justify-between">
        <span>RADIUS:</span>
        <span className="text-[var(--foreground)] font-semibold">
          {d.pl_rade != null ? `${d.pl_rade.toFixed(2)} R⊕` : "—"}
        </span>
      </p>
      <p className="text-[var(--muted-light)] flex justify-between">
        <span>DISTANCE:</span>
        <span className="text-[var(--foreground)] font-semibold">
          {d.sy_dist != null ? `${d.sy_dist.toFixed(1)} pc` : "—"}
        </span>
      </p>
      <div className="pt-1 border-t border-[var(--border)] text-[0.6rem] text-[var(--accent-violet-bright)] truncate">
        METHOD: {d.discoverymethod ?? "UNKNOWN"}
      </div>
    </div>
  );
}

interface Props {
  planets: Exoplanet[];
  onSelectPlanet?: (p: Exoplanet) => void;
}

function PlanetScatterChartInner({ planets, onSelectPlanet }: Props) {
  const { byMethod, methods, totalShown, totalPlottable } = useMemo(() => {
    const grouped = planets.reduce<Record<string, Exoplanet[]>>((acc, p) => {
      if (p.pl_orbsmax == null || p.pl_rade == null) return acc;
      const key = p.discoverymethod ?? "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    const methodKeys = Object.keys(grouped);
    const plottable = methodKeys.reduce((s, k) => s + grouped[k].length, 0);

    const ratio = plottable > MAX_CHART_POINTS ? MAX_CHART_POINTS / plottable : 1;

    const downsampled: Record<string, Exoplanet[]> = {};
    for (const key of methodKeys) {
      const cap = Math.max(1, Math.round(grouped[key].length * ratio));
      downsampled[key] = downsample(grouped[key], cap);
    }

    const shown = methodKeys.reduce((s, k) => s + downsampled[k].length, 0);
    return { byMethod: downsampled, methods: methodKeys, totalShown: shown, totalPlottable: plottable };
  }, [planets]);

  const isSampled = totalPlottable > MAX_CHART_POINTS;

  return (
    <HudPanel
      title="Orbital Reconnaissance Matrix"
      moduleCode="ORB-MAT"
      badge={{
        text: `${totalShown} PLOTTED`,
        variant: "cyan",
      }}
      headerRight={
        isSampled ? (
          <span className="font-mono text-[0.58rem] text-[var(--muted-light)] px-2 py-0.5 rounded bg-[#060c24] border border-[var(--border)]">
            SAMPLE: {totalShown} / {totalPlottable}
          </span>
        ) : undefined
      }
      cornerAccent="cyan"
    >
      <div className="space-y-3">
        {/* Method color badges */}
        <div className="flex flex-wrap gap-2 items-center px-1">
          {methods.map((method) => {
            const color = METHOD_COLORS[method] ?? FALLBACK_COLOR;
            const count = byMethod[method]?.length ?? 0;
            return (
              <div
                key={method}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#060c24]/90 border border-[var(--border)] text-[0.62rem] font-mono text-[var(--muted-light)] select-none"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{method}</span>
                <span className="text-[var(--muted)]">({count})</span>
              </div>
            );
          })}
        </div>

        {/* Scatter Chart */}
        <div className="w-full" style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 20, bottom: 35, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(59, 130, 246, 0.08)" />
              <XAxis
                dataKey="pl_orbsmax"
                type="number"
                scale="log"
                domain={["auto", "auto"]}
                tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                tickLine={{ stroke: "rgba(59, 130, 246, 0.2)" }}
                axisLine={{ stroke: "var(--border)" }}
                name="Semi-major axis"
              >
                <Label
                  value="SEMI-MAJOR AXIS (AU, LOG SCALE)"
                  offset={-10}
                  position="insideBottom"
                  style={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em" }}
                />
              </XAxis>
              <YAxis
                dataKey="pl_rade"
                type="number"
                tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                tickLine={{ stroke: "rgba(59, 130, 246, 0.2)" }}
                axisLine={{ stroke: "var(--border)" }}
                name="Planet radius"
              >
                <Label
                  value="RADIUS (R⊕)"
                  angle={-90}
                  position="insideLeft"
                  offset={10}
                  style={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em" }}
                />
              </YAxis>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(34, 211, 238, 0.3)", strokeDasharray: "3 3" }} />
              {methods.map((method) => (
                <Scatter
                  key={method}
                  name={method}
                  data={byMethod[method]}
                  fill={METHOD_COLORS[method] ?? FALLBACK_COLOR}
                  opacity={0.85}
                  r={3.2}
                  onClick={(node) => {
                    if (onSelectPlanet && node?.payload) {
                      onSelectPlanet(node.payload as Exoplanet);
                    }
                  }}
                  className="cursor-pointer hover:opacity-100 transition-opacity"
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </HudPanel>
  );
}

const PlanetScatterChart = memo(PlanetScatterChartInner);
export default PlanetScatterChart;
