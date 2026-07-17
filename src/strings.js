/** All player-visible copy — keep UI free of hard-coded literals where practical. */

export const STR = {
  title: 'SHIRT BLAST AR',
  tagline: 'Tap the flying shirts before time runs out.',
  durationLabel: '30 seconds',
  startButton: 'Start Camera Game',
  cameraNote: 'Your camera is used for the AR experience. Nothing is recorded or uploaded.',
  soundOn: 'Sound on',
  soundOff: 'Sound off',

  loadingTitle: 'SHIRT BLAST AR',
  loadingHint: 'Loading arena assets…',
  loadingCameraNote: 'Camera access is requested only after you tap Start.',

  permissionsWorking: 'Starting camera & motion sensors…',
  motionDeniedHint:
    'Motion access was denied — the game still works, but the cannon won’t move with your phone. Enable Motion & Orientation Access in Settings → Safari → (or site settings), then tap Retry.',

  placeHint: 'Point your phone toward an open area.',
  placeButton: 'Place Cannon',
  placeLocked: 'Cannon locked. Get ready.',
  autoPlaceHint: 'Hold steady — placing automatically…',

  recenter: 'Recenter',
  recenterOffer: 'Cannon out of view. Recenter?',
  yesRecenter: 'Recenter now',
  dismiss: 'Keep playing',

  countdownGo: 'GO!',

  hudScore: 'Score',
  hudTime: 'Time',
  hudCombo: 'Combo',

  resultsTitle: 'Round Over!',
  resultsScore: 'Final score',
  resultsHits: 'Hits',
  resultsMisses: 'Missed',
  resultsCombo: 'Best combo',
  resultsHigh: 'High score',
  playAgain: 'Play Again',
  reposition: 'Reposition Cannon',

  performance: {
    low: 'Warm-up round — try again!',
    mid: 'Solid catch game!',
    high: 'Arena MVP!',
    elite: 'Shirt blast legend!',
  },

  errorCameraDenied:
    'Camera access is needed to play. In Safari: Settings → Safari → Camera, or tap the aA / site settings icon and allow Camera, then tap Retry.',
  errorCameraUnavailable:
    'No rear camera is available on this device. Try another phone, or open with ?debug=true for a desktop test mode.',
  errorInsecure:
    'Camera access requires HTTPS (or localhost). Open this page from GitHub Pages or a secure local tunnel.',
  errorGeneric: 'Something went wrong starting the experience. Please try again.',
  retry: 'Retry',
  useDebug: 'Open debug mode',

  landscapeHint: 'Portrait works best — rotate your phone for the full arena view.',

  webxrPlane: 'Floor detected — tap to place the cannon.',
  webxrScan: 'Move your phone to find the floor.',
};

export default STR;
