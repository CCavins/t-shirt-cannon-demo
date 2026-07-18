import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Maps device orientation into a Three.js camera pose relative to a
 * neutral "forward" captured at placement / recenter time.
 *
 * Important: camera uses yaw + pitch only (roll locked to 0).
 * Full device quaternions couple gamma into a banked horizon when you
 * look up/down, which makes world props (cannons) appear to tilt left/right.
 *
 * World layout:
 * - Player at origin looking -Z initially after placement
 * - Cannons placed along -Z at configured distance / height
 */
export class OrientationWorld {
  constructor(camera) {
    this.camera = camera;
    this.neutral = { alpha: 0, beta: 0, gamma: 0 };
    this.enabled = false;
    this.hasNeutral = false;
    this.yawDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
    this._simYaw = 0;
    this._simPitch = 0;
    this.useSimulation = false;
  }

  captureNeutral(orient) {
    this.neutral = {
      alpha: orient.alpha ?? 0,
      beta: orient.beta ?? 0,
      gamma: orient.gamma ?? 0,
    };
    this.hasNeutral = true;
    this.enabled = true;
    this.useSimulation = false;
    this.yawDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
    this._applyCameraEuler(0, 0);
  }

  recenter(orient) {
    this.captureNeutral(orient);
  }

  setSimulation(enabled) {
    this.useSimulation = enabled;
    if (enabled) {
      this.enabled = true;
      this.hasNeutral = true;
      this._simYaw = 0;
      this._simPitch = 0;
      this.yawDeg = 0;
      this.pitchDeg = 0;
      this.rollDeg = 0;
      this._applyCameraEuler(0, 0);
    }
  }

  addSimulationDelta(dx, dy) {
    this._simYaw -= dx * 0.15;
    this._simPitch = THREE.MathUtils.clamp(this._simPitch - dy * 0.12, -60, 60);
  }

  _applyCameraEuler(pitchDeg, yawDeg) {
    // YXZ: pitch then yaw, roll always 0 — keeps the horizon level
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(
      THREE.MathUtils.degToRad(pitchDeg),
      THREE.MathUtils.degToRad(yawDeg),
      0,
    );
    this.camera.quaternion.setFromEuler(this.camera.rotation);
  }

  /**
   * Apply relative device orientation to the camera (yaw/pitch only).
   */
  update(smoothOrient) {
    if (!this.enabled) return;

    if (this.useSimulation || !this.hasNeutral) {
      this.yawDeg = this._simYaw;
      this.pitchDeg = this._simPitch;
      this.rollDeg = 0;
      this._applyCameraEuler(this.pitchDeg, this.yawDeg);
      return;
    }

    // Compass yaw (alpha) and front/back tilt (beta) relative to placement pose.
    // Ignore gamma entirely — it is the source of the left/right bank when pitching.
    const yawDelta = normalizeDeg((smoothOrient.alpha ?? 0) - this.neutral.alpha);
    const pitchDelta = normalizeDeg((smoothOrient.beta ?? 0) - this.neutral.beta);

    this.yawDeg = -yawDelta;
    this.pitchDeg = THREE.MathUtils.clamp(pitchDelta, -80, 80);
    this.rollDeg = 0;

    this._applyCameraEuler(this.pitchDeg, this.yawDeg);
  }

  getForward(target = new THREE.Vector3()) {
    this.camera.getWorldDirection(target);
    return target;
  }

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

  isWorldPointRoughlyVisible(worldPos, margin = 0.35) {
    const v = worldPos.clone().project(this.camera);
    return (
      v.z > -1 &&
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
