import * as THREE from 'three';
import { CarConfig, CarUpgrades, ControlInputs, PlayerCarState, CarDamageState } from '../types/game';
import { TrackSystem } from './track';
import { getCarDamage, applyCollisionDamage, saveCarDamage } from './damageSystem';

export type { ControlInputs };

export class CarPhysics {
  state: PlayerCarState;
  config: CarConfig;
  upgrades: CarUpgrades;
  track: TrackSystem;

  // Physical parameters
  maxSteerAngle: number = 0.55; // radians
  heading: number = 0;          // yaw angle in radians
  velocity: THREE.Vector3 = new THREE.Vector3();
  angularVelocity: number = 0;
  private wasNitroActive: boolean = false;

  // Collision callback for effects & sound
  onCollision?: (force: number, relativeAngle?: number) => void;

  constructor(config: CarConfig, upgrades: CarUpgrades, track: TrackSystem) {
    this.config = config;
    this.upgrades = upgrades;
    this.track = track;

    // Place player at start/finish line facing forward along track tangent
    const startPt = track.sampledPoints[0];
    const startTangent = track.sampledTangents[0];
    const initialHeading = Math.atan2(startTangent.x, startTangent.z);

    this.heading = initialHeading;

    this.state = {
      x: startPt.x,
      y: startPt.y,
      z: startPt.z,
      rotationY: initialHeading,
      pitch: 0,
      roll: 0,
      speed: 0,
      speedMs: 0,
      rpm: 1000,
      gear: 1,
      steeringAngle: 0,
      isDrifting: false,
      driftAngle: 0,
      driftPoints: 0,
      nitroRemaining: 100,
      isNitroActive: false,
      isBraking: false,
      isAccelerating: false,
      isReversing: false,
      lap: 1,
      lapProgress: 0,
      checkpointIndex: 0,
      distanceTraveled: 0,
      position: 1,
      driftDistance: 0,
      nitroCount: 0,
      topSpeedReached: 0,
      checkpointsPassed: 0,
      damage: getCarDamage(this.config.id),
    };
  }

  // Calculate stats including installed upgrades
  get effectiveStats() {
    const u = this.upgrades;
    const base = this.config.baseStats;
    return {
      topSpeed: base.topSpeed + u.topSpeed * 8 + u.engine * 6,
      acceleration: base.acceleration + u.engine * 5 + u.nitro * 3,
      handling: base.handling + u.handling * 6,
      driftControl: base.driftControl + u.handling * 5,
      nitroPower: base.nitroPower + u.nitro * 6,
      brakes: base.brakes + u.brakes * 6,
    };
  }

