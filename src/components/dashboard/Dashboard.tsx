"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Exoplanet } from "@/lib/nasa";
import FilterControls, {
  FilterValues,
  DEFAULT_FILTERS,
  toApiParams,
} from "./FilterControls";
import DataTable from "./DataTable";
import { LoadingState, EmptyState, ErrorState } from "./States";

// Recharts uses browser APIs — skip SSR
const PlanetScatterChart = dynamic(() => import("./PlanetScatterChart"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-[var(--border)] flex items-center justify-center"
      style={{ height: 440, background: "rgba(11,14,31,0.8)" }}
    >
      <span className="text-xs text-[var(--muted)] animate-pulse">
        Loading chart…
      </span>
    </div>
  ),
});

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col items-center px-4 py-2 rounded-lg border border-[var(--border)]"
      style={{ background: "rgba(11,14,31,0.7)" }}
    >
      <span className="text-[0.65rem] tracking-widest uppercase text-[var(--muted)]">
        {label}
      </span>
      <span className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "success" | "error";

function buildQueryString(filters: FilterValues): string {
  const p = toApiParams(filters);
  const qs = new URLSearchParams();
  if (p.yearMin != null) qs.set("yearMin", String(p.yearMin));
  if (p.yearMax != null) qs.set("yearMax", String(p.yearMax));
  if (p.radiusMin != null) qs.set("radiusMin", String(p.radiusMin));
  if (p.radiusMax != null) qs.set("radiusMax", String(p.radiusMax));
  if (p.discoveryMethod) qs.set("method", p.discoveryMethod);
  if (p.distanceMin != null) qs.set("distMin", String(p.distanceMin));
  if (p.distanceMax != null) qs.set("distMax", String(p.distanceMax));
  return qs.toString();
}

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Debounce: only fire after user stops changing filters for 600ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: FilterValues) => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const qs = buildQueryString(f);
      const res = await fetch(`/api/exoplanets${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: Exoplanet[] = await res.json();
      setPlanets(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, []);

  // Initial load + re-fetch on filter change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchData]);

  // Derived stats — memoized so they don't recompute on every render
  const { uniqueMethods, avgRadius } = useMemo(() => {
    const methods = new Set(planets.map((p) => p.discoverymethod).filter(Boolean)).size;
    const avg =
      planets.length > 0
        ? (planets.reduce((s, p) => s + (p.pl_rade ?? 0), 0) / planets.length).toFixed(2)
        : "—";
    return { uniqueMethods: methods, avgRadius: avg };
  }, [planets]);

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto px-4 py-6">
      {/* ── Page heading ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Exoplanet Explorer
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Real-time data from the{" "}
          <a
            href="https://exoplanetarchive.ipac.caltech.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-blue)] hover:underline"
          >
            NASA Exoplanet Archive
          </a>
        </p>
      </motion.div>

      {/* ── Stats pills ── */}
      <AnimatePresence mode="wait">
        {status === "success" && (
          <motion.div
            key="stats"
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatPill label="Planets" value={planets.length.toLocaleString()} />
            <StatPill label="Methods" value={uniqueMethods} />
            <StatPill label="Avg Radius (R⊕)" value={avgRadius} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout: filters sidebar + content ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Filters */}
        <FilterControls
          values={filters}
          onChange={setFilters}
          isLoading={isLoading}
        />

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LoadingState />
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorState message={errorMsg} />
              </motion.div>
            )}

            {status === "success" && planets.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState />
              </motion.div>
            )}

            {status === "success" && planets.length > 0 && (
              <motion.div
                key="data"
                className="flex flex-col gap-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <PlanetScatterChart planets={planets} />
                <DataTable planets={planets} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
