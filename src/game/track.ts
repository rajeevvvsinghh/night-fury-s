import * as THREE from 'three';

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  width: number;
  isBridge?: boolean;
  isTunnel?: boolean;
  bankAngle?: number;
}

export interface CheckpointData {
  index: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  width: number;
}

// 18 distinct waypoints forming a high-speed cyberpunk downtown street racing loop
export const TRACK_WAYPOINTS: TrackPoint[] = [
  { x: 0, y: 0, z: 0, width: 26 },                 // Start/Finish straight
  { x: 0, y: 0, z: 220, width: 26 },               // Straightaway
  { x: 40, y: 0, z: 380, width: 28 },              // Fast right bend
  { x: 140, y: 0, z: 500, width: 30 },             // Entering Boulevard
  { x: 320, y: 3, z: 580, width: 30, isBridge: true }, // Neon Bridge Ascent
  { x: 500, y: 6, z: 580, width: 30, isBridge: true }, // Top of Skyway Bridge
  { x: 680, y: 2, z: 520, width: 28, isBridge: true }, // Bridge Descent
  { x: 780, y: 0, z: 380, width: 28 },             // Downtown North Corner
  { x: 820, y: -2, z: 200, width: 26, isTunnel: true }, // Tunnel Entry
  { x: 800, y: -2, z: 0, width: 26, isTunnel: true },   // Underground Tunnel section
  { x: 740, y: -1, z: -180, width: 26, isTunnel: true },// Tunnel Exit curve
  { x: 620, y: 0, z: -320, width: 28 },            // South Industrial straight
  { x: 440, y: 0, z: -440, width: 30 },            // Sweeping left turn
  { x: 220, y: 0, z: -480, width: 28 },            // Canal waterfront straight
  { x: 40, y: 0, z: -440, width: 28 },             // Hairpin entry
  { x: -80, y: 0, z: -320, width: 26 },            // Chicane left
  { x: -60, y: 0, z: -180, width: 26 },            // Chicane right
  { x: -20, y: 0, z: -80, width: 26 },             // Final straight lineup
];

export class TrackSystem {
  curve: THREE.CatmullRomCurve3;
  pointsCount: number = 300;
  sampledPoints: THREE.Vector3[] = [];
  sampledTangents: THREE.Vector3[] = [];
  sampledNormals: THREE.Vector3[] = [];
  totalLength: number = 0;
  checkpoints: CheckpointData[] = [];

  constructor() {
    const vectors = TRACK_WAYPOINTS.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    this.curve = new THREE.CatmullRomCurve3(vectors, true, 'centripetal', 0.5);
    this.totalLength = this.curve.getLength();
    this.sampleCurve();
    this.buildCheckpoints();
  }

  private sampleCurve() {
    this.sampledPoints = this.curve.getSpacedPoints(this.pointsCount);
    for (let i = 0; i <= this.pointsCount; i++) {
      const u = i / this.pointsCount;
      const tangent = this.curve.getTangentAt(u).normalize();
      this.sampledTangents.push(tangent);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      this.sampledNormals.push(normal);
    }
  }

  private buildCheckpoints() {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pos = this.curve.getPointAt(u);
      const dir = this.curve.getTangentAt(u).normalize();
      this.checkpoints.push({
        index: i,
        position: pos,
        direction: dir,
        width: 28,
      });
    }
  }

  getPointAt(u: number): THREE.Vector3 {
    return this.curve.getPointAt(((u % 1) + 1) % 1);
  }

  getTangentAt(u: number): THREE.Vector3 {
    return this.curve.getTangentAt(((u % 1) + 1) % 1);
  }

  // Projects car position to closest point along track, returns progress (0 to 1) & lateral distance
  getTrackProgress(x: number, z: number): { progress: number; lateralOffset: number; closestPoint: THREE.Vector3; tangent: THREE.Vector3 } {
    let bestDistSq = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < this.sampledPoints.length; i++) {
      const p = this.sampledPoints[i];
      const dx = x - p.x;
      const dz = z - p.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestIdx = i;
      }
    }

    const progress = bestIdx / this.pointsCount;
    const closestPoint = this.sampledPoints[bestIdx];
    const tangent = this.sampledTangents[bestIdx];
    const normal = this.sampledNormals[bestIdx];

    const toCar = new THREE.Vector3(x - closestPoint.x, 0, z - closestPoint.z);
    const lateralOffset = toCar.dot(normal);

    return { progress, lateralOffset, closestPoint, tangent };
  }

  // Check if position is near a tunnel or bridge section
  isTunnelAt(u: number): boolean {
    const normU = ((u % 1) + 1) % 1;
    // Tunnel roughly between waypoint 8 (u ~ 0.44) and 11 (u ~ 0.61)
    return normU >= 0.42 && normU <= 0.62;
  }

  isBridgeAt(u: number): boolean {
    const normU = ((u % 1) + 1) % 1;
    // Bridge roughly between waypoint 4 (u ~ 0.22) and 7 (u ~ 0.38)
    return normU >= 0.21 && normU <= 0.39;
  }

  // Helper for 2D minimap canvas drawing (normalized 0 to 1)
  getMinimapBounds() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of this.sampledPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    return { minX, maxX, minZ, maxZ, width: maxX - minX, height: maxZ - minZ };
  }
}
