"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "obsidian" | "jwst" | "academic";

const THEME_STORAGE_KEY = "exosense_theme_mode_v1";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("obsidian");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === "obsidian" || stored === "jwst" || stored === "academic") {
        setThemeState(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // Ignore
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode =
        prev === "obsidian" ? "jwst" : prev === "jwst" ? "academic" : "obsidian";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
