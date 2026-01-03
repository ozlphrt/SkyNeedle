import "./style.css";
import * as THREE from "three";
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
import { OpenSkyProvider } from "./data/opensky_provider";
import { JFK_ORIGIN_LLA } from "./world/origin_airports";
import { AIRPORTS, type Airport } from "./data/airports";
import { AircraftTrailLayer } from "./scene/aircraft_trails";
import { AIRCRAFT_MARKER_LIFT_M, GLOBE_CENTER_WORLD, GLOBE_RADIUS_M, GLOBE_TOP_DIR_WORLD } from "./scene/globe_params";

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
      <div class="data_status" id="data-status"></div>
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
// True-scale Earth implies very large depth ranges; use logarithmic depth to keep precision stable.
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x05070a, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

// Default view: Tower preset (airport-centric), 10,000ft altitude.
const camera = new THREE.PerspectiveCamera(60, 1, 10, 20_000_000);
{
  const preset = getTowerPreset();
  camera.position.copy(preset.positionWorld);
  camera.lookAt(preset.targetWorld);
  camera.fov = preset.fovDeg;
  camera.updateProjectionMatrix();
}

addGlobeBackground(scene);
addDistanceRings(scene);
const airportStubObj = addAirportStub(scene);
const osmAirportLayer = new OsmAirportLayer();
const markerLayer = new AircraftMarkerLayer(scene);
const needleLayer = new AltitudeNeedleLayer(scene, 50);
const labelLayer = new LabelLayer(scene);
const trailLayer = new AircraftTrailLayer(scene, { minutes: 5, sampleEveryMs: 500 });

// Data source buffer (by-id so OpenSky can be interpolated safely).
type Snapshot = { tMs: number; byId: Map<string, AircraftSample>; ids: string[] };
const snapshotBuffer: Snapshot[] = [];

const mock = new MockProvider({ count: 50, radiusMiles: 50, updateIntervalMs: 1400 });
let stopData: (() => void) | null = null;

// T6.1: OpenSkyProvider (bbox around active airport)
let activeOrigin = { ...JFK_ORIGIN_LLA };
const openSky = new OpenSkyProvider({ origin: activeOrigin, updateIntervalMs: 15_000, bboxRadiusM: 90_000 });
let usingOpenSky = false;

function pushSnapshot(samples: AircraftSample[], tMs: number) {
  const byId = new Map<string, AircraftSample>();
  const ids: string[] = [];
  for (const s of samples) {
    byId.set(s.id, s);
    ids.push(s.id);
  }
  snapshotBuffer.push({ tMs, byId, ids });
  while (snapshotBuffer.length > 3) snapshotBuffer.shift();
}

function startMock() {
  stopData?.();
  snapshotBuffer.length = 0;
  usingOpenSky = false;
  dataStatusEl.textContent = "Data: Mock";
  dataStatusEl.dataset.state = "active";
  stopData = mock.start((data, tMs) => pushSnapshot(data, tMs));
}

async function tryEnableOpenSky() {
  dataStatusEl.textContent = "Data: OpenSky (connecting…)";
  dataStatusEl.dataset.state = "active";
  try {
    const first = await openSky.fetchOnce();
    stopData?.();
    snapshotBuffer.length = 0;
    usingOpenSky = true;
    pushSnapshot(first, performance.now());
    dataStatusEl.textContent = `Data: OpenSky (n=${first.length})`;
    stopData = openSky.start((data, tMs) => {
      pushSnapshot(data, tMs);
      dataStatusEl.textContent = `Data: OpenSky (n=${data.length})`;
    });
  } catch {
    dataStatusEl.textContent = "Data: OpenSky failed (using Mock)";
    dataStatusEl.dataset.state = "error";
    startMock();
  }
}

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
// Element exists in HUD markup above; treat as required.
const dataStatusEl = document.querySelector<HTMLDivElement>("#data-status")!;
if (!searchInputEl || !searchStatusEl) {
  throw new Error("Missing search HUD elements");
}

// Start mock immediately, then attempt OpenSky.
startMock();
void tryEnableOpenSky();

