/**
 * Pure Web Audio API Sound & Music Synthesizer for Nightfury Street Racing.
 * 100% royalty-free, programmatic, instant startup, zero external assets required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Skid sound nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Nitro sound nodes
  private nitroNoise: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroSubOsc: OscillatorNode | null = null;

  // Music sequencer state
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
  private noiseBuffer: AudioBuffer | null = null;

  // Crowd & Camera reaction timestamps
  private lastCrowdCheerTime: number = 0;
  private lastCameraClickTime: number = 0;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.createNoiseBuffer();
      this.setupEngineSound();
      this.setupSkidSound();
      this.setupNitroSound();
    } catch {
      console.warn('Web Audio API not supported or blocked by user gesture.');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private setupEngineSound() {
    if (!this.ctx) return;
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineFilter = this.ctx.createBiquadFilter();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.value = 45;
    this.engineOsc2.frequency.value = 90;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 600;

    this.engineGain.gain.value = 0;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupSkidSound() {
    if (!this.ctx || !this.noiseBuffer) return;
    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1100;
    this.skidFilter.Q.value = 2.5;

    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);

    this.startSkidLoop();
  }

  private startSkidLoop() {
    if (!this.ctx || !this.noiseBuffer || !this.skidFilter) return;
    this.skidNode = this.ctx.createBufferSource();
    this.skidNode.buffer = this.noiseBuffer;
    this.skidNode.loop = true;
    this.skidNode.connect(this.skidFilter);
    this.skidNode.start();
  }

  private setupNitroSound() {
    if (!this.ctx || !this.noiseBuffer) return;
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.value = 0;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'bandpass';
    nitroFilter.frequency.value = 1600;
    nitroFilter.Q.value = 1.2;

    this.nitroNoise = this.ctx.createBufferSource();
    this.nitroNoise.buffer = this.noiseBuffer;
    this.nitroNoise.loop = true;
    this.nitroNoise.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);

    this.nitroSubOsc = this.ctx.createOscillator();
    this.nitroSubOsc.type = 'sine';
    this.nitroSubOsc.frequency.value = 55;
    this.nitroSubOsc.connect(this.nitroGain);

    this.nitroGain.connect(this.ctx.destination);

    this.nitroNoise.start();
    this.nitroSubOsc.start();
  }

  updateEngine(rpm: number, speedRatio: number, isAccelerating: boolean) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineGain || !this.engineFilter) return;
    if (this.isMuted) {
      this.engineGain.gain.value = 0;
      return;
    }

    // RPM 1000 -> 8000 mapped to base frequencies 35Hz -> 180Hz
    const baseFreq = 38 + (rpm / 8500) * 160;
    const now = this.ctx.currentTime;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);

    const filterFreq = 450 + speedRatio * 1800 + (isAccelerating ? 700 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    const targetGain = (0.15 + speedRatio * 0.25 + (isAccelerating ? 0.15 : 0)) * this.sfxVolume;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  updateSkid(intensity: number) {
    if (!this.ctx || !this.skidGain) return;
    if (this.isMuted || intensity <= 0.05) {
      this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    const targetGain = Math.min(1, intensity) * 0.35 * this.sfxVolume;
    this.skidGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
  }

  setNitro(active: boolean) {
    if (!this.ctx || !this.nitroGain) return;
    const now = this.ctx.currentTime;
    const targetGain = (active && !this.isMuted) ? 0.4 * this.sfxVolume : 0;
    this.nitroGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  playCollision(force: number = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    gain.gain.setValueAtTime(Math.min(0.7, force * 0.5) * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCountdown(type: 'beep' | 'go') {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (type === 'beep') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);
      gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.52);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
  }

  playCheckpointChime() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.32);
    });
  }

  playUIClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playCrowdCheer(intensity: number = 1) {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;
    this.resume();
    const now = this.ctx.currentTime;
    if (now - this.lastCrowdCheerTime < 1.4) return;
    this.lastCrowdCheerTime = now;

    // Filtered noise simulating roaring applause and cheers
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.35);
    filter.frequency.linearRampToValueAtTime(750, now + 1.2);
    filter.Q.value = 1.3;

    const gain = this.ctx.createGain();
    const vol = Math.min(0.42, 0.16 + intensity * 0.24) * this.sfxVolume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 1.45);
  }

  playCameraClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    if (now - this.lastCameraClickTime < 0.2) return;
    this.lastCameraClickTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playMissionReward() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    // Cyberpunk achievement fanfare: C5, E5, G5, C6 triumphant chord
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }

  playLevelUp() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    // Ascending arpeggio with celebratory synth shimmer
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const startTime = now + idx * 0.07;
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.48);
    });
  }

  playRepairSound() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 1. Pneumatic socket wrench ratchet buzz
    for (let i = 0; i < 6; i++) {
      const clickTime = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420 + i * 80, clickTime);
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.04);
    }

    // 2. High-spec restoration chime (E5, B5, E6)
    [659.25, 987.77, 1318.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + 0.28 + idx * 0.09;
      gain.gain.setValueAtTime(0.25 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  playCrunchDamage(force: number = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    // Metallic crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
    gain.gain.setValueAtTime(Math.min(0.65, force * 0.45) * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // Glass shatter transient
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(3, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.min(0.4, force * 0.3) * this.sfxVolume, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(now + 0.02);
  }

  // Cyberpunk Synthwave Music Sequencer
  startMusic() {
    if (this.isMusicPlaying) return;
    this.init();
    this.resume();
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const tempo = 136; // Fast arcade racing BPM
    const stepTimeMs = (60 / tempo / 4) * 1000; // 16th notes

    // Bassline notes: F1, Ab1, Eb1, Bb0
    const bassNotes = [
      43.65, 43.65, 51.91, 43.65, 43.65, 43.65, 58.27, 43.65,
      38.89, 38.89, 43.65, 38.89, 34.65, 34.65, 43.65, 51.91,
    ];

    // Synth arpeggio notes
    const leadNotes = [
      174.61, 207.65, 261.63, 311.13, 261.63, 207.65, 174.61, 261.63,
      155.56, 196.00, 233.08, 311.13, 233.08, 196.00, 155.56, 233.08,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.isMuted || this.musicVolume <= 0.01) {
        this.musicStep = (this.musicStep + 1) % 16;
        return;
      }

      const now = this.ctx.currentTime;
      const step = this.musicStep;

      // 1. Kick on steps 0, 4, 8, 12 (Four-on-the-floor)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(36, now + 0.09);
        kickGain.gain.setValueAtTime(0.55 * this.musicVolume, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.13);
      }

      // 2. Snare / Clap on steps 4, 12
      if (step === 4 || step === 12) {
        if (this.noiseBuffer) {
          const snareSource = this.ctx.createBufferSource();
          snareSource.buffer = this.noiseBuffer;
          const snareFilter = this.ctx.createBiquadFilter();
          snareFilter.type = 'highpass';
          snareFilter.frequency.value = 1000;
          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.28 * this.musicVolume, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          snareSource.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(this.ctx.destination);
          snareSource.start(now);
          snareSource.stop(now + 0.16);
        }
      }

      // 3. Hi-hat on every odd step
      if (step % 2 !== 0 && this.noiseBuffer) {
        const hatSource = this.ctx.createBufferSource();
        hatSource.buffer = this.noiseBuffer;
        const hatFilter = this.ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.value = 7000;
        const hatGain = this.ctx.createGain();
        hatGain.gain.setValueAtTime(0.08 * this.musicVolume, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        hatSource.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(this.ctx.destination);
        hatSource.start(now);
        hatSource.stop(now + 0.06);
      }

      // 4. Bass synth note
      const bassFreq = bassNotes[step % bassNotes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassGain.gain.setValueAtTime(0.25 * this.musicVolume, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      const bassFilter = this.ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(450, now);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.12);

      // 5. Arpeggio lead note
      if (step % 2 === 0) {
        const leadFreq = leadNotes[step % leadNotes.length];
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(leadFreq, now);
        leadGain.gain.setValueAtTime(0.12 * this.musicVolume, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.1);
      }

      this.musicStep = (this.musicStep + 1) % 16;
    }, stepTimeMs);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.isMusicPlaying = false;
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.engineGain) {
      this.engineGain.gain.value = this.isMuted ? 0 : 0.15;
    }
    return this.isMuted;
  }
}

export const sound = new SoundEngine();
