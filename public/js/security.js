// Lapisan deterrent anti-inspect. Ini hanya MENYULITKAN, bukan mengamankan:
// kerahasiaan sebenarnya dijaga oleh proxy /api (tidak ada key/endpoint di client).
export function initSecurity(cfg) {
  if (!cfg.ANTI_INSPECT) return;
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  if (local && cfg.DISABLE_ON_LOCALHOST) return;

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const blocked =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
      (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(k)) ||
      (e.ctrlKey && ['u', 's'].includes(k)) ||
      (e.metaKey && k === 'u');
    if (blocked) { e.preventDefault(); e.stopPropagation(); return false; }
  }, true);

  // Console cleanser
  const noop = () => {};
  for (const m of ['log', 'info', 'warn', 'debug', 'table', 'dir', 'trace']) { try { console[m] = noop; } catch {} }
  setInterval(() => { try { console.clear(); } catch {} }, 3000);

  // Debugger loop: membeku hanya saat DevTools terbuka (tanpa eval, aman dengan CSP)
  const trap = () => {
    const t = performance.now();
    debugger; // eslint-disable-line no-debugger
    if (performance.now() - t > 120) document.documentElement.classList.add('devtools');
  };
  setInterval(trap, 1500);

  document.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
}
