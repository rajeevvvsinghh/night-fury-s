import * as THREE from 'three';
import { CarConfig, CarDamageState } from '../types/game';

export interface CarModelInstance {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  paintMaterial: THREE.MeshStandardMaterial;
  frontWheels: THREE.Group[];
  rearWheels: THREE.Group[];
  brakeLights: THREE.Mesh;
  nitroFlames: THREE.Mesh[];
  headlights: THREE.SpotLight[];
  config: CarConfig;

  // Damage System Components
  noseMesh: THREE.Mesh;
  splitterMesh: THREE.Mesh;
  wingBladeMesh: THREE.Mesh;
  leftFender: THREE.Mesh;
  rightFender: THREE.Mesh;
  headlightMeshes: THREE.Mesh[];
  scratchDecals: THREE.Mesh[];
  smokeGroup: THREE.Group;
  sparkGroup: THREE.Group;
  damageState?: CarDamageState;
}

/**
 * Creates a procedural realistic scratch texture showing clearcoat abrasions,
 * metallic silver cuts, and dark primer undercoat exposure.
 */
function createScratchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Transparent background
  ctx.clearRect(0, 0, 512, 256);

  // 1. White / silver clearcoat scratch lines
  ctx.strokeStyle = 'rgba(238, 242, 255, 0.9)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 40; i++) {
    const x0 = 15 + Math.random() * 480;
    const y0 = 10 + Math.random() * 236;
    const length = 20 + Math.random() * 85;
    const angle = (Math.random() - 0.5) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(angle) * length, y0 + Math.sin(angle) * length);
    ctx.stroke();
  }

  // 2. Dark primer undercoat scrapes
  ctx.strokeStyle = 'rgba(18, 20, 26, 0.88)';
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 28; i++) {
    const x0 = 20 + Math.random() * 470;
    const y0 = 15 + Math.random() * 220;
    const length = 18 + Math.random() * 65;
    const angle = (Math.random() - 0.5) * 0.45;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(angle) * length, y0 + Math.sin(angle) * length);
    ctx.stroke();
  }

  // 3. Metallic bare steel gouge flecks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export class CarModelBuilder {
  private static scratchTextureInstance: THREE.CanvasTexture | null = null;

  private static getScratchTexture(): THREE.CanvasTexture {
    if (!CarModelBuilder.scratchTextureInstance) {
      CarModelBuilder.scratchTextureInstance = createScratchTexture();
    }
    return CarModelBuilder.scratchTextureInstance;
  }

  static createCar(config: CarConfig): CarModelInstance {
    const root = new THREE.Group();

    // 1. High-spec car paint material
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.primaryColor),
      metalness: 0.85,
      roughness: 0.18,
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.5,
      metalness: 0.3,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x080a10,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.85,
    });

    const neonMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.glowColor),
    });

    // 2. Car Chassis / Body
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.45; // ground clearance

    // Main lower chassis
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.45, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, paintMaterial);
    chassis.position.y = 0.25;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    bodyGroup.add(chassis);

    // Aerodynamic tapered hood / front nose
    const noseGeo = new THREE.BoxGeometry(1.85, 0.3, 1.4);
    const nose = new THREE.Mesh(noseGeo, paintMaterial);
    nose.position.set(0, 0.22, 1.8);
    nose.castShadow = true;
    bodyGroup.add(nose);

    // Front aggressive splitter
    const splitterGeo = new THREE.BoxGeometry(2.1, 0.08, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.04, 2.3);
    bodyGroup.add(splitter);

    // Cockpit cabin / greenhouse
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.48, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.65, -0.15);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    // Roof scoop / fin
    const scoopGeo = new THREE.BoxGeometry(0.35, 0.15, 0.8);
    const scoop = new THREE.Mesh(scoopGeo, carbonMaterial);
    scoop.position.set(0, 0.94, -0.3);
    bodyGroup.add(scoop);

    // Wide rear fenders & underglow
    const fenderMeshes: THREE.Mesh[] = [];
    [-1, 1].forEach((side) => {
      const fenderGeo = new THREE.BoxGeometry(0.2, 0.38, 1.6);
      const fender = new THREE.Mesh(fenderGeo, paintMaterial);
      fender.position.set(side * 1.05, 0.3, -1.1);
      bodyGroup.add(fender);
      fenderMeshes.push(fender);

      // Neon side underglow strip
      const underglowGeo = new THREE.BoxGeometry(0.04, 0.04, 2.8);
      const underglow = new THREE.Mesh(underglowGeo, neonMaterial);
      underglow.position.set(side * 0.95, -0.05, 0);
      bodyGroup.add(underglow);
    });

    // Rear GT Spoiler / Wing
    const wingStands = [-0.65, 0.65];
    wingStands.forEach((x) => {
      const standGeo = new THREE.BoxGeometry(0.06, 0.45, 0.2);
      const stand = new THREE.Mesh(standGeo, carbonMaterial);
      stand.position.set(x, 0.72, -2.1);
      bodyGroup.add(stand);
    });

    const wingBladeGeo = new THREE.BoxGeometry(2.2, 0.06, 0.45);
    const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMaterial);
    wingBlade.position.set(0, 0.94, -2.15);
    wingBlade.castShadow = true;
    bodyGroup.add(wingBlade);

    // Rear diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.8, 0.25, 0.5);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.1, -2.25);
    bodyGroup.add(diffuser);

    // Front Headlights (Projector lenses)
    const headlightMeshes: THREE.Mesh[] = [];
    const headlights: THREE.SpotLight[] = [];

    [-0.75, 0.75].forEach((x) => {
      const hlMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      hlMesh.position.set(x, 0.32, 2.35);
      bodyGroup.add(hlMesh);
      headlightMeshes.push(hlMesh);

      // Forward SpotLight beam
      const spot = new THREE.SpotLight(0xa5f3fc, 2.5, 60, Math.PI / 6, 0.3, 1.2);
      spot.position.set(x, 0.4, 2.3);
      spot.target.position.set(x * 0.5, 0, 30);
      bodyGroup.add(spot);
      bodyGroup.add(spot.target);
      headlights.push(spot);
    });

    // Rear Taillight Bar
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
    const brakeLights = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.1), taillightMat);
    brakeLights.position.set(0, 0.42, -2.28);
    bodyGroup.add(brakeLights);

    // Dual Nitro Exhaust Pipes & Plasma Flame Emitters
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });
    const nitroFlames: THREE.Mesh[] = [];

    [-0.45, 0.45].forEach((x) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), exhaustMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.16, -2.32);
      bodyGroup.add(tip);

      const flameGeo = new THREE.ConeGeometry(0.18, 1.2, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(x, 0.16, -2.8);
      flame.scale.set(0.001, 0.001, 0.001);
      bodyGroup.add(flame);
      nitroFlames.push(flame);
    });

    // 3. Visual Scratch Decals Group
    const scratchTex = CarModelBuilder.getScratchTexture();
    const scratchDecals: THREE.Mesh[] = [];

    // Decal configurations across car panels
    const decalConfigs = [
      // Front Bumper Left
      { pos: new THREE.Vector3(-0.75, 0.22, 2.36), rot: new THREE.Euler(0, 0, -0.1), size: [0.65, 0.22] },
      // Front Bumper Right
      { pos: new THREE.Vector3(0.75, 0.22, 2.36), rot: new THREE.Euler(0, 0, 0.1), size: [0.65, 0.22] },
      // Hood Center Scrape
      { pos: new THREE.Vector3(0, 0.38, 1.7), rot: new THREE.Euler(-Math.PI / 2, 0, 0.2), size: [1.1, 0.55] },
      // Left Door / Flank
      { pos: new THREE.Vector3(-1.015, 0.28, 0.1), rot: new THREE.Euler(0, -Math.PI / 2, 0), size: [1.5, 0.32] },
      // Right Door / Flank
      { pos: new THREE.Vector3(1.015, 0.28, 0.1), rot: new THREE.Euler(0, Math.PI / 2, 0), size: [1.5, 0.32] },
      // Rear Left Quarter
      { pos: new THREE.Vector3(-1.02, 0.35, -1.2), rot: new THREE.Euler(0, -Math.PI / 2, 0.05), size: [0.8, 0.28] },
      // Rear Right Quarter
      { pos: new THREE.Vector3(1.02, 0.35, -1.2), rot: new THREE.Euler(0, Math.PI / 2, -0.05), size: [0.8, 0.28] },
    ];

    decalConfigs.forEach((cfg) => {
      const dGeo = new THREE.PlaneGeometry(cfg.size[0], cfg.size[1]);
      const dMat = new THREE.MeshBasicMaterial({
        map: scratchTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const dMesh = new THREE.Mesh(dGeo, dMat);
      dMesh.position.copy(cfg.pos);
      dMesh.rotation.copy(cfg.rot);
      bodyGroup.add(dMesh);
      scratchDecals.push(dMesh);
    });

    // 4. Damage Engine Smoke Group
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(0, 0.45, 1.6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x22262b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let s = 0; s < 4; s++) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + s * 0.06, 0), smokeMat.clone());
      puff.position.set((s - 1.5) * 0.15, s * 0.18, -s * 0.2);
      smokeGroup.add(puff);
    }
    bodyGroup.add(smokeGroup);

    // 5. Electrical Spark Group
    const sparkGroup = new THREE.Group();
    sparkGroup.position.set(0.7, 0.35, 2.3);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0 });
    for (let p = 0; p < 6; p++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), sparkMat);
      spark.position.set((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
      sparkGroup.add(spark);
    }
    bodyGroup.add(sparkGroup);

    root.add(bodyGroup);

    // 6. Four Detailed Wheels
    const frontWheels: THREE.Group[] = [];
    const rearWheels: THREE.Group[] = [];

    const wheelPositions = [
      { x: -0.98, y: 0.38, z: 1.35, isFront: true },
      { x: 0.98, y: 0.38, z: 1.35, isFront: true },
      { x: -1.02, y: 0.38, z: -1.35, isFront: false },
      { x: 1.02, y: 0.38, z: -1.35, isFront: false },
    ];

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });

    wheelPositions.forEach((wp) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(wp.x, wp.y, wp.z);

      const rotatingWheel = new THREE.Group();

      // Tire rubber
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      rotatingWheel.add(tire);

      // Alloy rim
      const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.29, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rotatingWheel.add(rim);

      // 5-Spoke Star Design
      for (let s = 0; s < 5; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.04, 0.24, 0.05);
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.position.x = wp.x > 0 ? 0.14 : -0.14;
        spoke.rotation.x = (s * Math.PI * 2) / 5;
        rotatingWheel.add(spoke);
      }

      wheelAssembly.add(rotatingWheel);
      root.add(wheelAssembly);

      if (wp.isFront) {
        frontWheels.push(wheelAssembly);
      } else {
        rearWheels.push(wheelAssembly);
      }
    });

    return {
      root,
      bodyMesh: chassis,
      paintMaterial,
      frontWheels,
      rearWheels,
      brakeLights,
      nitroFlames,
      headlights,
      config,
      noseMesh: nose,
      splitterMesh: splitter,
      wingBladeMesh: wingBlade,
      leftFender: fenderMeshes[0],
      rightFender: fenderMeshes[1],
      headlightMeshes,
      scratchDecals,
      smokeGroup,
      sparkGroup,
    };
  }

  /**
   * Applies realistic visual damage (scratches, dents, broken lights, smoke/sparks)
   */
  static applyDamageVisuals(car: CarModelInstance, damage: CarDamageState) {
    car.damageState = damage;

    // 1. Clearcoat Scratch Degradation & Scratch Decals
    const scratchIntensity = Math.min(1, (damage.scratchesCount * 4 + (100 - damage.health)) / 100);
    // Paint roughness increases from 0.18 (mirror gloss) to 0.68 (abraded/scuffed)
    car.paintMaterial.roughness = 0.18 + scratchIntensity * 0.48;
    car.paintMaterial.metalness = Math.max(0.45, 0.85 - scratchIntensity * 0.25);

    // Apply visibility and opacity to scratch decals
    car.scratchDecals.forEach((decal) => {
      const mat = decal.material as THREE.MeshBasicMaterial;
      if (damage.scratchesCount > 0 || damage.health < 95) {
        mat.opacity = Math.min(0.92, 0.18 + scratchIntensity * 0.74);
      } else {
        mat.opacity = 0;
      }
    });

    // 2. Dents / Structural Deformation
    // Front Nose crumple
    const frontRatio = Math.min(1, damage.frontDamage / 100);
    car.noseMesh.position.set(0, 0.22 - frontRatio * 0.07, 1.8 - frontRatio * 0.22);
    car.noseMesh.rotation.set(-frontRatio * 0.08, ((damage.frontDamage % 7) - 3) * 0.01, 0);

    // Front Splitter crumple / dragging
    car.splitterMesh.position.set(0, 0.04 - frontRatio * 0.08, 2.3 - frontRatio * 0.2);
    car.splitterMesh.rotation.set(-frontRatio * 0.07, 0, frontRatio * 0.14);

    // Side Fenders denting
    const leftRatio = Math.min(1, damage.leftDamage / 100);
    if (car.leftFender) {
      car.leftFender.position.set(-1.05 + leftRatio * 0.1, 0.3, -1.1);
      car.leftFender.rotation.set(0, leftRatio * 0.1, leftRatio * 0.06);
    }

    const rightRatio = Math.min(1, damage.rightDamage / 100);
    if (car.rightFender) {
      car.rightFender.position.set(1.05 - rightRatio * 0.1, 0.3, -1.1);
      car.rightFender.rotation.set(0, -rightRatio * 0.1, -rightRatio * 0.06);
    }

    // Rear GT Wing damage
    const rearRatio = Math.min(1, damage.rearDamage / 100);
    car.wingBladeMesh.position.set(0, 0.94 - rearRatio * 0.14, -2.15 + rearRatio * 0.1);
    car.wingBladeMesh.rotation.set(rearRatio * 0.11, 0, -rearRatio * 0.15);

    // 3. Broken Headlights & SpotLights
    // Left headlight
    const leftHlMesh = car.headlightMeshes[0];
    const leftSpot = car.headlights[0];
    if (damage.brokenLeftHeadlight) {
      if (leftHlMesh) {
        (leftHlMesh.material as THREE.MeshBasicMaterial).color.setHex(0x1a1e23);
      }
      if (leftSpot) {
        // Intermittent electrical flicker or completely dark
        leftSpot.intensity = Math.random() < 0.06 ? 0.4 : 0;
      }
    } else {
      if (leftHlMesh) {
        (leftHlMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      }
      if (leftSpot) {
        leftSpot.intensity = 2.5;
      }
    }

    // Right headlight
    const rightHlMesh = car.headlightMeshes[1];
    const rightSpot = car.headlights[1];
    if (damage.brokenRightHeadlight) {
      if (rightHlMesh) {
        (rightHlMesh.material as THREE.MeshBasicMaterial).color.setHex(0x1a1e23);
      }
      if (rightSpot) {
        rightSpot.intensity = Math.random() < 0.06 ? 0.4 : 0;
      }
    } else {
      if (rightHlMesh) {
        (rightHlMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      }
      if (rightSpot) {
        rightSpot.intensity = 2.5;
      }
    }

    // Broken Taillight
    const brakeMat = car.brakeLights.material as THREE.MeshBasicMaterial;
    if (damage.brokenTaillight) {
      brakeMat.color.setHex(0x35080c);
    }

    // 4. Engine Smoke & Electrical Sparks on Critical Damage
    if (damage.health < 50) {
      const smokeSeverity = (50 - damage.health) / 50;
      car.smokeGroup.children.forEach((puff, idx) => {
        const pMesh = puff as THREE.Mesh;
        const pMat = pMesh.material as THREE.MeshBasicMaterial;
        pMat.opacity = 0.2 + smokeSeverity * 0.55;
        pMesh.rotation.y += 0.02 * (idx + 1);
        pMesh.scale.setScalar(0.9 + Math.sin(Date.now() * 0.005 + idx) * 0.25);
      });

      // Electrical sparks
      const sparkVisible = Math.random() < 0.35;
      car.sparkGroup.children.forEach((spk) => {
        const sMesh = spk as THREE.Mesh;
        const sMat = sMesh.material as THREE.MeshBasicMaterial;
        sMat.opacity = sparkVisible ? 0.9 : 0;
        if (sparkVisible) {
          sMesh.position.x = (Math.random() - 0.5) * 0.25;
          sMesh.position.y = (Math.random() - 0.5) * 0.2;
        }
      });
    } else {
      car.smokeGroup.children.forEach((puff) => {
        ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0;
      });
      car.sparkGroup.children.forEach((spk) => {
        ((spk as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0;
      });
    }
  }

  /**
   * Resets the car back to showroom pristine condition immediately.
   */
  static restorePristine(car: CarModelInstance) {
    // Reset paint finish
    car.paintMaterial.roughness = 0.18;
    car.paintMaterial.metalness = 0.85;

    // Reset dents
    car.noseMesh.position.set(0, 0.22, 1.8);
    car.noseMesh.rotation.set(0, 0, 0);

    car.splitterMesh.position.set(0, 0.04, 2.3);
    car.splitterMesh.rotation.set(0, 0, 0);

    if (car.leftFender) {
      car.leftFender.position.set(-1.05, 0.3, -1.1);
      car.leftFender.rotation.set(0, 0, 0);
    }
    if (car.rightFender) {
      car.rightFender.position.set(1.05, 0.3, -1.1);
      car.rightFender.rotation.set(0, 0, 0);
    }

    car.wingBladeMesh.position.set(0, 0.94, -2.15);
    car.wingBladeMesh.rotation.set(0, 0, 0);

    // Reset headlights
    car.headlightMeshes.forEach((hl) => {
      (hl.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    });
    car.headlights.forEach((sp) => {
      sp.intensity = 2.5;
    });

    // Reset taillight
    (car.brakeLights.material as THREE.MeshBasicMaterial).color.setHex(0xaa1122);

    // Hide scratch decals
    car.scratchDecals.forEach((decal) => {
      (decal.material as THREE.MeshBasicMaterial).opacity = 0;
    });

    // Hide smoke and sparks
    car.smokeGroup.children.forEach((puff) => {
      ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0;
    });
    car.sparkGroup.children.forEach((spk) => {
      ((spk as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0;
    });
  }

  static updateCarVisuals(
    car: CarModelInstance,
    speed: number, // km/h
    steeringAngle: number,
    isBraking: boolean,
    isNitro: boolean,
    delta: number,
    damage?: CarDamageState
  ) {
    // Apply damage visuals
    if (damage) {
      CarModelBuilder.applyDamageVisuals(car, damage);
    }

    // 1. Wheel rotation proportional to travel distance
    const wheelRotSpeed = (speed / 3.6 / 0.38) * delta;
    car.frontWheels.forEach((wa) => {
      // Front wheel steering yaw
      wa.rotation.y = steeringAngle;
      // Wheel rolling pitch
      const rollGroup = wa.children[0];
      if (rollGroup) rollGroup.rotation.x += wheelRotSpeed;
    });

    car.rearWheels.forEach((wa) => {
      const rollGroup = wa.children[0];
      if (rollGroup) rollGroup.rotation.x += wheelRotSpeed;
    });

    // 2. Brake lights glow intensity
    const brakeMat = car.brakeLights.material as THREE.MeshBasicMaterial;
    if (damage && damage.brokenTaillight) {
      brakeMat.color.setHex(isBraking ? 0x881122 : 0x35080c);
      car.brakeLights.scale.set(1, 1, 1);
    } else {
      if (isBraking) {
        brakeMat.color.setHex(0xff0000);
        car.brakeLights.scale.set(1.05, 1.3, 1.0);
      } else {
        brakeMat.color.setHex(0xaa1122);
        car.brakeLights.scale.set(1, 1, 1);
      }
    }

    // 3. Nitro Exhaust Flame animation
    car.nitroFlames.forEach((flame) => {
      if (isNitro) {
        const jitter = 0.85 + Math.random() * 0.35;
        flame.scale.set(jitter, jitter * 1.6, jitter);
        const flameMat = flame.material as THREE.MeshBasicMaterial;
        flameMat.color.setHex(Math.random() > 0.3 ? 0x00f0ff : 0x7c3aed);
      } else {
        flame.scale.set(0.0001, 0.0001, 0.0001);
      }
    });
  }
}
