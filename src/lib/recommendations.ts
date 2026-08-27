import { Exoplanet } from "./nasa";
import { scorePlanet } from "./scoring";

export type ExplorationPriority = "HIGH" | "MEDIUM" | "LOW";

export interface PlanetRecommendation {
  planet: Exoplanet;
  score: number;
  dataCompleteness: number; // 0 to 100%
  explorationPriority: ExplorationPriority;
  reasons: string[];
}

export interface MissionPattern {
  totalSaved: number;
  avgScore: number | null;
  avgDistance: number | null;
  dominantMethod: string | null;
  tempCoveragePct: number;
  dominantSizeRegime: string;
}

/**
 * Calculates the Data Completeness percentage (0 - 100%) for an exoplanet record.
 * Evaluates 10 core observational and physical parameters from the NASA Exoplanet Archive.
 */
export function calculateDataCompleteness(planet: Exoplanet): number {
  const fields = [
    planet.pl_rade != null,
    planet.pl_masse != null,
    planet.pl_eqt != null,
    planet.pl_orbper != null,
    planet.pl_orbsmax != null,
    planet.sy_dist != null,
    planet.st_teff != null,
    planet.st_rad != null,
    planet.st_mass != null,
    planet.disc_year != null,
  ];

  const presentCount = fields.filter(Boolean).length;
  return Math.round((presentCount / fields.length) * 100);
}

/**
 * Deterministically computes application-level Exploration Priority.
 * Note: This is an exploratory prioritization heuristic, not a scientific certainty ranking.
 */
export function computeExplorationPriority(
  score: number,
  completeness: number,
  dist: number | null
): ExplorationPriority {
  // High priority: Strong score (>=70) and good completeness (>=60%), or very close (<50 pc)
  if (score >= 70 && completeness >= 60) return "HIGH";
  if (dist != null && dist <= 35 && completeness >= 50) return "HIGH";

  // Medium priority: Moderate score (>=45) or reasonable completeness (>=50%)
  if (score >= 45 || completeness >= 50) return "MEDIUM";

  return "LOW";
}

/**
 * Generates grounded, factual bullet points explaining why a world is recommended.
 */
export function generateRecommendationReasons(
  planet: Exoplanet,
  score: number,
  completeness: number
): string[] {
  const reasons: string[] = [];

  if (score >= 75) {
    reasons.push(`High Exosense exploratory index of ${score}/100 based on temperate regime and rocky radius constraints.`);
  } else if (score >= 50) {
    reasons.push(`Moderate Exosense index of ${score}/100 with valid physical telemetry.`);
  }

  if (planet.sy_dist != null) {
    if (planet.sy_dist <= 25) {
      reasons.push(`Exceptionally close to Earth at ${planet.sy_dist.toFixed(1)} parsecs.`);
    } else if (planet.sy_dist <= 100) {
      reasons.push(`Nearby astronomical neighborhood at ${planet.sy_dist.toFixed(1)} parsecs.`);
    }
  }

  if (planet.pl_rade != null) {
    if (planet.pl_rade >= 0.8 && planet.pl_rade <= 1.25) {
      reasons.push(`Earth-sized physical radius profile of ${planet.pl_rade.toFixed(2)} R⊕.`);
    } else if (planet.pl_rade > 1.25 && planet.pl_rade <= 2.0) {
      reasons.push(`Super-Earth classification with a measured radius of ${planet.pl_rade.toFixed(2)} R⊕.`);
    }
  }

  if (planet.pl_eqt != null && planet.pl_eqt >= 200 && planet.pl_eqt <= 350) {
    reasons.push(`Temperate estimated equilibrium temperature of ${planet.pl_eqt.toFixed(0)} K.`);
  }

  if (completeness >= 80) {
    reasons.push(`High observational data completeness (${completeness}%) across NASA physical & orbital logs.`);
  }

  if (reasons.length === 0) {
    reasons.push(`Candidate logged via ${planet.discoverymethod || "astronomical detection"} with valid archival parameters.`);
  }

  return reasons;
}

