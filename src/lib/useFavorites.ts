"use client";

import { useState, useEffect, useCallback } from "react";
import { Exoplanet } from "./nasa";

const FAVORITES_STORAGE_KEY = "exosense_mission_favorites_v1";

export function useFavorites() {
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavoriteNames(parsed);
        }
      }
    } catch {
      // LocalStorage unavailable
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever favoriteNames changes
  const saveFavorites = useCallback((names: string[]) => {
    setFavoriteNames(names);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(names));
    } catch {
      // Ignore
    }
  }, []);

  const toggleFavorite = useCallback(
    (planetName: string) => {
      setFavoriteNames((prev) => {
        const exists = prev.includes(planetName);
        const next = exists
          ? prev.filter((name) => name !== planetName)
          : [...prev, planetName];
        try {
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (planetName: string) => favoriteNames.includes(planetName),
    [favoriteNames]
  );

  const clearFavorites = useCallback(() => {
    setFavoriteNames([]);
    try {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    favoriteNames,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    isLoaded,
    count: favoriteNames.length,
  };
}
