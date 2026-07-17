/**
 * Shared interface for AR modes.
 * Implementations: IOSCameraARMode, CameraFallbackMode, DesktopDebugMode, AndroidWebXRMode
 */
export class ARMode {
  async initialize() {}
  async requestPermissions() {
    return { camera: false, orientation: 'denied', motion: 'denied' };
  }
  placeCannon() {}
  recenter() {}
  update(_dt, _frame) {}
  getCamera() {
    return null;
  }
  getScene() {
    return null;
  }
  getRenderer() {
    return null;
  }
  getWorldRoot() {
    return null;
  }
  getName() {
    return 'base';
  }
  isReady() {
    return false;
  }
  dispose() {}
}
