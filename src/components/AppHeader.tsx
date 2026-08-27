"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export type NavTab = "dashboard" | "starmap" | "observatory" | "compare";

interface AppHeaderProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

export default function AppHeader({
  activeTab = "dashboard",
  onTabChange,
}: AppHeaderProps) {
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const utcYear = now.getUTCFullYear();
      const start = new Date(Date.UTC(utcYear, 0, 0));
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");

      setTimeString(
        `UTC ${utcYear}.${String(dayOfYear).padStart(3, "0")} // ${hours}:${minutes}:${seconds}`
      );
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.header
      className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-4 lg:px-8 py-3 border-b border-[var(--border)] bg-[#030614]/90 backdrop-blur-md"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Left: Brand + Subtitle */}
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--accent-cyan)]/30 bg-[#070e24]/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <div className="absolute inset-0 rounded-lg border-t border-l border-[var(--accent-cyan)] pointer-events-none" />
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <ellipse
              cx="16"
              cy="16"
              rx="13"
              ry="4.5"
              stroke="#818cf8"
              strokeWidth="1.5"
              fill="none"
              transform="rotate(-28 16 16)"
              opacity="0.85"
            />
            <circle cx="16" cy="16" r="5" fill="#3b82f6" />
            <circle cx="14" cy="14" r="1.5" fill="#ffffff" opacity="0.8" />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg lg:text-xl font-black tracking-widest uppercase font-mono"
              style={{
                background: "linear-gradient(90deg, #ffffff 0%, #93c5fd 50%, #c4b5fd 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              EXOSENSE
            </span>
            <span className="font-mono text-[0.6rem] px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/15 border border-[var(--accent-blue)]/30 text-[var(--accent-cyan-bright)] tracking-widest font-semibold uppercase">
              SYS.V8
            </span>
          </div>
          <p className="text-[0.6rem] font-mono tracking-widest uppercase text-[var(--muted-light)] opacity-80">
            Exoplanet Intelligence & Deep-Space Exploration System
          </p>
        </div>
      </div>

      {/* Center: Mission Mode Navigation Switcher */}
      {onTabChange && (
        <nav className="flex items-center gap-1 p-1 rounded-lg bg-[#050a20] border border-[var(--border)] font-mono text-xs shadow-inner flex-wrap">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[var(--accent-blue)]/20 text-white border border-[var(--accent-blue)]/50 font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "text-[var(--muted-light)] hover:text-white border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue-bright)]" />
            <span>MISSION CONTROL</span>
          </button>

          <button
            onClick={() => onTabChange("starmap")}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "starmap"
                ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)] border border-[var(--accent-cyan)]/50 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                : "text-[var(--muted-light)] hover:text-white border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan-bright)] animate-pulse" />
            <span>STAR MAP</span>
          </button>

          <button
            onClick={() => onTabChange("observatory")}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "observatory"
                ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan-bright)] border border-[var(--accent-cyan)]/50 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                : "text-[var(--muted-light)] hover:text-white border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
            <span>OBSERVATORY</span>
          </button>

          <button
            onClick={() => onTabChange("compare")}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "compare"
                ? "bg-[var(--accent-violet)]/20 text-[var(--accent-violet-bright)] border border-[var(--accent-violet)]/50 font-bold shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "text-[var(--muted-light)] hover:text-white border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)]" />
            <span>COMPARE</span>
          </button>
        </nav>
      )}

      {/* Right: Mission Telemetry Status Indicators */}
      <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070d22] border border-[var(--border)] font-mono text-[0.68rem] text-[var(--muted-light)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
          <span className="tabular-nums tracking-wider text-slate-300">{timeString || "UTC SYNCING..."}</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#070d22] border border-[var(--border)] font-mono text-[0.65rem]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="text-[var(--muted)]">DATA:</span>
          <span className="text-emerald-400 font-semibold tracking-wider">NASA ARCHIVE</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#070d22] border border-[var(--border)] font-mono text-[0.65rem]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-violet-bright)] shadow-[0_0_8px_#a78bfa]" />
          <span className="text-[var(--muted)]">AI:</span>
          <span className="text-[var(--accent-violet-bright)] font-semibold tracking-wider">COPILOT READY</span>
        </div>
      </div>
    </motion.header>
  );
}
