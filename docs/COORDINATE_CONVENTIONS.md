# World Coordinates (Avoid Three.js Coordinate Pain)

## Canonical world frame
We use a **Local Tangent Plane (ENU)** anchored at an **origin airport**.

- **E (East) = +X**
- **U (Up) = +Y**
- **N (North) = +Z**

This is the only “truth” coordinate system for positions, velocities, camera, airport geometry, and altitude needles.

## Why ENU
- Stable for a local region (50 miles radius).
- Simple and consistent with Three.js (Y-up).
- Avoids globe/ECEF precision issues in rendering logic.

## Data position pipeline
Aircraft data (lat, lon, alt_ft) → ENU meters relative to origin:
1. Convert **lat/lon/alt** to **ECEF** (meters).
2. Convert ECEF to **ENU** using origin lat/lon.
3. Use ENU directly in Three.js scene.

Altitude:
- Convert `alt_ft` → `alt_m = alt_ft * 0.3048`.

## Globe rendering note
The globe is a **visual background**, not the coordinate truth.
- **Placement (visual coherence)**:
  - The ENU origin (active airport) is on the **tangent plane** \(Y=0\).
  - To avoid the rings looking like they’re inside the globe, place the globe so that the
    ENU origin lies on the **globe surface**, not at the globe center.
  - Minimal placement (visual-only, no geospatial registration):
    - Let globe radius be \(R\) (meters).
    - Place globe center at \((0, -R, 0)\) so the “top” of the globe touches the origin.
- Rotate globe to align any **visual north cue** with +Z **only if** the globe texture/grid implies a north;
  otherwise treat the globe as decorative.
- Aircraft, airports, and cameras live purely in ENU.

### Aircraft rendering vs globe (visual-only option)
- Aircraft truth positions remain in **ENU**.
- For visual coherence (so markers “sit” on the globe surface like surface-projected rings),
  marker rendering may **project ENU positions onto the globe surface**:
  - Use ENU horizontal distance \(d = \sqrt{x^2 + z^2}\) and direction in the tangent plane.
  - Convert to central angle \(\theta = d / R\) and map onto the sphere centered at \((0, -R, 0)\).
  - Apply altitude as a small radial lift above the surface (visual-only).
- This projection must not change ENU math utilities, data logic, or distance calculations.

### Altitude needles (visual-only option when projecting to globe)
- Truth altitude is still **ENU Up (+Y)** in meters.
- If aircraft markers are surface-projected for coherence, altitude needles may also be rendered
  **along the local globe surface normal** (radial) so they stay attached to the marker and read cleanly.
- This is **rendering-only** and must not change any ENU computations.

## Model orientation standard (GLTF aircraft silhouettes)
Standardize once; runtime must not guess.

**Model space convention (required):**
- Up: **+Y**
- Forward (nose): **-Z**
- Right: **+X**
- Units: **meters**
- Origin: aircraft center of mass (or consistent pivot)

If incoming GLTF differs:
- Fix in an asset-prep step and store corrected versions in `/assets/aircraft/normalized/`.

## Heading application
- Heading is degrees clockwise from North.
- Rotate about **+Y** axis.
- Heading 0° points toward **+Z**.
- Apply a fixed offset if model forward axis differs.

## Debug overlays (mandatory early)
- Axis gizmo at origin (X=red, Y=green, Z=blue).
- North arrow on ground plane.
- Distance rings at **10 / 25 / 50 miles**.

### Distance ring rendering (visual-only option)
- Truth distances remain in **ENU meters** on the tangent plane.
- For visual coherence with the globe, distance rings may be **projected onto the globe surface**
  as a cosmetic overlay:
  - Let globe radius be \(R\).
  - Convert ring distance \(d\) to central angle \(\theta = d / R\).
  - Draw the small-circle on the sphere at angle \(\theta\) from the “top” point (ENU origin).
  - This is **visual-only**; it must not change any ENU math or data logic.


