"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";

// Both components rely on browser APIs — skip SSR
const Starfield = dynamic(() => import("@/components/Starfield"), {
  ssr: false,
});
const IntroSequence = dynamic(() => import("@/components/IntroSequence"), {
  ssr: false,
});

export default function Home() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <>
      {/* ── Fixed starfield background (always visible) ── */}
      <Starfield />

      {/* ── Intro overlay (plays once, then unmounts) ── */}
      {!introComplete && (
        <IntroSequence onComplete={() => setIntroComplete(true)} />
      )}

      {/* ── Main app shell (slides in after intro) ── */}
      {introComplete && (
        <div className="relative z-10 flex flex-col min-h-screen">
          <AppHeader />

          <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {/* Dashboard content will be built in Phase 2 */}
            <div className="text-center max-w-xl space-y-4">
              <p
                className="text-xs tracking-[0.3em] uppercase text-[var(--accent-cyan)]"
                style={{
                  textShadow: "0 0 12px rgba(34,211,238,0.7)",
                }}
              >
                Dashboard loading in Phase 2
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                The universe awaits.
              </h2>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                NASA exoplanet data, charts, and AI analysis will appear here.
              </p>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
