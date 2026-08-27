import { Exoplanet } from "./nasa";
import * as THREE from "three";

export interface Planet3DPosition {
  planet: Exoplanet;
  position: [number, number, number];
  color: string;
  size: number;
  distance: number;
  thermalCategory: string;
}

// Pseudo-random deterministic hash for missing RA/Dec
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function tempToHexColor(eqt: number | null): string {
  const t = eqt ?? 500;
  if (t < 300) return "#818cf8"; // cold — indigo/violet
  if (t < 600) return "#22d3ee"; // cool — cyan
  if (t < 1000) return "#34d399"; // temperate — emerald
  if (t < 1500) return "#f59e0b"; // warm — amber
  if (t < 2500) return "#f97316"; // hot — orange
  if (t < 3500) return "#ef4444"; // very hot — red
  return "#93c5fd"; // extreme — blue-white
}

export function getThermalCategory(eqt: number | null): string {
  if (eqt == null) return "Unknown Temp";
  if (eqt < 300) return "Cryogenic (< 300 K)";
  if (eqt < 600) return "Cool (300–600 K)";
  if (eqt < 1000) return "Temperate (600–1000 K)";
  if (eqt < 1500) return "Warm (1000–1500 K)";
  if (eqt < 2500) return "Hot (1500–2500 K)";
  return "Hyperthermal (> 2500 K)";
}

export const METHOD_PALETTE: Record<string, string> = {
  "Transit": "#38bdf8",
  "Radial Velocity": "#a78bfa",
  "Imaging": "#34d399",
  "Microlensing": "#f59e0b",
  "Astrometry": "#f472b6",
  "Eclipse Timing Variations": "#22d3ee",
  "Transit Timing Variations": "#fb923c",
  "Orbital Brightness Modulation": "#e879f9",
  "Pulsar Timing": "#a3e635",
  "Pulsation Timing Variations": "#fbbf24",
  "Disk Kinematics": "#60a5fa",
};

/**
 * Calculates 3D coordinates for exoplanets using astronomical coordinates
 * (RA, Dec, Distance) with smooth logarithmic radius compression so all
 * systems from 1 pc to 2500+ pc are navigable.
 */
export function calculatePlanet3DPositions(
  planets: Exoplanet[],
  colorMode: "temp" | "method" | "radius" = "temp"
): Planet3DPosition[] {
  return planets.map((p) => {
    // 1. Distance normalization (parsecs)
    const rawDist = p.sy_dist ?? 150;
    const clampedDist = Math.max(1, rawDist);
    // Radial distance in 3D scene (scale ~8 to 90 units)
    const r = 8 + (Math.log10(clampedDist) / 3.6) * 82;

    // 2. Right Ascension & Declination in radians
    let raRad: number;
    let decRad: number;

    if (p.ra != null && p.dec != null) {
      raRad = (p.ra * Math.PI) / 180;
      decRad = (p.dec * Math.PI) / 180;
    } else {
      // Deterministic spherical distribution based on name hash if coordinates missing
      const hash = stringToHash(p.pl_name || p.hostname);
      const u = (hash % 10000) / 10000;
      const v = ((hash >> 4) % 10000) / 10000;
      raRad = u * Math.PI * 2;
      decRad = (v - 0.5) * Math.PI;
    }

    // 3. Spherical to Cartesian Conversion (Z is outward/depth)
    const x = r * Math.cos(decRad) * Math.cos(raRad);
    const y = r * Math.sin(decRad);
    const z = r * Math.cos(decRad) * Math.sin(raRad);

    // 4. Color determination
    let color: string;
    if (colorMode === "temp") {
      color = tempToHexColor(p.pl_eqt);
    } else if (colorMode === "method") {
      color = METHOD_PALETTE[p.discoverymethod ?? ""] ?? "#94a3b8";
    } else {
      // Radius gradient: blue (<1.5 R⊕) to cyan (1.5–4 R⊕) to violet (>4 R⊕)
      const rad = p.pl_rade ?? 1;
      color = rad < 1.5 ? "#60a5fa" : rad < 4 ? "#22d3ee" : "#c084fc";
    }

    // 5. Visual node size
    const rawR = p.pl_rade ?? 1;
    const visualSize = 0.45 + Math.min(Math.max(rawR * 0.12, 0.1), 1.2);

    return {
      planet: p,
      position: [x, y, z],
      color,
      size: visualSize,
      distance: rawDist,
      thermalCategory: getThermalCategory(p.pl_eqt),
    };
  });
}
