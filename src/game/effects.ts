import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  alpha: number;
}

export class VisualEffectsSystem {
  scene: THREE.Scene;

  // Tire Smoke
  private smokeParticles: Particle[] = [];
  private smokePoints: THREE.Points;
  private smokeGeo: THREE.BufferGeometry;
  private smokePositions: Float32Array;
  private smokeColors: Float32Array;
  private maxSmoke: number = 250;

  // Collision Sparks
  private sparkParticles: Particle[] = [];
  private sparkPoints: THREE.Points;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkColors: Float32Array;
  private maxSparks: number = 180;

  // Speed Lines (Hyperspace streaks)
  private speedLines: THREE.LineSegments;
  private speedLinesGeo: THREE.BufferGeometry;
  private speedPositions: Float32Array;
  private speedLineCount: number = 80;

  // Screen shake
  shakeIntensity: number = 0;
  shakeOffset: THREE.Vector3 = new THREE.Vector3();

  addShake(intensity: number) {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity);
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Smoke particle buffers
    this.smokePositions = new Float32Array(this.maxSmoke * 3);
    this.smokeColors = new Float32Array(this.maxSmoke * 4);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeGeo.setAttribute('color', new THREE.BufferAttribute(this.smokeColors, 4));

    const smokeMat = new THREE.PointsMaterial({
      size: 1.8,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    this.smokePoints = new THREE.Points(this.smokeGeo, smokeMat);
    this.scene.add(this.smokePoints);

    // 2. Sparks particle buffers
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkColors = new Float32Array(this.maxSparks * 4);
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 4));

