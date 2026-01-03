import * as THREE from "three";
import { dampVec3 } from "./damp";
import type { CameraPreset } from "./presets";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;

  // World-space (ENU) state.
  private readonly desiredTarget = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();
  private desiredFovDeg: number;

  // Damping factors (higher = snappier, still smooth).
  private readonly posLambda = 6.0;
  private readonly targetLambda = 7.5;
  private readonly fovLambda = 7.0;

  private isTransitionActive = false;
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpTarget = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    initialTargetWorld: THREE.Vector3
  ) {
    this.camera = camera;
    this.controls = controls;
    this.controls.target.copy(initialTargetWorld);
    this.desiredTarget.copy(initialTargetWorld);
    this.desiredPosition.copy(camera.position);
    this.desiredFovDeg = camera.fov;

    // If the user starts interacting, stop any preset transition immediately.
    this.controls.addEventListener("start", () => {
      this.isTransitionActive = false;
    });
  }

  setPreset(preset: CameraPreset) {
    this.desiredPosition.copy(preset.positionWorld);
    this.desiredTarget.copy(preset.targetWorld);
    this.desiredFovDeg = preset.fovDeg;
    this.isTransitionActive = true;
  }

  setDesiredTargetWorld(targetWorld: THREE.Vector3) {
    this.desiredTarget.copy(targetWorld);
  }

  update(dtSeconds: number) {
    // Space / matrix trace:
    // vec_view = view(camera.position, controls.target) * vec_world
    if (this.isTransitionActive) {
      this.tmpPos.copy(this.camera.position);
      this.tmpTarget.copy(this.controls.target);

      this.camera.position.copy(
        dampVec3(this.tmpPos, this.desiredPosition, this.posLambda, dtSeconds)
      );
      this.controls.target.copy(
        dampVec3(this.tmpTarget, this.desiredTarget, this.targetLambda, dtSeconds)
      );

      const fovT = 1 - Math.exp(-this.fovLambda * Math.max(0, dtSeconds));
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.desiredFovDeg, fovT);
      this.camera.updateProjectionMatrix();

      // Stop transitioning when we're close enough.
      const posErr = this.camera.position.distanceTo(this.desiredPosition);
      const targetErr = this.controls.target.distanceTo(this.desiredTarget);
      const fovErr = Math.abs(this.camera.fov - this.desiredFovDeg);
      if (posErr < 1 && targetErr < 1 && fovErr < 0.01) {
        this.isTransitionActive = false;
      }
    }

    this.controls.update();
  }
}


