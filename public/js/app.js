import { CONFIG } from '../config.js';
import { initSecurity } from './security.js';
import { createStore } from './store.js';
import { renderRich, toSpeech } from './parser.js';
import { createMushroom } from './mushroom.js';
import { voiceSupported, listen, speak, stopSpeaking } from './voice.js';

initSecurity(CONFIG.SECURITY);

const $ = (s) => document.querySelector(s);
const L = CONFIG.LIMITS;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = { store: null, profile: null, history: [], busy: false, image: null, lastSend: 0, sentTimes: [], tts: false, call: null };

// ───────── util UI ─────────
function toast(msg, ok = false) {
  const t = document.createElement('div'); t.className = 'toast' + (ok ? ' ok' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 4200);
}
function setView(v) {
  document.body.dataset.view = v;
  $('#view-landing').hidden = v !== 'landing';
  $('#view-chat').hidden = v !== 'chat';
  $('#btn-call-top').hidden = v !== 'chat';
  $('#btn-settings').hidden = v !== 'chat';
  window.scrollTo(0, 0);
  if (v === 'chat') { renderThread(); $('#input').focus({ preventScroll: true }); }
}
function spores() {
  const host = $('.spores'); if (reduceMotion) return;
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;--s:${2 + Math.random() * 3}px;--d:${14 + Math.random() * 16}s;--dl:-${Math.random() * 20}s;--x:${(Math.random() - .5) * 120}px`;
    host.append(s);
  }
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
}

// ───────── thread ─────────
const scroller = () => $('#scroller');
const toBottom = () => { const s = scroller(); s.scrollTo({ top: s.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); };

function avatar() {
  const d = document.createElement('div'); d.className = 'av';
  const m = createMushroom(d, { track: false }); return { el: d, m };
}

function addUser(text, imgUrl) {
  const row = document.createElement('div'); row.className = 'msg user';
  const b = document.createElement('div'); b.className = 'bubble';
  if (imgUrl) { const i = document.createElement('img'); i.className = 'shot'; i.alt = 'Gambar yang kamu kirim'; i.src = imgUrl; b.append(i); }
  const p = document.createElement('span'); p.textContent = text; b.append(p);
  row.append(b); $('#thread').append(row); toBottom();
}
function addAi() {
  const row = document.createElement('div'); row.className = 'msg ai';
  const a = avatar(); const b = document.createElement('div'); b.className = 'bubble';
  row.append(a.el, b); $('#thread').append(row); toBottom();
  return { row, b, m: a.m };
}
const aiStatic = (text) => { const { b, m } = addAi(); b.innerHTML = renderRich(text); m.destroy(); };

function renderThread() {
  const t = $('#thread'); t.innerHTML = ''; S.emptyM?.destroy();
  if (!S.history.length) {
    const e = document.createElement('div'); e.className = 'empty';
    e.innerHTML = `<div class="mini-stage"></div><h2>Halo${S.profile?.name ? ', ' + esc(S.profile.name) : ''}!</h2><p class="muted" style="margin-top:-8px">Mau ngobrol apa hari ini?</p><div class="chips"></div>`;
    S.emptyM = createMushroom(e.querySelector('.mini-stage')); S.emptyM.happy(2200);
    for (const q of ['Jelaskan apa itu rekursi dengan contoh', 'Buatkan fungsi JavaScript untuk debounce', 'Kasih ide bekal sekolah yang sehat', 'Ceritakan dongeng pendek tentang hutan']) {
      const c = document.createElement('button'); c.textContent = q;
      c.onclick = () => { $('#input').value = q; send(); }; e.querySelector('.chips').append(c);
    }
    t.append(e); return;
  }
  for (const m of S.history) {
    if (m.role === 'user') addUser(m.content, null);
    else aiStatic(m.content);
  }
  scroller().scrollTop = scroller().scrollHeight;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// efek mengetik halus; klik bubble untuk melewati
function typeInto(bubble, full, m) {
  return new Promise((resolve) => {
    if (reduceMotion || full.length < 4) { bubble.innerHTML = renderRich(full); return resolve(); }
    let i = 0, skip = false;
    const step = Math.max(2, Math.ceil(full.length / 260));
    const skipFn = () => { skip = true; }; bubble.addEventListener('click', skipFn, { once: true });
    bubble.classList.add('caret');
    m?.talk();
    (function tick() {
      if (skip || i >= full.length) {
        bubble.classList.remove('caret'); bubble.innerHTML = renderRich(full); m?.stopTalk(); m?.happy(1400); toBottom(); return resolve();
      }
      i = Math.min(full.length, i + step);
      bubble.innerHTML = renderRich(full.slice(0, i));
      bubble.classList.add('caret'); m?.pulse(Math.random());
      if (i % (step * 8) === 0) toBottom();
      setTimeout(tick, 16);
    })();
  });
}

// ───────── jaringan ─────────
async function api(path, body) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 75000);
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Kesalahan ${r.status}`);
    return j;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'Si Jamur terlalu lama berpikir. Coba lagi ya.' : e.message || 'Koneksi bermasalah.');
  } finally { clearTimeout(t); }
}

