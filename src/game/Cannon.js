import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Cannon {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cannon';
    this.group.visible = false;
    this.muzzleLocal = new THREE.Vector3(0, 0.35, -0.85);
    this._fireT = 0;
    this._build();
  }

  _build() {
    const navy = new THREE.MeshStandardMaterial({
      color: 0x1a3470,
      roughness: 0.55,
      metalness: 0.25,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0x3de7ff,
      roughness: 0.4,
      metalness: 0.35,
      emissive: 0x0a3a44,
      emissiveIntensity: 0.4,
    });
    const coral = new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      roughness: 0.5,
      metalness: 0.15,
    });
    const yellow = new THREE.MeshStandardMaterial({
      color: 0xffe566,
      roughness: 0.45,
      metalness: 0.2,
      emissive: 0x665500,
      emissiveIntensity: 0.25,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.7), navy);
    base.position.set(0, 0.14, 0.1);
    this.group.add(base);

    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16);
    const w1 = new THREE.Mesh(wheelGeo, coral);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.5, 0.22, 0.15);
    const w2 = w1.clone();
    w2.position.x = 0.5;
    this.group.add(w1, w2);

    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.set(0, 0.38, 0);
    this.group.add(this.barrelPivot);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 18), accent);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, -0.35);
    this.barrelPivot.add(barrel);

    const tip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), yellow);
    tip.position.set(0, 0.1, -0.9);
    this.barrelPivot.add(tip);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), navy);
    body.position.set(0, 0.35, 0.15);
    this.group.add(body);

    // Muzzle flash plane
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffe566,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.muzzleFlash = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), flashMat);
    this.muzzleFlash.position.copy(this.muzzleLocal);
    this.barrelPivot.add(this.muzzleFlash);
  }

  attach(parent) {
    parent.add(this.group);
  }

  placeAt(worldPos, lookAtTarget) {
    this._basePosition = worldPos.clone();
    this.group.position.copy(worldPos);
    if (lookAtTarget) {
      this.group.lookAt(lookAtTarget);
    }
    this.group.visible = true;
    this.group.scale.setScalar(0.01);
    this._appearT = 0;
    this._appearing = true;
  }

  getMuzzleWorld(target = new THREE.Vector3()) {
    return this.barrelPivot.localToWorld(target.copy(this.muzzleLocal));
  }

  fire() {
    this._fireT = 0.22;
    this.muzzleFlash.material.opacity = 0.95;
  }

  update(dt) {
    if (this._appearing) {
      this._appearT += dt;
      const t = Math.min(1, this._appearT / CONFIG.cannon.appearDuration);
      const s = easeOutBack(t);
      this.group.scale.setScalar(s);
      if (t >= 1) this._appearing = false;
    }

    if (this._fireT > 0) {
      this._fireT -= dt;
      const kick = Math.sin((this._fireT / 0.22) * Math.PI) * 0.12;
      this.barrelPivot.rotation.x = -kick;
      this.muzzleFlash.material.opacity = Math.max(0, (this._fireT / 0.22) * 0.9);
      const fs = 1 + (1 - this._fireT / 0.22) * 0.5;
      this.muzzleFlash.scale.setScalar(fs);
    } else {
      this.barrelPivot.rotation.x *= 0.8;
      this.muzzleFlash.material.opacity *= 0.7;
    }

    // Subtle idle bob around anchored base (do not accumulate drift)
    if (this._basePosition) {
      this.group.position.y =
        this._basePosition.y + Math.sin(performance.now() * 0.003) * 0.025;
    }
  }

  hide() {
    this.group.visible = false;
  }
}

function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}
