"use client";

import { useMemo, memo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from "recharts";
import { Exoplanet } from "@/lib/nasa";

// Max SVG circles to render across all series.
// Recharts renders one <circle> per point — beyond ~600 total the frame budget
// gets tight on mid-range hardware.
const MAX_CHART_POINTS = 600;

/**
 * Reservoir-sample `arr` down to at most `max` items.
 * Uses a simple modulo stride so the distribution stays even.
 */
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

// ─── Colour palette per discovery method ─────────────────────────────────────
// Chosen to stay accessible on a dark background

const METHOD_COLORS: Record<string, string> = {
  "Transit": "#3b82f6",               // electric blue
  "Radial Velocity": "#a78bfa",       // violet
  "Imaging": "#34d399",               // emerald
  "Microlensing": "#f59e0b",          // amber
  "Astrometry": "#f472b6",            // pink
  "Eclipse Timing Variations": "#22d3ee", // cyan
  "Transit Timing Variations": "#fb923c", // orange
  "Orbital Brightness Modulation": "#e879f9", // fuchsia
  "Pulsar Timing": "#a3e635",         // lime
  "Pulsation Timing Variations": "#fbbf24", // yellow
  "Disk Kinematics": "#60a5fa",       // light blue
};
const FALLBACK_COLOR = "#94a3b8";

// ─── Tooltip ─────────────────────────────────────────────────────────────────

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
      className="rounded-lg border border-[var(--border)] p-3 text-xs space-y-1 shadow-xl"
      style={{ background: "rgba(11,14,31,0.95)", minWidth: 180 }}
    >
      <p className="font-semibold text-[var(--foreground)] text-sm">{d.pl_name}</p>
      <p className="text-[var(--muted)]">Host: {d.hostname}</p>
      <p className="text-[var(--muted)]">
        Semi-major axis:{" "}
        <span className="text-[var(--foreground)]">
          {d.pl_orbsmax != null ? `${d.pl_orbsmax.toFixed(3)} AU` : "—"}
        </span>
      </p>
      <p className="text-[var(--muted)]">
        Radius:{" "}
        <span className="text-[var(--foreground)]">
          {d.pl_rade != null ? `${d.pl_rade.toFixed(2)} R⊕` : "—"}
        </span>
      </p>
      <p className="text-[var(--muted)]">
        Distance:{" "}
        <span className="text-[var(--foreground)]">
          {d.sy_dist != null ? `${d.sy_dist.toFixed(1)} pc` : "—"}
        </span>
      </p>
      <p className="text-[var(--muted)]">
        Method:{" "}
        <span className="text-[var(--foreground)]">{d.discoverymethod ?? "—"}</span>
      </p>
      <p className="text-[var(--muted)]">Year: {d.disc_year ?? "—"}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  planets: Exoplanet[];
}

function PlanetScatterChartInner({ planets }: Props) {
  // Memoize the full grouping + downsampling — only recomputes when planets array changes
  const { byMethod, methods, totalShown, totalPlottable } = useMemo(() => {
    // 1. Group by method, keeping only plottable points
    const grouped = planets.reduce<Record<string, Exoplanet[]>>((acc, p) => {
      if (p.pl_orbsmax == null || p.pl_rade == null) return acc;
      const key = p.discoverymethod ?? "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    const methodKeys = Object.keys(grouped);
    const plottable = methodKeys.reduce((s, k) => s + grouped[k].length, 0);

    // 2. Downsample proportionally across methods so total ≤ MAX_CHART_POINTS
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
    <div
      className="rounded-xl border border-[var(--border)] p-4 pt-5"
      style={{ background: "rgba(11,14,31,0.8)", backdropFilter: "blur(10px)" }}
    >
      {/* Chart title */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Planet Radius vs. Orbital Distance
          </h3>
          <p className="text-[0.7rem] text-[var(--muted)] mt-0.5">
            Coloured by discovery method · hover for details
          </p>
        </div>
        {isSampled && (
          <span className="text-[0.65rem] text-[var(--muted)] border border-[var(--border)] rounded px-2 py-0.5 shrink-0">
            Showing {totalShown.toLocaleString()} of {totalPlottable.toLocaleString()} points
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 4"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="pl_orbsmax"
            type="number"
            scale="log"
            domain={["auto", "auto"]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            name="Semi-major axis"
          >
            <Label
              value="Semi-major axis (AU, log scale)"
              offset={-12}
              position="insideBottom"
              style={{ fill: "#64748b", fontSize: 11 }}
            />
          </XAxis>
          <YAxis
            dataKey="pl_rade"
            type="number"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            name="Planet radius"
          >
            <Label
              value="Radius (R⊕)"
              angle={-90}
              position="insideLeft"
              offset={10}
              style={{ fill: "#64748b", fontSize: 11 }}
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 12 }}
            iconSize={8}
          />
          {methods.map((method) => (
            <Scatter
              key={method}
              name={method}
              data={byMethod[method]}
              fill={METHOD_COLORS[method] ?? FALLBACK_COLOR}
              opacity={0.82}
              r={3}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// Wrap in memo so it only re-renders when the planets array reference changes
const PlanetScatterChart = memo(PlanetScatterChartInner);
export default PlanetScatterChart;
