"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FilterValues } from "./FilterControls";
import { Spinner } from "./States";

interface Props {
  onApply: (filters: FilterValues) => void;
  disabled: boolean;
}

type QueryStatus = "idle" | "loading" | "error";

export default function NlQueryBar({ onApply, disabled }: Props) {
  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error,  setError]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "loading";
  const canSubmit = query.trim().length > 0 && !isLoading && !disabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError(null);

    try {
      const res  = await fetch("/api/ai/query", {
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
      setError("Network error — could not reach the AI endpoint.");
    }
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: "rgba(11,14,31,0.8)", backdropFilter: "blur(10px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[0.65rem] tracking-widest uppercase font-semibold"
          style={{ color: "var(--accent-cyan)" }}>
          Natural-Language Query
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(null); setStatus("idle"); }}
          placeholder='e.g. "Show super-Earths discovered after 2015"'
          disabled={isLoading || disabled}
          maxLength={400}
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors placeholder:text-[var(--muted)] disabled:opacity-50"
        />
        <motion.button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 rounded text-xs font-semibold tracking-wide disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors"
          style={{
            background: canSubmit ? "rgba(34,211,238,0.15)" : "rgba(34,211,238,0.05)",
            border: "1px solid rgba(34,211,238,0.3)",
            color: "var(--accent-cyan)",
          }}
          whileHover={canSubmit ? { scale: 1.04 } : {}}
          whileTap={canSubmit   ? { scale: 0.96 } : {}}
          transition={{ duration: 0.12 }}
        >
          {isLoading ? <Spinner size={14} /> : "Apply"}
        </motion.button>
      </form>

      {/* Status / error */}
      {status === "loading" && (
        <p className="text-[0.65rem] text-[var(--muted)] mt-2 animate-pulse">
          Translating query with Gemini…
        </p>
      )}
      {status === "error" && error && (
        <p className="text-[0.65rem] text-yellow-500 mt-2">⚠ {error}</p>
      )}

      {/* Example hints */}
      {status === "idle" && !query && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            "Super-Earths from last 5 years",
            "Nearby planets under 2 R⊕",
            "Transit planets since 2020",
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => { setQuery(hint); inputRef.current?.focus(); }}
              className="text-[0.62rem] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent-cyan)] transition-colors cursor-pointer"
            >
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
