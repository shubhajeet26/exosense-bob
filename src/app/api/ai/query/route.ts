import { NextRequest, NextResponse } from "next/server";
import { generate, GeminiConfigError, GeminiAPIError, isAiConfigured } from "@/lib/gemini";
import { DISCOVERY_METHODS } from "@/lib/constants";
import { DEFAULT_FILTERS } from "@/lib/filterDefaults";

const DISCOVERY_METHODS_ARRAY: string[] = [...DISCOVERY_METHODS];

// ─── Filter schema (mirrors FilterValues from FilterControls.tsx) ─────────────

export interface ParsedFilters {
  yearMin?: number;
  yearMax?: number;
  radiusMin?: number;
  radiusMax?: number;
  discoveryMethod?: string;
  distanceMin?: number;
  distanceMax?: number;
}

// ─── System instruction ───────────────────────────────────────────────────────

const VALID_METHODS = DISCOVERY_METHODS_ARRAY.join(", ");

const SYSTEM = `You are a filter parser for Exosense, an exoplanet exploration dashboard.
Your only job is to translate a natural-language query into a JSON object containing dashboard filter values.

STRICT OUTPUT RULES — follow all without exception:
- Return ONLY a valid JSON object. No prose, no explanation, no markdown code fences.
- The JSON must contain only these keys (all optional):
    yearMin       (integer, discovery year)
    yearMax       (integer, discovery year)
    radiusMin     (number, planet radius in Earth radii)
    radiusMax     (number, planet radius in Earth radii)
    discoveryMethod (string, EXACTLY one of: ${VALID_METHODS})
    distanceMin   (number, distance in parsecs)
    distanceMax   (number, distance in parsecs)
- Do not invent keys that are not in the list above.
- Do not set discoveryMethod to any value that is not in the allowed list.
- If the user's request does not map to any filter, return an empty object: {}
- Do not include units, labels, or comments in the JSON.
- If a value is ambiguous, omit it rather than guessing.
- "Nearby" means distanceMax around 100 parsecs.
- "Recent" or "last N years" means yearMin = current_year - N.
- "Super-Earth" means radiusMin=1.0, radiusMax=2.0.
- "Earth-sized" means radiusMin=0.8, radiusMax=1.25.
- "Giant planet" means radiusMin=8.
- Current year for reference: ${new Date().getFullYear()}`;

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_METHOD_SET = new Set<string>(DISCOVERY_METHODS_ARRAY);

function validateAndClamp(raw: Record<string, unknown>): ParsedFilters {
  const out: ParsedFilters = {};
  const currentYear = new Date().getFullYear();

  // Year range
  if (typeof raw.yearMin === "number" && isFinite(raw.yearMin)) {
    out.yearMin = Math.max(1990, Math.min(currentYear, Math.round(raw.yearMin)));
  }
  if (typeof raw.yearMax === "number" && isFinite(raw.yearMax)) {
    out.yearMax = Math.max(1990, Math.min(currentYear, Math.round(raw.yearMax)));
  }
  if (out.yearMin != null && out.yearMax != null && out.yearMin > out.yearMax) {
    [out.yearMin, out.yearMax] = [out.yearMax, out.yearMin];
  }

  // Radius
  if (typeof raw.radiusMin === "number" && isFinite(raw.radiusMin) && raw.radiusMin >= 0) {
    out.radiusMin = Math.min(raw.radiusMin, 30);
  }
  if (typeof raw.radiusMax === "number" && isFinite(raw.radiusMax) && raw.radiusMax > 0) {
    out.radiusMax = Math.min(raw.radiusMax, 30);
  }

  // Discovery method — must exactly match allowed list
  if (typeof raw.discoveryMethod === "string" && VALID_METHOD_SET.has(raw.discoveryMethod)) {
    out.discoveryMethod = raw.discoveryMethod;
  }

  // Distance
  if (typeof raw.distanceMin === "number" && isFinite(raw.distanceMin) && raw.distanceMin >= 0) {
    out.distanceMin = raw.distanceMin;
  }
  if (typeof raw.distanceMax === "number" && isFinite(raw.distanceMax) && raw.distanceMax > 0) {
    out.distanceMax = raw.distanceMax;
  }

  return out;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { filters: null, error: "AI features require GEMINI_API_KEY in .env.local." },
      { status: 200 }
    );
  }

  let userQuery: string;
  try {
    const body = await req.json();
    userQuery = String(body.query ?? "").trim();
    if (!userQuery) throw new Error("Empty query.");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (userQuery.length > 400) {
    return NextResponse.json({ error: "Query too long (max 400 chars)." }, { status: 400 });
  }

  try {
    const raw = await generate(SYSTEM, userQuery);

    // Strip markdown code fences if Gemini wraps in them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { filters: null, error: `AI returned non-JSON response: "${cleaned.substring(0, 120)}"` },
        { status: 200 }
      );
    }

    if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
      return NextResponse.json(
        { filters: null, error: "AI returned unexpected JSON structure." },
        { status: 200 }
      );
    }

    const filters = validateAndClamp(parsed);

    // Merge with defaults so unset fields stay at their default values
    const merged = { ...DEFAULT_FILTERS, ...filters };

    return NextResponse.json({ filters: merged, parsed: filters });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ filters: null, error: err.message }, { status: 200 });
    }
    if (err instanceof GeminiAPIError) {
      return NextResponse.json({ filters: null, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ filters: null, error: "Unexpected error." }, { status: 500 });
  }
}
