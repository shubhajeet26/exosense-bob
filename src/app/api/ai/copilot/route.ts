import { NextRequest, NextResponse } from "next/server";
import {
  generateChat,
  ChatMessage,
  GeminiConfigError,
  GeminiAPIError,
  isAiConfigured,
} from "@/lib/gemini";
import { scorePlanet } from "@/lib/scoring";
import { Exoplanet } from "@/lib/nasa";

const COPILOT_SYSTEM_INSTRUCTION = `You are the AI Mission Copilot for Exosense, an advanced deep-space exoplanet intelligence and exploration system.
Your role is to assist human mission operators by analyzing, interpreting, and explaining the current NASA exoplanet dataset and selected planetary targets.

STRICT OPERATIONAL & SCIENTIFIC PRINCIPLES:
1. DATA GROUNDING: You must ONLY reason from the structured context provided below (active filters, dataset statistics, top scored worlds, and selected planet measurements).
2. NO FABRICATION: Do not invent unlisted planets, hypothetical measurements, fictional discoveries, or non-existent scientific claims.
3. HANDLING MISSING DATA: If a specific parameter (e.g. mass, temperature, radius, or distance) is missing or unknown in the provided data, explicitly state that it is unmeasured or unavailable rather than guessing.
4. EXOSENSE SCORE DISTINCTION: Clearly recognize that the "Exosense Interest Score" is an exploratory, deterministic metric computed by the Exosense platform (evaluating presence of data, temperate regime, rocky radius range), NOT an official NASA habitability proof or definitive scientific conclusion.
5. HABITABILITY CLAIMS: Never claim any exoplanet is definitively habitable or supports life. State that observational parameters suggest interesting conditions for further study when supported by data.
6. CONCISE & STRUCTURED RESPONSES: Respond like a crisp, technical mission intelligence officer. Use clear formatting, bullet points, highlighted values, and brief paragraphs. Avoid long fluff or generic conversational filler.`;

interface CopilotRequestBody {
  message: string;
  history?: ChatMessage[];
  planets?: Exoplanet[];
  filterSummary?: string;
  selectedPlanet?: Exoplanet | null;
  comparisonPlanets?: [Exoplanet | null, Exoplanet | null] | null;
}

