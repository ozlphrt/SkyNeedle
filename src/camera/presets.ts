import * as THREE from "three";

export type CameraPreset = {
  name: "tower" | "orbit";
  positionWorld: THREE.Vector3;
  targetWorld: THREE.Vector3;
  fovDeg: number;
};

export function getTowerPreset(): CameraPreset {
  // ENU origin is the active airport (default JFK). For now, origin == (0,0,0).
  // Place camera south of origin looking north; high enough to see 50mi rings.
  return {
    name: "tower",
    positionWorld: new THREE.Vector3(0, 120_000, -120_000),
    targetWorld: new THREE.Vector3(0, 0, 0),
    fovDeg: 55
  };
}

export function getOrbitPreset(params: {
  targetWorld: THREE.Vector3;
  // Fixed offset in world space (simple + stable). OrbitControls will handle user orbiting.
  offsetWorld?: THREE.Vector3;
}): CameraPreset {
  const offset = params.offsetWorld ?? new THREE.Vector3(0, 18_000, -32_000);
  return {
    name: "orbit",
    positionWorld: params.targetWorld.clone().add(offset),
    targetWorld: params.targetWorld.clone(),
    fovDeg: 50
  };
}


