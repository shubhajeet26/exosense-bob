"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavTab } from "../AppHeader";

const TOUR_STORAGE_KEY = "exosense_tour_completed_v1";

const TOUR_STEPS = [
  {
    step: 1,
    title: "EXPLORE THE 3D STAR MAP",
    badge: "STEP 01 // SPATIAL ARCHITECTURE",
    desc: "Fly through real NASA exoplanet coordinates in deep space. Inspect star systems, calculate distances from Earth, and lock onto high-interest candidates.",
    tab: "starmap" as NavTab,
    icon: "🌌",
  },
  {
    step: 2,
    title: "INVESTIGATE IN PLANET OBSERVATORY",
    badge: "STEP 02 // 3D PROJECTION & TELEMETRY",
    desc: "Examine rotating WebGL planet spheres color-mapped by equilibrium temperature. Review comprehensive physical telemetry and the deterministic Exosense score.",
    tab: "observatory" as NavTab,
    icon: "🔭",
  },
  {
    step: 3,
    title: "MISSION COPILOT & AI BRIEFINGS",
    badge: "STEP 03 // GEMINI REASONING",
    desc: "Ask Gemini conversational questions grounded strictly in NASA archival telemetry. Synthesize planetary profiles and filter planets using natural language.",
    tab: "dashboard" as NavTab,
    icon: "🤖",
  },
  {
    step: 4,
    title: "DUAL WORLD COMPARISON",
    badge: "STEP 04 // COMPARATIVE ANALYSIS",
    desc: "Evaluate two candidate exoplanets side by side with comparative differential gauges and grounded AI comparative intelligence.",
    tab: "compare" as NavTab,
    icon: "⚖️",
  },
  {
    step: 5,
    title: "MISSION INTELLIGENCE & SAVED MANIFEST",
    badge: "STEP 05 // DECISION ENGINE",
    desc: "Discover what to explore next with deterministic exploration priorities, data completeness metrics, and personalized saved mission patterns.",
    tab: "intelligence" as NavTab,
    icon: "⚡",
  },
];

interface GuidedMissionProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export default function GuidedMission({
  isOpen,
  onClose,
  onNavigateTab,
}: GuidedMissionProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const step = TOUR_STEPS[currentStepIdx];

  function handleNext() {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onNavigateTab(TOUR_STEPS[nextIdx].tab);
    } else {
      handleComplete();
    }
  }

  function handlePrev() {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      onNavigateTab(TOUR_STEPS[prevIdx].tab);
    }
  }

  function handleComplete() {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg p-6 rounded-xl bg-[#030616] border border-[var(--accent-cyan)] shadow-[0_0_40px_rgba(6,182,212,0.25)] relative overflow-hidden"
      >
        {/* Background decorative grid glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--accent-cyan)]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan-bright)] animate-pulse" />
              <span className="text-[0.62rem] font-bold tracking-widest text-[var(--accent-cyan-bright)] uppercase">
                {step.badge}
              </span>
            </div>

            <button
              onClick={handleComplete}
              className="text-[0.62rem] text-[var(--muted)] hover:text-white uppercase transition-colors cursor-pointer"
            >
              [ ✕ SKIP TOUR ]
            </button>
          </div>

          {/* Title & Icon */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-lg bg-[#050b24] border border-[var(--accent-cyan)]/40 flex items-center justify-center text-2xl">
              {step.icon}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wider uppercase">
                {step.title}
              </h3>
              <p className="text-[0.6rem] text-[var(--muted-light)]">
                Step {step.step} of {TOUR_STEPS.length} // Guided Exploration
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
            {step.desc}
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center gap-1.5 pt-2">
            {TOUR_STEPS.map((s, idx) => (
              <div
                key={s.step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx === currentStepIdx
                    ? "bg-[var(--accent-cyan-bright)] shadow-[0_0_8px_#22d3ee]"
                    : idx < currentStepIdx
                    ? "bg-[var(--accent-cyan)]/40"
                    : "bg-[#0b122c]"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="px-3 py-1.5 rounded bg-[#060c28] border border-[var(--border)] text-xs text-[var(--muted-light)] hover:text-white disabled:opacity-30 transition-all cursor-pointer"
            >
              ◀ Back
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded bg-[var(--accent-cyan)]/25 hover:bg-[var(--accent-cyan)]/35 border border-[var(--accent-cyan)] text-xs font-bold text-[var(--accent-cyan-bright)] tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {currentStepIdx === TOUR_STEPS.length - 1 ? "Start Mission 🚀" : "Next Step ▶"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