// ───────── gambar ─────────
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

async function shrink(file) {
  const target = L.UPLOAD_TARGET_MB * 1024 * 1024;
  if (file.size <= target && file.type !== 'image/gif') return file;
  if (file.type === 'image/gif' && file.size <= target) return file;
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  for (let q = 0.88, n = 0; n < 6; n++) {
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= target) return blob;
    q = Math.max(.5, q - .1); scale *= .85;
  }
  throw new Error('Gambar terlalu besar untuk dikompres.');
}

function pickImage(file) {
  if (!file) return;
  if (!OK_TYPES.includes(file.type)) return toast('Format harus JPG, PNG, WebP, atau GIF.');
  if (file.size > L.MAX_IMAGE_MB * 1024 * 1024) return toast(`Ukuran gambar maksimal ${L.MAX_IMAGE_MB} MB.`);
  clearImage();
  S.image = { file, url: URL.createObjectURL(file) };
  $('#attach-img').src = S.image.url; $('#attach-name').textContent = file.name; $('#attach-chip').hidden = false;
}
function clearImage() {
  if (S.image) URL.revokeObjectURL(S.image.url);
  S.image = null; $('#attach-chip').hidden = true; $('#file').value = '';
}

// ───────── kirim ─────────
function cooldown(ms) {
  const b = $('#btn-send'); const start = performance.now(); b.disabled = true; b.classList.add('cool');
  (function f(t) {
    const p = Math.min(100, ((t - start) / ms) * 100); b.style.setProperty('--p', p);
    if (p < 100) requestAnimationFrame(f); else { b.classList.remove('cool'); b.disabled = S.busy; }
  })(start);
}
function allowed() {
  const now = Date.now();
  if (now - S.lastSend < L.SEND_COOLDOWN_MS) return false;
  S.sentTimes = S.sentTimes.filter((t) => now - t < 60000);
  if (S.sentTimes.length >= L.MAX_PER_MINUTE) { toast('Pelan-pelan ya, terlalu banyak pesan dalam semenit.'); return false; }
  return true;
}
const pushHistory = async (role, content) => {
  S.history.push({ role, content }); S.history = S.history.slice(-L.HISTORY_STORED);
  S.store.saveHistory(S.history).catch(() => {});
};

async function send() {
  if (S.busy || !allowed()) return;
  const input = $('#input'); let text = input.value.trim();
  if (!text && !S.image) return;
  if (!text) text = 'Jelaskan gambar ini.';
  if (text.length > L.MAX_MESSAGE_CHARS) return toast(`Pesan maksimal ${L.MAX_MESSAGE_CHARS} karakter.`);

  S.busy = true; S.lastSend = Date.now(); S.sentTimes.push(S.lastSend);
  const img = S.image; input.value = ''; autoGrow(); clearImageKeepUrl();
  const emptyEl = $('#thread .empty'); if (emptyEl) emptyEl.remove();
  addUser(text, img?.url);
  const hist = S.history.slice(-L.HISTORY_SENT);
  const ai = addAi(); ai.row.classList.add('typing');
  ai.b.innerHTML = '<div class="skeleton"><i></i><i></i><i></i></div><div class="dots"><b></b><b></b><b></b></div>';
  ai.m.think(); toBottom(); cooldown(L.SEND_COOLDOWN_MS);

  try {
    let uploadToken = null;
    if (img) {
      ai.b.querySelector('.dots').insertAdjacentHTML('afterend', '<p class="muted" style="margin-top:8px">Mengunggah gambar…</p>');
      const blob = await shrink(img.file);
      uploadToken = (await api('/api/upload', { data: await toB64(blob) })).token;
    }
    const { reply } = await api('/api/chat', { message: text, history: hist, uploadToken, userName: S.profile?.name || '' });
    pushHistory('user', text + (img ? ' [gambar]' : '')); pushHistory('assistant', reply);
    ai.b.innerHTML = '';
    await typeInto(ai.b, reply, ai.m);
    if (S.tts && voiceSupported()) speak(toSpeech(reply, CONFIG.VOICE.MAX_SPOKEN_CHARS), { ...voiceOpts(ai.m) });
  } catch (e) {
    ai.m.idle(); ai.b.innerHTML = renderRich('[ALERT] ' + e.message);
  } finally {
    ai.row.classList.remove('typing'); setTimeout(() => ai.m.destroy(), 2500); S.busy = false; $('#btn-send').disabled = $('#btn-send').classList.contains('cool'); toBottom();
  }
}
// gambar dibiarkan hidup di bubble; hanya lepaskan state composer
function clearImageKeepUrl() { S.image = null; $('#attach-chip').hidden = true; $('#file').value = ''; } // URL tetap hidup untuk bubble

