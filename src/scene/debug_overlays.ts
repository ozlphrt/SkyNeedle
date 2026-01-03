import * as THREE from "three";

export function addDebugOverlays(scene: THREE.Scene) {
  // Axis gizmo at ENU origin (X=East, Y=Up, Z=North)
  scene.add(new THREE.AxesHelper(20_000));

  // North arrow on ground plane (points toward +Z).
  const arrow = createNorthArrow({ length: 30_000 });
  scene.add(arrow);
}

function createNorthArrow(params: { length: number }): THREE.Group {
  const { length } = params;

  const group = new THREE.Group();
  group.position.set(0, 0.01, 0); // slight lift to avoid z-fighting later

  // Match AxesHelper +Z color (blue) to reduce ambiguity.
  // Note: distance rings are rendered with depthTest disabled, so ensure the arrow
  // also renders "on top" and after them to remain visible.
  const material = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });

  // Use a big filled arrow polygon (more visible at "map view" scale than cylinders/cones).
  const arrowBody = createNorthArrowBody({ length }, material);
  arrowBody.renderOrder = 20;

  const labelN = createBillboardTextSprite("N");

  // Place label at tip of arrow.
  const tipZ = length;
  labelN.position.set(0, Math.max(1200, length * 0.05), tipZ + 2500);
  labelN.scale.setScalar(Math.max(7000, length * 0.35));
  labelN.renderOrder = 21;

  group.add(arrowBody, labelN);
  return group;
}

function createNorthArrowBody(
  params: { length: number },
  material: THREE.Material
): THREE.Mesh {
  const { length } = params;

  // Shape is defined in local XY where +Y is "forward". We'll rotate into XZ.
  const tailLen = length * 0.68;

  const tailHalfW = Math.max(1500, length * 0.06);
  const headHalfW = tailHalfW * 1.9;

  const shape = new THREE.Shape();
  shape.moveTo(-tailHalfW, 0);
  shape.lineTo(tailHalfW, 0);
  shape.lineTo(tailHalfW, tailLen);
  shape.lineTo(headHalfW, tailLen);
  shape.lineTo(0, length);
  shape.lineTo(-headHalfW, tailLen);
  shape.lineTo(-tailHalfW, tailLen);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  // XY -> XZ (ground plane).
  // We want: local +Y ("forward") -> world +Z (North).
  geometry.rotateX(Math.PI / 2);

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function createBillboardTextSprite(text: string): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context for debug label");
  }

  ctx.clearRect(0, 0, size, size);

  // Readable on dark backgrounds.
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "bold 72px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.8, 0.8, 1);
  return sprite;
}


