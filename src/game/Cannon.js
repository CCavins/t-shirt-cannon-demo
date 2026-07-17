import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Chunky arcade T-shirt cannon.
 * Local space: barrel aims down -Z toward the player after placeAt().
 */
export class Cannon {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cannon';
    this.group.visible = false;
    /** Muzzle tip in barrelPivot local space (toward -Z / player) */
    this.muzzleLocal = new THREE.Vector3(0, 0.08, -1.15);
    this._fireT = 0;
    this._basePosition = null;
    this._build();
  }

  _build() {
    // Unlit-ish materials so faces stay readable over the camera feed
    const navy = mat(0x1a3470, 0x102048);
    const cyan = mat(0x3de7ff, 0x0a4a55);
    const coral = mat(0xff6b4a, 0x4a1808);
    const yellow = mat(0xffe566, 0x665500);
    const dark = mat(0x0d1a33, 0x050a14);

    // --- Carriage / chassis (sits under barrel, doesn't face camera as a wall) ---
    const chassis = new THREE.Group();
    chassis.position.set(0, 0, 0.15);
    this.group.add(chassis);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.7), navy);
    bed.position.set(0, 0.12, 0.05);
    chassis.add(bed);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.78), dark);
    skirt.position.set(0, 0.04, 0.05);
    chassis.add(skirt);

    // Side panels — thin, not a frontal slab
    const sideGeo = new THREE.BoxGeometry(0.08, 0.32, 0.55);
    const sideL = new THREE.Mesh(sideGeo, cyan);
    sideL.position.set(-0.42, 0.28, 0.08);
    const sideR = sideL.clone();
    sideR.position.x = 0.42;
    chassis.add(sideL, sideR);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 18);
    const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12);
    for (const x of [-0.48, 0.48]) {
      const wheel = new THREE.Mesh(wheelGeo, coral);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.2, 0.2);
      const hub = new THREE.Mesh(hubGeo, yellow);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      chassis.add(wheel, hub);
    }

    // Rear tank / hopper (behind barrel, away from player)
    const hopper = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), navy);
    hopper.scale.set(1.1, 0.9, 1);
    hopper.position.set(0, 0.42, 0.45);
    chassis.add(hopper);
    const hopperCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 12), yellow);
    hopperCap.position.set(0, 0.62, 0.45);
    chassis.add(hopperCap);

    // --- Barrel assembly (points -Z toward player) ---
    this.barrelPivot = new THREE.Group();
    this.barrelPivot.position.set(0, 0.42, 0.05);
    // Slight upward tilt so the bore reads clearly from the phone
    this.barrelPivot.rotation.x = THREE.MathUtils.degToRad(-12);
    this.group.add(this.barrelPivot);

    const breech = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.35, 20), navy);
    breech.rotation.x = Math.PI / 2;
    breech.position.set(0, 0, 0.05);
    this.barrelPivot.add(breech);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.0, 20), cyan);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.55);
    this.barrelPivot.add(barrel);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 24), yellow);
    ring.position.set(0, 0, -1.05);
    this.barrelPivot.add(ring);

    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20), coral);
    muzzle.position.set(0, 0, -1.12);
    this.barrelPivot.add(muzzle);

    // Accent stripes along barrel
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.7), yellow);
    stripe.position.set(0.14, 0.12, -0.5);
    this.barrelPivot.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.x = -0.14;
    this.barrelPivot.add(stripe2);

    // Muzzle flash — always face camera-ish via lookAt in update; hidden when idle
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffe566,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), flashMat);
    this.muzzleFlash.position.copy(this.muzzleLocal);
    this.muzzleFlash.visible = false;
    this.barrelPivot.add(this.muzzleFlash);

    // Soft glow disc behind muzzle (small, additive) — not a blocking plane
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 16),
      new THREE.MeshBasicMaterial({
        color: 0x3de7ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.set(0, 0, -1.08);
    this.barrelPivot.add(glow);
  }

  attach(parent) {
    parent.add(this.group);
  }

  /**
   * Place in world and aim the barrel toward the player (camera).
   * Uses an aim helper so local -Z faces the target (Three's lookAt uses +Z).
   */
  placeAt(worldPos, lookAtTarget) {
    this._basePosition = worldPos.clone();
    this.group.position.copy(worldPos);

    if (lookAtTarget) {
      // lookAt aims +Z at target; our barrel is -Z, so aim at a point mirrored through the cannon
      const toPlayer = lookAtTarget.clone().sub(worldPos);
      const away = worldPos.clone().sub(toPlayer);
      this.group.lookAt(away);
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
    this.muzzleFlash.visible = true;
    this.muzzleFlash.material.opacity = 0.9;
    this.muzzleFlash.scale.setScalar(1);
  }

  update(dt) {
    if (this._appearing) {
      this._appearT += dt;
      const t = Math.min(1, this._appearT / CONFIG.cannon.appearDuration);
      this.group.scale.setScalar(easeOutBack(t));
      if (t >= 1) this._appearing = false;
    }

    if (this._fireT > 0) {
      this._fireT -= dt;
      const u = Math.max(0, this._fireT / 0.22);
      const kick = Math.sin(u * Math.PI) * 0.1;
      this.barrelPivot.rotation.x = THREE.MathUtils.degToRad(-12) - kick;
      this.muzzleFlash.visible = true;
      this.muzzleFlash.material.opacity = u * 0.9;
      this.muzzleFlash.scale.setScalar(1 + (1 - u) * 0.8);
    } else {
      this.barrelPivot.rotation.x = THREE.MathUtils.lerp(
        this.barrelPivot.rotation.x,
        THREE.MathUtils.degToRad(-12),
        0.2,
      );
      this.muzzleFlash.material.opacity *= 0.7;
      if (this.muzzleFlash.material.opacity < 0.04) {
        this.muzzleFlash.material.opacity = 0;
        this.muzzleFlash.visible = false;
      }
    }

    if (this._basePosition) {
      this.group.position.y =
        this._basePosition.y + Math.sin(performance.now() * 0.003) * 0.02;
    }
  }

  hide() {
    this.group.visible = false;
  }
}

function mat(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.35,
    roughness: 0.55,
    metalness: 0.2,
  });
}

function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}
