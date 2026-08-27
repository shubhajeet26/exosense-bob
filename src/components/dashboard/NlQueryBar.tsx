"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FilterValues } from "./FilterControls";
import { Spinner } from "./States";
import HudPanel from "./HudPanel";

interface Props {
  onApply: (filters: FilterValues) => void;
  disabled: boolean;
}

type QueryStatus = "idle" | "loading" | "error";

export default function NlQueryBar({ onApply, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "loading";
  const canSubmit = query.trim().length > 0 && !isLoading && !disabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        setStatus("error");
        setError(data.error);
        return;
      }
      if (!data.filters) {
        setStatus("error");
        setError("AI could not parse a valid filter from your query. Try rephrasing.");
        return;
      }

      onApply(data.filters);
      setStatus("idle");
      setQuery("");
    } catch {
      setStatus("error");
      setError("Network error — could not reach the filter AI endpoint.");
    }
  }

  return (
    <HudPanel
      title="Tactical Parameter Query"
      moduleCode="FILTER-NL"
      badge={{ text: "FILTER PARSER", variant: "cyan" }}
      cornerAccent="cyan"
    >
      <div className="space-y-2 font-mono">
        <p className="text-[0.62rem] text-[var(--muted-light)] leading-snug">
          Enter natural-language criteria to automatically decompile and apply mission parameter filters.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setStatus("idle");
            }}
            placeholder='e.g. "Show Super-Earths from last 5 years"'
            disabled={isLoading || disabled}
            maxLength={400}
            className="flex-1 bg-[#05091a] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors placeholder:text-[var(--muted)] disabled:opacity-50"
          />
          <motion.button
            type="submit"
            disabled={!canSubmit}
            className="px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wide uppercase disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors flex items-center justify-center shrink-0"
            style={{
              background: canSubmit ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.06)",
              border: "1px solid rgba(6,182,212,0.35)",
              color: "var(--accent-cyan-bright)",
            }}
            whileHover={canSubmit ? { scale: 1.03 } : {}}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
          >
            {isLoading ? <Spinner size={12} /> : "APPLY"}
          </motion.button>
        </form>

        {/* Status / Error feedback */}
        {status === "loading" && (
          <p className="text-[0.62rem] text-[var(--muted-light)] animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-ping" />
            Decompiling natural-language query into filter parameters…
          </p>
        )}
        {status === "error" && error && (
          <p className="text-[0.62rem] text-amber-400">⚠ {error}</p>
        )}

        {/* Example filter chips */}
        {status === "idle" && !query && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              "Super-Earths from last 5 years",
              "Nearby worlds under 100 pc",
              "Transit planets with radius < 2 R⊕",
            ].map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => {
                  setQuery(hint);
                  inputRef.current?.focus();
                }}
                className="text-[0.58rem] px-2 py-0.5 rounded bg-[#060c24] border border-[var(--border)] text-[var(--muted-light)] hover:text-white hover:border-[var(--accent-cyan)] transition-colors cursor-pointer"
              >
                + {hint}
              </button>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
