import React from 'react';
import { ChevronLeft, ChevronRight, Zap, Flame } from 'lucide-react';
import { ControlInputs } from '../game/physics';

interface TouchControlsProps {
  onControlChange: (key: keyof ControlInputs, value: boolean) => void;
  inputs: ControlInputs;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onControlChange,
  inputs,
}) => {
  return (
    <div id="touch-controls-layer" className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-end p-4 pb-6 sm:pb-8">
      <div className="w-full flex justify-between items-end">
        {/* Left Side: Steering Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Steer Left */}
          <button
            id="touch-btn-left"
            type="button"
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.steerLeft
                ? 'bg-cyan-500/40 border-cyan-300 text-white shadow-[0_0_20px_#00f0ff]'
                : 'bg-black/50 border-cyan-500/30 text-cyan-400'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('steerLeft', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('steerLeft', false); }}
            onMouseDown={() => onControlChange('steerLeft', true)}
            onMouseUp={() => onControlChange('steerLeft', false)}
            onMouseLeave={() => onControlChange('steerLeft', false)}
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>

          {/* Steer Right */}
          <button
            id="touch-btn-right"
            type="button"
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.steerRight
                ? 'bg-cyan-500/40 border-cyan-300 text-white shadow-[0_0_20px_#00f0ff]'
                : 'bg-black/50 border-cyan-500/30 text-cyan-400'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('steerRight', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('steerRight', false); }}
            onMouseDown={() => onControlChange('steerRight', true)}
            onMouseUp={() => onControlChange('steerRight', false)}
            onMouseLeave={() => onControlChange('steerRight', false)}
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>
        </div>

        {/* Center: Action Buttons (Drift & Nitro) */}
        <div className="flex gap-3 pointer-events-auto mb-2">
          {/* Handbrake / Drift */}
          <button
            id="touch-btn-drift"
            type="button"
            className={`px-5 py-3.5 sm:px-6 sm:py-4 rounded-xl flex items-center gap-2 font-display text-xs sm:text-sm font-bold tracking-wider transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.handbrake
                ? 'bg-rose-600/60 border-rose-400 text-white shadow-[0_0_20px_#f43f5e]'
                : 'bg-black/60 border-rose-500/40 text-rose-400'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('handbrake', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('handbrake', false); }}
            onMouseDown={() => onControlChange('handbrake', true)}
            onMouseUp={() => onControlChange('handbrake', false)}
            onMouseLeave={() => onControlChange('handbrake', false)}
          >
            <Flame className="w-5 h-5 text-rose-400" />
            DRIFT
          </button>

          {/* Nitro Boost */}
          <button
            id="touch-btn-nitro"
            type="button"
            className={`px-5 py-3.5 sm:px-6 sm:py-4 rounded-xl flex items-center gap-2 font-display text-xs sm:text-sm font-bold tracking-wider transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.nitro
                ? 'bg-cyan-400 border-white text-black shadow-[0_0_25px_#00f0ff] animate-pulse'
                : 'bg-cyan-950/70 border-cyan-400 text-cyan-300'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('nitro', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('nitro', false); }}
            onMouseDown={() => onControlChange('nitro', true)}
            onMouseUp={() => onControlChange('nitro', false)}
            onMouseLeave={() => onControlChange('nitro', false)}
          >
            <Zap className="w-5 h-5 text-cyan-300" />
            NITRO
          </button>
        </div>

        {/* Right Side: Pedals (Brake & Accelerate) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Brake / Reverse Pedal */}
          <button
            id="touch-btn-brake"
            type="button"
            className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl flex flex-col items-center justify-center transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.brake
                ? 'bg-rose-500/40 border-rose-400 text-white shadow-[0_0_20px_#f43f5e]'
                : 'bg-black/50 border-rose-500/30 text-rose-400'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('brake', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('brake', false); }}
            onMouseDown={() => onControlChange('brake', true)}
            onMouseUp={() => onControlChange('brake', false)}
            onMouseLeave={() => onControlChange('brake', false)}
          >
            <span className="font-display font-black text-sm tracking-wider">BRAKE</span>
            <span className="text-[9px] text-zinc-400 tracking-tight">REV</span>
          </button>

          {/* Accelerate / Gas Pedal */}
          <button
            id="touch-btn-gas"
            type="button"
            className={`w-18 h-24 sm:w-22 sm:h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-75 active:scale-95 border backdrop-blur-md ${
              inputs.accelerate
                ? 'bg-emerald-500/40 border-emerald-300 text-white shadow-[0_0_25px_#10b981]'
                : 'bg-black/50 border-emerald-500/40 text-emerald-400'
            }`}
            onTouchStart={(e) => { e.preventDefault(); onControlChange('accelerate', true); }}
            onTouchEnd={(e) => { e.preventDefault(); onControlChange('accelerate', false); }}
            onMouseDown={() => onControlChange('accelerate', true)}
            onMouseUp={() => onControlChange('accelerate', false)}
            onMouseLeave={() => onControlChange('accelerate', false)}
          >
            <span className="font-display font-black text-base tracking-wider">GAS</span>
            <span className="text-[9px] text-zinc-400 tracking-tight">ACCEL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
