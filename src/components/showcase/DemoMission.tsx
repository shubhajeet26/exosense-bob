"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Exoplanet } from "@/lib/nasa";
import { NavTab } from "../AppHeader";

interface DemoMissionProps {
  isActive: boolean;
  onExitDemo: () => void;
  allPlanets: Exoplanet[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectPlanet: (planet: Exoplanet) => void;
  onSetComparison: (planetA: Exoplanet, planetB: Exoplanet) => void;
}

export default function DemoMission({
  isActive,
  onExitDemo,
  allPlanets,
  onNavigateTab,
  onSelectPlanet,
  onSetComparison,
}: DemoMissionProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Dynamically select two high-quality candidate worlds from the real dataset
  const { demoWorldA, demoWorldB } = useMemo(() => {
    const withTempAndDist = allPlanets.filter((p) => p.pl_eqt != null && p.sy_dist != null);
    const candidateA = withTempAndDist[0] || allPlanets[0] || ({ pl_name: "World Alpha" } as Exoplanet);
    const candidateB = withTempAndDist[1] || allPlanets[1] || allPlanets[0] || ({ pl_name: "World Beta" } as Exoplanet);
    return { demoWorldA: candidateA, demoWorldB: candidateB };
  }, [allPlanets]);

  const runStepAction = useCallback(
    (stepNum: number) => {
      switch (stepNum) {
        case 1:
          onNavigateTab("dashboard");
          break;
        case 2:
          onNavigateTab("starmap");
          if (demoWorldA) onSelectPlanet(demoWorldA);
          break;
        case 3:
          onNavigateTab("observatory");
          if (demoWorldA) onSelectPlanet(demoWorldA);
          break;
        case 4:
          onNavigateTab("compare");
          if (demoWorldA && demoWorldB) onSetComparison(demoWorldA, demoWorldB);
          break;
        case 5:
          onNavigateTab("intelligence");
          break;
        case 6:
          onNavigateTab("favorites");
          break;
      }
    },
    [demoWorldA, demoWorldB, onNavigateTab, onSelectPlanet, onSetComparison]
  );

  useEffect(() => {
    if (isActive) {
      runStepAction(currentStep);
    }
  }, [isActive, currentStep, runStepAction]);

  if (!isActive) return null;

  const STEPS = [
    {
      num: 1,
      title: "MISSION CONTROL",
      directive: "Live NASA catalog telemetry ribbon & orbital scatter matrix.",
    },
    {
      num: 2,
      title: `3D STAR MAP // ${demoWorldA?.pl_name || "TARGET"}`,
      directive: "Deep-space spatial coordinates & celestial positioning.",
    },
    {
      num: 3,
      title: `PLANET OBSERVATORY // ${demoWorldA?.pl_name || "TARGET"}`,
      directive: "3D rotating WebGL planet mesh & verified NASA telemetry.",
    },
    {
      num: 4,
      title: "DUAL WORLD COMPARISON",
      directive: `Comparative differential matrix between ${demoWorldA?.pl_name} & ${demoWorldB?.pl_name}.`,
    },
    {
      num: 5,
      title: "MISSION INTELLIGENCE",
      directive: "Deterministic recommendation priorities & grounded AI briefing.",
    },
    {
      num: 6,
      title: "MY MISSION MANIFEST",
      directive: "Personal saved candidate portfolio & mission patterns.",
    },
  ];

  const stepInfo = STEPS[currentStep - 1];

  function handleNext() {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onExitDemo();
    }
  }

  function handlePrev() {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 select-none font-mono">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="p-3.5 rounded-xl bg-[#030616]/95 border-2 border-[var(--accent-cyan)] shadow-[0_0_30px_rgba(6,182,212,0.35)] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/50 flex items-center justify-center text-xs font-bold text-[var(--accent-cyan-bright)]">
            {stepInfo.num}/6
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] font-bold text-[var(--accent-cyan-bright)] uppercase tracking-widest">
                DEMO SHOWCASE
              </span>
              <span className="text-xs font-bold text-white">
                {stepInfo.title}
              </span>
            </div>
            <p className="text-[0.62rem] text-[var(--muted-light)] truncate max-w-sm">
              {stepInfo.directive}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-2.5 py-1 rounded bg-[#060c28] border border-[var(--border)] text-xs text-[var(--muted-light)] hover:text-white disabled:opacity-30 transition-all cursor-pointer"
          >
            ◀ Prev
          </button>

          <button
            onClick={handleNext}
            className="px-3.5 py-1 rounded bg-[var(--accent-cyan)]/25 hover:bg-[var(--accent-cyan)]/35 border border-[var(--accent-cyan)] text-xs font-bold text-[var(--accent-cyan-bright)] uppercase transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer"
          >
            {currentStep === STEPS.length ? "Finish Demo ✕" : "Next ▶"}
          </button>

          <button
            onClick={onExitDemo}
            className="p-1 text-[var(--muted)] hover:text-red-400 text-xs transition-colors cursor-pointer"
            title="Exit Demo"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </div>
  );
}
