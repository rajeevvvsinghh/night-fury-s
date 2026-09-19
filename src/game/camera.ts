import * as THREE from 'three';
import { CameraView, PlayerCarState } from '../types/game';

export class RacingCamera {
  camera: THREE.PerspectiveCamera;
  currentView: CameraView = 'chase_close';

  private currentPos: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();
  private baseFov: number = 62;

  // Garage showcase mode orbit params
  garageOrbitAngle: number = 0;
  garageDistance: number = 7.5;
  garageHeight: number = 2.2;
  isDraggingGarage: boolean = false;

  constructor(fov: number = 62, aspect: number = 16 / 9) {
    this.baseFov = fov;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.2, 1200);
    this.camera.position.set(0, 4, -8);
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  cycleView(): CameraView {
    const views: CameraView[] = ['chase_close', 'chase_far', 'hood'];
    const nextIdx = (views.indexOf(this.currentView) + 1) % views.length;
    this.currentView = views[nextIdx];
    return this.currentView;
  }

  updateRaceCamera(
    carState: PlayerCarState,
    shakeOffset: THREE.Vector3,
    delta: number
  ) {
    const dt = Math.min(delta, 0.05);
    const speedRatio = Math.min(1.2, Math.abs(carState.speed) / 280);

    // Dynamic FOV for speed sensation & nitro punch
    const targetFov = this.baseFov + (carState.isNitroActive ? 14 : speedRatio * 8);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 5 * dt);
    this.camera.updateProjectionMatrix();

    // Car forward and side vectors
    const heading = carState.rotationY;
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));

    const carPos = new THREE.Vector3(carState.x, carState.y + 0.5, carState.z);

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.currentView === 'chase_close') {
      const followDist = 6.2 + speedRatio * 1.5 + (carState.isNitroActive ? 1.0 : 0);
      const camHeight = 2.4 - speedRatio * 0.2;
      const driftCamOffset = -carState.driftAngle * 1.8;

      targetCamPos = carPos.clone()
        .addScaledVector(forward, -followDist)
        .addScaledVector(right, driftCamOffset);
      targetCamPos.y = carPos.y + camHeight;

      // Look slightly ahead of car
      targetLookAt = carPos.clone().addScaledVector(forward, 12);
      targetLookAt.y = carPos.y + 1.2;
    } else if (this.currentView === 'chase_far') {
      const followDist = 8.5 + speedRatio * 2.0;
      const camHeight = 3.6;

      targetCamPos = carPos.clone().addScaledVector(forward, -followDist);
      targetCamPos.y = carPos.y + camHeight;

      targetLookAt = carPos.clone().addScaledVector(forward, 16);
      targetLookAt.y = carPos.y + 1.4;
    } else {
      // Hood / Bumper View
      targetCamPos = carPos.clone().addScaledVector(forward, 1.2);
      targetCamPos.y = carPos.y + 1.0;

      targetLookAt = carPos.clone().addScaledVector(forward, 35);
      targetLookAt.y = carPos.y + 1.0;
    }

    // Smooth spring interpolation
    const followLag = this.currentView === 'hood' ? 24 : 9.0;
    this.currentPos.lerp(targetCamPos, followLag * dt);
    this.currentLookAt.lerp(targetLookAt, 12 * dt);

    // Apply camera shake
    this.camera.position.copy(this.currentPos).add(shakeOffset);
    this.camera.lookAt(this.currentLookAt.clone().add(shakeOffset.clone().multiplyScalar(0.4)));

    // Subtle Dutch roll camera tilt during high-speed drifts
    const targetRoll = -carState.driftAngle * 0.12 - (carState.roll * 0.3);
    this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, targetRoll, 6 * dt);
  }

  updateGarageCamera(delta: number, autoRotate: boolean = true) {
    if (autoRotate && !this.isDraggingGarage) {
      this.garageOrbitAngle += delta * 0.35;
    }

    const x = Math.sin(this.garageOrbitAngle) * this.garageDistance;
    const z = Math.cos(this.garageOrbitAngle) * this.garageDistance;

    this.camera.position.set(x, this.garageHeight, z);
    this.camera.lookAt(0, 0.8, 0);
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
  }
}
