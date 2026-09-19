import React from 'react';
import { Pause, Camera, Volume2, VolumeX, Flame, Shield } from 'lucide-react';
import { Speedometer } from './Speedometer';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';
import { TrackSystem } from '../game/track';
import { AIRacer, TrafficVehicle } from '../game/aiTraffic';
import { CameraView, ControlInputs, GameMode, PlayerCarState } from '../types/game';

interface RaceHUDProps {
  carState: PlayerCarState;
  track: TrackSystem;
  rivals: AIRacer[];
  traffic: TrafficVehicle[];
  mode: GameMode;
  currentLap: number;
  totalLaps: number;
  elapsedTime: number;
  bestLapTime: number;
  position: number;
  countdown: number | null; // 3, 2, 1, 0 (GO) or null
  cameraView: CameraView;
  isMuted: boolean;
  checkpointTimer?: number;
  inputs: ControlInputs;
  onControlChange: (key: keyof ControlInputs, value: boolean) => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  carState,
  track,
  rivals,
  traffic,
  mode,
  currentLap,
  totalLaps,
  elapsedTime,
  bestLapTime,
  position,
  countdown,
  cameraView,
  isMuted,
  checkpointTimer,
  inputs,
  onControlChange,
  onPause,
  onCycleCamera,
  onToggleMute,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getPositionSuffix = (pos: number) => {
    if (pos === 1) return 'ST';
    if (pos === 2) return 'ND';
    if (pos === 3) return 'RD';
    return 'TH';
  };

  return (
    <div id="race-hud-container" className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* High-Speed Nitro Tunnel Vision Edge Accent */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-200 ${
          carState.isNitroActive
            ? 'opacity-100 shadow-[inset_0_0_120px_rgba(6,182,212,0.25),inset_0_0_60px_rgba(0,0,0,0.7)]'
            : 'opacity-0'
        }`}
      />

      {/* 1. Top Bar: Position, Lap, Timers, Pause & Camera buttons */}
      <div className="flex justify-between items-start w-full">
        {/* Left Side: Position & Lap */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Race Position Badge (for quick race mode) */}
          {mode === 'quick_race' && (
            <div className="bg-black/80 border border-cyan-500/40 rounded-xl px-3.5 py-2 backdrop-blur-md flex items-baseline gap-1 shadow-xl">
              <span className="font-display text-3xl sm:text-4xl font-black text-cyan-400">
                {position}
              </span>
              <span className="font-display text-xs font-bold text-cyan-200">
                {getPositionSuffix(position)}
              </span>
              <span className="text-[9px] font-display text-zinc-400 ml-1">
                / {rivals.length + 1}
              </span>
            </div>
          )}

          {/* Lap Counter */}
          <div className="bg-black/80 border border-zinc-700/60 rounded-xl px-3.5 py-2 backdrop-blur-md flex flex-col shadow-xl">
            <span className="text-[9px] font-display text-zinc-400 uppercase tracking-wider">
              {mode === 'checkpoint_race' ? 'CHECKPOINT' : 'LAP'}
            </span>
            <div className="font-display text-lg sm:text-xl font-black text-white">
              {mode === 'checkpoint_race' ? (
                <>
                  <span className="text-cyan-400">{carState.checkpointIndex + 1}</span>
                  <span className="text-zinc-500 text-sm"> / {track.checkpoints.length}</span>
                </>
              ) : (
                <>
                  <span className="text-cyan-400">{currentLap}</span>
                  <span className="text-zinc-500 text-sm"> / {totalLaps}</span>
                </>
              )}
            </div>
          </div>

          {/* Hull Integrity / Damage Gauge */}
          {carState.damage && (
            <div
              className={`bg-black/80 border rounded-xl px-3 py-1.5 backdrop-blur-md flex items-center gap-2 shadow-xl ${
                carState.damage.health > 80
                  ? 'border-emerald-500/40 text-emerald-400'
                  : carState.damage.health > 50
                  ? 'border-amber-500/50 text-amber-400'
                  : 'border-rose-500/60 text-rose-400 animate-pulse'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <div className="flex flex-col">
                <span className="text-[8px] font-display text-zinc-400 uppercase tracking-wider">HULL</span>
                <span className="font-display text-xs font-black">{carState.damage.health}%</span>
              </div>
            </div>
          )}

