import type { SfxName } from '../engine/types';

/**
 * Fully procedural audio: ambience beds + effects synthesized with the
 * Web Audio API. No samples, no downloads, works offline.
 */
export class SoundEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceNodes: AudioNode[] = [];
  private ambienceId: string | null = null;
  private chirpTimer: number | null = null;
  private _muted = false;

  get muted() {
    return this._muted;
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.master && this.ac) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ac.currentTime, 0.1);
    }
  }

  /** must be called from a user gesture */
  unlock() {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain();
    this.master.gain.value = this._muted ? 0 : 0.9;
    this.master.connect(this.ac.destination);
    this.ambienceGain = this.ac.createGain();
    this.ambienceGain.gain.value = 0.0;
    this.ambienceGain.connect(this.master);
    if (this.ambienceId) {
      const id = this.ambienceId;
      this.ambienceId = null;
      this.setAmbience(id);
    }
  }

  // ------------------------------------------------------------- primitives

  private noiseBuffer(): AudioBuffer {
    const ac = this.ac!;
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    gain = 0.2,
    when = 0,
    glideTo?: number,
    dest?: AudioNode
  ) {
    if (!this.ac || !this.master) return;
    const ac = this.ac;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private burst(dur: number, filterFreq: number, gain = 0.3, when = 0, q = 1, type: BiquadFilterType = 'bandpass', glideTo?: number) {
    if (!this.ac || !this.master) return;
    const ac = this.ac;
    const t0 = ac.currentTime + when;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t0);
    if (glideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, glideTo), t0 + dur);
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------- ambience

  setAmbience(id: string) {
    if (id === this.ambienceId) return;
    this.ambienceId = id;
    if (!this.ac || !this.ambienceGain) return;
    const ac = this.ac;

    // fade out and dismantle old bed
    for (const n of this.ambienceNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.(ac.currentTime + 1.2);
      } catch { /* already stopped */ }
    }
    if (this.chirpTimer !== null) {
      clearInterval(this.chirpTimer);
      this.chirpTimer = null;
    }
    this.ambienceNodes = [];
    this.ambienceGain.gain.setTargetAtTime(0, ac.currentTime, 0.4);

    // build the new bed after the fade
    window.setTimeout(() => {
      if (this.ambienceId !== id || !this.ac || !this.ambienceGain) return;
      this.buildAmbience(id);
      this.ambienceGain.gain.setTargetAtTime(0.5, this.ac.currentTime, 0.8);
    }, 500);
  }

  private buildAmbience(id: string) {
    const ac = this.ac!;
    const out = this.ambienceGain!;
    const keep = (n: AudioNode) => this.ambienceNodes.push(n);

    const noiseBed = (freq: number, q: number, gain: number, lfoRate = 0.08, lfoDepth = 0.35) => {
      const src = ac.createBufferSource();
      src.buffer = this.noiseBuffer();
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ac.createGain();
      g.gain.value = gain;
      // slow swell
      const lfo = ac.createOscillator();
      lfo.frequency.value = lfoRate;
      const lfoGain = ac.createGain();
      lfoGain.gain.value = gain * lfoDepth;
      lfo.connect(lfoGain).connect(g.gain);
      src.connect(f).connect(g).connect(out);
      src.start();
      lfo.start();
      keep(src);
      keep(lfo);
    };

    const drone = (freq: number, gain: number, detune = 3) => {
      for (const d of [0, detune]) {
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = d;
        const g = ac.createGain();
        g.gain.value = gain / 2;
        osc.connect(g).connect(out);
        osc.start();
        keep(osc);
      }
    };

    const chirps = (fn: () => void, everyMs: number, chance = 0.6) => {
      this.chirpTimer = window.setInterval(() => {
        if (this._muted || !this.ac) return;
        if (Math.random() < chance) fn();
      }, everyMs);
    };

    switch (id) {
      case 'meadow':
        noiseBed(700, 0.4, 0.12, 0.07);
        chirps(() => {
          // birdsong: quick descending twitters
          const base = 2200 + Math.random() * 1400;
          for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            this.tone(base + Math.random() * 500, 0.08, 'sine', 0.04, i * 0.09, base - 600, out);
          }
        }, 2600, 0.55);
        break;
      case 'forest':
        noiseBed(500, 0.5, 0.16, 0.06);
        drone(85, 0.02);
        chirps(() => {
          const base = 1800 + Math.random() * 900;
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
            this.tone(base, 0.07, 'sine', 0.03, i * 0.12, base + 300, out);
          }
        }, 3400, 0.45);
        break;
      case 'canyon':
        noiseBed(400, 0.3, 0.18, 0.05);
        drone(60, 0.025);
        break;
      case 'river':
        noiseBed(900, 0.8, 0.2, 0.15, 0.25);
        noiseBed(2400, 0.4, 0.05, 0.3, 0.4);
        break;
      case 'house':
        noiseBed(240, 0.4, 0.08, 0.04);
        drone(55, 0.02);
        chirps(() => {
          // creaking timbers
          this.tone(90 + Math.random() * 60, 0.4, 'triangle', 0.02, 0, 70, out);
        }, 7000, 0.35);
        break;
      case 'cave':
        noiseBed(180, 0.6, 0.1, 0.05);
        drone(48, 0.035, 5);
        chirps(() => {
          // distant water drips with cavern ping
          const f = 900 + Math.random() * 1200;
          this.tone(f, 0.5, 'sine', 0.035, 0, f * 0.65, out);
        }, 3800, 0.6);
        break;
      case 'cavernBig':
        noiseBed(140, 0.6, 0.12, 0.04);
        drone(38, 0.045, 7);
        chirps(() => {
          const f = 500 + Math.random() * 700;
          this.tone(f, 1.1, 'sine', 0.03, 0, f * 0.5, out);
        }, 5200, 0.6);
        break;
      case 'temple':
        drone(110, 0.04, 4);
        drone(165, 0.02, 3);
        noiseBed(200, 0.4, 0.06, 0.03);
        chirps(() => {
          // faint choral swell
          const root = [110, 138.6, 164.8][Math.floor(Math.random() * 3)];
          this.tone(root * 2, 2.4, 'sine', 0.02, 0, undefined, out);
          this.tone(root * 3, 2.4, 'sine', 0.012, 0.2, undefined, out);
        }, 8000, 0.7);
        break;
      case 'loud':
        noiseBed(1400, 1.2, 0.3, 0.6, 0.3);
        noiseBed(300, 0.8, 0.2, 0.2);
        drone(52, 0.05, 9);
        break;
      case 'water':
        noiseBed(800, 0.8, 0.22, 0.2, 0.3);
        drone(44, 0.03, 6);
        break;
      case 'maze':
        noiseBed(120, 0.7, 0.09, 0.03);
        drone(41, 0.04, 11);
        chirps(() => {
          // unsettling skitters
          this.burst(0.1, 3000 + Math.random() * 2000, 0.02, 0, 3);
        }, 6400, 0.4);
        break;
      case 'lair':
        noiseBed(160, 0.7, 0.1, 0.05);
        drone(36, 0.05, 13);
        chirps(() => {
          // low breathing
          this.burst(0.9, 220, 0.04, 0, 0.7, 'lowpass', 120);
        }, 4200, 0.7);
        break;
      default:
        noiseBed(300, 0.5, 0.1);
    }
  }

  // ------------------------------------------------------------- effects

  play(name: SfxName) {
    if (!this.ac || !this.master || this._muted) return;
    switch (name) {
      case 'take':
        this.tone(520, 0.09, 'triangle', 0.15);
        this.tone(780, 0.12, 'triangle', 0.12, 0.06);
        break;
      case 'drop':
        this.burst(0.12, 300, 0.2, 0, 1, 'lowpass');
        this.tone(140, 0.12, 'triangle', 0.12);
        break;
      case 'open':
        this.burst(0.2, 900, 0.1, 0, 2, 'bandpass', 400);
        this.tone(320, 0.16, 'triangle', 0.08, 0.04, 420);
        break;
      case 'close':
        this.tone(300, 0.12, 'triangle', 0.1, 0, 190);
        this.burst(0.1, 500, 0.12, 0.05, 1, 'lowpass');
        break;
      case 'door':
        // long creak
        this.tone(160, 0.7, 'sawtooth', 0.05, 0, 90);
        this.tone(230, 0.6, 'sawtooth', 0.03, 0.1, 150);
        this.burst(0.25, 180, 0.2, 0.55, 1, 'lowpass');
        break;
      case 'unlock':
        this.tone(1400, 0.05, 'square', 0.06);
        this.tone(900, 0.08, 'square', 0.07, 0.09);
        this.burst(0.06, 2400, 0.08, 0.16, 4);
        break;
      case 'treasure': {
        // ascending sparkle arpeggio
        const notes = [660, 880, 1100, 1320];
        notes.forEach((n, i) => this.tone(n, 0.5, 'sine', 0.1, i * 0.09));
        this.tone(1760, 0.9, 'sine', 0.05, 0.36);
        break;
      }
      case 'deposit': {
        const notes = [523, 659, 784, 1046, 1318];
        notes.forEach((n, i) => this.tone(n, 0.6, 'triangle', 0.09, i * 0.11));
        break;
      }
      case 'sword':
        this.burst(0.15, 3200, 0.12, 0, 2.5, 'highpass');
        this.tone(1900, 0.12, 'square', 0.03, 0.01, 1400);
        break;
      case 'swordHit':
        this.burst(0.2, 2400, 0.18, 0, 3);
        this.tone(240, 0.2, 'square', 0.08, 0.02, 120);
        break;
      case 'hurt':
        this.tone(180, 0.25, 'sawtooth', 0.14, 0, 90);
        this.burst(0.2, 400, 0.16, 0.02, 1, 'lowpass');
        break;
      case 'grue':
        // guttural rumble
        this.tone(55, 1.2, 'sawtooth', 0.1, 0, 38);
        this.tone(82, 1.0, 'sawtooth', 0.06, 0.15, 50);
        this.burst(1.0, 150, 0.1, 0.1, 0.8, 'lowpass', 80);
        break;
      case 'die': {
        const notes = [440, 349, 293, 220, 146];
        notes.forEach((n, i) => this.tone(n, 0.5, 'triangle', 0.12, i * 0.28));
        this.tone(73, 1.6, 'sine', 0.12, 1.3, 50);
        break;
      }
      case 'win': {
        // triumphant fanfare
        const seq: [number, number][] = [
          [523, 0], [659, 0.14], [784, 0.28], [1046, 0.42],
          [784, 0.62], [1046, 0.76], [1318, 0.92],
        ];
        for (const [n, t] of seq) {
          this.tone(n, 0.5, 'triangle', 0.12, t);
          this.tone(n / 2, 0.5, 'sine', 0.07, t);
        }
        this.tone(1568, 1.6, 'sine', 0.07, 1.15);
        break;
      }
      case 'step':
        this.burst(0.07, 260, 0.08, 0, 0.8, 'lowpass');
        break;
      case 'fail':
        this.tone(150, 0.18, 'square', 0.05, 0, 120);
        break;
      case 'lamp':
        this.tone(2200, 0.03, 'square', 0.06);
        this.tone(1400, 0.04, 'square', 0.05, 0.05);
        break;
      case 'match':
        this.burst(0.3, 2600, 0.1, 0, 1.4, 'highpass', 900);
        break;
      case 'splash':
        this.burst(0.5, 1000, 0.2, 0, 0.8, 'bandpass', 300);
        this.burst(0.3, 2000, 0.08, 0.08, 1);
        break;
      case 'rumble':
        this.tone(45, 1.6, 'sawtooth', 0.12, 0, 32);
        this.burst(1.4, 100, 0.18, 0, 0.6, 'lowpass', 60);
        break;
      case 'pray': {
        const chord = [261.6, 329.6, 392, 523.2];
        chord.forEach((n) => this.tone(n, 2.4, 'sine', 0.05, 0.05));
        chord.forEach((n) => this.tone(n * 2, 2.0, 'sine', 0.02, 0.4));
        break;
      }
      case 'echo': {
        for (let i = 0; i < 4; i++) {
          this.tone(700, 0.14, 'triangle', 0.1 * Math.pow(0.55, i), i * 0.22);
        }
        break;
      }
      case 'thief':
        this.tone(880, 0.1, 'sine', 0.06);
        this.tone(660, 0.12, 'sine', 0.06, 0.12);
        this.tone(440, 0.3, 'sine', 0.08, 0.24);
        break;
    }
  }
}
