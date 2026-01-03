import * as THREE from "three";

// Critically-damped smoothing toward a target.
// Space declaration: operates in world space (ENU meters).
export function dampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dtSeconds: number
): THREE.Vector3 {
  // Exponential decay: current <- lerp(current, target, 1 - exp(-lambda * dt))
  const t = 1 - Math.exp(-lambda * Math.max(0, dtSeconds));
  return current.lerp(target, t);
}


