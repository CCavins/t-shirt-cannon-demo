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
    this.yawDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
    this._simYaw = 0;
    this._simPitch = 0;
    this.useSimulation = false;
    this._deviceQ = new THREE.Quaternion();
    this._neutralQ = new THREE.Quaternion();
    this._outQ = new THREE.Quaternion();
    this._euler = new THREE.Euler();
    this._zee = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
    this._q0 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // -PI/2 X
    this._qOrient = new THREE.Quaternion();
    this._zAxis = new THREE.Vector3(0, 0, 1);
  }

  captureNeutral(orient) {
    this.neutral = {
      alpha: orient.alpha,
      beta: orient.beta,
      gamma: orient.gamma,
    };
    this._deviceOrientationToQuaternion(orient.alpha, orient.beta, orient.gamma, this._neutralQ);
    this.hasNeutral = true;
    this.enabled = true;
    this.useSimulation = false;
    this.yawDeg = 0;
    this.pitchDeg = 0;
    this.rollDeg = 0;
    this.camera.quaternion.identity();
    this.camera.rotation.set(0, 0, 0);
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
      this.camera.quaternion.identity();
      this.camera.rotation.set(0, 0, 0);
    }
  }

  addSimulationDelta(dx, dy) {
    this._simYaw -= dx * 0.15;
    this._simPitch = THREE.MathUtils.clamp(this._simPitch - dy * 0.12, -60, 60);
  }

  /**
   * Standard deviceorientation → Three.js camera quaternion (portrait-friendly).
   * Based on the common THREE.DeviceOrientationControls mapping.
   */
  _deviceOrientationToQuaternion(alphaDeg, betaDeg, gammaDeg, target) {
    const alpha = THREE.MathUtils.degToRad(alphaDeg);
    const beta = THREE.MathUtils.degToRad(betaDeg);
    const gamma = THREE.MathUtils.degToRad(gammaDeg);
    const orient =
      typeof window.orientation === 'number'
        ? THREE.MathUtils.degToRad(window.orientation)
        : 0;

    const euler = this._euler;
    euler.set(beta, alpha, -gamma, 'YXZ');
    target.setFromEuler(euler);
    target.multiply(this._q0);
    target.multiply(this._zee);

    this._qOrient.setFromAxisAngle(this._zAxis, -orient);
    target.multiply(this._qOrient);
    return target;
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

    this._deviceOrientationToQuaternion(
      smoothOrient.alpha,
      smoothOrient.beta,
      smoothOrient.gamma,
      this._deviceQ,
    );

    // Relative rotation: current * inverse(neutral)
    this._outQ.copy(this._neutralQ).invert();
    this._outQ.premultiply(this._deviceQ);
    this.camera.quaternion.copy(this._outQ);

    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.pitchDeg = THREE.MathUtils.radToDeg(this._euler.x);
    this.yawDeg = THREE.MathUtils.radToDeg(this._euler.y);
    this.rollDeg = THREE.MathUtils.radToDeg(this._euler.z);
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
      v.z > 0 &&
      v.z < 1 &&
      v.x > -1 - margin &&
      v.x < 1 + margin &&
      v.y > -1 - margin &&
      v.y < 1 + margin
    );
  }
}
