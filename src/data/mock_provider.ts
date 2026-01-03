import * as THREE from "three";

export type AircraftSnapshot = {
  id: string;
  positionEnuM: THREE.Vector3; // ENU world space: X=East, Y=Up, Z=North
  headingDeg: number; // degrees clockwise from North (+Z), rotate about +Y
};

const MI_TO_M = 1609.344;

export type AircraftSample = {
  id: string;
  positionEnuM: THREE.Vector3;
  headingDeg: number;
};

export class MockProvider {
  readonly updateIntervalMs: number;
  private timer: number | null = null;
  private readonly seed: AircraftSeed[];

  constructor(params?: { count?: number; radiusMiles?: number; updateIntervalMs?: number }) {
    const count = params?.count ?? 50;
    const radiusM = (params?.radiusMiles ?? 50) * MI_TO_M;
    this.updateIntervalMs = params?.updateIntervalMs ?? 1200;
    this.seed = buildSeeds(count, radiusM);
  }

  start(onUpdate: (samples: AircraftSample[], tMs: number) => void): () => void {
    const startMs = performance.now();

    const emit = () => {
      const nowMs = performance.now();
      const tSec = (nowMs - startMs) / 1000;
      onUpdate(sampleAt(this.seed, tSec), nowMs);
    };

    emit();
    this.timer = window.setInterval(emit, this.updateIntervalMs);

    return () => {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
    };
  }
}

function hash01(n: number): number {
  // Cheap deterministic hash -> [0,1)
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type AircraftSeed = {
  id: string;
  p0: THREE.Vector3; // ENU meters
  v: THREE.Vector3; // ENU meters/sec (Y=0)
  altM: number; // ENU up component (meters)
};

function buildSeeds(count: number, radiusM: number): AircraftSeed[] {
  const out: AircraftSeed[] = [];
  for (let i = 0; i < count; i++) {
    const id = `MOCK-${String(i).padStart(3, "0")}`;

    // Deterministic pseudo-random per index.
    const u1 = hash01(i * 5 + 1);
    const u2 = hash01(i * 5 + 2);
    const u3 = hash01(i * 5 + 3);
    const u4 = hash01(i * 5 + 4);

    // Uniform in disk: r = sqrt(u) * R, theta = 2πv
    const r = Math.sqrt(u1) * radiusM;
    const theta = 2 * Math.PI * u2;
    const xEast = r * Math.cos(theta);
    const zNorth = r * Math.sin(theta);

    // Speed 120..260 m/s (~233..505 knots), direction random.
    const speed = 120 + 140 * u3;
    const dir = 2 * Math.PI * u4;
    const vEast = speed * Math.cos(dir);
    const vNorth = speed * Math.sin(dir);

    // Altitude 1500..12000m.
    const altM = 1500 + 10500 * hash01(i * 5 + 5);

    out.push({
      id,
      p0: new THREE.Vector3(xEast, 0, zNorth),
      v: new THREE.Vector3(vEast, 0, vNorth),
      altM
    });
  }
  return out;
}

function headingDegFromVelocity(vEast: number, vNorth: number): number {
  // Heading is degrees clockwise from North (+Z).
  // atan2(East, North) maps:
  // - (0,+) => 0°
  // - (+,0) => 90°
  const rad = Math.atan2(vEast, vNorth);
  const deg = (rad * 180) / Math.PI;
  return (deg + 360) % 360;
}

function sampleAt(seed: AircraftSeed[], tSec: number): AircraftSample[] {
  // Keep aircraft within radius by gently wrapping position in a torus-like way (visual-only).
  // For now: linear motion; no jitter; heading derived from velocity.
  return seed.map((s) => {
    const pos = s.p0.clone().addScaledVector(s.v, tSec);
    pos.y = s.altM;
    return {
      id: s.id,
      positionEnuM: pos,
      headingDeg: headingDegFromVelocity(s.v.x, s.v.z)
    };
  });
}

// Back-compat helper (used by older call sites).
export function getMockAircraftSnapshot(params?: {
  count?: number;
  radiusMiles?: number;
}): AircraftSnapshot[] {
  const provider = new MockProvider({ count: params?.count, radiusMiles: params?.radiusMiles });
  // Snapshot at t=0.
  return sampleAt((provider as any).seed as AircraftSeed[], 0) as AircraftSnapshot[];
}


