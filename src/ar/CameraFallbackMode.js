import { IOSCameraARMode } from './IOSCameraARMode.js';

/**
 * Android / generic camera-overlay — same implementation as iPhone primary.
 * Pass sensorManager from the Start gesture when available.
 */
export class CameraFallbackMode extends IOSCameraARMode {
  getName() {
    return 'CameraFallbackMode';
  }
}
