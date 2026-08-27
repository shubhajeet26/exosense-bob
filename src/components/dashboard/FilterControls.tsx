"use client";

import { motion } from "framer-motion";
import { FilterParams } from "@/lib/nasa";
import { DISCOVERY_METHODS } from "@/lib/constants";
import { FilterValues, DEFAULT_FILTERS } from "@/lib/filterDefaults";

// Re-export so existing imports from this file continue to work
export { DISCOVERY_METHODS } from "@/lib/constants";
export type { FilterValues } from "@/lib/filterDefaults";
export { DEFAULT_FILTERS } from "@/lib/filterDefaults";

interface Props {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  isLoading: boolean;
}

// Shared input style tokens
const labelCls =
  "block text-[0.68rem] tracking-widest uppercase text-[var(--muted)] mb-1.5 select-none";
const inputCls =
  "w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors placeholder:text-[var(--muted)]";
const selectCls =
  "w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors cursor-pointer";

function RangeRow({
  label,
  minKey,
  maxKey,
  values,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  minKey: keyof FilterValues;
  maxKey: keyof FilterValues;
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          className={inputCls}
          value={values[minKey] as number}
          min={min}
          step={step}
          placeholder="Min"
          onChange={(e) =>
            onChange({ ...values, [minKey]: Number(e.target.value) })
          }
        />
        <span className="self-center text-[var(--muted)] text-xs">–</span>
        <input
          type="number"
          className={inputCls}
          value={values[maxKey] as number}
          min={min}
          step={step}
          placeholder="Max"
          onChange={(e) =>
            onChange({ ...values, [maxKey]: Number(e.target.value) })
          }
        />
      </div>
    </div>
  );
}

export function toApiParams(f: FilterValues): FilterParams {
  const p: FilterParams = {
    yearMin: f.yearMin,
    yearMax: f.yearMax,
    radiusMin: f.radiusMin > 0 ? f.radiusMin : undefined,
    radiusMax: f.radiusMax < 30 ? f.radiusMax : undefined,
    discoveryMethod: f.discoveryMethod || undefined,
    distanceMin: f.distanceMin > 0 ? f.distanceMin : undefined,
    distanceMax: f.distanceMax < 3000 ? f.distanceMax : undefined,
  };
  return p;
}

export default function FilterControls({ values, onChange, isLoading }: Props) {
  function reset() {
    onChange({ ...DEFAULT_FILTERS });
  }

  return (
    <aside
      className="w-full lg:w-64 shrink-0 rounded-xl border border-[var(--border)] p-4 space-y-5"
      style={{ background: "rgba(11,14,31,0.8)", backdropFilter: "blur(10px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest uppercase text-[var(--accent-cyan)] font-semibold">
          Filters
        </h2>
        <motion.button
          onClick={reset}
          disabled={isLoading}
          className="text-[0.65rem] tracking-wider uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40 cursor-pointer"
          whileHover={isLoading ? {} : { scale: 1.08 }}
          whileTap={isLoading   ? {} : { scale: 0.94 }}
          transition={{ duration: 0.12 }}
        >
          Reset
        </motion.button>
      </div>

      {/* Discovery year */}
      <RangeRow
        label="Discovery Year"
        minKey="yearMin"
        maxKey="yearMax"
        values={values}
        onChange={onChange}
        min={1990}
      />

      {/* Radius */}
      <RangeRow
        label="Radius (R⊕)"
        minKey="radiusMin"
        maxKey="radiusMax"
        values={values}
        onChange={onChange}
        step={0.5}
      />

      {/* Distance from Earth */}
      <RangeRow
        label="Distance (pc)"
        minKey="distanceMin"
        maxKey="distanceMax"
        values={values}
        onChange={onChange}
        step={10}
      />

      {/* Discovery method */}
      <div>
        <span className={labelCls}>Discovery Method</span>
        <select
          className={selectCls}
          value={values.discoveryMethod}
          onChange={(e) =>
            onChange({ ...values, discoveryMethod: e.target.value })
          }
        >
          <option value="">All methods</option>
          {DISCOVERY_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Live indicator */}
      {isLoading && (
        <p className="text-[0.65rem] tracking-wider text-[var(--accent-blue)] animate-pulse text-center">
          Fetching data…
        </p>
      )}
    </aside>
  );
}
