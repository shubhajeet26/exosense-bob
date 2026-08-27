"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilterValues } from "./FilterControls";
import { Spinner } from "./States";
import HudPanel from "./HudPanel";

export type AnnotationStatus = "idle" | "loading" | "success" | "error" | "no-key";

interface Props {
  annotation: string | null;
  annotationStatus: AnnotationStatus;
  annotationError: string | null;
  onApplyQuery: (filters: FilterValues) => void;
  disabled: boolean;
}

type QueryStatus = "idle" | "loading" | "error";

export default function AiMissionCopilot({
  annotation,
  annotationStatus,
  annotationError,
  onApplyQuery,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [queryStatus, setQueryStatus] = useState<QueryStatus>("idle");
  const [queryError, setQueryError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isQueryLoading = queryStatus === "loading";
  const canSubmit = query.trim().length > 0 && !isQueryLoading && !disabled;

  async function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setQueryStatus("loading");
    setQueryError(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        setQueryStatus("error");
        setQueryError(data.error);
        return;
      }
      if (!data.filters) {
        setQueryStatus("error");
        setQueryError("AI could not parse a valid parameter filter. Try rephrasing.");
        return;
      }

      onApplyQuery(data.filters);
      setQueryStatus("idle");
      setQuery("");
    } catch {
      setQueryStatus("error");
      setQueryError("Tactical telemetry link interrupted.");
    }
  }

  const tacticalDirectives = [
    "Super-Earths discovered since 2018",
    "Nearby worlds under 100 parsecs",
    "Transit planets with radius under 2 R⊕",
    "Giant planets discovered by Imaging",
  ];

  return (
    <HudPanel
      title="AI Mission Copilot"
      moduleCode="COPILOT-AI"
      badge={{
        text: annotationStatus === "loading" ? "ANALYZING" : "ONLINE",
        variant: annotationStatus === "loading" ? "amber" : "violet",
      }}
      cornerAccent="cyan"
      className="space-y-4"
    >
      {/* ── Section 1: Tactical Natural-Language Command Interface ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[0.62rem] font-mono tracking-widest uppercase text-[var(--accent-violet-bright)]">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"
                fill="#a78bfa"
              />
            </svg>
            <span>TACTICAL DIRECTIVE INPUT</span>
          </div>
          <span className="text-[0.55rem] text-[var(--muted)]">NATURAL LANGUAGE</span>
        </div>

        <form onSubmit={handleQuerySubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQueryError(null);
              setQueryStatus("idle");
            }}
            placeholder='e.g. "Show Super-Earths under 100 pc"'
            disabled={isQueryLoading || disabled}
            maxLength={400}
            className="flex-1 bg-[#05091a] border border-[var(--border)] rounded px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-violet)] transition-colors placeholder:text-[var(--muted)] disabled:opacity-50"
          />
          <motion.button
            type="submit"
            disabled={!canSubmit}
            className="px-3 py-2 rounded text-xs font-mono font-semibold tracking-wider disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors flex items-center justify-center shrink-0"
            style={{
              background: canSubmit ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.06)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#c4b5fd",
            }}
            whileHover={canSubmit ? { scale: 1.03 } : {}}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
          >
            {isQueryLoading ? <Spinner size={14} /> : "EXECUTE"}
          </motion.button>
        </form>

        {/* Query status or error message */}
        {queryStatus === "loading" && (
          <p className="text-[0.62rem] font-mono text-[var(--muted-light)] animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            Decompiling natural-language directive into mission parameters…
          </p>
        )}
        {queryStatus === "error" && queryError && (
          <p className="text-[0.62rem] font-mono text-amber-400">⚠ {queryError}</p>
        )}

        {/* Quick Tactical Directive Chips */}
        {queryStatus === "idle" && !query && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tacticalDirectives.map((directive) => (
              <button
                key={directive}
                type="button"
                onClick={() => {
                  setQuery(directive);
                  inputRef.current?.focus();
                }}
                className="text-[0.6rem] font-mono px-2 py-1 rounded bg-[#070e28] border border-[var(--border)] text-[var(--muted-light)] hover:text-white hover:border-[var(--accent-violet)] transition-colors cursor-pointer text-left"
              >
                + {directive}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: AI Dataset Intelligence Briefing ── */}
      <div className="pt-3 border-t border-[var(--border)] space-y-2">
        <div className="flex items-center justify-between text-[0.62rem] font-mono tracking-widest uppercase text-[var(--accent-cyan-bright)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
            <span>DATASET INTELLIGENCE BRIEFING</span>
          </div>
          {annotationStatus === "loading" && <Spinner size={12} />}
        </div>

        <AnimatePresence mode="wait">
          {annotationStatus === "loading" && (
            <motion.div
              key="loading"
              className="p-3 rounded bg-[#060c24]/70 border border-[var(--border)] font-mono text-xs text-[var(--muted-light)] space-y-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 text-[var(--accent-cyan-bright)]">
                <span className="animate-spin text-sm">✦</span>
                <span className="text-[0.65rem] tracking-wider uppercase">Copilot Synthesizing Telemetry...</span>
              </div>
              <p className="text-[0.62rem] text-[var(--muted)] leading-relaxed">
                Analyzing active exoplanet distribution, scoring variance, and orbital characteristics.
              </p>
            </motion.div>
          )}

          {annotationStatus === "success" && annotation && (
            <motion.div
              key="text"
              className="p-3 rounded bg-[#050a20] border border-[var(--border)] space-y-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs text-[var(--foreground)] leading-relaxed">
                {annotation}
              </p>
            </motion.div>
          )}

          {(annotationStatus === "error" || annotationStatus === "no-key") && (
            <motion.div
              key="error"
              className="p-2.5 rounded bg-[#1f1508]/60 border border-amber-500/30 flex items-start gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="text-amber-400 text-xs">⚠</span>
              <p className="font-mono text-[0.65rem] text-amber-200/90 leading-relaxed">
                {annotationStatus === "no-key"
                  ? "AI features are disabled — add GEMINI_API_KEY to .env.local to enable."
                  : (annotationError ?? "AI intelligence briefing unavailable.")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transparency Verification Footer */}
        <p className="text-[0.58rem] font-mono text-[var(--muted)] pt-1 leading-normal opacity-80">
          AI interprets NASA dataset parameters & Exosense computed metrics — does not invent facts.
        </p>
      </div>
    </HudPanel>
  );
}
