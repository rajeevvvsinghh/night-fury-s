import * as THREE from 'three';
import { TrackSystem } from './track';
import { PlayerCarState } from '../types/game';
import { sound } from './audio';

export type RacingZone = 'Neon Downtown' | 'Underground Racing Arena';

interface BillboardConfig {
  id: string;
  zone: RacingZone;
  position: THREE.Vector3;
  rotationY: number;
  width: number;
  height: number;
  elevation: number;
  title: string;
  subtitle: string;
  primaryColor: string;
}

export class InteractiveBillboard {
  mesh: THREE.Mesh;
  spotlight: THREE.SpotLight;
  config: BillboardConfig;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private lastDrawTime: number = 0;
  private animPhase: number = Math.random() * 10;
  private currentMode: 'ambient' | 'proximity' | 'speed' | 'drift' | 'leader' | 'damage' = 'ambient';

  constructor(scene: THREE.Scene, config: BillboardConfig) {
    this.config = config;

    // 1. Offscreen dynamic LED Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // 2. Billboard Screen Mesh & Glowing Frame
    const geo = new THREE.PlaneGeometry(config.width, config.height);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(config.position);
    this.mesh.position.y += config.elevation;
    this.mesh.rotation.y = config.rotationY;

    // Structural Backing & Neon Bezel Frame
    const frameGeo = new THREE.BoxGeometry(config.width + 0.8, config.height + 0.8, 0.6);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.9,
      roughness: 0.3,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.z = -0.32;
    this.mesh.add(frameMesh);

    // Neon Frame Bezel
    const bezelGeo = new THREE.BoxGeometry(config.width + 0.4, config.height + 0.4, 0.2);
    const bezelMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.primaryColor),
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.z = -0.12;
    this.mesh.add(bezelMesh);

