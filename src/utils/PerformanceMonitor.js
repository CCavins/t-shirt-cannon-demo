import { CONFIG } from '../config.js';

export class PerformanceMonitor {
  constructor() {
    this.frames = 0;
    this.fps = 60;
    this._lastFpsAt = performance.now();
    this.mode = CONFIG.rendering.performanceMode;
    this.effectsScale = 1;
    this.pixelRatioScale = 1;
    this._lowStreak = 0;
  }

  tick(now = performance.now()) {
    this.frames += 1;
    if (now - this._lastFpsAt >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this._lastFpsAt));
      this.frames = 0;
      this._lastFpsAt = now;
      this._maybeAutoTune();
    }
  }

  _maybeAutoTune() {
    if (this.mode !== 'auto') {
      this._applyFixedMode();
      return;
    }
    if (this.fps < CONFIG.rendering.autoFpsFloor) {
      this._lowStreak += 1;
      if (this._lowStreak >= 3) {
        this.effectsScale = Math.max(0.35, this.effectsScale - 0.15);
        this.pixelRatioScale = Math.max(0.55, this.pixelRatioScale - 0.1);
      }
    } else {
      this._lowStreak = 0;
      this.effectsScale = Math.min(1, this.effectsScale + 0.02);
      this.pixelRatioScale = Math.min(1, this.pixelRatioScale + 0.01);
    }
  }

  _applyFixedMode() {
    switch (this.mode) {
      case 'high':
        this.effectsScale = 1;
        this.pixelRatioScale = 1;
        break;
      case 'balanced':
        this.effectsScale = 0.75;
        this.pixelRatioScale = 0.85;
        break;
      case 'low':
        this.effectsScale = 0.4;
        this.pixelRatioScale = 0.6;
        break;
      default:
        break;
    }
  }

  setMode(mode) {
    this.mode = mode || 'auto';
    this._applyFixedMode();
  }

  getMaxPixelRatio() {
    return CONFIG.rendering.maxPixelRatio * this.pixelRatioScale;
  }
}