  update(inputs: ControlInputs, delta: number) {
    const stats = this.effectiveStats;
    const dt = Math.min(delta, 0.05);

    // 1. Nitro Handling
    let nitroBoost = 1.0;
    let effectiveTopSpeed = stats.topSpeed;

    if (inputs.nitro && this.state.nitroRemaining > 0 && this.state.speed > 25) {
      if (!this.wasNitroActive) {
        this.state.nitroCount++;
        this.wasNitroActive = true;
      }
      this.state.isNitroActive = true;
      this.state.nitroRemaining = Math.max(0, this.state.nitroRemaining - 26 * dt);
      nitroBoost = 1.0 + (stats.nitroPower / 100) * 0.75;
      effectiveTopSpeed += 50 + (stats.nitroPower / 100) * 25;
    } else {
      this.wasNitroActive = false;
      this.state.isNitroActive = false;
      // Passive slow nitro regen at high speed
      if (this.state.speed > 80 && this.state.nitroRemaining < 100) {
        this.state.nitroRemaining = Math.min(100, this.state.nitroRemaining + 3.5 * dt);
      }
    }

    // 2. Acceleration and Braking
    const accelPower = (stats.acceleration / 100) * 16.5 * nitroBoost;
    const brakePower = (stats.brakes / 100) * 26;
    const dragCoeff = 0.00085;
    const rollingResistance = 1.8;

    this.state.isAccelerating = inputs.accelerate;
    this.state.isBraking = inputs.brake;

    if (inputs.accelerate) {
      if (this.state.speed < 0) {
        // Braking while in reverse
        this.state.speed += brakePower * 3.6 * dt;
      } else {
        const speedRatio = Math.min(1, this.state.speed / effectiveTopSpeed);
        const torqueMultiplier = 1.0 - Math.pow(speedRatio, 1.8) * 0.75;
        this.state.speed += accelPower * torqueMultiplier * 3.6 * dt;
        if (this.state.speed > effectiveTopSpeed) {
          this.state.speed = effectiveTopSpeed;
        }
      }
    } else if (inputs.brake) {
      if (this.state.speed > 2) {
        this.state.speed -= brakePower * 3.6 * dt;
      } else {
        // Reverse gear
        this.state.isReversing = true;
        this.state.speed = Math.max(-45, this.state.speed - 12 * 3.6 * dt);
      }
    } else {
      // Coasting deceleration
      this.state.isReversing = false;
      if (Math.abs(this.state.speed) > 0.5) {
        const sign = Math.sign(this.state.speed);
        this.state.speed -= sign * (rollingResistance + Math.pow(this.state.speed, 2) * dragCoeff) * 3.6 * dt;
        if (Math.sign(this.state.speed) !== sign) this.state.speed = 0;
      } else {
        this.state.speed = 0;
      }
    }

    this.state.speedMs = this.state.speed / 3.6;

    // 3. Simulated Transmission & RPM
    this.calculateRPMAndGear(effectiveTopSpeed);

    // 4. Steering and Drift Dynamics
    const steerDir = (inputs.steerLeft ? 1 : 0) - (inputs.steerRight ? 1 : 0);
    const targetSteer = steerDir * this.maxSteerAngle;
    const steerSpeed = (stats.handling / 100) * 4.5;
    this.state.steeringAngle = THREE.MathUtils.lerp(this.state.steeringAngle, targetSteer, steerSpeed * dt);

    // Drifting logic
    const isHardTurning = Math.abs(this.state.steeringAngle) > 0.28 && this.state.speed > 60;
    if ((inputs.handbrake || isHardTurning) && Math.abs(steerDir) > 0 && this.state.speed > 40) {
      this.state.isDrifting = true;
      const driftTarget = -Math.sign(this.state.steeringAngle) * (0.35 + (1 - stats.driftControl / 120) * 0.25);
      this.state.driftAngle = THREE.MathUtils.lerp(this.state.driftAngle, driftTarget, 4 * dt);
      // Award drift score & recharge nitro!
      const pointsGain = Math.floor(this.state.speed * Math.abs(this.state.driftAngle) * dt * 25);
      this.state.driftPoints += pointsGain;
      this.state.driftDistance += Math.abs(this.state.speedMs) * dt;
      this.state.nitroRemaining = Math.min(100, this.state.nitroRemaining + 8 * dt);
    } else {
      this.state.isDrifting = false;
      this.state.driftAngle = THREE.MathUtils.lerp(this.state.driftAngle, 0, 6 * dt);
    }

    if (this.state.speed > this.state.topSpeedReached) {
      this.state.topSpeedReached = Math.round(this.state.speed);
    }

    // Turn rate based on speed
    if (Math.abs(this.state.speed) > 1) {
      const speedSteerDampening = 1.0 - Math.min(0.45, (this.state.speed / stats.topSpeed) * 0.45);
      const turnMultiplier = this.state.isDrifting ? 1.45 : 1.0;
      const yawDelta = this.state.steeringAngle * speedSteerDampening * (this.state.speedMs / 4.5) * turnMultiplier * dt;
      this.heading += (this.state.speed < 0 ? -yawDelta : yawDelta);
    }

    // 5. Update Position with Drift Velocity
    const totalHeading = this.heading + this.state.driftAngle;
    const forwardX = Math.sin(totalHeading);
    const forwardZ = Math.cos(totalHeading);

    this.state.x += forwardX * this.state.speedMs * dt;
    this.state.z += forwardZ * this.state.speedMs * dt;
    this.state.distanceTraveled += Math.abs(this.state.speedMs) * dt;

    this.state.rotationY = this.heading + this.state.driftAngle * 0.85;

    // 6. Suspension Pitch & Roll
    const accelPitch = (inputs.accelerate ? -0.035 : inputs.brake ? 0.045 : 0);
    this.state.pitch = THREE.MathUtils.lerp(this.state.pitch, accelPitch, 6 * dt);

    const cornerRoll = (this.state.steeringAngle * this.state.speedMs * 0.0035);
    this.state.roll = THREE.MathUtils.lerp(this.state.roll, cornerRoll, 6 * dt);

    // 7. Track Boundary Collision Check
    this.handleTrackBoundaries(dt);

    // 8. Progress and Lap Update
    const trackInfo = this.track.getTrackProgress(this.state.x, this.state.z);
    this.state.y = trackInfo.closestPoint.y;
    this.state.lapProgress = trackInfo.progress;
  }

