import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { StateManager, STATES } from './StateManager.js';
import { UIManager } from '../ui/UIManager.js';
import { ARManager } from '../ar/ARManager.js';
import { SensorManager } from '../ar/SensorManager.js';
import { GameManager } from '../game/GameManager.js';
import { InputManager } from '../input/InputManager.js';
import { ParticlePool } from '../effects/ParticlePool.js';
import { AudioManager } from '../effects/AudioManager.js';
import { HapticsManager } from '../effects/HapticsManager.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { DebugTools } from '../utils/DebugTools.js';
import { detectDevice, isLandscape } from '../utils/DeviceSupport.js';
import { devError } from '../utils/log.js';

export class AppController {
  constructor() {
    this.videoEl = document.getElementById('camera-video');
    this.canvasEl = document.getElementById('game-canvas');
    this.uiRoot = document.getElementById('ui-root');
    this.debugPanel = document.getElementById('debug-panel');

    this.device = detectDevice();
    this.state = new StateManager();
    this.ui = new UIManager(this.uiRoot);
    this.perf = new PerformanceMonitor();
    this.debug = new DebugTools(this.debugPanel);
    this.audio = new AudioManager();
    this.haptics = new HapticsManager();
    this.arManager = new ARManager({
      videoEl: this.videoEl,
      canvasEl: this.canvasEl,
      uiRoot: this.uiRoot,
      performanceMonitor: this.perf,
    });

    this.mode = null;
    this.game = null;
    this.input = null;
    this.particles = null;
    this._last = performance.now();
    this._raf = 0;
    this._countdownTimer = null;
    this._autoPlaceTimer = null;
    this._roundEnded = false;

    this._bindUi();
    this.state.onChange((next) => this.ui.showState(next));
  }

  async boot() {
    this.audio.loadPreference();
    this.ui.setSoundEnabled(this.audio.enabled);
    this.ui.showState(STATES.LOADING);

    const durPill = this.uiRoot.querySelector('#duration-pill');
    if (durPill) durPill.textContent = `${CONFIG.game.duration} seconds`;

    for (let i = 0; i <= 10; i++) {
      this.ui.setLoadProgress(i / 10);
      await wait(35);
    }

    this.state.set(STATES.INTRO);
    this._loop();
    this._watchLandscape();
  }

  _bindUi() {
    this.ui.on('start', () => this._onStart());
    this.ui.on('place', () => this._onPlace());
    this.ui.on('playAgain', () => this._onPlayAgain());
    this.ui.on('retry', () => {
      this.state.force(STATES.INTRO);
    });
    this.ui.on('recenter', () => this._onRecenter());
    this.ui.on('toggleSound', () => {
      this.audio.setEnabled(!this.audio.enabled);
      this.ui.setSoundEnabled(this.audio.enabled);
    });
  }

