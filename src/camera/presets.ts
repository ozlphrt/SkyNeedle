import * as THREE from "three";

export type CameraPreset = {
  name: "tower" | "orbit";
  positionWorld: THREE.Vector3;
  targetWorld: THREE.Vector3;
  fovDeg: number;
};

export function getTowerPreset(): CameraPreset {
  // ENU origin is the active airport (default JFK). For now, origin == (0,0,0).
  // Default altitude requested: 10,000 ft ≈ 3048 m.
  return {
    name: "tower",
    // 3 miles ≈ 4,828 m south of the airport, looking north toward origin.
    positionWorld: new THREE.Vector3(0, 3048, -4_828),
    targetWorld: new THREE.Vector3(0, 0, 0),
    fovDeg: 55
  };
}

export function getOrbitPreset(params: {
  targetWorld: THREE.Vector3;
  // Fixed offset in world space (simple + stable). OrbitControls will handle user orbiting.
  offsetWorld?: THREE.Vector3;
}): CameraPreset {
  // True-scale: keep orbit offset in hundreds of meters (close enough to read aircraft/label).
  const offset = params.offsetWorld ?? new THREE.Vector3(0, 450, -900);
  return {
    name: "orbit",
    positionWorld: params.targetWorld.clone().add(offset),
    targetWorld: params.targetWorld.clone(),
    fovDeg: 50
  };
}


