import * as THREE from 'three';
import { TrackSystem } from './track';
import { INITIAL_CARS } from '../data/cars';
import { CarModelBuilder, CarModelInstance } from './carModel';
import { RacerInfo } from '../types/game';

export interface AIRacer {
  id: string;
  name: string;
  carModel: CarModelInstance;
  progressU: number;      // 0 to 1 along track
  lateralOffset: number;  // meters from track center line
  targetOffset: number;
  speed: number;          // km/h
  baseSpeed: number;      // max km/h
  lap: number;
  totalDistance: number;
  position: number;
  bestLapTime: number;
  position3D: THREE.Vector3;
  rotationY: number;
}

export interface TrafficVehicle {
  id: string;
  mesh: THREE.Group;
  progressU: number;
  lateralOffset: number;
  speed: number;
  color: number;
  position3D: THREE.Vector3;
  type: 'taxi' | 'sedan' | 'suv';
}

export class TrafficAndRivalsSystem {
  scene: THREE.Scene;
  track: TrackSystem;
  rivals: AIRacer[] = [];
  traffic: TrafficVehicle[] = [];

  constructor(scene: THREE.Scene, track: TrackSystem) {
    this.scene = scene;
    this.track = track;
  }

  init(rivalCount: number = 3, trafficCount: number = 14) {
    this.clear();
    this.buildRivals(rivalCount);
    this.buildTraffic(trafficCount);
  }

  clear() {
    this.rivals.forEach((r) => this.scene.remove(r.carModel.root));
    this.traffic.forEach((t) => this.scene.remove(t.mesh));
    this.rivals = [];
    this.traffic = [];
  }