    // 3. Interactive SpotLight mounted on Billboard casting light down on track
    this.spotlight = new THREE.SpotLight(new THREE.Color(config.primaryColor), 2.5, 45, Math.PI / 3, 0.4, 1.2);
    this.spotlight.position.set(config.position.x, config.position.y + config.elevation - 1, config.position.z);
    // Point downward forward
    const targetObj = new THREE.Object3D();
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), config.rotationY);
    targetObj.position.copy(config.position).addScaledVector(forward, 16);
    targetObj.position.y = config.position.y;
    scene.add(targetObj);
    this.spotlight.target = targetObj;

    scene.add(this.mesh);
    scene.add(this.spotlight);

    this.drawDisplay('ambient', 0, false, false, 0, 1, 'RACER', 0);
  }

  update(
    playerPos: THREE.Vector3,
    state: PlayerCarState,
    callsign: string,
    delta: number,
    now: number
  ) {
    this.animPhase += delta * 4;

    const dist = playerPos.distanceTo(this.mesh.position);

    // Determine Reactive Mode based on proximity and performance
    let targetMode: 'ambient' | 'proximity' | 'speed' | 'drift' | 'leader' | 'damage' = 'ambient';

    if (dist < 110) {
      if (state.isNitroActive || state.speed > 165) {
        targetMode = 'speed';
      } else if (state.isDrifting || state.driftPoints > 200) {
        targetMode = 'drift';
      } else if (state.damage && state.damage.health < 40) {
        targetMode = 'damage';
      } else if (state.position === 1 && dist < 70) {
        targetMode = 'leader';
      } else if (dist < 85) {
        targetMode = 'proximity';
      }
    }

    // Interactive spotlight reaction
    if (targetMode === 'speed') {
      this.spotlight.color.setHex(0x00f0ff);
      this.spotlight.intensity = 4.0 + Math.sin(this.animPhase * 8) * 1.5;
    } else if (targetMode === 'drift') {
      this.spotlight.color.setHex(0xf59e0b);
      this.spotlight.intensity = 3.5 + Math.cos(this.animPhase * 6) * 1.2;
    } else if (targetMode === 'proximity') {
      this.spotlight.color.setHex(0xf43f5e);
      this.spotlight.intensity = 2.8;
    } else {
      this.spotlight.color.setStyle(this.config.primaryColor);
      this.spotlight.intensity = 1.8;
    }

    // Throttle canvas draw calls to ~20 fps for ultra-smooth 60fps game render
    if (now - this.lastDrawTime > 0.05 || targetMode !== this.currentMode) {
      this.currentMode = targetMode;
      this.lastDrawTime = now;
      this.drawDisplay(
        targetMode,
        state.speed,
        state.isNitroActive,
        state.isDrifting,
        state.driftPoints,
        state.position,
        callsign,
        dist
      );
    }
  }

  private drawDisplay(
    mode: 'ambient' | 'proximity' | 'speed' | 'drift' | 'leader' | 'damage',
    speed: number,
    isNitro: boolean,
    isDrifting: boolean,
    driftPoints: number,
    position: number,
    callsign: string,
    distance: number
  ) {
    const ctx = this.ctx;
    const w = 512;
    const h = 256;
    const isUnderground = this.config.zone === 'Underground Racing Arena';

    // Clear background with cyberpunk gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (mode === 'speed') {
      bgGrad.addColorStop(0, '#042f2e');
      bgGrad.addColorStop(0.5, '#020617');
      bgGrad.addColorStop(1, '#083344');
    } else if (mode === 'drift') {
      bgGrad.addColorStop(0, '#451a03');
      bgGrad.addColorStop(0.5, '#020617');
      bgGrad.addColorStop(1, '#78350f');
    } else if (mode === 'proximity') {
      bgGrad.addColorStop(0, '#4c0519');
      bgGrad.addColorStop(0.5, '#020617');
      bgGrad.addColorStop(1, '#1e1b4b');
    } else if (isUnderground) {
      bgGrad.addColorStop(0, '#1c1917');
      bgGrad.addColorStop(0.5, '#0a0a0a');
      bgGrad.addColorStop(1, '#18181b');
    } else {
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#090d16');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Hazard Stripes on borders for Underground Arena
    if (isUnderground) {
      const stripeW = 20;
      for (let x = 0; x < w; x += stripeW * 2) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(x, 0, stripeW, 10);
        ctx.fillRect(x, h - 10, stripeW, 10);
      }
    }

    // LED Grid Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1.5);
    }

    // Dynamic Reactive Content
    ctx.textAlign = 'center';

    if (mode === 'speed') {
      // ⚡ WARP SPEED / NITRO REACTIVE STATE
      const speedVal = Math.round(speed);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;

      ctx.font = '900 28px sans-serif';
      ctx.fillText(isNitro ? '⚡ NITRO HYPERDRIVE ENGAGED ⚡' : '⚡ HIGH VELOCITY DETECTED ⚡', w / 2, 48);

      ctx.font = '900 78px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${speedVal} KM/H`, w / 2, 136);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillText(`RADAR TRAP // ${callsign.toUpperCase()}`, w / 2, 185);

      // Animated Speed Bar
      const speedPct = Math.min(1, speed / 260);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(40, 212, 432, 18);
      const barGrad = ctx.createLinearGradient(40, 0, 40 + 432 * speedPct, 0);
      barGrad.addColorStop(0, '#00f0ff');
      barGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = barGrad;
      ctx.fillRect(40, 212, 432 * speedPct, 18);

    } else if (mode === 'drift') {
      // 🔥 DRIFT COMBO REACTIVE STATE
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;

      ctx.font = '900 28px sans-serif';
      ctx.fillText('🔥 DRIFT ANGLE COMBO ACTIVE 🔥', w / 2, 48);

      ctx.font = '900 74px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`+${driftPoints} PTS`, w / 2, 134);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.fillText(`STYLE OVERLOAD // ${this.config.zone.toUpperCase()}`, w / 2, 185);

      // Flashing Underline
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(40, 216, 432, 8);

    } else if (mode === 'proximity') {
      // 🎯 INCOMING RACER PROXIMITY ALERT
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;

      ctx.font = '900 26px sans-serif';
      ctx.fillText(`TARGET LOCKED // ${Math.round(distance)}M`, w / 2, 48);

      ctx.font = '900 52px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(callsign.toUpperCase(), w / 2, 122);

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#fb7185';
      ctx.shadowBlur = 12;
      ctx.fillText(`INCOMING RACER // ${this.config.zone.toUpperCase()}`, w / 2, 178);

      // Warning chevron arrows
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#e11d48';
      ctx.fillText('>>> APPROACHING APEX <<<', w / 2, 222);

    } else if (mode === 'leader') {
      // 👑 RACE LEADER BROADCAST
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 24;

      ctx.font = '900 28px sans-serif';
      ctx.fillText('👑 RACE LEADER INCOMING 👑', w / 2, 48);

      ctx.font = '900 56px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(callsign.toUpperCase(), w / 2, 124);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText('POSITION: P1 // FASTEST ON TRACK', w / 2, 180);

    } else {
      // 🏙️ AMBIENT ZONE ADVERTISING & VENUE GRAPHICS
      ctx.fillStyle = this.config.primaryColor;
      ctx.shadowColor = this.config.primaryColor;
      ctx.shadowBlur = 22;

      ctx.font = '900 48px sans-serif';
      ctx.fillText(this.config.title, w / 2, 105);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowBlur = 12;
      ctx.fillText(this.config.subtitle, w / 2, 155);

      // Animated Audio Visualizer Bars at the bottom
      const barCount = 28;
      const barW = 10;
      const startX = (w - (barCount * (barW + 4))) / 2;
      for (let i = 0; i < barCount; i++) {
        const barH = 10 + Math.abs(Math.sin(this.animPhase + i * 0.45)) * 42;
        ctx.fillStyle = i % 2 === 0 ? this.config.primaryColor : '#ffffff';
        ctx.fillRect(startX + i * (barW + 4), 238 - barH, barW, barH);
      }
    }

    ctx.shadowBlur = 0;
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.texture.dispose();
  }
}

