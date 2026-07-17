export function detectDevice() {
  const ua = navigator.userAgent || '';
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOS = isIPhone || isIPad || /iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isSecure =
    window.isSecureContext ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  return {
    ua,
    isIPhone,
    isIPad,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isMobile: isIOS || isAndroid || /Mobi|Mobile/i.test(ua),
    isSecure,
    hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasDeviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
    hasDeviceMotion: typeof DeviceMotionEvent !== 'undefined',
    needsOrientationPermission:
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function',
    needsMotionPermission:
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function',
    hasWebXR: !!(navigator.xr && navigator.xr.isSessionSupported),
  };
}

export async function isImmersiveArSupported() {
  try {
    if (!navigator.xr?.isSessionSupported) return false;
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

export function isLandscape() {
  return window.matchMedia('(orientation: landscape)').matches && window.innerWidth > window.innerHeight;
}
