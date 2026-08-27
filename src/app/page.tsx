"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AppHeader, { NavTab } from "@/components/AppHeader";
import Dashboard from "@/components/dashboard/Dashboard";
import { useFavorites } from "@/lib/useFavorites";

// Both components rely on browser APIs — skip SSR
const Starfield = dynamic(() => import("@/components/Starfield"), {
  ssr: false,
});
const IntroSequence = dynamic(() => import("@/components/IntroSequence"), {
  ssr: false,
});

export default function Home() {
  const [introComplete, setIntroComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const { count: favoritesCount } = useFavorites();

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
          <AppHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            favoritesCount={favoritesCount}
          />
          <main className="flex-1">
            <Dashboard activeTab={activeTab} onTabChange={setActiveTab} />
          </main>
        </div>
      )}
    </>
  );
}