/**
 * Animated Spectator Model with animated limbs, lightsticks, smartphones, and camera flashes
 */
export class AnimatedSpectator {
  root: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  lightStick: THREE.Mesh | null = null;
  phoneMesh: THREE.Mesh | null = null;

  private basePosition: THREE.Vector3;
  private animOffset: number;
  private jumpVelocity: number = 0;
  private jumpHeight: number = 0;
  private isHoldingStick: boolean;
  private isHoldingPhone: boolean;

  constructor(
    parent: THREE.Group,
    pos: THREE.Vector3,
    rotY: number,
    torsoColor: number,
    stickColor?: number
  ) {
    this.root = new THREE.Group();
    this.root.position.copy(pos);
    this.root.rotation.y = rotY;
    this.basePosition = pos.clone();
    this.animOffset = Math.random() * Math.PI * 2;

    this.isHoldingStick = Boolean(stickColor);
    this.isHoldingPhone = !this.isHoldingStick && Math.random() > 0.45;

    // Stylized Cyberpunk Spectator
    // 1. Torso / Cyber Jacket
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.32);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: torsoColor,
      roughness: 0.5,
      metalness: 0.2,
    });
    this.body = new THREE.Mesh(torsoGeo, torsoMat);
    this.body.position.y = 0.95;
    this.root.add(this.body);

    // 2. Head with stylized visor
    const headGeo = new THREE.BoxGeometry(0.32, 0.36, 0.32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x182030, roughness: 0.6 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.52;
    this.root.add(this.head);

    // Glowing visor
    const visorGeo = new THREE.BoxGeometry(0.26, 0.12, 0.08);
    const visorMat = new THREE.MeshBasicMaterial({
      color: stickColor || (Math.random() > 0.5 ? 0x00f0ff : 0xf43f5e),
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.02, 0.17);
    this.head.add(visor);

    // 3. Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.16, 0.35, 0);
    this.root.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.16, 0.35, 0);
    this.root.add(rightLeg);

    // 4. Arms with shoulder pivots for cheering gestures
    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 5);
    const armMat = new THREE.MeshStandardMaterial({ color: torsoColor });

    // Left Arm Pivot
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 1.25, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.y = -0.28;
    this.leftArm.add(leftArmMesh);
    this.root.add(this.leftArm);

    // Right Arm Pivot
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 1.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, armMat);
    rightArmMesh.position.y = -0.28;
    this.rightArm.add(rightArmMesh);
    this.root.add(this.rightArm);

    // 5. Props: Glowing Lightstick or Smartphone
    if (this.isHoldingStick && stickColor) {
      const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
      const stickMat = new THREE.MeshBasicMaterial({ color: stickColor });
      this.lightStick = new THREE.Mesh(stickGeo, stickMat);
      this.lightStick.position.set(0, -0.45, 0.25);
      this.lightStick.rotation.x = Math.PI / 4;
      this.rightArm.add(this.lightStick);
    } else if (this.isHoldingPhone) {
      const phoneGeo = new THREE.BoxGeometry(0.1, 0.18, 0.02);
      const phoneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      this.phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);
      this.phoneMesh.position.set(0, -0.45, 0.2);
      this.rightArm.add(this.phoneMesh);
    }

    parent.add(this.root);
  }

  update(
    playerPos: THREE.Vector3,
    speedKmH: number,
    isNitroActive: boolean,
    isDrifting: boolean,
    delta: number,
    time: number
  ): boolean {
    const distToPlayer = this.root.position.distanceTo(playerPos);
    const isNearby = distToPlayer < 65;
    const isHighSpeedPass = isNearby && (speedKmH > 140 || isNitroActive);
    const isDriftPass = isNearby && isDrifting;

    // Head tracking: look towards the player car when nearby
    if (isNearby) {
      const dir = playerPos.clone().sub(this.root.position);
      const targetAngle = Math.atan2(dir.x, dir.z) - this.root.rotation.y;
      this.head.rotation.y = THREE.MathUtils.clamp(targetAngle, -0.7, 0.7);
    } else {
      this.head.rotation.y = Math.sin(time * 1.5 + this.animOffset) * 0.15;
    }

    // Reaction Animation Speed & Intensity
    let animSpeed = 2.5;
    let waveAmp = 0.4;

    if (isHighSpeedPass || isDriftPass) {
      animSpeed = 9.0;
      waveAmp = 1.3;

      // Excited Jumping
      if (this.jumpHeight <= 0) {
        this.jumpVelocity = 4.5 + Math.random() * 2.0;
      }
    } else if (isNearby) {
      animSpeed = 5.0;
      waveAmp = 0.8;
      if (this.jumpHeight <= 0 && Math.random() < 0.05) {
        this.jumpVelocity = 2.5;
      }
    }

    // Apply Jumping Physics
    if (this.jumpVelocity > 0 || this.jumpHeight > 0) {
      this.jumpHeight += this.jumpVelocity * delta;
      this.jumpVelocity -= 18 * delta;
      if (this.jumpHeight <= 0) {
        this.jumpHeight = 0;
        this.jumpVelocity = 0;
      }
    }

    this.root.position.y = this.basePosition.y + this.jumpHeight;

    // Arm Pumping & Lightstick Waving
    const waveSin = Math.sin(time * animSpeed + this.animOffset);
    const waveCos = Math.cos(time * animSpeed + this.animOffset);

    if (isHighSpeedPass || isDriftPass) {
      // Double fist pump / wild cheering high above head
      this.leftArm.rotation.x = -Math.PI * 0.7 + waveSin * waveAmp * 0.4;
      this.rightArm.rotation.x = -Math.PI * 0.7 + waveCos * waveAmp * 0.4;
      this.rightArm.rotation.z = Math.sin(time * 6 + this.animOffset) * 0.4;
    } else if (this.isHoldingStick) {
      // Wave lightstick overhead
      this.rightArm.rotation.x = -Math.PI * 0.5 + waveSin * waveAmp;
      this.rightArm.rotation.z = waveCos * 0.35;
      this.leftArm.rotation.x = waveCos * 0.3;
    } else if (this.isHoldingPhone) {
      // Hold phone up filming the race
      this.rightArm.rotation.x = -Math.PI * 0.45;
      this.rightArm.rotation.y = -0.2;
      this.leftArm.rotation.x = waveSin * 0.35;
    } else {
      // Ambient swaying / gentle clapping
      this.leftArm.rotation.x = waveSin * waveAmp;
      this.rightArm.rotation.x = -waveSin * waveAmp;
    }

    // Trigger Camera Flash chance when player speeds past with phone out
    if (this.isHoldingPhone && isHighSpeedPass && Math.random() < 0.04) {
      return true; // Flash trigger!
    }

    return false;
  }
}

