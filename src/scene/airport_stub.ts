import * as THREE from "three";

export function addAirportStub(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = "airport-stub";
  // Slight lift above tangent plane to avoid z-fighting with other overlays.
  group.position.y = 8;
  // Ensure airport geometry renders above markers/needles for this stub phase.
  group.renderOrder = 90;

  // Runway (simple rectangle), centered at ENU origin.
  const runway = createRunway({
    // Exaggerated for visibility at current tower/map camera distances.
    lengthM: 20_000,
    widthM: 900,
    headingDeg: 44,
    color: 0x14b8a6 // muted teal (avoid neon)
  });
  group.add(runway);

  // Runway centerline stripe (high contrast).
  const centerline = createRunway({
    lengthM: 19_200,
    widthM: 120,
    headingDeg: 44,
    color: 0xc7d2fe // soft off-white (never pure white)
  });
  (centerline.material as THREE.MeshBasicMaterial).opacity = 0.14;
  group.add(centerline);

  // Taxiway strips (simple rectangles), offset from runway.
  const taxiA = createRunway({
    lengthM: 6000,
    widthM: 420,
    headingDeg: 44,
    color: 0x34d399 // muted green
  });
  taxiA.position.x += 220;
  taxiA.position.z -= 140;
  taxiA.material = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  taxiA.renderOrder = 90;
  group.add(taxiA);

  const taxiB = createRunway({
    lengthM: 4500,
    widthM: 360,
    headingDeg: 134,
    color: 0x34d399
  });
  taxiB.position.x -= 260;
  taxiB.position.z += 180;
  (taxiB.material as THREE.MeshBasicMaterial).opacity = 0.22;
  (taxiB.material as THREE.MeshBasicMaterial).depthTest = false;
  taxiB.renderOrder = 90;
  group.add(taxiB);

  scene.add(group);
}

function createRunway(params: {
  lengthM: number;
  widthM: number;
  headingDeg: number; // degrees clockwise from North (+Z)
  color: number;
}): THREE.Mesh {
  const { lengthM, widthM, headingDeg, color } = params;

  const geom = new THREE.PlaneGeometry(widthM, lengthM);
  // PlaneGeometry is XY; rotate to XZ (ground plane).
  geom.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -4;
  mat.polygonOffsetUnits = -4;

  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 90;

  // Heading is clockwise from North (+Z). Rotate around +Y.
  mesh.rotation.y = (headingDeg * Math.PI) / 180;

  return mesh;
}


