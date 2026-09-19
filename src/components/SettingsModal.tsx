import React from 'react';
import { X, Volume2, Music, CloudRain, Zap, Users } from 'lucide-react';
import { RaceSettings } from '../types/game';
import { sound } from '../game/audio';

interface SettingsModalProps {
  settings: RaceSettings;
  onUpdateSettings: (newSettings: Partial<RaceSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div id="settings-modal-backdrop" className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-[10px] font-display text-cyan-400 font-bold tracking-widest uppercase">
              PREFERENCES
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-wide">
              SETTINGS
            </h2>
          </div>

          <button
            id="settings-btn-close"
            type="button"
            onClick={() => { sound.playUIClick(); onClose(); }}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-4">
          {/* Sound FX Volume */}
          <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="font-display text-xs font-bold text-zinc-200">
                  SOUND FX VOLUME
                </span>
              </div>
              <span className="font-display text-xs font-bold text-cyan-400">
                {Math.round(settings.audioVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.audioVolume}
              onChange={(e) => onUpdateSettings({ audioVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Music Volume */}
          <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-400" />
                <span className="font-display text-xs font-bold text-zinc-200">
                  SYNTHWAVE MUSIC
                </span>
              </div>
              <span className="font-display text-xs font-bold text-pink-400">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-pink-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Rain Weather Toggle */}
          <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-display text-xs font-bold text-zinc-200">
                  NIGHT RAIN & REFLECTIONS
                </div>
                <div className="text-[10px] text-zinc-400 font-hud">
                  Asphalt wetness and falling drops
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ rainEffect: !settings.rainEffect })}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                settings.rainEffect ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.rainEffect ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Motion Blur & Tunnel Vision Post-Processing Toggle */}
          <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-display text-xs font-bold text-zinc-200">
                  MOTION BLUR & TUNNEL VISION
                </div>
                <div className="text-[10px] text-zinc-400 font-hud">
                  Screen-space radial blur & nitro tunnel vision filter
                </div>
              </div>
            </div>
            <button
              id="settings-toggle-motion-blur"
              type="button"
              onClick={() => onUpdateSettings({ motionBlur: !settings.motionBlur })}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                settings.motionBlur ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.motionBlur ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Traffic Density */}
          <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="font-display text-xs font-bold text-zinc-200">
                TRAFFIC DENSITY
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onUpdateSettings({ trafficDensity: lvl })}
                  className={`py-2 rounded-xl border font-display text-xs font-bold uppercase transition-all ${
                    settings.trafficDensity === lvl
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          id="settings-btn-save"
          type="button"
          onClick={() => { sound.playUIClick(); onClose(); }}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-display font-black text-xs tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all active:scale-95 uppercase"
        >
          SAVE PREFERENCES
        </button>
      </div>
    </div>
  );
};
