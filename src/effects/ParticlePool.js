import * as THREE from 'three';

export class ParticlePool {
  constructor(scene, max = 80) {
    this.scene = scene;
    this.max = max;
    this.particles = [];
    this.geo = new THREE.PlaneGeometry(0.06, 0.1);
    this.colors = [0xffe566, 0x3de7ff, 0xff6b4a, 0xffffff, 0xff3d6e];
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: this.colors[i % this.colors.length],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        active: false,
      });
    }
    this.scale = 1;
  }

  setScale(s) {
    this.scale = s;
  }

  burst(worldPos, count = 14) {
    const n = Math.max(2, Math.floor(count * this.scale));
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.mesh.visible = true;
      p.mesh.position.copy(worldPos);
      p.mesh.material.opacity = 1;
      p.mesh.material.color.set(this.colors[(Math.random() * this.colors.length) | 0]);
      p.vel.set(
        (Math.random() - 0.5) * 2.2,
        Math.random() * 2.0 + 0.4,
        (Math.random() - 0.5) * 2.2,
      );
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
      p.mesh.rotation.z = Math.random() * Math.PI;
      spawned += 1;
      if (spawned >= n) break;
    }
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 3.2 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = 1 - t;
      p.mesh.rotation.z += dt * 6;
    }
  }

  dispose() {
    for (const p of this.particles) {
      this.scene?.remove(p.mesh);
      p.mesh.material?.dispose?.();
    }
    this.geo?.dispose?.();
    this.particles = [];
    this.scene = null;
  }
}
