# Performance Budget (SkyNeedle)

## Target
- **60 FPS sustained** on mid-range mobile devices.
- Visual smoothness has priority over feature richness.

## Assumed device class
- Modern mid-range phones (not flagship-only).
- Thermal throttling must be assumed after a few minutes.

## Hard caps (initial)
- Aircraft tracked internally: ~60
- Aircraft rendered: **50 max**
- Labels visible: **≤ 50**
- GLTF silhouettes visible simultaneously: **≤ 10**
- Altitude needles: batched for all visible aircraft

## Draw call budget
- Globe: 1–2 draw calls
- Airport geometry: 1–3 draw calls (LOD dependent)
- Aircraft markers: 1 instanced draw call
- Needles: 1 batched draw call
- Labels: batched where possible

## Geometry budgets
- Globe mesh: moderate resolution, no extreme tessellation
- Airport geometry: simplified OSM shapes
- Aircraft GLTF:
  - LOD0 ≤ 5k triangles
  - LOD1 ≤ 1k triangles

## Texture rules
- Globe texture: modest resolution, mipmapped
- Aircraft textures: optional, ≤ 512px
- Avoid large normal maps

## Frame-time priorities
1. Camera updates
2. Aircraft motion smoothing
3. UI responsiveness
4. Globe shading
5. Airport details

## Degradation strategy (automatic)
If FPS drops below threshold:
1. Reduce label count
2. Disable GLTF silhouettes → marker-only
3. Simplify globe shading
4. Reduce needle thickness / segments

## Anti-patterns (forbidden)
- Per-frame allocations
- Per-object lights
- Per-frame texture uploads
- Complex post-processing early
