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

// Recharts + R3F both need browser APIs — skip SSR
const PlanetScatterChart = dynamic(() => import("./PlanetScatterChart"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-[var(--border)] flex items-center justify-center"
      style={{ height: 440, background: "rgba(11,14,31,0.8)" }}
    >
      <span className="text-xs text-[var(--muted)] animate-pulse">Loading chart…</span>
    </div>
  ),
});

const PlanetViewer = dynamic(() => import("./PlanetViewer"), {
  ssr: false,
  loading: () => null,
});

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
// once:true — never re-animates after first reveal

function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stats pill ───────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      className="flex flex-col items-center px-4 py-2 rounded-lg border border-[var(--border)]"
      style={{ background: "rgba(11,14,31,0.7)" }}
      whileHover={{ borderColor: "var(--accent-blue)", scale: 1.03 }}
      transition={{ duration: 0.15 }}
    >
      <span className="text-[0.65rem] tracking-widest uppercase text-[var(--muted)]">
        {label}
      </span>
      <span className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
        {value}
      </span>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "success" | "error";

function buildQueryString(filters: FilterValues): string {
  const p = toApiParams(filters);
  const qs = new URLSearchParams();
  if (p.yearMin        != null) qs.set("yearMin",   String(p.yearMin));
  if (p.yearMax        != null) qs.set("yearMax",   String(p.yearMax));
  if (p.radiusMin      != null) qs.set("radiusMin", String(p.radiusMin));
  if (p.radiusMax      != null) qs.set("radiusMax", String(p.radiusMax));
  if (p.discoveryMethod      ) qs.set("method",    p.discoveryMethod);
  if (p.distanceMin    != null) qs.set("distMin",   String(p.distanceMin));
  if (p.distanceMax    != null) qs.set("distMax",   String(p.distanceMax));
  return qs.toString();
}

export default function Dashboard() {
  const [filters,        setFilters]        = useState<FilterValues>(DEFAULT_FILTERS);
  const [planets,        setPlanets]        = useState<Exoplanet[]>([]);
  const [status,         setStatus]         = useState<FetchStatus>("idle");
  const [errorMsg,       setErrorMsg]       = useState("");
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: FilterValues) => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const qs  = buildQueryString(f);
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

  // Initial load + debounced re-fetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchData]);

  // Clear selection when filter results change (selected planet may no longer be in set)
  useEffect(() => {
    if (selectedPlanet && !planets.find((p) => p.pl_name === selectedPlanet.pl_name)) {
      setSelectedPlanet(null);
    }
  }, [planets, selectedPlanet]);

  // Stable callback — won't trigger DataTable re-render on unrelated state changes
  const handleSelect = useCallback((planet: Exoplanet) => {
    setSelectedPlanet((prev) =>
      prev?.pl_name === planet.pl_name ? null : planet
    );
  }, []);

  const handleClosePlanet = useCallback(() => setSelectedPlanet(null), []);

  // Derived stats — memoized
  const { uniqueMethods, avgRadius } = useMemo(() => {
    const methods = new Set(planets.map((p) => p.discoverymethod).filter(Boolean)).size;
    const avg     =
      planets.length > 0
        ? (planets.reduce((s, p) => s + (p.pl_rade ?? 0), 0) / planets.length).toFixed(2)
        : "—";
    return { uniqueMethods: methods, avgRadius: avg };
  }, [planets]);

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto px-4 py-6">

      {/* ── Page heading (viewport-triggered on first view) ── */}
      <ScrollReveal>
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
      </ScrollReveal>

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
            <StatPill label="Planets"       value={planets.length.toLocaleString()} />
            <StatPill label="Methods"       value={uniqueMethods} />
            <StatPill label="Avg Radius (R⊕)" value={avgRadius} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout: filters sidebar + content ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Filters — scroll-reveal with slight delay */}
        <ScrollReveal delay={0.05} className="w-full lg:w-64 shrink-0">
          <FilterControls values={filters} onChange={setFilters} isLoading={isLoading} />
        </ScrollReveal>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <LoadingState />
              </motion.div>
            )}
            {status === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorState message={errorMsg} />
              </motion.div>
            )}
            {status === "success" && planets.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                {/* Chart — scroll-reveal */}
                <ScrollReveal delay={0.05}>
                  <PlanetScatterChart planets={planets} />
                </ScrollReveal>

                {/* 3D Planet Viewer — scroll-reveal, only when a planet is selected */}
                <AnimatePresence>
                  {selectedPlanet && (
                    <ScrollReveal key={selectedPlanet.pl_name}>
                      <PlanetViewer
                        planet={selectedPlanet}
                        onClose={handleClosePlanet}
                      />
                    </ScrollReveal>
                  )}
                </AnimatePresence>

                {/* Table — scroll-reveal */}
                <ScrollReveal delay={0.1}>
                  <DataTable
                    planets={planets}
                    selectedName={selectedPlanet?.pl_name ?? null}
                    onSelect={handleSelect}
                  />
                </ScrollReveal>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