          {/* Checkpoint Countdown Timer in Checkpoint Race mode */}
          {mode === 'checkpoint_race' && checkpointTimer !== undefined && (
            <div className="bg-black/80 border border-rose-500/50 rounded-xl px-3.5 py-2 backdrop-blur-md flex flex-col shadow-xl">
              <span className="text-[9px] font-display text-rose-400 uppercase tracking-wider">
                TIME REMAINING
              </span>
              <span className={`font-display text-lg sm:text-xl font-black ${checkpointTimer < 5 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                {checkpointTimer.toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        {/* Center: Race Timer & Best Lap */}
        <div className="flex flex-col items-center bg-black/80 border border-zinc-700/60 rounded-xl px-4 py-2 backdrop-blur-md shadow-xl">
          <span className="text-[9px] font-display text-zinc-400 uppercase tracking-widest">
            TIME
          </span>
          <span className="font-display text-xl sm:text-2xl font-black tracking-wider text-white">
            {formatTime(elapsedTime)}
          </span>
          {bestLapTime > 0 && (
            <span className="text-[10px] font-display text-emerald-400 font-bold">
              BEST: {formatTime(bestLapTime)}
            </span>
          )}
        </div>

        {/* Right Side: Quick Action Buttons (Pause, Camera, Mute) & Minimap */}
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Cycle Camera View */}
            <button
              id="btn-cycle-camera"
              type="button"
              onClick={onCycleCamera}
              className="p-2.5 rounded-xl bg-black/70 hover:bg-cyan-950/60 border border-zinc-700 text-zinc-300 hover:text-cyan-400 transition-colors backdrop-blur-md"
              title={`Camera: ${cameraView}`}
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Audio Mute Toggle */}
            <button
              id="btn-toggle-mute"
              type="button"
              onClick={onToggleMute}
              className="p-2.5 rounded-xl bg-black/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors backdrop-blur-md"
              title="Toggle Audio"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              )}
            </button>

            {/* Pause Race Button */}
            <button
              id="btn-pause-race"
              type="button"
              onClick={onPause}
              className="p-2.5 rounded-xl bg-black/70 hover:bg-rose-950/60 border border-zinc-700 text-zinc-300 hover:text-rose-400 transition-colors backdrop-blur-md"
              title="Pause Race"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Minimap Radar */}
          <Minimap
            track={track}
            playerX={carState.x}
            playerZ={carState.z}
            playerHeading={carState.rotationY}
            rivals={rivals}
            traffic={traffic}
          />
        </div>
      </div>

      {/* 2. Middle Center: 3, 2, 1, GO! Countdown & Drift Score Popups */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="animate-scale-in flex flex-col items-center">
            <span
              className={`font-display text-7xl sm:text-9xl font-black drop-shadow-[0_0_35px_rgba(0,240,255,0.8)] ${
                countdown === 0 ? 'text-emerald-400 neon-text-cyan' : 'text-cyan-400 neon-text-cyan'
              }`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </span>
          </div>
        )}

        {/* Drift Score Banner */}
        {carState.isDrifting && (
          <div className="flex items-center gap-2 bg-black/85 border border-amber-500/60 rounded-full px-5 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-bounce mt-4">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-display font-black text-amber-300 tracking-wider text-sm sm:text-base">
              DRIFT +{carState.driftPoints.toLocaleString()} PTS
            </span>
          </div>
        )}
      </div>

      {/* 3. Bottom Area: Speedometer on right & Mobile Touch Controls */}
      <div className="relative w-full flex justify-end items-end">
        <Speedometer
          speed={carState.speed}
          rpm={carState.rpm}
          gear={carState.gear}
          nitro={carState.nitroRemaining}
          isNitroActive={carState.isNitroActive}
        />
      </div>

      {/* 4. On-Screen Touch Controls (active for touch or click) */}
      <TouchControls inputs={inputs} onControlChange={onControlChange} />
    </div>
  );
};
