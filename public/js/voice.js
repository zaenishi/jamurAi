// Speech-to-Text (SpeechRecognition) & Text-to-Speech (speechSynthesis) bawaan browser.
// TTS dibuat natural: kalimat dipecah jadi potongan pendek (anti terpotong), ada jeda napas,
// variasi nada/kecepatan tipis, dan memilih suara Indonesia terbaik yang tersedia.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasTTS = 'speechSynthesis' in window;
export const ttsSupported = () => hasTTS;
export const voiceSupported = () => !!SR && hasTTS;

let voices = [];
const loadVoices = () => { if (hasTTS) voices = speechSynthesis.getVoices(); };
if (hasTTS) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }

const score = (v) => {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/natural|neural|online|wavenet|premium|enhanced/.test(n)) s += 60;
  if (/google/.test(n)) s += 35;
  if (/microsoft/.test(n)) s += 20;
  if (/gadis|damayanti|indonesia|andika/.test(n)) s += 10;
  if (/female|perempuan|gadis|damayanti/.test(n)) s += 4;
  if (v.localService === false) s += 6;
  if (/espeak|compact/.test(n)) s -= 40;
  return s;
};
export function listVoices(lang = 'id-ID') {
  loadVoices();
  const base = lang.slice(0, 2).toLowerCase();
  return voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(base)).sort((a, b) => score(b) - score(a));
}
export function pickVoice(lang, uri) {
  const list = listVoices(lang);
  return (uri && list.find((v) => v.voiceURI === uri)) || list[0] || null;
}

export function listen({ lang, onInterim, onFinal, onEnd, onError }) {
  const rec = new SR();
  rec.lang = lang; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
  let got = false;
  rec.onresult = (e) => {
    let interim = '', fin = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      (r.isFinal ? (fin += r[0].transcript) : (interim += r[0].transcript));
    }
    if (interim) onInterim?.(interim);
    if (fin.trim()) { got = true; onFinal?.(fin.trim()); }
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.(got);
  try { rec.start(); } catch (e) { onError?.('start-failed'); }
  return { stop: () => { rec.onend = null; rec.onerror = null; try { rec.abort(); } catch {} } };
}

// ── Penyiapan teks agar enak diucapkan ──
const SAY = [
  [/\bdll\.?/gi, 'dan lain-lain'], [/\bdsb\.?/gi, 'dan seterusnya'], [/\bdst\.?/gi, 'dan seterusnya'],
  [/\byg\b/gi, 'yang'], [/\bdgn\b/gi, 'dengan'], [/\btdk\b/gi, 'tidak'], [/\bgak\b/gi, 'nggak'],
  [/\bAI\b/g, 'ei ai'], [/&/g, ' dan '], [/%/g, ' persen'], [/\+/g, ' tambah '], [/\s[-–—]\s/g, ', '],
  [/\.{3,}|…/g, ', '], [/\(([^)]{1,60})\)/g, ', $1, '],
];
const humanize = (t) => SAY.reduce((s, [re, to]) => s.replace(re, to), String(t)).replace(/\s+/g, ' ').trim();

// Pecah jadi potongan ≤ max karakter di batas kalimat/koma, supaya Chrome tidak memutus ucapan panjang.
function chunk(text, max = 150) {
  const sentences = text.match(/[^.!?;:\n]+[.!?;:]*/g) || [text];
  const out = [];
  for (let s of sentences) {
    s = s.trim(); if (!s) continue;
    while (s.length > max) {
      let cut = s.lastIndexOf(',', max); if (cut < 40) cut = s.lastIndexOf(' ', max); if (cut < 20) cut = max;
      out.push(s.slice(0, cut + 1).trim()); s = s.slice(cut + 1).trim();
    }
    if (s) out.push(s);
  }
  const merged = []; // gabungkan potongan terlalu pendek supaya tidak patah-patah
  for (const c of out) {
    const last = merged[merged.length - 1];
    if (last && (last.length < 22 || c.length < 14) && (last + ' ' + c).length <= max && !/[?!]$/.test(last)) merged[merged.length - 1] = `${last} ${c}`;
    else merged.push(c);
  }
  return merged.map((t) => {
    const end = t.slice(-1);
    return { text: t, q: end === '?', ex: end === '!', pause: end === '?' ? 230 : /[.!]/.test(end) ? 190 : /[,;:]/.test(end) ? 90 : 120 };
  });
}

const pinned = new Set(); // simpan referensi utterance: mencegah GC yang membuat ucapan berhenti di tengah (bug Chrome)

export function speak(text, { lang, pitch = 1, rate = 1, voiceURI, onStart, onBeat, onEnd } = {}) {
  if (!hasTTS) { onEnd?.(); return { cancel() {} }; }
  const parts = chunk(humanize(text));
  if (!parts.length) { onEnd?.(); return { cancel() {} }; }
  const voice = pickVoice(lang, voiceURI);
  let i = 0, cancelled = false, started = false, finished = false, timer = 0, watchdog = 0, cur = null;

  const finish = () => { if (finished) return; finished = true; clearTimeout(timer); clearTimeout(watchdog); onEnd?.(); };
  const jitter = (v, amt) => v * (1 + (Math.random() - .5) * amt);

  const next = () => {
    clearTimeout(watchdog);
    if (cancelled || finished) return;
    if (i >= parts.length) return finish();
    const part = parts[i++];
    const u = new SpeechSynthesisUtterance(part.text);
    u.lang = lang; u.volume = 1;
    if (voice) u.voice = voice;
    u.rate = Math.max(.6, Math.min(1.5, jitter(rate, .05) * (part.ex ? 1.04 : 1)));
    u.pitch = Math.max(.7, Math.min(1.6, jitter(pitch, .05) * (part.q ? 1.08 : part.ex ? 1.05 : 1)));
    let advanced = false;
    const go = () => { if (advanced) return; advanced = true; pinned.delete(u); clearTimeout(watchdog); if (!cancelled) timer = setTimeout(next, part.pause); };
    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
    u.onboundary = (e) => { if (e.name !== 'sentence') onBeat?.(); };
    u.onend = go;
    u.onerror = (e) => { if (e.error === 'canceled' || e.error === 'interrupted') { if (!cancelled) go(); return; } go(); };
    // Jaga-jaga bila onend tidak pernah terpanggil: lanjut sendiri
    watchdog = setTimeout(() => { if (!advanced && !cancelled) { try { speechSynthesis.cancel(); } catch {} go(); } }, Math.max(4500, part.text.length * 120 + 3000));
    cur = u; pinned.add(u);
    speechSynthesis.speak(u);
  };

  try { speechSynthesis.cancel(); } catch {}
  timer = setTimeout(next, 70); // jeda kecil setelah cancel() agar tidak ada potongan awal yang hilang
  return { cancel() { cancelled = true; clearTimeout(timer); clearTimeout(watchdog); pinned.clear(); try { speechSynthesis.cancel(); } catch {} } };
}

export const stopSpeaking = () => { pinned.clear(); try { speechSynthesis.cancel(); } catch {} };
