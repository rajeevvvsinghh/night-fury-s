import React from 'react';
import { DailyMission } from '../types/game';
import {
  Target,
  CheckCircle2,
  Clock,
  Trophy,
  Zap,
  Flame,
  Flag,
  Gauge,
  Sparkles,
  X,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { sound } from '../game/audio';
import { getTimeUntilDailyReset } from '../game/dailyMissions';

interface DailyMissionsOverlayProps {
  missions: DailyMission[];
  isOpen: boolean;
  onClose: () => void;
  onStartRace?: () => void;
}

export const DailyMissionsOverlay: React.FC<DailyMissionsOverlayProps> = ({
  missions,
  isOpen,
  onClose,
  onStartRace,
}) => {
  if (!isOpen) return null;

  const completedCount = missions.filter((m) => m.completed).length;
  const totalMissions = missions.length;
  const allCompleted = completedCount === totalMissions && totalMissions > 0;
  const resetTime = getTimeUntilDailyReset();
  const totalPotentialCredits = missions.reduce((acc, m) => acc + m.rewardCredits, 0);
  const earnedCredits = missions
    .filter((m) => m.completed)
    .reduce((acc, m) => acc + m.rewardCredits, 0);

  const getMissionIcon = (type: DailyMission['type']) => {
    switch (type) {
      case 'drift_distance':
      case 'drift_points':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'finish_races':
      case 'win_race':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'reach_top_speed':
        return <Gauge className="w-5 h-5 text-cyan-400" />;
      case 'use_nitro':
        return <Zap className="w-5 h-5 text-sky-400" />;
      case 'pass_checkpoints':
        return <Flag className="w-5 h-5 text-emerald-400" />;
      default:
        return <Target className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div
      id="daily-missions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="daily-missions-modal-container"
        className="relative w-full max-w-2xl bg-zinc-950/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 bg-gradient-to-r from-cyan-950/40 via-zinc-900/40 to-transparent flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  SYNDICATE OPS
                </span>
                <span className="flex items-center gap-1 text-[11px] font-display text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  RESETS IN {resetTime}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide mt-1">
                DAILY <span className="text-cyan-400">MISSIONS</span>
              </h2>
              <p className="text-xs text-zinc-400 font-hud mt-0.5">
                Complete daily race objectives to earn bonus syndicate credits
              </p>
            </div>
          </div>

          <button
            id="daily-missions-close-btn"
            type="button"
            onClick={() => {
              sound.playUIClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Overview Strip */}
        <div className="px-5 sm:px-6 py-3.5 bg-zinc-900/50 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-display font-bold text-zinc-300">PROGRESS:</span>
              <span
                className={`font-display text-sm font-black ${
                  allCompleted ? 'text-emerald-400' : 'text-cyan-400'
                }`}
              >
                {completedCount} / {totalMissions} COMPLETED
              </span>
            </div>
            {allCompleted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Sparkles className="w-3 h-3" /> ALL CLEAR
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-display text-zinc-400">EARNED TODAY:</span>
            <span className="text-xs font-display font-black text-amber-300">
              ${earnedCredits.toLocaleString()} / ${totalPotentialCredits.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Missions List */}
        <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          {missions.map((mission) => {
            const progressPercent = Math.min(100, Math.round((mission.current / mission.target) * 100));
            const isFinished = mission.completed;

            return (
              <div
                key={mission.id}
                id={`mission-card-${mission.id}`}
                className={`p-4 rounded-xl border transition-all ${
                  isFinished
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isFinished
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {getMissionIcon(mission.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black text-sm sm:text-base text-white tracking-wide">
                          {mission.title}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 font-hud mt-0.5">
                        {mission.description}
                      </p>
                    </div>
                  </div>

                  {/* Reward & Status Badges */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-display font-black tracking-wider">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      +${mission.rewardCredits.toLocaleString()}
                    </div>

                    {isFinished ? (
                      <span
                        id={`mission-status-${mission.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[11px] font-display font-black tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        COMPLETED
                      </span>
                    ) : (
                      <span
                        id={`mission-status-${mission.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-display font-semibold tracking-wide"
                      >
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Value Metrics */}
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[11px] font-display mb-1.5">
                    <span className="text-zinc-400 uppercase tracking-wider">
                      PROGRESS
                    </span>
                    <span className="font-bold text-zinc-200">
                      {mission.current.toLocaleString()} / {mission.target.toLocaleString()}{' '}
                      <span className="text-zinc-400">{mission.unit}</span>
                      <span className="ml-2 text-cyan-400">({progressPercent}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinished
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 font-hud hidden sm:block">
            Missions refresh daily at midnight. Rewards are credited upon return to menu.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              id="daily-missions-dismiss-btn"
              type="button"
              onClick={() => {
                sound.playUIClick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 hover:text-white font-display text-xs font-bold transition-all active:scale-95"
            >
              CLOSE
            </button>

            {onStartRace && (
              <button
                id="daily-missions-drive-btn"
                type="button"
                onClick={() => {
                  sound.playUIClick();
                  onClose();
                  onStartRace();
                }}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-display font-black text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 uppercase"
              >
                <span>HIT THE TRACK</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
