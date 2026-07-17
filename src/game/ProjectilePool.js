import { ShirtProjectile } from './ShirtProjectile.js';

export class ProjectilePool {
  constructor(size = 12) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(new ShirtProjectile());
    }
  }

  attach(parent) {
    for (const p of this.pool) parent.add(p.group);
  }

  acquire() {
    let p = this.pool.find((x) => !x.active);
    if (!p) {
      p = new ShirtProjectile();
      this.pool.push(p);
    }
    this.active.push(p);
    return p;
  }

  releaseInactive() {
    this.active = this.active.filter((p) => p.active);
  }

  getActive() {
    return this.active.filter((p) => p.active && !p.hit);
  }

  getHitTargets() {
    return this.getActive().map((p) => p.hitMesh);
  }

  clearAll() {
    for (const p of this.pool) p.deactivate();
    this.active = [];
  }

  countActive() {
    return this.getActive().length;
  }
}
