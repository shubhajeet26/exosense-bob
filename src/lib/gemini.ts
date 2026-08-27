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

// ─── Model config with automatic fallback pipeline ───────────────────────────

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
].filter(Boolean) as string[];

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── Chat Message Interface ───────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// ─── Clean Error Formatter ───────────────────────────────────────────────────

function formatApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.includes("Quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "AI Copilot is currently rate-limited by Gemini API free tier quota. Please wait a few seconds before trying again.";
  }
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
    return "Gemini AI service is temporarily experiencing high traffic. Please try again shortly.";
  }
  return `Gemini AI service error: ${msg.split("\n")[0]}`;
}

// ─── Core generate helper with Multi-Model Fallback ───────────────────────────

/**
 * Send a single prompt to Gemini and return the text response.
 * Automatically tries fallback models if quota or availability errors occur.
 */
export async function generate(
  systemInstruction: string,
  userPrompt: string
): Promise<string> {
  const client = getClient();
  let lastError: unknown = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction,
        safetySettings: SAFETY,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] Model ${modelName} encountered error, trying next candidate fallback:`, err instanceof Error ? err.message : err);
    }
  }

  throw new GeminiAPIError(formatApiError(lastError));
}

/**
 * Multi-turn chat generation with conversation history and structured system instructions.
 * Automatically cascades through candidate models if rate limits occur.
 */
export async function generateChat(
  systemInstruction: string,
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const client = getClient();
  let lastError: unknown = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction,
        safetySettings: SAFETY,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });

      const chat = model.startChat({
        history: history.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      });

      const result = await chat.sendMessage(newMessage);
      const text = result.response.text();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[gemini chat] Model ${modelName} encountered error, trying next fallback:`, err instanceof Error ? err.message : err);
    }
  }

  throw new GeminiAPIError(formatApiError(lastError));
}

// ─── Convenience: check whether AI is configured ─────────────────────────────

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
