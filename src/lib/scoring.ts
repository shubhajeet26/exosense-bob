/**
 * Exosense Exploratory Interest Score
 *
 * A simplified, deterministic score loosely inspired by the Earth Similarity
 * Index (ESI). It is NOT a validated scientific habitability prediction — it is
 * an exploratory/comparative metric for ranking planets within the NASA dataset.
 *
 * Inputs: pl_eqt (equilibrium temperature, K)
 *         pl_rade (planet radius, Earth radii)
 *         st_teff (stellar effective temperature, K)
 *
 * Each factor is a value 0–1 where 1 = most Earth-like for that dimension.
 * The final score is the geometric mean of available factors, scaled 0–100.
 * Missing values are handled gracefully (excluded from the mean rather than
 * treated as 0, so sparse data doesn't unfairly tank the score).
 */

import { Exoplanet } from "./nasa";

export interface ScoreFactor {
  name: string;
  value: number;     // 0–1
  weight: number;    // relative contribution weight
  note: string;      // human-readable explanation
  available: boolean;
}

export interface PlanetScore {
  score: number;           // 0–100, deterministic
  factors: ScoreFactor[];
  explanation: string;     // paragraph suitable for display / Gemini context
}

// ─── Factor calculators ───────────────────────────────────────────────────────

/**
 * Temperature similarity to Earth (~255 K effective, ~288 K surface).
 * We use a Gaussian centred on 270 K (midpoint) with σ ≈ 200 K.
 * Planets in the 200–350 K range score near 1; very hot/cold planets near 0.
 */
function temperatureFactor(eqt: number | null): ScoreFactor {
  if (eqt == null) {
    return {
      name: "Temperature",
      value: 0,
      weight: 0.4,
      note: "Equilibrium temperature not available.",
      available: false,
    };
  }
  const centre = 270;
  const sigma  = 200;
  const value  = Math.exp(-0.5 * Math.pow((eqt - centre) / sigma, 2));
  let note: string;
  if (eqt < 150)       note = `Very cold (${eqt.toFixed(0)} K) — far below habitable range.`;
  else if (eqt < 200)  note = `Cold (${eqt.toFixed(0)} K) — below typical habitable range.`;
  else if (eqt < 350)  note = `Potentially temperate (${eqt.toFixed(0)} K) — within habitable range.`;
  else if (eqt < 600)  note = `Warm (${eqt.toFixed(0)} K) — above typical habitable range.`;
  else if (eqt < 1500) note = `Hot (${eqt.toFixed(0)} K) — too hot for liquid water.`;
  else                 note = `Extremely hot (${eqt.toFixed(0)} K) — hostile conditions.`;
  return { name: "Temperature", value, weight: 0.4, note, available: true };
}

/**
 * Radius similarity to Earth (1 R⊕).
 * Gaussian centred on 1.0 R⊕, σ ≈ 0.8 R⊕.
 * Super-Earths (1–1.5 R⊕) and mini-Neptunes (1.5–3 R⊕) score progressively lower.
 * Giant planets (>4 R⊕) score near 0.
 */
function radiusFactor(rade: number | null): ScoreFactor {
  if (rade == null) {
    return {
      name: "Radius",
      value: 0,
      weight: 0.35,
      note: "Planet radius not available.",
      available: false,
    };
  }
  const value = Math.exp(-0.5 * Math.pow((rade - 1.0) / 0.8, 2));
  let note: string;
  if (rade < 0.5)       note = `Sub-Earth radius (${rade.toFixed(2)} R⊕).`;
  else if (rade < 1.25) note = `Earth-sized (${rade.toFixed(2)} R⊕) — strong size similarity.`;
  else if (rade < 2.0)  note = `Super-Earth (${rade.toFixed(2)} R⊕) — moderately Earth-like size.`;
  else if (rade < 4.0)  note = `Mini-Neptune (${rade.toFixed(2)} R⊕) — likely gas-dominated.`;
  else                  note = `Giant planet (${rade.toFixed(2)} R⊕) — not Earth-like in size.`;
  return { name: "Radius", value, weight: 0.35, note, available: true };
}

/**
 * Stellar temperature similarity to the Sun (5778 K).
 * Gaussian centred on 5778 K, σ ≈ 1500 K.
 * Stars too cool (M/K dwarfs) or too hot (A/B stars) score lower.
 */
function stellarFactor(teff: number | null): ScoreFactor {
  if (teff == null) {
    return {
      name: "Stellar Type",
      value: 0,
      weight: 0.25,
      note: "Stellar temperature not available.",
      available: false,
    };
  }
  const value = Math.exp(-0.5 * Math.pow((teff - 5778) / 1500, 2));
  let note: string;
  if (teff < 3500)      note = `Very cool M-dwarf star (${teff.toFixed(0)} K).`;
  else if (teff < 4500) note = `Cool K-type star (${teff.toFixed(0)} K).`;
  else if (teff < 6000) note = `Sun-like G-type star (${teff.toFixed(0)} K) — favourable.`;
  else if (teff < 7500) note = `Warm F-type star (${teff.toFixed(0)} K).`;
  else                  note = `Hot A/B-type star (${teff.toFixed(0)} K) — high UV output.`;
  return { name: "Stellar Type", value, weight: 0.25, note, available: true };
}

// ─── Aggregator ───────────────────────────────────────────────────────────────

export function scorePlanet(planet: Exoplanet): PlanetScore {
  const factors = [
    temperatureFactor(planet.pl_eqt),
    radiusFactor(planet.pl_rade),
    stellarFactor(planet.st_teff),
  ];

  const available = factors.filter((f) => f.available);

  let score = 0;
  if (available.length > 0) {
    // Weighted geometric mean of available factors, scaled 0–100
    const totalWeight = available.reduce((s, f) => s + f.weight, 0);
    const logSum = available.reduce(
      (s, f) => s + (f.weight / totalWeight) * Math.log(Math.max(f.value, 1e-9)),
      0
    );
    score = Math.round(Math.exp(logSum) * 100 * 10) / 10; // 1 decimal place
  }

  // Build explanation paragraph
  const factorLines = factors.map((f) =>
    f.available ? `${f.name}: ${f.note}` : `${f.name}: not available.`
  );
  const dataCount = available.length;
  const explanation =
    `Exosense Interest Score: ${score}/100 (based on ${dataCount}/3 available factors). ` +
    factorLines.join(" ") +
    " This is a simplified exploratory metric — not a scientific habitability determination.";

  return { score, factors, explanation };
}
