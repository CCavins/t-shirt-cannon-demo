import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Cannon } from './Cannon.js';
import { ProjectilePool } from './ProjectilePool.js';
import { SpawnManager } from './SpawnManager.js';
import { ScoringManager } from './ScoringManager.js';

export class GameManager {
  constructor({ sceneRoot, camera, onHit, onMiss, onTick, onRoundEnd }) {
    this.sceneRoot = sceneRoot;
    this.camera = camera;
    this.onHit = onHit;
    this.onMiss = onMiss;
    this.onTick = onTick;
    this.onRoundEnd = onRoundEnd;

    this.cannon = new Cannon();
    this.pool = new ProjectilePool(14);
    this.spawner = new SpawnManager();
    this.scoring = new ScoringManager();

    this.cannon.attach(sceneRoot);
    this.pool.attach(sceneRoot);

    this.running = false;
    this.remaining = CONFIG.game.duration;
    this._outOfViewT = 0;
    this.needsRecenterOffer = false;
    this._finishGrace = 0;
    this._viewGrace = 0;
    this.trackingOrientation = false;
    this._camLocal = new THREE.Vector3();
    this._worldPos = new THREE.Vector3();
    this._toCannon = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._ndc = new THREE.Vector3();
  }

  placeCannon(worldPos) {
    const lookAt = this.camera.position.clone();
    this.cannon.placeAt(worldPos, lookAt);
    this._outOfViewT = 0;
    this.needsRecenterOffer = false;
    // Don't nag about recenter right after placement
    this._viewGrace = 5;
  }

  recenterCannon(worldPos) {
    this.placeCannon(worldPos);
    this.spawner.pauseBriefly(0.35);
    this._outOfViewT = 0;
    this.needsRecenterOffer = false;
    this._viewGrace = 5;
  }

  startRound() {
    this.scoring.reset();
    this.pool.clearAll();
    this.spawner.reset();
    this.remaining = CONFIG.game.duration;
    this.running = true;
    this._finishGrace = 0;
    this._outOfViewT = 0;
    this.needsRecenterOffer = false;
    this._viewGrace = Math.max(this._viewGrace, 3);
  }

  stopSpawning() {
    this.running = false;
    this._finishGrace = 0.45;
  }

  update(dt) {
    this.cannon.update(dt);

    if (this.running) {
      this.remaining = Math.max(0, this.remaining - dt);
      this.onTick?.({
        remaining: this.remaining,
        score: this.scoring.score,
        combo: this.scoring.combo,
        hits: this.scoring.hits,
        misses: this.scoring.misses,
      });

      const zone = this.spawner.update(
        dt,
        this.remaining,
        this.pool.countActive(),
        true,
      );
      if (zone) {
        const muzzle = this.cannon.getMuzzleWorld();
        const traj = this.spawner.buildTrajectory(muzzle, this.camera, zone, this.remaining);
        const shirt = this.pool.acquire();
        // Ensure parented if newly created
        if (!shirt.group.parent) this.sceneRoot.add(shirt.group);
        shirt.launch({ ...traj, showBounds: CONFIG.debug.showBounds });
        this.cannon.fire();
        this.onLaunch?.();
      }

      if (this.remaining <= 0) {
        this.stopSpawning();
      }
    } else if (this._finishGrace > 0) {
      this._finishGrace -= dt;
      if (this._finishGrace <= 0 && this.pool.countActive() === 0) {
        this._endRound();
      } else if (this._finishGrace <= 0) {
        // Force clear remaining shirts
        this.pool.clearAll();
        this._endRound();
      }
    }

    for (const p of this.pool.active) {
      if (!p.active) continue;
      const { missed } = p.update(dt);
      if (missed) {
        this.scoring.registerMiss();
        this.onMiss?.();
      }
    }
    this.pool.releaseInactive();

    // Out-of-view recenter offer (only when orientation tracking is live)
    if (this._viewGrace > 0) this._viewGrace -= dt;

    if (
      this.cannon.group.visible &&
      this.running &&
      this.trackingOrientation &&
      this._viewGrace <= 0
    ) {
      const visible = this._isCannonVisible();
      if (!visible) {
        this._outOfViewT += dt;
        if (this._outOfViewT >= CONFIG.orientation.outOfViewSecondsBeforeOffer) {
          this.needsRecenterOffer = true;
        }
      } else {
        this._outOfViewT = 0;
        this.needsRecenterOffer = false;
      }
    } else if (!this.running) {
      this.needsRecenterOffer = false;
      this._outOfViewT = 0;
    }
  }

  /**
   * True when the cannon is roughly in front of the phone and on-screen.
   * Uses camera-space depth (Three looks down -Z) + angle + NDC xy —
   * NOT NDC z>0, which false-triggers for mid-field objects in Three.js.
   */
  _isCannonVisible() {
    this.camera.updateMatrixWorld(true);
    this.cannon.group.updateMatrixWorld(true);
    this.cannon.group.getWorldPosition(this._worldPos);

    // Camera-local: in front means negative Z
    this._camLocal.copy(this._worldPos).applyMatrix4(this.camera.matrixWorldInverse);
    if (this._camLocal.z > -0.4) return false;

    // Angle from camera forward to cannon
    this.camera.getWorldDirection(this._fwd);
    this._toCannon.copy(this._worldPos).sub(this.camera.position).normalize();
    const angleDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(this._fwd.dot(this._toCannon), -1, 1)));
    if (angleDeg < 50) return true;

    // Fallback: NDC x/y only (ignore NDC z — unreliable for this check)
    this._ndc.copy(this._worldPos).project(this.camera);
    return Math.abs(this._ndc.x) < 1.25 && Math.abs(this._ndc.y) < 1.35;
  }

  hitProjectile(projectile, screenX, screenY) {
    if (!projectile || !projectile.active || projectile.hit) return null;
    projectile.markHit();
    const gained = this.scoring.registerHit();
    this.onHit?.({ gained, x: screenX, y: screenY, combo: this.scoring.combo });
    return gained;
  }

  _endRound() {
    const high = this.scoring.saveHighScore();
    this.onRoundEnd?.({
      score: this.scoring.score,
      hits: this.scoring.hits,
      misses: this.scoring.misses,
      bestCombo: this.scoring.bestCombo,
      highScore: high,
      message: this.scoring.performanceMessage(),
    });
  }

  getHitTargets() {
    return this.pool.getHitTargets();
  }

  dispose() {
    this.pool.clearAll();
    this.cannon.hide();
  }
}
