import { CONFIG } from '../config.js';

export class DebugTools {
  constructor(panelEl) {
    this.panel = panelEl;
    this.enabled = CONFIG.debug.enabled;
    if (this.panel) {
      this.panel.hidden = !this.enabled;
    }
    this.stats = {};
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.panel) this.panel.hidden = !on;
  }

  update(partial) {
    Object.assign(this.stats, partial);
    if (!this.enabled || !this.panel) return;
    const s = this.stats;
    this.panel.textContent = [
      `mode: ${s.arMode ?? '—'}`,
      `os: ${s.os ?? '—'}  browser: ${s.browser ?? '—'}`,
      `viewport: ${s.viewport ?? '—'}  dpr: ${s.dpr ?? '—'}`,
      `camera: ${s.cameraSize ?? '—'}`,
      `orientPerm: ${s.orientationPermission ?? '—'}  motionPerm: ${s.motionPermission ?? '—'}`,
      `yaw: ${fmt(s.yaw)}  pitch: ${fmt(s.pitch)}  roll: ${fmt(s.roll)}`,
      `fps: ${s.fps ?? '—'}  shirts: ${s.activeShirts ?? 0}`,
      `state: ${s.state ?? '—'}  score: ${s.score ?? 0}`,
      `perf: ${s.perfMode ?? '—'}  fx: ${fmt(s.effectsScale)}`,
    ].join('\n');
  }
}

function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1) : '—';
}