/**
 * Grandstand Spectator Tier with crowd seating, safety barrier, and cheering crowd
 */
export class GrandstandTier {
  group: THREE.Group;
  spectators: AnimatedSpectator[] = [];

  constructor(
    scene: THREE.Scene,
    pos: THREE.Vector3,
    rotY: number,
    rows: number = 3,
    cols: number = 12,
    zone: RacingZone = 'Neon Downtown'
  ) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.group.rotation.y = rotY;

    const isUnderground = zone === 'Underground Racing Arena';

    // 1. Tiered Seating Architecture
    const stepDepth = 1.4;
    const stepHeight = 0.65;
    const tierWidth = cols * 0.85;

    const standMat = new THREE.MeshStandardMaterial({
      color: isUnderground ? 0x1c1917 : 0x111827,
      metalness: 0.8,
      roughness: 0.4,
    });

    for (let r = 0; r < rows; r++) {
      const stepGeo = new THREE.BoxGeometry(tierWidth, stepHeight, stepDepth);
      const step = new THREE.Mesh(stepGeo, standMat);
      step.position.set(0, (r + 0.5) * stepHeight, (r + 0.5) * stepDepth);
      this.group.add(step);
    }

    // 2. Safety Crash Barrier & Glowing Railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const neonRailMat = new THREE.MeshBasicMaterial({
      color: isUnderground ? 0xeab308 : 0x00f0ff,
    });

    const railGeo = new THREE.BoxGeometry(tierWidth + 0.5, 0.1, 0.1);
    const neonRail = new THREE.Mesh(railGeo, neonRailMat);
    neonRail.position.set(0, 1.2, 0.1);
    this.group.add(neonRail);

    const postCount = 6;
    for (let p = 0; p < postCount; p++) {
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(-tierWidth / 2 + (p / (postCount - 1)) * tierWidth, 0.6, 0.1);
      this.group.add(post);
    }

    // 3. Populate Animated Spectators
    const colorPalette = isUnderground
      ? [0xeab308, 0xef4444, 0xf97316, 0xa855f7, 0x38bdf8]
      : [0x00f0ff, 0xf43f5e, 0x10b981, 0x8b5cf6, 0xfbbf24];

    const stickPalette = [0x00f0ff, 0xf43f5e, 0x22c55e, 0xf59e0b];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Leave occasional gaps for realistic crowd distribution
        if (Math.random() < 0.18) continue;

        const specX = -tierWidth / 2 + 0.5 + c * 0.85 + (Math.random() - 0.5) * 0.15;
        const specY = (r + 1) * stepHeight;
        const specZ = (r + 0.5) * stepDepth;

        const torsoCol = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        const hasStick = Math.random() > 0.45;
        const stickCol = hasStick ? stickPalette[Math.floor(Math.random() * stickPalette.length)] : undefined;

        const spectator = new AnimatedSpectator(
          this.group,
          new THREE.Vector3(specX, specY, specZ),
          (Math.random() - 0.5) * 0.25,
          torsoCol,
          stickCol
        );
        this.spectators.push(spectator);
      }
    }

    scene.add(this.group);
  }

  update(
    playerPos: THREE.Vector3,
    speedKmH: number,
    isNitroActive: boolean,
    isDrifting: boolean,
    delta: number,
    time: number,
    onFlash: (pos: THREE.Vector3) => void
  ) {
    for (const spec of this.spectators) {
      const flash = spec.update(playerPos, speedKmH, isNitroActive, isDrifting, delta, time);
      if (flash) {
        const worldPos = new THREE.Vector3();
        spec.root.getWorldPosition(worldPos);
        worldPos.y += 1.3;
        onFlash(worldPos);
      }
    }
  }
}

