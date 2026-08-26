"use client";

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      className="animate-spin"
      style={{ color: "var(--accent-blue)" }}
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

// ─── LoadingOverlay ───────────────────────────────────────────────────────────

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Spinner size={40} />
      <p className="text-sm text-[var(--muted)] animate-pulse">
        Querying NASA Exoplanet Archive…
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      {/* SVG planet illustration */}
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="30" cy="30" r="14" fill="#1e2240" stroke="var(--border)" strokeWidth="1.5" />
        <ellipse
          cx="30"
          cy="30"
          rx="28"
          ry="10"
          stroke="var(--muted)"
          strokeWidth="1.2"
          fill="none"
          transform="rotate(-20 30 30)"
          strokeDasharray="4 3"
        />
        {/* Question mark */}
        <text
          x="30"
          y="35"
          textAnchor="middle"
          fill="#64748b"
          fontSize="14"
          fontFamily="system-ui"
        >
          ?
        </text>
      </svg>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[var(--foreground)]">
          No planets found
        </p>
        <p className="text-xs text-[var(--muted)] max-w-xs">
          Try widening your filter ranges — this corner of the universe appears
          empty.
        </p>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="1.5" />
        <path d="M12 7v5" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="#f87171" />
      </svg>
      <p className="text-sm font-medium text-red-400">Failed to load data</p>
      <p className="text-xs text-[var(--muted)] max-w-xs break-all">{message}</p>
    </div>
  );
}
