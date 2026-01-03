# Camera Presets & Motion (SkyNeedle)

## Core rule
Camera motion must *feel cinematic*, never mechanical.
No snapping. Ever.

## Presets (locked)

### 1. Tower View (Airport)
- Camera is anchored near the active airport.
- Looks toward airport centroid or primary runway midpoint.
- Typical parameters:
  - Height: 800–2500 m
  - Horizontal offset: 2–8 km
- North is kept roughly up-screen unless user rotates.

### 2. Orbit Selected Aircraft
- Smooth orbit around selected aircraft.
- Aircraft is slightly off-center (cinematic framing).
- Orbit radius scales with altitude and speed.
- Orbit plane stays mostly horizontal.

## Camera smoothing (mandatory)
- Position, lookAt target, and orbit angle must be damped.
- Use critically damped spring or exponential smoothing.

Guidelines:
- Preset switch duration: 0.6–1.2 s
- User interaction overrides smoothing temporarily, then re-engages.

## Target rules
- No aircraft selected → Tower View active.
- Aircraft selected → Orbit View active.
- Selected aircraft lost/out of range → Return to Tower View.

## Look-at strategy
- Tower View: airport centroid.
- Orbit View: aircraft position + small forward offset.

## Constraints
- Camera must never go below ground plane (U < 0).
- Clamp extreme zoom levels.
- Avoid gimbal lock by using quaternions internally.
