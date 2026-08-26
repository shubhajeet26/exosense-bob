"use client";

import { motion } from "framer-motion";

export default function AppHeader() {
  return (
    <motion.header
      className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[var(--border)]"
      style={{ background: "rgba(11,14,31,0.75)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Logo / wordmark */}
      <div className="flex items-center gap-3">
        {/* SVG planet logo placeholder */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          {/* Orbit ring */}
          <ellipse
            cx="16"
            cy="16"
            rx="14"
            ry="5"
            stroke="#818cf8"
            strokeWidth="1.5"
            fill="none"
            transform="rotate(-30 16 16)"
            opacity="0.7"
          />
          {/* Planet body */}
          <circle cx="16" cy="16" r="7" fill="#3b82f6" opacity="0.9" />
          {/* Highlight */}
          <circle cx="13.5" cy="13.5" r="2.2" fill="white" opacity="0.2" />
        </svg>

        <span
          className="text-xl font-bold tracking-tight"
          style={{
            background:
              "linear-gradient(90deg, #93c5fd 0%, #c4b5fd 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Exosense
        </span>
      </div>

      {/* Right-side nav placeholder */}
      <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <span className="hidden sm:inline">NASA Exoplanet Archive</span>
        <span
          className="px-2 py-0.5 rounded text-xs border border-[var(--accent-blue)] text-[var(--accent-blue)]"
          style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}
        >
          ALPHA
        </span>
      </nav>
    </motion.header>
  );
}
