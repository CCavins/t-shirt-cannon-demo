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
  }

  placeCannon(worldPos) {
    const lookAt = this.camera.position.clone();
    this.cannon.placeAt(worldPos, lookAt);
  }

  recenterCannon(worldPos) {
    this.placeCannon(worldPos);
    this.spawner.pauseBriefly(0.35);
    this._outOfViewT = 0;
    this.needsRecenterOffer = false;
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

    // Out-of-view recenter offer
    if (this.cannon.group.visible && this.running) {
      const visible = this._isCannonVisible();
      if (!visible) {
        this._outOfViewT += dt;
        if (this._outOfViewT >= CONFIG.orientation.outOfViewSecondsBeforeOffer) {
          this.needsRecenterOffer = true;
        }
      } else {
        this._outOfViewT = 0;
      }
    }
  }

  _isCannonVisible() {
    const v = this.cannon.group.position.clone().project(this.camera);
    return v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.25;
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
