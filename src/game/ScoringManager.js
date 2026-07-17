import { CONFIG } from '../config.js';
import { STR } from '../strings.js';

export class ScoringManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.bestCombo = 0;
  }

  registerHit() {
    this.hits += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const bonus = Math.min(
      CONFIG.scoring.maxComboBonus,
      Math.max(0, this.combo - 1) * CONFIG.scoring.comboBonusPerStack,
    );
    const gained = CONFIG.scoring.hitPoints + bonus;
    this.score += gained;
    return gained;
  }

  registerMiss() {
    this.misses += 1;
    this.combo = 0;
  }

  getHighScore() {
    try {
      return Number(localStorage.getItem(CONFIG.scoring.highScoreKey)) || 0;
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    const prev = this.getHighScore();
    if (this.score > prev) {
      try {
        localStorage.setItem(CONFIG.scoring.highScoreKey, String(this.score));
      } catch {
        /* ignore */
      }
      return this.score;
    }
    return prev;
  }

  performanceMessage() {
    const s = this.score;
    if (s >= 2500) return STR.performance.elite;
    if (s >= 1500) return STR.performance.high;
    if (s >= 700) return STR.performance.mid;
    return STR.performance.low;
  }
}
