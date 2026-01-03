import * as THREE from "three";
import type { OverpassResponse } from "../data/overpass_client";
import { llaToEnu, type LlaDeg } from "../world/enu";

export class OsmAirportLayer {
  private group: THREE.Group | null = null;

  setData(scene: THREE.Scene, origin: LlaDeg, data: OverpassResponse) {
    this.clear(scene);

    const group = new THREE.Group();
    group.name = "airport-osm";
    group.position.y = 6;
    group.renderOrder = 90;

    for (const el of data.elements) {
      if (el.type !== "way") continue;
      const tags = (el as any).tags as Record<string, string> | undefined;
      const geom = (el as any).geometry as Array<{ lat: number; lon: number }> | undefined;
      if (!tags || !geom || geom.length < 2) continue;

      const aeroway = tags["aeroway"];
      if (aeroway !== "runway" && aeroway !== "taxiway") continue;

      // Simplify: approximate each way as a single straight segment (first->last).
      const a0 = geom[0];
      const a1 = geom[geom.length - 1];

      const p0 = llaToEnu({ latDeg: a0.lat, lonDeg: a0.lon, altM: 0 }, origin);
      const p1 = llaToEnu({ latDeg: a1.lat, lonDeg: a1.lon, altM: 0 }, origin);

      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const length = Math.hypot(dx, dz);
      if (!Number.isFinite(length) || length < 50) continue;

      const headingRad = Math.atan2(dx, dz); // clockwise from +Z (north)
      const mid = new THREE.Vector3((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);

      const width = aeroway === "runway" ? 80 : 28;
      const color = aeroway === "runway" ? 0x14b8a6 : 0x34d399;
      const opacity = aeroway === "runway" ? 0.45 : 0.22;

      const mesh = createStrip({ length, width, headingRad, color, opacity });
      mesh.position.add(mid);
      mesh.renderOrder = 90;
      group.add(mesh);
    }

    scene.add(group);
    this.group = group;
  }

  clear(scene: THREE.Scene) {
    if (!this.group) return;
    scene.remove(this.group);
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
      const mat = (o as THREE.Mesh).material as any;
      if (mat?.dispose) mat.dispose();
    });
    this.group = null;
  }
}

function createStrip(params: {
  length: number;
  width: number;
  headingRad: number;
  color: number;
  opacity: number;
}): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(params.width, params.length);
  geom.rotateX(-Math.PI / 2); // XY -> XZ

  const mat = new THREE.MeshBasicMaterial({
    color: params.color,
    transparent: true,
    opacity: params.opacity,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -6;
  mat.polygonOffsetUnits = -6;

  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.y = params.headingRad;
  return mesh;
}