  private buildRivals(count: number) {
    const rivalConfigs = [
      {
        id: 'rival_1',
        name: 'Vipera Redline',
        carConfig: INITIAL_CARS[1], // Vipera Phantom
        offset: -4,
        startProgress: 0.015,
        speed: 250,
      },
      {
        id: 'rival_2',
        name: 'Neon Specter',
        carConfig: INITIAL_CARS[2], // Apex Kinetix
        offset: 4,
        startProgress: 0.025,
        speed: 260,
      },
      {
        id: 'rival_3',
        name: 'Cyber Tsunami',
        carConfig: INITIAL_CARS[3], // Tsunami Zero
        offset: -1,
        startProgress: 0.035,
        speed: 245,
      },
    ];

    for (let i = 0; i < Math.min(count, rivalConfigs.length); i++) {
      const cfg = rivalConfigs[i];
      const model = CarModelBuilder.createCar(cfg.carConfig);
      this.scene.add(model.root);

      const pt = this.track.getPointAt(cfg.startProgress);
      const tangent = this.track.getTangentAt(cfg.startProgress);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, cfg.offset);

      const heading = Math.atan2(tangent.x, tangent.z);
      model.root.position.copy(pos);
      model.root.rotation.y = heading;

      this.rivals.push({
        id: cfg.id,
        name: cfg.name,
        carModel: model,
        progressU: cfg.startProgress,
        lateralOffset: cfg.offset,
        targetOffset: cfg.offset,
        speed: cfg.speed * 0.8,
        baseSpeed: cfg.speed,
        lap: 1,
        totalDistance: cfg.startProgress * this.track.totalLength,
        position: i + 2, // player starts 1st or grid-based
        bestLapTime: 0,
        position3D: pos,
        rotationY: heading,
      });
    }
  }

  private createTrafficMesh(type: 'taxi' | 'sedan' | 'suv', color: number): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });

    const height = type === 'suv' ? 1.6 : 1.35;
    const length = type === 'suv' ? 4.2 : 4.0;
    const width = 1.9;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.5, length), bodyMat);
    body.position.y = height * 0.35;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, height * 0.45, length * 0.55), glassMat);
    cabin.position.set(0, height * 0.7, -0.2);
    group.add(cabin);

    // Taxi roof sign
    if (type === 'taxi') {
      const signMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.3), signMat);
      sign.position.set(0, height * 0.98, -0.2);
      group.add(sign);
    }

    // Wheels
    const wheelPositions = [
      { x: -width * 0.5, z: length * 0.3 },
      { x: width * 0.5, z: length * 0.3 },
      { x: -width * 0.5, z: -length * 0.3 },
      { x: width * 0.5, z: -length * 0.3 },
    ];
    wheelPositions.forEach((wp) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wp.x, 0.35, wp.z);
      group.add(wheel);
    });

    // Headlights
    [-0.65, 0.65].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), lightMat);
      hl.position.set(x, height * 0.35, length * 0.5);
      group.add(hl);
    });

    // Taillights
    [-0.65, 0.65].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), tailMat);
      tl.position.set(x, height * 0.35, -length * 0.5);
      group.add(tl);
    });

    return group;
  }

  private buildTraffic(count: number) {
    const types: ('taxi' | 'sedan' | 'suv')[] = ['taxi', 'sedan', 'suv'];
    const colors = [0xfacc15, 0xe2e8f0, 0x1e3a8a, 0x475569, 0x991b1b, 0x065f46];
    const lanes = [-7.5, -2.5, 2.5, 7.5]; // 4 distinct road lanes

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const color = type === 'taxi' ? 0xfacc15 : colors[i % colors.length];
      const mesh = this.createTrafficMesh(type, color);

      const progressU = ((i + 0.5) / count) % 1.0;
      const lane = lanes[i % lanes.length];
      const speed = 55 + Math.random() * 30; // 55 - 85 km/h

      const pt = this.track.getPointAt(progressU);
      const tangent = this.track.getTangentAt(progressU);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, lane);
      const heading = Math.atan2(tangent.x, tangent.z);

      mesh.position.copy(pos);
      mesh.rotation.y = heading;
      this.scene.add(mesh);

      this.traffic.push({
        id: `traffic_${i}`,
        mesh,
        progressU,
        lateralOffset: lane,
        speed,
        color,
        position3D: pos,
        type,
      });
    }
  }

  update(delta: number, isRacing: boolean) {
    if (!isRacing) return;

    // 1. Update AI Rivals
    this.rivals.forEach((rival, idx) => {
      // Dynamic AI overtaking & cruising logic
      const speedMs = rival.speed / 3.6;
      const deltaU = (speedMs * delta) / this.track.totalLength;
      const prevU = rival.progressU;
      rival.progressU = (rival.progressU + deltaU) % 1.0;

      // Check lap completion
      if (rival.progressU < prevU && deltaU > 0) {
        rival.lap++;
      }
      rival.totalDistance += speedMs * delta;

      // Smooth lane swerving / passing
      if (Math.random() < 0.01) {
        const lanes = [-5, -1, 1, 5];
        rival.targetOffset = lanes[Math.floor(Math.random() * lanes.length)];
      }
      rival.lateralOffset = THREE.MathUtils.lerp(rival.lateralOffset, rival.targetOffset, 1.5 * delta);

      const pt = this.track.getPointAt(rival.progressU);
      const tangent = this.track.getTangentAt(rival.progressU);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, rival.lateralOffset);
      const heading = Math.atan2(tangent.x, tangent.z);

      rival.carModel.root.position.copy(pos);
      rival.carModel.root.rotation.y = heading;
      rival.position3D.copy(pos);
      rival.rotationY = heading;

      // Visual updates (wheels, exhaust)
      CarModelBuilder.updateCarVisuals(
        rival.carModel,
        rival.speed,
        0,
        false,
        idx === 0 && Math.random() > 0.85, // occasional AI rival nitro
        delta
      );
    });

    // 2. Update Ambient Traffic
    this.traffic.forEach((veh) => {
      const speedMs = veh.speed / 3.6;
      const deltaU = (speedMs * delta) / this.track.totalLength;
      veh.progressU = (veh.progressU + deltaU) % 1.0;

      const pt = this.track.getPointAt(veh.progressU);
      const tangent = this.track.getTangentAt(veh.progressU);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, veh.lateralOffset);
      const heading = Math.atan2(tangent.x, tangent.z);

      veh.mesh.position.copy(pos);
      veh.mesh.rotation.y = heading;
      veh.position3D.copy(pos);
    });
  }

  // Calculate race leaderboard positions among player and all rivals
  getLeaderboard(playerTotalDistance: number): RacerInfo[] {
    const list: RacerInfo[] = [
      {
        id: 'player',
        name: 'PLAYER (YOU)',
        carName: 'Player Car',
        color: '#00f0ff',
        lap: 1,
        lapProgress: 0,
        totalDistance: playerTotalDistance,
        position: 1,
        bestLapTime: 0,
        isAI: false,
      },
      ...this.rivals.map((r) => ({
        id: r.id,
        name: r.name,
        carName: r.carModel.config.name,
        color: r.carModel.config.glowColor,
        lap: r.lap,
        lapProgress: r.progressU,
        totalDistance: r.totalDistance,
        position: 1,
        bestLapTime: r.bestLapTime,
        isAI: true,
      })),
    ];

    // Sort descending by total distance traveled
    list.sort((a, b) => b.totalDistance - a.totalDistance);

    list.forEach((entry, idx) => {
      entry.position = idx + 1;
    });

    return list;
  }

  // Check collision between player car and rivals or traffic
  checkCollisionsWithPlayer(playerPos: THREE.Vector3): { collided: boolean; hitVehicle: string; force: number } {
    const hitRadius = 2.4;

    // Check rivals
    for (const r of this.rivals) {
      const dist = playerPos.distanceTo(r.position3D);
      if (dist < hitRadius) {
        return { collided: true, hitVehicle: r.name, force: 1.0 - dist / hitRadius };
      }
    }

    // Check traffic
    for (const t of this.traffic) {
      const dist = playerPos.distanceTo(t.position3D);
      if (dist < hitRadius) {
        return { collided: true, hitVehicle: `Traffic ${t.type.toUpperCase()}`, force: 1.0 - dist / hitRadius };
      }
    }

    return { collided: false, hitVehicle: '', force: 0 };
  }
}
