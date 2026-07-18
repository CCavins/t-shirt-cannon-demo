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

    // left / center / right
    this.cannons = [new Cannon(), new Cannon(), new Cannon()];
    this.cannons.forEach((c, i) => {
      c.group.name = `cannon-${['left', 'center', 'right'][i]}`;
      c.attach(sceneRoot);
    });

    this.pool = new ProjectilePool(14);
    this.spawner = new SpawnManager();
    this.scoring = new ScoringManager();
    this.pool.attach(sceneRoot);

    this.running = false;
    this.remaining = CONFIG.game.duration;
    this._finishGrace = 0;
    this._lastCannonIndex = -1;
    this._cannonStreak = 0;
    this._right = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  /**
   * Place three cannons: center at worldPos, left/right spaced along camera right axis.
   * All aim at the player.
   */
  placeCannon(worldPos) {
    const lookAt = this.camera.position.clone();
    const spacing = CONFIG.cannon.sideSpacing;

    // Horizontal right relative to current camera view
    this.camera.getWorldDirection(this._tmp);
    this._right.crossVectors(this._tmp, new THREE.Vector3(0, 1, 0));
    if (this._right.lengthSq() < 1e-6) {
      this._right.set(1, 0, 0);
    } else {
      this._right.normalize();
    }

    const leftPos = worldPos.clone().addScaledVector(this._right, -spacing);
    const rightPos = worldPos.clone().addScaledVector(this._right, spacing);

    this.cannons[0].placeAt(leftPos, lookAt);
    this.cannons[1].placeAt(worldPos.clone(), lookAt);
    this.cannons[2].placeAt(rightPos, lookAt);
  }

  recenterCannon(worldPos) {
    this.placeCannon(worldPos);
    this.spawner.pauseBriefly(0.35);
  }

  startRound() {
    this.scoring.reset();
    this.pool.clearAll();
    this.spawner.reset();
    this.remaining = CONFIG.game.duration;
    this.running = true;
    this._finishGrace = 0;
    this._lastCannonIndex = -1;
    this._cannonStreak = 0;
  }

  stopSpawning() {
    this.running = false;
    this._finishGrace = 0.45;
  }

  updateCannons(dt) {
    for (const c of this.cannons) c.update(dt);
  }

  _pickCannonIndex() {
    let idx = (Math.random() * this.cannons.length) | 0;
    // Avoid the same cannon more than twice in a row
    if (idx === this._lastCannonIndex && this._cannonStreak >= 2) {
      idx = (idx + 1 + ((Math.random() * (this.cannons.length - 1)) | 0)) % this.cannons.length;
    }
    if (idx === this._lastCannonIndex) this._cannonStreak += 1;
    else {
      this._lastCannonIndex = idx;
      this._cannonStreak = 1;
    }
    return idx;
  }

  /**
   * Bias launch zones toward the side of the firing cannon so shirts
   * enter frame from that direction and cue the player to look.
   */
  _zoneForCannon(zone, cannonIndex) {
    if (cannonIndex === 1) return zone;
    const bias = cannonIndex === 0 ? -18 : 18;
    return {
      ...zone,
      yaw: zone.yaw + bias,
    };
  }

  update(dt) {
    this.updateCannons(dt);

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
        const cannonIndex = this._pickCannonIndex();
        const cannon = this.cannons[cannonIndex];
        const muzzle = cannon.getMuzzleWorld();
        const biasedZone = this._zoneForCannon(zone, cannonIndex);
        const traj = this.spawner.buildTrajectory(
          muzzle,
          this.camera,
          biasedZone,
          this.remaining,
        );
        const shirt = this.pool.acquire();
        if (!shirt.group.parent) this.sceneRoot.add(shirt.group);
        shirt.launch({ ...traj, showBounds: CONFIG.debug.showBounds });
        cannon.fire();
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
    for (const c of this.cannons) c.hide();
  }
}
