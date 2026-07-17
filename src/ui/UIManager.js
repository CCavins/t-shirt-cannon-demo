import { STR } from '../strings.js';
import { CONFIG } from '../config.js';
import { STATES } from '../app/StateManager.js';

export class UIManager {
  constructor(root) {
    this.root = root;
    this.handlers = {};
    this.soundEnabled = true;
    this._build();
  }

  on(event, fn) {
    this.handlers[event] = fn;
  }

  _emit(event, payload) {
    this.handlers[event]?.(payload);
  }

  _build() {
    this.root.innerHTML = `
      <div class="halftone"></div>
      <div class="speed-lines"></div>

      <div id="screen-loading" class="screen">
        <h1 class="brand">${STR.loadingTitle}</h1>
        <p class="tagline">${STR.loadingHint}</p>
        <div class="loading-bar"><span id="load-progress"></span></div>
        <p class="note">${STR.loadingCameraNote}</p>
      </div>

      <div id="screen-intro" class="screen hidden">
        <h1 class="brand">${STR.title}</h1>
        <p class="tagline">${STR.tagline}</p>
        <div class="meta-pill" id="duration-pill">${STR.durationLabel}</div>
        <button type="button" class="btn interactive" id="btn-start">${STR.startButton}</button>
        <p class="note panel">${STR.cameraNote}</p>
        <button type="button" class="sound-toggle interactive" id="btn-sound">${STR.soundOn}</button>
      </div>

      <div id="screen-permissions" class="screen hidden">
        <h1 class="brand">${STR.title}</h1>
        <p class="tagline">${STR.permissionsWorking}</p>
      </div>

      <div id="screen-placement" class="screen screen--clear hidden">
        <div class="placement-guide" id="placement-guide"></div>
        <div class="hud">
          <div class="hud-chip"><span class="label">${STR.hudScore}</span><span class="value" id="place-score">0</span></div>
        </div>
        <div class="placement-footer panel">
          <p class="tagline" id="place-hint" style="margin:0 0 0.8rem">${STR.placeHint}</p>
          <button type="button" class="btn interactive" id="btn-place">${STR.placeButton}</button>
        </div>
      </div>

      <div id="screen-countdown" class="screen screen--clear hidden">
        <div class="countdown-overlay"><div class="countdown-num" id="countdown-num">3</div></div>
      </div>

      <div id="screen-playing" class="screen screen--clear hidden">
        <div class="hud">
          <div class="hud-chip"><span class="label">${STR.hudScore}</span><span class="value" id="hud-score">0</span></div>
          <div class="hud-chip combo"><span class="label">${STR.hudCombo}</span><span class="value" id="hud-combo">0</span></div>
          <div class="hud-chip"><span class="label">${STR.hudTime}</span><span class="value" id="hud-time">30</span></div>
        </div>
      </div>

      <div id="recenter-controls" class="floating-controls hidden">
        <button type="button" id="btn-recenter" class="interactive">${STR.recenter}</button>
      </div>

      <div id="screen-results" class="screen hidden">
        <h1 class="brand" style="font-size:clamp(2.4rem,10vw,4rem)">${STR.resultsTitle}</h1>
        <p class="perf-msg" id="results-msg"></p>
        <div class="panel">
          <div class="hud-chip" style="text-align:center;min-width:auto">
            <span class="label">${STR.resultsScore}</span>
            <span class="value" id="results-score">0</span>
          </div>
          <div class="results-stats">
            <div><span>${STR.resultsHits}</span><strong id="results-hits">0</strong></div>
            <div><span>${STR.resultsMisses}</span><strong id="results-misses">0</strong></div>
            <div><span>${STR.resultsCombo}</span><strong id="results-combo">0</strong></div>
            <div><span>${STR.resultsHigh}</span><strong id="results-high">0</strong></div>
          </div>
          <button type="button" class="btn interactive" id="btn-again">${STR.playAgain}</button>
        </div>
      </div>

      <div id="screen-error" class="screen hidden">
        <h1 class="brand" style="font-size:clamp(2.2rem,9vw,3.5rem)">Oops</h1>
        <p class="panel tagline" id="error-msg">${STR.errorGeneric}</p>
        <button type="button" class="btn interactive" id="btn-retry">${STR.retry}</button>
        <button type="button" class="btn-ghost interactive" id="btn-debug-link">${STR.useDebug}</button>
      </div>

      <div id="landscape-banner" class="landscape-banner hidden">${STR.landscapeHint}</div>
    `;

    this.els = {
      loading: this.root.querySelector('#screen-loading'),
      intro: this.root.querySelector('#screen-intro'),
      permissions: this.root.querySelector('#screen-permissions'),
      placement: this.root.querySelector('#screen-placement'),
      countdown: this.root.querySelector('#screen-countdown'),
      playing: this.root.querySelector('#screen-playing'),
      results: this.root.querySelector('#screen-results'),
      error: this.root.querySelector('#screen-error'),
      loadProgress: this.root.querySelector('#load-progress'),
      countdownNum: this.root.querySelector('#countdown-num'),
      hudScore: this.root.querySelector('#hud-score'),
      hudCombo: this.root.querySelector('#hud-combo'),
      hudTime: this.root.querySelector('#hud-time'),
      placeHint: this.root.querySelector('#place-hint'),
      placeGuide: this.root.querySelector('#placement-guide'),
      recenterControls: this.root.querySelector('#recenter-controls'),
      landscape: this.root.querySelector('#landscape-banner'),
      errorMsg: this.root.querySelector('#error-msg'),
      soundBtn: this.root.querySelector('#btn-sound'),
    };

    this.root.querySelector('#btn-start').addEventListener('click', () => this._emit('start'));
    this.root.querySelector('#btn-place').addEventListener('click', () => this._emit('place'));
    this.root.querySelector('#btn-again').addEventListener('click', () => this._emit('playAgain'));
    this.root.querySelector('#btn-retry').addEventListener('click', () => this._emit('retry'));
    this.root.querySelector('#btn-debug-link').addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('debug', 'true');
      window.location.href = url.toString();
    });
    this.root.querySelector('#btn-recenter').addEventListener('click', () => this._emit('recenter'));
    this.els.soundBtn.addEventListener('click', () => this._emit('toggleSound'));
  }

  setSoundEnabled(on) {
    this.soundEnabled = on;
    this.els.soundBtn.textContent = on ? STR.soundOn : STR.soundOff;
  }

  setLoadProgress(p) {
    this.els.loadProgress.style.width = `${Math.round(p * 100)}%`;
  }

  showState(state) {
    const map = {
      [STATES.LOADING]: 'loading',
      [STATES.INTRO]: 'intro',
      [STATES.REQUESTING_PERMISSIONS]: 'permissions',
      [STATES.PLACEMENT]: 'placement',
      [STATES.COUNTDOWN]: 'countdown',
      [STATES.PLAYING]: 'playing',
      [STATES.RESULTS]: 'results',
      [STATES.ERROR]: 'error',
    };
    for (const key of Object.keys(this.els)) {
      if (this.els[key]?.classList?.contains('screen')) {
        this.els[key].classList.add('hidden');
      }
    }
    const id = map[state];
    if (id && this.els[id]) this.els[id].classList.remove('hidden');

    // Persistent Recenter control during AR session (no popup prompts)
    const showRecenter = [
      STATES.PLACEMENT,
      STATES.COUNTDOWN,
      STATES.PLAYING,
    ].includes(state);
    this.els.recenterControls?.classList.toggle('hidden', !showRecenter);
  }

  setPlacementMode({ autoPlace = false, webxr = false, hasHitTest = false } = {}) {
    if (webxr && hasHitTest) {
      this.els.placeHint.textContent = STR.webxrScan;
      this.els.placeGuide.style.display = 'none';
    } else if (autoPlace) {
      this.els.placeHint.textContent = STR.autoPlaceHint;
    } else {
      this.els.placeHint.textContent = STR.placeHint;
      this.els.placeGuide.style.display = '';
    }
  }

  setCountdown(text) {
    this.els.countdownNum.textContent = text;
    // restart animation
    this.els.countdownNum.style.animation = 'none';
    void this.els.countdownNum.offsetWidth;
    this.els.countdownNum.style.animation = '';
  }

  updateHud({ score, combo, remaining }) {
    if (score != null) this.els.hudScore.textContent = String(score);
    if (combo != null) this.els.hudCombo.textContent = String(combo);
    if (remaining != null) this.els.hudTime.textContent = String(Math.ceil(remaining));
  }

  showResults(data) {
    this.root.querySelector('#results-msg').textContent = data.message;
    this.root.querySelector('#results-score').textContent = String(data.score);
    this.root.querySelector('#results-hits').textContent = String(data.hits);
    this.root.querySelector('#results-misses').textContent = String(data.misses);
    this.root.querySelector('#results-combo').textContent = String(data.bestCombo);
    this.root.querySelector('#results-high').textContent = String(data.highScore);
  }

  showError(message) {
    this.els.errorMsg.textContent = message || STR.errorGeneric;
  }

  setLandscape(show) {
    this.els.landscape.classList.toggle('hidden', !show);
  }

  spawnFloatScore(x, y, text) {
    const el = document.createElement('div');
    el.className = 'float-score';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }

  flashPlaceLocked() {
    this.els.placeHint.textContent = STR.placeLocked;
  }
}
