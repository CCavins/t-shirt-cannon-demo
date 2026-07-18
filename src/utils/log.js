import { CONFIG } from '../config.js';

/** Console helpers — silent in production unless ?debug=true */
export function devWarn(...args) {
  if (CONFIG.debug.enabled) console.warn(...args);
}

export function devError(...args) {
  if (CONFIG.debug.enabled) console.error(...args);
}