  private calculateRPMAndGear(topSpeed: number) {
    const speed = Math.abs(this.state.speed);
    const gearMaxSpeeds = [
      topSpeed * 0.2, // 1st
      topSpeed * 0.38,// 2nd
      topSpeed * 0.58,// 3rd
      topSpeed * 0.75,// 4th
      topSpeed * 0.90,// 5th
      topSpeed * 1.15,// 6th
    ];

    if (this.state.isReversing) {
      this.state.gear = -1;
      this.state.rpm = 1500 + (speed / 45) * 4500;
      return;
    }

    let currentGear = 1;
    for (let g = 0; g < gearMaxSpeeds.length; g++) {
      if (speed <= gearMaxSpeeds[g] || g === gearMaxSpeeds.length - 1) {
        currentGear = g + 1;
        const prevGearMax = g === 0 ? 0 : gearMaxSpeeds[g - 1];
        const gearRatio = (speed - prevGearMax) / (gearMaxSpeeds[g] - prevGearMax);
        this.state.rpm = 1800 + Math.max(0, Math.min(1, gearRatio)) * 6200;
        break;
      }
    }
    this.state.gear = currentGear;
  }

  private handleTrackBoundaries(dt: number) {
    const trackInfo = this.track.getTrackProgress(this.state.x, this.state.z);
    const halfWidth = 12.5; // Half of road width

    if (Math.abs(trackInfo.lateralOffset) > halfWidth) {
      // Hit guardrail / curb!
      const penetration = Math.abs(trackInfo.lateralOffset) - halfWidth;
      const pushDir = -Math.sign(trackInfo.lateralOffset);
      const normal = new THREE.Vector3(-trackInfo.tangent.z, 0, trackInfo.tangent.x).normalize();

      // Push car back inside
      this.state.x += normal.x * pushDir * penetration * 1.5;
      this.state.z += normal.z * pushDir * penetration * 1.5;

      // Bounce and velocity reduction
      if (this.state.speed > 25) {
        this.state.speed *= 0.75;
        this.heading += pushDir * 0.15;
        const force = Math.min(1.5, penetration * 0.8 + (Math.abs(this.state.speed) / 130) * 0.5);
        const hitAngle = pushDir < 0 ? Math.PI / 2 : -Math.PI / 2;
        this.applyImpact(force, hitAngle);
      }
    }
  }

  applyImpact(force: number, relativeAngle: number = 0) {
    this.state.damage = applyCollisionDamage(this.state.damage, force, relativeAngle);
    saveCarDamage(this.config.id, this.state.damage);
    if (this.onCollision) {
      this.onCollision(force, relativeAngle);
    }
  }

  setDamage(damage: CarDamageState) {
    this.state.damage = damage;
    saveCarDamage(this.config.id, damage);
  }

  resetToTrack(u: number = 0) {
    const pt = this.track.getPointAt(u);
    const tangent = this.track.getTangentAt(u);
    const heading = Math.atan2(tangent.x, tangent.z);

    this.state.x = pt.x;
    this.state.y = pt.y;
    this.state.z = pt.z;
    this.heading = heading;
    this.state.rotationY = heading;
    this.state.speed = 0;
    this.state.speedMs = 0;
    this.state.driftAngle = 0;
    this.state.isDrifting = false;
    this.state.nitroRemaining = 100;
    this.state.driftDistance = 0;
    this.state.nitroCount = 0;
    this.state.topSpeedReached = 0;
    this.state.checkpointsPassed = 0;
    this.wasNitroActive = false;
  }
}
