import * as THREE from "three";
import { GLOBE_RADIUS_M } from "./globe_params";

export function addGlobeBackground(scene: THREE.Scene) {
  const globeRoot = createGlobeRoot();
  globeRoot.renderOrder = -10;
  scene.add(globeRoot);

  // Minimal early lighting (no shadows; avoid shimmer).
  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  ambient.renderOrder = -9;
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0xffffff, 0.55);
  moon.position.set(1, 2, 1);
  moon.renderOrder = -9;
  scene.add(moon);
}

function createGlobeRoot(): THREE.Group {
  // Globe is visual-only background. Size picked to sit behind the 50mi (~80km) rings.
  const radiusM = GLOBE_RADIUS_M;
  const geometry = new THREE.SphereGeometry(radiusM, 64, 32);

  const map = createProceduralEarthTexture(768, 384);

  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color(0x05070a),
    emissiveIntensity: 0.18
  });

  const globeMesh = new THREE.Mesh(geometry, material);
  globeMesh.renderOrder = -10;

  const clouds = createCloudLayer(geometry);
  clouds.renderOrder = -9;

  const root = new THREE.Group();
  root.add(globeMesh, clouds);

  // Visual-only globe: keep centered, no geospatial registration.
  // NOTE: ENU (+Z North) is defined by the world overlays (arrow/axes), not by the globe texture.
  // Place globe so the ENU origin (airport tangent plane at Y=0) lies on the globe surface:
  // center at (0, -R, 0) => top of sphere touches origin.
  root.position.set(0, -radiusM, 0);
  root.rotation.set(0, 0, 0);

  return root;
}

function createProceduralEarthTexture(w: number, h: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context for globe texture");

  // Base: dark ocean with a slight latitude gradient (helps it read as "Earth").
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0.0, "#02060b");
  oceanGrad.addColorStop(0.5, "#041018");
  oceanGrad.addColorStop(1.0, "#02060b");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Intentionally no lat/long grid overlay: it implies a navigational "north" that can
  // conflict with our ENU truth frame. Globe is a visual-only backdrop.

  // Procedural landmasses: bias toward low-frequency blobs so it reads as continents.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Deterministic hash-noise (cheap; no deps).
  const noise2 = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };

  for (let y = 0; y < h; y++) {
    const v = y / h; // 0..1
    const lat = (v - 0.5) * Math.PI; // -pi/2..pi/2
    const latFade = Math.cos(lat) ** 0.65; // reduce land near poles a bit
    for (let x = 0; x < w; x++) {
      const u = x / w;

      // Multi-octave noise with stronger low-frequency component (continent blobs).
      let n = 0;
      n += noise2(u * 1.5, v * 1.5) * 0.58;
      n += noise2(u * 3.2, v * 3.2) * 0.27;
      n += noise2(u * 7.0, v * 7.0) * 0.15;

      // Wrap continuity near dateline (avoid harsh seam).
      const edge = Math.min(u, 1 - u);
      if (edge < 0.06) {
        const u2 = (u + 0.5) % 1;
        const n2 =
          noise2(u2 * 1.5, v * 1.5) * 0.58 +
          noise2(u2 * 3.2, v * 3.2) * 0.27 +
          noise2(u2 * 7.0, v * 7.0) * 0.15;
        const t = edge / 0.06;
        n = n2 * (1 - t) + n * t;
      }

      const land = n * latFade > 0.53;
      if (!land) continue;

      const i = (y * w + x) * 4;
      // Latitude-based land tint (greens near equator, browner toward subtropics).
      const equator = 1 - Math.abs(lat) / (Math.PI / 2); // 0..1
      const green = 10 + Math.round(28 * equator);
      const red = 10 + Math.round(18 * (1 - equator * 0.7));
      const blue = 10 + Math.round(10 * equator * 0.6);
      d[i + 0] = Math.min(255, d[i + 0] + red);
      d[i + 1] = Math.min(255, d[i + 1] + green);
      d[i + 2] = Math.min(255, d[i + 2] + blue);
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createCloudLayer(sharedGeometry: THREE.BufferGeometry): THREE.Mesh {
  const cloudsTex = createProceduralCloudTexture(512, 256);
  const material = new THREE.MeshBasicMaterial({
    map: cloudsTex,
    transparent: true,
    opacity: 0.14,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(sharedGeometry, material);
  // Slightly above globe surface to avoid z-fighting.
  mesh.scale.setScalar(1.002);
  return mesh;
}

function createProceduralCloudTexture(w: number, h: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context for cloud texture");

  const img = ctx.createImageData(w, h);
  const d = img.data;

  const noise2 = (x: number, y: number) => {
    const n = Math.sin(x * 91.345 + y * 47.789) * 15731.743;
    return n - Math.floor(n);
  };

  for (let y = 0; y < h; y++) {
    const v = y / h;
    const lat = (v - 0.5) * Math.PI;
    const band = Math.cos(lat) ** 1.2;

    for (let x = 0; x < w; x++) {
      const u = x / w;

      let n = 0;
      n += noise2(u * 1.2, v * 1.2) * 0.6;
      n += noise2(u * 3.5, v * 3.5) * 0.25;
      n += noise2(u * 9.0, v * 9.0) * 0.15;

      const a = Math.max(0, (n * band - 0.68) / 0.32);
      if (a <= 0) continue;

      const i = (y * w + x) * 4;
      d[i + 0] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = Math.round(255 * a);
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}


