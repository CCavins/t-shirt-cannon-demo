/**
 * Central tunables for SHIRT BLAST AR.
 * Adjust values here to change pacing, feel, and difficulty without hunting through code.
 */

function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  const num = (key, fallback) => {
    const v = params.get(key);
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const flag = (key) => {
    const v = params.get(key);
    return v === 'true' || v === '1' || v === '';
  };
  return {
    debug: flag('debug') || params.has('debug'),
    duration: num('duration', null),
    showBounds: flag('showBounds'),
    forceFallback: flag('forceFallback'),
    autoPlace: flag('autoPlace'),
    performanceMode: params.get('performanceMode') || null,
  };
}

const query = parseQuery();

export const CONFIG = {
  query,

  game: {
    /** Round length in seconds */
    duration: query.duration ?? 30,
    title: 'SHIRT BLAST AR',
  },

  scoring: {
    hitPoints: 100,
    comboBonusPerStack: 25,
    maxComboBonus: 150,
    highScoreKey: 'shirtBlastAr.highScore',
  },

  spawn: {
    /** Seconds between launches at the start of a round */
    baseInterval: 0.68,
    /** Minimum interval (final stretch) */
    minInterval: 0.48,
    maxActive: 4,
    /** Final N seconds get faster launches */
    finalStretchSeconds: 10,
    finalIntervalScale: 0.78,
  },

  difficulty: {
    /** remaining seconds bands */
    early: { minRemaining: 21, speedScale: 1.0, sizeScale: 1.12 },
    mid: { minRemaining: 11, speedScale: 1.12, sizeScale: 1.0 },
    late: { minRemaining: 0, speedScale: 1.28, sizeScale: 0.92 },
  },

  cannon: {
    /** Virtual meters in front of the placement pose */
    distance: 3.0,
    /** Meters below the initial viewing direction (keep modest so it stays on-screen) */
    heightOffset: 0.65,
    appearDuration: 0.55,
  },

  playableCone: {
    yawLeftDeg: 45,
    yawRightDeg: 45,
    pitchDownDeg: 25,
    pitchUpDeg: 40,
  },

  projectile: {
    /** Flight duration range (seconds) */
    minFlight: 1.35,
    maxFlight: 2.05,
    /** Visible shirt radius (world units at spawn; grows via approach) */
    baseRadius: 0.18,
    maxApproachScale: 2.4,
    /** Invisible hit sphere multiplier vs visible size */
    hitScaleMin: 1.35,
    hitScaleMax: 1.55,
    /** Screen-space secondary tolerance in CSS pixels */
    screenTolerancePx: 42,
    gravity: 1.8,
    spinSpeed: 4.5,
  },

  launchZones: [
    { name: 'upperLeft', weight: 0.14, yaw: -28, pitch: 22 },
    { name: 'upperCenter', weight: 0.16, yaw: 0, pitch: 26 },
    { name: 'upperRight', weight: 0.14, yaw: 28, pitch: 22 },
    { name: 'middleLeft', weight: 0.16, yaw: -32, pitch: 6 },
    { name: 'middleCenter', weight: 0.12, yaw: 0, pitch: 4 },
    { name: 'middleRight', weight: 0.16, yaw: 32, pitch: 6 },
    { name: 'highArc', weight: 0.12, yaw: 0, pitch: 36 },
  ],

  orientation: {
    /** Higher = snappier; lower = smoother (0–1 style lerp per ~16ms) */
    damping: 0.18,
    outOfViewSecondsBeforeOffer: 2.5,
  },

  placement: {
    autoPlaceCountdown: 2.5,
  },

  rendering: {
    /** Default pixel ratio clamp — iPhone-friendly */
    maxPixelRatio: 1.5,
    fov: 65,
    near: 0.1,
    far: 40,
    performanceMode: query.performanceMode || 'auto',
    autoFpsFloor: 45,
  },

  camera: {
    constraints: {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
  },

  audio: {
    enabledDefault: true,
    volume: 0.55,
  },

  debug: {
    enabled: query.debug,
    showBounds: query.showBounds,
  },
};

export default CONFIG;
