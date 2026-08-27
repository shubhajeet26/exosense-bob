// ─── NASA Exoplanet Archive TAP service ───────────────────────────────────────
// Base endpoint for the Planetary Systems Composite Parameters table (pscomppars)
// No API key required.

const TAP_BASE =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exoplanet {
  pl_name: string;       // Planet name
  hostname: string;      // Host star name
  disc_year: number | null;      // Discovery year
  discoverymethod: string | null; // Discovery method
  pl_rade: number | null;  // Planet radius (Earth radii)
  pl_masse: number | null; // Planet mass (Earth masses)
  pl_orbper: number | null; // Orbital period (days)
  pl_orbsmax: number | null; // Semi-major axis (AU) — distance from star
  pl_eqt: number | null;   // Equilibrium temperature (K)
  st_teff: number | null;  // Stellar effective temperature (K)
  st_rad: number | null;   // Stellar radius (solar radii)
  st_mass: number | null;  // Stellar mass (solar masses)
  sy_dist: number | null;  // System distance from Earth (parsecs)
  ra: number | null;       // Right Ascension (degrees)
  dec: number | null;      // Declination (degrees)
}

export interface FilterParams {
  yearMin?: number;
  yearMax?: number;
  radiusMin?: number;
  radiusMax?: number;
  discoveryMethod?: string; // empty string = all
  distanceMin?: number;
  distanceMax?: number;
}

// ─── ADQL column list ─────────────────────────────────────────────────────────

const COLUMNS =
  "pl_name,hostname,disc_year,discoverymethod,pl_rade,pl_masse,pl_orbper,pl_orbsmax,pl_eqt,st_teff,st_rad,st_mass,sy_dist,ra,dec";

// ─── Query builder ────────────────────────────────────────────────────────────

/**
 * Build a WHERE-clause fragment from optional filter params.
 * `default_flag=1` restricts to the single "best" row per planet.
 */
export function buildWhereClause(filters: FilterParams = {}): string {
  // pscomppars is already one-row-per-planet (composite best values).
  // There is no default_flag column in this table — do not add it.
  const conditions: string[] = [];

  if (filters.yearMin != null)
    conditions.push(`disc_year>=${filters.yearMin}`);
  if (filters.yearMax != null)
    conditions.push(`disc_year<=${filters.yearMax}`);
  if (filters.radiusMin != null)
    conditions.push(`pl_rade>=${filters.radiusMin}`);
  if (filters.radiusMax != null)
    conditions.push(`pl_rade<=${filters.radiusMax}`);
  if (filters.discoveryMethod)
    conditions.push(`discoverymethod='${filters.discoveryMethod.replace(/'/g, "''")}'`);
  if (filters.distanceMin != null)
    conditions.push(`sy_dist>=${filters.distanceMin}`);
  if (filters.distanceMax != null)
    conditions.push(`sy_dist<=${filters.distanceMax}`);

  return conditions.join(" AND ");
}

/**
 * Build the full TAP URL for a given filter set.
 * Caps results at 2000 rows for performance.
 */
export function buildTapUrl(filters: FilterParams = {}): string {
  const where = buildWhereClause(filters);
  // Only add a WHERE clause if there are actual conditions to apply
  const whereClause = where ? ` where ${where}` : "";
  const adql = `select TOP 2000 ${COLUMNS} from pscomppars${whereClause} order by disc_year desc`;
  const params = new URLSearchParams({
    query: adql,
    format: "json",
  });
  return `${TAP_BASE}?${params.toString()}`;
}

// ─── Raw API response shape ───────────────────────────────────────────────────

type RawRow = {
  pl_name: string;
  hostname: string;
  disc_year: number | null;
  discoverymethod: string | null;
  pl_rade: number | null;
  pl_masse: number | null;
  pl_orbper: number | null;
  pl_orbsmax: number | null;
  pl_eqt: number | null;
  st_teff: number | null;
  st_rad: number | null;
  st_mass: number | null;
  sy_dist: number | null;
  ra: number | null;
  dec: number | null;
};

// ─── Fetch function ───────────────────────────────────────────────────────────

/**
 * Fetch exoplanet data from the NASA TAP service.
 * Throws on HTTP errors.
 */
export async function fetchExoplanets(
  filters: FilterParams = {},
  fetchFn: typeof fetch = fetch
): Promise<Exoplanet[]> {
  const url = buildTapUrl(filters);

  console.log("[nasa] TAP URL:", url);

  const res = await fetchFn(url, {
    headers: { Accept: "application/json" },
    // Next.js cache: revalidate every 6 hours (data doesn't change intraday)
    next: { revalidate: 21600 },
  } as RequestInit);

  if (!res.ok) {
    // Read the body — NASA TAP returns the real reason in the XML body
    const body = await res.text().catch(() => "");
    // Extract the human-readable message from the VOTABLE ERROR INFO element if present
    const match = body.match(/<INFO[^>]*value="ERROR"[^>]*>\s*([\s\S]*?)\s*<\/INFO>/i);
    const detail = match ? match[1].trim() : body.substring(0, 300);
    throw new Error(
      `NASA TAP request failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }

  const raw: RawRow[] = await res.json();

  // Normalise: ensure numbers are numbers (TAP sometimes returns strings)
  return raw.map((r) => ({
    pl_name: r.pl_name ?? "",
    hostname: r.hostname ?? "",
    disc_year: toNum(r.disc_year),
    discoverymethod: r.discoverymethod ?? null,
    pl_rade: toNum(r.pl_rade),
    pl_masse: toNum(r.pl_masse),
    pl_orbper: toNum(r.pl_orbper),
    pl_orbsmax: toNum(r.pl_orbsmax),
    pl_eqt: toNum(r.pl_eqt),
    st_teff: toNum(r.st_teff),
    st_rad: toNum(r.st_rad),
    st_mass: toNum(r.st_mass),
    sy_dist: toNum(r.sy_dist),
    ra: toNum(r.ra),
    dec: toNum(r.dec),
  }));
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
