import { NextRequest, NextResponse } from "next/server";
import { fetchExoplanets, FilterParams } from "@/lib/nasa";

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Key: serialised filter params → Value: { data, expiresAt }
// Revalidates every 6 hours so we don't hammer NASA's service.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cacheKey(params: FilterParams): string {
  return JSON.stringify(params, Object.keys(params).sort());
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: FilterParams = {};

  const yearMin = sp.get("yearMin");
  const yearMax = sp.get("yearMax");
  const radiusMin = sp.get("radiusMin");
  const radiusMax = sp.get("radiusMax");
  const method = sp.get("method");
  const distMin = sp.get("distMin");
  const distMax = sp.get("distMax");

  if (yearMin) filters.yearMin = Number(yearMin);
  if (yearMax) filters.yearMax = Number(yearMax);
  if (radiusMin) filters.radiusMin = Number(radiusMin);
  if (radiusMax) filters.radiusMax = Number(radiusMax);
  if (method) filters.discoveryMethod = method;
  if (distMin) filters.distanceMin = Number(distMin);
  if (distMax) filters.distanceMax = Number(distMax);

  const key = cacheKey(filters);
  const cached = CACHE.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const data = await fetchExoplanets(filters);
    CACHE.set(key, { data, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
