import { CONFIG } from '../config.js';
import { initSecurity } from './security.js';
import { createStore } from './store.js';
import { createMushroom } from './mushroom.js';
import { S, $, $$, toast, sleep, reduceMotion, icon } from './state.js';
import { initChat, renderThread, clearChat, toBottom } from './chat.js';
import { initCall, startCall } from './call.js';
import { ttsSupported, speak, listVoices, stopSpeaking } from './voice.js';

initSecurity(CONFIG.SECURITY);

// ───────── routing (hash) ─────────
const ROUTES = { '': 'home', home: 'home', fitur: 'fitur', pembuat: 'pembuat', dokumentasi: 'dokumentasi', chat: 'chat' };
const TITLES = {
  home: 'MyraAi — teman ngobrol AI yang ceria', fitur: 'Fitur — MyraAi', pembuat: 'Pembuat — MyraAi',
  dokumentasi: 'Dokumentasi — MyraAi', chat: 'Chat — MyraAi',
};
const parseRoute = () => ROUTES[location.hash.replace(/^#\/?/, '').split(/[?/]/)[0].toLowerCase()] ?? 'home';

let whoM = null;
async function route() {
  const r = parseRoute();
  if (r === 'chat' && !S.profile) await askName();
  S.route = r; document.body.dataset.route = r; document.title = TITLES[r];
  for (const sec of $$('.page')) {
    const on = sec.dataset.page === r;
    if (on && sec.hidden) { sec.hidden = false; sec.style.animation = 'none'; void sec.offsetHeight; sec.style.animation = ''; }
    else if (!on) sec.hidden = true;
  }
  for (const a of $$('[data-route]')) a.classList.toggle('on', a.dataset.route === r);
  closeDrawer(); movePill();
  if (r === 'chat') {
    window.scrollTo(0, 0); renderThread(); checkStatus();
    whoM ||= createMushroom($('#who-av'), { track: false }); whoM.happy(1800);
    if (matchMedia('(pointer:fine)').matches) $('#input').focus({ preventScroll: true });
  } else { window.scrollTo({ top: 0, behavior: 'auto' }); onScroll(); }
  heroDemoToggle();
}

// ───────── navbar ─────────
function movePill() {
  const pill = $('#nav-pill'); const a = $('#nav-links a.on');
  if (!a) { pill.style.opacity = 0; return; }
  pill.style.opacity = 1; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`;
}
function onScroll() {
  $('#nav').classList.toggle('scrolled', scrollY > 8);
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#progress').style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
}
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#burger').setAttribute('aria-expanded', 'false'); $('#burger use').setAttribute('href', '#i-menu'); }
function toggleDrawer() {
  const open = !$('#drawer').classList.contains('open');
  $('#drawer').classList.toggle('open', open); $('#drawer').setAttribute('aria-hidden', String(!open));
  $('#burger').setAttribute('aria-expanded', String(open)); $('#burger use').setAttribute('href', open ? '#i-close' : '#i-menu');
}

// ───────── efek visual ─────────
function spores() {
  const host = $('.spores'); if (reduceMotion) return;
  const cols = ['#FF8A5C', '#6E5BFF', '#27C99A', '#FFC247', '#FF7EB6', '#3FB1FF'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;--s:${4 + Math.random() * 6}px;--c:${cols[i % cols.length]};--d:${16 + Math.random() * 18}s;--dl:-${Math.random() * 24}s;--x:${(Math.random() - .5) * 160}px`;
    host.append(s);
  }
}
function reveals() {
  const els = $$('[data-reveal]');
  const settle = (el) => setTimeout(() => el.classList.add('settled'), 1300 + (parseFloat(el.style.getPropertyValue('--i')) || 0) * 90);
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((e) => { e.classList.add('in'); settle(e); }); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); settle(en.target); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}
function tilt() {
  if (reduceMotion) return;
  for (const el of $$('.tilt')) {
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`); el.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
}
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn'); if (!b || reduceMotion) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
  const s = document.createElement('span'); s.className = 'ripple';
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.append(s); setTimeout(() => s.remove(), 650);
});

// demo percakapan di hero
const DEMOS = [
  { q: 'Apa itu rekursi?', a: 'Fungsi yang memanggil dirinya sendiri sampai masalahnya cukup kecil untuk dijawab.' },
  { q: 'Buatkan gambar kucing astronot', a: 'Siap! Aku lukis kucing astronot di bulan dulu ya.' },
  { q: 'Ini gambar apa, ya?', a: 'Aku melihat pegunungan hijau dengan matahari terbit yang hangat.' },
  { q: 'Kasih ide bekal sekolah', a: 'Nasi kepal isi telur, potongan apel, dan sedikit kacang. Praktis dan sehat.' },
];
let heroM = null, demoToken = 0;
async function runDemo(token) {
  const box = $('#hero-demo'), u = box.querySelector('.d-user'), a = box.querySelector('.d-ai');
  let i = 0;
  while (token === demoToken) {
    const d = DEMOS[i++ % DEMOS.length];
    u.textContent = d.q; a.textContent = ''; a.classList.remove('show', 'typing'); u.classList.add('show');
    await sleep(900); if (token !== demoToken) break;
    a.classList.add('show', 'typing'); heroM?.talk();
    for (let k = 1; k <= d.a.length && token === demoToken; k++) { a.textContent = d.a.slice(0, k); heroM?.pulse(Math.random()); await sleep(26); }
    a.classList.remove('typing'); heroM?.stopTalk(); heroM?.happy(1200);
    await sleep(3200); u.classList.remove('show'); a.classList.remove('show'); await sleep(700);
  }
}
function heroDemoToggle() {
  const want = S.route === 'home' && !document.hidden;
  if (want && !demoToken) { if (reduceMotion) { const b = $('#hero-demo'); b.querySelector('.d-user').textContent = DEMOS[0].q; b.querySelector('.d-ai').textContent = DEMOS[0].a; b.querySelectorAll('div').forEach((x) => x.classList.add('show')); return; } demoToken = Date.now(); runDemo(demoToken); }
  else if (!want && demoToken) demoToken = 0;
}

// ───────── status AI ─────────
async function checkStatus() {
  const el = $('#status');
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('/api/chat', { cache: 'no-store', signal: ctl.signal }); clearTimeout(t);
    const j = await r.json();
    el.dataset.s = j.ok ? 'on' : 'off'; el.querySelector('b').textContent = j.ok ? 'AI online' : 'AI offline';
  } catch { el.dataset.s = 'off'; el.querySelector('b').textContent = 'AI offline'; }
  const sub = $('#who-sub'); if (sub) sub.textContent = el.dataset.s === 'on' ? 'Online, siap membantu' : 'Sedang offline';
}

// ───────── profil & pengaturan ─────────
function greet() {
  const h = $('#hello');
  if (S.profile?.name) { h.hidden = false; h.textContent = `Selamat datang kembali, ${S.profile.name}.`; }
}
async function askName() {
  const d = $('#dlg-welcome'); const wm = createMushroom($('#welcome-mushroom'), { track: false }); wm.happy(2500);
  return new Promise((res) => {
    const done = async (name) => {
      S.profile = { name, tts: false, created: Date.now() }; await S.store.saveProfile(S.profile); greet(); d.close(); wm.destroy(); res();
    };
    $('#form-welcome').onsubmit = (e) => { e.preventDefault(); const n = $('#name-input').value.trim().slice(0, 30); if (n) done(n); };
    $('#btn-skip-name').onclick = () => done('');
    d.addEventListener('cancel', (e) => e.preventDefault(), { once: true });
    d.showModal();
  });
}
const fmtRate = (v) => `${Number(v).toFixed(2).replace(/0$/, '').replace('.', ',')}×`;
function fillVoices() {
  const sel = $('#set-voice'); sel.innerHTML = '';
  const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Otomatis (terbaik yang tersedia)'; sel.append(auto);
  for (const v of listVoices(CONFIG.VOICE.LANG)) { const o = document.createElement('option'); o.value = v.voiceURI; o.textContent = `${v.name}${v.localService ? '' : ' (online)'}`; sel.append(o); }
  sel.value = S.profile?.voice || '';
}
function openSettings() {
  $('#set-name').value = S.profile?.name || ''; $('#set-tts').checked = !!S.profile?.tts;
  $('#set-rate').value = S.profile?.rate || 1; $('#set-rate-val').textContent = fmtRate($('#set-rate').value);
  $('#set-tts').disabled = !ttsSupported(); fillVoices();
  $('#set-storage').textContent = S.store.kind === 'firebase' ? 'Data tersimpan di akunmu (Firebase).' : 'Data tersimpan di browser ini saja.';
  $('#dlg-settings').showModal();
}
function askClear() {
  const d = $('#dlg-clear');
  d.onclose = () => { if (d.returnValue === 'yes') clearChat(); d.returnValue = ''; };
  d.showModal();
}

// ───────── init ─────────
async function init() {
  spores(); reveals(); tilt();
  heroM = createMushroom($('#hero-mushroom'));
  $('#hero-mushroom').onclick = () => heroM.happy(1600);
  setTimeout(() => heroM.happy(1800), 700);

  $('#creator-name').textContent = $('#creator-name-2').textContent = CONFIG.CREATOR.name; $('#creator-bio').textContent = CONFIG.CREATOR.bio;
  for (const l of CONFIG.CREATOR.links) {
    const li = document.createElement('li'); const a = document.createElement('a');
    a.href = l.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = icon(/instagram/i.test(l.label) ? 'instagram' : 'link'); a.append(l.label); li.append(a); $('#creator-links').append(li);
  }

  S.store = await createStore(CONFIG);
  S.profile = await S.store.getProfile(); S.history = await S.store.getHistory(); S.tts = !!S.profile?.tts;
  greet(); checkStatus(); setInterval(checkStatus, 60000);

  initChat(); initCall();
  const ensureProfile = async () => { if (!S.profile) await askName(); };
  $('#btn-call-hero').onclick = (e) => startCall(e, ensureProfile);
  $('#btn-call-top').onclick = (e) => startCall(e, ensureProfile);
  $('#btn-clear-chat').onclick = askClear;
  $('#btn-settings').onclick = openSettings;
  $('#set-rate').oninput = (e) => { $('#set-rate-val').textContent = fmtRate(e.target.value); };
  $('#btn-test-voice').onclick = () => {
    stopSpeaking();
    speak('Halo! Aku MyraAi. Begini kira-kira suaraku, enak didengar, kan?', {
      lang: CONFIG.VOICE.LANG, pitch: CONFIG.VOICE.PITCH, rate: Number($('#set-rate').value) * CONFIG.VOICE.RATE, voiceURI: $('#set-voice').value,
    });
  };
  $('#form-settings').onsubmit = async () => {
    S.profile ||= { name: '', created: Date.now() };
    S.profile.name = $('#set-name').value.trim().slice(0, 30); S.profile.tts = $('#set-tts').checked; S.tts = S.profile.tts;
    S.profile.voice = $('#set-voice').value; S.profile.rate = Number($('#set-rate').value);
    await S.store.saveProfile(S.profile); greet(); stopSpeaking(); toast('Pengaturan disimpan.', true);
  };
  $('#btn-clear').onclick = () => { $('#dlg-settings').close(); askClear(); };
  for (const d of $$('dialog')) d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'dlg-welcome') d.close(); });

  // salin kode (delegasi)
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const code = b.closest('.codeblock').querySelector('code').textContent;
    try { await navigator.clipboard.writeText(code); b.textContent = 'Tersalin'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'Salin'; b.classList.remove('ok'); }, 1500); }
    catch { toast('Gagal menyalin. Blok kodenya bisa dipilih manual.'); }
  });

  $('#burger').onclick = toggleDrawer;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { movePill(); onScroll(); });
  addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', heroDemoToggle);
  addEventListener('pagehide', () => stopSpeaking());
  if (document.fonts?.ready) document.fonts.ready.then(movePill);

  await route();
}
init();
