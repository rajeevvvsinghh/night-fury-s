import * as THREE from 'three';
import { TrackSystem } from './track';
import { CityEnvironment } from './environment';
import { CarModelBuilder, CarModelInstance } from './carModel';
import { CarPhysics, ControlInputs } from './physics';
import { TrafficAndRivalsSystem } from './aiTraffic';
import { VisualEffectsSystem } from './effects';
import { RacingCamera } from './camera';
import { PostProcessingSystem } from './postprocessing';
import { sound } from './audio';
import { getCarDamage, repairCarDamage } from './damageSystem';
import {
  CarConfig,
  CarDamageState,
  CarUpgrades,
  GameMode,
  GameState,
  PlayerCarState,
  RaceResult,
  RaceSettings,
  SessionRaceStats,
} from '../types/game';

export interface GameEngineCallbacks {
  onStateUpdate: (state: PlayerCarState) => void;
  onLapComplete: (lap: number, lapTime: number) => void;
  onRaceFinish: (result: RaceResult) => void;
  onCheckpointPass: (index: number) => void;
  onCountdownTick: (val: number | null) => void;
}

export class GameEngine {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  racingCam: RacingCamera;

  // Subsystems
  track: TrackSystem;
  env: CityEnvironment;
  effects: VisualEffectsSystem;
  aiSystem: TrafficAndRivalsSystem;
  postprocessing: PostProcessingSystem;

  // Player Car
  playerModel: CarModelInstance;
  physics: CarPhysics;
  selectedCar: CarConfig;
  carUpgrades: Record<string, CarUpgrades>;

  // Game flow state
  gameState: GameState = 'menu';
  currentMode: GameMode = 'quick_race';
  settings: RaceSettings;
  callbacks: GameEngineCallbacks;

  // Race timing
  raceStartTime: number = 0;
  lapStartTime: number = 0;
  currentLap: number = 1;
  bestLapTime: number = 0;
  checkpointTimer: number = 30; // seconds for checkpoint rush
  countdownValue: number | null = null;
  countdownTimer: number | null = null;

