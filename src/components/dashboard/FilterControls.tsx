"use client";

import { motion } from "framer-motion";
import { FilterParams } from "@/lib/nasa";
import { DISCOVERY_METHODS } from "@/lib/constants";
import { FilterValues, DEFAULT_FILTERS } from "@/lib/filterDefaults";
import HudPanel from "./HudPanel";

export { DISCOVERY_METHODS } from "@/lib/constants";
export type { FilterValues } from "@/lib/filterDefaults";
export { DEFAULT_FILTERS } from "@/lib/filterDefaults";

interface Props {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  isLoading: boolean;
}

const techLabelCls =
  "block font-mono text-[0.62rem] tracking-widest uppercase text-[var(--muted-light)] mb-1 select-none flex items-center justify-between";
const techInputCls =
  "w-full bg-[#05091a] border border-[var(--border)] rounded px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors placeholder:text-[var(--muted)]";
const techSelectCls =
  "w-full bg-[#05091a] border border-[var(--border)] rounded px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors cursor-pointer";

function ParameterRangeRow({
  label,
  unit,
  minKey,
  maxKey,
  values,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  unit: string;
  minKey: keyof FilterValues;
  maxKey: keyof FilterValues;
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="space-y-1">
      <div className={techLabelCls}>
        <span>{label}</span>
        <span className="text-[var(--accent-cyan-bright)] opacity-80">{unit}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className={techInputCls}
          value={values[minKey] as number}
          min={min}
          step={step}
          placeholder="Min"
          onChange={(e) =>
            onChange({ ...values, [minKey]: Number(e.target.value) })
          }
        />
        <span className="font-mono text-[var(--muted)] text-xs select-none">→</span>
        <input
          type="number"
          className={techInputCls}
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

  const activeCount = [
    values.yearMin !== DEFAULT_FILTERS.yearMin || values.yearMax !== DEFAULT_FILTERS.yearMax,
    values.radiusMin > 0 || values.radiusMax < 30,
    Boolean(values.discoveryMethod),
    values.distanceMin > 0 || values.distanceMax < 3000,
  ].filter(Boolean).length;

  return (
    <HudPanel
      title="Mission Parameters"
      moduleCode="PAR-01"
      badge={activeCount > 0 ? { text: `${activeCount} ACTIVE`, variant: "cyan" } : { text: "DEFAULT", variant: "muted" }}
      headerRight={
        <motion.button
          onClick={reset}
          disabled={isLoading}
          className="font-mono text-[0.6rem] tracking-wider uppercase text-[var(--muted-light)] hover:text-white px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent-cyan)] transition-colors disabled:opacity-40 cursor-pointer"
          whileHover={isLoading ? {} : { scale: 1.05 }}
          whileTap={isLoading ? {} : { scale: 0.95 }}
        >
          Reset
        </motion.button>
      }
      cornerAccent="cyan"
    >
      <div className="space-y-4">
        <ParameterRangeRow
          label="Discovery Window"
          unit="YEAR"
          minKey="yearMin"
          maxKey="yearMax"
          values={values}
          onChange={onChange}
          min={1990}
        />

        <ParameterRangeRow
          label="Planet Radius Range"
          unit="R⊕"
          minKey="radiusMin"
          maxKey="radiusMax"
          values={values}
          onChange={onChange}
          step={0.5}
        />

        <ParameterRangeRow
          label="Distance Range"
          unit="PARSECS"
          minKey="distanceMin"
          maxKey="distanceMax"
          values={values}
          onChange={onChange}
          step={10}
        />

        <div className="space-y-1">
          <div className={techLabelCls}>
            <span>Detection Technique</span>
            <span className="text-[var(--accent-cyan-bright)] opacity-80">METHOD</span>
          </div>
          <select
            className={techSelectCls}
            value={values.discoveryMethod}
            onChange={(e) =>
              onChange({ ...values, discoveryMethod: e.target.value })
            }
          >
            <option value="">ALL DETECTION METHODS</option>
            {DISCOVERY_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="pt-1 flex items-center justify-center gap-2 font-mono text-[0.62rem] text-[var(--accent-cyan-bright)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
            <span>TRANSMITTING QUERY TO ARCHIVE...</span>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