  async _onStart() {
    if (!this.state.is(STATES.INTRO, STATES.ERROR)) return;
    this.state.force(STATES.REQUESTING_PERMISSIONS);

    try {
      // CRITICAL (iOS Safari): DeviceOrientationEvent.requestPermission()
      // must run in this user-gesture turn BEFORE other awaits (audio/camera),
      // or the motion prompt never appears and tracking stays disabled.
      const sensorManager = new SensorManager();
      await sensorManager.requestPermissions();

      await this.audio.unlock();
      // Clean prior session if retrying after an error
      try {
        this.mode?.getRenderer?.()?.setAnimationLoop?.(null);
      } catch {
        /* ignore */
      }
      this._xrLoopBound = false;
      this.input?.dispose?.();
      this.input = null;
      this.game?.dispose?.();
      this.game = null;
      this.particles?.dispose?.();
      this.particles = null;
      this.arManager.dispose();

      this.mode = await this.arManager.startAfterGesture({ sensorManager });

      // If WebXR won, the early sensor manager is unused — stop its listeners
      if (this.mode.getName() === 'AndroidWebXRMode') {
        sensorManager.dispose();
      }

      const sceneRoot = this.mode.getWorldRoot();
      const camera = this.mode.getCamera();
      const scene = this.mode.getScene();

      this.game = new GameManager({
        sceneRoot,
        camera,
        onHit: (info) => this._onHit(info),
        onMiss: () => {
          this.audio.playMiss();
          this.ui.updateHud({
            score: this.game.scoring.score,
            combo: this.game.scoring.combo,
          });
        },
        onTick: (t) => this.ui.updateHud(t),
        onRoundEnd: (r) => this._onRoundEnd(r),
      });
      this.game.onLaunch = () => this.audio.playLaunch();

      this.particles = new ParticlePool(scene, 64);
      this.particles.setScale(this.perf.effectsScale);

      this.input?.dispose?.();
      this.input = new InputManager({
        canvas: this.canvasEl,
        camera,
        uiRoot: this.uiRoot,
        getTargets: () => this.game.getHitTargets(),
        isGameplayActive: () => this.state.is(STATES.PLAYING),
        onShirtTap: (proj, x, y) => this.game.hitProjectile(proj, x, y),
      });

      this.state.set(STATES.PLACEMENT);
      const isXr = this.mode.getName() === 'AndroidWebXRMode';
      this.ui.setPlacementMode({
        autoPlace: CONFIG.query.autoPlace,
        webxr: isXr,
        hasHitTest: isXr && this.mode.getHitTestAvailable?.(),
      });

      // If iOS motion was denied/unavailable, explain that tracking won't follow the phone
      const orientPerm = this.mode.permissionResult?.orientation;
      if (orientPerm && orientPerm !== 'granted' && orientPerm !== 'simulated') {
        this.ui.els.placeHint.textContent = STR.motionDeniedHint;
      }

      if (CONFIG.query.autoPlace && !isXr) {
        this._startAutoPlace();
      }

      // WebXR presents its own frames — bind Three's XR loop when active
      if (isXr && this.mode.getRenderer?.()) {
        const renderer = this.mode.getRenderer();
        renderer.setAnimationLoop((timestamp, frame) => {
          const now = performance.now();
          let dt = (now - this._last) / 1000;
          this._last = now;
          if (dt > 0.05) dt = 0.05;
          this.perf.tick(now);
          this.mode.update(dt, frame);
          if (this.game && this.state.is(STATES.PLAYING, STATES.COUNTDOWN)) {
            this.game.update(dt);
          } else if (this.game && this.state.is(STATES.PLACEMENT)) {
            this.game.updateCannons(dt);
          }
          if (this.state.is(STATES.PLAYING) || this.state.is(STATES.COUNTDOWN) || this.state.is(STATES.PLACEMENT)) {
            renderer.render(this.mode.getScene(), this.mode.getCamera());
          }
          this.particles?.update(dt);
          this._updateDebug();
        });
        this._xrLoopBound = true;
      }
    } catch (e) {
      devError(e);
      this._showStartError(e);
    }
  }

  _showStartError(e) {
    let msg = STR.errorGeneric;
    if (e?.code === 'INSECURE') msg = STR.errorInsecure;
    else if (e?.code === 'CAMERA_DENIED') msg = STR.errorCameraDenied;
    else if (e?.code === 'CAMERA_UNAVAILABLE' || e?.code === 'NO_MEDIA') msg = STR.errorCameraUnavailable;
    if (CONFIG.debug.enabled && e) {
      const detail = e.message || e.code || String(e);
      msg = `${msg}\n\n(${detail})`;
      devError('[SHIRT BLAST AR] start error', e);
    }
    this.ui.showError(msg);
    this.state.force(STATES.ERROR, e);
  }

  _startAutoPlace() {
    clearTimeout(this._autoPlaceTimer);
    this.ui.setPlacementMode({ autoPlace: true });
    this._autoPlaceTimer = setTimeout(() => {
      if (this.state.is(STATES.PLACEMENT)) this._onPlace();
    }, CONFIG.placement.autoPlaceCountdown * 1000);
  }

  _onPlace() {
    if (!this.state.is(STATES.PLACEMENT) || !this.mode || !this.game) return;
    clearTimeout(this._autoPlaceTimer);

    let pos = this.mode.placeCannon();
    if (!pos) {
      // WebXR waiting for hit — ignore until reticle ready unless forced
      if (this.mode.getName() === 'AndroidWebXRMode') {
        this.ui.els.placeHint.textContent = STR.webxrPlane;
        // Still allow placeCannon fallback inside mode
        pos = this.mode.placeCannon();
      }
    }
    if (!pos) return;

    this.game.placeCannon(pos);
    this.ui.flashPlaceLocked();
    this._beginCountdown();
  }

  _beginCountdown() {
    clearTimeout(this._countdownTimer);
    if (!this.state.is(STATES.COUNTDOWN)) {
      this.state.force(STATES.COUNTDOWN);
    }
    this.ui.showState(STATES.COUNTDOWN);
    const steps = ['3', '2', '1', STR.countdownGo];
    let i = 0;
    const tick = () => {
      if (!this.state.is(STATES.COUNTDOWN)) return;
      const label = steps[i];
      this.ui.setCountdown(label);
      if (label === STR.countdownGo) this.audio.playGo();
      else this.audio.playCountdown();
      i += 1;
      if (i >= steps.length) {
        this._countdownTimer = setTimeout(() => this._startPlaying(), 350);
      } else {
        this._countdownTimer = setTimeout(tick, 650);
      }
    };
    tick();
  }

