import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/gemini";

const BRIEFING_CACHE = new Map<string, { briefing: string; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

const BRIEFING_SYSTEM_PROMPT = `You are the Lead Scientific Intelligence Officer for Exosense, an advanced deep-space exoplanet exploration system.
Your mission is to generate a concise, professional Mission Intelligence Briefing based strictly on the provided NASA Exoplanet Archive telemetry and deterministic application metrics.

STRICT GROUNDING & SCIENTIFIC RULES:
1. Base all statements strictly on the supplied real telemetry and Exosense Interest Scores.
2. NEVER invent planet names, synthetic measurements, or fake statistics.
3. NEVER claim a planet has life or is definitely habitable. Use responsible scientific terminology: "promising candidate", "temperate regime", "high Exosense exploratory index", "Earth-sized radius profile".
4. If temperature or other parameters are unmeasured for a world, state "unmeasured in archive" without guessing.
5. Structure your output into clear markdown sections:
   ### MISSION INTELLIGENCE BRIEFING
   **CURRENT CATALOG SCOPE**: [1-2 sentences on active search volume and criteria]
   **KEY OBSERVATIONAL PATTERNS**: [2-3 sentences on physical regimes present]
   **RECOMMENDED TARGET**: [Name of top candidate and why to investigate it next]
   **EXPLORATION DIRECTIVE**: [1 actionable next step]
6. Keep the total briefing under 180 words.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidates, savedSummary, filteredCount } = body as {
      candidates?: { pl_name: string; score: number; pl_rade?: number; pl_eqt?: number; sy_dist?: number; reasons: string[] }[];
      savedSummary?: { totalSaved: number; avgScore: number | null; dominantSizeRegime: string };
      filteredCount?: number;
    };

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "No candidate exoplanets provided for mission briefing." },
        { status: 400 }
      );
    }

    const cacheKey = JSON.stringify({
      top: candidates.slice(0, 3).map((c) => `${c.pl_name}:${c.score}`),
      saved: savedSummary?.totalSaved,
      count: filteredCount,
    });

    const cached = BRIEFING_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ briefing: cached.briefing, cached: true });
    }

    const candidatePrompt = candidates
      .slice(0, 4)
      .map(
        (c) =>
          `• ${c.pl_name} | Exosense Score: ${c.score}/100 | Radius: ${c.pl_rade != null ? `${c.pl_rade} R⊕` : "Unavailable"} | Eq Temp: ${c.pl_eqt != null ? `${c.pl_eqt} K` : "Unavailable"} | Dist: ${c.sy_dist != null ? `${c.sy_dist} pc` : "Unavailable"} | Context: ${c.reasons.join("; ")}`
      )
      .join("\n");

    const prompt = `Active Catalog Scope: ${filteredCount ?? "Multiple"} matching candidate worlds.
User Saved Manifest: ${savedSummary?.totalSaved ?? 0} worlds saved (${savedSummary?.dominantSizeRegime ?? "Varied regimes"}).

Top Ranked Candidate Worlds:
${candidatePrompt}

Synthesize a concise, authoritative Mission Intelligence Briefing.`;

    const briefingText = await generate(BRIEFING_SYSTEM_PROMPT, prompt);

    if (BRIEFING_CACHE.size > 50) {
      const oldestKey = BRIEFING_CACHE.keys().next().value;
      if (oldestKey) BRIEFING_CACHE.delete(oldestKey);
    }
    BRIEFING_CACHE.set(cacheKey, { briefing: briefingText, ts: Date.now() });

    return NextResponse.json({ briefing: briefingText, cached: false });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Mission briefing generation failed.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
