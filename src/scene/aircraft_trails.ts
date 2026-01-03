import * as THREE from "three";
import type { AircraftSample } from "../data/mock_provider";
import { AIRCRAFT_MARKER_LIFT_M, GLOBE_CENTER_WORLD, GLOBE_RADIUS_M, GLOBE_TOP_DIR_WORLD } from "./globe_params";

const EAST_AXIS = new THREE.Vector3(1, 0, 0);
const NORTH_AXIS = new THREE.Vector3(0, 0, 1);

type TrailState = {
  lastSampleMs: number;
  timesMs: number[];
  positionsWorld: number[]; // flat xyz list (meters)
  geom: THREE.BufferGeometry;
  line: THREE.Line;
  points: THREE.Points;
};

export class AircraftTrailLayer {
  private readonly group = new THREE.Group();
  private readonly byId = new Map<string, TrailState>();
  private visibleIds: Set<string> | null = null; // null => show all, Set => show subset

  // Config
  private readonly sampleEveryMs: number;
  private readonly maxAgeMs: number;
  private readonly maxPoints: number;

  constructor(
    scene: THREE.Scene,
    params?: {
      minutes?: number; // default 5
      sampleEveryMs?: number; // default 500 (faster initial visibility)
      maxPointsPerAircraft?: number; // default derived from minutes/sampleEveryMs
    }
  ) {
    const minutes = params?.minutes ?? 5;
    this.sampleEveryMs = params?.sampleEveryMs ?? 500;
    this.maxAgeMs = minutes * 60 * 1000;
    this.maxPoints =
      params?.maxPointsPerAircraft ?? Math.ceil(this.maxAgeMs / this.sampleEveryMs) + 10;

    this.group.name = "aircraft-trails";
    // Render after airport overlays so trails remain visible even with depthTest disabled.
    this.group.renderOrder = 95;
    scene.add(this.group);
  }

  setVisibleIds(ids: string[] | Set<string> | null) {
    this.visibleIds = ids === null ? null : ids instanceof Set ? ids : new Set(ids);
    for (const [id, st] of this.byId) {
      const vis = this.visibleIds === null ? true : this.visibleIds.has(id);
      st.line.visible = vis;
      st.points.visible = vis;
    }
  }


  reset() {
    for (const st of this.byId.values()) {
      st.geom.dispose();
      (st.line.material as THREE.Material).dispose();
    }
    this.byId.clear();
    this.group.clear();
  }

  update(samples: AircraftSample[], nowMs: number) {
    // Add points.
    for (const a of samples) {
      let st = this.byId.get(a.id);
      if (!st) {
        st = this.createTrail();
        this.byId.set(a.id, st);
        this.group.add(st.line, st.points);
      }

      if (nowMs - st.lastSampleMs < this.sampleEveryMs) continue;
      st.lastSampleMs = nowMs;

      const p = enuToGlobeWorldPosition(a.positionEnuM);
      st.timesMs.push(nowMs);
      st.positionsWorld.push(p.x, p.y, p.z);

      // Cap history (age + hard cap).
      pruneOld(st, nowMs, this.maxAgeMs, this.maxPoints);
      syncGeometry(st);

      // Visibility gating (default: caller can show selected only to reduce clutter).
      const vis = this.visibleIds === null ? true : this.visibleIds.has(a.id);
      st.line.visible = vis;
      st.points.visible = vis;
    }

    // GC trails for aircraft that disappeared (optional, keep small).
    for (const [id, st] of this.byId) {
      const age = nowMs - st.lastSampleMs;
      if (age < this.maxAgeMs * 1.2) continue;
      this.group.remove(st.line);
      this.group.remove(st.points);
      st.geom.dispose();
      (st.line.material as THREE.Material).dispose();
      (st.points.material as THREE.Material).dispose();
      this.byId.delete(id);
    }
  }

  private createTrail(): TrailState {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute([], 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe, // very light (near-white) for visibility
      transparent: true,
      opacity: 0.7,
      // Keep always-visible; airport geometry is also overlay-like.
      depthTest: false,
      depthWrite: false
    });

    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    line.renderOrder = 95;
    // Default hidden until caller decides (avoid clutter in tower view).
    line.visible = this.visibleIds === null ? true : false;

    // Also render as points (lines can be hard to see at true scale with 1px line widths).
    const pMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      size: 6.0,
      sizeAttenuation: false,
      depthTest: false,
      depthWrite: false
    });
    const points = new THREE.Points(geom, pMat);
    points.frustumCulled = false;
    points.renderOrder = 96;
    points.visible = line.visible;

    return {
      lastSampleMs: -Infinity,
      timesMs: [],
      positionsWorld: [],
      geom,
      line,
      points
    };
  }
}

function pruneOld(st: TrailState, nowMs: number, maxAgeMs: number, maxPoints: number) {
  // Age-based prune.
  while (st.timesMs.length > 0 && nowMs - st.timesMs[0] > maxAgeMs) {
    st.timesMs.shift();
    st.positionsWorld.splice(0, 3);
  }
  // Hard cap.
  while (st.timesMs.length > maxPoints) {
    st.timesMs.shift();
    st.positionsWorld.splice(0, 3);
  }
}

function syncGeometry(st: TrailState) {
  const arr = new Float32Array(st.positionsWorld);
  st.geom.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  (st.geom.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  st.geom.computeBoundingSphere();
}

function enuToGlobeWorldPosition(enu: THREE.Vector3): THREE.Vector3 {
  // Same projection used by markers/labels/needles: ENU horizontal distance mapped onto sphere.
  // Spaces:
  // vec_world = center_world + dir_world * r, where dir_world is derived from ENU tangent plane.
  const x = enu.x;
  const z = enu.z;
  const d = Math.hypot(x, z);
  const theta = d / GLOBE_RADIUS_M;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const dir2x = d > 1e-3 ? x / d : 0;
  const dir2z = d > 1e-3 ? z / d : 0;

  const dir = new THREE.Vector3()
    .copy(GLOBE_TOP_DIR_WORLD)
    .multiplyScalar(cosT)
    .addScaledVector(EAST_AXIS, sinT * dir2x) // east
    .addScaledVector(NORTH_AXIS, sinT * dir2z) // north
    .normalize();

  // Render trails on/near the ground surface for readability in Tower view.
  // Truth altitude remains available via needles/markers; this is visualization-only.
  const r = GLOBE_RADIUS_M + Math.max(2, AIRCRAFT_MARKER_LIFT_M * 0.2);
  return new THREE.Vector3().copy(GLOBE_CENTER_WORLD).addScaledVector(dir, r);
}


