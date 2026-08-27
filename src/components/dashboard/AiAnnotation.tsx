"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "./States";

// ─── Types (mirroring API response) ──────────────────────────────────────────

export type AnnotationStatus = "idle" | "loading" | "success" | "error" | "no-key";

interface Props {
  annotation: string | null;
  status: AnnotationStatus;
  error: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiAnnotation({ annotation, status, error }: Props) {
  const showPanel = status !== "idle";

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl border border-[var(--border)] p-4"
          style={{ background: "rgba(11,14,31,0.8)", backdropFilter: "blur(10px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            {/* Gemini sparkle icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"
                fill="#818cf8" opacity="0.9"/>
            </svg>
            <span className="text-[0.65rem] tracking-widest uppercase font-semibold text-[var(--accent-violet)]"
              style={{ color: "#a78bfa" }}>
              Gemini AI · Dataset Insight
            </span>
            {status === "loading" && <Spinner size={13} />}
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.p
                key="loading"
                className="text-xs text-[var(--muted)] animate-pulse"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                Analysing dataset with Gemini…
              </motion.p>
            )}
            {status === "success" && annotation && (
              <motion.p
                key="text"
                className="text-sm text-[var(--foreground)] leading-relaxed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {annotation}
              </motion.p>
            )}
            {(status === "error" || status === "no-key") && (
              <motion.div
                key="error"
                className="flex items-start gap-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <span className="text-yellow-500 text-xs mt-0.5">⚠</span>
                <p className="text-xs text-[var(--muted)]">
                  {status === "no-key"
                    ? "AI features are disabled — add GEMINI_API_KEY to .env.local to enable."
                    : (error ?? "AI annotation unavailable.")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transparency footer */}
          <p className="text-[0.6rem] text-[var(--muted)] mt-3 pt-2 border-t border-[var(--border)] leading-relaxed">
            Gemini interprets the NASA data and Exosense computed scores — it does not invent facts.
            NASA provides the underlying data. Scores are deterministic metrics, not habitability proofs.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
