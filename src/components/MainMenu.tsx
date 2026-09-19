import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GameMode, CarConfig, DailyMission, PlayerProfile } from '../types/game';
import {
  Play,
  Wrench,
  Settings,
  Trophy,
  Timer,
  Flag,
  Volume2,
  VolumeX,
  Target,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  User,
} from 'lucide-react';
import { sound } from '../game/audio';
import { DailyMissionsOverlay } from './DailyMissionsOverlay';
import { PlayerProfileModal } from './PlayerProfileModal';

interface MainMenuProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  selectedCar: CarConfig;
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  playerCredits: number;
  dailyMissions: DailyMission[];
  bonusRewardNotice?: { count: number; credits: number } | null;
  onDismissNotice?: () => void;
  playerProfile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  currentMode,
  onSelectMode,
  selectedCar,
  onStartGame,
  onOpenGarage,
  onOpenSettings,
  isMuted,
  onToggleMute,
  playerCredits,
  dailyMissions,
  bonusRewardNotice,
  onDismissNotice,
  playerProfile,
  onUpdateProfile,
}) => {
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const completedCount = dailyMissions.filter((m) => m.completed).length;
  const allCompleted = completedCount === dailyMissions.length && dailyMissions.length > 0;
  const profileProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((playerProfile.currentXp / (playerProfile.xpToNextLevel || 500)) * 100))
  );

  const modes: { id: GameMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'quick_race',
      label: 'QUICK RACE',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      desc: '3 Laps against 3 elite AI rival street racers and active night traffic.',
    },
    {
      id: 'time_trial',
      label: 'TIME TRIAL',
      icon: <Timer className="w-5 h-5 text-cyan-400" />,
      desc: 'Beat the clock, set new lap records, and master ideal corner apex lines.',
    },
    {
      id: 'checkpoint_race',
      label: 'CHECKPOINT RUSH',
      icon: <Flag className="w-5 h-5 text-rose-400" />,
      desc: 'Race against an aggressive countdown timer by passing through neon checkpoint gates.',
    },
  ];

  return (
    <>
      <div id="main-menu-overlay" className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-10 select-none">
        {/* Top Bar: Title & Stats */}
        <div className="flex justify-between items-start w-full">
          <motion.div
            initial={{ opacity: 0, x: -25, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] font-display font-bold tracking-widest text-cyan-400 uppercase">
                CYBER STREET RACING CIRCUIT
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-6xl font-black text-white tracking-wider drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
              NIGHT<span className="text-cyan-400">FURY</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-hud tracking-widest uppercase">
              STREET RACING // TOKYO UNDERGROUND
            </p>
          </motion.div>

          {/* Player Stats & Actions */}
          <motion.div
            initial={{ opacity: 0, x: 25, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto flex-wrap sm:flex-nowrap justify-end"
          >
            {/* Player Profile Header Trigger Button */}
            <motion.button
              id="menu-btn-profile"
              type="button"
              onClick={() => {
                sound.playUIClick();
                setIsProfileOpen(true);
              }}
              whileHover={{ scale: 1.03, y: -2, borderColor: 'rgba(6,182,212,0.85)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-black/80 hover:bg-zinc-900 border border-cyan-500/40 text-white backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.25)] group cursor-pointer"
              title="Driver Profile & Career Telemetry"
            >
              {/* Avatar Icon with Level Badge */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-950 to-zinc-900 border border-cyan-400/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:border-cyan-300 transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-cyan-500 text-black font-display font-black text-[8px] rounded leading-none shadow">
                  L{playerProfile.driverLevel}
                </span>
              </div>

              {/* Identity, Level Progress Bar, Games & Win Rate */}
              <div className="flex flex-col text-left min-w-[120px] sm:min-w-[140px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] sm:text-[11px] font-display font-black text-white truncate max-w-[85px] sm:max-w-[100px] tracking-wide">
                    {playerProfile.callsign}
                  </span>
                  <span className="text-[9px] font-display text-cyan-400 font-bold tracking-wider">
                    LVL {playerProfile.driverLevel}
                  </span>
                </div>

                {/* Driver Level Progress Bar */}
                <div className="w-full h-1.5 bg-zinc-800/90 rounded-full overflow-hidden my-1 border border-zinc-700/50 relative">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                    style={{ width: `${profileProgressPercent}%` }}
                  />
                </div>

                {/* Games Played & Total Win % */}
                <div className="flex items-center justify-between text-[9px] font-display text-zinc-400 leading-none">
                  <span>
                    GAMES: <strong className="text-zinc-200">{playerProfile.totalGamesPlayed}</strong>
                  </span>
                  <span className="text-zinc-600 font-bold">•</span>
                  <span>
                    WIN: <strong className="text-amber-400 font-bold">{playerProfile.winPercentage}%</strong>
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Daily Missions Header Trigger Button */}
            <motion.button
              id="menu-btn-missions"
              type="button"
              onClick={() => {
                sound.playUIClick();
                setIsMissionsOpen(true);
              }}
              whileHover={{ scale: 1.03, y: -2, borderColor: 'rgba(6,182,212,0.85)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-black/80 hover:bg-zinc-900 border border-cyan-500/40 text-white backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)] group cursor-pointer"
              title="View Daily Missions"
            >
              <Target className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-display text-cyan-400 font-bold tracking-wider leading-none">
                  DAILY MISSIONS
                </span>
                <span className="text-xs font-display font-black text-zinc-200 leading-tight">
                  {completedCount}/{dailyMissions.length} COMPLETED
                </span>
              </div>
              {allCompleted ? (
                <span className="flex items-center text-[10px] font-display text-emerald-400 font-bold ml-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 text-emerald-400" />
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1" />
              )}
            </motion.button>

            {/* Credits Display */}
            <motion.div
              whileHover={{ scale: 1.03, borderColor: 'rgba(245,158,11,0.8)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
              transition={{ duration: 0.18 }}
              className="bg-black/80 border border-amber-500/40 rounded-xl px-3.5 sm:px-4 py-2 backdrop-blur-md shadow-lg flex items-center gap-2 transition-colors cursor-default"
            >
              <span className="text-[10px] font-display text-amber-400 font-bold">CREDITS:</span>
              <span className="font-display text-sm sm:text-base font-black text-amber-300">
                ${playerCredits.toLocaleString()}
              </span>
            </motion.div>

            {/* Mute Audio Button */}
            <motion.button
              id="menu-btn-mute"
              type="button"
              onClick={onToggleMute}
              whileHover={{ scale: 1.08, borderColor: 'rgba(6,182,212,0.7)', boxShadow: '0 0 15px rgba(6,182,212,0.3)' }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.18 }}
              className="p-2.5 rounded-xl bg-black/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white backdrop-blur-md cursor-pointer"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </motion.button>
          </motion.div>
        </div>

        {/* Middle Center: Mode Selection Bento & Missions Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-4xl mx-auto my-auto pointer-events-auto"
        >
          {/* Bonus Reward Notification Banner */}
          {bonusRewardNotice && (
            <motion.div
              id="menu-bonus-award-banner"
              initial={{ opacity: 0, y: -15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.01, boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}
              transition={{ duration: 0.3 }}
              className="mb-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/90 via-zinc-900/90 to-cyan-950/90 border border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-display font-bold text-emerald-400 tracking-wider uppercase">
                    DAILY OBJECTIVE ACCOMPLISHED
                  </div>
                  <div className="text-xs sm:text-sm font-display font-black text-white">
                    +{bonusRewardNotice.count} Daily Mission{bonusRewardNotice.count > 1 ? 's' : ''} Completed! Awarded +${bonusRewardNotice.credits.toLocaleString()} Bonus Credits
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    sound.playUIClick();
                    if (onDismissNotice) onDismissNotice();
                    setIsMissionsOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  VIEW MISSIONS
                </motion.button>
              </div>
            </motion.div>
          )}

          <div className="mb-3 text-center sm:text-left">
            <span className="text-xs font-display font-bold text-zinc-400 tracking-widest uppercase">
              SELECT EVENT MODE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modes.map((m, index) => {
              const isSelected = currentMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{
                    scale: 1.03,
                    y: -3,
                    borderColor: isSelected ? '#22d3ee' : '#71717a',
                    boxShadow: isSelected
                      ? '0 0 28px rgba(6,182,212,0.5)'
                      : '0 8px 20px rgba(0,0,0,0.6)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { sound.playUIClick(); onSelectMode(m.id); }}
                  className={`p-4 sm:p-5 rounded-2xl border text-left backdrop-blur-md cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-black/75 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-cyan-500/30' : 'bg-zinc-800'}`}>
                      {m.icon}
                    </div>
                    <span className={`font-display font-black text-sm sm:text-base tracking-wider ${isSelected ? 'text-cyan-300' : 'text-zinc-200'}`}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-hud leading-relaxed">
                    {m.desc}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Selected Car Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ borderColor: 'rgba(6,182,212,0.4)', boxShadow: '0 0 20px rgba(6,182,212,0.15)' }}
            className="mt-3 p-3 bg-black/70 border border-zinc-800 rounded-xl backdrop-blur-md flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCar.glowColor }} />
              <div>
                <span className="text-[10px] font-display text-zinc-400 uppercase">ACTIVE MACHINE</span>
                <div className="font-display font-black text-sm text-white">{selectedCar.name}</div>
              </div>
            </div>
            <motion.button
              id="menu-btn-garage-quick"
              type="button"
              whileHover={{ scale: 1.08, color: '#67e8f9' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => { sound.playUIClick(); onOpenGarage(); }}
              className="text-xs font-display text-cyan-400 font-bold underline cursor-pointer"
            >
              CHANGE IN GARAGE
            </motion.button>
          </motion.div>

          {/* Daily Missions Quick Preview Bar */}
          <motion.div
            id="menu-missions-teaser"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              scale: 1.015,
              y: -2,
              borderColor: 'rgba(6,182,212,0.7)',
              boxShadow: '0 0 25px rgba(6,182,212,0.25)',
            }}
            whileTap={{ scale: 0.985 }}
            onClick={() => {
              sound.playUIClick();
              setIsMissionsOpen(true);
            }}
            className="mt-3 p-3 bg-black/75 hover:bg-zinc-900/90 border border-cyan-500/30 rounded-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 group-hover:bg-cyan-500/30 transition-colors">
                <Target className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-display font-bold text-cyan-400 uppercase tracking-wider">
                    DAILY OBJECTIVES
                  </span>
                  <span className="text-[10px] font-display text-zinc-400">
                    ({completedCount}/{dailyMissions.length} COMPLETED)
                  </span>
                </div>
                <div className="text-xs font-display text-zinc-200 line-clamp-1">
                  {dailyMissions.find((m) => !m.completed)
                    ? `Next: ${dailyMissions.find((m) => !m.completed)?.title} — ${dailyMissions.find((m) => !m.completed)?.description}`
                    : 'All daily objectives completed! Bonus credits secured.'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-display text-cyan-400 font-bold group-hover:text-cyan-300 whitespace-nowrap">
              <span>VIEW MISSIONS</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Controls Bar */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 pointer-events-auto">
          {/* Keyboard Controls Reminder */}
          <motion.div
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ borderColor: 'rgba(6,182,212,0.4)', boxShadow: '0 0 15px rgba(6,182,212,0.15)' }}
            className="hidden sm:flex items-center gap-4 text-[11px] font-display text-zinc-400 bg-black/70 px-4 py-2 rounded-xl border border-zinc-800 backdrop-blur-md transition-colors cursor-default"
          >
            <span><strong className="text-zinc-200">W / ↑</strong> GAS</span>
            <span><strong className="text-zinc-200">S / ↓</strong> BRAKE</span>
            <span><strong className="text-zinc-200">A / D</strong> STEER</span>
            <span><strong className="text-rose-400">SPACE</strong> DRIFT</span>
            <span><strong className="text-cyan-400">SHIFT</strong> NITRO</span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.45, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 w-full sm:w-auto"
          >
            <motion.button
              id="menu-btn-garage"
              type="button"
              whileHover={{ scale: 1.05, y: -2, borderColor: '#f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.35)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.18 }}
              onClick={() => { sound.playUIClick(); onOpenGarage(); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-display text-sm font-bold tracking-wider backdrop-blur-md cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              GARAGE
            </motion.button>

            <motion.button
              id="menu-btn-settings"
              type="button"
              whileHover={{ scale: 1.08, rotate: 12, borderColor: '#22d3ee', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.18 }}
              onClick={() => { sound.playUIClick(); onOpenSettings(); }}
              className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white backdrop-blur-md cursor-pointer"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-cyan-400" />
            </motion.button>

            <motion.button
              id="menu-btn-play"
              type="button"
              whileHover={{
                scale: 1.04,
                y: -2,
                boxShadow: '0 0 40px rgba(6,182,212,0.9), 0 0 15px rgba(56,189,248,0.7)',
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={() => { sound.playUIClick(); onStartGame(); }}
              className="flex-2 sm:flex-none flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-display font-black text-base tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.7)] uppercase cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" />
              START RACE
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Daily Missions UI Overlay */}
      <DailyMissionsOverlay
        missions={dailyMissions}
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        onStartRace={() => {
          setIsMissionsOpen(false);
          onStartGame();
        }}
      />

      {/* Driver Player Profile Modal */}
      <PlayerProfileModal
        profile={playerProfile}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdateProfile={onUpdateProfile}
        onStartRace={() => {
          setIsProfileOpen(false);
          onStartGame();
        }}
      />
    </>
  );
};

