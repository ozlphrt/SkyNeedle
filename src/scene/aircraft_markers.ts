import * as THREE from "three";
import type { AircraftSample } from "../data/mock_provider";
import {
  AIRCRAFT_MARKER_LIFT_M,
  GLOBE_CENTER_WORLD,
  GLOBE_RADIUS_M,
  GLOBE_TOP_DIR_WORLD
} from "./globe_params";

const EAST_AXIS = new THREE.Vector3(1, 0, 0);
const NORTH_AXIS = new THREE.Vector3(0, 0, 1);

export class AircraftMarkerLayer {
  private readonly group = new THREE.Group();
  private readonly byId = new Map<string, THREE.Mesh>();
  private readonly geom: THREE.BufferGeometry;
  private readonly matNormal: THREE.MeshBasicMaterial;
  private readonly matSelected: THREE.MeshBasicMaterial;
  private selectedId: string | null = null;
  private readonly tmp = {
    dir2: new THREE.Vector2(),
    dir: new THREE.Vector3(),
    up: new THREE.Vector3(),
    eastT: new THREE.Vector3(),
    northT: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    pos: new THREE.Vector3()
  };

  constructor(scene: THREE.Scene) {
    this.group.name = "aircraft-markers";
    this.group.renderOrder = 50;

    // Marker shape: forward-pointing cone so heading is visible.
    // Local forward: +Z (after rotateX), local up: +Y.
    // NOTE: tuned for OpenSky density; keep visually readable without dominating the scene.
    // True-scale marker: ~60m length, ~36m wingspan-ish silhouette using a cone proxy.
    const g = new THREE.ConeGeometry(18, 60, 8);
    g.rotateX(Math.PI / 2); // cone axis +Y -> +Z
    this.geom = g;

    this.matNormal = new THREE.MeshBasicMaterial({
      color: 0x34d399, // ATC green
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });
    this.matSelected = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, // soft blue highlight
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false
    });

    scene.add(this.group);
  }

  setSelectedId(id: string | null) {
    this.selectedId = id;
  }

  getSelectedWorldPosition(out: THREE.Vector3): boolean {
    if (!this.selectedId) return false;
    const m = this.byId.get(this.selectedId);
    if (!m) return false;
    out.copy(m.position);
    return true;
  }

  upsertAndUpdate(samples: AircraftSample[]) {
    for (const a of samples) {
      let m = this.byId.get(a.id);
      if (!m) {
        m = new THREE.Mesh(this.geom, this.matNormal);
        m.renderOrder = 50;
        m.userData = { aircraftId: a.id };
        this.byId.set(a.id, m);
        this.group.add(m);
      }

      // Visual-only: project ENU positions onto the globe surface so markers match surface rings.
      // Truth remains ENU in data layer.
      enuToGlobeSurfaceTransformInto(a.positionEnuM, a.headingDeg, this.tmp);
      // NOTE: keep the ENU position in userData for any layers that want truth coordinates.
      (m.userData as any).enu = a.positionEnuM;
      m.position.copy(this.tmp.pos);
      m.quaternion.copy(this.tmp.quat);

      // Highlight selected.
      const isSel = this.selectedId === a.id;
      m.material = isSel ? this.matSelected : this.matNormal;
      m.scale.setScalar(isSel ? 1.25 : 1.0);
    }
  }
}

function enuToGlobeSurfaceTransformInto(
  enu: THREE.Vector3,
  headingDeg: number,
  tmp: {
    dir2: THREE.Vector2;
    dir: THREE.Vector3;
    up: THREE.Vector3;
    eastT: THREE.Vector3;
    northT: THREE.Vector3;
    forward: THREE.Vector3;
    right: THREE.Vector3;
    basis: THREE.Matrix4;
    quat: THREE.Quaternion;
    pos: THREE.Vector3;
  }
): void {
  // ENU -> globe surface mapping around the top point (origin).
  // Let horizontal distance d = sqrt(x^2+z^2), theta = d/R.
  const x = enu.x;
  const z = enu.z;
  const d = Math.hypot(x, z);

  // Direction in the tangent plane (east/north).
  tmp.dir2.set(0, 0);
  if (d > 1e-3) tmp.dir2.set(x / d, z / d);

  const theta = d / GLOBE_RADIUS_M;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Local ENU basis at the top point (origin) in world axes.
  const n = GLOBE_TOP_DIR_WORLD; // up from center to origin
  const u = EAST_AXIS; // east
  const v = NORTH_AXIS; // north

  // Direction from globe center to surface point.
  tmp.dir
    .copy(n)
    .multiplyScalar(cosT)
    .addScaledVector(u, sinT * tmp.dir2.x)
    .addScaledVector(v, sinT * tmp.dir2.y)
    .normalize();

  // Position: on surface + altitude along radial up.
  const r = GLOBE_RADIUS_M + enu.y + AIRCRAFT_MARKER_LIFT_M;
  tmp.pos.copy(GLOBE_CENTER_WORLD).addScaledVector(tmp.dir, r);

  // Orientation: align marker up to radial up, forward to heading in local tangent plane.
  tmp.up.copy(tmp.dir).normalize();

  // Tangent east/north directions at this point: project global axes onto tangent plane.
  tmp.eastT.copy(u).addScaledVector(tmp.up, -u.dot(tmp.up)).normalize();
  tmp.northT.copy(v).addScaledVector(tmp.up, -v.dot(tmp.up)).normalize();

  const headingRad = (headingDeg * Math.PI) / 180;
  tmp.forward
    .copy(tmp.northT)
    .multiplyScalar(Math.cos(headingRad))
    .addScaledVector(tmp.eastT, Math.sin(headingRad))
    .normalize();

  // Orthonormal basis for object:
  // local X (right) = up x forward, local Y = up, local Z = forward
  tmp.right.copy(tmp.up).cross(tmp.forward).normalize();
  tmp.forward.copy(tmp.right).cross(tmp.up).normalize();

  tmp.basis.makeBasis(tmp.right, tmp.up, tmp.forward);
  tmp.quat.setFromRotationMatrix(tmp.basis);
}


