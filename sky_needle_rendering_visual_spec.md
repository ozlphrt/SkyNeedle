# Rendering & Visual Spec (SkyNeedle)

## Scene layers
1. **Background Globe**
   - Subtle Earth texture + elevation shading.
   - Darkened to ATC monitor look (no bright oceans).
   - Optional lat/long grid lines with low opacity.

2. **Airport Layer**
   - Runways and taxiways highlighted from OSM-derived geometry.
   - Only visible when camera is within airport LOD range.
   - Colors: muted cyan/green, never pure white.

3. **Aircraft Layer**
   - Minimalist silhouettes (GLTF) or fallback markers.
   - Labels + altitude needles rendered above all terrain.

## Lighting
- One soft directional "moonlight" light.
- Subtle ambient fill.
- No hard shadows in early phases (avoid shimmer).
- Low-contrast tone mapping; preserve dark blacks.

## Aircraft visuals
- Primary: minimalist GLTF silhouette.
- Secondary: instanced low-poly wedge marker.

### Orientation
- Aircraft nose points toward velocity/heading.
- Roll is ignored initially (kept level for clarity).

### Altitude needles
- Vertical line from aircraft down to U=0 plane.
- Color: ATC green.
- Opacity and thickness scale with altitude.
- Geometry must be stable on mobile:
  - Prefer tube or thin cylinder meshes.
  - Avoid single-pixel screen-space lines.

### Labels
- Content: Callsign (if available) + altitude in feet.
- Billboarding toward camera.
- Declutter rules:
  - Max labels on screen: 50.
  - Fade out when overlapping or too small.
  - Selected aircraft label always visible.

## LOD rules (hard)
- Far: marker only, no label, thin needle.
- Mid: marker + needle + label.
- Near/Selected: GLTF silhouette + needle + label.

## Anti-jitter rules
- All transforms smoothed (position + rotation).
- No snapping; use damped interpolation.
- Label screen-space positions smoothed separately.
