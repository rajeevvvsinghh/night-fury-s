import React from 'react';
import { Zap } from 'lucide-react';

interface SpeedometerProps {
  speed: number;        // km/h
  rpm: number;          // 1000 - 8500
  gear: number;         // 1 - 6 or -1
  nitro: number;        // 0 - 100
  isNitroActive: boolean;
  topSpeedRecord?: number;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
  speed,
  rpm,
  gear,
  nitro,
  isNitroActive,
}) => {
  const displaySpeed = Math.max(0, Math.round(Math.abs(speed)));
  const rpmPercent = Math.min(100, Math.max(0, ((rpm - 1000) / 7500) * 100));
  const isRedline = rpm >= 7800;

  return (
    <div id="speedometer-cluster" className="relative flex flex-col items-end pointer-events-none select-none">
      {/* Nitro Bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <Zap
            className={`w-4 h-4 transition-all duration-150 ${
              isNitroActive
                ? 'text-cyan-300 animate-pulse scale-125 drop-shadow-[0_0_8px_#00f0ff]'
                : nitro > 20
                ? 'text-cyan-400'
                : 'text-zinc-600'
            }`}
          />
          <span className="text-[10px] tracking-widest font-display text-cyan-300 font-bold uppercase">
            NITRO
          </span>
        </div>
        <div className="w-40 sm:w-52 h-3.5 bg-black/60 border border-cyan-500/40 rounded-sm p-0.5 overflow-hidden backdrop-blur-md">
          <div
            className={`h-full rounded-xs transition-all duration-100 ${
              isNitroActive
                ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-white shadow-[0_0_12px_#00f0ff]'
                : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, nitro))}%` }}
          />
        </div>
        <span className="text-xs font-display text-cyan-200 w-8 text-right font-bold">
          {Math.round(nitro)}%
        </span>
      </div>

      {/* Main Gauges Card */}
      <div className="relative bg-black/75 border border-zinc-700/60 rounded-xl p-3 sm:p-4 backdrop-blur-md shadow-2xl flex items-center gap-4 sm:gap-6">
        {/* Gear Indicator */}
        <div className="flex flex-col items-center justify-center border-r border-zinc-800 pr-3 sm:pr-4">
          <span className="text-[9px] tracking-widest font-display text-zinc-400 uppercase">
            GEAR
          </span>
          <span
            className={`font-display text-3xl sm:text-4xl font-black ${
              gear === -1
                ? 'text-rose-500'
                : isRedline
                ? 'text-amber-400 animate-pulse'
                : 'text-cyan-400'
            }`}
          >
            {gear === -1 ? 'R' : gear === 0 ? 'N' : gear}
          </span>
        </div>

        {/* Big Speed Digits */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-display text-4xl sm:text-6xl font-black tracking-tight ${
                isNitroActive
                  ? 'text-cyan-300 neon-text-cyan drop-shadow-[0_0_15px_#00f0ff]'
                  : 'text-white'
              }`}
            >
              {displaySpeed.toString().padStart(3, '0')}
            </span>
            <span className="text-xs sm:text-sm font-display font-bold text-cyan-400 tracking-wider">
              KM/H
            </span>
          </div>

          {/* RPM LED Bar */}
          <div className="w-36 sm:w-48 mt-1.5">
            <div className="flex justify-between items-center text-[8px] font-display text-zinc-400 mb-1">
              <span>RPM x1000</span>
              <span className={isRedline ? 'text-red-500 font-bold animate-pulse' : ''}>
                {Math.round(rpm)}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-sm overflow-hidden flex gap-0.5 p-0.5 border border-zinc-800">
              {Array.from({ length: 20 }).map((_, i) => {
                const threshold = (i / 20) * 100;
                const isLit = rpmPercent >= threshold;
                let colorClass = 'bg-cyan-500';
                if (i > 14) colorClass = 'bg-amber-400';
                if (i > 17) colorClass = 'bg-red-500';

                return (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded-xs transition-colors duration-75 ${
                      isLit ? colorClass : 'bg-zinc-800/40'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
