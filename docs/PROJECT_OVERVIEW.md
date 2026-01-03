# SkyNeedle — 3D Flight Tracker (Visual-First)

## One-liner
A dark, ATC-inspired 3D globe that shows nearby aircraft as minimalist silhouettes with “altitude needles,” plus airport/runway/taxiway highlights and smooth cinematic camera presets.

## Core user flows
1. **Launch (default JFK)**
   - Globe loads centered on **JFK**.
   - Tower camera preset active.
   - Mock aircraft visible (until live data is added).

2. **Search (top-right input)**
   - User enters **city name** or **airport code**.
   - App resolves target airport:
     - If city: **nearest large airport**.
     - If IATA/ICAO: that airport.
   - Camera snaps smoothly to tower preset over that airport.

3. **Browse nearest aircraft**
   - Spin dial shows **nearest 50 aircraft within 50 miles**.
   - Selecting an aircraft highlights it and switches to orbit preset.

## Visual style goals (non-negotiable)
- Dark ATC monitor vibe: high contrast, restrained color palette.
- Smoothness over features: no jitter, no stutter.
- Minimalist aircraft silhouettes (no liveries).
- Elevation is emphasized via **vertical green altitude needle**.

## Non-goals (for early phases)
- No full flight history / replay.
- No social/sharing features.
- No complex ATC analytics.

## Definition of Done (global)
- Each step must be:
  - Visually testable within **30 seconds** (run + see change).
  - A single, obvious improvement.
  - Measurable vs a checklist.


