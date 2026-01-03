# Task List (SkyNeedle — Baby Steps)

## Rule
Each task must:
- Produce a visible result
- Be runnable in < 30 seconds
- Change as little code as possible

---

## Phase 0 — Project skeleton

### T0.1 Capacitor + Vite scaffold
- Create Capacitor app
- Add Vite + TypeScript
- Add Three.js dependency

**Visual check**
- App launches
- Black screen with text: "SkyNeedle"

---

### T0.2 Three.js boot
- Create renderer, scene, camera
- Attach canvas to DOM
- Render empty scene

**Visual check**
- Dark background
- No errors

---

## Phase 1 — World foundation (JFK)

### T1.1 ENU math utilities
- Implement lat/lon → ECEF → ENU
- Define origin at JFK

**Visual check**
- Axis gizmo at origin
- North arrow visible

---

### T1.2 Distance rings
- Draw rings at 10 / 25 / 50 miles

**Visual check**
- Concentric rings centered at origin

---

### T1.3 Globe background
- Add subtle Earth texture
- Align north with +Z

**Visual check**
- Globe visible
- Rings still visible and aligned

---

### T1.4 Tower camera preset
- Implement tower camera logic
- Smooth transition into preset

**Visual check**
- "Tower" button snaps smoothly to JFK view

---

## Phase 2 — Aircraft (mock data)

### T2.1 MockProvider
- Emit 50 aircraft within 50 miles
- Stable IDs

**Visual check**
- 50 markers appear

---

### T2.2 Aircraft motion
- Interpolate positions
- Smooth heading

**Visual check**
- Aircraft move smoothly, no jitter

---

### T2.3 Altitude needles
- Vertical green needles
- Batched geometry

**Visual check**
- Needles stable, no shimmer

---

### T2.4 Labels
- Billboard labels
- Radius-based visibility

**Visual check**
- Labels fade in/out smoothly

---

### T2.5 Orbit camera preset
- Smooth orbit around selected aircraft

**Visual check**
- Selecting aircraft switches to orbit view

---

## Phase 3 — UI

### T3.1 Spin dial
- Small vertical wheel UI (spin/drag to choose aircraft)
- Nearest-first ordering

**Visual check**
- Dial updates as aircraft move

---

### T3.2 Selection wiring
- Dial ↔ scene sync

**Visual check**
- Selecting from dial highlights aircraft

---

## Phase 4 — Airport resolution

### T4.1 Search input
- City / airport code input

**Visual check**
- Enter triggers resolution

---

### T4.2 Nearest large airport
- City → nearest large airport

**Visual check**
- Entering city recenters tower view

---

## Phase 5 — Airport geometry

### T5.1 OSM runways / taxiways
- Fetch and render simplified geometry
- (Baby-step option) Start with a local stub runway/taxiway mesh to validate rendering pipeline

**Visual check**
- Runways appear near airport

---

### T5.1b Rendering polish (pre-OSM)
- Reduce “neon” colors; use muted ATC palette (never pure white)
- Basic declutter/LOD tweaks only if needed (no feature creep)

**Visual check**
- Airport geometry reads clearly but remains subtle (no glaring white/green)
- No new jitter/snapping

---

### T5.2 OSM runways / taxiways (real fetch)
- Fetch runway/taxiway geometry from OSM (Overpass)
- Cache responses; be rate-safe
- Render simplified runway/taxiway meshes near active airport

**Visual check**
- Switching airport shows runways/taxiways for that airport
- No console errors

---

## Phase 6 — Live data (later)

### T6.1 OpenSkyProvider
- Rate-limit safe polling

**Visual check**
- Live aircraft move smoothly


