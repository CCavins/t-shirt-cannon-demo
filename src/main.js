import { AppController } from './app/AppController.js';

const app = new AppController();
app.boot().catch((err) => {
  console.error('Boot failed', err);
});

window.addEventListener('pagehide', () => {
  app.dispose();
});

// Prevent Safari rubber-band / gesture navigation during play
document.addEventListener(
  'gesturestart',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  'touchmove',
  (e) => {
    if (e.target.closest?.('.debug-panel')) return;
    e.preventDefault();
  },
  { passive: false },
);
