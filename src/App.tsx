import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { INITIAL_CARS, UPGRADE_TIER_COSTS } from './data/cars';
import {
  CameraView,
  CarConfig,
  CarDamageState,
  CarUpgrades,
  ControlInputs,
  GameMode,
  GameState,
  PlayerCarState,
  RaceResult,
  RaceSettings,
  DailyMission,
  PlayerProfile,
} from './types/game';
import {
  loadDailyMissions,
  saveDailyMissions,
  applySessionStatsToMissions,
  grantPendingDailyMissionCredits,
  getTodayDateString,
} from './game/dailyMissions';
import { getCarDamage, calculateRepairCost, repairCarDamage } from './game/damageSystem';
import { loadPlayerProfile, recordRaceToProfile } from './game/playerProfile';
import { sound } from './game/audio';
import { MainMenu } from './components/MainMenu';
import { RaceHUD } from './components/RaceHUD';
import { GarageModal } from './components/GarageModal';
import { PauseModal } from './components/PauseModal';
import { FinishModal } from './components/FinishModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistence: Player Credits and Upgrades
  const [playerCredits, setPlayerCredits] = useState<number>(() => {
    const saved = localStorage.getItem('nightfury_credits');
    return saved ? parseInt(saved, 10) : 15000;
  });

  const [carUpgrades, setCarUpgrades] = useState<Record<string, CarUpgrades>>(() => {
    const saved = localStorage.getItem('nightfury_upgrades');
    return saved ? JSON.parse(saved) : {};
  });

  // Selected Car
  const [selectedCar, setSelectedCar] = useState<CarConfig>(INITIAL_CARS[0]);

  // Settings
  const [settings, setSettings] = useState<RaceSettings>({
    mode: 'quick_race',
    totalLaps: 3,
    rivalCount: 3,
    trafficDensity: 'medium',
    timeLimitSeconds: 60,
    audioVolume: 0.8,
    musicVolume: 0.6,
    rainEffect: true,
    motionBlur: true,
  });

  // Game Flow State
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentMode, setCurrentMode] = useState<GameMode>('quick_race');
  const [cameraView, setCameraView] = useState<CameraView>('chase_close');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);

  // Live HUD Data
  const [carState, setCarState] = useState<PlayerCarState | null>(null);
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [bestLapTime, setBestLapTime] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  // Control Inputs for Touch UI
  const [touchInputs, setTouchInputs] = useState<ControlInputs>({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
    nitro: false,
  });

  // Persist credits
  useEffect(() => {
    localStorage.setItem('nightfury_credits', playerCredits.toString());
  }, [playerCredits]);

  // Persist upgrades
  useEffect(() => {
    localStorage.setItem('nightfury_upgrades', JSON.stringify(carUpgrades));
  }, [carUpgrades]);

  // Daily Missions
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>(() => loadDailyMissions().missions);
  const [bonusRewardNotice, setBonusRewardNotice] = useState<{ count: number; credits: number } | null>(null);

  // Car Damage State
  const [carDamage, setCarDamage] = useState<CarDamageState>(() => getCarDamage(selectedCar.id));

  // Player Career Profile (Games Played, Win Rate, Driver Level Progress)
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => loadPlayerProfile());

  // Sync callsign to 3D engine for reactive billboards & crowd banners
  useEffect(() => {
    if (engineRef.current && playerProfile.callsign) {
      engineRef.current.playerCallsign = playerProfile.callsign;
    }
  }, [playerProfile.callsign]);

  // Initialize 3D Engine
  useEffect(() => {
    if (!containerRef.current) return;

    sound.init();
    sound.setVolumes(settings.audioVolume, settings.musicVolume);

    const engine = new GameEngine(
      containerRef.current,
      selectedCar,
      carUpgrades,
      settings,
      {
        onStateUpdate: (state) => {
          setCarState(state);
          if (state.damage) {
            setCarDamage(state.damage);
          }
        },
        onLapComplete: (lap, lapTime) => {
          setCurrentLap(lap);
          if (bestLapTime === 0 || lapTime < bestLapTime) {
            setBestLapTime(lapTime);
          }
        },
        onRaceFinish: (result) => {
          setRaceResult(result);
          setGameState('finished');
          setPlayerCredits((prev) => prev + result.creditsEarned);

          const sessionStats = engineRef.current ? engineRef.current.getSessionStats(result.completed) : undefined;

          // Record race telemetry into career profile: games played, win rate, XP & level
          setPlayerProfile((prev) => {
            const { updatedProfile, leveledUp } = recordRaceToProfile(prev, result, sessionStats);
            if (leveledUp) {
              sound.playLevelUp();
            }
            return updatedProfile;
          });

          if (sessionStats) {
            setDailyMissions((prev) => {
              const { updatedMissions } = applySessionStatsToMissions(prev, sessionStats);
              saveDailyMissions({ date: getTodayDateString(), missions: updatedMissions });
              return updatedMissions;
            });
          }
        },
        onCheckpointPass: () => {
          // Checkpoint passed feedback
        },
        onCountdownTick: (val) => {
          setCountdown(val);
        },
      }
    );

    engine.playerCallsign = playerProfile.callsign;
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync elapsed time during racing
  useEffect(() => {
    let timer: number | null = null;
    if (gameState === 'racing' && engineRef.current) {
      timer = window.setInterval(() => {
        if (engineRef.current && engineRef.current.raceStartTime > 0) {
          setElapsedTime((performance.now() - engineRef.current.raceStartTime) / 1000);
        }
      }, 50);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState]);

  // Update Settings in Engine and Sound
  const handleUpdateSettings = (newSettings: Partial<RaceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      sound.setVolumes(updated.audioVolume, updated.musicVolume);
      if (engineRef.current) {
        engineRef.current.updateSettings(newSettings);
      }
      return updated;
    });
  };

  // Car Upgrades Logic
  const handleUpgrade = (carId: string, category: keyof CarUpgrades) => {
    const current = carUpgrades[carId] || { engine: 0, handling: 0, brakes: 0, nitro: 0, topSpeed: 0 };
    const currentTier = current[category];
    if (currentTier >= 4) return;

    const cost = UPGRADE_TIER_COSTS[currentTier];
    if (playerCredits < cost) return;

    setPlayerCredits((prev) => prev - cost);
    const newUpgrades = {
      ...carUpgrades,
      [carId]: {
        ...current,
        [category]: currentTier + 1,
      },
    };
    setCarUpgrades(newUpgrades);

    if (engineRef.current) {
      engineRef.current.carUpgrades = newUpgrades;
      engineRef.current.physics.upgrades = newUpgrades[carId];
    }
  };

  // Car Selection
  const handleSelectCar = (car: CarConfig) => {
    setSelectedCar(car);
    const damage = getCarDamage(car.id);
    setCarDamage(damage);
    if (engineRef.current) {
      engineRef.current.changeCar(car);
    }
  };

  // Repair Car in Garage
  const handleRepairCar = (carId: string) => {
    const cost = calculateRepairCost(carDamage, selectedCar.tier);
    if (playerCredits < cost || cost === 0) return;

    setPlayerCredits((prev) => prev - cost);
    sound.playRepairSound();

    if (engineRef.current) {
      const restored = engineRef.current.repairCurrentCar();
      setCarDamage(restored);
    } else {
      const restored = repairCarDamage(carId);
      setCarDamage(restored);
    }
  };

  // Paint Customization
  const handleUpdatePaint = (color: string, glow: string) => {
    setSelectedCar((prev) => ({ ...prev, primaryColor: color, glowColor: glow }));
    if (engineRef.current) {
      engineRef.current.updatePaint(color, glow);
    }
  };

  // Start Race Event
  const handleStartRace = (modeToStart: GameMode = currentMode) => {
    sound.resume();
    setBonusRewardNotice(null);
    setCurrentMode(modeToStart);
    setGameState('racing');
    setElapsedTime(0);
    setCurrentLap(1);
    setBestLapTime(0);
    setRaceResult(null);

    if (engineRef.current) {
      engineRef.current.gameState = 'countdown';
      engineRef.current.startRace(modeToStart);
    }
  };

  // Return to Main Menu with daily missions payout & sync
  const handleReturnToMenu = (evaluateIncompleteSession: boolean = false) => {
    if (evaluateIncompleteSession && engineRef.current) {
      const sessionStats = engineRef.current.getSessionStats(false);
      setDailyMissions((prev) => {
        const { updatedMissions } = applySessionStatsToMissions(prev, sessionStats);
        return updatedMissions;
      });
    }

    setDailyMissions((currentMissions) => {
      const { updatedMissions, totalCreditsGranted, newlyClaimedMissions } =
        grantPendingDailyMissionCredits(currentMissions);

      if (totalCreditsGranted > 0) {
        setPlayerCredits((prev) => prev + totalCreditsGranted);
        setBonusRewardNotice({
          count: newlyClaimedMissions.length,
          credits: totalCreditsGranted,
        });
        sound.playMissionReward();
      }

      saveDailyMissions({ date: getTodayDateString(), missions: updatedMissions });
      return updatedMissions;
    });

    setGameState('menu');
    if (engineRef.current) {
      engineRef.current.gameState = 'menu';
      engineRef.current.physics.resetToTrack(0);
      sound.stopMusic();
    }
  };

  // Touch Control Change
  const handleTouchControl = useCallback((key: keyof ControlInputs, value: boolean) => {
    setTouchInputs((prev: ControlInputs) => ({ ...prev, [key]: value }));
    if (engineRef.current) {
      engineRef.current.setControl(key, value);
    }
  }, []);

  // Audio Mute Toggle
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Camera Cycle
  const handleCycleCamera = () => {
    if (engineRef.current) {
      const nextView = engineRef.current.racingCam.cycleView();
      setCameraView(nextView);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div id="threejs-racing-viewport" ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle CRT / Cyberpunk scanline aesthetic overlay */}
      <div className="absolute inset-0 pointer-events-none scanlines z-10 opacity-60" />

      {/* UI State Router */}
      {gameState === 'menu' && (
        <MainMenu
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          selectedCar={selectedCar}
          onStartGame={() => handleStartRace(currentMode)}
          onOpenGarage={() => {
            setGameState('garage');
            if (engineRef.current) engineRef.current.gameState = 'garage';
          }}
          onOpenSettings={() => setGameState('settings')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          playerCredits={playerCredits}
          dailyMissions={dailyMissions}
          bonusRewardNotice={bonusRewardNotice}
          onDismissNotice={() => setBonusRewardNotice(null)}
          playerProfile={playerProfile}
          onUpdateProfile={setPlayerProfile}
        />
      )}

      {gameState === 'garage' && (
        <GarageModal
          selectedCar={selectedCar}
          onSelectCar={handleSelectCar}
          carUpgrades={carUpgrades}
          onUpgrade={handleUpgrade}
          playerCredits={playerCredits}
          onUpdatePaint={handleUpdatePaint}
          onBackToMenu={() => handleReturnToMenu(false)}
          onStartRace={() => handleStartRace(currentMode)}
          onToggleAutoRotate={() => setIsAutoRotate(!isAutoRotate)}
          isAutoRotate={isAutoRotate}
          damageState={carDamage}
          onRepairCar={handleRepairCar}
        />
      )}

      {gameState === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => handleReturnToMenu(false)}
        />
      )}

      {(gameState === 'racing' || gameState === 'countdown') && carState && engineRef.current && (
        <RaceHUD
          carState={carState}
          track={engineRef.current.track}
          rivals={engineRef.current.aiSystem.rivals}
          traffic={engineRef.current.aiSystem.traffic}
          mode={currentMode}
          currentLap={currentLap}
          totalLaps={settings.totalLaps}
          elapsedTime={elapsedTime}
          bestLapTime={bestLapTime}
          position={carState.position}
          countdown={countdown}
          cameraView={cameraView}
          isMuted={isMuted}
          checkpointTimer={engineRef.current.checkpointTimer}
          inputs={touchInputs}
          onControlChange={handleTouchControl}
          onPause={() => {
            setGameState('paused');
            if (engineRef.current) engineRef.current.pauseRace();
          }}
          onCycleCamera={handleCycleCamera}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'paused' && (
        <PauseModal
          onResume={() => {
            setGameState('racing');
            if (engineRef.current) engineRef.current.resumeRace();
          }}
          onRestart={() => handleStartRace(currentMode)}
          onQuit={() => handleReturnToMenu(true)}
          cameraView={cameraView}
          onCycleCamera={handleCycleCamera}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'finished' && raceResult && (
        <FinishModal
          result={raceResult}
          mode={currentMode}
          onRestart={() => handleStartRace(currentMode)}
          onGarage={() => {
            setGameState('garage');
            if (engineRef.current) engineRef.current.gameState = 'garage';
          }}
          onMenu={() => handleReturnToMenu(false)}
        />
      )}
    </main>
  );
}
