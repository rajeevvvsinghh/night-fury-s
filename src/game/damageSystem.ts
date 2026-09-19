import { CarDamageState } from '../types/game';

const DAMAGE_STORAGE_KEY = 'nightfury_car_damage';

export function createInitialDamage(): CarDamageState {
  return {
    health: 100,
    frontDamage: 0,
    rearDamage: 0,
    leftDamage: 0,
    rightDamage: 0,
    brokenLeftHeadlight: false,
    brokenRightHeadlight: false,
    brokenTaillight: false,
    dentsCount: 0,
    scratchesCount: 0,
  };
}

export function loadAllCarDamage(): Record<string, CarDamageState> {
  try {
    const raw = localStorage.getItem(DAMAGE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getCarDamage(carId: string): CarDamageState {
  const all = loadAllCarDamage();
  return all[carId] || createInitialDamage();
}

export function saveCarDamage(carId: string, damage: CarDamageState): void {
  try {
    const all = loadAllCarDamage();
    all[carId] = damage;
    localStorage.setItem(DAMAGE_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save car damage:', err);
  }
}

/**
 * Calculates dynamic repair fee based on severity, broken components, and car tier.
 */
export function calculateRepairCost(
  damage: CarDamageState,
  tier: 'STREET' | 'PRO' | 'HYPER' = 'STREET'
): number {
  if (damage.health >= 99.5 && damage.dentsCount === 0 && !damage.brokenLeftHeadlight && !damage.brokenRightHeadlight && !damage.brokenTaillight) {
    return 0;
  }

  const lostHealth = Math.max(0, 100 - damage.health);
  const tierMultipliers = {
    STREET: 14,
    PRO: 22,
    HYPER: 35,
  };

  const baseRate = tierMultipliers[tier] || 15;
  let cost = lostHealth * baseRate;

  // Add parts replacement fees
  if (damage.brokenLeftHeadlight) cost += 150;
  if (damage.brokenRightHeadlight) cost += 150;
  if (damage.brokenTaillight) cost += 100;
  cost += damage.dentsCount * 35;
  cost += damage.scratchesCount * 15;

  return Math.max(120, Math.round(cost / 10) * 10);
}

/**
 * Applies impact physics to update vehicle damage state.
 * @param current Current damage state
 * @param impactForce Normalised or raw impact force (e.g. 0.2 to 2.0+)
 * @param relativeAngle Angle of impact relative to car forward vector (radians, 0 = head-on, PI = rear, PI/2 = right, -PI/2 = left)
 */
export function applyCollisionDamage(
  current: CarDamageState,
  impactForce: number,
  relativeAngle: number = 0
): CarDamageState {
  const force = Math.max(0.2, Math.min(2.5, impactForce));
  // Scaled damage severity:
  const damagePoints = Math.round(force * 14);

  let {
    health,
    frontDamage,
    rearDamage,
    leftDamage,
    rightDamage,
    brokenLeftHeadlight,
    brokenRightHeadlight,
    brokenTaillight,
    dentsCount,
    scratchesCount,
  } = { ...current };

  // Angle classification
  const normalizedAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));
  const absAngle = Math.abs(normalizedAngle);

  if (absAngle < Math.PI * 0.35) {
    // Front collision
    frontDamage = Math.min(100, frontDamage + damagePoints * 1.3);
    dentsCount += force > 0.6 ? 2 : 1;
    scratchesCount += Math.floor(force * 3);

    if (frontDamage > 30 && normalizedAngle <= 0) {
      brokenLeftHeadlight = true;
    }
    if (frontDamage > 30 && normalizedAngle >= 0) {
      brokenRightHeadlight = true;
    }
    if (frontDamage > 65) {
      brokenLeftHeadlight = true;
      brokenRightHeadlight = true;
    }
  } else if (absAngle > Math.PI * 0.65) {
    // Rear collision
    rearDamage = Math.min(100, rearDamage + damagePoints * 1.2);
    dentsCount += 1;
    scratchesCount += Math.floor(force * 2);
    if (rearDamage > 35) {
      brokenTaillight = true;
    }
  } else if (normalizedAngle > 0) {
    // Right flank collision
    rightDamage = Math.min(100, rightDamage + damagePoints * 1.1);
    scratchesCount += Math.floor(force * 3);
    if (force > 0.8) dentsCount += 1;
  } else {
    // Left flank collision
    leftDamage = Math.min(100, leftDamage + damagePoints * 1.1);
    scratchesCount += Math.floor(force * 3);
    if (force > 0.8) dentsCount += 1;
  }

  // Calculate weighted overall health (min 15% so car always remains drivable in arcade style)
  const weightedDamage =
    frontDamage * 0.4 + rearDamage * 0.2 + (leftDamage + rightDamage) * 0.2;
  health = Math.max(15, Math.min(100, Math.round(100 - weightedDamage)));

  return {
    health,
    frontDamage: Math.round(frontDamage),
    rearDamage: Math.round(rearDamage),
    leftDamage: Math.round(leftDamage),
    rightDamage: Math.round(rightDamage),
    brokenLeftHeadlight,
    brokenRightHeadlight,
    brokenTaillight,
    dentsCount: Math.min(12, dentsCount),
    scratchesCount: Math.min(25, scratchesCount),
  };
}

/**
 * Reset a car to showroom condition.
 */
export function repairCarDamage(carId: string): CarDamageState {
  const pristine = createInitialDamage();
  saveCarDamage(carId, pristine);
  return pristine;
}
