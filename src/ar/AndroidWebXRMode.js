import * as THREE from 'three';
import { ARMode } from './ARMode.js';
import { CONFIG } from '../config.js';
import { devWarn } from '../utils/log.js';

/**
 * Optional Android enhancement. Never required to play.
 * Falls back by throwing so ARManager can use camera overlay.
 */
export class AndroidWebXRMode extends ARMode {
  constructor({ canvasEl, performanceMonitor, overlayRoot }) {
    super();
    this.canvasEl = canvasEl;
    this.performanceMonitor = performanceMonitor;
    this.overlayRoot = overlayRoot;
    this.session = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.worldRoot = null;
    this.orientWorld = null;
    this.refSpace = null;
    this.hitTestSource = null;
    this.reticle = null;
    this._ready = false;
    this._placed = false;
    this._placementPos = null;
    this._xrFrame = null;
  }

  getName() {
    return 'AndroidWebXRMode';
  }

  isReady() {
    return this._ready;
  }

  getCamera() {
    return this.camera;
  }

  getScene() {
    return this.scene;
  }

  getRenderer() {
    return this.renderer;
  }

  getWorldRoot() {
    return this.worldRoot;
  }

  getOrientationWorld() {
    return this.orientWorld;
  }

  async initialize() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.rendering.fov,
      window.innerWidth / Math.max(1, window.innerHeight),
      CONFIG.rendering.near,
      CONFIG.rendering.far,
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, CONFIG.rendering.maxPixelRatio),
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.xr.enabled = true;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.position.set(1, 3, 2);
    this.scene.add(key);

    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x3de7ff, transparent: true, opacity: 0.85 }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    this._ready = true;
  }

  async requestPermissions() {
    if (!navigator.xr) {
      const err = new Error('NO_XR');
      err.code = 'NO_XR';
      throw err;
    }
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      const err = new Error('XR_UNSUPPORTED');
      err.code = 'XR_UNSUPPORTED';
      throw err;
    }

    const opts = {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay'],
    };
    if (this.overlayRoot) {
      opts.domOverlay = { root: this.overlayRoot };
    }

    try {
      this.session = await navigator.xr.requestSession('immersive-ar', opts);
    } catch (e) {
      // Retry without hit-test / overlay
      try {
        this.session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hit-test'],
        });
      } catch (e2) {
        const err = new Error('XR_SESSION');
        err.code = 'XR_SESSION';
        err.cause = e2;
        throw err;
      }
    }

    this.session.addEventListener('end', () => {
      this.session = null;
    });

    await this.renderer.xr.setSession(this.session);
    this.refSpace = await this.session.requestReferenceSpace('local-floor');

    try {
      const viewerSpace = await this.session.requestReferenceSpace('viewer');
      if (this.session.requestHitTestSource) {
        this.hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });
      }
    } catch (e) {
      devWarn('hit-test unavailable', e);
      this.hitTestSource = null;
    }

    return { camera: true, orientation: 'xr', motion: 'xr', webxr: true };
  }

  /** Called from UI tap during placement */
  placeCannon() {
    if (this._placementPos) {
      this._placed = true;
      if (this.reticle) this.reticle.visible = false;
      return this._placementPos.clone();
    }
    // Fallback: place ~3m forward of camera
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const pos = this.camera.position.clone().add(dir.multiplyScalar(CONFIG.cannon.distance));
    pos.y = this.camera.position.y - CONFIG.cannon.heightOffset;
    this._placed = true;
    if (this.reticle) this.reticle.visible = false;
    return pos;
  }

  recenter() {
    this._placed = false;
    this._placementPos = null;
    if (this.reticle) this.reticle.visible = true;
    return null;
  }

  update(_dt, frame) {
    this._xrFrame = frame || this.renderer?.xr?.getFrame?.();
    if (this._xrFrame && this.hitTestSource && !this._placed) {
      const hits = this._xrFrame.getHitTestResults(this.hitTestSource);
      if (hits.length && this.refSpace) {
        const pose = hits[0].getPose(this.refSpace);
        if (pose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
          this._placementPos = new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
          // Nudge away from player if too close
          const camPos = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
          const to = this._placementPos.clone().sub(camPos);
          if (to.length() < 2.2) {
            to.setLength(CONFIG.cannon.distance);
            this._placementPos.copy(camPos).add(to);
            this._placementPos.y = camPos.y - CONFIG.cannon.heightOffset;
          }
        }
      } else if (this.reticle) {
        this.reticle.visible = false;
      }
    }

    // When using XR, Three's XR manager renders; still call render for consistency on non-XR frames
    if (!this.renderer.xr.isPresenting) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getHitTestAvailable() {
    return !!this.hitTestSource;
  }

  dispose() {
    this._ready = false;
    if (this.hitTestSource) {
      try {
        this.hitTestSource.cancel();
      } catch {
        /* ignore */
      }
      this.hitTestSource = null;
    }
    if (this.session) {
      try {
        this.session.end();
      } catch {
        /* ignore */
      }
      this.session = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