/**
 * Computes deterministic top recommendations from a list of exoplanets.
 */
export function getRecommendedWorlds(
  planets: Exoplanet[],
  favoriteNames: string[] = [],
  limit = 5
): PlanetRecommendation[] {
  if (planets.length === 0) return [];

  const recommendations: PlanetRecommendation[] = planets.map((planet) => {
    const scoreObj = scorePlanet(planet);
    const score = scoreObj.score;
    const completeness = calculateDataCompleteness(planet);
    const priority = computeExplorationPriority(score, completeness, planet.sy_dist);
    const reasons = generateRecommendationReasons(planet, score, completeness);

    return {
      planet,
      score,
      dataCompleteness: completeness,
      explorationPriority: priority,
      reasons,
    };
  });

  // Sort by composite ranking (Score * 0.6 + Completeness * 0.4)
  recommendations.sort((a, b) => {
    const rankA = a.score * 0.6 + a.dataCompleteness * 0.4;
    const rankB = b.score * 0.6 + b.dataCompleteness * 0.4;
    return rankB - rankA;
  });

  return recommendations.slice(0, limit);
}

/**
 * Analyzes the user's saved mission favorites to derive observable patterns.
 */
export function analyzeMissionCollection(savedPlanets: Exoplanet[]): MissionPattern {
  if (savedPlanets.length === 0) {
    return {
      totalSaved: 0,
      avgScore: null,
      avgDistance: null,
      dominantMethod: null,
      tempCoveragePct: 0,
      dominantSizeRegime: "None",
    };
  }

  // 1. Avg Score
  const scores = savedPlanets.map((p) => scorePlanet(p).score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // 2. Avg Distance
  const withDist = savedPlanets.filter((p) => p.sy_dist != null);
  const avgDist =
    withDist.length > 0
      ? Number((withDist.reduce((a, b) => a + b.sy_dist!, 0) / withDist.length).toFixed(1))
      : null;

  // 3. Dominant Method
  const methodCounts: Record<string, number> = {};
  for (const p of savedPlanets) {
    const m = p.discoverymethod || "Unknown";
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  }
  let dominantMethod = "Transit";
  let maxMCount = 0;
  for (const [m, cnt] of Object.entries(methodCounts)) {
    if (cnt > maxMCount) {
      maxMCount = cnt;
      dominantMethod = m;
    }
  }

  // 4. Temp Coverage %
  const withTemp = savedPlanets.filter((p) => p.pl_eqt != null).length;
  const tempCoveragePct = Math.round((withTemp / savedPlanets.length) * 100);

  // 5. Dominant Size Regime
  let earthCount = 0;
  let superEarthCount = 0;
  let gasGiantCount = 0;
  for (const p of savedPlanets) {
    if (p.pl_rade != null) {
      if (p.pl_rade <= 1.25) earthCount++;
      else if (p.pl_rade <= 2.0) superEarthCount++;
      else gasGiantCount++;
    }
  }

  let dominantSizeRegime = "Varied Scales";
  if (earthCount >= superEarthCount && earthCount >= gasGiantCount && earthCount > 0) {
    dominantSizeRegime = "Earth-sized Candidates (≤1.25 R⊕)";
  } else if (superEarthCount >= earthCount && superEarthCount >= gasGiantCount && superEarthCount > 0) {
    dominantSizeRegime = "Super-Earth Candidates (1.25–2.0 R⊕)";
  } else if (gasGiantCount > 0) {
    dominantSizeRegime = "Sub-Neptune / Jovian Worlds (>2.0 R⊕)";
  }

  return {
    totalSaved: savedPlanets.length,
    avgScore,
    avgDistance: avgDist,
    dominantMethod,
    tempCoveragePct,
    dominantSizeRegime,
  };
}
