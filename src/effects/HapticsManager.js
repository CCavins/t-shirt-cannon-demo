export class HapticsManager {
  pulse(ms = 15) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
