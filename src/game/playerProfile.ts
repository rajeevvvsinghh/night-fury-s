import { PlayerProfile, RaceResult, SessionRaceStats } from '../types/game';

const STORAGE_KEY = 'nightfury_player_profile';

export const DRIVER_TITLES: { minLevel: number; title: string; color: string }[] = [
  { minLevel: 1, title: 'STREET ROOKIE', color: '#94a3b8' },
  { minLevel: 2, title: 'URBAN CONTENDER', color: '#38bdf8' },
  { minLevel: 3, title: 'APEX DRIFTER', color: '#00f0ff' },
  { minLevel: 4, title: 'MIDNIGHT RUNNER', color: '#818cf8' },
  { minLevel: 5, title: 'CIRCUIT GLIDER', color: '#a855f7' },
  { minLevel: 6, title: 'SECTOR PHANTOM', color: '#f43f5e' },
  { minLevel: 7, title: 'TURBO OUTLAW', color: '#fb923c' },
  { minLevel: 8, title: 'ASPHALT REAPER', color: '#eab308' },
  { minLevel: 10, title: 'TOKYO UNDERGROUND LEGEND', color: '#10b981' },
];

export function getDriverTitle(level: number): { title: string; color: string } {
  let matched = DRIVER_TITLES[0];
  for (const tier of DRIVER_TITLES) {
    if (level >= tier.minLevel) {
      matched = tier;
    }
  }
  return matched;
}

export function getXpRequiredForLevel(level: number): number {
  // Scaling XP curve: 500 XP at lvl 1, 800 at lvl 2, 1150 at lvl 3, etc.
  return Math.round(500 + (level - 1) * 350);
}

export function getDefaultPlayerProfile(): PlayerProfile {
  return {
    callsign: 'GHOST_RACER',
    driverLevel: 1,
    currentXp: 0,
    xpToNextLevel: getXpRequiredForLevel(1),
    totalGamesPlayed: 0,
    totalWins: 0,
    winPercentage: 0,
    totalPodiums: 0,
    totalDriftScore: 0,
    topSpeedRecord: 0,
    bestLapRecord: 0,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultPlayerProfile();
      savePlayerProfile(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const validLevel = Math.max(1, parsed.driverLevel || 1);
    const xpRequired = parsed.xpToNextLevel || getXpRequiredForLevel(validLevel);
    const played = Math.max(0, parsed.totalGamesPlayed || 0);
    const wins = Math.max(0, parsed.totalWins || 0);
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    return {
      callsign: parsed.callsign || 'GHOST_RACER',
      driverLevel: validLevel,
      currentXp: Math.max(0, parsed.currentXp || 0),
      xpToNextLevel: xpRequired,
      totalGamesPlayed: played,
      totalWins: wins,
      winPercentage: winRate,
      totalPodiums: Math.max(0, parsed.totalPodiums || 0),
      totalDriftScore: Math.max(0, parsed.totalDriftScore || 0),
      topSpeedRecord: Math.max(0, parsed.topSpeedRecord || 0),
      bestLapRecord: Math.max(0, parsed.bestLapRecord || 0),
    };
  } catch {
    return getDefaultPlayerProfile();
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to persist player profile:', e);
  }
}

export interface ProfileUpdateResult {
  updatedProfile: PlayerProfile;
  xpEarned: number;
  leveledUp: boolean;
  newLevel?: number;
}

export function recordRaceToProfile(
  currentProfile: PlayerProfile,
  result: RaceResult,
  sessionStats?: SessionRaceStats
): ProfileUpdateResult {
  const profile = { ...currentProfile };

  // 1. Update Game Counts
  profile.totalGamesPlayed += 1;
  const isWin = result.position === 1;
  const isPodium = result.position <= 3;

  if (isWin) {
    profile.totalWins += 1;
  }
  if (isPodium) {
    profile.totalPodiums += 1;
  }

  // Calculate Win Percentage
  profile.winPercentage = Math.round((profile.totalWins / profile.totalGamesPlayed) * 100);

  // Update records
  if (result.driftScore > 0) {
    profile.totalDriftScore += result.driftScore;
  }
  if (result.bestLapTime > 0 && (profile.bestLapRecord === 0 || result.bestLapTime < profile.bestLapRecord)) {
    profile.bestLapRecord = result.bestLapTime;
  }
  if (sessionStats && sessionStats.topSpeedKmH > profile.topSpeedRecord) {
    profile.topSpeedRecord = Math.round(sessionStats.topSpeedKmH);
  }

  // 2. XP Calculation
  let xpGained = 150; // base race completion
  if (result.completed) {
    xpGained += 100;
  }
  if (isWin) {
    xpGained += 400; // 1st place
  } else if (result.position === 2) {
    xpGained += 250; // 2nd place
  } else if (result.position === 3) {
    xpGained += 150; // 3rd place
  }

  // Drift Score XP conversion (1 XP per 25 drift pts, capped at 300 XP per race)
  if (result.driftScore > 0) {
    const driftXp = Math.min(300, Math.floor(result.driftScore / 25));
    xpGained += driftXp;
  }

  let currentXp = profile.currentXp + xpGained;
  let driverLevel = profile.driverLevel;
  let xpReq = profile.xpToNextLevel || getXpRequiredForLevel(driverLevel);
  let leveledUp = false;

  // Level-up loop
  while (currentXp >= xpReq) {
    currentXp -= xpReq;
    driverLevel += 1;
    xpReq = getXpRequiredForLevel(driverLevel);
    leveledUp = true;
  }

  profile.currentXp = currentXp;
  profile.driverLevel = driverLevel;
  profile.xpToNextLevel = xpReq;

  savePlayerProfile(profile);

  return {
    updatedProfile: profile,
    xpEarned: xpGained,
    leveledUp,
    newLevel: leveledUp ? driverLevel : undefined,
  };
}
