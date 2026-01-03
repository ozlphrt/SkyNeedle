import "./style.css";
import * as THREE from "three";
import { addDebugOverlays } from "./scene/debug_overlays";
import { addDistanceRings } from "./scene/distance_rings";
import { addGlobeBackground } from "./scene/globe_background";
import { CameraController } from "./camera/camera_controller";
import { getOrbitPreset, getTowerPreset } from "./camera/presets";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MockProvider, type AircraftSample } from "./data/mock_provider";
import { AircraftMarkerLayer } from "./scene/aircraft_markers";
import { lerpAngleDeg } from "./math/angles";
import { AltitudeNeedleLayer } from "./scene/altitude_needles";
import { LabelLayer } from "./scene/labels";
import { VerticalWheel } from "./ui/vertical_wheel";
import { SearchInput } from "./ui/search_input";
import { resolveAirportQuery } from "./ui/airport_resolver";
import { addAirportStub } from "./scene/airport_stub";
import { fetchAerowayGeometry } from "./data/overpass_client";
import { OsmAirportLayer } from "./scene/osm_airport_layer";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("Missing #app root element");
}

root.innerHTML = `
  <div class="screen">
    <canvas id="three-canvas"></canvas>
    <div class="hud">
      <div class="title">SkyNeedle</div>
      <button class="hud_button tower_btn" id="tower-btn" type="button">Tower</button>
      <div class="search">
        <input class="search_input" id="search-input" placeholder="City or airport code…" />
        <div class="search_status" id="search-status"></div>
      </div>
      <div class="wheel_host" id="wheel"></div>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#three-canvas");
if (!canvas) {
  throw new Error("Missing #three-canvas element");
}
const canvasEl: HTMLCanvasElement = canvas;

// T0.2 Three.js boot: renderer + scene + camera, render empty scene.
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x05070a, 1);

const scene = new THREE.Scene();

// Phase 1 spans ~50mi radius (~80km). Use a "map view" camera so distance rings are visible.
// Place camera off-axis so the +Z (North) arrow isn't viewed perfectly end-on.
const camera = new THREE.PerspectiveCamera(60, 1, 100, 1_000_000);
// Keep camera comfortably outside the globe radius so the globe reads as a circular disk
// (if the camera is near the globe surface, the horizon cap can look like a tilted "egg").
// Place camera south of origin looking north so screen-up matches +Z (North) by default.
camera.position.set(0, 420_000, -260_000);
camera.lookAt(0, 0, 0);

addGlobeBackground(scene);
addDebugOverlays(scene);
addDistanceRings(scene);
addAirportStub(scene);
const osmAirportLayer = new OsmAirportLayer();
const airportStubObj = scene.getObjectByName("airport-stub") ?? null;
const markerLayer = new AircraftMarkerLayer(scene);
const needleLayer = new AltitudeNeedleLayer(scene, 50);
const labelLayer = new LabelLayer(scene);

// T2.2: pull slow, interpolate client-side.
const provider = new MockProvider({ count: 50, radiusMiles: 50, updateIntervalMs: 1400 });
const snapshotBuffer: { tMs: number; data: AircraftSample[] }[] = [];
let stopProvider = provider.start((data, tMs) => {
  snapshotBuffer.push({ tMs, data });
  // keep last 3
  while (snapshotBuffer.length > 3) snapshotBuffer.shift();
});

// Default camera controls protocol: OrbitControls (left-drag rotate, right-drag pan, wheel zoom).
const controls = new OrbitControls(camera, canvasEl);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = false;
controls.target.set(0, 0, 0);
controls.update();

const cameraController = new CameraController(camera, controls, new THREE.Vector3(0, 0, 0));
let isUserOrbiting = false;
controls.addEventListener("start", () => {
  isUserOrbiting = true;
});
controls.addEventListener("end", () => {
  isUserOrbiting = false;
});
const towerBtn = document.querySelector<HTMLButtonElement>("#tower-btn");
if (!towerBtn) {
  throw new Error("Missing #tower-btn element");
}
towerBtn.addEventListener("click", () => {
  // Tower view should be airport-centric. Clear selection so orbit-follow doesn't override it.
  applySelection(null);
  cameraController.setPreset(getTowerPreset());
});

const searchInputEl = document.querySelector<HTMLInputElement>("#search-input");
const searchStatusEl = document.querySelector<HTMLDivElement>("#search-status");
if (!searchInputEl || !searchStatusEl) {
  throw new Error("Missing search HUD elements");
}
const search = new SearchInput({
  input: searchInputEl,
  status: searchStatusEl,
  onSubmit: (query) => {
    const result = resolveAirportQuery(query);
    if (!result.ok) {
      search.setStatus(result.message, "error");
      return;
    }

    const a = result.airport;
    search.setStatus(`Loading OSM: ${a.iata} (${a.city})`, "active");

    // Load real OSM runway/taxiway geometry (T5.2). Fallback: stub remains if fetch fails.
    if (airportStubObj) airportStubObj.visible = true;
    fetchAerowayGeometry({ latDeg: a.latDeg, lonDeg: a.lonDeg, radiusM: 12000 })
      .then((data) => {
        osmAirportLayer.setData(scene, { latDeg: a.latDeg, lonDeg: a.lonDeg, altM: a.altM }, data);
        if (airportStubObj) airportStubObj.visible = false;
        search.setStatus(`OSM loaded: ${a.iata} (${a.city})`, "active");
      })
      .catch((err) => {
        console.warn("OSM fetch failed; using stub geometry.", err);
        osmAirportLayer.clear(scene);
        if (airportStubObj) airportStubObj.visible = true;
        search.setStatus(`OSM failed (stub): ${a.iata}`, "error");
      });

    // Baby step: treat selected airport as new ENU origin by resetting mock world.
    // Visual check: camera smoothly recenters to tower view.
    snapshotBuffer.length = 0;
    stopProvider();
    stopProvider = provider.start((data, tMs) => {
      snapshotBuffer.push({ tMs, data });
      while (snapshotBuffer.length > 3) snapshotBuffer.shift();
    });
    // Clear selection so we don't immediately switch into orbit view.
    applySelection(null);
    cameraController.setPreset(getTowerPreset());

    window.setTimeout(() => search.setStatus("", "idle"), 1600);
  }
});

const wheelHost = document.querySelector<HTMLDivElement>("#wheel");
if (!wheelHost) {
  throw new Error("Missing selection HUD elements");
}
const wheel = new VerticalWheel(wheelHost);
const wheelHostEl: HTMLDivElement = wheelHost;

// Auto-collapse wheel after inactivity.
let wheelCollapsed = false;
let lastWheelActivityMs = performance.now();
const WHEEL_IDLE_COLLAPSE_MS = 3000;

function setWheelCollapsed(next: boolean) {
  wheelCollapsed = next;
  wheelHostEl.classList.toggle("is_collapsed", wheelCollapsed);
}

function markWheelActivity() {
  lastWheelActivityMs = performance.now();
  if (wheelCollapsed) setWheelCollapsed(false);
}

wheel.onActivity(markWheelActivity);

// Clicking the collapsed icon should expand it.
wheelHostEl.addEventListener("click", () => {
  markWheelActivity();
});

let lastSamples: AircraftSample[] = [];
let selectedId: string | null = null;

function applySelection(nextId?: string | null) {
  if (typeof nextId !== "undefined") selectedId = nextId;
  if (lastSamples.length === 0) {
    selectedId = null;
  } else {
    if (!selectedId) selectedId = lastSamples[0].id;
  }

  wheel.setSelectedId(selectedId);
  markerLayer.setSelectedId(selectedId);
  labelLayer.setSelectedId(selectedId);

  if (selectedId) {
    const target = new THREE.Vector3();
    if (markerLayer.getSelectedWorldPosition(target)) {
      cameraController.setPreset(getOrbitPreset({ targetWorld: target }));
    }
  }
}

wheel.onChange((id) => {
  applySelection(id);
});

const clock = new THREE.Clock();

function resize() {
  const w = Math.max(1, canvasEl.clientWidth);
  const h = Math.max(1, canvasEl.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

resize();
window.addEventListener("resize", resize, { passive: true });

function frame() {
  // Keep renderer in sync with actual canvas CSS size (prevents stretched "egg" globe).
  // Note: renderer.domElement.{width,height} are device pixels; use getSize() (CSS pixels).
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== canvasEl.clientWidth || size.y !== canvasEl.clientHeight) {
    resize();
  }

  const dt = clock.getDelta();

  // Client-side interpolation (render slightly behind latest truth update).
  // Wheel idle collapse check (UI-only).
  if (!wheelCollapsed && performance.now() - lastWheelActivityMs > WHEEL_IDLE_COLLAPSE_MS) {
    setWheelCollapsed(true);
  }

  if (snapshotBuffer.length >= 2) {
    const nowMs = performance.now();
    const delayMs = provider.updateIntervalMs; // ~1 update behind
    const renderMs = nowMs - delayMs;

    // Use last two snapshots that bound renderMs (fallback to last two).
    let a = snapshotBuffer[snapshotBuffer.length - 2];
    let b = snapshotBuffer[snapshotBuffer.length - 1];
    if (snapshotBuffer.length === 3 && renderMs < a.tMs) {
      a = snapshotBuffer[0];
      b = snapshotBuffer[1];
    }

    const span = Math.max(1, b.tMs - a.tMs);
    const t = Math.min(1, Math.max(0, (renderMs - a.tMs) / span));

    const blended: AircraftSample[] = a.data.map((aa, i) => {
      const bb = b.data[i];
      return {
        id: aa.id,
        positionEnuM: aa.positionEnuM.clone().lerp(bb.positionEnuM, t),
        headingDeg: lerpAngleDeg(aa.headingDeg, bb.headingDeg, t)
      };
    });

    lastSamples = blended;
    markerLayer.upsertAndUpdate(blended);
    needleLayer.update(blended);
    labelLayer.update(blended);
    wheel.update(blended, performance.now());

  } else if (snapshotBuffer.length === 1) {
    lastSamples = snapshotBuffer[0].data;
    markerLayer.upsertAndUpdate(snapshotBuffer[0].data);
    needleLayer.update(snapshotBuffer[0].data);
    labelLayer.update(snapshotBuffer[0].data);
    wheel.update(snapshotBuffer[0].data, performance.now());

  }

  // Selection wiring: keep orbit target following selected aircraft as it moves (smoothly),
  // without fighting user interaction.
  if (selectedId) {
    const target = new THREE.Vector3();
    if (markerLayer.getSelectedWorldPosition(target)) {
      cameraController.setDesiredTargetWorld(target);
      if (!isUserOrbiting) {
        const t = 1 - Math.exp(-8 * Math.max(0, dt));
        controls.target.lerp(target, t);
      }
    }
  }

  // Smooth camera toward desired preset (if any) AFTER updates.
  cameraController.update(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);


