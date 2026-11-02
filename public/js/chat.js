import { CONFIG } from '../config.js';
import { S, $, esc, toast, reduceMotion, icon } from './state.js';
import { renderRich, toSpeech } from './parser.js';
import { createMushroom } from './mushroom.js';
import { ttsSupported, speak } from './voice.js';

const L = CONFIG.LIMITS;
const scroller = () => $('#scroller');
let stick = true; // otomatis ikut ke bawah, kecuali pengguna sedang menggulir ke atas
export const toBottom = (force = false) => {
  const s = scroller(); if (!s || (!stick && !force)) return;
  s.scrollTo({ top: s.scrollHeight, behavior: reduceMotion || force ? 'auto' : 'smooth' });
};

// ───────── bubble ─────────
function avatar() { const d = document.createElement('div'); d.className = 'av'; return { el: d, m: createMushroom(d, { track: false }) }; }

function addUser(text, imgUrl) {
  const row = document.createElement('div'); row.className = 'msg user';
  const b = document.createElement('div'); b.className = 'bubble';
  if (imgUrl) { const i = document.createElement('img'); i.className = 'shot'; i.alt = 'Gambar yang kamu kirim'; i.src = imgUrl; b.append(i); }
  const p = document.createElement('span'); p.textContent = text; b.append(p);
  row.append(b); $('#thread').append(row); toBottom(true);
}
function addAi() {
  const row = document.createElement('div'); row.className = 'msg ai';
  const a = avatar(); const b = document.createElement('div'); b.className = 'bubble';
  row.append(a.el, b); $('#thread').append(row); toBottom(true);
  return { row, b, m: a.m };
}
const aiStatic = (text) => { const { b, m, row } = addAi(); row.classList.add('static'); b.innerHTML = renderRich(text); m.destroy(); };

export function renderThread() {
  const t = $('#thread'); t.innerHTML = ''; S.emptyM?.destroy();
  if (!S.history.length) {
    const e = document.createElement('div'); e.className = 'empty';
    e.innerHTML = `<div class="mini-stage"></div><h2>Halo${S.profile?.name ? ', ' + esc(S.profile.name) : ''}!</h2><p>Mau ngobrol apa hari ini?</p><div class="chips"></div>`;
    S.emptyM = createMushroom(e.querySelector('.mini-stage')); S.emptyM.happy(2200);
    const ideas = ['Jelaskan apa itu rekursi dengan contoh', 'Buatkan fungsi JavaScript untuk debounce', 'Buatkan gambar kucing astronot di bulan', 'Kasih ide bekal sekolah yang sehat'];
    ideas.forEach((q, i) => {
      const c = document.createElement('button'); c.textContent = q; c.style.setProperty('--i', i);
      c.onclick = () => { $('#input').value = q; send(); }; e.querySelector('.chips').append(c);
    });
    t.append(e); return;
  }
  for (const m of S.history) { if (m.role === 'user') addUser(m.content, null); else aiStatic(m.content); }
  const s = scroller(); s.scrollTop = s.scrollHeight;
}

// efek mengetik; klik bubble untuk melewati
function typeInto(bubble, full, m) {
  return new Promise((resolve) => {
    if (reduceMotion || full.length < 4) { bubble.innerHTML = renderRich(full); return resolve(); }
    let i = 0, skip = false;
    const step = Math.max(3, Math.ceil(full.length / 180));
    bubble.addEventListener('click', () => { skip = true; }, { once: true });
    bubble.classList.add('caret'); m?.talk();
    (function tick() {
      if (skip || i >= full.length) {
        bubble.classList.remove('caret'); bubble.innerHTML = renderRich(full); m?.stopTalk(); m?.happy(1400); toBottom(); return resolve();
      }
      i = Math.min(full.length, i + step);
      bubble.innerHTML = renderRich(full.slice(0, i)); bubble.classList.add('caret'); m?.pulse(Math.random());
      if (i % (step * 6) === 0) toBottom();
      setTimeout(tick, 14);
    })();
  });
}

