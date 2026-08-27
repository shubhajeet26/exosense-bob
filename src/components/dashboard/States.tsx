"use client";

import { motion } from "framer-motion";
import HudPanel from "./HudPanel";

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      className="animate-spin text-[var(--accent-cyan)]"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingState() {
  return (
    <HudPanel moduleCode="SYS-FETCH" title="Archive Uplink" cornerAccent="cyan">
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center font-mono">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-dashed border-[var(--accent-cyan)] animate-radar-sweep opacity-50" />
          <div className="absolute">
            <Spinner size={32} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-cyan-bright)]">
            Transmitting Telemetry Query
          </p>
          <p className="text-[0.68rem] text-[var(--muted)]">
            Retrieving exoplanet observations from NASA Exoplanet Archive...
          </p>
        </div>
      </div>
    </HudPanel>
  );
}

export function EmptyState() {
  return (
    <HudPanel moduleCode="SYS-EMPTY" title="Zero Telemetry Matches" cornerAccent="cyan">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center font-mono">
        <div className="w-12 h-12 rounded-full border border-[var(--border)] bg-[#040818] flex items-center justify-center text-[var(--muted)] text-lg">
          ∅
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground)]">
            No Worlds Match Parameter Filter
          </p>
          <p className="text-[0.68rem] text-[var(--muted-light)] max-w-sm">
            Adjust discovery window, radius bounds, or detection methods to expand matrix scope.
          </p>
        </div>
      </div>
    </HudPanel>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <HudPanel moduleCode="SYS-ERR" title="Telemetry Feed Interrupted" badge={{ text: "DEGRADED", variant: "amber" }} cornerAccent="cyan">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center font-mono">
        <div className="w-12 h-12 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-400 text-lg">
          ⚠
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
            Archive Telemetry Error
          </p>
          <p className="text-[0.68rem] text-[var(--muted-light)] max-w-sm break-all">
            {message}
          </p>
        </div>
      </div>
    </HudPanel>
  );
}
