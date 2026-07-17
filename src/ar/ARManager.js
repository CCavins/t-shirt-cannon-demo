import { CONFIG } from '../config.js';
import { detectDevice, isImmersiveArSupported } from '../utils/DeviceSupport.js';
import { IOSCameraARMode } from './IOSCameraARMode.js';
import { CameraFallbackMode } from './CameraFallbackMode.js';
import { DesktopDebugMode } from './DesktopDebugMode.js';
import { AndroidWebXRMode } from './AndroidWebXRMode.js';

export class ARManager {
  constructor({ videoEl, canvasEl, uiRoot, performanceMonitor }) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.uiRoot = uiRoot;
    this.performanceMonitor = performanceMonitor;
    this.device = detectDevice();
    this.mode = null;
    this.modeName = '';
  }

  /**
   * Pick and initialize the AR mode. iPhone always uses camera overlay.
   * @param {{ sensorManager?: import('./SensorManager.js').SensorManager }} [opts]
   *        sensorManager should already have requestPermissions() completed
   *        from the Start button gesture (required on iOS).
   */
  async startAfterGesture({ sensorManager } = {}) {
    if (CONFIG.query.debug) {
      this.mode = new DesktopDebugMode({
        videoEl: this.videoEl,
        canvasEl: this.canvasEl,
        performanceMonitor: this.performanceMonitor,
        sensorManager,
      });
      await this.mode.initialize();
      await this.mode.requestPermissions();
      this.modeName = this.mode.getName();
      return this.mode;
    }

    const tryWebXR =
      this.device.isAndroid &&
      !CONFIG.query.forceFallback &&
      (await isImmersiveArSupported());

    if (tryWebXR) {
      try {
        this.mode = new AndroidWebXRMode({
          canvasEl: this.canvasEl,
          performanceMonitor: this.performanceMonitor,
          overlayRoot: this.uiRoot,
        });
        await this.mode.initialize();
        await this.mode.requestPermissions();
        this.modeName = this.mode.getName();
        return this.mode;
      } catch (e) {
        console.warn('WebXR failed, using camera overlay', e);
        try {
          this.mode?.dispose?.();
        } catch {
          /* ignore */
        }
        this.mode = null;
      }
    }

    const ModeClass = this.device.isIOS ? IOSCameraARMode : CameraFallbackMode;
    this.mode = new ModeClass({
      videoEl: this.videoEl,
      canvasEl: this.canvasEl,
      performanceMonitor: this.performanceMonitor,
      sensorManager,
    });

    await this.mode.initialize();
    await this.mode.requestPermissions();
    this.modeName = this.mode.getName();
    return this.mode;
  }

  getMode() {
    return this.mode;
  }

  dispose() {
    this.mode?.dispose?.();
    this.mode = null;
  }
}
