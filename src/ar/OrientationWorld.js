import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Maps device orientation into a Three.js camera pose relative to a
 * neutral "forward" captured at placement / recenter time.
 *
 * World layout:
 * - Player at origin looking -Z initially after placement
 * - Cannon placed along -Z at configured distance / height
 */
export class OrientationWorld {
  constructor(camera) {
    this.camera = camera;
    this.neutral = { alpha: 0, beta: 0, gamma: 0 };
    this.enabled = false;
    this.hasNeutral = false;
    this._euler = new THREE.Euler();
    this._q = new THREE.Quaternion();
    this._q0 = new THREE.Quaternion();
    this._zee = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
    this._qScreen = new THREE.Quaternion();
    this._offset = new THREE.Quaternion();
    this.yawDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
    this._simYaw = 0;
    this._simPitch = 0;
    this.useSimulation = false;
  }

  captureNeutral(smoothOrient) {
    this.neutral = {
      alpha: smoothOrient.alpha,
      beta: smoothOrient.beta,
      gamma: smoothOrient.gamma,
    };
    this.hasNeutral = true;
    this.enabled = true;
    this._updateOffset();
  }

  recenter(smoothOrient) {
    this.captureNeutral(smoothOrient);
  }

  setSimulation(enabled) {
    this.useSimulation = enabled;
    if (enabled) {
      this.enabled = true;
      this.hasNeutral = true;
      this._simYaw = 0;
      this._simPitch = 0;
    }
  }

  addSimulationDelta(dx, dy) {
    this._simYaw -= dx * 0.15;
    this._simPitch = THREE.MathUtils.clamp(this._simPitch - dy * 0.12, -60, 60);
  }

  _updateOffset() {
    // Screen orientation
    const orient = typeof window.orientation === 'number' ? window.orientation : 0;
    this._qScreen.setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(-orient));
  }

  /**
   * Apply relative device orientation to the camera.
   */
  update(smoothOrient) {
    if (!this.enabled) return;

    if (this.useSimulation || !this.hasNeutral) {
      this.yawDeg = this._simYaw;
      this.pitchDeg = this._simPitch;
      this.rollDeg = 0;
      this.camera.rotation.set(
        THREE.MathUtils.degToRad(this.pitchDeg),
        THREE.MathUtils.degToRad(this.yawDeg),
        0,
        'YXZ',
      );
      return;
    }

    this._updateOffset();

    const alpha = smoothOrient.alpha - this.neutral.alpha;
    const beta = smoothOrient.beta - this.neutral.beta;
    const gamma = smoothOrient.gamma - this.neutral.gamma;

    // DeviceOrientation: alpha z, beta x, gamma y — convert to camera relative look
    // Relative yaw from alpha, pitch from beta delta (portrait)
    this.yawDeg = -normalizeDeg(alpha);
    this.pitchDeg = THREE.MathUtils.clamp(normalizeDeg(beta), -80, 80);
    this.rollDeg = THREE.MathUtils.clamp(gamma * 0.35, -25, 25);

    // Soft cone bias — still allow looking around but keep feel stable
    this.camera.rotation.set(
      THREE.MathUtils.degToRad(this.pitchDeg),
      THREE.MathUtils.degToRad(this.yawDeg),
      THREE.MathUtils.degToRad(this.rollDeg),
      'YXZ',
    );
  }

  /**
   * World-space forward direction from current camera.
   */
  getForward(target = new THREE.Vector3()) {
    this.camera.getWorldDirection(target);
    return target;
  }

  /**
   * Place a point in front of the placement neutral (world -Z when camera at identity).
   */
  getPlacementPosition(distance = CONFIG.cannon.distance, heightOffset = CONFIG.cannon.heightOffset) {
    return new THREE.Vector3(0, -heightOffset, -distance);
  }

  isDirectionInPlayableCone(yawDeg, pitchDeg) {
    const c = CONFIG.playableCone;
    return (
      yawDeg >= -c.yawLeftDeg &&
      yawDeg <= c.yawRightDeg &&
      pitchDeg >= -c.pitchDownDeg &&
      pitchDeg <= c.pitchUpDeg
    );
  }

  isWorldPointRoughlyVisible(worldPos, margin = 0.15) {
    const v = worldPos.clone().project(this.camera);
    return (
      v.z < 1 &&
      v.x > -1 - margin &&
      v.x < 1 + margin &&
      v.y > -1 - margin &&
      v.y < 1 + margin
    );
  }
}

function normalizeDeg(d) {
  let x = ((d + 180) % 360) - 180;
  if (x < -180) x += 360;
  return x;
}
