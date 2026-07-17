import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SpawnManager {
  constructor() {
    this._timer = 0;
    this._lastZone = null;
    this._zoneStreak = 0;
    this.paused = false;
    this._pauseTimer = 0;
  }

  reset() {
    this._timer = 0.2;
    this._lastZone = null;
    this._zoneStreak = 0;
    this.paused = false;
    this._pauseTimer = 0;
  }

  pauseBriefly(seconds = 0.4) {
    this.paused = true;
    this._pauseTimer = seconds;
  }

  getDifficulty(remaining) {
    const d = CONFIG.difficulty;
    if (remaining >= d.early.minRemaining) return d.early;
    if (remaining >= d.mid.minRemaining) return d.mid;
    return d.late;
  }

  getInterval(remaining) {
    let interval = CONFIG.spawn.baseInterval;
    if (remaining <= CONFIG.spawn.finalStretchSeconds) {
      interval *= CONFIG.spawn.finalIntervalScale;
    }
    const diff = this.getDifficulty(remaining);
    interval /= diff.speedScale * 0.92;
    return Math.max(CONFIG.spawn.minInterval, interval);
  }

  update(dt, remaining, activeCount, canSpawn) {
    if (this.paused) {
      this._pauseTimer -= dt;
      if (this._pauseTimer <= 0) this.paused = false;
      return null;
    }
    if (!canSpawn) return null;
    this._timer -= dt;
    if (this._timer > 0) return null;
    if (activeCount >= CONFIG.spawn.maxActive) {
      this._timer = 0.12;
      return null;
    }
    this._timer = this.getInterval(remaining);
    return this.pickZone(remaining);
  }

  pickZone() {
    const zones = CONFIG.launchZones;
    let attempts = 0;
    let zone;
    do {
      zone = weightedPick(zones);
      attempts += 1;
      if (zone.name === this._lastZone && this._zoneStreak >= 2 && attempts < 8) {
        continue;
      }
      break;
    } while (attempts < 8);

    if (zone.name === this._lastZone) this._zoneStreak += 1;
    else {
      this._lastZone = zone.name;
      this._zoneStreak = 1;
    }
    return zone;
  }

  /**
   * Build a bezier path from muzzle toward a zone in front of the camera.
   */
  buildTrajectory(muzzleWorld, camera, zone, remaining) {
    const diff = this.getDifficulty(remaining);
    const duration = THREE.MathUtils.lerp(
      CONFIG.projectile.maxFlight,
      CONFIG.projectile.minFlight,
      (diff.speedScale - 1) / 0.4,
    ) * THREE.MathUtils.lerp(0.92, 1.08, Math.random());

    const yaw = THREE.MathUtils.degToRad(zone.yaw + (Math.random() - 0.5) * 8);
    const pitch = THREE.MathUtils.degToRad(zone.pitch + (Math.random() - 0.5) * 6);

    // Target roughly 0.6–1.4m in front of camera, offset by zone angles
    const cam = camera;
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const nearDist = THREE.MathUtils.lerp(0.55, 1.15, Math.random());
    const end = cam.position
      .clone()
      .add(forward.clone().multiplyScalar(nearDist))
      .add(right.multiplyScalar(Math.sin(yaw) * 0.85))
      .add(up.multiplyScalar(Math.sin(pitch) * 0.7));

    // Arc control point
    const mid = muzzleWorld.clone().lerp(end, 0.45);
    mid.y += 0.35 + Math.abs(zone.pitch) * 0.012 + Math.random() * 0.25;
    mid.add(right.clone().multiplyScalar((Math.random() - 0.5) * 0.35));

    // Slight gravity bias on end
    end.y -= CONFIG.projectile.gravity * 0.04;

    return {
      start: muzzleWorld.clone(),
      end,
      control: mid,
      duration: THREE.MathUtils.clamp(duration, CONFIG.projectile.minFlight, CONFIG.projectile.maxFlight),
      sizeScale: diff.sizeScale * THREE.MathUtils.lerp(0.95, 1.08, Math.random()),
      zoneName: zone.name,
    };
  }
}

function weightedPick(zones) {
  const total = zones.reduce((s, z) => s + z.weight, 0);
  let r = Math.random() * total;
  for (const z of zones) {
    r -= z.weight;
    if (r <= 0) return z;
  }
  return zones[zones.length - 1];
}
