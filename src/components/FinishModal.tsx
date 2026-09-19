import React from 'react';
import { Trophy, RotateCcw, Home, Wrench, Flame, Clock } from 'lucide-react';
import { GameMode, RaceResult } from '../types/game';
import { sound } from '../game/audio';

interface FinishModalProps {
  result: RaceResult;
  mode: GameMode;
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
}

export const FinishModal: React.FC<FinishModalProps> = ({
  result,
  mode,
  onRestart,
  onGarage,
  onMenu,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const isPodium = result.position <= 3;
  const isWinner = result.position === 1;

  return (
    <div id="finish-screen-modal" className="absolute inset-0 z-40 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-zinc-950 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.3)] text-center animate-scale-in">
        {/* Header Ribbon */}
        <div className="flex flex-col items-center mb-6">
          <div className={`p-4 rounded-full mb-3 ${isWinner ? 'bg-amber-500/20 text-amber-400 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.5)]' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50'}`}>
            <Trophy className="w-10 h-10" />
          </div>

          <span className="text-xs font-display font-bold tracking-widest text-cyan-400 uppercase">
            {result.completed ? 'RACE FINISHED' : 'TIME EXPIRED'}
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-black text-white tracking-wide mt-1">
            {mode === 'quick_race'
              ? isWinner
                ? 'VICTORY!'
                : `${result.position}${result.position === 2 ? 'ND' : result.position === 3 ? 'RD' : 'TH'} PLACE`
              : 'COURSE CLEAR!'}
          </h2>
          <p className="text-xs text-zinc-400 font-hud mt-1">
            NIGHTFURY METROPOLITAN CIRCUIT
          </p>
        </div>

        {/* Results Bento Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          {/* Total Time */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display text-zinc-400 uppercase">TOTAL TIME</span>
              <div className="font-display text-base font-bold text-white">
                {formatTime(result.totalTime)}
              </div>
            </div>
          </div>

          {/* Best Lap */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display text-zinc-400 uppercase">BEST LAP</span>
              <div className="font-display text-base font-bold text-emerald-400">
                {result.bestLapTime > 0 ? formatTime(result.bestLapTime) : '--:--.--'}
              </div>
            </div>
          </div>

          {/* Drift Score */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display text-zinc-400 uppercase">DRIFT SCORE</span>
              <div className="font-display text-base font-bold text-amber-400">
                +{result.driftScore.toLocaleString()} PTS
              </div>
            </div>
          </div>

          {/* Credits Awarded */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-display text-zinc-400 uppercase">CREDITS EARNED</span>
              <div className="font-display text-base font-black text-amber-300">
                +${result.creditsEarned.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="finish-btn-restart"
            type="button"
            onClick={() => { sound.playUIClick(); onRestart(); }}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-display font-black text-sm tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            <RotateCcw className="w-4 h-4" />
            RACE AGAIN
          </button>

          <button
            id="finish-btn-garage"
            type="button"
            onClick={() => { sound.playUIClick(); onGarage(); }}
            className="flex-1 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-display font-bold text-sm tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            TUNE IN GARAGE
          </button>

          <button
            id="finish-btn-menu"
            type="button"
            onClick={() => { sound.playUIClick(); onMenu(); }}
            className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-display font-bold text-sm tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
            title="Main Menu"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
