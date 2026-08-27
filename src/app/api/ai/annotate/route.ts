import { NextRequest, NextResponse } from "next/server";
import { generate, GeminiConfigError, GeminiAPIError, isAiConfigured } from "@/lib/gemini";
import { scorePlanet } from "@/lib/scoring";
import { Exoplanet } from "@/lib/nasa";

// ─── System instruction ───────────────────────────────────────────────────────

const SYSTEM = `You are an assistant for Exosense, an AI-powered exoplanet exploration dashboard.
Your role is to write a concise 3–5 sentence annotation of a filtered NASA exoplanet dataset.

STRICT RULES — you must follow all of these without exception:
- Only use facts, numbers, and statistics explicitly provided in the context below.
- Do not invent planet names, measurements, discoveries, or statistics.
- Do not introduce facts from outside the provided context.
- If the data is insufficient to make a statement, omit it.
- Clearly distinguish Exosense computed scores from actual NASA measurements.
- Do not claim any planet is definitely habitable.
- The interest score is an exploratory/comparative metric only, not scientific proof.
- Be concise: 3–5 sentences maximum.
- Use accessible, engaging language appropriate for a space exploration dashboard.
- Do not use bullet points or headers — write flowing prose.`;

// ─── Context builder ──────────────────────────────────────────────────────────

interface AnnotateRequest {
  planets: Exoplanet[];
  filterSummary: string;
}

function buildContext(planets: Exoplanet[], filterSummary: string): string {
  if (planets.length === 0) {
    return `Filter: ${filterSummary}\nNo planets matched these filters.`;
  }

  // Aggregate stats
  const withEqt  = planets.filter((p) => p.pl_eqt  != null);
  const withRade = planets.filter((p) => p.pl_rade  != null);
  const withDist = planets.filter((p) => p.sy_dist  != null);

  const avgTemp = withEqt.length
    ? (withEqt.reduce((s, p) => s + p.pl_eqt!, 0) / withEqt.length).toFixed(0)
    : null;
  const avgRadius = withRade.length
    ? (withRade.reduce((s, p) => s + p.pl_rade!, 0) / withRade.length).toFixed(2)
    : null;
  const avgDist = withDist.length
    ? (withDist.reduce((s, p) => s + p.sy_dist!, 0) / withDist.length).toFixed(1)
    : null;

  const yearRange = (() => {
    const years = planets.map((p) => p.disc_year).filter(Boolean) as number[];
    if (!years.length) return null;
    return `${Math.min(...years)}–${Math.max(...years)}`;
  })();

  const methods = [...new Set(planets.map((p) => p.discoverymethod).filter(Boolean))];

  // Top 5 by interest score
  const scored = planets
    .map((p) => ({ planet: p, result: scorePlanet(p) }))
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 5);

  const topList = scored
    .map(
      ({ planet: p, result }) =>
        `  - ${p.pl_name} (${p.hostname}): radius=${p.pl_rade?.toFixed(2) ?? "?"} R⊕, ` +
        `temp=${p.pl_eqt?.toFixed(0) ?? "?"} K, score=${result.score}/100 [Exosense computed]`
    )
    .join("\n");

  return `
FILTER APPLIED: ${filterSummary}
TOTAL PLANETS IN RESULT: ${planets.length}
DISCOVERY YEAR RANGE: ${yearRange ?? "unknown"}
DISCOVERY METHODS: ${methods.join(", ") || "various"}
AVERAGE RADIUS (of ${withRade.length} planets with data): ${avgRadius ?? "?"} R⊕
AVERAGE EQ. TEMPERATURE (of ${withEqt.length} planets with data): ${avgTemp ?? "?"} K
AVERAGE DISTANCE (of ${withDist.length} planets with data): ${avgDist ?? "?"} parsecs

TOP 5 BY EXOSENSE INTEREST SCORE (computed by Exosense, not a NASA measurement):
${topList}
`.trim();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // If key not set, return graceful "not configured" response
  if (!isAiConfigured()) {
    return NextResponse.json(
      { annotation: null, error: "AI features require GEMINI_API_KEY in .env.local." },
      { status: 200 }
    );
  }

  let body: AnnotateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { planets = [], filterSummary = "all planets" } = body;

  // Don't send more than 200 planets worth of context to Gemini — use scored sample
  const sample = planets.length > 200
    ? planets
        .map((p) => ({ p, s: scorePlanet(p).score }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 200)
        .map(({ p }) => p)
    : planets;

  const context = buildContext(sample, filterSummary);
  const prompt  = `Here is the dataset context:\n\n${context}\n\nWrite a concise 3–5 sentence annotation of this dataset.`;

  try {
    const text = await generate(SYSTEM, prompt);
    return NextResponse.json({ annotation: text.trim() });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ annotation: null, error: err.message }, { status: 200 });
    }
    if (err instanceof GeminiAPIError) {
      return NextResponse.json({ annotation: null, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ annotation: null, error: "Unexpected error." }, { status: 500 });
  }
}
