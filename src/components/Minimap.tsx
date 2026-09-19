import React, { useRef, useEffect } from 'react';
import { TrackSystem } from '../game/track';
import { AIRacer, TrafficVehicle } from '../game/aiTraffic';

interface MinimapProps {
  track: TrackSystem;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  rivals: AIRacer[];
  traffic: TrafficVehicle[];
}

export const Minimap: React.FC<MinimapProps> = ({
  track,
  playerX,
  playerZ,
  playerHeading,
  rivals,
  traffic,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Dark radar circle background
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.stroke();
    ctx.clip();

    // Radar grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 4, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Track coordinates to canvas transformation
    const bounds = track.getMinimapBounds();
    const margin = 16;
    const scaleX = (w - margin * 2) / bounds.width;
    const scaleZ = (h - margin * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleZ);

    const toCanvasX = (x: number) => w / 2 + (x - (bounds.minX + bounds.maxX) / 2) * scale;
    const toCanvasY = (z: number) => h / 2 + (z - (bounds.minZ + bounds.maxZ) / 2) * scale;

    // Draw Track Path
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    track.sampledPoints.forEach((pt, idx) => {
      const cx = toCanvasX(pt.x);
      const cy = toCanvasY(pt.z);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Neon center line of track
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f0ff';
    track.sampledPoints.forEach((pt, idx) => {
      const cx = toCanvasX(pt.x);
      const cy = toCanvasY(pt.z);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // Start / Finish Line Checkered Notch
    const startPt = track.sampledPoints[0];
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(toCanvasX(startPt.x), toCanvasY(startPt.z), 4, 0, Math.PI * 2);
    ctx.fill();

    // Ambient Traffic Dots (white/gray)
    ctx.fillStyle = '#cbd5e1';
    traffic.forEach((t) => {
      const tx = toCanvasX(t.position3D.x);
      const ty = toCanvasY(t.position3D.z);
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // AI Rivals Dots (red / orange)
    rivals.forEach((r) => {
      const rx = toCanvasX(r.position3D.x);
      const ry = toCanvasY(r.position3D.z);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Player (Bright Cyan Arrow with Heading)
    const px = toCanvasX(playerX);
    const py = toCanvasY(playerZ);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(playerHeading);

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(0, -2);
    ctx.lineTo(4.5, -5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }, [track, playerX, playerZ, playerHeading, rivals, traffic]);

  return (
    <div id="radar-minimap" className="relative select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        width={140}
        height={140}
        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full shadow-2xl border border-cyan-500/30"
      />
      <span className="absolute bottom-1 right-3 text-[9px] font-display text-cyan-400 font-bold uppercase tracking-widest">
        TRACK RADAR
      </span>
    </div>
  );
};
