# Asset Pipeline — Aircraft Silhouettes (SkyNeedle)

## Purpose
Guarantee consistent orientation, scale, and performance for all external 3D aircraft models.
No runtime guesswork.

## Visual intent
- Minimalist silhouettes
- No airline liveries
- High contrast against dark globe

## Directory layout
```
/assets/
  aircraft/
    source/        # raw downloaded models
    normalized/    # fixed orientation, scale, pivot
    manifest.json  # metadata per model
```

## Accepted formats
- GLTF / GLB only

## Polygon budgets (hard limits)
- LOD0 (selected aircraft): ≤ 5k triangles
- LOD1 (near): ≤ 1k triangles
- LOD2 (far): marker only (no GLTF)

## Texture rules
- Optional
- If used:
  - ≤ 512×512
  - Mostly monochrome
  - No baked lighting

## Normalization requirements (mandatory)
Each model in `/normalized/` must satisfy:
- Units: meters
- Up axis: +Y
- Forward (nose): -Z
- Right: +X
- Pivot at center of mass (or visually centered)
- All transforms baked

## Orientation sanity check
When placed at origin:
- Heading 0° → points toward +Z in world
- Pitch and roll = 0 → aircraft appears level

## Manifest file (`manifest.json`)
Each entry:
```json
{
  "id": "generic-jet",
  "file": "generic-jet.glb",
  "scale": 1.0,
  "lod": {
    "near": 2000,
    "far": 8000
  }
}
```

## Runtime rules
- Default: one generic silhouette reused for all aircraft.
- Type-based silhouettes may be added later.
- If GLTF fails to load or FPS drops:
  - Switch to marker-only mode automatically.

