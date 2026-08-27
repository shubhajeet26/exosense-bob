import { NextRequest, NextResponse } from "next/server";
import { generate, GeminiConfigError, GeminiAPIError, isAiConfigured } from "@/lib/gemini";
import { scorePlanet } from "@/lib/scoring";
import { Exoplanet } from "@/lib/nasa";

const COMPARE_SYSTEM = `You are the Comparative Exoplanet Analyst for Exosense, an advanced astronomical intelligence system.
Your mission is to write a concise, scientifically rigorous comparison between two specific exoplanets based ONLY on the NASA observational data and Exosense exploratory scores provided.

STRICT OPERATIONAL PRINCIPLES:
1. DATA GROUNDING: Only compare parameters explicitly present in the data. Never invent or estimate missing values.
2. MISSING PARAMETERS: If a value is missing for either planet, clearly state that observational data is unavailable.
3. EXOSENSE SCORE CONTEXT: Recognize that the Exosense Interest Score is an exploratory metric based on available data completeness, temperate thermal regime, and rocky radius range — NOT a definitive proof of habitability or life.
4. NO SUPERLATIVES OR HABITABILITY PROOF: Do not claim either planet is definitively habitable or "scientifically superior".
5. STRUCTURE:
   - Paragraph 1: Core physical similarities and contrasts (radius, mass, equilibrium temperature).
   - Paragraph 2: Host star and orbital dynamics (stellar type/temp, orbital period, distance from Earth).
   - Paragraph 3: Exosense Interest Score analysis explaining why the scores differ based on the supplied breakdown.
6. Tone: Technical, clear, and engaging for science-oriented operators. Keep to 3 short paragraphs.`;

function formatPlanetContext(label: string, planet: Exoplanet): string {
  const score = scorePlanet(planet);
  const lines: string[] = [
    `=== ${label}: ${planet.pl_name} ===`,
    `HOST STAR: ${planet.hostname || "unknown"}`,
    `DISCOVERY: Year ${planet.disc_year ?? "unknown"} via ${planet.discoverymethod ?? "unknown"}`,
    `RADIUS: ${planet.pl_rade != null ? `${planet.pl_rade.toFixed(2)} Earth radii (R⊕)` : "DATA UNAVAILABLE"}`,
    `MASS: ${planet.pl_masse != null ? `${planet.pl_masse.toFixed(2)} Earth masses (M⊕)` : "DATA UNAVAILABLE"}`,
    `ORBITAL PERIOD: ${planet.pl_orbper != null ? `${planet.pl_orbper.toFixed(2)} days` : "DATA UNAVAILABLE"}`,
    `SEMI-MAJOR AXIS: ${planet.pl_orbsmax != null ? `${planet.pl_orbsmax.toFixed(3)} AU` : "DATA UNAVAILABLE"}`,
    `ESTIMATED EQUILIBRIUM TEMP: ${planet.pl_eqt != null ? `${planet.pl_eqt.toFixed(0)} K` : "DATA UNAVAILABLE"}`,
    `HOST STAR TEMP: ${planet.st_teff != null ? `${planet.st_teff.toFixed(0)} K` : "DATA UNAVAILABLE"}`,
    `HOST STAR MASS: ${planet.st_mass != null ? `${planet.st_mass.toFixed(2)} M☉` : "DATA UNAVAILABLE"}`,
    `DISTANCE FROM EARTH: ${planet.sy_dist != null ? `${planet.sy_dist.toFixed(1)} parsecs` : "DATA UNAVAILABLE"}`,
    `EXOSENSE SCORE: ${score.score}/100 [Exploratory metric]`,
    `SCORE EXPLANATION: ${score.explanation}`,
  ];
  return lines.join("\n");
}

const compareCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { analysis: null, error: "AI features require GEMINI_API_KEY in .env.local to enable." },
      { status: 200 }
    );
  }

  let planetA: Exoplanet;
  let planetB: Exoplanet;

  try {
    const body = await req.json();
    planetA = body.planetA;
    planetB = body.planetB;
    if (!planetA?.pl_name || !planetB?.pl_name) {
      throw new Error("Both planetA and planetB are required.");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (planetA.pl_name === planetB.pl_name) {
    return NextResponse.json(
      { error: "Cannot compare a world with itself. Select two distinct exoplanets." },
      { status: 400 }
    );
  }

  const cacheKey = [planetA.pl_name, planetB.pl_name].sort().join("::vs::");
  const cached = compareCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ analysis: cached });
  }

  const contextA = formatPlanetContext("WORLD A", planetA);
  const contextB = formatPlanetContext("WORLD B", planetB);
  const prompt = `Here are the two candidate exoplanets for comparative evaluation:\n\n${contextA}\n\n${contextB}\n\nProvide the 3-paragraph comparative intelligence analysis.`;

  try {
    const analysis = await generate(COMPARE_SYSTEM, prompt);
    const trimmed = analysis.trim();
    compareCache.set(cacheKey, trimmed);
    return NextResponse.json({ analysis: trimmed });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ analysis: null, error: err.message }, { status: 200 });
    }
    if (err instanceof GeminiAPIError) {
      return NextResponse.json({ analysis: null, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ analysis: null, error: "Unexpected comparison analysis error." }, { status: 500 });
  }
}
