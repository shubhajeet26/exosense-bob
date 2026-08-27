import { NextRequest, NextResponse } from "next/server";
import { generate, GeminiConfigError, GeminiAPIError, isAiConfigured } from "@/lib/gemini";
import { scorePlanet } from "@/lib/scoring";
import { Exoplanet } from "@/lib/nasa";

// ─── System instruction ───────────────────────────────────────────────────────

const SYSTEM = `You are an assistant for Exosense, an AI-powered exoplanet exploration dashboard.
Your role is to write a plain-language profile of a specific exoplanet for a curious, non-expert audience.

STRICT RULES — follow all without exception:
- Only use facts and values explicitly provided in the planet data below.
- Do not invent, estimate, or assume any measurement not present in the data.
- For any missing value, say it is unknown rather than guessing.
- Do not claim the planet is definitely habitable or definitely not habitable.
- The Exosense Interest Score is a simplified computed metric, not a scientific habitability determination.
- Explain what the score means in context: which factors are present, which are missing.
- Reference the actual numbers provided (radius, temperature, distance, etc.).
- Use clear, engaging language for a general audience.
- Keep the response to 4–6 sentences.
- Write flowing prose, not bullet points or headers.`;

// ─── Context builder ──────────────────────────────────────────────────────────

function buildPlanetContext(planet: Exoplanet): string {
  const score = scorePlanet(planet);

  const lines: string[] = [
    `PLANET NAME: ${planet.pl_name}`,
    `HOST STAR: ${planet.hostname || "unknown"}`,
    `DISCOVERY YEAR: ${planet.disc_year ?? "unknown"}`,
    `DISCOVERY METHOD: ${planet.discoverymethod ?? "unknown"}`,
  ];

  if (planet.pl_rade   != null) lines.push(`RADIUS: ${planet.pl_rade.toFixed(2)} Earth radii`);
  if (planet.pl_masse  != null) lines.push(`MASS: ${planet.pl_masse.toFixed(2)} Earth masses`);
  if (planet.pl_orbper != null) lines.push(`ORBITAL PERIOD: ${planet.pl_orbper.toFixed(2)} days`);
  if (planet.pl_orbsmax!= null) lines.push(`ORBITAL DISTANCE (semi-major axis): ${planet.pl_orbsmax.toFixed(3)} AU`);
  if (planet.pl_eqt    != null) lines.push(`ESTIMATED EQUILIBRIUM TEMPERATURE: ${planet.pl_eqt.toFixed(0)} K`);
  if (planet.st_teff   != null) lines.push(`HOST STAR TEMPERATURE: ${planet.st_teff.toFixed(0)} K`);
  if (planet.st_rad    != null) lines.push(`HOST STAR RADIUS: ${planet.st_rad.toFixed(2)} solar radii`);
  if (planet.st_mass   != null) lines.push(`HOST STAR MASS: ${planet.st_mass.toFixed(2)} solar masses`);
  if (planet.sy_dist   != null) lines.push(`DISTANCE FROM EARTH: ${planet.sy_dist.toFixed(1)} parsecs`);

  lines.push(`\nEXOSENSE INTEREST SCORE: ${score.score}/100 [computed by Exosense — not a NASA measurement]`);
  lines.push(`SCORE BREAKDOWN:`);
  for (const f of score.factors) {
    lines.push(`  ${f.name}: ${f.available ? (f.value * 100).toFixed(0) + "/100" : "N/A"} — ${f.note}`);
  }
  lines.push(`SCORE EXPLANATION: ${score.explanation}`);

  return lines.join("\n");
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { profile: null, score: null, error: "AI features require GEMINI_API_KEY in .env.local." },
      { status: 200 }
    );
  }

  let planet: Exoplanet;
  try {
    const body = await req.json();
    planet = body.planet;
    if (!planet?.pl_name) throw new Error("Missing planet data.");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const score   = scorePlanet(planet);
  const context = buildPlanetContext(planet);
  const prompt  = `Here is the planet data:\n\n${context}\n\nWrite a 4–6 sentence plain-language profile of this planet.`;

  try {
    const text = await generate(SYSTEM, prompt);
    return NextResponse.json({ profile: text.trim(), score });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ profile: null, score, error: err.message }, { status: 200 });
    }
    if (err instanceof GeminiAPIError) {
      return NextResponse.json({ profile: null, score, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ profile: null, score, error: "Unexpected error." }, { status: 500 });
  }
}