    const sparkMat = new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, sparkMat);
    this.scene.add(this.sparkPoints);

    // 3. Speed Lines (Radial streaks around camera view during high speed / nitro)
    this.speedPositions = new Float32Array(this.speedLineCount * 2 * 3);
    for (let i = 0; i < this.speedLineCount; i++) {
      this.resetSpeedLine(i, 0, 0, 0);
    }
    this.speedLinesGeo = new THREE.BufferGeometry();
    this.speedLinesGeo.setAttribute('position', new THREE.BufferAttribute(this.speedPositions, 3));

    const speedLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0, // faded in with speed
      blending: THREE.AdditiveBlending,
    });
    this.speedLines = new THREE.LineSegments(this.speedLinesGeo, speedLineMat);
    this.scene.add(this.speedLines);
  }

  private resetSpeedLine(idx: number, cx: number, cy: number, cz: number) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 18;
    const forwardDist = -20 - Math.random() * 40;
    const length = 6 + Math.random() * 12;

    const lx = Math.cos(angle) * radius;
    const ly = Math.sin(angle) * radius;

    const base = idx * 6;
    this.speedPositions[base] = cx + lx;
    this.speedPositions[base + 1] = cy + ly;
    this.speedPositions[base + 2] = cz + forwardDist;

    this.speedPositions[base + 3] = cx + lx;
    this.speedPositions[base + 4] = cy + ly;
    this.speedPositions[base + 5] = cz + forwardDist + length;
  }

  emitDriftSmoke(rearWheelPos: THREE.Vector3, count: number = 2) {
    for (let i = 0; i < count; i++) {
      if (this.smokeParticles.length >= this.maxSmoke) {
        this.smokeParticles.shift();
      }
      this.smokeParticles.push({
        position: rearWheelPos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          0.1,
          (Math.random() - 0.5) * 0.4
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          1.0 + Math.random() * 1.5,
          (Math.random() - 0.5) * 1.5
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 1.2,
        color: new THREE.Color(0xd1d5db),
        alpha: 0.7,
      });
    }
  }

  emitCollisionSparks(hitPos: THREE.Vector3, count: number = 24) {
    this.triggerShake(0.6);
    for (let i = 0; i < count; i++) {
      if (this.sparkParticles.length >= this.maxSparks) {
        this.sparkParticles.shift();
      }
      const speed = 8 + Math.random() * 16;
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.5;

      this.sparkParticles.push({
        position: hitPos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed + 2,
          Math.sin(angle) * Math.cos(elevation) * speed
        ),
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        size: 0.8,
        color: Math.random() > 0.3 ? new THREE.Color(0xfbbf24) : new THREE.Color(0xf43f5e),
        alpha: 1.0,
      });
    }
  }

  triggerShake(intensity: number) {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + intensity);
  }

  update(delta: number, playerPos: THREE.Vector3, carDirection: THREE.Vector3, speedKmH: number, isNitro: boolean) {
    // 1. Update Camera Shake
    if (this.shakeIntensity > 0.005) {
      const shakeAmt = this.shakeIntensity * 0.35;
      this.shakeOffset.set(
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt
      );
      this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, 0, 7 * delta);
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.shakeIntensity = 0;
    }

    // Nitro passive vibration
    if (isNitro) {
      this.shakeOffset.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      ));
    }

    // 2. Update Smoke
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.smokeParticles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y += 0.8 * delta; // rise up
    }

    for (let i = 0; i < this.maxSmoke; i++) {
      const base = i * 3;
      const cBase = i * 4;
      if (i < this.smokeParticles.length) {
        const p = this.smokeParticles[i];
        this.smokePositions[base] = p.position.x;
        this.smokePositions[base + 1] = p.position.y;
        this.smokePositions[base + 2] = p.position.z;

        const progress = p.life / p.maxLife;
        const fade = (1 - progress) * p.alpha;
        this.smokeColors[cBase] = p.color.r;
        this.smokeColors[cBase + 1] = p.color.g;
        this.smokeColors[cBase + 2] = p.color.b;
        this.smokeColors[cBase + 3] = fade;
      } else {
        this.smokePositions[base + 1] = -1000;
        this.smokeColors[cBase + 3] = 0;
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
    this.smokeGeo.attributes.color.needsUpdate = true;

    // 3. Update Sparks
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.sparkParticles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 25 * delta; // gravity
    }

    for (let i = 0; i < this.maxSparks; i++) {
      const base = i * 3;
      const cBase = i * 4;
      if (i < this.sparkParticles.length) {
        const p = this.sparkParticles[i];
        this.sparkPositions[base] = p.position.x;
        this.sparkPositions[base + 1] = p.position.y;
        this.sparkPositions[base + 2] = p.position.z;

        const progress = p.life / p.maxLife;
        this.sparkColors[cBase] = p.color.r;
        this.sparkColors[cBase + 1] = p.color.g;
        this.sparkColors[cBase + 2] = p.color.b;
        this.sparkColors[cBase + 3] = 1 - progress;
      } else {
        this.sparkPositions[base + 1] = -1000;
        this.sparkColors[cBase + 3] = 0;
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
    this.sparkGeo.attributes.color.needsUpdate = true;

    // 4. Update Speed Lines
    const speedRatio = Math.max(0, (speedKmH - 160) / 160);
    const speedLineMat = this.speedLines.material as THREE.LineBasicMaterial;

    if (speedRatio > 0.05 || isNitro) {
      speedLineMat.opacity = isNitro ? 0.85 : speedRatio * 0.65;
      speedLineMat.color.setHex(isNitro ? 0x00f0ff : 0x93c5fd);

      // Move lines backward past player
      const moveDist = (speedKmH / 3.6) * delta * 2.2;
      for (let i = 0; i < this.speedLineCount; i++) {
        const b = i * 6;
        // Direction aligned with car forward heading
        this.speedPositions[b] -= carDirection.x * moveDist;
        this.speedPositions[b + 2] -= carDirection.z * moveDist;
        this.speedPositions[b + 3] -= carDirection.x * moveDist;
        this.speedPositions[b + 5] -= carDirection.z * moveDist;

        // Check distance to player
        const dx = this.speedPositions[b] - playerPos.x;
        const dz = this.speedPositions[b + 2] - playerPos.z;
        if (dx * dx + dz * dz > 70 * 70) {
          // Re-spawn ahead of player
          const angle = Math.random() * Math.PI * 2;
          const radius = 4 + Math.random() * 14;
          const aheadDist = 30 + Math.random() * 35;
          const length = 10 + Math.random() * 15;

          const sideX = -carDirection.z;
          const sideZ = carDirection.x;

          const px = playerPos.x + carDirection.x * aheadDist + sideX * (Math.cos(angle) * radius);
          const py = playerPos.y + 2 + Math.sin(angle) * (radius * 0.6);
          const pz = playerPos.z + carDirection.z * aheadDist + sideZ * (Math.cos(angle) * radius);

          this.speedPositions[b] = px;
          this.speedPositions[b + 1] = py;
          this.speedPositions[b + 2] = pz;

          this.speedPositions[b + 3] = px + carDirection.x * length;
          this.speedPositions[b + 4] = py;
          this.speedPositions[b + 5] = pz + carDirection.z * length;
        }
      }
      this.speedLinesGeo.attributes.position.needsUpdate = true;
    } else {
      speedLineMat.opacity = 0;
    }
  }
}
