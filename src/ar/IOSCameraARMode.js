import * as THREE from 'three';
import { ARMode } from './ARMode.js';
import { SensorManager } from './SensorManager.js';
import { OrientationWorld } from './OrientationWorld.js';
import { CONFIG } from '../config.js';
import { detectDevice } from '../utils/DeviceSupport.js';

/**
 * PRIMARY production AR path for iPhone Safari (and shared camera-overlay).
 */
export class IOSCameraARMode extends ARMode {
  constructor({ videoEl, canvasEl, performanceMonitor }) {
    super();
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.performanceMonitor = performanceMonitor;
    this.device = detectDevice();
    this.sensors = new SensorManager();
    this.stream = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.worldRoot = null;
    this.orientWorld = null;
    this._ready = false;
    this._paused = false;
    this._onVis = this._onVisibility.bind(this);
    this._onResize = this._resize.bind(this);
    this.permissionResult = null;
  }

  getName() {
    return this.device.isIOS ? 'IOSCameraARMode' : 'CameraOverlayMode';
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

  getSensorManager() {
    return this.sensors;
  }

  async initialize() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.rendering.fov,
      window.innerWidth / Math.max(1, window.innerHeight),
      CONFIG.rendering.near,
      CONFIG.rendering.far,
    );
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._resize();

    // Soft ambient + single key — unlit materials do most of the work
    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0xfff2cc, 0.55);
    key.position.set(2, 4, 1);
    this.scene.add(amb, key);

    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    this.orientWorld = new OrientationWorld(this.camera);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    document.addEventListener('visibilitychange', this._onVis);

    this._ready = true;
  }

  async requestPermissions() {
    if (!this.device.isSecure) {
      const err = new Error('INSECURE');
      err.code = 'INSECURE';
      throw err;
    }
    if (!this.device.hasMediaDevices) {
      const err = new Error('NO_MEDIA');
      err.code = 'NO_MEDIA';
      throw err;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(CONFIG.camera.constraints);
    } catch (e) {
      const err = new Error('CAMERA');
      err.code =
        e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError'
          ? 'CAMERA_DENIED'
          : 'CAMERA_UNAVAILABLE';
      err.cause = e;
      throw err;
    }

    this.videoEl.srcObject = this.stream;
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.muted = true;
    try {
      await this.videoEl.play();
    } catch (e) {
      console.warn('video play', e);
    }

    const sensorPerms = await this.sensors.requestPermissions();
    this.permissionResult = {
      camera: true,
      orientation: sensorPerms.orientation,
      motion: sensorPerms.motion,
    };

    // If orientation denied, still playable via screen-relative / sim-neutral
    if (sensorPerms.orientation !== 'granted') {
      this.orientWorld.setSimulation(true);
    }

    return this.permissionResult;
  }

  placeCannon() {
    const orient = this.sensors.smooth;
    if (this.sensors.hasOrientation && this.permissionResult?.orientation === 'granted') {
      this.orientWorld.captureNeutral(orient);
      this.orientWorld.useSimulation = false;
    } else {
      this.orientWorld.setSimulation(true);
    }
    // Reset camera to identity relative pose at placement
    this.camera.rotation.set(0, 0, 0);
    return this.orientWorld.getPlacementPosition();
  }

  recenter() {
    if (this.sensors.hasOrientation && this.permissionResult?.orientation === 'granted') {
      this.orientWorld.recenter(this.sensors.smooth);
    } else {
      this.orientWorld._simYaw = 0;
      this.orientWorld._simPitch = 0;
    }
    this.camera.rotation.set(0, 0, 0);
    return this.orientWorld.getPlacementPosition();
  }

  update(dt) {
    if (this._paused || !this._ready) return;
    this.sensors.update();
    this.orientWorld.update(this.sensors.smooth);
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const pr = Math.min(
      window.devicePixelRatio || 1,
      this.performanceMonitor?.getMaxPixelRatio?.() ?? CONFIG.rendering.maxPixelRatio,
    );
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.canvasEl.style.width = `${w}px`;
    this.canvasEl.style.height = `${h}px`;
  }

  async _onVisibility() {
    if (document.hidden) {
      this._paused = true;
      try {
        this.videoEl.pause();
      } catch {
        /* ignore */
      }
      return;
    }
    this._paused = false;
    // Resume camera if tracks ended while backgrounded
    if (this.stream) {
      const live = this.stream.getVideoTracks().some((t) => t.readyState === 'live');
      if (!live) {
        try {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = await navigator.mediaDevices.getUserMedia(CONFIG.camera.constraints);
          this.videoEl.srcObject = this.stream;
        } catch (e) {
          console.warn('camera resume failed', e);
        }
      }
    }
    try {
      await this.videoEl.play();
    } catch {
      /* ignore */
    }
  }

  dispose() {
    this._ready = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    document.removeEventListener('visibilitychange', this._onVis);
    this.sensors.dispose();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
