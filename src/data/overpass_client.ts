export type OverpassResponse = {
  elements: Array<
    | {
        type: "way";
        id: number;
        tags?: Record<string, string>;
        geometry?: Array<{ lat: number; lon: number }>;
      }
    | {
        type: string;
        id: number;
        [k: string]: unknown;
      }
  >;
};

type CacheEntry = { tMs: number; data: OverpassResponse };

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const LS_PREFIX = "skyneedle:overpass:v1:";

let lastRequestMs = 0;
const MIN_INTERVAL_MS = 4000;

export async function fetchAerowayGeometry(params: {
  latDeg: number;
  lonDeg: number;
  radiusM: number;
  cacheTtlMs?: number;
}): Promise<OverpassResponse> {
  const cacheTtlMs = params.cacheTtlMs ?? 1000 * 60 * 60 * 24 * 7; // 7 days
  const key = `${LS_PREFIX}aeroway:${params.latDeg.toFixed(4)},${params.lonDeg.toFixed(
    4
  )}:r${Math.round(params.radiusM)}`;

  const cached = readCache(key, cacheTtlMs);
  if (cached) return cached;

  // Rate-safety: at most one request per MIN_INTERVAL_MS.
  const now = Date.now();
  const waitMs = Math.max(0, lastRequestMs + MIN_INTERVAL_MS - now);
  if (waitMs > 0) {
    await new Promise((r) => window.setTimeout(r, waitMs));
  }
  lastRequestMs = Date.now();

  const query = buildAerowayQuery(params.latDeg, params.lonDeg, params.radiusM);
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(query)}`
  });
  if (!res.ok) {
    throw new Error(`Overpass error: HTTP ${res.status}`);
  }

  const data = (await res.json()) as OverpassResponse;
  writeCache(key, { tMs: Date.now(), data });
  return data;
}

function buildAerowayQuery(latDeg: number, lonDeg: number, radiusM: number): string {
  // Fetch runway + taxiway ways with geometry near the airport point.
  // Keep response small: only ways + geometry, no full node list.
  return `
[out:json][timeout:25];
(
  way(around:${Math.round(radiusM)},${latDeg},${lonDeg})["aeroway"="runway"];
  way(around:${Math.round(radiusM)},${latDeg},${lonDeg})["aeroway"="taxiway"];
);
out geom;
`.trim();
}

function readCache(key: string, ttlMs: number): OverpassResponse | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.tMs || !parsed?.data) return null;
    if (Date.now() - parsed.tMs > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: CacheEntry) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage failures
  }
}


