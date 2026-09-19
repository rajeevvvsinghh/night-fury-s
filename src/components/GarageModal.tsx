import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CarConfig, CarDamageState, CarUpgrades } from '../types/game';
import { INITIAL_CARS, PAINT_PALETTE, UPGRADE_TIER_COSTS, UPGRADE_DESCRIPTIONS } from '../data/cars';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Shield,
  Wrench,
  Zap,
  RotateCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { sound } from '../game/audio';
import { calculateRepairCost } from '../game/damageSystem';

interface GarageModalProps {
  selectedCar: CarConfig;
  onSelectCar: (car: CarConfig) => void;
  carUpgrades: Record<string, CarUpgrades>;
  onUpgrade: (carId: string, category: keyof CarUpgrades) => void;
  playerCredits: number;
  onUpdatePaint: (color: string, glow: string) => void;
  onBackToMenu: () => void;
  onStartRace: () => void;
  onToggleAutoRotate: () => void;
  isAutoRotate: boolean;
  damageState: CarDamageState;
  onRepairCar: (carId: string) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  selectedCar,
  onSelectCar,
  carUpgrades,
  onUpgrade,
  playerCredits,
  onUpdatePaint,
  onBackToMenu,
  onStartRace,
  onToggleAutoRotate,
  isAutoRotate,
  damageState,
  onRepairCar,
}) => {
  const [leftTab, setLeftTab] = useState<'specs' | 'damage'>('specs');
  const [showRepairedAnim, setShowRepairedAnim] = useState(false);

  const currentUpgrades = carUpgrades[selectedCar.id] || {
    engine: 0,
    handling: 0,
    brakes: 0,
    nitro: 0,
    topSpeed: 0,
  };

  const effectiveStats = {
    topSpeed: selectedCar.baseStats.topSpeed + currentUpgrades.topSpeed * 8 + currentUpgrades.engine * 6,
    acceleration: selectedCar.baseStats.acceleration + currentUpgrades.engine * 5 + currentUpgrades.nitro * 3,
    handling: selectedCar.baseStats.handling + currentUpgrades.handling * 6,
    driftControl: selectedCar.baseStats.driftControl + currentUpgrades.handling * 5,
    nitroPower: selectedCar.baseStats.nitroPower + currentUpgrades.nitro * 6,
    brakes: selectedCar.baseStats.brakes + currentUpgrades.brakes * 6,
  };

  const currentCarIndex = INITIAL_CARS.findIndex((c) => c.id === selectedCar.id);

  const handlePrevCar = () => {
    sound.playUIClick();
    const prevIdx = (currentCarIndex - 1 + INITIAL_CARS.length) % INITIAL_CARS.length;
    onSelectCar(INITIAL_CARS[prevIdx]);
  };

  const handleNextCar = () => {
    sound.playUIClick();
    const nextIdx = (currentCarIndex + 1) % INITIAL_CARS.length;
    onSelectCar(INITIAL_CARS[nextIdx]);
  };

  const categories: (keyof CarUpgrades)[] = ['engine', 'handling', 'brakes', 'nitro', 'topSpeed'];

  const repairCost = calculateRepairCost(damageState, selectedCar.tier);
  const isDamaged = damageState.health < 100 || damageState.scratchesCount > 0 || damageState.dentsCount > 0;
  const canAffordRepair = playerCredits >= repairCost;

  const handleExecuteRepair = () => {
    if (!canAffordRepair || repairCost === 0) return;
    onRepairCar(selectedCar.id);
    setShowRepairedAnim(true);
    setTimeout(() => {
      setShowRepairedAnim(false);
    }, 2400);
  };

  return (
    <div id="garage-view-container" className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full">
        <motion.div
          initial={{ opacity: 0, y: -20, x: -10 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 pointer-events-auto"
        >
          <motion.button
            id="garage-back-btn"
            type="button"
            whileHover={{ scale: 1.05, x: -3, borderColor: '#22d3ee', boxShadow: '0 0 15px rgba(6,182,212,0.3)' }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => { sound.playUIClick(); onBackToMenu(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-display text-xs font-bold tracking-wider backdrop-blur-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            MAIN MENU
          </motion.button>

          <motion.button
            id="garage-rotate-toggle"
            type="button"
            whileHover={{ scale: 1.05, borderColor: '#22d3ee', boxShadow: '0 0 15px rgba(6,182,212,0.3)' }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onToggleAutoRotate}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-display font-semibold backdrop-blur-md cursor-pointer ${
              isAutoRotate
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-black/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle 360 Turntable"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
            360° SPIN
          </motion.button>
        </motion.div>

        {/* Vehicle Integrity Badge & Player Credits */}
        <motion.div
          initial={{ opacity: 0, y: -20, x: 10 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 pointer-events-auto"
        >
          {/* Quick Damage Status Badge */}
          {isDamaged ? (
            <motion.button
              id="garage-quick-repair-badge"
              type="button"
              whileHover={{ scale: 1.05, y: -1, boxShadow: '0 0 20px rgba(244,63,94,0.5)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                sound.playUIClick();
                setLeftTab('damage');
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900/90 border border-rose-500/60 rounded-xl backdrop-blur-md text-rose-300 shadow-lg cursor-pointer animate-pulse"
              title="Click to view Damage & Repair Bay"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-display font-bold text-rose-400 tracking-wider">
                  {damageState.health}% INTEGRITY
                </span>
                <span className="text-[11px] font-display font-black text-rose-200">
                  REPAIR (${repairCost.toLocaleString()})
                </span>
              </div>
            </motion.button>
          ) : (
            <motion.div
              whileHover={{ scale: 1.03, borderColor: 'rgba(16,185,129,0.7)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-xl backdrop-blur-md text-emerald-300 shadow-lg cursor-default"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-display font-bold tracking-wider">
                100% PRISTINE
              </span>
            </motion.div>
          )}

          {/* Player Credits Display */}
          <motion.div
            whileHover={{ scale: 1.03, borderColor: 'rgba(245,158,11,0.8)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 px-4 py-2 bg-black/80 border border-amber-500/50 rounded-xl backdrop-blur-md shadow-lg cursor-default"
          >
            <span className="text-[10px] font-display text-amber-400 font-bold tracking-wider">
              CREDITS
            </span>
            <span className="font-display text-lg sm:text-xl font-black text-amber-300">
              ${playerCredits.toLocaleString()}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Middle: Car Switcher Chevrons & Title */}
      <div className="flex justify-between items-center w-full my-auto pointer-events-none">
        <motion.button
          id="garage-prev-car"
          type="button"
          whileHover={{ scale: 1.15, x: -4, borderColor: '#06b6d4', boxShadow: '0 0 25px rgba(6,182,212,0.5)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={handlePrevCar}
          className="pointer-events-auto p-3.5 rounded-2xl bg-black/70 hover:bg-cyan-950/60 border border-zinc-700 text-white backdrop-blur-md cursor-pointer"
          title="Previous Car"
        >
          <ChevronLeft className="w-8 h-8 text-cyan-400" />
        </motion.button>

        <motion.div
          key={selectedCar.id}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-center bg-black/60 px-6 py-2 rounded-2xl border border-zinc-800/80 backdrop-blur-md"
        >
          <span className="text-[10px] font-display text-cyan-400 tracking-widest uppercase font-bold">
            {selectedCar.tier} CLASS // {currentCarIndex + 1} OF {INITIAL_CARS.length}
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-black text-white tracking-wide">
            {selectedCar.name}
          </h2>
          {showRepairedAnim && (
            <div className="mt-1 flex items-center justify-center gap-1.5 text-emerald-400 font-display text-xs font-bold tracking-widest animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
              RESTORED TO SHOWROOM CONDITION!
            </div>
          )}
        </motion.div>

        <motion.button
          id="garage-next-car"
          type="button"
          whileHover={{ scale: 1.15, x: 4, borderColor: '#06b6d4', boxShadow: '0 0 25px rgba(6,182,212,0.5)' }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={handleNextCar}
          className="pointer-events-auto p-3.5 rounded-2xl bg-black/70 hover:bg-cyan-950/60 border border-zinc-700 text-white backdrop-blur-md cursor-pointer"
          title="Next Car"
        >
          <ChevronRight className="w-8 h-8 text-cyan-400" />
        </motion.button>
      </div>

      {/* Bottom Panel: Telemetry / Damage & Repair, Upgrades, Paint & Race */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 pointer-events-auto">
        {/* 1. Performance Specs / Damage Diagnostics Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: 'rgba(6,182,212,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
          className="bg-black/85 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex flex-col justify-between transition-colors"
        >
          {/* Sub-tabs: SPECS vs DAMAGE REPORT */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex gap-2">
              <motion.button
                id="garage-tab-specs"
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={() => { sound.playUIClick(); setLeftTab('specs'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold tracking-wider transition-all cursor-pointer ${
                  leftTab === 'specs'
                    ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                SPECS
              </motion.button>

              <motion.button
                id="garage-tab-damage"
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={() => { sound.playUIClick(); setLeftTab('damage'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold tracking-wider transition-all relative cursor-pointer ${
                  leftTab === 'damage'
                    ? 'bg-rose-950/70 border border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                DAMAGE & REPAIR
                {isDamaged && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </motion.button>
            </div>

            <span className="text-[10px] font-display font-bold text-zinc-500 uppercase">
              {leftTab === 'specs' ? 'TELEMETRY' : 'BAY 01'}
            </span>
          </div>

          {leftTab === 'specs' ? (
            /* Telemetry Stats */
            <div className="space-y-2 text-xs font-display">
              <div>
                <div className="flex justify-between text-zinc-300 mb-0.5">
                  <span>TOP SPEED</span>
                  <span className="text-cyan-400 font-bold">{effectiveStats.topSpeed} KM/H</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (effectiveStats.topSpeed / 340) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-0.5">
                  <span>ACCELERATION</span>
                  <span className="text-cyan-400 font-bold">{effectiveStats.acceleration} PTS</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.min(100, effectiveStats.acceleration)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-0.5">
                  <span>HANDLING / DRIFT</span>
                  <span className="text-cyan-400 font-bold">{effectiveStats.handling} PTS</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${Math.min(100, effectiveStats.handling)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-0.5">
                  <span>NITRO BOOST</span>
                  <span className="text-cyan-400 font-bold">{effectiveStats.nitroPower} PTS</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400"
                    style={{ width: `${Math.min(100, effectiveStats.nitroPower)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Vehicle Damage Diagnostics & Repair Bay */
            <div className="space-y-2.5 text-xs font-display">
              {/* Integrity Meter */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300 font-bold">HULL INTEGRITY</span>
                  <span
                    className={`font-black ${
                      damageState.health > 80
                        ? 'text-emerald-400'
                        : damageState.health > 50
                        ? 'text-amber-400'
                        : 'text-rose-400 animate-pulse'
                    }`}
                  >
                    {damageState.health}%
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      damageState.health > 80
                        ? 'bg-emerald-400'
                        : damageState.health > 50
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${damageState.health}%` }}
                  />
                </div>
              </div>

              {/* Component Diagnostic Breakdown */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                <div className="flex justify-between pr-2 border-r border-zinc-800">
                  <span className="text-zinc-400">Scratches:</span>
                  <span className={damageState.scratchesCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {damageState.scratchesCount > 0 ? `${damageState.scratchesCount} Scrapes` : 'Pristine'}
                  </span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-zinc-400">Panel Dents:</span>
                  <span className={damageState.dentsCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {damageState.dentsCount > 0 ? `${damageState.dentsCount} Panels` : 'Aligned'}
                  </span>
                </div>
                <div className="flex justify-between pr-2 border-r border-zinc-800">
                  <span className="text-zinc-400">Left Light:</span>
                  <span className={damageState.brokenLeftHeadlight ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {damageState.brokenLeftHeadlight ? 'CRACKED' : 'ONLINE'}
                  </span>
                </div>
                <div className="flex justify-between pl-2">
                  <span className="text-zinc-400">Right Light:</span>
                  <span className={damageState.brokenRightHeadlight ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {damageState.brokenRightHeadlight ? 'CRACKED' : 'ONLINE'}
                  </span>
                </div>
              </div>

              {/* Repair Fee Action */}
              <div className="pt-1">
                {isDamaged ? (
                  <motion.button
                    id="garage-repair-car-btn"
                    type="button"
                    disabled={!canAffordRepair}
                    whileHover={canAffordRepair ? { scale: 1.03, y: -2, boxShadow: '0 0 25px rgba(245,158,11,0.5)' } : {}}
                    whileTap={canAffordRepair ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.15 }}
                    onClick={handleExecuteRepair}
                    className={`w-full py-2.5 rounded-xl font-display font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
                      canAffordRepair
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    REPAIR VEHICLE (${repairCost.toLocaleString()})
                  </motion.button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-display font-bold text-xs text-center flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    VEHICLE FULLY RESTORED (0 CR)
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* 2. Upgrades Workshop Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: 'rgba(245,158,11,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
          className="bg-black/85 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md shadow-2xl transition-colors"
        >
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-xs font-bold tracking-widest text-zinc-200 uppercase">
              PERFORMANCE UPGRADES
            </h3>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const currentTier = currentUpgrades[cat];
              const isMax = currentTier >= 4;
              const nextCost = isMax ? 0 : UPGRADE_TIER_COSTS[currentTier];
              const canAfford = playerCredits >= nextCost;

              return (
                <motion.div
                  key={cat}
                  whileHover={{ x: 2, borderColor: 'rgba(6,182,212,0.4)' }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 transition-colors"
                >
                  <div>
                    <span className="font-display text-[11px] font-bold text-zinc-200 uppercase">
                      {cat.replace('topSpeed', 'Top Speed')}
                    </span>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-1.5 rounded-xs ${
                            i < currentTier ? 'bg-cyan-400 shadow-[0_0_6px_#00f0ff]' : 'bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {isMax ? (
                    <span className="font-display text-[10px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-md">
                      MAX TIER
                    </span>
                  ) : (
                    <motion.button
                      id={`upgrade-btn-${cat}`}
                      type="button"
                      disabled={!canAfford}
                      whileHover={canAfford ? { scale: 1.06, borderColor: '#f59e0b', boxShadow: '0 0 15px rgba(245,158,11,0.4)' } : {}}
                      whileTap={canAfford ? { scale: 0.94 } : {}}
                      transition={{ duration: 0.15 }}
                      onClick={() => { sound.playUIClick(); onUpgrade(selectedCar.id, cat); }}
                      className={`font-display text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                        canAfford
                          ? 'bg-amber-500/20 hover:bg-amber-500 border-amber-400 text-amber-300 hover:text-black cursor-pointer'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      UPGRADE (${nextCost.toLocaleString()})
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 3. Paint Customizer & Race Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.29, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: 'rgba(6,182,212,0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
          className="bg-black/85 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex flex-col justify-between transition-colors"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display text-xs font-bold tracking-widest text-zinc-200 uppercase">
                NEON CUSTOM PAINT
              </h3>
            </div>

            {/* Color Swatches */}
            <div className="grid grid-cols-4 gap-2">
              {PAINT_PALETTE.map((p) => {
                const isSelected = selectedCar.primaryColor.toLowerCase() === p.color.toLowerCase();
                return (
                  <motion.button
                    key={p.name}
                    type="button"
                    whileHover={{ scale: 1.15, y: -2, zIndex: 10 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => { sound.playUIClick(); onUpdatePaint(p.color, p.glow); }}
                    className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                        : 'border-zinc-700 hover:border-zinc-400'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.button
            id="garage-start-race"
            type="button"
            whileHover={{ scale: 1.03, y: -2, boxShadow: '0 0 40px rgba(6,182,212,0.9), 0 0 15px rgba(56,189,248,0.7)' }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={() => { sound.playUIClick(); onStartRace(); }}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-sm tracking-widest shadow-[0_0_25px_rgba(6,182,212,0.6)] uppercase cursor-pointer"
          >
            ENTER RACE NOW
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
