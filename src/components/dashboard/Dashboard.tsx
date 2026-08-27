"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Exoplanet } from "@/lib/nasa";
import { PlanetScore } from "@/lib/scoring";
import FilterControls, {
  FilterValues,
  DEFAULT_FILTERS,
  toApiParams,
} from "./FilterControls";
import NlQueryBar from "./NlQueryBar";
import DataTable from "./DataTable";
import { LoadingState, EmptyState, ErrorState } from "./States";
import AiMissionCopilot from "./AiMissionCopilot";
import MissionTelemetryBar from "./MissionTelemetryBar";
import { type ProfileStatus } from "./PlanetViewer";
import StarMapExplorer from "../starmap/StarMapExplorer";

const PlanetScatterChart = dynamic(() => import("./PlanetScatterChart"), {
  ssr: false,
  loading: () => (
    <div
      className="hud-panel rounded-lg flex items-center justify-center"
      style={{ height: 440 }}
    >
      <span className="font-mono text-xs text-[var(--muted)] animate-pulse">Initializing orbital matrix…</span>
    </div>
  ),
});

const PlanetViewer = dynamic(() => import("./PlanetViewer"), {
  ssr: false,
  loading: () => null,
});

type FetchStatus = "idle" | "loading" | "success" | "error";

interface DashboardProps {
  activeTab?: "dashboard" | "starmap";
  onTabChange?: (tab: "dashboard" | "starmap") => void;
}

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

export default function Dashboard({
  activeTab = "dashboard",
  onTabChange,
}: DashboardProps) {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null);
  const dataDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profile, setProfile] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [planetScore, setPlanetScore] = useState<PlanetScore | null>(null);

  // ── NASA Data Fetch ──
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

  useEffect(() => {
    if (dataDebounceRef.current) clearTimeout(dataDebounceRef.current);
    dataDebounceRef.current = setTimeout(() => fetchData(filters), 600);
    return () => {
      if (dataDebounceRef.current) clearTimeout(dataDebounceRef.current);
    };
  }, [filters, fetchData]);

  useEffect(() => {
    if (selectedPlanet && !planets.find((p) => p.pl_name === selectedPlanet.pl_name)) {
      setSelectedPlanet(null);
    }
  }, [planets, selectedPlanet]);

  // ── Planet Selection & AI Profile ──
  const handleSelectPlanet = useCallback((planet: Exoplanet | null) => {
    setSelectedPlanet((prev) => (prev?.pl_name === planet?.pl_name ? null : planet));
  }, []);

  const handleClosePlanet = useCallback(() => setSelectedPlanet(null), []);

  const handleOpenObservatory = useCallback(
    (planet: Exoplanet) => {
      setSelectedPlanet(planet);
      if (onTabChange) {
        onTabChange("dashboard");
      }
    },
    [onTabChange]
  );

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planet: selectedPlanet }),
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

    return () => {
      cancelled = true;
    };
  }, [selectedPlanet]);

  const isLoading = status === "loading";

  return (
    <div className="hud-grid-bg min-h-screen flex flex-col gap-5 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      {/* ── View 1: Star Map Explorer ── */}
      {activeTab === "starmap" && (
        <motion.div
          key="starmap-view"
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <StarMapExplorer
            planets={planets}
            filters={filters}
            onFilterChange={setFilters}
            selectedPlanet={selectedPlanet}
            onSelectPlanet={handleSelectPlanet}
            onOpenObservatory={handleOpenObservatory}
          />
        </motion.div>
      )}

      {/* ── View 2: Mission Control Dashboard ── */}
      {activeTab === "dashboard" && (
        <motion.div
          key="dashboard-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Top Telemetry HUD Ribbon */}
          <MissionTelemetryBar
            planets={planets}
            selectedPlanet={selectedPlanet}
            totalFiltered={planets.length}
            isLoading={isLoading}
          />

          {/* Mission Control Main Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left / Center Zone: Main Observational Focal Area (7 cols on desktop) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Target Observatory (if selected) */}
              <AnimatePresence mode="wait">
                {selectedPlanet && (
                  <motion.div
                    key={selectedPlanet.pl_name}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlanetViewer
                      planet={selectedPlanet}
                      onClose={handleClosePlanet}
                      profile={profile}
                      profileStatus={profileStatus}
                      profileError={profileError}
                      score={planetScore}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Orbital Scatter Matrix Chart */}
              <PlanetScatterChart
                planets={planets}
                onSelectPlanet={handleSelectPlanet}
              />
            </div>

            {/* Right Zone: AI Mission Copilot & Mission Parameters (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Grounded Conversational AI Mission Copilot */}
              <AiMissionCopilot
                planets={planets}
                filters={filters}
                selectedPlanet={selectedPlanet}
                onSelectPlanet={handleSelectPlanet}
                disabled={isLoading}
              />

              {/* Tactical Natural-Language Filter Query */}
              <NlQueryBar
                onApply={setFilters}
                disabled={isLoading}
              />

              {/* Mission Parameters */}
              <FilterControls
                values={filters}
                onChange={setFilters}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Lower Command Deck: Discovered Worlds Database Table */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {status === "loading" && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                  key="table"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DataTable
                    planets={planets}
                    selectedName={selectedPlanet?.pl_name ?? null}
                    onSelect={handleSelectPlanet}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
