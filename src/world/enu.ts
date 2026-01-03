import * as THREE from "three";

export type LlaDeg = {
  latDeg: number;
  lonDeg: number;
  altM: number;
};

// WGS84 ellipsoid constants (meters).
const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

const degToRad = (deg: number) => (deg * Math.PI) / 180;

// Space declaration:
// - Input: LLA (geodetic, degrees/meters)
// - Output: ECEF (meters)
export function llaToEcef(lla: LlaDeg): THREE.Vector3 {
  const lat = degToRad(lla.latDeg);
  const lon = degToRad(lla.lonDeg);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);

  const x = (N + lla.altM) * cosLat * cosLon;
  const y = (N + lla.altM) * cosLat * sinLon;
  const z = (N * (1 - WGS84_E2) + lla.altM) * sinLat;

  return new THREE.Vector3(x, y, z);
}

// Space declaration:
// - Input: ECEF (meters)
// - Output: ENU (meters), canonical world frame:
//   X=East(+), Y=Up(+), Z=North(+)
//
// Matrix trace (conceptual):
// vec_enu = R_ecef_to_enu(originLatLon) * (vec_ecef - vec_ecef_origin)
export function ecefToEnu(
  ecef: THREE.Vector3,
  origin: LlaDeg
): THREE.Vector3 {
  const originEcef = llaToEcef(origin);
  const d = ecef.clone().sub(originEcef);

  const lat = degToRad(origin.latDeg);
  const lon = degToRad(origin.lonDeg);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  // Standard ECEF->ENU gives components (east, north, up).
  const east = -sinLon * d.x + cosLon * d.y;
  const north = -sinLat * cosLon * d.x - sinLat * sinLon * d.y + cosLat * d.z;
  const up = cosLat * cosLon * d.x + cosLat * sinLon * d.y + sinLat * d.z;

  // Canonical SkyNeedle world uses ENU mapped to Three.js axes:
  // X=East, Y=Up, Z=North
  return new THREE.Vector3(east, up, north);
}

export function llaToEnu(lla: LlaDeg, origin: LlaDeg): THREE.Vector3 {
  return ecefToEnu(llaToEcef(lla), origin);
}


