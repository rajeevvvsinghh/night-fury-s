import * as THREE from 'three';
import { TrackSystem } from './track';
import { InteractiveZonesSystem } from './interactiveZones';
import { PlayerCarState } from '../types/game';

export class CityEnvironment {
  scene: THREE.Scene;
  track: TrackSystem;
  billboards: THREE.Mesh[] = [];
  tunnelRings: THREE.Mesh[] = [];
  animatedLights: THREE.PointLight[] = [];
  rainParticles: THREE.Points | null = null;
  checkpointGates: THREE.Group[] = [];
  interactiveZones!: InteractiveZonesSystem;

  constructor(scene: THREE.Scene, track: TrackSystem) {
    this.scene = scene;
    this.track = track;
  }

  build(enableRain: boolean = true) {
    this.setupFogAndAtmosphere();
    this.buildRoadNetwork();
    this.buildSkyscrapers();
    this.buildStreetLamps();
    this.buildBridgeElements();
    this.buildTunnelElements();
    this.buildCheckpointsAndFinish();
    this.buildBillboards();
    this.buildSidewalkDecorations();
    this.interactiveZones = new InteractiveZonesSystem(this.scene, this.track);
    if (enableRain) {
      this.buildRain();
    }
  }

  private setupFogAndAtmosphere() {
    this.scene.background = new THREE.Color(0x05070e);
    this.scene.fog = new THREE.FogExp2(0x070914, 0.0028);

    // Deep ambient night light with cool cyber tone
    const ambientLight = new THREE.AmbientLight(0x182038, 0.9);
    this.scene.add(ambientLight);

    // Moonlight / Directional light with subtle shadows
    const moonLight = new THREE.DirectionalLight(0x4060aa, 1.2);
    moonLight.position.set(200, 350, 150);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 50;
    moonLight.shadow.camera.far = 800;
    const d = 250;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.001;
    this.scene.add(moonLight);

    // Ground plane beyond track (dark reflective city pavement)
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.85,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.5;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Wet dark asphalt base
    ctx.fillStyle = '#11141a';
    ctx.fillRect(0, 0, 512, 1024);

    // Fine asphalt noise
    for (let i = 0; i < 20000; i++) {
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.5})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
    }

    // Subtle wet puddle streaks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 12; i++) {
      const py = Math.random() * 1024;
      const ph = 40 + Math.random() * 120;
      ctx.fillRect(60, py, 392, ph);
    }

    // Road Edge Curbs (Red and White reflective blocks)
    const curbW = 28;
    const stripeH = 32;
    for (let y = 0; y < 1024; y += stripeH) {
      const isRed = Math.floor(y / stripeH) % 2 === 0;
      ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
      ctx.fillRect(0, y, curbW, stripeH);
      ctx.fillRect(512 - curbW, y, curbW, stripeH);
    }

    // Double solid yellow center lines
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(256 - 6, 0, 4, 1024);
    ctx.fillRect(256 + 2, 0, 4, 1024);

    // White dashed lane dividers for 4-lane wide road
    ctx.fillStyle = '#ffffff';
    const dashH = 48;
    const gapH = 36;
    for (let y = 0; y < 1024; y += dashH + gapH) {
      // Left lane divider
      ctx.fillRect(145, y, 4, dashH);
      // Right lane divider
      ctx.fillRect(367, y, 4, dashH);
    }

    // Solid white shoulder lines inside curbs
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(curbW + 4, 0, 4, 1024);
    ctx.fillRect(512 - curbW - 8, 0, 4, 1024);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);
    texture.anisotropy = 8;
    return texture;
  }

  private buildRoadNetwork() {
    const roadTexture = this.createRoadTexture();
    const numPoints = this.track.pointsCount;
    const roadWidth = 26;
    const sidewalkWidth = 4;

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Sidewalk vertices
    const swVertices: number[] = [];
    const swNormals: number[] = [];
    const swUvs: number[] = [];
    const swIndices: number[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const idx = i % numPoints;
      const center = this.track.sampledPoints[idx];
      const normal = this.track.sampledNormals[idx];
      const v = i / 10;

      // Road left and right points
      const left = center.clone().addScaledVector(normal, -roadWidth / 2);
      const right = center.clone().addScaledVector(normal, roadWidth / 2);

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, v, 1, v);

      // Sidewalk left & right
      const swLeftOuter = left.clone().addScaledVector(normal, -sidewalkWidth);
      swLeftOuter.y += 0.25;
      const swLeftInner = left.clone();
      swLeftInner.y += 0.25;

      const swRightInner = right.clone();
      swRightInner.y += 0.25;
      const swRightOuter = right.clone().addScaledVector(normal, sidewalkWidth);
      swRightOuter.y += 0.25;

      swVertices.push(
        swLeftOuter.x, swLeftOuter.y, swLeftOuter.z,
        swLeftInner.x, swLeftInner.y, swLeftInner.z,
        swRightInner.x, swRightInner.y, swRightInner.z,
        swRightOuter.x, swRightOuter.y, swRightOuter.z
      );

      swNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      swUvs.push(0, v, 1, v, 0, v, 1, v);

      if (i < numPoints) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);

        const swBase = i * 4;
        // Left sidewalk quad
        swIndices.push(swBase, swBase + 4, swBase + 1);
        swIndices.push(swBase + 1, swBase + 4, swBase + 5);
        // Right sidewalk quad
        swIndices.push(swBase + 2, swBase + 6, swBase + 3);
        swIndices.push(swBase + 3, swBase + 6, swBase + 7);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.35, // Slightly wet look
      metalness: 0.3,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Sidewalk Mesh
    const swGeo = new THREE.BufferGeometry();
    swGeo.setAttribute('position', new THREE.Float32BufferAttribute(swVertices, 3));
    swGeo.setAttribute('normal', new THREE.Float32BufferAttribute(swNormals, 3));
    swGeo.setAttribute('uv', new THREE.Float32BufferAttribute(swUvs, 2));
    swGeo.setIndex(swIndices);

    const swMat = new THREE.MeshStandardMaterial({
      color: 0x272d3d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const swMesh = new THREE.Mesh(swGeo, swMat);
    swMesh.receiveShadow = true;
    this.scene.add(swMesh);
  }

  private createSkyscraperWindowTexture(hue: 'cyan' | 'amber' | 'mixed'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 128, 256);

    const cols = 8;
    const rows = 16;
    const winW = 8;
    const winH = 10;
    const padX = 8;
    const padY = 6;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() > 0.45;
        if (isLit) {
          if (hue === 'cyan') {
            ctx.fillStyle = Math.random() > 0.3 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(255, 255, 255, 0.9)';
          } else if (hue === 'amber') {
            ctx.fillStyle = Math.random() > 0.3 ? 'rgba(251, 146, 60, 0.85)' : 'rgba(253, 224, 71, 0.9)';
          } else {
            const rand = Math.random();
            ctx.fillStyle = rand < 0.4 ? 'rgba(56, 189, 248, 0.8)' : rand < 0.8 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(255, 255, 255, 0.9)';
          }
        } else {
          ctx.fillStyle = 'rgba(20, 26, 40, 0.9)';
        }
        ctx.fillRect(c * (winW + padX) + 6, r * (winH + padY) + 6, winW, winH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    return tex;
  }

  private buildSkyscrapers() {
    const texCyan = this.createSkyscraperWindowTexture('cyan');
    const texAmber = this.createSkyscraperWindowTexture('amber');
    const texMixed = this.createSkyscraperWindowTexture('mixed');

    const materials = [
      new THREE.MeshStandardMaterial({
        map: texCyan,
        roughness: 0.4,
        metalness: 0.6,
        emissiveMap: texCyan,
        emissive: new THREE.Color(0x103050),
        emissiveIntensity: 0.8,
      }),
      new THREE.MeshStandardMaterial({
        map: texAmber,
        roughness: 0.4,
        metalness: 0.6,
        emissiveMap: texAmber,
        emissive: new THREE.Color(0x402510),
        emissiveIntensity: 0.8,
      }),
      new THREE.MeshStandardMaterial({
        map: texMixed,
        roughness: 0.4,
        metalness: 0.6,
        emissiveMap: texMixed,
        emissive: new THREE.Color(0x301540),
        emissiveIntensity: 0.8,
      }),
    ];

    // Distribute buildings along outside and inside of track with safe clearance
    const buildingCount = 140;
    const sampled = this.track.sampledPoints;

    for (let i = 0; i < buildingCount; i++) {
      const pointIdx = Math.floor((i / buildingCount) * sampled.length);
      const center = sampled[pointIdx];
      const normal = this.track.sampledNormals[pointIdx];

      // Side: alternating left (-1) or right (+1)
      const side = (i % 2 === 0 ? 1 : -1);
      const distance = 26 + Math.random() * 45 + (Math.random() > 0.7 ? 50 : 0);

      const posX = center.x + normal.x * distance * side;
      const posZ = center.z + normal.z * distance * side;

      // Random building proportions
      const width = 22 + Math.random() * 26;
      const depth = 22 + Math.random() * 26;
      const height = 65 + Math.random() * 160;

      const geo = new THREE.BoxGeometry(width, height, depth);
      const mat = materials[i % materials.length];
      const building = new THREE.Mesh(geo, mat);

      building.position.set(posX, height / 2 - 2, posZ);
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);

      // Rooftop antenna with blinking aircraft warning red light
      if (height > 90) {
        const antGeo = new THREE.CylinderGeometry(0.3, 0.6, 12, 4);
        const antMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const antenna = new THREE.Mesh(antGeo, antMat);
        antenna.position.set(posX, height + 4, posZ);
        this.scene.add(antenna);

        const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(posX, height + 10, posZ);
        this.scene.add(beacon);
      }
    }
  }

  private buildStreetLamps() {
    const lampInterval = 12; // Every ~12 sampled track points
    const sampled = this.track.sampledPoints;

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, metalness: 0.8, roughness: 0.4 });
    const lampMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const lampMatAmber = new THREE.MeshBasicMaterial({ color: 0xffb703 });

    for (let i = 0; i < sampled.length; i += lampInterval) {
      // Don't place lamps inside tunnel
      if (this.track.isTunnelAt(i / sampled.length)) continue;

      const center = sampled[i];
      const normal = this.track.sampledNormals[i];
      const tangent = this.track.sampledTangents[i];

      [-1, 1].forEach((side) => {
        const offset = 14.5 * side;
        const lampPos = center.clone().addScaledVector(normal, offset);

        const group = new THREE.Group();
        group.position.set(lampPos.x, lampPos.y, lampPos.z);

        // Vertical pole
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 9, 6);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4.5;
        group.add(pole);

        // Horizontal arm curved toward road
        const armGeo = new THREE.BoxGeometry(2.5, 0.2, 0.2);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(-side * 1.2, 8.8, 0);
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal.clone().multiplyScalar(-side));
        group.add(arm);

        // Glowing light fixture
        const bulbGeo = new THREE.BoxGeometry(1.2, 0.3, 0.5);
        const isCyan = (i / lampInterval) % 2 === 0;
        const bulb = new THREE.Mesh(bulbGeo, isCyan ? lampMatCyan : lampMatAmber);
        bulb.position.set(0, 8.7, 0);
        group.add(bulb);

        this.scene.add(group);
      });
    }
  }

  private buildBridgeElements() {
    // Large suspension towers and glowing stay cables where track.isBridgeAt is true
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 });
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Place 2 grand suspension bridge pylons
    const bridgeCenter1 = this.track.getPointAt(0.26);
    const bridgeCenter2 = this.track.getPointAt(0.33);

    [bridgeCenter1, bridgeCenter2].forEach((center) => {
      const normal = this.track.sampledNormals[Math.floor(0.3 * this.track.pointsCount)];
      [-1, 1].forEach((side) => {
        const pylonPos = center.clone().addScaledVector(normal, 17 * side);
        const pylonGeo = new THREE.BoxGeometry(3, 48, 3);
        const pylon = new THREE.Mesh(pylonGeo, towerMat);
        pylon.position.set(pylonPos.x, pylonPos.y + 20, pylonPos.z);
        this.scene.add(pylon);

        // Neon stay cables connecting to road
        for (let k = -2; k <= 2; k++) {
          const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, 28, 4);
          const cable = new THREE.Mesh(cableGeo, cableMat);
          cable.position.set(pylonPos.x, pylonPos.y + 14, pylonPos.z + k * 14);
          cable.rotation.z = side * 0.35;
          this.scene.add(cable);
        }
      });
    });
  }

  private buildTunnelElements() {
    // Create glowing neon arch ribs across the tunnel section
    const ringMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ringMatPink = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const sampled = this.track.sampledPoints;
    for (let i = 0; i < sampled.length; i += 4) {
      const u = i / sampled.length;
      if (!this.track.isTunnelAt(u)) continue;

      const center = sampled[i];
      const tangent = this.track.sampledTangents[i];

      // Arch ring
      const archGeo = new THREE.TorusGeometry(14, 0.45, 8, 24, Math.PI);
      const isPink = Math.floor(i / 8) % 2 === 0;
      const arch = new THREE.Mesh(archGeo, isPink ? ringMatPink : ringMatCyan);
      arch.position.set(center.x, center.y + 0.5, center.z);
      arch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      arch.rotation.z = Math.PI; // Flip arch upwards
      this.scene.add(arch);
      this.tunnelRings.push(arch);
    }
  }

  private createBillboardTexture(title: string, subtitle: string, color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark cyberpunk gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#04060c');
    grad.addColorStop(1, '#0e172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 244);

    // Neon text
    ctx.font = 'bold 54px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillText(title, 256, 115);

    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = color;
    ctx.shadowBlur = 16;
    ctx.fillText(subtitle, 256, 175);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private buildBillboards() {
    const ads = [
      { title: 'NIGHTFURY', sub: 'DOMINATE THE STREETS', color: '#00f0ff' },
      { title: 'NITRO BOOST', sub: 'OCTANE OVERDRIVE 3000', color: '#f43f5e' },
      { title: 'SYNTH RUNNER', sub: 'CYBERPUNK MOTORS', color: '#eab308' },
      { title: 'APEX TUNING', sub: 'PRECISION TRACK SPECS', color: '#a855f7' },
      { title: 'NEON HORIZON', sub: 'NO LIMITS // NO BRAKES', color: '#10b981' },
      { title: 'TURBO V8', sub: 'TWIN COMPRESSOR STAGE 3', color: '#fb923c' },
    ];

    const sampled = this.track.sampledPoints;
    const spacing = Math.floor(sampled.length / ads.length);

    ads.forEach((ad, idx) => {
      const ptIdx = (idx * spacing + 15) % sampled.length;
      const center = sampled[ptIdx];
      const normal = this.track.sampledNormals[ptIdx];
      const tangent = this.track.sampledTangents[ptIdx];

      const tex = this.createBillboardTexture(ad.title, ad.sub, ad.color);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const geo = new THREE.PlaneGeometry(18, 9);
      const mesh = new THREE.Mesh(geo, mat);

      // Place overhead truss across the road
      mesh.position.set(center.x, center.y + 11, center.z);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.scene.add(mesh);
      this.billboards.push(mesh);

      // Support pillars on sides
      [-1, 1].forEach((side) => {
        const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 12, 6);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const post = new THREE.Mesh(postGeo, postMat);
        const postPos = center.clone().addScaledVector(normal, 15 * side);
        post.position.set(postPos.x, center.y + 6, postPos.z);
        this.scene.add(post);
      });
    });
  }

  private buildCheckpointsAndFinish() {
    // Start / Finish Gantry at index 0
    const startPt = this.track.sampledPoints[0];
    const startNormal = this.track.sampledNormals[0];
    const startTangent = this.track.sampledTangents[0];

    const finishCanvas = document.createElement('canvas');
    finishCanvas.width = 512;
    finishCanvas.height = 128;
    const fctx = finishCanvas.getContext('2d')!;

    // Checkered banner
    const sq = 32;
    for (let x = 0; x < 512; x += sq) {
      for (let y = 0; y < 128; y += sq) {
        fctx.fillStyle = (x / sq + y / sq) % 2 === 0 ? '#ffffff' : '#0a0a0a';
        fctx.fillRect(x, y, sq, sq);
      }
    }
    fctx.font = '900 48px sans-serif';
    fctx.fillStyle = '#00f0ff';
    fctx.textAlign = 'center';
    fctx.shadowColor = '#00f0ff';
    fctx.shadowBlur = 20;
    fctx.fillText('FINISH LINE', 256, 85);

    const finishTex = new THREE.CanvasTexture(finishCanvas);
    const finishMat = new THREE.MeshBasicMaterial({ map: finishTex });
    const finishGeo = new THREE.PlaneGeometry(28, 6);
    const finishBanner = new THREE.Mesh(finishGeo, finishMat);
    finishBanner.position.set(startPt.x, startPt.y + 8, startPt.z);
    finishBanner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTangent);
    this.scene.add(finishBanner);

    // Build laser holographic checkpoint gates
    this.track.checkpoints.forEach((cp, idx) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(cp.position);

      const archMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x22c55e : 0x00f0ff,
        transparent: true,
        opacity: 0.75,
      });

      // Holographic laser beam arch
      const beamGeo = new THREE.BoxGeometry(cp.width, 0.4, 0.4);
      const beam = new THREE.Mesh(beamGeo, archMat);
      beam.position.y = 7;
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), cp.direction);
      gateGroup.add(beam);

      // Vertical laser pylons
      [-1, 1].forEach((side) => {
        const pylonGeo = new THREE.CylinderGeometry(0.3, 0.3, 7, 8);
        const pylon = new THREE.Mesh(pylonGeo, archMat);
        pylon.position.set(side * (cp.width / 2), 3.5, 0);
        gateGroup.add(pylon);
      });

      this.scene.add(gateGroup);
      this.checkpointGates.push(gateGroup);
    });
  }

  private buildSidewalkDecorations() {
    // Cyber palm / geometric illuminated street trees
    const treeCount = 60;
    const sampled = this.track.sampledPoints;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      emissive: new THREE.Color(0x064e3b),
      emissiveIntensity: 0.4,
    });

    for (let i = 0; i < treeCount; i++) {
      const idx = Math.floor((i / treeCount) * sampled.length);
      if (this.track.isTunnelAt(idx / sampled.length) || this.track.isBridgeAt(idx / sampled.length)) continue;

      const center = sampled[idx];
      const normal = this.track.sampledNormals[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const pos = center.clone().addScaledVector(normal, 15 * side);

      const tree = new THREE.Group();
      tree.position.set(pos.x, center.y, pos.z);

      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 6, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3;
      tree.add(trunk);

      const coneGeo = new THREE.ConeGeometry(2.5, 6, 6);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = 7;
      tree.add(cone);

      this.scene.add(tree);
    }
  }

  private buildRain() {
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
      velocities[i] = 40 + Math.random() * 30;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.6,
      transparent: true,
      opacity: 0.45,
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);
  }

  update(delta: number, playerPos: THREE.Vector3, state?: PlayerCarState, callsign: string = 'RACER') {
    // 1. Interactive Zones: Billboards & Animated Crowd Spectators
    if (this.interactiveZones && state) {
      this.interactiveZones.update(playerPos, state, callsign, delta, performance.now() / 1000);
    }

    // 2. Follow player with rain particle box
    if (this.rainParticles) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= delta * 90; // Fall downward rapidly
        // Reset when below player
        if (positions[i * 3 + 1] < playerPos.y - 5) {
          positions[i * 3 + 1] = playerPos.y + 70 + Math.random() * 30;
          positions[i * 3] = playerPos.x + (Math.random() - 0.5) * 250;
          positions[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 250;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    if (this.interactiveZones) {
      this.interactiveZones.dispose();
    }
    if (this.rainParticles) {
      this.rainParticles.geometry.dispose();
      (this.rainParticles.material as THREE.Material).dispose();
    }
  }
}
