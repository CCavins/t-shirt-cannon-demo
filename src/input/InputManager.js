import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Layered targeting:
 * 1) Raycast enlarged invisible colliders
 * 2) Screen-space distance tolerance
 * 3) Front-most eligible target
 */
export class InputManager {
  constructor({ canvas, camera, getTargets, onShirtTap, isGameplayActive, uiRoot }) {
    this.canvas = canvas;
    this.camera = camera;
    this.getTargets = getTargets;
    this.onShirtTap = onShirtTap;
    this.isGameplayActive = isGameplayActive;
    this.uiRoot = uiRoot;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._onPointer = this._handlePointer.bind(this);
    this.enabled = true;

    canvas.addEventListener('pointerdown', this._onPointer, { passive: false });
  }

  setCamera(camera) {
    this.camera = camera;
  }

  _isUiTarget(el) {
    if (!el || !this.uiRoot) return false;
    return el !== this.canvas && this.uiRoot.contains(el) && el.closest('button, a, .interactive, .toast');
  }

  _handlePointer(e) {
    if (!this.enabled || !this.isGameplayActive?.()) return;
    if (this._isUiTarget(e.target)) return;

    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    this.pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((y - rect.top) / rect.height) * 2 + 1;

    const targets = this.getTargets?.() || [];
    if (!targets.length) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length) {
      // Front-most
      hits.sort((a, b) => a.distance - b.distance);
      const proj = hits[0].object.userData.projectile;
      if (proj) {
        this.onShirtTap?.(proj, x, y);
        return;
      }
    }

    // Secondary: screen-space nearest active shirt
    const tol = CONFIG.projectile.screenTolerancePx;
    let best = null;
    let bestDist = tol;
    const tmp = new THREE.Vector3();
    for (const hitMesh of targets) {
      const proj = hitMesh.userData.projectile;
      if (!proj?.active || proj.hit) continue;
      tmp.copy(proj.group.position).project(this.camera);
      if (tmp.z > 1) continue;
      const sx = (tmp.x * 0.5 + 0.5) * rect.width + rect.left;
      const sy = (-tmp.y * 0.5 + 0.5) * rect.height + rect.top;
      const d = Math.hypot(sx - x, sy - y);
      // Prefer closer in depth when similar screen distance
      const score = d + hitsDepthPenalty(tmp.z);
      if (d <= bestDist && (!best || score < best.score)) {
        best = { proj, score, d };
        bestDist = Math.max(d, tol * 0.5);
      }
    }
    if (best) {
      this.onShirtTap?.(best.proj, x, y);
    }
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this._onPointer);
  }
}

function hitsDepthPenalty(nz) {
  return nz * 8;
}