/**
 * Interactive Zones Manager coordinating 'Neon Downtown' and 'Underground Racing Arena'
 */
export class InteractiveZonesSystem {
  scene: THREE.Scene;
  track: TrackSystem;

  billboards: InteractiveBillboard[] = [];
  grandstands: GrandstandTier[] = [];

  // Transient Camera Flash PointLights for spectators filming
  private flashLight: THREE.PointLight;
  private flashIntensity: number = 0;
  private lastCheerTriggerTime: number = 0;

  constructor(scene: THREE.Scene, track: TrackSystem) {
    this.scene = scene;
    this.track = track;

    // Shared camera flash light for spectators
    this.flashLight = new THREE.PointLight(0xffffff, 0, 30, 2);
    this.scene.add(this.flashLight);

    this.buildNeonDowntown();
    this.buildUndergroundArena();
  }

  /**
   * 1. Build 'Neon Downtown' Interactive Billboards & Animated Crowd Grandstands
   */
  private buildNeonDowntown() {
    const sampled = this.track.sampledPoints;
    const normals = this.track.sampledNormals;
    const tangents = this.track.sampledTangents;

    // --- Interactive Billboards in Neon Downtown ---
    // Billboard 1: Start/Finish Gantry Jumbotron (u = 0.01)
    const sfCenter = sampled[3];
    const sfTangent = tangents[3];
    const sfAngle = Math.atan2(sfTangent.x, sfTangent.z);

    this.billboards.push(
      new InteractiveBillboard(this.scene, {
        id: 'downtown-sf-jumbotron',
        zone: 'Neon Downtown',
        position: sfCenter.clone(),
        rotationY: sfAngle,
        width: 22,
        height: 8.5,
        elevation: 11,
        title: 'NEON DOWNTOWN',
        subtitle: 'WORLD GRAND PRIX // GRID APEX',
        primaryColor: '#00f0ff',
      })
    );

    // Billboard 2: Boulevard Skyscraper Megascreen (u = 0.14)
    const blvdIdx = Math.floor(sampled.length * 0.14);
    const blvdCenter = sampled[blvdIdx];
    const blvdNormal = normals[blvdIdx];
    const blvdPos = blvdCenter.clone().addScaledVector(blvdNormal, 19);
    const blvdTangent = tangents[blvdIdx];
    const blvdAngle = Math.atan2(blvdTangent.x, blvdTangent.z) - 0.25;

    this.billboards.push(
      new InteractiveBillboard(this.scene, {
        id: 'downtown-blvd-facade',
        zone: 'Neon Downtown',
        position: blvdPos,
        rotationY: blvdAngle,
        width: 18,
        height: 9,
        elevation: 12,
        title: 'SYNTH HORIZON',
        subtitle: 'DOWNTOWN SPEED TRAP 3000',
        primaryColor: '#ec4899',
      })
    );

    // Billboard 3: Downtown Chicane Corner Radar (u = 0.88)
    const chicaneIdx = Math.floor(sampled.length * 0.88);
    const chicaneCenter = sampled[chicaneIdx];
    const chicaneNormal = normals[chicaneIdx];
    const chicanePos = chicaneCenter.clone().addScaledVector(chicaneNormal, -18);
    const chicaneTangent = tangents[chicaneIdx];
    const chicaneAngle = Math.atan2(chicaneTangent.x, chicaneTangent.z) + 0.3;

    this.billboards.push(
      new InteractiveBillboard(this.scene, {
        id: 'downtown-chicane-radar',
        zone: 'Neon Downtown',
        position: chicanePos,
        rotationY: chicaneAngle,
        width: 16,
        height: 8,
        elevation: 9,
        title: 'CHICANE RADAR',
        subtitle: 'PROXIMITY COMBAT ZONE',
        primaryColor: '#8b5cf6',
      })
    );

    // --- Animated Crowd Grandstands in Neon Downtown ---
    // Grandstand 1: Start/Finish Straightaway Left (u = 0.03)
    const sfG1Idx = 8;
    const sfG1Center = sampled[sfG1Idx];
    const sfG1Normal = normals[sfG1Idx];
    const sfG1Pos = sfG1Center.clone().addScaledVector(sfG1Normal, 16);
    const sfG1Tangent = tangents[sfG1Idx];
    const sfG1Angle = Math.atan2(sfG1Tangent.x, sfG1Tangent.z) - Math.PI / 2;

    this.grandstands.push(
      new GrandstandTier(this.scene, sfG1Pos, sfG1Angle, 3, 14, 'Neon Downtown')
    );

    // Grandstand 2: Start/Finish Straightaway Right (u = 0.97)
    const sfG2Idx = sampled.length - 8;
    const sfG2Center = sampled[sfG2Idx];
    const sfG2Normal = normals[sfG2Idx];
    const sfG2Pos = sfG2Center.clone().addScaledVector(sfG2Normal, -16);
    const sfG2Tangent = tangents[sfG2Idx];
    const sfG2Angle = Math.atan2(sfG2Tangent.x, sfG2Tangent.z) + Math.PI / 2;

    this.grandstands.push(
      new GrandstandTier(this.scene, sfG2Pos, sfG2Angle, 3, 14, 'Neon Downtown')
    );

    // Grandstand 3: Downtown Boulevard Plaza Terrace (u = 0.16)
    const plazaIdx = Math.floor(sampled.length * 0.16);
    const plazaCenter = sampled[plazaIdx];
    const plazaNormal = normals[plazaIdx];
    const plazaPos = plazaCenter.clone().addScaledVector(plazaNormal, 17);
    const plazaTangent = tangents[plazaIdx];
    const plazaAngle = Math.atan2(plazaTangent.x, plazaTangent.z) - Math.PI / 2;

    this.grandstands.push(
      new GrandstandTier(this.scene, plazaPos, plazaAngle, 2, 10, 'Neon Downtown')
    );
  }

