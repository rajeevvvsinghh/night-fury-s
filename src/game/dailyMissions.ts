import { DailyMission, SessionRaceStats } from '../types/game';

export const DAILY_MISSIONS_STORAGE_KEY = 'nightfury_daily_missions';

export const MISSION_POOL: Omit<DailyMission, 'current' | 'completed' | 'claimed'>[] = [
  {
    id: 'drift_500m',
    title: 'DRIFT SLIDER',
    description: 'Drift a cumulative 500 meters across the asphalt',
    type: 'drift_distance',
    target: 500,
    unit: 'm',
    rewardCredits: 4000,
  },
  {
    id: 'finish_3_races',
    title: 'CHECKERED FLAG',
    description: 'Complete 3 races across any game mode',
    type: 'finish_races',
    target: 3,
    unit: 'races',
    rewardCredits: 5000,
  },
  {
    id: 'reach_240kmh',
    title: 'SPEED ADDICT',
    description: 'Push your vehicle past 240 km/h on straights',
    type: 'reach_top_speed',
    target: 240,
    unit: 'km/h',
    rewardCredits: 3500,
  },
  {
    id: 'use_nitro_8',
    title: 'PLASMA BOOST',
    description: 'Engage nitro boost overdrive 8 times in races',
    type: 'use_nitro',
    target: 8,
    unit: 'times',
    rewardCredits: 3000,
  },
  {
    id: 'win_1st_place',
    title: 'TOKYO KINGPIN',
    description: 'Finish in 1st Place in a Quick Race against AI rivals',
    type: 'win_race',
    target: 1,
    unit: 'win',
    rewardCredits: 6000,
  },
  {
    id: 'drift_12000pts',
    title: 'DRIFT VIRTUOSO',
    description: 'Accumulate 12,000 drift score points in corners',
    type: 'drift_points',
    target: 12000,
    unit: 'pts',
    rewardCredits: 4500,
  },
  {
    id: 'pass_15_checkpoints',
    title: 'GATE RUNNER',
    description: 'Pass through 15 neon checkpoint rings',
    type: 'pass_checkpoints',
    target: 15,
    unit: 'gates',
    rewardCredits: 3500,
  },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeUntilDailyReset(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diffMs = tomorrow.getTime() - now.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Generate 3 balanced missions for a given date string.
 * Uses a pseudo-random hash of the date to deterministically select 3 unique missions,
 * guaranteeing the signature 'drift' and 'finish races' missions rotate prominently.
 */
export function generateMissionsForDate(dateStr: string): DailyMission[] {
  // Simple deterministic hash based on date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // Pick 3 diverse missions from the pool
  const selectedIndices: number[] = [];
  // Ensure Mission 0 (Drift 500m) or 1 (Finish 3 races) is always included
  const primaryIdx = absHash % 2; // 0 or 1
  selectedIndices.push(primaryIdx);

  // Pick second mission (different category)
  let candidate2 = (absHash + 2) % MISSION_POOL.length;
  if (selectedIndices.includes(candidate2)) {
    candidate2 = (candidate2 + 1) % MISSION_POOL.length;
  }
  selectedIndices.push(candidate2);

  // Pick third mission
  let candidate3 = (absHash + 4) % MISSION_POOL.length;
  while (selectedIndices.includes(candidate3)) {
    candidate3 = (candidate3 + 1) % MISSION_POOL.length;
  }
  selectedIndices.push(candidate3);

  return selectedIndices.map((idx) => {
    const template = MISSION_POOL[idx];
    return {
      ...template,
      current: 0,
      completed: false,
      claimed: false,
    };
  });
}

export interface StoredDailyData {
  date: string;
  missions: DailyMission[];
}

export function loadDailyMissions(): { date: string; missions: DailyMission[] } {
  const today = getTodayDateString();
  try {
    const saved = localStorage.getItem(DAILY_MISSIONS_STORAGE_KEY);
    if (saved) {
      const parsed: StoredDailyData = JSON.parse(saved);
      if (parsed.date === today && Array.isArray(parsed.missions) && parsed.missions.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved daily missions:', err);
  }

  // Generate new missions for today
  const newMissions = generateMissionsForDate(today);
  const data: StoredDailyData = {
    date: today,
    missions: newMissions,
  };
  saveDailyMissions(data);
  return data;
}

export function saveDailyMissions(data: StoredDailyData): void {
  try {
    localStorage.setItem(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save daily missions to localStorage:', err);
  }
}

/**
 * Updates missions progress based on session race stats.
 * Returns updated missions and any that transitioned from not completed to completed.
 */
export function applySessionStatsToMissions(
  missions: DailyMission[],
  stats: SessionRaceStats
): { updatedMissions: DailyMission[]; newlyCompletedCount: number } {
  let newlyCompletedCount = 0;

  const updatedMissions = missions.map((mission) => {
    if (mission.completed) return mission;

    let delta = 0;
    let newValue = mission.current;

    switch (mission.type) {
      case 'drift_distance':
        delta = Math.floor(stats.driftDistanceMeters);
        newValue = mission.current + delta;
        break;
      case 'finish_races':
        delta = stats.racesFinished;
        newValue = mission.current + delta;
        break;
      case 'reach_top_speed':
        newValue = Math.max(mission.current, Math.round(stats.topSpeedKmH));
        break;
      case 'use_nitro':
        delta = stats.nitroUsedCount;
        newValue = mission.current + delta;
        break;
      case 'win_race':
        delta = stats.racesWon;
        newValue = mission.current + delta;
        break;
      case 'drift_points':
        delta = stats.driftPoints;
        newValue = mission.current + delta;
        break;
      case 'pass_checkpoints':
        delta = stats.checkpointsCleared;
        newValue = mission.current + delta;
        break;
    }

    const isNowCompleted = newValue >= mission.target;
    if (isNowCompleted && !mission.completed) {
      newlyCompletedCount++;
    }

    return {
      ...mission,
      current: Math.min(mission.target, newValue),
      completed: isNowCompleted,
    };
  });

  return { updatedMissions, newlyCompletedCount };
}

/**
 * Identifies completed missions that have not yet had their bonus credits granted/claimed.
 * Marks them as claimed, returns updated missions and total bonus credits awarded.
 */
export function grantPendingDailyMissionCredits(missions: DailyMission[]): {
  updatedMissions: DailyMission[];
  totalCreditsGranted: number;
  newlyClaimedMissions: DailyMission[];
} {
  const newlyClaimedMissions: DailyMission[] = [];
  let totalCreditsGranted = 0;

  const updatedMissions = missions.map((mission) => {
    if (mission.completed && !mission.claimed) {
      newlyClaimedMissions.push(mission);
      totalCreditsGranted += mission.rewardCredits;
      return {
        ...mission,
        claimed: true,
      };
    }
    return mission;
  });

  return {
    updatedMissions,
    totalCreditsGranted,
    newlyClaimedMissions,
  };
}
