import type { Airport, City } from "../data/airports";
import { AIRPORTS, CITIES } from "../data/airports";

export type ResolveResult =
  | { ok: true; airport: Airport; source: "iata" | "icao" | "city" }
  | { ok: false; message: string };

export function resolveAirportQuery(raw: string): ResolveResult {
  const q = raw.trim();
  if (!q) return { ok: false, message: "Empty query" };

  const upper = q.toUpperCase();

  // Airport code direct match.
  if (upper.length === 3) {
    const a = AIRPORTS.find((x) => x.iata === upper);
    if (a) return { ok: true, airport: a, source: "iata" };
  }
  if (upper.length === 4) {
    const a = AIRPORTS.find((x) => x.icao === upper);
    if (a) return { ok: true, airport: a, source: "icao" };
  }

  // City match (case-insensitive).
  const city = findCity(q, CITIES);
  if (!city) return { ok: false, message: `Unknown city/code: ${q}` };

  const airport = nearestLargeAirport(city, AIRPORTS);
  return { ok: true, airport, source: "city" };
}

function findCity(q: string, cities: City[]): City | null {
  const norm = q.trim().toLowerCase();
  // Basic contains match for baby step.
  return (
    cities.find((c) => c.name.toLowerCase() === norm) ??
    cities.find((c) => c.name.toLowerCase().includes(norm)) ??
    null
  );
}

function nearestLargeAirport(city: City, airports: Airport[]): Airport {
  let best: Airport | null = null;
  let bestD = Infinity;
  for (const a of airports) {
    if (!a.isLarge) continue;
    const d = haversineMeters(city.latDeg, city.lonDeg, a.latDeg, a.lonDeg);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  // With our dataset, this should never be null.
  return best ?? airports[0];
}

function haversineMeters(lat1Deg: number, lon1Deg: number, lat2Deg: number, lon2Deg: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(lat1Deg);
  const lon1 = toRad(lon1Deg);
  const lat2 = toRad(lat2Deg);
  const lon2 = toRad(lon2Deg);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


