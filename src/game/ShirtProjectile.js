import * as THREE from 'three';
import { CONFIG } from '../config.js';

let sharedGeo = null;
let sharedMat = null;
let sharedHitGeo = null;

function getShared() {
  if (!sharedGeo) {
    sharedGeo = new THREE.CapsuleGeometry(0.14, 0.22, 4, 10);
    sharedMat = new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      roughness: 0.65,
      metalness: 0.05,
      emissive: 0x401008,
      emissiveIntensity: 0.25,
    });
    sharedHitGeo = new THREE.SphereGeometry(1, 8, 8);
  }
  return { sharedGeo, sharedMat, sharedHitGeo };
}

export class ShirtProjectile {
  constructor() {
    const { sharedGeo, sharedMat, sharedHitGeo } = getShared();
    this.mesh = new THREE.Mesh(sharedGeo, sharedMat.clone());
    this.mesh.castShadow = false;
    this.hitMesh = new THREE.Mesh(
      sharedHitGeo,
      new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.hitMesh.userData.isShirtHit = true;
    this.hitMesh.userData.projectile = this;

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.add(this.hitMesh);
    this.group.visible = false;

    this.active = false;
    this.hit = false;
    this.age = 0;
    this.duration = 1.5;
    this.start = new THREE.Vector3();
    this.control = new THREE.Vector3();
    this.end = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.zoneName = '';
    this.sizeScale = 1;
    this._tmp = new THREE.Vector3();
  }

  launch({ start, end, control, duration, sizeScale, zoneName, showBounds }) {
    this.active = true;
    this.hit = false;
    this.age = 0;
    this.duration = duration;
    this.start.copy(start);
    this.end.copy(end);
    this.control.copy(control);
    this.sizeScale = sizeScale;
    this.zoneName = zoneName;
    this.spin.set(
      (Math.random() - 0.5) * CONFIG.projectile.spinSpeed,
      (Math.random() - 0.5) * CONFIG.projectile.spinSpeed,
      (Math.random() - 0.5) * CONFIG.projectile.spinSpeed,
    );
    this.group.visible = true;
    this.group.position.copy(start);
    const hitR =
      CONFIG.projectile.baseRadius *
      sizeScale *
      THREE.MathUtils.lerp(CONFIG.projectile.hitScaleMin, CONFIG.projectile.hitScaleMax, Math.random());
    this.hitMesh.scale.setScalar(hitR);
    this.hitMesh.material.visible = !!showBounds;
    if (showBounds) {
      this.hitMesh.material.transparent = true;
      this.hitMesh.material.opacity = 0.2;
      this.hitMesh.material.color.set(0x00ff88);
      this.hitMesh.material.visible = true;
    }
    this._updateScale(0);
  }

  _bezier(t, target) {
    const u = 1 - t;
    target.set(
      u * u * this.start.x + 2 * u * t * this.control.x + t * t * this.end.x,
      u * u * this.start.y + 2 * u * t * this.control.y + t * t * this.end.y,
      u * u * this.start.z + 2 * u * t * this.control.z + t * t * this.end.z,
    );
    return target;
  }

  _updateScale(t) {
    // Grow as it approaches the player (t → 1)
    const approach = THREE.MathUtils.lerp(1, CONFIG.projectile.maxApproachScale, t * t);
    const s = CONFIG.projectile.baseRadius * 4.2 * this.sizeScale * approach;
    // Cap so it never fills the whole screen
    const capped = Math.min(s, 1.35);
    this.mesh.scale.setScalar(capped);
  }

  update(dt) {
    if (!this.active || this.hit) return { done: false, missed: false };
    this.age += dt;
    const t = Math.min(1, this.age / this.duration);
    this._bezier(t, this._tmp);
    this.group.position.copy(this._tmp);
    this.mesh.rotation.x += this.spin.x * dt;
    this.mesh.rotation.y += this.spin.y * dt;
    this.mesh.rotation.z += this.spin.z * dt;
    this._updateScale(t);

    if (t >= 1) {
      this.deactivate();
      return { done: true, missed: true };
    }
    return { done: false, missed: false };
  }

  markHit() {
    this.hit = true;
    this.deactivate();
  }

  deactivate() {
    this.active = false;
    this.group.visible = false;
  }
}