  /**
   * 2. Build 'Underground Racing Arena' Interactive Billboards & Animated Crowd Models
   */
  private buildUndergroundArena() {
    const sampled = this.track.sampledPoints;
    const normals = this.track.sampledNormals;
    const tangents = this.track.sampledTangents;

    // Tunnel Section is u = 0.42 to 0.62
    // --- Interactive Billboards in Underground Arena ---
    // Billboard 4: Underground Arena Cavern Jumbotron (u = 0.48)
    const tunIdx1 = Math.floor(sampled.length * 0.48);
    const tunCenter1 = sampled[tunIdx1];
    const tunTangent1 = tangents[tunIdx1];
    const tunAngle1 = Math.atan2(tunTangent1.x, tunTangent1.z);

    this.billboards.push(
      new InteractiveBillboard(this.scene, {
        id: 'underground-arena-jumbotron',
        zone: 'Underground Racing Arena',
        position: tunCenter1.clone(),
        rotationY: tunAngle1,
        width: 20,
        height: 8,
        elevation: 9.5,
        title: 'UNDERGROUND ARENA',
        subtitle: 'SUBTERRANEAN DRIFT CIRCUIT // SECTOR 04',
        primaryColor: '#f59e0b',
      })
    );

    // Billboard 5: Subterranean Drift Apex Wall Screen (u = 0.55)
    const tunIdx2 = Math.floor(sampled.length * 0.55);
    const tunCenter2 = sampled[tunIdx2];
    const tunNormal2 = normals[tunIdx2];
    const tunPos2 = tunCenter2.clone().addScaledVector(tunNormal2, 16.5);
    const tunTangent2 = tangents[tunIdx2];
    const tunAngle2 = Math.atan2(tunTangent2.x, tunTangent2.z) - 0.2;

    this.billboards.push(
      new InteractiveBillboard(this.scene, {
        id: 'underground-drift-apex',
        zone: 'Underground Racing Arena',
        position: tunPos2,
        rotationY: tunAngle2,
        width: 17,
        height: 7.5,
        elevation: 6.5,
        title: 'OUTLAW DRIFT PIT',
        subtitle: 'HIGH VOLTAGE // NO SPEED LIMIT',
        primaryColor: '#ef4444',
      })
    );

    // --- Animated Crowd Platforms & Catwalks in Underground Arena ---
    // Platform 1: Elevated Subterranean Catwalk 1 (u = 0.46)
    const cat1Idx = Math.floor(sampled.length * 0.46);
    const cat1Center = sampled[cat1Idx];
    const cat1Normal = normals[cat1Idx];
    const cat1Pos = cat1Center.clone().addScaledVector(cat1Normal, 15.5);
    const cat1Tangent = tangents[cat1Idx];
    const cat1Angle = Math.atan2(cat1Tangent.x, cat1Tangent.z) - Math.PI / 2;

    this.grandstands.push(
      new GrandstandTier(this.scene, cat1Pos, cat1Angle, 2, 11, 'Underground Racing Arena')
    );

    // Platform 2: Cavern Bleachers Overlooking Tunnel Chicane (u = 0.53)
    const cat2Idx = Math.floor(sampled.length * 0.53);
    const cat2Center = sampled[cat2Idx];
    const cat2Normal = normals[cat2Idx];
    const cat2Pos = cat2Center.clone().addScaledVector(cat2Normal, -15.5);
    const cat2Tangent = tangents[cat2Idx];
    const cat2Angle = Math.atan2(cat2Tangent.x, cat2Tangent.z) + Math.PI / 2;

    this.grandstands.push(
      new GrandstandTier(this.scene, cat2Pos, cat2Angle, 3, 12, 'Underground Racing Arena')
    );
  }

