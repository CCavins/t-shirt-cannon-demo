import { IOSCameraARMode } from './IOSCameraARMode.js';

/**
 * Android / generic camera-overlay — same implementation as iPhone primary.
 */
export class CameraFallbackMode extends IOSCameraARMode {
  getName() {
    return 'CameraFallbackMode';
  }
}
