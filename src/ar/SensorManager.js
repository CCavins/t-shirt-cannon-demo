import { CONFIG } from '../config.js';
import { detectDevice } from '../utils/DeviceSupport.js';

/**
 * Device orientation / motion permissions and smoothed euler angles.
 * Does NOT use accelerometer for positional tracking.
 *
 * On iOS Safari, requestPermissions() must be invoked directly from a
 * user-gesture call stack (before other awaits like getUserMedia / audio).
 */
export class SensorManager {
  constructor() {
    this.device = detectDevice();
    this.orientationPermission = 'unknown';
    this.motionPermission = 'unknown';
    this.hasOrientation = false;
    this.raw = { alpha: 0, beta: 0, gamma: 0 };
    this.smooth = { alpha: 0, beta: 0, gamma: 0 };
    this._listening = false;
    this._onOrient = this._handleOrientation.bind(this);
    this._onMotion = this._handleMotion.bind(this);
    this.motionSample = null;
    this._requested = false;
  }

  /**
   * Call this as the first await inside the Start button handler.
   */
  async requestPermissions() {
    if (this._requested && this.orientationPermission !== 'unknown') {
      return {
        orientation: this.orientationPermission,
        motion: this.motionPermission,
      };
    }
    this._requested = true;

    // Orientation — must run before other awaits break the iOS gesture chain
    if (this.device.needsOrientationPermission) {
      try {
        this.orientationPermission = await DeviceOrientationEvent.requestPermission();
      } catch (e) {
        console.warn('Orientation permission error', e);
        this.orientationPermission = 'denied';
      }
    } else if (this.device.hasDeviceOrientation) {
      // Android / desktop: listening is enough (no prompt API)
      this.orientationPermission = 'granted';
    } else {
      this.orientationPermission = 'unavailable';
    }

    // Motion (optional) — still in the same gesture if we haven't awaited camera yet
    if (this.device.needsMotionPermission) {
      try {
        this.motionPermission = await DeviceMotionEvent.requestPermission();
      } catch (e) {
        console.warn('Motion permission error', e);
        this.motionPermission = 'denied';
      }
    } else if (this.device.hasDeviceMotion) {
      this.motionPermission = 'granted';
    } else {
      this.motionPermission = 'unavailable';
    }

    if (this.orientationPermission === 'granted') {
      this.startListening();
    }

    return {
      orientation: this.orientationPermission,
      motion: this.motionPermission,
    };
  }

  startListening() {
    if (this._listening) return;
    this._listening = true;
    window.addEventListener('deviceorientation', this._onOrient, true);
    if (this.motionPermission === 'granted') {
      window.addEventListener('devicemotion', this._onMotion, true);
    }
  }

  stopListening() {
    if (!this._listening) return;
    this._listening = false;
    window.removeEventListener('deviceorientation', this._onOrient, true);
    window.removeEventListener('devicemotion', this._onMotion, true);
  }

  _handleOrientation(e) {
    if (e.alpha == null && e.beta == null && e.gamma == null) return;
    this.hasOrientation = true;
    this.raw.alpha = e.alpha ?? 0;
    this.raw.beta = e.beta ?? 0;
    this.raw.gamma = e.gamma ?? 0;
  }

  _handleMotion(e) {
    this.motionSample = e.accelerationIncludingGravity;
  }

  /** Copy raw → smooth immediately (use when capturing neutral pose). */
  snapToRaw() {
    this.smooth.alpha = this.raw.alpha;
    this.smooth.beta = this.raw.beta;
    this.smooth.gamma = this.raw.gamma;
  }

  /**
   * Wait briefly for the first deviceorientation sample after permission grant.
   */
  waitForSample(timeoutMs = 900) {
    if (this.hasOrientation) return Promise.resolve(true);
    if (this.orientationPermission !== 'granted') return Promise.resolve(false);

    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        if (this.hasOrientation) {
          this.snapToRaw();
          resolve(true);
          return;
        }
        if (performance.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  /**
   * Call every frame to damp toward the latest raw sample.
   */
  update() {
    const d = CONFIG.orientation.damping;
    this.smooth.alpha = lerpAngle(this.smooth.alpha, this.raw.alpha, d);
    this.smooth.beta = lerp(this.smooth.beta, this.raw.beta, d);
    this.smooth.gamma = lerp(this.smooth.gamma, this.raw.gamma, d);
  }

  dispose() {
    this.stopListening();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}
