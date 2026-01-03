import * as THREE from "three";

// Single source for visual globe placement used by globe + surface rings + optional marker projection.
export const GLOBE_RADIUS_M = 260_000;
export const GLOBE_CENTER_WORLD = new THREE.Vector3(0, -GLOBE_RADIUS_M, 0);
export const GLOBE_TOP_DIR_WORLD = new THREE.Vector3(0, 1, 0); // from center to ENU origin (top point)

// Rendering-only lifts (meters) used for surface-projected visuals.
export const AIRCRAFT_MARKER_LIFT_M = 1200;
export const NEEDLE_BASE_LIFT_M = 60;


