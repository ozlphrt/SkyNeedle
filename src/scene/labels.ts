import * as THREE from "three";
import type { AircraftSample } from "../data/mock_provider";
import { AIRCRAFT_MARKER_LIFT_M, GLOBE_CENTER_WORLD, GLOBE_RADIUS_M, GLOBE_TOP_DIR_WORLD } from "./globe_params";

const M_TO_FT = 3.280839895;
const MI_TO_M = 1609.344;

type LabelState = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  opacity: number;
};

export class LabelLayer {
  private readonly group = new THREE.Group();
  private readonly byId = new Map<string, LabelState>();
  private selectedId: string | null = null;

  // Radius-based visibility (ENU horizontal distance).
  // Show within 25mi, fade out over next 10mi, hidden beyond 35mi.
  private readonly showR = 25 * MI_TO_M;
  private readonly hideR = 35 * MI_TO_M;

  constructor(scene: THREE.Scene) {
    this.group.name = "aircraft-labels";
    this.group.renderOrder = 60;
    scene.add(this.group);
  }

  setSelectedId(id: string | null) {
    this.selectedId = id;
  }

  update(samples: AircraftSample[]) {
    for (const a of samples) {
      let st = this.byId.get(a.id);
      if (!st) {
        st = this.createLabel(a);
        this.byId.set(a.id, st);
        this.group.add(st.sprite);
      }

      // Position: follow aircraft marker (rendered on globe surface); offset slightly along local radial.
      // Rendering-only: derive surface normal from ENU horizontal direction (same as marker projection).
      const radial = enuHorizontalToSurfaceNormal(a.positionEnuM.x, a.positionEnuM.z);
      const r = GLOBE_RADIUS_M + a.positionEnuM.y + AIRCRAFT_MARKER_LIFT_M;
      st.sprite.position.copy(GLOBE_CENTER_WORLD).addScaledVector(radial, r + 2200);

      // Target opacity from ENU horizontal radius.
      const d = Math.hypot(a.positionEnuM.x, a.positionEnuM.z);
      const target = this.selectedId === a.id ? 1 : this.opacityForRadius(d);

      // Smooth fade (no popping).
      st.opacity = dampScalar(st.opacity, target, 10.0, 1 / 60);
      st.material.opacity = st.opacity;

      // Text update (cheap: regenerate only if changed enough).
      const altFt = Math.round(a.positionEnuM.y * M_TO_FT);
      const text = `${a.id}\n${altFt}ft`;
      if ((st.sprite.userData as any).text !== text) {
        (st.sprite.userData as any).text = text;
        this.updateLabelTexture(st, text);
      }
    }
  }

  private opacityForRadius(d: number): number {
    if (d <= this.showR) return 1;
    if (d >= this.hideR) return 0;
    const t = (d - this.showR) / (this.hideR - this.showR);
    return 1 - t;
  }

  private createLabel(a: AircraftSample): LabelState {
    const material = new THREE.SpriteMaterial({
      map: new THREE.Texture(), // replaced immediately
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0
    });

    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 60;
    sprite.userData = { aircraftId: a.id, text: "" };

    const st: LabelState = { sprite, material, opacity: 0 };
    this.updateLabelTexture(st, `${a.id}`);

    return st;
  }

  private updateLabelTexture(st: LabelState, text: string) {
    const { canvas, scale } = renderLabelCanvas(text);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    st.material.map?.dispose();
    st.material.map = tex;
    st.material.needsUpdate = true;
    st.sprite.scale.copy(scale);
  }
}

function enuHorizontalToSurfaceNormal(xEast: number, zNorth: number): THREE.Vector3 {
  const d = Math.hypot(xEast, zNorth);
  const theta = d / GLOBE_RADIUS_M;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const n = GLOBE_TOP_DIR_WORLD;
  const u = new THREE.Vector3(1, 0, 0); // east
  const v = new THREE.Vector3(0, 0, 1); // north

  const dir2x = d > 1e-3 ? xEast / d : 0;
  const dir2z = d > 1e-3 ? zNorth / d : 0;

  return new THREE.Vector3()
    .copy(n)
    .multiplyScalar(cosT)
    .addScaledVector(u, sinT * dir2x)
    .addScaledVector(v, sinT * dir2z)
    .normalize();
}

function renderLabelCanvas(text: string): { canvas: HTMLCanvasElement; scale: THREE.Vector3 } {
  const fontTop = "bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  const fontBottom = "bold 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  const padX = 14;
  const padY = 8;

  const lines = text.split("\n");
  const line1 = lines[0] ?? "";
  const line2 = lines[1] ?? "";

  // Measure both lines and size background to the widest line.
  const m1 = measureText(fontTop, line1);
  const m2 = measureText(fontBottom, line2);
  const contentW = Math.max(m1.width, m2.width);
  const w = Math.ceil(contentW + padX * 2);

  const lineH1 = 28;
  const lineH2 = 24;
  const gap = 3;
  const contentH = lineH1 + (line2 ? gap + lineH2 : 0);
  const h = Math.ceil(contentH + padY * 2);

  const canvas = document.createElement("canvas");
  canvas.width = nextPow2(w);
  canvas.height = nextPow2(h);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for label canvas");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background pill.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, w - 2, h - 2, 14);
  ctx.stroke();

  // Text.
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  ctx.font = fontTop;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const cx = w / 2;
  const y1 = padY + lineH1 / 2;
  ctx.fillText(line1, cx, y1);

  if (line2) {
    ctx.font = fontBottom;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    const y2 = padY + lineH1 + gap + lineH2 / 2;
    ctx.fillText(line2, cx, y2);
  }

  // World scale: tuned for map view.
  const scale = new THREE.Vector3(w * 120, h * 120, 1);
  return { canvas, scale };
}

function measureText(font: string, text: string): { width: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: text.length * 16 };
  ctx.font = font;
  return { width: ctx.measureText(text).width };
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function dampScalar(current: number, target: number, lambda: number, dt: number): number {
  const t = 1 - Math.exp(-lambda * Math.max(0, dt));
  return current + (target - current) * t;
}


