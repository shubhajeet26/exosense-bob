"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore } from "@/lib/scoring";
import FilterControls, {
  FilterValues,
  DEFAULT_FILTERS,
  toApiParams,
} from "./FilterControls";
import DataTable from "./DataTable";
import { LoadingState, EmptyState, ErrorState } from "./States";
import AiAnnotation, { AnnotationStatus } from "./AiAnnotation";
import NlQueryBar from "./NlQueryBar";
import { type ProfileStatus } from "./PlanetViewer";

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

/** Build a human-readable summary of active filters for Gemini context */
function filterSummary(f: FilterValues): string {
  const parts: string[] = [];
  if (f.yearMin !== DEFAULT_FILTERS.yearMin || f.yearMax !== DEFAULT_FILTERS.yearMax)
    parts.push(`years ${f.yearMin}–${f.yearMax}`);
  if (f.radiusMin > 0 || f.radiusMax < 30)
    parts.push(`radius ${f.radiusMin}–${f.radiusMax} R⊕`);
  if (f.discoveryMethod) parts.push(`method: ${f.discoveryMethod}`);
  if (f.distanceMin > 0 || f.distanceMax < 3000)
    parts.push(`distance ${f.distanceMin}–${f.distanceMax} pc`);
  return parts.length ? parts.join(", ") : "all planets (default filters)";
}

export default function Dashboard() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [filters,        setFilters]        = useState<FilterValues>(DEFAULT_FILTERS);
  const [planets,        setPlanets]        = useState<Exoplanet[]>([]);
  const [status,         setStatus]         = useState<FetchStatus>("idle");
  const [errorMsg,       setErrorMsg]       = useState("");
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null);
  const dataDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI annotation state ──────────────────────────────────────────────────────
  const [annotation,       setAnnotation]       = useState<string | null>(null);
  const [annotationStatus, setAnnotationStatus] = useState<AnnotationStatus>("idle");
  const [annotationError,  setAnnotationError]  = useState<string | null>(null);
  const annotDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI planet profile state ──────────────────────────────────────────────────
  const [profile,       setProfile]       = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [planetScore,   setPlanetScore]   = useState<PlanetScore | null>(null);

  // ── NASA data fetch ──────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (dataDebounceRef.current) clearTimeout(dataDebounceRef.current);
    dataDebounceRef.current = setTimeout(() => fetchData(filters), 600);
    return () => { if (dataDebounceRef.current) clearTimeout(dataDebounceRef.current); };
  }, [filters, fetchData]);

  // Clear selection when filtered results change
  useEffect(() => {
    if (selectedPlanet && !planets.find((p) => p.pl_name === selectedPlanet.pl_name)) {
      setSelectedPlanet(null);
    }
  }, [planets, selectedPlanet]);

  // ── AI annotation — fires 2 s after planets data settles ────────────────────
  const fetchAnnotation = useCallback(async (data: Exoplanet[], filt: FilterValues) => {
    if (data.length === 0) {
      setAnnotationStatus("idle");
      setAnnotation(null);
      return;
    }
    setAnnotationStatus("loading");
    setAnnotationError(null);
    try {
      const res  = await fetch("/api/ai/annotate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planets: data, filterSummary: filterSummary(filt) }),
      });
      const json = await res.json();
      if (json.annotation) {
        setAnnotation(json.annotation);
        setAnnotationStatus("success");
      } else if (json.error?.includes("GEMINI_API_KEY")) {
        setAnnotationStatus("no-key");
        setAnnotationError(json.error);
      } else {
        setAnnotationStatus("error");
        setAnnotationError(json.error ?? "Unknown AI error.");
      }
    } catch {
      setAnnotationStatus("error");
      setAnnotationError("Network error reaching AI annotation service.");
    }
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    if (annotDebounceRef.current) clearTimeout(annotDebounceRef.current);
    // 2 s debounce — wait for user to stop changing filters
    annotDebounceRef.current = setTimeout(() => fetchAnnotation(planets, filters), 2000);
    return () => { if (annotDebounceRef.current) clearTimeout(annotDebounceRef.current); };
  }, [planets, status, filters, fetchAnnotation]);

  // ── Planet selection & AI profile ────────────────────────────────────────────
  const handleSelect = useCallback((planet: Exoplanet) => {
    setSelectedPlanet((prev) =>
      prev?.pl_name === planet.pl_name ? null : planet
    );
  }, []);

  const handleClosePlanet = useCallback(() => setSelectedPlanet(null), []);

  // Fetch AI profile whenever selected planet changes
  useEffect(() => {
    if (!selectedPlanet) {
      setProfileStatus("idle");
      setProfile(null);
      setProfileError(null);
      setPlanetScore(null);
      return;
    }
    let cancelled = false;
    setProfileStatus("loading");
    setProfile(null);
    setProfileError(null);

    fetch("/api/ai/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ planet: selectedPlanet }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.score) setPlanetScore(json.score);
        if (json.profile) {
          setProfile(json.profile);
          setProfileStatus("success");
        } else {
          setProfileStatus("error");
          setProfileError(json.error ?? "AI profile unavailable.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileStatus("error");
          setProfileError("Network error reaching AI profile service.");
        }
      });

    return () => { cancelled = true; };
  }, [selectedPlanet]);

  // ── NL query handler ─────────────────────────────────────────────────────────
  const handleNlApply = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────
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

      {/* ── Page heading ── */}
      <ScrollReveal>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Exoplanet Explorer
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Real-time data from the{" "}
          <a href="https://exoplanetarchive.ipac.caltech.edu" target="_blank"
            rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">
            NASA Exoplanet Archive
          </a>
        </p>
      </ScrollReveal>

      {/* ── Stats pills ── */}
      <AnimatePresence mode="wait">
        {status === "success" && (
          <motion.div key="stats" className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <StatPill label="Planets"         value={planets.length.toLocaleString()} />
            <StatPill label="Methods"         value={uniqueMethods} />
            <StatPill label="Avg Radius (R⊕)" value={avgRadius} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left column: filters + NL query + AI annotation */}
        <ScrollReveal delay={0.05} className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          <FilterControls values={filters} onChange={setFilters} isLoading={isLoading} />
          <NlQueryBar onApply={handleNlApply} disabled={isLoading} />
          <AiAnnotation
            annotation={annotation}
            status={annotationStatus}
            error={annotationError}
          />
        </ScrollReveal>

        {/* Right column: content */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
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
              <motion.div key="data" className="flex flex-col gap-6"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>

                {/* Chart */}
                <ScrollReveal delay={0.05}>
                  <PlanetScatterChart planets={planets} />
                </ScrollReveal>

                {/* 3D Viewer + AI Profile */}
                <AnimatePresence>
                  {selectedPlanet && (
                    <ScrollReveal key={selectedPlanet.pl_name}>
                      <PlanetViewer
                        planet={selectedPlanet}
                        onClose={handleClosePlanet}
                        profile={profile}
                        profileStatus={profileStatus}
                        profileError={profileError}
                        score={planetScore}
                      />
                    </ScrollReveal>
                  )}
                </AnimatePresence>

                {/* Table */}
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
