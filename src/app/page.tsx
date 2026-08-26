"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import Dashboard from "@/components/dashboard/Dashboard";

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

      {/* ── Main app shell ── */}
      {introComplete && (
        <div className="relative z-10 flex flex-col min-h-screen">
          <AppHeader />
          <main className="flex-1">
            <Dashboard />
          </main>
        </div>
      )}
    </>
  );
}