function selectAirport(a: Airport) {
  search.setStatus(`Loading OSM: ${a.iata} (${a.city})`, "active");
  activeOrigin = { latDeg: a.latDeg, lonDeg: a.lonDeg, altM: a.altM };
  openSky.setOrigin(activeOrigin);

  // Load real OSM runway/taxiway geometry (T5.2). Fallback: stub remains if fetch fails.
  airportStubObj.visible = true;
  osmAirportLayer.clear(scene);
  fetchAerowayGeometry({
    latDeg: a.latDeg,
    lonDeg: a.lonDeg,
    // Smaller queries are less likely to hit Overpass timeouts.
    radiusM: 15000,
    cacheKey: a.icao
  })
    .then((data) => {
      osmAirportLayer.setData(scene, { latDeg: a.latDeg, lonDeg: a.lonDeg, altM: a.altM }, data);
      airportStubObj.visible = false;

      let runways = 0;
      let taxiways = 0;
      for (const el of data.elements) {
        if ((el as any).type !== "way") continue;
        const tags = (el as any).tags as Record<string, string> | undefined;
        if (!tags) continue;
        if (tags["aeroway"] === "runway") runways++;
        if (tags["aeroway"] === "taxiway") taxiways++;
      }

      search.setStatus(`OSM loaded: ${a.iata} (runways=${runways} taxiways=${taxiways})`, "active");
    })
    .catch((err) => {
      console.warn("OSM fetch failed; using stub geometry.", err);
      osmAirportLayer.clear(scene);
      airportStubObj.visible = true;
      search.setStatus(`OSM failed (stub): ${a.iata}`, "error");
    });

  // Data source: restart around new origin (OpenSky bbox). Falls back to Mock on failure.
  void tryEnableOpenSky();
  // NOTE: selection + camera preset are applied after wheel is initialized (see below).
  // Reset trails on airport change (different origin/bbox).
  trailLayer.reset();

  window.setTimeout(() => search.setStatus("", "idle"), 1600);
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

    selectAirport(result.airport);

    // Clear selection so we don't immediately switch into orbit view.
    applySelection(null);
    cameraController.setPreset(getTowerPreset());
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
const blendedBuffer: AircraftSample[] = [];
const tmpTargetWorld = new THREE.Vector3();

function ensureBlendedBuffer(n: number) {
  while (blendedBuffer.length < n) {
    blendedBuffer.push({
      id: "",
      callsign: "",
      positionEnuM: new THREE.Vector3(),
      headingDeg: 0
    });
  }
}

function applySelection(nextId?: string | null) {
  const wasExplicit = typeof nextId !== "undefined";
  if (wasExplicit) selectedId = nextId ?? null;
  if (lastSamples.length === 0) selectedId = null;

  wheel.setSelectedId(selectedId);
  markerLayer.setSelectedId(selectedId);
  labelLayer.setSelectedId(selectedId);
  // Trails: keep recording for all aircraft, but only render the selected trail to avoid clutter.
  trailLayer.setVisibleIds(selectedId ? [selectedId] : []);

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

// Startup default: JFK (load OSM + set OpenSky bbox) so the initial view is unambiguous.
// This runs after wheel/selection wiring is ready (so applySelection() is safe).
const startupJfk = AIRPORTS.find((a) => a.iata === "JFK");
if (startupJfk) {
  selectAirport(startupJfk);
  applySelection(null);
  cameraController.setPreset(getTowerPreset());
}

const clock = new THREE.Clock();
const EAST_AXIS = new THREE.Vector3(1, 0, 0);
const NORTH_AXIS = new THREE.Vector3(0, 0, 1);
const tmpWorldFromEnu = new THREE.Vector3();
const tmpNdc = new THREE.Vector3();
const tmpDirFromEnu = new THREE.Vector3();

function enuToGlobeWorldPositionInto(enu: THREE.Vector3, out: THREE.Vector3) {
  const x = enu.x;
  const z = enu.z;
  const d = Math.hypot(x, z);
  const theta = d / GLOBE_RADIUS_M;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const dir2x = d > 1e-3 ? x / d : 0;
  const dir2z = d > 1e-3 ? z / d : 0;

  tmpDirFromEnu
    .copy(GLOBE_TOP_DIR_WORLD)
    .multiplyScalar(cosT)
    .addScaledVector(EAST_AXIS, sinT * dir2x)
    .addScaledVector(NORTH_AXIS, sinT * dir2z)
    .normalize();

  const r = GLOBE_RADIUS_M + enu.y + AIRCRAFT_MARKER_LIFT_M;
  out.copy(GLOBE_CENTER_WORLD).addScaledVector(tmpDirFromEnu, r);
}

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
    const delayMs = (usingOpenSky ? openSky.updateIntervalMs : mock.updateIntervalMs); // ~1 update behind
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

    const ids = b.ids;
    const n = ids.length;
    ensureBlendedBuffer(n);
    blendedBuffer.length = n;
    for (let i = 0; i < n; i++) {
      const id = ids[i];
      const bb = b.byId.get(id);
      if (!bb) continue;
      const aa = a.byId.get(id);
      const out = blendedBuffer[i];
      out.id = id;
      out.callsign = bb.callsign;
      if (aa) {
        out.positionEnuM.copy(aa.positionEnuM).lerp(bb.positionEnuM, t);
        out.headingDeg = lerpAngleDeg(aa.headingDeg, bb.headingDeg, t);
      } else {
        out.positionEnuM.copy(bb.positionEnuM);
        out.headingDeg = bb.headingDeg;
      }
    }

    lastSamples = blendedBuffer;
    markerLayer.upsertAndUpdate(lastSamples);
    needleLayer.update(lastSamples);
    labelLayer.update(lastSamples);
    trailLayer.update(lastSamples, performance.now());
    wheel.update(lastSamples, performance.now());

  } else if (snapshotBuffer.length === 1) {
    const s = snapshotBuffer[0];
    const n = s.ids.length;
    ensureBlendedBuffer(n);
    blendedBuffer.length = n;
    for (let i = 0; i < n; i++) {
      const id = s.ids[i];
      const ss = s.byId.get(id);
      if (!ss) continue;
      const out = blendedBuffer[i];
      out.id = id;
      out.callsign = ss.callsign;
      out.positionEnuM.copy(ss.positionEnuM);
      out.headingDeg = ss.headingDeg;
    }

    lastSamples = blendedBuffer;
    markerLayer.upsertAndUpdate(lastSamples);
    needleLayer.update(lastSamples);
    labelLayer.update(lastSamples);
    trailLayer.update(lastSamples, performance.now());
    wheel.update(lastSamples, performance.now());

  }

  // Selection wiring: keep orbit target following selected aircraft as it moves (smoothly),
  // without fighting user interaction.
  if (selectedId) {
    if (markerLayer.getSelectedWorldPosition(tmpTargetWorld)) {
      cameraController.setDesiredTargetWorld(tmpTargetWorld);
      if (!isUserOrbiting) {
        const t = 1 - Math.exp(-8 * Math.max(0, dt));
        controls.target.lerp(tmpTargetWorld, t);
      }
    }
  } else {
    // No selection: show a trail for an aircraft that's actually in view (discoverability),
    // fallback to nearest-to-origin if none are in the current frustum.
    let bestVisibleId: string | null = null;
    let bestVisibleScore = Infinity;
    for (const a of lastSamples) {
      enuToGlobeWorldPositionInto(a.positionEnuM, tmpWorldFromEnu);
      tmpNdc.copy(tmpWorldFromEnu).project(camera);
      const inFront = tmpNdc.z >= 0 && tmpNdc.z <= 1;
      const inFrame = Math.abs(tmpNdc.x) <= 1 && Math.abs(tmpNdc.y) <= 1;
      if (!inFront || !inFrame) continue;
      const score = tmpNdc.x * tmpNdc.x + tmpNdc.y * tmpNdc.y; // closer to center
      if (score < bestVisibleScore) {
        bestVisibleScore = score;
        bestVisibleId = a.id;
      }
    }

    if (!bestVisibleId) {
      let bestId: string | null = null;
      let bestD = Infinity;
      for (const a of lastSamples) {
        const d = a.positionEnuM.x * a.positionEnuM.x + a.positionEnuM.z * a.positionEnuM.z;
        if (d < bestD) {
          bestD = d;
          bestId = a.id;
        }
      }
      bestVisibleId = bestId;
    }

    trailLayer.setVisibleIds(bestVisibleId ? [bestVisibleId] : []);
  }

  // Smooth camera toward desired preset (if any) AFTER updates.
  cameraController.update(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);