// ───────── jaringan ─────────
export async function api(path, body, ms = 62000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Kesalahan ${r.status}`);
    return j;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'Myra terlalu lama berpikir. Coba lagi ya.' : e.message || 'Koneksi bermasalah.');
  } finally { clearTimeout(t); }
}

// ───────── gambar terlampir ─────────
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

async function shrink(file) {
  const target = L.UPLOAD_TARGET_MB * 1024 * 1024;
  if (file.size <= target && file.type !== 'image/gif') return file;
  if (file.type === 'image/gif' && file.size <= target) return file;
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  for (let q = 0.85, n = 0; n < 7; n++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= target) return blob;
    q = Math.max(.5, q - .08); scale *= .85;
  }
  throw new Error('Gambar terlalu besar untuk dikompres.');
}
export function pickImage(file) {
  if (!file) return;
  if (!OK_TYPES.includes(file.type)) return toast('Format harus JPG, PNG, WebP, atau GIF.');
  if (file.size > L.MAX_IMAGE_MB * 1024 * 1024) return toast(`Ukuran gambar maksimal ${L.MAX_IMAGE_MB} MB.`);
  clearImage(); setGenMode(false);
  S.image = { file, url: URL.createObjectURL(file) };
  $('#attach-img').src = S.image.url; $('#attach-name').textContent = file.name; $('#attach-chip').hidden = false;
  $('#input').placeholder = innerWidth < 640 ? 'Tanya tentang gambar…' : 'Tanya sesuatu tentang gambar ini (boleh dikosongkan)…';
}
export function clearImage() {
  if (S.image) URL.revokeObjectURL(S.image.url);
  S.image = null; $('#attach-chip').hidden = true; $('#file').value = ''; refreshPlaceholder();
}
const releaseImage = () => { S.image = null; $('#attach-chip').hidden = true; $('#file').value = ''; refreshPlaceholder(); }; // URL tetap hidup untuk bubble

// ───────── mode buat gambar ─────────
function refreshPlaceholder() {
  const narrow = innerWidth < 640;
  $('#input').placeholder = S.genMode ? (narrow ? 'Deskripsikan gambarnya…' : 'Deskripsikan gambar yang ingin dibuat…') : (narrow ? 'Tulis pesan…' : 'Tulis pesan untuk Myra…');
}
export function setGenMode(on) {
  S.genMode = !!on; $('#btn-genimg').setAttribute('aria-pressed', String(S.genMode));
  $('#composer').classList.toggle('gen', S.genMode); refreshPlaceholder();
  if (S.genMode) { clearImage(); $('#input').focus(); }
}
const GEN_RE = /^\s*(tolong\s+)?(buat(kan)?|bikin(kan)?|gambar(kan)?|lukis(kan)?|generate|create|draw|make)\s+(aku\s+|saya\s+|me\s+)?(sebuah\s+|satu\s+|an?\s+)?(gambar|foto|ilustrasi|lukisan|image|picture|logo|poster|wallpaper)\b/i;
const looksLikeImageRequest = (t) => GEN_RE.test(t) || /^\s*\/(gambar|image|img)\b/i.test(t);
const cleanPrompt = (t) => {
  const s = t.replace(/^\s*\/(gambar|image|img)\s*/i, '').replace(/^\s*(tolong\s+)?(buat(kan)?|bikin(kan)?|gambar(kan)?|lukis(kan)?|generate|create|draw|make)\s+(aku\s+|saya\s+|me\s+)?(sebuah\s+|satu\s+|an?\s+)?(gambar|foto|ilustrasi|lukisan|image|picture)?\s*(tentang|dari|of|:)?\s*/i, '').trim();
  return s.length >= 3 ? s : t.trim();
};
const ratioOf = (t) => /wallpaper|lanskap|landscape|pemandangan|banner|16:9|layar lebar/i.test(t) ? 'wide' : /potret|portrait|poster|story|9:16|hp\b/i.test(t) ? 'tall' : 'square';

async function generateImage(rawText) {
  const prompt = cleanPrompt(rawText); const ratio = ratioOf(rawText);
  addUser(rawText);
  const ai = addAi(); ai.row.classList.add('typing'); ai.m.think();
  ai.b.innerHTML = `<div class="paint"><div class="paint-box ${ratio}"><i></i><i></i><i></i></div><p class="muted">Myra lagi melukis. Biasanya 10 sampai 30 detik…</p></div>`;
  cooldown(L.SEND_COOLDOWN_MS);
  try {
    const { image } = await api('/api/image', { prompt, ratio }, 62000);
    ai.b.innerHTML = `<figure class="gen ${ratio}"><img alt="${esc(prompt)}" src="${image}"><figcaption>
      <span class="cap">${esc(prompt)}</span>
      <span class="acts"><a class="chip-btn" download="si-jamur.png" href="${image}">${icon('download')}Unduh</a>
      <button class="chip-btn" type="button" data-regen="${esc(rawText)}">${icon('refresh')}Buat ulang</button></span></figcaption></figure>`;
    ai.m.happy(2000);
    const im = ai.b.querySelector('img'); if (im) { im.onload = () => toBottom(true); im.decode?.().then(() => toBottom(true)).catch(() => {}); }
    pushHistory('user', rawText); pushHistory('assistant', `(Aku sudah membuatkan gambar: ${prompt})`);
  } catch (e) { ai.m.idle(); ai.b.innerHTML = renderRich('[ALERT] ' + e.message); }
  finally { ai.row.classList.remove('typing'); setTimeout(() => ai.m.destroy(), 2500); S.busy = false; setBusy(false); toBottom(true); }
}

// ───────── kirim ─────────
function cooldown(ms) {
  const b = $('#btn-send'); const start = performance.now(); b.classList.add('cool');
  (function f(t) {
    const p = Math.min(100, ((t - start) / ms) * 100); b.style.setProperty('--p', p);
    if (p < 100) requestAnimationFrame(f); else { b.classList.remove('cool'); setBusy(S.busy); }
  })(start);
}
const setBusy = (v) => { const b = $('#btn-send'); b.disabled = v || b.classList.contains('cool'); b.classList.toggle('busy', v); };
function allowed() {
  const now = Date.now();
  if (now - S.lastSend < L.SEND_COOLDOWN_MS) return false;
  S.sentTimes = S.sentTimes.filter((t) => now - t < 60000);
  if (S.sentTimes.length >= L.MAX_PER_MINUTE) { toast('Pelan-pelan ya, terlalu banyak pesan dalam semenit.'); return false; }
  return true;
}
export const pushHistory = (role, content) => {
  S.history.push({ role, content }); S.history = S.history.slice(-L.HISTORY_STORED);
  S.store.saveHistory(S.history).catch(() => {});
};

export const voiceOpts = (m) => ({
  lang: CONFIG.VOICE.LANG, pitch: CONFIG.VOICE.PITCH, rate: (S.profile?.rate || 1) * CONFIG.VOICE.RATE, voiceURI: S.profile?.voice || '',
  onStart: () => m?.talk(), onBeat: () => m?.pulse(.9 + Math.random() * .1), onEnd: () => m?.stopTalk(),
});

export async function send() {
  if (S.busy || !allowed()) return;
  const input = $('#input'); let text = input.value.trim();
  if (!text && !S.image) return;
  if (!text) text = 'Jelaskan gambar ini.';
  if (text.length > L.MAX_MESSAGE_CHARS) return toast(`Pesan maksimal ${L.MAX_MESSAGE_CHARS} karakter.`);

  const img = S.image;
  const wantsImage = !img && (S.genMode || looksLikeImageRequest(text));
  S.busy = true; setBusy(true); S.lastSend = Date.now(); S.sentTimes.push(S.lastSend);
  input.value = ''; autoGrow(); releaseImage();
  $('#thread .empty')?.remove();
  stick = true;
  if (wantsImage) { setGenMode(false); return generateImage(text); }

  addUser(text, img?.url);
  const hist = S.history.slice(-L.HISTORY_SENT);
  const ai = addAi(); ai.row.classList.add('typing');
  ai.b.innerHTML = '<div class="dots"><b></b><b></b><b></b></div><p class="wait muted"></p>';
  const wait = ai.b.querySelector('.wait');
  ai.m.think(); toBottom(true); cooldown(L.SEND_COOLDOWN_MS);
  const t1 = setTimeout(() => { wait.textContent = img ? 'Lagi memperhatikan gambarnya…' : 'Masih berpikir, sebentar ya…'; }, 5000);
  const t2 = setTimeout(() => { wait.textContent = 'Mencoba jalur lain supaya lebih cepat…'; }, 12000);

  try {
    let image = null;
    if (img) { wait.textContent = 'Menyiapkan gambar…'; const blob = await shrink(img.file); image = { data: await toB64(blob), mime: blob.type || 'image/jpeg' }; wait.textContent = ''; }
    const { reply } = await api('/api/chat', { message: text, history: hist, image, userName: S.profile?.name || '' });
    pushHistory('user', text + (img ? ' [gambar]' : '')); pushHistory('assistant', reply);
    clearTimeout(t1); clearTimeout(t2);
    ai.b.innerHTML = '';
    const spoken = S.tts && ttsSupported();
    if (spoken) speak(toSpeech(reply, CONFIG.VOICE.MAX_SPOKEN_CHARS), voiceOpts(ai.m)); // suara dimulai bersamaan dengan teks
    await typeInto(ai.b, reply, spoken ? null : ai.m);
  } catch (e) {
    ai.m.idle(); ai.b.innerHTML = renderRich('[ALERT] ' + e.message);
  } finally {
    clearTimeout(t1); clearTimeout(t2);
    ai.row.classList.remove('typing'); setTimeout(() => ai.m.destroy(), S.tts ? 12000 : 2500); S.busy = false; setBusy(false); toBottom();
  }
}

export function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }

// ───────── bersihkan chat ─────────
export async function clearChat() {
  const th = $('#thread');
  if (!reduceMotion) { th.classList.add('clearing'); await new Promise((r) => setTimeout(r, 380)); th.classList.remove('clearing'); }
  S.history = []; try { await S.store.clearHistory(); } catch {}
  clearImage(); setGenMode(false); renderThread(); toast('Obrolan dibersihkan.', true);
}

export function initChat() {
  refreshPlaceholder();
  $('#btn-send').onclick = send;
  $('#input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('#input').addEventListener('input', autoGrow);
  $('#btn-attach').onclick = () => $('#file').click();
  $('#btn-genimg').onclick = () => setGenMode(!S.genMode);
  $('#file').onchange = (e) => { const fs = e.target.files; if (fs.length > 1) toast('Hanya 1 gambar per pesan. Gambar pertama dipakai.'); pickImage(fs[0]); };
  $('#attach-remove').onclick = clearImage;
  $('#input').addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); pickImage(f); } });
  scroller().addEventListener('scroll', () => { const s = scroller(); stick = s.scrollHeight - s.scrollTop - s.clientHeight < 140; }, { passive: true });
  // seret & lepas gambar ke area chat
  const zone = $('#page-chat');
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); zone.classList.add('drag'); } }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { if (ev === 'drop') { e.preventDefault(); pickImage(e.dataTransfer?.files?.[0]); } if (ev === 'drop' || e.target === zone) zone.classList.remove('drag'); }));
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-regen]'); if (r && !S.busy) { $('#input').value = r.dataset.regen; send(); }
  });
}
