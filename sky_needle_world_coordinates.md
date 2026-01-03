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
- Render a globe mesh centered at scene origin.
- Rotate globe to align visual north with +Z.
- Aircraft, airports, and cameras live purely in ENU.

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
