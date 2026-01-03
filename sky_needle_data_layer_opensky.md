# Data Layer — Mock First, OpenSky Later (SkyNeedle)

## Core principle
**Pull slow, render fast.**
Network updates are sparse; visuals are continuous.

## Provider abstraction
All data sources must implement the same interface.

```ts
interface AircraftState {
  id: string;          // stable key (icao24 when available)
  callsign?: string;
  lat: number;
  lon: number;
  alt_ft: number;
  heading_deg?: number;
  speed_kt?: number;
  ts_ms: number;       // timestamp of data
}

interface AircraftProvider {
  start(params: {
    centerLat: number;
    centerLon: number;
    radiusNm: number;
  }): void;

  stop(): void;

  onUpdate(cb: (states: AircraftState[]) => void): () => void;
}
```

## Phase 1 — MockProvider (mandatory first)
Purpose: visual validation without network noise.

Behavior:
- Emits exactly **50 aircraft** within 50 miles of center.
- Motion patterns:
  - linear cruise
  - gentle turns
- Truth updates every 2–5 seconds.
- Render loop interpolates every frame.

Rules:
- No jitter.
- No teleporting.
- IDs must remain stable.

## Phase 2 — OpenSkyProvider

### Rate-limit discipline
- Start with **10–15 s pull interval**.
- Back off on errors or empty responses.
- Never poll faster than allowed.

### Data hygiene
- Deduplicate by `icao24`.
- Drop aircraft with invalid lat/lon/alt.
- Keep last known state per aircraft.

## Client-side interpolation
Each aircraft keeps a short track buffer.

Render position:
- If two samples exist → interpolate.
- If one sample exists → extrapolate (max ~10 s).
- If stale → slow drift + fade out.

## Smoothing (non-negotiable)
- Position smoothing in ENU space.
- Heading smoothing with angular wrap handling.
- Large jumps:
  - fade out
  - reposition
  - fade in

## Radius + count enforcement
- Internal buffer radius: 60 miles.
- Visible radius: 50 miles.
- UI list: nearest 50 only.

## Failure modes
- Network down → keep last known motion briefly, then fade out.
- Provider error → do not spam retries.
