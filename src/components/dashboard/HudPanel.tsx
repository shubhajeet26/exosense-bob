"use client";

import React from "react";

interface HudPanelProps {
  children: React.ReactNode;
  title?: string;
  moduleCode?: string;
  badge?: {
    text: string;
    variant?: "cyan" | "emerald" | "violet" | "amber" | "blue" | "muted";
  };
  headerRight?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  subtle?: boolean;
  noPadding?: boolean;
  cornerAccent?: "cyan" | "blue" | "none";
}

export default function HudPanel({
  children,
  title,
  moduleCode,
  badge,
  headerRight,
  className = "",
  style = {},
  subtle = false,
  noPadding = false,
  cornerAccent = "cyan",
}: HudPanelProps) {
  const panelClass = subtle ? "hud-panel-subtle" : "hud-panel";

  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
    cyan: {
      bg: "rgba(6, 182, 212, 0.12)",
      text: "#22d3ee",
      border: "rgba(6, 182, 212, 0.35)",
    },
    emerald: {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#34d399",
      border: "rgba(16, 185, 129, 0.35)",
    },
    violet: {
      bg: "rgba(139, 92, 246, 0.12)",
      text: "#a78bfa",
      border: "rgba(139, 92, 246, 0.35)",
    },
    amber: {
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#fbbf24",
      border: "rgba(245, 158, 11, 0.35)",
    },
    blue: {
      bg: "rgba(59, 130, 246, 0.12)",
      text: "#60a5fa",
      border: "rgba(59, 130, 246, 0.35)",
    },
    muted: {
      bg: "rgba(100, 116, 139, 0.12)",
      text: "#94a3b8",
      border: "rgba(100, 116, 139, 0.3)",
    },
  };

  const currentBadge = badge ? badgeColors[badge.variant || "cyan"] : null;

  return (
    <div
      className={`${panelClass} rounded-lg relative transition-all duration-300 ${className}`}
      style={style}
    >
      {/* Corner brackets */}
      {cornerAccent === "cyan" && (
        <>
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />
        </>
      )}

      {cornerAccent === "blue" && (
        <>
          <div className="corner-bracket-subtle corner-subtle-tl" />
          <div className="corner-bracket-subtle corner-subtle-tr" />
          <div className="corner-bracket-subtle corner-subtle-bl" />
          <div className="corner-bracket-subtle corner-subtle-br" />
        </>
      )}

      {/* Header bar if title or moduleCode is provided */}
      {(title || moduleCode || headerRight || badge) && (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)]/70 bg-[#040817]/60 select-none">
          <div className="flex items-center gap-2 min-w-0">
            {/* Tech module identifier */}
            {moduleCode && (
              <span className="font-mono text-[0.6rem] font-bold tracking-widest text-[var(--accent-cyan)] opacity-90 uppercase px-1.5 py-0.5 rounded bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/25 shrink-0">
                {moduleCode}
              </span>
            )}

            {/* Title */}
            {title && (
              <h3 className="text-xs font-semibold tracking-wider text-[var(--foreground)] uppercase truncate font-mono">
                {title}
              </h3>
            )}

            {/* Status Badge */}
            {badge && currentBadge && (
              <span
                className="font-mono text-[0.56rem] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1"
                style={{
                  backgroundColor: currentBadge.bg,
                  color: currentBadge.text,
                  borderColor: currentBadge.border,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                  style={{ backgroundColor: currentBadge.text }}
                />
                {badge.text}
              </span>
            )}
          </div>

          {/* Right-side action slot */}
          {headerRight && <div className="flex items-center gap-2 shrink-0">{headerRight}</div>}
        </div>
      )}

      {/* Panel Body */}
      <div
        className={`hud-panel-body ${noPadding ? "" : "p-4"} ${
          className.includes("flex") || className.includes("h-full")
            ? "flex-1 min-h-0 flex flex-col"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
