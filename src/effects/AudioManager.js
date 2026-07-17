import { CONFIG } from '../config.js';

/**
 * Lightweight synthesized SFX via Web Audio — no external files required.
 * Unlocked after user gesture.
 */
export class AudioManager {
  constructor() {
    this.enabled = CONFIG.audio.enabledDefault;
    this.ctx = null;
    this.master = null;
    this.volume = CONFIG.audio.volume;
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
    try {
      localStorage.setItem('shirtBlastAr.sound', on ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  loadPreference() {
    try {
      const v = localStorage.getItem('shirtBlastAr.sound');
      if (v === '0') this.setEnabled(false);
      if (v === '1') this.setEnabled(true);
    } catch {
      /* ignore */
    }
  }

  _beep({ freq = 440, dur = 0.08, type = 'square', gain = 0.2, slide = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  playCountdown() {
    this._beep({ freq: 520, dur: 0.1, type: 'triangle', gain: 0.18 });
  }

  playGo() {
    this._beep({ freq: 660, dur: 0.16, type: 'sawtooth', gain: 0.16, slide: 220 });
  }

  playLaunch() {
    this._beep({ freq: 180, dur: 0.09, type: 'square', gain: 0.1, slide: -80 });
  }

  playHit() {
    this._beep({ freq: 880, dur: 0.07, type: 'square', gain: 0.14 });
    this._beep({ freq: 1320, dur: 0.1, type: 'triangle', gain: 0.08 });
  }

  playMiss() {
    this._beep({ freq: 220, dur: 0.12, type: 'sine', gain: 0.08, slide: -100 });
  }

  playBuzzer() {
    this._beep({ freq: 140, dur: 0.35, type: 'sawtooth', gain: 0.14, slide: -60 });
  }

  playResults() {
    this._beep({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.12 });
    setTimeout(() => this._beep({ freq: 659, dur: 0.12, type: 'triangle', gain: 0.12 }), 100);
    setTimeout(() => this._beep({ freq: 784, dur: 0.18, type: 'triangle', gain: 0.12 }), 200);
  }
}
