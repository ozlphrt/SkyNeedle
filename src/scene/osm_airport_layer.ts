import * as THREE from "three";
import type { OverpassResponse } from "../data/overpass_client";
import { llaToEnu, type LlaDeg } from "../world/enu";

export class OsmAirportLayer {
  private group: THREE.Group | null = null;

  setData(scene: THREE.Scene, origin: LlaDeg, data: OverpassResponse) {
    this.clear(scene);

    const group = new THREE.Group();
    group.name = "airport-osm";
    group.position.y = 2;
    group.renderOrder = 90;

    // Collect taxiways and render as a single merged LineSegments (faster, less overdraw).
    const taxiwayPolylines: THREE.Vector3[][] = [];

    for (const el of data.elements) {
      if (el.type !== "way") continue;
      const tags = (el as any).tags as Record<string, string> | undefined;
      const geom = (el as any).geometry as Array<{ lat: number; lon: number }> | undefined;
      if (!tags || !geom || geom.length < 2) continue;

      const aeroway = tags["aeroway"];
      if (aeroway !== "runway" && aeroway !== "taxiway") continue;

      // Render full way polyline as a flat ribbon strip (more faithful than first->last).
      const pts = geom.map((g) =>
        llaToEnu({ latDeg: g.lat, lonDeg: g.lon, altM: 0 }, origin)
      );
      const simplified = simplifyPolylineXZ(pts, aeroway === "runway" ? 20 : 15);
      if (simplified.length < 2) continue;

      if (aeroway === "runway") {
        const color = 0x14b8a6;
        // Plausible runway width (meters). Many major runways are 45–60m.
        const widthVis = 60;
        const opacity = 0.78;
        const mesh = createRibbonMesh(simplified, widthVis, color, opacity);
        mesh.position.y = 0.8; // slight layer above taxiway lines
        mesh.renderOrder = 90;
        group.add(mesh);
      } else {
        // Taxiways: keep as thin centerlines (not filled ribbons).
        // We'll smooth (Chaikin) and merge later into a single LineSegments for performance.
        const smoothed = chaikinSmoothXZ(simplified, 1);
        taxiwayPolylines.push(smoothed);
      }
    }

    if (taxiwayPolylines.length > 0) {
      const taxiways = createMergedCenterlines(taxiwayPolylines, 0x34d399, 0.55);
      taxiways.position.y = 0.4;
      (taxiways as any).renderOrder = 89;
      group.add(taxiways);
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

function createRibbonMesh(
  points: THREE.Vector3[],
  widthM: number,
  color: number,
  opacity: number
): THREE.Mesh {
  const half = widthM / 2;

  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const pPrev = points[Math.max(0, i - 1)];
    const pNext = points[Math.min(points.length - 1, i + 1)];
    const tx = pNext.x - pPrev.x;
    const tz = pNext.z - pPrev.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;

    left.push(new THREE.Vector3(p.x + nx * half, 0, p.z + nz * half));
    right.push(new THREE.Vector3(p.x - nx * half, 0, p.z - nz * half));
  }

  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l0 = left[i];
    const r0 = right[i];
    const l1 = left[i + 1];
    const r1 = right[i + 1];

    positions.push(
      l0.x,
      l0.y,
      l0.z,
      r0.x,
      r0.y,
      r0.z,
      l1.x,
      l1.y,
      l1.z,
      r0.x,
      r0.y,
      r0.z,
      r1.x,
      r1.y,
      r1.z,
      l1.x,
      l1.y,
      l1.z
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -6;
  mat.polygonOffsetUnits = -6;

  return new THREE.Mesh(geom, mat);
}

function createMergedCenterlines(polylines: THREE.Vector3[][], color: number, opacity: number): THREE.LineSegments {
  // Build one segment list for all polylines: [p0,p1][p1,p2]... so ways never connect accidentally.
  const positions: number[] = [];
  for (const pts of polylines) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      positions.push(a.x, 0, a.z, b.x, 0, b.z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false
  });

  return new THREE.LineSegments(geom, mat);
}

function chaikinSmoothXZ(points: THREE.Vector3[], iterations: number): THREE.Vector3[] {
  // Chaikin corner cutting in XZ plane (Y untouched / assumed 0 here).
  // Preserves endpoints; 1 iteration is usually enough for nicer curves.
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    if (pts.length < 3) return pts;
    const out: THREE.Vector3[] = [];
    out.push(pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const q = new THREE.Vector3(
        0.75 * p0.x + 0.25 * p1.x,
        0,
        0.75 * p0.z + 0.25 * p1.z
      );
      const r = new THREE.Vector3(
        0.25 * p0.x + 0.75 * p1.x,
        0,
        0.25 * p0.z + 0.75 * p1.z
      );
      // Skip adding duplicates at ends: keep endpoints explicitly.
      if (i !== 0) out.push(q);
      if (i !== pts.length - 2) out.push(r);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function simplifyPolylineXZ(points: THREE.Vector3[], minStepM: number): THREE.Vector3[] {
  if (points.length <= 2) return points;
  const out: THREE.Vector3[] = [];
  out.push(points[0]);
  let last = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = Math.hypot(p.x - last.x, p.z - last.z);
    if (d >= minStepM) {
      out.push(p);
      last = p;
    }
  }
  out.push(points[points.length - 1]);
  return out;
}


