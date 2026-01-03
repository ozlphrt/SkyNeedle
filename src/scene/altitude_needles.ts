import * as THREE from "three";
import type { AircraftSample } from "../data/mock_provider";
import {
  AIRCRAFT_MARKER_LIFT_M,
  GLOBE_CENTER_WORLD,
  GLOBE_RADIUS_M,
  GLOBE_TOP_DIR_WORLD,
  NEEDLE_BASE_LIFT_M
} from "./globe_params";

const EAST_AXIS = new THREE.Vector3(1, 0, 0);
const NORTH_AXIS = new THREE.Vector3(0, 0, 1);
const UP_AXIS = new THREE.Vector3(0, 1, 0);

export class AltitudeNeedleLayer {
  private readonly mesh: THREE.InstancedMesh;
  private readonly tmp = {
    dir2: new THREE.Vector2(),
    dir: new THREE.Vector3(),
    up: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    mat: new THREE.Matrix4(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
  };

  constructor(scene: THREE.Scene, capacity: number) {
    // Cylinder is stable on mobile vs 1px line; base height=1 so we can scale per instance.
    const geom = new THREE.CylinderGeometry(180, 180, 1, 10, 1, true);
    // Cylinder axis is +Y by default: we will align +Y to the local surface normal (radial).

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(geom, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.renderOrder = 40;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(samples: AircraftSample[]) {
    const n = Math.min(samples.length, this.mesh.count);
    for (let i = 0; i < n; i++) {
      const a = samples[i];

      // Surface-projected direction from globe center based on ENU horizontal distance.
      const x = a.positionEnuM.x;
      const z = a.positionEnuM.z;
      const d = Math.hypot(x, z);

      this.tmp.dir2.set(0, 0);
      if (d > 1e-3) this.tmp.dir2.set(x / d, z / d);

      const theta = d / GLOBE_RADIUS_M;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const nTop = GLOBE_TOP_DIR_WORLD;
      const u = EAST_AXIS;
      const v = NORTH_AXIS;

      this.tmp.dir
        .copy(nTop)
        .multiplyScalar(cosT)
        .addScaledVector(u, sinT * this.tmp.dir2.x)
        .addScaledVector(v, sinT * this.tmp.dir2.y)
        .normalize();

      // Needle endpoints along radial (visual-only):
      const rBase = GLOBE_RADIUS_M + NEEDLE_BASE_LIFT_M;
      const rTop = GLOBE_RADIUS_M + a.positionEnuM.y + AIRCRAFT_MARKER_LIFT_M;
      const length = Math.max(0, rTop - rBase);

      // Center position.
      const rMid = (rBase + rTop) * 0.5;
      this.tmp.pos.copy(GLOBE_CENTER_WORLD).addScaledVector(this.tmp.dir, rMid);

      // Orientation: align +Y to radial direction.
      this.tmp.quat.setFromUnitVectors(UP_AXIS, this.tmp.dir);

      // Thickness scales gently with altitude (avoid alpha shimmer).
      const alt = Math.max(0, a.positionEnuM.y);
      const t = THREE.MathUtils.clamp(alt / 12000, 0, 1);
      const thicknessScale = THREE.MathUtils.lerp(0.85, 1.85, t);
      this.tmp.scale.set(thicknessScale, length, thicknessScale);

      this.tmp.mat.compose(this.tmp.pos, this.tmp.quat, this.tmp.scale);
      this.mesh.setMatrixAt(i, this.tmp.mat);
    }

    // Hide unused instances (if any) by scaling to zero.
    for (let i = n; i < this.mesh.count; i++) {
      this.tmp.mat.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.tmp.mat);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }
}


