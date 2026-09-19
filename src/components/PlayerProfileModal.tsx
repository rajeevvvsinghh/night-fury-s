import React, { useState } from 'react';
import {
  X,
  User,
  Trophy,
  Award,
  Flame,
  Gauge,
  Timer,
  Zap,
  CheckCircle2,
  Edit2,
  Check,
  ChevronRight,
  Shield,
  Play,
} from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { getDriverTitle, savePlayerProfile } from '../game/playerProfile';
import { sound } from '../game/audio';

interface PlayerProfileModalProps {
  profile: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
  onStartRace?: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onUpdateProfile,
  onStartRace,
}) => {
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [callsignInput, setCallsignInput] = useState(profile.callsign);

  if (!isOpen) return null;

  const titleInfo = getDriverTitle(profile.driverLevel);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((profile.currentXp / (profile.xpToNextLevel || 500)) * 100))
  );
  const xpRemaining = Math.max(0, (profile.xpToNextLevel || 500) - profile.currentXp);

  const formatLapTime = (secs: number) => {
    if (!secs || secs === 0) return '--:--.--';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleSaveCallsign = () => {
    const trimmed = callsignInput.trim().toUpperCase().slice(0, 16) || 'GHOST_RACER';
    const updated = { ...profile, callsign: trimmed };
    onUpdateProfile(updated);
    savePlayerProfile(updated);
    setIsEditingCallsign(false);
    sound.playUIClick();
  };

  return (
    <div
      id="player-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="player-profile-modal"
        className="w-full max-w-2xl bg-zinc-950/95 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-5 text-white overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Cyber Grid Glow Background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-display font-bold tracking-widest text-zinc-400 uppercase">
                  PILOT DOSSIER // TELEMETRY ARCHIVE
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-wider">
                DRIVER PROFILE
              </h2>
            </div>
          </div>

          <button
            id="profile-modal-close-btn"
            type="button"
            onClick={() => {
              sound.playUIClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity & Level Progress Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Callsign & Rank Title */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-950 to-zinc-900 border-2 border-cyan-400/60 flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <span className="text-[9px] font-display font-bold text-cyan-400">LVL</span>
                <span className="font-display font-black text-xl text-white leading-none">
                  {profile.driverLevel}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  {isEditingCallsign ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={callsignInput}
                        onChange={(e) => setCallsignInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCallsign();
                          if (e.key === 'Escape') setIsEditingCallsign(false);
                        }}
                        maxLength={16}
                        autoFocus
                        className="bg-black/90 border border-cyan-400 rounded-lg px-2.5 py-1 text-sm font-display font-black text-white uppercase focus:outline-none focus:ring-1 focus:ring-cyan-300 w-36"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCallsign}
                        className="p-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer"
                        title="Save Callsign"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-lg sm:text-xl text-white tracking-wider">
                        {profile.callsign}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playUIClick();
                          setIsEditingCallsign(true);
                        }}
                        className="text-zinc-500 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
                        title="Edit Callsign"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[11px] font-display font-black tracking-widest uppercase px-2 py-0.5 rounded-md border"
                    style={{
                      color: titleInfo.color,
                      borderColor: `${titleInfo.color}40`,
                      backgroundColor: `${titleInfo.color}15`,
                    }}
                  >
                    {titleInfo.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2 bg-black/60 border border-zinc-800/80 rounded-xl px-3 py-2 self-start sm:self-auto">
              <Shield className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div className="text-[9px] font-display text-zinc-400 uppercase tracking-wider">
                  CAREER STATUS
                </div>
                <div className="text-xs font-display font-black text-zinc-200">
                  ACTIVE STREET PILOT
                </div>
              </div>
            </div>
          </div>

          {/* Driver Level Progress Bar */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-xs font-display">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                DRIVER LEVEL PROGRESS
              </span>
              <span className="text-cyan-300 font-black">
                {profile.currentXp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP ({progressPercent}%)
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-3.5 bg-black/90 rounded-full overflow-hidden p-0.5 border border-zinc-800 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-display text-zinc-400">
              <span>{xpRemaining.toLocaleString()} XP required for Level {profile.driverLevel + 1}</span>
              <span className="text-cyan-400 font-bold">NEXT RANK: LEVEL {profile.driverLevel + 1}</span>
            </div>
          </div>
        </div>

        {/* Core Career Telemetry Grid (Featuring total games played, total win %, wins, etc.) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Games Played */}
          <div
            id="profile-stat-games-played"
            className="bg-black/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
                GAMES PLAYED
              </span>
              <div className="p-1.5 rounded-lg bg-zinc-800/80 text-cyan-400">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-black text-white tracking-wide">
                {profile.totalGamesPlayed}
              </div>
              <div className="text-[10px] font-display text-zinc-400 mt-0.5">
                Total Events Entered
              </div>
            </div>
          </div>

          {/* Total Win Percentage */}
          <div
            id="profile-stat-win-percentage"
            className="bg-black/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
                WIN PERCENTAGE
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-black text-amber-300 tracking-wide">
                {profile.winPercentage}%
              </div>
              <div className="text-[10px] font-display text-zinc-400 mt-0.5">
                {profile.totalWins} Victory{profile.totalWins === 1 ? '' : 'ies'} Total
              </div>
            </div>
          </div>

          {/* Total Podiums */}
          <div
            id="profile-stat-podiums"
            className="bg-black/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
                PODIUM FINISHES
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-black text-emerald-400 tracking-wide">
                {profile.totalPodiums}
              </div>
              <div className="text-[10px] font-display text-zinc-400 mt-0.5">
                Top 3 Placements
              </div>
            </div>
          </div>

          {/* Drift Points Record */}
          <div
            id="profile-stat-drift"
            className="bg-black/70 border border-zinc-800/90 rounded-2xl p-3.5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-rose-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-display font-bold text-zinc-400 uppercase tracking-wider">
                DRIFT SCORE
              </span>
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-display text-2xl sm:text-3xl font-black text-rose-300 tracking-wide">
                {profile.totalDriftScore.toLocaleString()}
              </div>
              <div className="text-[10px] font-display text-zinc-400 mt-0.5">
                Cumulative Drift Pts
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Telemetry: Lap Record & Top Speed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-display text-zinc-400 uppercase">TOP SPEED RECORD</span>
                <div className="font-display text-base font-bold text-white">
                  {profile.topSpeedRecord > 0 ? `${profile.topSpeedRecord} KM/H` : '0 KM/H'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-display text-cyan-400/80 uppercase font-bold">RADAR TRAP</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-display text-zinc-400 uppercase">BEST LAP RECORD</span>
                <div className="font-display text-base font-bold text-emerald-400">
                  {formatLapTime(profile.bestLapRecord)}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-display text-emerald-400/80 uppercase font-bold">CIRCUIT APEX</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <div className="text-xs font-display text-zinc-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Telemetry automatically logged after each street event.</span>
          </div>

          <div className="flex items-center gap-2">
            {onStartRace && (
              <button
                type="button"
                onClick={() => {
                  sound.playUIClick();
                  onClose();
                  onStartRace();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-display font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                RACE NOW
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                sound.playUIClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-display font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
