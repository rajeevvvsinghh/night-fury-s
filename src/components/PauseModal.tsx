import React from 'react';
import { Play, RotateCcw, Home, Camera, Volume2, VolumeX } from 'lucide-react';
import { CameraView } from '../types/game';
import { sound } from '../game/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  cameraView: CameraView;
  onCycleCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuit,
  cameraView,
  onCycleCamera,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div id="pause-modal-backdrop" className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-center">
        <span className="text-[10px] font-display text-cyan-400 font-bold tracking-widest uppercase">
          EVENT PAUSED
        </span>
        <h2 className="font-display text-3xl font-black text-white mt-1 mb-6 tracking-wide">
          RACE STANDBY
        </h2>

        <div className="space-y-3">
          <button
            id="pause-btn-resume"
            type="button"
            onClick={() => { sound.playUIClick(); onResume(); }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-display font-black text-sm tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            <Play className="w-4 h-4 fill-black" />
            RESUME RACE
          </button>

          <button
            id="pause-btn-restart"
            type="button"
            onClick={() => { sound.playUIClick(); onRestart(); }}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-display font-bold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            RESTART RACE
          </button>

          <button
            id="pause-btn-camera"
            type="button"
            onClick={() => { sound.playUIClick(); onCycleCamera(); }}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-display font-bold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            CAMERA: {cameraView.replace('_', ' ')}
          </button>

          <button
            id="pause-btn-mute"
            type="button"
            onClick={() => { sound.playUIClick(); onToggleMute(); }}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-display font-bold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
          </button>

          <button
            id="pause-btn-quit"
            type="button"
            onClick={() => { sound.playUIClick(); onQuit(); }}
            className="w-full py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 font-display font-bold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 uppercase mt-4"
          >
            <Home className="w-4 h-4" />
            QUIT TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
