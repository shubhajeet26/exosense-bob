/**
 * Server-side Gemini wrapper.
 *
 * SECURITY: This file must only ever be imported by server-side code
 * (API routes, Server Components, server actions). Never import it in
 * "use client" files — Next.js will tree-shake it out of client bundles
 * because it lives in /lib and is only called from /app/api routes.
 *
 * The GEMINI_API_KEY environment variable is read here and never forwarded
 * to any API response.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new GeminiConfigError(
        "GEMINI_API_KEY is not set. Add it to .env.local to enable AI features."
      );
    }
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// ─── Error types ──────────────────────────────────────────────────────────────

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiAPIError";
  }
}

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash"; // updated active flash model

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── Core generate helper ─────────────────────────────────────────────────────

/**
 * Send a single prompt to Gemini and return the text response.
 * Throws GeminiConfigError if key is missing, GeminiAPIError on request failure.
 */
export async function generate(
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const client = getClient(); // throws GeminiConfigError if key missing

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    safetySettings: SAFETY,
    generationConfig: {
      temperature: 0.3,      // low — we want factual, grounded output
      maxOutputTokens: 1024,
    },
  });

  let result;
  try {
    result = await model.generateContent(userPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GeminiAPIError(`Gemini request failed: ${msg}`);
  }

  const text = result.response.text();
  if (!text) {
    throw new GeminiAPIError("Gemini returned an empty response.");
  }
  return text;
}

// ─── Convenience: check whether AI is configured ─────────────────────────────

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