  // Inputs
  inputs: ControlInputs = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
    nitro: false,
  };

  playerCallsign: string = 'NIGHTFURY';

  private isDisposed: boolean = false;
  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Pointer drag for garage rotation
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;

  constructor(
    container: HTMLElement,
    selectedCar: CarConfig,
    carUpgrades: Record<string, CarUpgrades>,
    settings: RaceSettings,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.selectedCar = selectedCar;
    this.carUpgrades = carUpgrades;
    this.settings = settings;
    this.callbacks = callbacks;

    // 1. Setup Three.js Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    // 2. Scene and Core Systems
    this.scene = new THREE.Scene();
    this.racingCam = new RacingCamera(62, width / height);

    this.track = new TrackSystem();
    this.env = new CityEnvironment(this.scene, this.track);
    this.env.build(this.settings.rainEffect);

    this.effects = new VisualEffectsSystem(this.scene);
    this.aiSystem = new TrafficAndRivalsSystem(this.scene, this.track);
    this.postprocessing = new PostProcessingSystem(
      this.renderer,
      this.scene,
      this.racingCam.camera,
      width,
      height
    );
    this.postprocessing.enabled = this.settings.motionBlur;

    // 3. Player Car
    const upgrades = this.carUpgrades[selectedCar.id] || { engine: 0, handling: 0, brakes: 0, nitro: 0, topSpeed: 0 };
    this.physics = new CarPhysics(this.selectedCar, upgrades, this.track);
    this.playerModel = CarModelBuilder.createCar(this.selectedCar);
    this.scene.add(this.playerModel.root);

    // Link collision callback
    this.physics.onCollision = (force: number, relativeAngle: number = 0) => {
      this.effects.emitCollisionSparks(this.playerModel.root.position, Math.round(20 * force));
      sound.playCollision(force);
      if (force > 0.4) {
        sound.playCrunchDamage(force);
      }
      this.effects.addShake(Math.min(0.8, force * 0.5));
    };

    // Apply initial damage state to car model
    const initialDamage = getCarDamage(selectedCar.id);
    CarModelBuilder.applyDamageVisuals(this.playerModel, initialDamage);

    // 4. Setup Event Listeners
    this.setupWindowEvents();
    this.setupPointerEvents();

    // 5. Start Render Loop
    this.startLoop();
  }

  private setupWindowEvents() {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private setupPointerEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      if (this.gameState === 'garage' || this.gameState === 'menu') {
        this.isPointerDown = true;
        this.lastPointerX = e.clientX;
        this.racingCam.isDraggingGarage = true;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isPointerDown && (this.gameState === 'garage' || this.gameState === 'menu')) {
        const deltaX = e.clientX - this.lastPointerX;
        this.lastPointerX = e.clientX;
        this.racingCam.garageOrbitAngle -= deltaX * 0.008;
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
      this.racingCam.isDraggingGarage = false;
    });
  }

  private onWindowResize = () => {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.racingCam.setAspect(width / height);
    this.renderer.setSize(width, height);
    if (this.postprocessing) {
      this.postprocessing.setSize(width, height);
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    sound.resume();
    const code = e.code;

    if (code === 'KeyW' || code === 'ArrowUp') this.inputs.accelerate = true;
    if (code === 'KeyS' || code === 'ArrowDown') this.inputs.brake = true;
    if (code === 'KeyA' || code === 'ArrowLeft') this.inputs.steerLeft = true;
    if (code === 'KeyD' || code === 'ArrowRight') this.inputs.steerRight = true;
    if (code === 'Space') {
      e.preventDefault();
      this.inputs.handbrake = true;
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.inputs.nitro = true;
    if (code === 'KeyC') this.racingCam.cycleView();
    if (code === 'KeyR' && (this.gameState === 'racing' || this.gameState === 'countdown')) {
      this.physics.resetToTrack(this.physics.state.lapProgress);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') this.inputs.accelerate = false;
    if (code === 'KeyS' || code === 'ArrowDown') this.inputs.brake = false;
    if (code === 'KeyA' || code === 'ArrowLeft') this.inputs.steerLeft = false;
    if (code === 'KeyD' || code === 'ArrowRight') this.inputs.steerRight = false;
    if (code === 'Space') this.inputs.handbrake = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.inputs.nitro = false;
  };

  setControl(key: keyof ControlInputs, value: boolean) {
    sound.resume();
    this.inputs[key] = value;
  }

  changeCar(car: CarConfig) {
    this.selectedCar = car;
    this.scene.remove(this.playerModel.root);
    this.playerModel = CarModelBuilder.createCar(car);
    this.scene.add(this.playerModel.root);

    const upgrades = this.carUpgrades[car.id] || { engine: 0, handling: 0, brakes: 0, nitro: 0, topSpeed: 0 };
    this.physics.config = car;
    this.physics.upgrades = upgrades;
    const damage = getCarDamage(car.id);
    this.physics.setDamage(damage);
    CarModelBuilder.applyDamageVisuals(this.playerModel, damage);
  }

  repairCurrentCar(): CarDamageState {
    const pristine = repairCarDamage(this.selectedCar.id);
    this.physics.setDamage(pristine);
    CarModelBuilder.restorePristine(this.playerModel);
    return pristine;
  }

  updatePaint(color: string, glow: string) {
    this.selectedCar.primaryColor = color;
    this.selectedCar.glowColor = glow;
    this.playerModel.paintMaterial.color.set(color);
  }

  startRace(mode: GameMode) {
    this.currentMode = mode;
    this.currentLap = 1;
    this.bestLapTime = 0;
    this.checkpointTimer = 35; // 35 seconds to reach 1st checkpoint

    // Setup AI Rivals & Traffic
    const trafficCount = this.settings.trafficDensity === 'low' ? 8 : this.settings.trafficDensity === 'high' ? 18 : 12;
    const rivalCount = mode === 'quick_race' ? this.settings.rivalCount : 0;
    this.aiSystem.init(rivalCount, trafficCount);

    // Reset player position at start line
    this.physics.resetToTrack(0);
    this.physics.state.lap = 1;
    this.physics.state.driftPoints = 0;

    // Start 3, 2, 1, GO countdown
    this.gameState = 'countdown';
    this.countdownValue = 3;
    this.callbacks.onCountdownTick(3);
    sound.playCountdown('beep');

    if (this.countdownTimer) clearInterval(this.countdownTimer);
    let count = 3;

    this.countdownTimer = window.setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownValue = count;
        this.callbacks.onCountdownTick(count);
        sound.playCountdown('beep');
      } else if (count === 0) {
        this.countdownValue = 0;
        this.callbacks.onCountdownTick(0);
        sound.playCountdown('go');
        this.gameState = 'racing';
        this.raceStartTime = performance.now();
        this.lapStartTime = performance.now();
        sound.startMusic();
      } else {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownValue = null;
        this.callbacks.onCountdownTick(null);
      }
    }, 900);
  }

  pauseRace() {
    if (this.gameState === 'racing') {
      this.gameState = 'paused';
    }
  }

  resumeRace() {
    if (this.gameState === 'paused') {
      this.gameState = 'racing';
    }
  }

  finishRace(completed: boolean) {
    this.gameState = 'finished';
    sound.updateEngine(1000, 0, false);
    sound.updateSkid(0);
    sound.setNitro(false);

    const totalTime = (performance.now() - this.raceStartTime) / 1000;
    const driftBonus = Math.floor(this.physics.state.driftPoints * 0.2);
    const placeBonus = this.physics.state.position === 1 ? 5000 : this.physics.state.position === 2 ? 3000 : 1500;
    const creditsEarned = completed ? placeBonus + driftBonus : Math.floor(driftBonus * 0.5);

    this.callbacks.onRaceFinish({
      completed,
      mode: this.currentMode,
      position: this.physics.state.position,
      totalTime,
      bestLapTime: this.bestLapTime,
      driftScore: this.physics.state.driftPoints,
      creditsEarned,
      newRecord: true,
    });
  }

  getSessionStats(completed: boolean): SessionRaceStats {
    const p = this.physics.state;
    return {
      driftDistanceMeters: Math.round(p.driftDistance),
      driftPoints: p.driftPoints,
      topSpeedKmH: Math.round(p.topSpeedReached),
      nitroUsedCount: p.nitroCount,
      checkpointsCleared: p.checkpointsPassed,
      racesFinished: completed ? 1 : 0,
      racesWon: completed && p.position === 1 ? 1 : 0,
    };
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;
      this.animFrameId = requestAnimationFrame(tick);
      const delta = Math.min(this.clock.getDelta(), 0.05);

      this.update(delta);

      const isRacingOrCountdown = this.gameState === 'racing' || this.gameState === 'countdown';
      if (this.settings.motionBlur && isRacingOrCountdown) {
        // Project vanishing point ahead of player car into screen space
        const pState = this.physics.state;
        const heading = pState.rotationY;
        const forwardDir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
        const focusWorld = this.playerModel.root.position.clone().addScaledVector(forwardDir, 28);
        focusWorld.y += 0.9;
        focusWorld.project(this.racingCam.camera);

        const screenFocus = new THREE.Vector2(
          THREE.MathUtils.clamp((focusWorld.x + 1) * 0.5, 0.2, 0.8),
          THREE.MathUtils.clamp((focusWorld.y + 1) * 0.5, 0.2, 0.8)
        );

        this.postprocessing.update(pState.speed, pState.isNitroActive, delta, screenFocus);
        this.postprocessing.render(delta, this.racingCam.camera);
      } else {
        this.renderer.render(this.scene, this.racingCam.camera);
      }
    };
    tick();
  }

  private update(delta: number) {
    const isRacing = this.gameState === 'racing';
    const isCountdown = this.gameState === 'countdown';

    // 1. Update Physics
    if (isRacing) {
      this.physics.update(this.inputs, delta);
    } else if (isCountdown) {
      // In countdown, allow revving the engine!
      this.physics.state.rpm = this.inputs.accelerate ? 6500 : 1200;
      this.physics.state.speed = 0;
    }

    // 2. Sync 3D Car Model with Physics
    const pState = this.physics.state;
    this.playerModel.root.position.set(pState.x, pState.y, pState.z);
    this.playerModel.root.rotation.set(pState.pitch, pState.rotationY, pState.roll);

    CarModelBuilder.updateCarVisuals(
      this.playerModel,
      pState.speed,
      pState.steeringAngle,
      pState.isBraking,
      pState.isNitroActive,
      delta,
      pState.damage
    );

    // 3. Update Audio
    if (isRacing || isCountdown) {
      sound.updateEngine(pState.rpm, Math.abs(pState.speed) / this.physics.effectiveStats.topSpeed, this.inputs.accelerate);
      sound.updateSkid(pState.isDrifting ? Math.abs(pState.driftAngle) * 2.5 : 0);
      sound.setNitro(pState.isNitroActive);
    }

    // 4. Update Visual Effects (Tire Smoke, Warp lines, Rain)
    if (pState.isDrifting && Math.abs(pState.speed) > 35) {
      const heading = pState.rotationY;
      const right = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
      const rearLeft = this.playerModel.root.position.clone().addScaledVector(right, -1.0);
      const rearRight = this.playerModel.root.position.clone().addScaledVector(right, 1.0);
      this.effects.emitDriftSmoke(rearLeft, 1);
      this.effects.emitDriftSmoke(rearRight, 1);
    }

    const forwardDir = new THREE.Vector3(Math.sin(pState.rotationY), 0, Math.cos(pState.rotationY));
    this.effects.update(delta, this.playerModel.root.position, forwardDir, pState.speed, pState.isNitroActive);
    this.env.update(delta, this.playerModel.root.position, pState, this.playerCallsign);

    // 5. Update AI Rivals and Ambient Traffic
    this.aiSystem.update(delta, isRacing);

    // Leaderboard Position Calculation
    if (isRacing && this.currentMode === 'quick_race') {
      const leaderboard = this.aiSystem.getLeaderboard(pState.distanceTraveled);
      const playerEntry = leaderboard.find((r) => !r.isAI);
      if (playerEntry) {
        pState.position = playerEntry.position;
      }
    }

    // 6. Collision Checking with AI and Traffic
    if (isRacing) {
      const col = this.aiSystem.checkCollisionsWithPlayer(this.playerModel.root.position);
      if (col.collided) {
        this.physics.state.speed *= 0.85;
        this.effects.emitCollisionSparks(this.playerModel.root.position, 22);
        sound.playCollision(col.force);
        sound.playCrunchDamage(col.force);
        this.physics.applyImpact(col.force, 0);
      }
    }

    // 7. Checkpoint & Lap Detection
    if (isRacing) {
      this.handleRaceProgress(delta);
    }

    // 8. Update Camera
    if (isRacing || isCountdown || this.gameState === 'paused') {
      this.racingCam.updateRaceCamera(pState, this.effects.shakeOffset, delta);
    } else if (this.gameState === 'garage') {
      // Place player car at origin showroom
      this.playerModel.root.position.set(0, 0, 0);
      this.playerModel.root.rotation.set(0, 0, 0);
      this.racingCam.updateGarageCamera(delta, true);
    } else if (this.gameState === 'menu') {
      this.playerModel.root.position.set(0, 0, 0);
      this.playerModel.root.rotation.set(0, 0, 0);
      this.racingCam.updateGarageCamera(delta, true);
    }

    // Notify React state
    this.callbacks.onStateUpdate({ ...pState });
  }

  private handleRaceProgress(delta: number) {
    const p = this.physics.state;
    const checkpoints = this.track.checkpoints;
    const nextCpIdx = (p.checkpointIndex + 1) % checkpoints.length;
    const nextCp = checkpoints[nextCpIdx];

    const distToCp = this.playerModel.root.position.distanceTo(nextCp.position);

    if (distToCp < nextCp.width) {
      // Passed Checkpoint!
      p.checkpointIndex = nextCpIdx;
      p.checkpointsPassed++;
      sound.playCheckpointChime();
      this.callbacks.onCheckpointPass(nextCpIdx);

      // Checkpoint mode: add bonus time!
      if (this.currentMode === 'checkpoint_race') {
        this.checkpointTimer = Math.min(45, this.checkpointTimer + 8);
      }

      // Check Lap Crossing (passed checkpoint 0 after high index)
      if (nextCpIdx === 0) {
        const lapTime = (performance.now() - this.lapStartTime) / 1000;
        this.lapStartTime = performance.now();

        if (this.bestLapTime === 0 || lapTime < this.bestLapTime) {
          this.bestLapTime = lapTime;
        }

        this.callbacks.onLapComplete(this.currentLap, lapTime);

        if (this.currentLap >= this.settings.totalLaps) {
          this.finishRace(true);
          return;
        } else {
          this.currentLap++;
          p.lap = this.currentLap;
        }
      }
    }

    // Checkpoint mode timer countdown
    if (this.currentMode === 'checkpoint_race') {
      this.checkpointTimer -= delta;
      if (this.checkpointTimer <= 0) {
        this.finishRace(false);
      }
    }
  }

  updateSettings(newSettings: Partial<RaceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.postprocessing && newSettings.motionBlur !== undefined) {
      this.postprocessing.enabled = newSettings.motionBlur;
    }
  }

  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animFrameId);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    sound.stopMusic();
    sound.updateEngine(1000, 0, false);
    sound.updateSkid(0);
    sound.setNitro(false);

    if (this.postprocessing) {
      this.postprocessing.dispose();
    }

    if (this.env) {
      this.env.dispose();
    }

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