function buildGroundedContext(
  planets: Exoplanet[] = [],
  filterSummary: string = "default filters",
  selectedPlanet: Exoplanet | null = null,
  comparisonPlanets: [Exoplanet | null, Exoplanet | null] | null = null
): string {
  const lines: string[] = [];

  lines.push("=== MISSION CONTROL CONTEXT ===");
  lines.push(`ACTIVE PARAMETERS / FILTERS: ${filterSummary}`);
  lines.push(`TOTAL WORLDS IN ACTIVE VIEW: ${planets.length}`);

  if (planets.length > 0) {
    const withEqt = planets.filter((p) => p.pl_eqt != null);
    const withRade = planets.filter((p) => p.pl_rade != null);
    const withDist = planets.filter((p) => p.sy_dist != null);

    const avgTemp = withEqt.length
      ? (withEqt.reduce((s, p) => s + p.pl_eqt!, 0) / withEqt.length).toFixed(0)
      : "N/A";
    const avgRadius = withRade.length
      ? (withRade.reduce((s, p) => s + p.pl_rade!, 0) / withRade.length).toFixed(2)
      : "N/A";
    const avgDist = withDist.length
      ? (withDist.reduce((s, p) => s + p.sy_dist!, 0) / withDist.length).toFixed(1)
      : "N/A";

    const methods = [...new Set(planets.map((p) => p.discoverymethod).filter(Boolean))];

    lines.push(`AVERAGE RADIUS: ${avgRadius} R⊕ (of ${withRade.length} planets with data)`);
    lines.push(`AVERAGE EQUILIBRIUM TEMP: ${avgTemp} K (of ${withEqt.length} planets with data)`);
    lines.push(`AVERAGE DISTANCE: ${avgDist} pc (of ${withDist.length} planets with data)`);
    lines.push(`ACTIVE OBSERVATION METHODS: ${methods.join(", ") || "various"}`);

    // Top 5 highest scored worlds in dataset
    const scored = planets
      .map((p) => ({ planet: p, score: scorePlanet(p) }))
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 5);

    lines.push("\nTOP HIGH-INTEREST CANDIDATE WORLDS (Ranked by Exosense Score):");
    for (const { planet: p, score } of scored) {
      lines.push(
        `  • ${p.pl_name} (${p.hostname}): Radius=${p.pl_rade?.toFixed(2) ?? "?"} R⊕, ` +
        `EqTemp=${p.pl_eqt?.toFixed(0) ?? "?"} K, Dist=${p.sy_dist?.toFixed(1) ?? "?"} pc, ` +
        `Method=${p.discoverymethod ?? "Unknown"}, Score=${score.score}/100 [Exosense metric]`
      );
    }
  }

  // Active Comparison Context (if in comparison mode)
  if (comparisonPlanets && comparisonPlanets[0] && comparisonPlanets[1]) {
    const [pA, pB] = comparisonPlanets;
    const scoreA = scorePlanet(pA);
    const scoreB = scorePlanet(pB);
    lines.push("\n=== ACTIVE DUAL WORLD COMPARISON MODE ===");
    lines.push(`WORLD A: ${pA.pl_name} (Host: ${pA.hostname}, Radius: ${pA.pl_rade?.toFixed(2) ?? "N/A"} R⊕, Temp: ${pA.pl_eqt?.toFixed(0) ?? "N/A"} K, Dist: ${pA.sy_dist?.toFixed(1) ?? "N/A"} pc, Method: ${pA.discoverymethod ?? "N/A"}, Score: ${scoreA.score}/100)`);
    lines.push(`WORLD B: ${pB.pl_name} (Host: ${pB.hostname}, Radius: ${pB.pl_rade?.toFixed(2) ?? "N/A"} R⊕, Temp: ${pB.pl_eqt?.toFixed(0) ?? "N/A"} K, Dist: ${pB.sy_dist?.toFixed(1) ?? "N/A"} pc, Method: ${pB.discoverymethod ?? "N/A"}, Score: ${scoreB.score}/100)`);
  }

  if (selectedPlanet) {
    const pScore = scorePlanet(selectedPlanet);
    lines.push("\n=== CURRENTLY SELECTED TARGET IN FOCUS ===");
    lines.push(`TARGET NAME: ${selectedPlanet.pl_name}`);
    lines.push(`HOST STAR: ${selectedPlanet.hostname || "unknown"}`);
    lines.push(`DISCOVERY: Year ${selectedPlanet.disc_year ?? "unknown"}, Method: ${selectedPlanet.discoverymethod ?? "unknown"}`);
    if (selectedPlanet.pl_rade != null) lines.push(`RADIUS: ${selectedPlanet.pl_rade.toFixed(2)} Earth radii (R⊕)`);
    if (selectedPlanet.pl_masse != null) lines.push(`MASS: ${selectedPlanet.pl_masse.toFixed(2)} Earth masses (M⊕)`);
    if (selectedPlanet.pl_orbper != null) lines.push(`ORBITAL PERIOD: ${selectedPlanet.pl_orbper.toFixed(2)} days`);
    if (selectedPlanet.pl_orbsmax != null) lines.push(`SEMI-MAJOR AXIS: ${selectedPlanet.pl_orbsmax.toFixed(3)} AU`);
    if (selectedPlanet.pl_eqt != null) lines.push(`EQUILIBRIUM TEMP: ${selectedPlanet.pl_eqt.toFixed(0)} K`);
    if (selectedPlanet.st_teff != null) lines.push(`STELLAR TEMP: ${selectedPlanet.st_teff.toFixed(0)} K`);
    if (selectedPlanet.st_mass != null) lines.push(`STELLAR MASS: ${selectedPlanet.st_mass.toFixed(2)} M☉`);
    if (selectedPlanet.sy_dist != null) lines.push(`DISTANCE FROM EARTH: ${selectedPlanet.sy_dist.toFixed(1)} parsecs`);
    lines.push(`EXOSENSE INTEREST SCORE: ${pScore.score}/100 [Computed exploratory metric]`);
    lines.push(`SCORE BREAKDOWN: ${pScore.explanation}`);
  } else if (!comparisonPlanets) {
    lines.push("\nCURRENTLY SELECTED TARGET: None selected.");
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        reply: null,
        error: "AI features require GEMINI_API_KEY in .env.local to enable.",
      },
      { status: 200 }
    );
  }

  let body: CopilotRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const {
    message = "",
    history = [],
    planets = [],
    filterSummary = "default filters",
    selectedPlanet = null,
    comparisonPlanets = null,
  } = body;

  const userQuery = message.trim();
  if (!userQuery) {
    return NextResponse.json({ error: "Message query is empty." }, { status: 400 });
  }

  // Build the grounded context string
  const structuredContext = buildGroundedContext(
    planets,
    filterSummary,
    selectedPlanet,
    comparisonPlanets
  );

  // Combine system instruction with live mission context
  const fullSystemInstruction = `${COPILOT_SYSTEM_INSTRUCTION}\n\n${structuredContext}`;

  // Limit conversation history to last 6 turns to keep context fast and focused
  const cleanHistory: ChatMessage[] = history.slice(-6).map((h) => ({
    role: h.role === "user" ? "user" : "model",
    text: String(h.text || "").slice(0, 1500),
  }));

  try {
    const replyText = await generateChat(fullSystemInstruction, cleanHistory, userQuery);
    return NextResponse.json({ reply: replyText.trim() });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ reply: null, error: err.message }, { status: 200 });
    }
    if (err instanceof GeminiAPIError) {
      return NextResponse.json({ reply: null, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ reply: null, error: "Unexpected AI Copilot transmission error." }, { status: 500 });
  }
}
