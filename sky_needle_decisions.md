# Decisions Log (SkyNeedle)

This file exists to prevent drift. Cursor AI must treat it as **authoritative**.

---

## Product
- App name: **SkyNeedle**
- Platforms: **iOS + Android**
- Stack: **Capacitor + Vite + TypeScript + Three.js**
- Mode: **Online only**
- Priority: **Visual pleasure and smoothness over features**

---

## Scene & World
- Base representation: **3D globe**
- Globe style: **Subtle Earth texture with elevation**, darkened
- Canonical coordinate system: **ENU**
  - East = +X
  - Up = +Y
  - North = +Z
- ENU origin:
  - Active airport
  - Default: **JFK**

---

## Aircraft
- Visual style: **Minimalist silhouettes**
- External models: **GLTF**, normalized once
- No airline liveries
- Fallback: marker-only mode

### Altitude
- Units: **feet** (data)
- Rendering: meters
- Visualization: **vertical green altitude needle**
- Needle visibility and opacity: adjustable

---

## Labels
- Radius-based visibility
- Selected aircraft label always visible
- Fade in/out only (no popping)

---

## Camera
- Presets:
  - **Tower View** (airport-centric)
  - **Orbit View** (selected aircraft)
- Motion:
  - Smoothed
  - No snapping
  - Cinematic damping

---

## UI
- Search input:
  - City name or airport code
  - City resolves to **nearest large airport**
- Aircraft selector:
  - Circular spin dial
  - Nearest-first ordering
  - Max 50 aircraft within 50 miles

---

## Data
- Phase 1: **MockProvider**
- Phase 2: **OpenSky**
- OpenSky rules:
  - Respect rate limits
  - Pull slow
  - Interpolate client-side

---

## Performance
- Target: **60 FPS**
- Degrade gracefully if needed
- Never block UI

---

## Workflow
- Baby steps only
- Every task ends in a visual checkpoint
- Docs a