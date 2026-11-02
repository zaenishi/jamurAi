// State & helper bersama untuk semua modul UI.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const S = {
  store: null, profile: null, history: [], busy: false, image: null,
  lastSend: 0, sentTimes: [], tts: false, genMode: false, route: 'home',
};

export function toast(msg, ok = false) {
  const t = document.createElement('div'); t.className = 'toast' + (ok ? ' ok' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
}
export const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