  update(
    playerPos: THREE.Vector3,
    state: PlayerCarState,
    callsign: string,
    delta: number,
    time: number
  ) {
    // 1. Update Interactive Billboards
    for (const b of this.billboards) {
      b.update(playerPos, state, callsign, delta, time);
    }

    // 2. Update Animated Crowd Grandstands
    let flashTriggeredPos: THREE.Vector3 | null = null;
    for (const g of this.grandstands) {
      g.update(
        playerPos,
        state.speed,
        state.isNitroActive,
        state.isDrifting,
        delta,
        time,
        (flashPos) => {
          flashTriggeredPos = flashPos;
        }
      );
    }

    // 3. Handle Spectator Camera Flashes
    if (flashTriggeredPos) {
      this.flashLight.position.copy(flashTriggeredPos);
      this.flashIntensity = 6.0;
      sound.playCameraClick();
    }

    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - delta * 24);
      this.flashLight.intensity = this.flashIntensity;
    }

    // 4. Proximity & Performance Crowd Cheer Audio Reaction
    // Check if player is near any grandstand while speeding (> 145 km/h), boosting, or drifting
    const isExcitingManeuver = state.speed > 145 || state.isNitroActive || (state.isDrifting && state.speed > 45);
    if (isExcitingManeuver && time - this.lastCheerTriggerTime > 2.2) {
      for (const g of this.grandstands) {
        if (g.group.position.distanceTo(playerPos) < 48) {
          const intensity = state.isNitroActive ? 1.0 : state.isDrifting ? 0.85 : 0.6;
          sound.playCrowdCheer(intensity);
          this.lastCheerTriggerTime = time;
          break;
        }
      }
    }
  }

  dispose() {
    for (const b of this.billboards) {
      b.dispose();
    }
    this.scene.remove(this.flashLight);
  }
}
