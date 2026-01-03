import * as THREE from "three";
import { GLOBE_CENTER_WORLD, GLOBE_RADIUS_M, GLOBE_TOP_DIR_WORLD } from "./globe_params";

const MI_TO_M = 1609.344;

export function addDistanceRings(scene: THREE.Scene) {
  // Visual-only: render rings as a "painted" overlay on the globe surface.
  // This avoids the perception of floating flat hoops above the sphere.
  scene.add(createSurfaceRingOverlay());
}

function createSurfaceRingOverlay(): THREE.Mesh {
  // Globe center is at (0, -R, 0) so the ENU origin lies on the "top" surface at (0,0,0).
  const globeCenterWorld = GLOBE_CENTER_WORLD;
  const topDirWorld = GLOBE_TOP_DIR_WORLD;

  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS_M * 1.00002, 64, 32);

  const thetas = [
    (10 * MI_TO_M) / GLOBE_RADIUS_M,
    (25 * MI_TO_M) / GLOBE_RADIUS_M,
    (50 * MI_TO_M) / GLOBE_RADIUS_M
  ];

  // Angular half-width for ring band (radians): thickness_m / R.
  // True-scale: render as a thin painted band (still a visual aid, but not hundreds of meters thick).
  const thicknessM = 60;
  const halfWidth = (thicknessM / GLOBE_RADIUS_M) * 0.5;

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    uniforms: {
      uCenterWorld: { value: globeCenterWorld },
      uTopDirWorld: { value: topDirWorld },
      uThetas: { value: thetas },
      uHalfWidth: { value: halfWidth },
      uColor: { value: new THREE.Color(0x2dd4bf) },
      uOpacity: { value: 0.85 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 uCenterWorld;
      uniform vec3 uTopDirWorld;
      uniform float uThetas[3];
      uniform float uHalfWidth;
      uniform vec3 uColor;
      uniform float uOpacity;

      float ringBand(float angle, float theta, float halfWidth) {
        float d = abs(angle - theta);
        // Soft edge: 0 at centerline, fades out by halfWidth.
        float a = 1.0 - smoothstep(halfWidth * 0.6, halfWidth, d);
        return clamp(a, 0.0, 1.0);
      }

      void main() {
        vec3 dir = normalize(vWorldPos - uCenterWorld);
        float c = clamp(dot(dir, normalize(uTopDirWorld)), -1.0, 1.0);
        float angle = acos(c); // 0 at top point, increases outward

        float a = 0.0;
        a = max(a, ringBand(angle, uThetas[0], uHalfWidth));
        a = max(a, ringBand(angle, uThetas[1], uHalfWidth));
        a = max(a, ringBand(angle, uThetas[2], uHalfWidth));

        if (a <= 0.001) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(globeCenterWorld);
  mesh.renderOrder = 2;
  return mesh;
}


