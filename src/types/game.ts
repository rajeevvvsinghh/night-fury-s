export type GameMode = 'quick_race' | 'time_trial' | 'checkpoint_race';

export type GameState = 'menu' | 'garage' | 'settings' | 'countdown' | 'racing' | 'paused' | 'finished';

export type CameraView = 'chase_close' | 'chase_far' | 'hood';

export interface ControlInputs {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
  nitro: boolean;
}

export interface CarStats {
  topSpeed: number;     // max km/h (e.g., 260)
  acceleration: number; // 0-100 handling rate
  handling: number;     // turning responsiveness
  driftControl: number; // stability during drift
  nitroPower: number;   // boost multiplier
  brakes: number;       // stopping power
}

export interface CarUpgrades {
  engine: number;    // 0 to 4
  handling: number;  // 0 to 4
  brakes: number;    // 0 to 4
  nitro: number;     // 0 to 4
  topSpeed: number;  // 0 to 4
}

export interface CarConfig {
  id: string;
  name: string;
  subtitle: string;
  tier: 'STREET' | 'PRO' | 'HYPER';
  price: number;
  unlocked: boolean;
  baseStats: CarStats;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  bodyStyle: 'supercar' | 'muscle' | 'tuner' | 'hypercar' | 'prototype';
}

export interface CarDamageState {
  health: number; // 100 = mint / pristine, 0 = totaled
  frontDamage: number; // 0 to 100
  rearDamage: number; // 0 to 100
  leftDamage: number; // 0 to 100
  rightDamage: number; // 0 to 100
  brokenLeftHeadlight: boolean;
  brokenRightHeadlight: boolean;
  brokenTaillight: boolean;
  dentsCount: number;
  scratchesCount: number;
}

export interface PlayerCarState {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  pitch: number;
  roll: number;
  speed: number;       // in km/h
  speedMs: number;     // in m/s
  rpm: number;         // 1000 - 8500
  gear: number;        // 1 - 6, or -1 for R
  steeringAngle: number;
  isDrifting: boolean;
  driftAngle: number;
  driftPoints: number;
  nitroRemaining: number; // 0 - 100
  isNitroActive: boolean;
  isBraking: boolean;
  isAccelerating: boolean;
  isReversing: boolean;
  lap: number;
  lapProgress: number; // 0 to 1 along track
  checkpointIndex: number;
  distanceTraveled: number;
  position: number;    // 1st, 2nd, etc.
  driftDistance: number;   // cumulative meters drifted in session
  nitroCount: number;      // count of nitro activations
  topSpeedReached: number; // max speed in km/h reached
  checkpointsPassed: number;
  damage: CarDamageState;
}

export type MissionType =
  | 'drift_distance'
  | 'finish_races'
  | 'reach_top_speed'
  | 'use_nitro'
  | 'win_race'
  | 'drift_points'
  | 'pass_checkpoints';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  target: number;
  current: number;
  unit: string;
  rewardCredits: number;
  completed: boolean;
  claimed: boolean;
}

export interface SessionRaceStats {
  driftDistanceMeters: number;
  driftPoints: number;
  topSpeedKmH: number;
  nitroUsedCount: number;
  checkpointsCleared: number;
  racesFinished: number;
  racesWon: number;
}

export interface RacerInfo {
  id: string;
  name: string;
  carName: string;
  color: string;
  lap: number;
  lapProgress: number;
  totalDistance: number;
  position: number;
  bestLapTime: number;
  isAI: boolean;
}

export interface RaceSettings {
  mode: GameMode;
  totalLaps: number;
  rivalCount: number;
  trafficDensity: 'low' | 'medium' | 'high';
  timeLimitSeconds: number; // for time trial or checkpoint race
  audioVolume: number;
  musicVolume: number;
  rainEffect: boolean;
  motionBlur: boolean;
}

export interface RaceResult {
  completed: boolean;
  mode: GameMode;
  position: number;
  totalTime: number;
  bestLapTime: number;
  driftScore: number;
  creditsEarned: number;
  newRecord: boolean;
}

export interface PlayerProfile {
  callsign: string;
  driverLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  totalGamesPlayed: number;
  totalWins: number;
  winPercentage: number;
  totalPodiums: number;
  totalDriftScore: number;
  topSpeedRecord: number;
  bestLapRecord: number;
}
