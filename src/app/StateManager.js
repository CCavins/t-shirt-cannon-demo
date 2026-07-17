export const STATES = {
  LOADING: 'LOADING',
  INTRO: 'INTRO',
  REQUESTING_PERMISSIONS: 'REQUESTING_PERMISSIONS',
  PLACEMENT: 'PLACEMENT',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  RESULTS: 'RESULTS',
  ERROR: 'ERROR',
};

const ALLOWED = {
  [STATES.LOADING]: [STATES.INTRO, STATES.ERROR],
  [STATES.INTRO]: [STATES.REQUESTING_PERMISSIONS, STATES.ERROR],
  [STATES.REQUESTING_PERMISSIONS]: [STATES.PLACEMENT, STATES.ERROR],
  [STATES.PLACEMENT]: [STATES.COUNTDOWN, STATES.ERROR, STATES.INTRO],
  [STATES.COUNTDOWN]: [STATES.PLAYING, STATES.ERROR],
  [STATES.PLAYING]: [STATES.RESULTS, STATES.ERROR, STATES.PLACEMENT],
  [STATES.RESULTS]: [STATES.PLACEMENT, STATES.INTRO, STATES.COUNTDOWN],
  [STATES.ERROR]: [STATES.INTRO, STATES.REQUESTING_PERMISSIONS],
};

export class StateManager {
  constructor() {
    this.state = STATES.LOADING;
    this._listeners = new Set();
    this.errorInfo = null;
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  get() {
    return this.state;
  }

  is(...states) {
    return states.includes(this.state);
  }

  set(next, payload = null) {
    if (this.state === next) return false;
    const allowed = ALLOWED[this.state] || [];
    if (!allowed.includes(next)) {
      console.warn(`[StateManager] blocked ${this.state} → ${next}`);
      return false;
    }
    const prev = this.state;
    this.state = next;
    if (next === STATES.ERROR) this.errorInfo = payload;
    else if (prev === STATES.ERROR) this.errorInfo = null;
    for (const fn of this._listeners) fn(next, prev, payload);
    return true;
  }

  force(next, payload = null) {
    const prev = this.state;
    this.state = next;
    if (next === STATES.ERROR) this.errorInfo = payload;
    for (const fn of this._listeners) fn(next, prev, payload);
    return true;
  }
}
