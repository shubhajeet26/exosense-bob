"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntroSequenceProps {
  onComplete: () => void;
}

/**
 * Full-screen intro sequence.
 * 1. Shows the background video immediately.
 * 2. After 2 s, fades in the welcome text.
 * 3. After a further 2 s, fades everything out and calls onComplete.
 * A "Skip intro" button is available at any time.
 */
export default function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [phase, setPhase] = useState<"video" | "text" | "exit">("video");

  // Phase timer
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 2000);
    const t2 = setTimeout(() => setPhase("exit"), 4200);
    const t3 = setTimeout(() => onComplete(), 5000); // allow exit anim to finish
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  function handleSkip() {
    setPhase("exit");
    setTimeout(() => onComplete(), 700);
  }

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          key="intro-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* ── Background video ── */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.45) saturate(1.2)" }}
          >
            <source src="/videos/intro.mp4" type="video/mp4" />
          </video>

          {/* ── Dark vignette overlay ── */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, rgba(3,4,13,0.85) 100%)",
            }}
          />

          {/* ── Welcome text ── */}
          <AnimatePresence>
            {phase === "text" && (
              <motion.div
                key="welcome-text"
                className="relative z-10 flex flex-col items-center gap-4 text-center px-6 select-none"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.p
                  className="text-sm font-medium tracking-[0.35em] uppercase text-[var(--accent-cyan)] text-glow-cyan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                >
                  NASA Exoplanet Archive
                </motion.p>

                <motion.h1
                  className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
                  initial={{ opacity: 0, letterSpacing: "0.4em" }}
                  animate={{ opacity: 1, letterSpacing: "-0.01em" }}
                  transition={{ delay: 0.1, duration: 1.1, ease: "easeOut" }}
                >
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, #e8eaf6 0%, #93c5fd 40%, #818cf8 70%, #c4b5fd 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Hi, Welcome to
                  </span>
                  <br />
                  <span className="text-glow-violet" style={{ color: "#a78bfa" }}>
                    Exosense
                  </span>
                </motion.h1>

                <motion.p
                  className="mt-2 text-base md:text-lg text-[var(--muted)] max-w-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  Explore thousands of worlds beyond our solar system.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Skip button ── */}
          <motion.button
            onClick={handleSkip}
            className="absolute bottom-8 right-8 z-10 text-xs tracking-widest uppercase text-[var(--muted)] hover:text-white transition-colors duration-200 px-3 py-2 rounded border border-[var(--border)] hover:border-[var(--accent-blue)] cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Skip intro ›
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
