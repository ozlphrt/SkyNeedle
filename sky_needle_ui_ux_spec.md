# UI / UX Specification (SkyNeedle)

## Design intent
- Dark ATC monitor aesthetic
- Calm, precise, instrument-like
- Zero visual noise

## Layout

### Top-right
- Search input
  - Accepts city name or airport code
  - Enter / confirm triggers airport resolution

### Bottom-right
- **Spin Dial (Aircraft Selector)**
  - Circular list
  - Ordered by distance (nearest first)
  - Max 50 aircraft

### Bottom-left
- Camera preset buttons
  - Tower
  - Orbit

## Spin Dial behavior (locked)
- Displays:
  - Callsign (if available)
  - Altitude (feet)
- Selecting item:
  - Highlights aircraft in scene
  - Switches camera to Orbit preset

## Label rules
- Labels shown only within visible radius
- Selected aircraft label always visible
- Fade-in / fade-out only (no popping)

## Interaction rules
- Tap aircraft → select
- Tap empty space → deselect (return to Tower)
- Drag → rotate camera
- Pinch → zoom
- Double-tap → focus / tighten view

## Visual feedback
- Selected aircraft:
  - Brighter needle
  - Slight glow or scale increase
- Non-selected aircraft remain subdued

## Performance UX rules
- UI must remain responsive even if rendering degrades
- If FPS drops:
  - Reduce visual fidelity silently
  - Never block interaction
