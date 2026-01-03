# Airport Resolution — City → Nearest Large Airport (SkyNeedle)

## Goal
Convert a city name or airport code into a single **active airport** used as:
- ENU origin
- Tower camera anchor
- OSM geometry fetch target

## Accepted inputs
- City name (free text, e.g. "New York")
- IATA code (e.g. JFK)
- ICAO code (e.g. KJFK)

## Locked behavior
- City input → resolve to **nearest large airport**.
- Airport code input → resolve directly.

## Resolution flow

### Step 1 — Detect code vs city
- If input matches known IATA/ICAO → airport selected.
- Else → treat input as city name.

### Step 2 — City geocoding
- Use online geocoder to resolve city → (lat, lon).
- Cache recent lookups.

### Step 3 — Nearest large airport
- Use bundled dataset of large airports.
- Compute great-circle distance.
- Select nearest airport.

If no airport found within reasonable range:
- Select nearest anyway.
- Show subtle UI hint: "Nearest major airport shown".

## Large airport dataset (Phase 1)
Bundled JSON (small, fast):
```json
{
  "icao": "KJFK",
  "iata": "JFK",
  "name": "John F Kennedy International",
  "lat": 40.6413,
  "lon": -73.7781,
  "rank": "large"
}
```

Criteria:
- Only large / major airports included.
- Keeps app light and deterministic.

## Output
```ts
interface ActiveAirport {
  icao: string;
  iata?: string;
  name: string;
  lat: number;
  lon: number;
}
```

## Visual effect on change
- Smooth camera transition to tower preset.
- ENU origin resets (fade world → re-center → fade in).
- Aircraft list refreshed.
