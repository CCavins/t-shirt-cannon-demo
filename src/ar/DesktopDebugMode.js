import { IOSCameraARMode } from './IOSCameraARMode.js';

/**
 * Desktop / no-camera test mode. Pointer-drag simulates orientation.
 */
export class DesktopDebugMode extends IOSCameraARMode {
  constructor(opts) {
    super(opts);
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._onDown = this._pointerDown.bind(this);
    this._onMove = this._pointerMove.bind(this);
    this._onUp = this._pointerUp.bind(this);
  }

  getName() {
    return 'DesktopDebugMode';
  }

  async initialize() {
    await super.initialize();
    // Dark simulated camera background
    if (this.videoEl) {
      this.videoEl.style.background =
        'radial-gradient(ellipse at 50% 40%, #243b6b 0%, #0a1630 55%, #050a14 100%)';
      this.videoEl.removeAttribute('src');
      this.videoEl.srcObject = null;
    }
    this.canvasEl.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  async requestPermissions() {
    this.permissionResult = {
      camera: false,
      orientation: 'simulated',
      motion: 'unavailable',
    };
    this.orientWorld.setSimulation(true);
    return this.permissionResult;
  }

  placeCannon() {
    this.orientWorld.setSimulation(true);
    this.orientWorld._simYaw = 0;
    this.orientWorld._simPitch = 0;
    this.camera.rotation.set(0, 0, 0);
    return this.orientWorld.getPlacementPosition();
  }

  recenter() {
    return this.placeCannon();
  }

  _pointerDown(e) {
    // Don't capture UI clicks — only canvas
    if (e.target !== this.canvasEl) return;
    // Secondary button / two-finger style: hold and drag to look
    // Primary taps still reach InputManager for hitting shirts
    if (e.button !== 0) return;
    this._dragging = true;
    this._moved = false;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
  }

  _pointerMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    if (!this._moved && Math.hypot(dx, dy) < 6) return;
    this._moved = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.orientWorld.addSimulationDelta(dx, dy);
  }

  _pointerUp() {
    this._dragging = false;
    this._moved = false;
  }

  dispose() {
    this.canvasEl.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    super.dispose();
  }
}
