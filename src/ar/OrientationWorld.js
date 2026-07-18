import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Maps device orientation into a Three.js camera pose relative to a
 * neutral "forward" captured at placement / recenter time.
 *
 * Approach:
 * 1. Build full device quaternions (including gamma) for accuracy
 * 2. Take the relative rotation vs the placement pose
 * 3. Read the resulting look direction
 * 4. Apply ONLY yaw + pitch from that direction (roll locked)
 *
 * Using raw alpha/beta deltas makes cannons "slide" left/right when pitching,
 * because alpha gimbal-couples with beta on phones. Forward-vector extraction
 * avoids that.
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
    this._relQ = new THREE.Quaternion();
    this._euler = new THREE.Euler();
    this._forward = new THREE.Vector3();
    this._zee = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
    this._q0 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
    this._qOrient = new THREE.Quaternion();
    this._zAxis = new THREE.Vector3(0, 0, 1);
  }

  captureNeutral(orient) {
    this.neutral = {
      alpha: orient.alpha ?? 0,
      beta: orient.beta ?? 0,
      gamma: orient.gamma ?? 0,
    };
    this._deviceOrientationToQuaternion(
      this.neutral.alpha,
      this.neutral.beta,
      this.neutral.gamma,
      this._neutralQ,
    );
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

  /**
   * THREE.DeviceOrientationControls-style mapping (portrait + screen orient).
   */
  _deviceOrientationToQuaternion(alphaDeg, betaDeg, gammaDeg, target) {
    const alpha = THREE.MathUtils.degToRad(alphaDeg || 0);
    const beta = THREE.MathUtils.degToRad(betaDeg || 0);
    const gamma = THREE.MathUtils.degToRad(gammaDeg || 0);
    const orient =
      typeof window.orientation === 'number'
        ? THREE.MathUtils.degToRad(window.orientation)
        : 0;

    this._euler.set(beta, alpha, -gamma, 'YXZ');
    target.setFromEuler(this._euler);
    target.multiply(this._q0);
    target.multiply(this._zee);
    this._qOrient.setFromAxisAngle(this._zAxis, -orient);
    target.multiply(this._qOrient);
    return target;
  }

  _applyCameraEuler(pitchDeg, yawDeg) {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(
      THREE.MathUtils.degToRad(pitchDeg),
      THREE.MathUtils.degToRad(yawDeg),
      0,
    );
    this.camera.quaternion.setFromEuler(this.camera.rotation);
  }

  /**
   * From a look direction, get yaw (heading) + pitch (elevation). Roll discarded.
   * Three.js camera looks down -Z.
   */
  _yawPitchFromForward(forward) {
    const x = forward.x;
    const y = forward.y;
    const z = forward.z;
    // Heading around Y: 0 = looking down -Z
    const yaw = THREE.MathUtils.radToDeg(Math.atan2(-x, -z));
    // Elevation: + = looking up
    const horiz = Math.hypot(x, z);
    const pitch = THREE.MathUtils.radToDeg(Math.atan2(y, Math.max(1e-6, horiz)));
    return {
      yaw,
      pitch: THREE.MathUtils.clamp(pitch, -80, 80),
    };
  }

  update(smoothOrient) {
    if (!this.enabled) return;

    if (this.useSimulation || !this.hasNeutral) {
      this.yawDeg = this._simYaw;
      this.pitchDeg = this._simPitch;
      this.rollDeg = 0;
      this._applyCameraEuler(this.pitchDeg, this.yawDeg);
      return;
    }

    this._deviceOrientationToQuaternion(
      smoothOrient.alpha ?? 0,
      smoothOrient.beta ?? 0,
      smoothOrient.gamma ?? 0,
      this._deviceQ,
    );

    // Relative rotation from the pose at placement
    this._relQ.copy(this._neutralQ).invert().premultiply(this._deviceQ);

    // Where is the phone looking, relative to placement?
    this._forward.set(0, 0, -1).applyQuaternion(this._relQ);

    const { yaw, pitch } = this._yawPitchFromForward(this._forward);
    this.yawDeg = yaw;
    this.pitchDeg = pitch;
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
