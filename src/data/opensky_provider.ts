import type { AircraftSample } from "./mock_provider";
import { llaToEnu, type LlaDeg } from "../world/enu";

type OpenSkyStatesResponse = {
  time: number;
  states: any[] | null;
};

export class OpenSkyProvider {
  readonly updateIntervalMs: number;
  private timer: number | null = null;
  private origin: LlaDeg;
  private bboxRadiusM: number;

  constructor(params: { origin: LlaDeg; bboxRadiusM?: number; updateIntervalMs?: number }) {
    this.origin = params.origin;
    this.bboxRadiusM = params.bboxRadiusM ?? 90_000; // ~56mi
    this.updateIntervalMs = params.updateIntervalMs ?? 15_000; // be rate-safe
  }

  setOrigin(origin: LlaDeg) {
    this.origin = origin;
  }

  async fetchOnce(): Promise<AircraftSample[]> {
    const bbox = bboxAround(this.origin.latDeg, this.origin.lonDeg, this.bboxRadiusM);
    const url =
      `/opensky/api/states/all?` +
      `lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
    const json = (await res.json()) as OpenSkyStatesResponse;
    const states = Array.isArray(json.states) ? json.states : [];

    const out: AircraftSample[] = [];
    for (const s of states) {
      // https://opensky-network.org/apidoc/rest.html#response
      const icao24 = safeStr(s[0]);
      const callsign = safeStr(s[1]).trim();
      const lon = safeNum(s[5]);
      const lat = safeNum(s[6]);
      const baroAlt = safeNum(s[7]);
      const trueTrack = safeNum(s[10]);
      const geoAlt = safeNum(s[13]);

      if (!icao24 || lat === null || lon === null) continue;

      const altM = (geoAlt ?? baroAlt ?? 0) || 0;

      const enu = llaToEnu({ latDeg: lat, lonDeg: lon, altM: altM }, this.origin);

      // Keep to local radius (avoid bbox corners far away).
      const d = Math.hypot(enu.x, enu.z);
      if (d > this.bboxRadiusM) continue;

      out.push({
        // Stable id for interpolation/selection
        id: icao24,
        callsign: callsign || icao24,
        positionEnuM: enu,
        headingDeg: trueTrack ?? 0
      });
    }

    return out;
  }

  start(onUpdate: (samples: AircraftSample[], tMs: number) => void): () => void {
    const emit = async () => {
      try {
        const data = await this.fetchOnce();
        onUpdate(data, performance.now());
      } catch (e) {
        // surface error to caller via empty list; caller can fallback
        console.warn("OpenSkyProvider fetch failed", e);
        throw e;
      }
    };

    // Fire once immediately (async).
    emit().catch(() => {});

    this.timer = window.setInterval(() => {
      emit().catch(() => {});
    }, this.updateIntervalMs);

    return () => {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
    };
  }
}

function bboxAround(latDeg: number, lonDeg: number, radiusM: number): {
  lamin: string;
  lomin: string;
  lamax: string;
  lomax: string;
} {
  const R = 6371000;
  const lat = (latDeg * Math.PI) / 180;
  const dLat = radiusM / R;
  const dLon = radiusM / (R * Math.max(0.2, Math.cos(lat)));

  const lamin = latDeg - (dLat * 180) / Math.PI;
  const lamax = latDeg + (dLat * 180) / Math.PI;
  const lomin = lonDeg - (dLon * 180) / Math.PI;
  const lomax = lonDeg + (dLon * 180) / Math.PI;

  return {
    lamin: lamin.toFixed(4),
    lomin: lomin.toFixed(4),
    lamax: lamax.toFixed(4),
    lomax: lomax.toFixed(4)
  };
}

function safeNum(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeStr(v: any): string {
  return typeof v === "string" ? v : "";
}