const voiceOpts = (m) => ({
  lang: CONFIG.VOICE.LANG, pitch: CONFIG.VOICE.PITCH, rate: CONFIG.VOICE.RATE,
  onStart: () => m?.talk(), onBeat: () => m?.pulse(.9 + Math.random() * .1), onEnd: () => m?.stopTalk(),
});

function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }

// ───────── MODE TELEPON ─────────
const call = { open: false, muted: false, rec: null, tts: null, m: null, busy: false, stage: 'idle' };

function setCall(stage) {
  call.stage = stage; $('#call').dataset.s = stage;
  const label = { listen: 'Si Jamur mendengarkan', think: 'Si Jamur sedang berpikir', talk: 'Si Jamur berbicara', idle: '' }[stage] || '';
  $('#call-live').textContent = label;
}
async function startCall(ev) {
  if (call.open) return;
  if (!voiceSupported()) return toast('Browser ini belum mendukung suara. Coba Chrome atau Edge.');
  call.open = true; call.muted = false;
  const rect = ev?.currentTarget?.getBoundingClientRect?.();
  const el = $('#call');
  el.style.setProperty('--cx', rect ? rect.left + rect.width / 2 + 'px' : '50%'); el.style.setProperty('--cy', rect ? rect.top + rect.height / 2 + 'px' : '50%');
  el.setAttribute('aria-hidden', 'false'); el.classList.add('open'); document.body.style.overflow = 'hidden';
  $('#call-mute').setAttribute('aria-pressed', 'false');
  try { await el.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  call.m ||= createMushroom($('#call-mushroom'));
  await sleep(reduceMotion ? 0 : 650);
  call.m.happy(2200);
  const name = S.profile?.name ? ` ${S.profile.name}` : '';
  say(`Halo${name}! Aku Si Jamur. Mau ngobrol apa?`, () => listenLoop());
}
function say(text, then) {
  setCall('talk'); call.m.talk();
  call.tts = speak(text, {
    lang: CONFIG.VOICE.LANG, pitch: CONFIG.VOICE.PITCH, rate: CONFIG.VOICE.RATE,
    onStart: () => call.m.talk(), onBeat: () => call.m.pulse(.9 + Math.random() * .1),
    onEnd: () => { call.m.stopTalk(); if (call.open) then?.(); },
  });
}
function listenLoop() {
  if (!call.open || call.muted || call.busy) { if (call.open && !call.busy) { setCall('idle'); call.m.idle(); } return; }
  setCall('listen'); call.m.listen();
  call.rec = listen({
    lang: CONFIG.VOICE.LANG,
    onFinal: (text) => handleSpeech(text),
    onEnd: (got) => { if (!got && call.open && !call.muted && !call.busy) setTimeout(listenLoop, 250); },
    onError: (err) => {
      if (['no-speech', 'aborted'].includes(err)) return;
      if (['not-allowed', 'service-not-allowed'].includes(err)) { toast('Izin mikrofon ditolak. Aktifkan di pengaturan browser.'); return endCall(); }
      setTimeout(listenLoop, 800);
    },
  });
}
async function handleSpeech(text) {
  call.busy = true; call.rec?.stop(); setCall('think'); call.m.think();
  pushHistoryUI('user', text);
  try {
    const { reply } = await api('/api/chat', { message: text, history: S.history.slice(-L.HISTORY_SENT, -1), voice: true, userName: S.profile?.name || '' });
    pushHistoryUI('assistant', reply);
    if (!call.open) return;
    call.busy = false;
    say(toSpeech(reply, CONFIG.VOICE.MAX_SPOKEN_CHARS), () => listenLoop());
  } catch (e) {
    call.busy = false; if (!call.open) return;
    say('Maaf, aku lagi susah mendengar. Coba bilang lagi ya.', () => listenLoop());
  }
}
function pushHistoryUI(role, content) { S.history.push({ role, content }); S.history = S.history.slice(-L.HISTORY_STORED); S.store.saveHistory(S.history).catch(() => {}); }

function toggleMute() {
  call.muted = !call.muted; $('#call-mute').setAttribute('aria-pressed', String(call.muted));
  $('#call-mute').setAttribute('aria-label', call.muted ? 'Nyalakan mikrofon' : 'Matikan mikrofon');
  if (call.muted) { call.rec?.stop(); if (call.stage === 'listen') { setCall('idle'); call.m.idle(); } }
  else if (call.stage === 'idle') listenLoop();
}
function endCall() {
  if (!call.open) return;
  call.open = false; call.busy = false; call.rec?.stop(); call.tts?.cancel(); stopSpeaking(); call.m?.idle();
  const el = $('#call'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); setCall('idle');
  document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  if (document.body.dataset.view === 'chat') renderThread();
}
function interrupt() { if (call.stage === 'talk') { call.tts?.cancel(); stopSpeaking(); call.m.stopTalk(); listenLoop(); } }

// ───────── Profil & pengaturan ─────────
function greet() {
  const h = $('#hello');
  if (S.profile?.name) { h.hidden = false; h.textContent = `Selamat datang kembali, ${S.profile.name}.`; }
}
async function askName() {
  const d = $('#dlg-welcome'); createMushroom($('#welcome-mushroom'), { track: false }).happy(2500);
  return new Promise((res) => {
    $('#form-welcome').onsubmit = async () => {
      const name = $('#name-input').value.trim().slice(0, 30); if (!name) return;
      S.profile = { name, tts: false, created: Date.now() }; await S.store.saveProfile(S.profile); greet(); res();
    };
    d.showModal();
  });
}
async function enter() {
  if (!S.profile?.name) await askName();
  setView('chat');
}
function openSettings() {
  $('#set-name').value = S.profile.name; $('#set-tts').checked = !!S.profile.tts;
  $('#set-storage').textContent = S.store.kind === 'firebase' ? 'Data tersimpan di akunmu (Firebase).' : 'Data tersimpan di browser ini saja.';
  $('#dlg-settings').showModal();
}

// ───────── init ─────────
async function init() {
  spores();
  const hero = createMushroom($('#hero-mushroom'));
  $('#hero-mushroom').onclick = () => hero.happy(1600);
  setTimeout(() => hero.happy(1800), 700);

  $('#creator-name').textContent = CONFIG.CREATOR.name; $('#creator-bio').textContent = CONFIG.CREATOR.bio;
  for (const l of CONFIG.CREATOR.links) {
    const li = document.createElement('li'); const a = document.createElement('a');
    a.href = l.url; a.textContent = l.label; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); $('#creator-links').append(li);
  }

  S.store = await createStore(CONFIG);
  S.profile = await S.store.getProfile(); S.history = await S.store.getHistory(); S.tts = !!S.profile?.tts;
  greet(); checkStatus(); setInterval(checkStatus, 60000);

  $('#btn-start').onclick = enter;
  $('#brand').onclick = () => setView('landing');
  const callBtn = async (e) => { if (!S.profile?.name) await askName(); startCall(e); };
  $('#btn-call-hero').onclick = callBtn; $('#btn-call-top').onclick = callBtn;
  $('#call-end').onclick = endCall; $('#call-mute').onclick = toggleMute; $('#call-mushroom').onclick = interrupt;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && call.open) endCall(); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && call.open) endCall(); });

  $('#btn-send').onclick = send;
  $('#input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('#input').addEventListener('input', autoGrow);
  $('#btn-attach').onclick = () => $('#file').click();
  $('#file').onchange = (e) => { const fs = e.target.files; if (fs.length > 1) toast('Hanya 1 gambar per pesan. Gambar pertama dipakai.'); pickImage(fs[0]); };
  $('#attach-remove').onclick = clearImage;
  $('#input').addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); pickImage(f); } });

  // salin kode (delegasi)
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const code = b.closest('.codeblock').querySelector('code').textContent;
    try { await navigator.clipboard.writeText(code); b.textContent = 'Tersalin'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'Salin'; b.classList.remove('ok'); }, 1500); }
    catch { toast('Gagal menyalin. Blok kodenya bisa dipilih manual.'); }
  });

  $('#btn-settings').onclick = openSettings;
  $('#form-settings').onsubmit = async () => {
    S.profile.name = $('#set-name').value.trim().slice(0, 30) || S.profile.name; S.profile.tts = $('#set-tts').checked; S.tts = S.profile.tts;
    await S.store.saveProfile(S.profile); greet(); toast('Pengaturan disimpan.', true);
  };
  $('#btn-clear').onclick = async () => {
    if (!confirm('Hapus semua riwayat obrolan?')) return;
    S.history = []; await S.store.clearHistory(); $('#dlg-settings').close(); renderThread(); toast('Riwayat dihapus.', true);
  };
  for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'dlg-welcome') d.close(); });
  window.addEventListener('pagehide', () => stopSpeaking());
}
init();
