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

// Prefer endpoints that are often less saturated than overpass-api.de.
const OVERPASS_URLS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass-api.de/api/interpreter"
] as const;
const LS_PREFIX = "skyneedle:overpass:v1:";

let lastRequestMs = 0;
const MIN_INTERVAL_MS = 4000;

const memCache = new Map<string, CacheEntry>();
const endpointBadUntil = new Map<string, number>();

export async function fetchAerowayGeometry(params: {
  latDeg: number;
  lonDeg: number;
  radiusM: number;
  // Optional stable identifier to improve caching across airports.
  cacheKey?: string;
  cacheTtlMs?: number;
}): Promise<OverpassResponse> {
  const cacheTtlMs = params.cacheTtlMs ?? 1000 * 60 * 60 * 24 * 7; // 7 days
  const id =
    params.cacheKey?.trim().toUpperCase() ??
    `${params.latDeg.toFixed(4)},${params.lonDeg.toFixed(4)}`;
  const key = `${LS_PREFIX}aeroway:${id}:r${Math.round(params.radiusM)}`;

  const mem = readMemCache(key, cacheTtlMs);
  if (mem) return mem;

  const cached = readCache(key, cacheTtlMs);
  if (cached) {
    memCache.set(key, { tMs: Date.now(), data: cached });
    return cached;
  }

  // Rate-safety: at most one request per MIN_INTERVAL_MS.
  const now = Date.now();
  const waitMs = Math.max(0, lastRequestMs + MIN_INTERVAL_MS - now);
  if (waitMs > 0) {
    await new Promise((r) => window.setTimeout(r, waitMs));
  }
  lastRequestMs = Date.now();

  const query = buildAerowayQuery(params.latDeg, params.lonDeg, params.radiusM);
  const data = await fetchWithFallbackAndRetry(query);
  const entry = { tMs: Date.now(), data };
  memCache.set(key, entry);
  writeCache(key, entry);
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

async function fetchWithFallbackAndRetry(query: string): Promise<OverpassResponse> {
  const body = `data=${encodeURIComponent(query)}`;
  const headers = { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" };

  // Try each endpoint with a small retry budget.
  const maxRetriesPerEndpoint = 2;
  const now = Date.now();
  const urls = [...OVERPASS_URLS].sort((a, b) => {
    const aa = endpointBadUntil.get(a) ?? 0;
    const bb = endpointBadUntil.get(b) ?? 0;
    return aa - bb;
  });

  for (const url of urls) {
    const badUntil = endpointBadUntil.get(url) ?? 0;
    if (badUntil > now) continue;
    for (let attempt = 0; attempt <= maxRetriesPerEndpoint; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 22_000);

        const res = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal
        });
        window.clearTimeout(timeout);

        if (!res.ok) {
          // 429/504 are common when overloaded; treat as retryable.
          const retryable =
            res.status === 429 || res.status === 504 || res.status === 502 || res.status === 503;
          if (retryable) {
            const ra = res.headers.get("retry-after");
            const hint = ra ? ` retry-after=${ra}s` : "";
            // Mark endpoint as unhealthy for a short period to avoid hammering it.
            endpointBadUntil.set(url, Date.now() + 2 * 60_000);
            throw new Error(`Overpass error: HTTP ${res.status}${hint}`);
          }
          throw new Error(`Overpass error (non-retryable): HTTP ${res.status}`);
        }

        return (await res.json()) as OverpassResponse;
      } catch (e) {
        const isLastAttempt = attempt === maxRetriesPerEndpoint;
        if (isLastAttempt) break;
        // Simple backoff.
        await new Promise((r) => window.setTimeout(r, 1400 * (attempt + 1)));
      }
    }
  }

  throw new Error("Overpass error: all endpoints failed (possibly overloaded)");
}

function readMemCache(key: string, ttlMs: number): OverpassResponse | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.tMs > ttlMs) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
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