  _startPlaying() {
    if (!this.state.is(STATES.COUNTDOWN)) return;
    this._roundEnded = false;
    this.game.startRound();
    this.state.set(STATES.PLAYING);
    this.ui.updateHud({ score: 0, combo: 0, remaining: CONFIG.game.duration });
  }

  _onHit({ gained, x, y }) {
    this.audio.playHit();
    this.haptics.pulse(12);
    this.ui.spawnFloatScore(x, y, `+${gained}`);
    this.ui.updateHud({
      score: this.game.scoring.score,
      combo: this.game.scoring.combo,
    });
    if (this.particles && this.perf.effectsScale > 0.2) {
      const cam = this.mode.getCamera();
      const p = cam.position.clone();
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      this.particles.burst(p.add(dir.multiplyScalar(1.2)), 12);
    }
  }

  _onRoundEnd(results) {
    if (this._roundEnded) return;
    this._roundEnded = true;
    this.audio.playBuzzer();
    this.audio.playResults();
    this.ui.showResults(results);
    this.state.set(STATES.RESULTS);
  }

  _onPlayAgain() {
    if (!this.state.is(STATES.RESULTS)) return;
    // Keep AR session; go to countdown with same cannon
    this.game?.pool.clearAll();
    this._roundEnded = false;
    this.state.force(STATES.COUNTDOWN);
    this._beginCountdown();
  }

  _onRecenter() {
    if (!this.mode || !this.game) return;
    const pos = this.mode.recenter();
    if (pos) {
      this.game.recenterCannon(pos);
    } else if (this.mode.getName() === 'AndroidWebXRMode') {
      // Need to re-place via hit-test
      this.state.force(STATES.PLACEMENT);
      this.ui.setPlacementMode({ webxr: true, hasHitTest: this.mode.getHitTestAvailable?.() });
      return;
    }
  }

  _watchLandscape() {
    const check = () => this.ui.setLandscape(isLandscape());
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
  }

  _loop = () => {
    this._raf = requestAnimationFrame(this._loop);
    const now = performance.now();
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.05) dt = 0.05;

    if (document.hidden) return;

    this.perf.tick(now);
    if (this.particles) this.particles.setScale(this.perf.effectsScale);

    // When WebXR owns the animation loop, skip duplicate simulation here
    if (!this._xrLoopBound) {
      if (this.mode) {
        this.mode.update(dt);
      }

      if (this.game && this.state.is(STATES.COUNTDOWN, STATES.PLAYING, STATES.PLACEMENT)) {
        if (this.state.is(STATES.PLAYING) || this.state.is(STATES.COUNTDOWN)) {
          this.game.update(dt);
        } else {
          this.game.updateCannons(dt);
        }
      }

      this.particles?.update(dt);
    }

    this._updateDebug();
  };

  _updateDebug() {
    if (!this.debug.enabled) return;
    const orient = this.mode?.getOrientationWorld?.();
    const sensors = this.mode?.getSensorManager?.();
    const track = this.mode?.stream?.getVideoTracks?.()?.[0];
    const settings = track?.getSettings?.() || {};
    this.debug.update({
      arMode: this.arManager.modeName || this.mode?.getName?.(),
      os: this.device.isIOS ? 'iOS' : this.device.isAndroid ? 'Android' : 'Desktop',
      browser: this.device.isSafari ? 'Safari' : this.device.isChrome ? 'Chrome' : 'Other',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: (window.devicePixelRatio || 1).toFixed(2),
      cameraSize: settings.width ? `${settings.width}x${settings.height}` : CONFIG.query.debug ? 'debug' : '—',
      orientationPermission: this.mode?.permissionResult?.orientation ?? sensors?.orientationPermission,
      motionPermission: this.mode?.permissionResult?.motion ?? sensors?.motionPermission,
      yaw: orient?.yawDeg,
      pitch: orient?.pitchDeg,
      roll: orient?.rollDeg,
      fps: this.perf.fps,
      activeShirts: this.game?.pool.countActive() ?? 0,
      state: this.state.get(),
      score: this.game?.scoring.score ?? 0,
      perfMode: this.perf.mode,
      effectsScale: this.perf.effectsScale,
    });
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    clearTimeout(this._countdownTimer);
    clearTimeout(this._autoPlaceTimer);
    try {
      this.mode?.getRenderer?.()?.setAnimationLoop?.(null);
    } catch {
      /* ignore */
    }
    this._xrLoopBound = false;
    this.input?.dispose();
    this.game?.dispose();
    this.particles?.dispose?.();
    this.particles = null;
    this.arManager.dispose();
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
