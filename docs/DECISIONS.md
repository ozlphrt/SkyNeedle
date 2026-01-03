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

### Globe placement (visual-only)
- Globe is a **visual background**, not the truth frame.
- For visual coherence, place the globe so the ENU origin appears on the **globe surface**
  (rings should not look like they are inside the Earth).
 - Globe radius: **true Earth mean radius** \(R = 6,371,000m\). ENU units remain meters.

### Distance rings (rendering)
- Ring distances are defined in **ENU** (meters/miles) around the active airport origin.
- Rendering may use **surface-projected rings** (cosmetic) so the rings appear to follow the globe curvature.

---

## Aircraft
- Visual style: **Minimalist silhouettes**
- External models: **GLTF**, normalized once
- No airline liveries
- Fallback: marker-only mode

### Marker rendering (visual-only)
- Marker-only mode may be **surface-projected** onto the visual globe for coherence with curved rings.
- Truth positions remain ENU; projection is **rendering-only**.
 - Marker scale intent: keep cone proxy at approximately **real aircraft size** (tens of meters), not km-scale.

### Altitude needles (rendering)
- Needles are visualized as vertical/radial “needles” from aircraft toward the ground.
- When surface-projection is enabled for markers, needles may be rendered along the **local surface normal**
  for visual coherence (rendering-only).

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

### Aircraft selector (wheel) behavior
- Selector may auto-collapse into a small aircraft icon after **3s** of inactivity.
- Any interaction (tap/click/drag/scroll) expands it immediately.

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
- Docs are authoritative


