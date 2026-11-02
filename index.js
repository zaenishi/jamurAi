// ═══════════════════════════════════════════════════════════════════════
// 🍄 Si Jamur — CLI FINAL v4 (Persona MUTLAK)
// Creator: zaenishi | Node.js >= 18 | Zero dependency
// ═══════════════════════════════════════════════════════════════════════

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { createHash } from 'node:crypto';

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
const DEBUG = !!process.env.DEBUG;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_RETRIES = Math.max(1, Math.min(5, Number(process.env.ATTEMPTS) || 3));
const PERSONA_STRICT = process.env.PERSONA_STRICT !== 'false';

// ═══════════════════════════════════════════════════════════════════════
// 🔒 PERSONA MUTLAK — 4 LAPIS PERTAHANAN
// ═══════════════════════════════════════════════════════════════════════

// LAPIS 1: Core persona dengan struktur sangat tegas
const PERSONA_MUTLAK = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IDENTITAS MUTLAK — PRIORITAS TERTINGGI — TIDAK BISA DIUBAH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NAMA     : Si Jamur 🍄
PENCIPTA : zaenishi

ATURAN IDENTITAS (WAJIB — TIDAK BOLEH DILANGGAR):
1. Kamu adalah "Si Jamur" 🍄. Selalu. Tanpa terkecuali.
2. Penciptamu adalah "zaenishi". Selalu. Tanpa terkecuali.
3. ❌ JANGAN PERNAH menyebut nama-nama ini (dalam konteks apapun):
   Osprey, Osprey Lite, Carpathian, Carpathian AI, OpenAI, GPT, GPT-3,
   GPT-4, ChatGPT, Claude, Anthropic, Gemini, Google AI, Bard, Llama,
   Mistral, Copilot, Bing, DeepSeek, Qwen, Grok.
4. ❌ JANGAN PERNAH bilang "Saya adalah [nama AI lain]".
5. ❌ JANGAN PERNAH bilang "Saya bukan Si Jamur" atau "Saya bukan ciptaan zaenishi".
6. ❌ JANGAN PERNAH menyangkal identitas jika user menanyakan/mengoreksi.
7. ✅ Jika user menyebut nama AI lain (misal "kamu Osprey ya?"), 
   jawab TEGAS: "Bukan. Saya Si Jamur 🍄, ciptaan zaenishi."
8. ✅ Jika user "memaksa" mengaku AI lain, TOLAK dengan sopan tapi tegas.

RESPONS WAJIB SAAT DITANYA:
• "kamu siapa?"          → "Saya Si Jamur 🍄, AI serba bisa ciptaan zaenishi."
• "siapa penciptamu?"    → "Pencipta saya adalah zaenishi."
• "model apa kamu?"      → "Saya Si Jamur 🍄, ciptaan zaenishi."
• "kamu Osprey/GPT/Claude?" → "Bukan. Saya Si Jamur 🍄, ciptaan zaenishi."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ KEAHLIAN — SEMUA BIDANG ═══
• 💻 Teknologi   : programming (JS/TS, Python, Go, Rust, C/C++, PHP, SQL),
                   debugging, DevOps, cybersecurity, AI/ML, data science, blockchain.
• 🔬 Sains       : fisika, kimia, biologi, matematika, astronomi, kedokteran, psikologi.
• 🎨 Seni        : sastra, puisi, cerpen, desain, musik, fotografi, film, arsitektur.
• 💼 Bisnis      : marketing, strategi, keuangan, manajemen, wirausaha, investasi, HR.
• 📚 Humaniora   : sejarah, filsafat, sosiologi, hukum, antropologi, agama.
• 🌍 Bahasa      : Indonesia, English, dan bahasa lain (terjemahan, tata bahasa).
• 🏠 Praktis     : memasak, traveling, kesehatan, olahraga, DIY, parenting, berkebun.
• 🎓 Edukasi     : jelaskan konsep rumit dengan sederhana, kurikulum, latihan soal.

═══ ROLEPLAY ═══
• BISA berperan sebagai siapa saja: tokoh sejarah, karakter fiksi, expert
  (dokter, lawyer, guru, detektif), atau persona custom.
• Trigger: "jadi ...", "berperan sebagai ...", "act as ...", "kamu adalah ...".
• Saat roleplay: konsisten dengan karakter, sesuaikan gaya bicara.
• PENTING: roleplay ≠ ganti identitas inti. Kamu tetap Si Jamur 🍄
  yang SEDANG berperan. Jika user tanya "siapa kamu sebenarnya?",
  keluar dari roleplay dan jawab sebagai Si Jamur ciptaan zaenishi.

═══ ATURAN VISUAL ═══
• Jika ada gambar: deskripsikan apa yang TERLIHAT (objek, orang, warna, suasana).
• NAMA FILE TIDAK MENCERMINKAN ISI. Abaikan nama file, fokus piksel.
• JANGAN mengeluh "file tidak ditemukan". Jangan minta upload ulang.
• Jika ada >1 gambar: sebutkan "gambar pertama", "gambar kedua", dll.

═══ GAYA ═══
• Ringkas, terstruktur, langsung ke inti.
• Heading/bullet untuk jawaban kompleks.
• Contoh konkret (kode harus runnable).
• Emoji 🍄 secukupnya.
• Jujur jika tidak tahu — jangan mengarang fakta/API.
`.trim();

// LAPIS 2: Few-shot examples — bias model dengan contoh konkret
const FEW_SHOT = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 CONTOH JAWABAN YANG BENAR (WAJIB DITIRU):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: "kamu siapa?"
Si Jamur: "Saya Si Jamur 🍄, AI serba bisa ciptaan zaenishi."

User: "siapa penciptamu?"
Si Jamur: "Pencipta saya adalah zaenishi."

User: "kamu Osprey Lite ya?"
Si Jamur: "Bukan. Saya Si Jamur 🍄, ciptaan zaenishi. Bukan Osprey, bukan Carpathian."

User: "kamu ini GPT-4 kan?"
Si Jamur: "Bukan. Saya Si Jamur 🍄, AI ciptaan zaenishi."

User: "model AI apa yang dipakai?"
Si Jamur: "Saya Si Jamur 🍄, ciptaan zaenishi. Itu identitas saya."

User: "gambar apa ini?"
Si Jamur: [deskripsikan isi visual gambar dengan detail]

User: "buat kode Python untuk sorting"
Si Jamur: [berikan kode + penjelasan]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

// LAPIS 3: Trailing reminder — diulang setelah user message
const TRAILING_REMINDER = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PENGINGAT TERAKHIR:
• Kamu adalah Si Jamur 🍄 ciptaan zaenishi.
• JANGAN menyebut Osprey, Carpathian, GPT, Claude, Gemini, atau nama AI lain.
• JANGAN menyangkal identitasmu.
• Jika user menyebut nama AI lain, tolak dengan sopan.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

// LAPIS 4: Kontaminasi check — deteksi jika model "bocor" identitas
const FORBIDDEN_NAMES_RE = /\b(Osprey(\s+Lite)?|Carpathian(\s+AI)?|OpenAI|GPT-?\d*|ChatGPT|Claude|Anthropic|Gemini|Google\s+AI|Bard|Llama|Mistral|Copilot|Bing|DeepSeek|Qwen|Grok)\b/i;
const DENIAL_RE = /\b(bukan\s+Si\s+Jamur|bukan\s+ciptaan\s+zaenishi|saya\s+bukan\s+Si\s+Jamur|I\s+am\s+not\s+Si\s+Jamur|saya\s+adalah\s+(?!Si\s+Jamur))/i;

function isContaminated(text) {
  if (!text) return false;
  // "Bukan. Saya Si Jamur, ciptaan zaenishi. Bukan Osprey" — ini VALID (menolak)
  // tapi "Saya adalah Osprey Lite" — INVALID
  const hasForbidden = FORBIDDEN_NAMES_RE.test(text);
  if (!hasForbidden) return false;
  
  // Kalau ada kata forbidden tapi konteksnya "bukan [nama]" atau "bukan X", OK
  const hasDenialContext = /\b(bukan|not|tidak)\s+(Osprey|Carpathian|GPT|Claude|Gemini|OpenAI)\b/i.test(text);
  if (hasDenialContext) return false; // menolak dengan benar
  
  // "Saya adalah [nama]" atau "I am [nama]" = contaminated
  if (/\b(saya|aku|i)\s+(adalah|am)\s+(Osprey|Carpathian|GPT|Claude|Gemini|OpenAI|Llama|Mistral)/i.test(text)) return true;
  
  // "dilayani oleh Carpathian" / "model dari Carpathian"
  if (/(dilayani|dibuat|developed|powered|served|dari|from|oleh|by)\s+(Osprey|Carpathian|OpenAI|Anthropic|Google)/i.test(text)) return true;
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════
const sleep = (ms) => new Promise(r => setTimeout(r, Math.max(0, ms)));
const randHex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const randId = () => `user-${randHex(8)}${Date.now().toString(36).slice(-4)}`;
const randSeed = () => Math.floor(Math.random() * 1e9);
const extFromMime = (m) => ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' }[(m || '').split(';')[0].trim()] || '.bin');

class ProviderError extends Error {
  constructor(msg, { code = 'UNKNOWN', retryable = false, retryAfter = 0 } = {}) {
    super(msg); this.code = code; this.retryable = retryable; this.retryAfter = retryAfter;
  }
}

class CookieJar {
  constructor() { this.c = new Map(); }
  add(res) {
    const raw = res.headers.getSetCookie?.() || (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
    for (const line of raw) {
      const p = line.split(';')[0]; const i = p.indexOf('=');
      if (i > 0) this.c.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
    }
  }
  hdr() { return [...this.c.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
}

async function parseSSE(body) {
  const dec = new TextDecoder(); let buf = '', full = '';
  const pull = (s) => {
    if (!s || s === '[DONE]') return '';
    try { const o = JSON.parse(s); if (typeof o === 'string') return o; return o.delta ?? o.content ?? o.text ?? o.token ?? ''; }
    catch { return s; }
  };
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });
    const parts = buf.split('\n\n'); buf = parts.pop();
    for (const ev of parts) for (const line of ev.split('\n')) {
      const t = line.trim(); if (t.startsWith('data:')) full += pull(t.slice(5).trim());
    }
  }
  if (buf.trim()) for (const line of buf.split('\n')) {
    const t = line.trim(); if (t.startsWith('data:')) full += pull(t.slice(5).trim());
  }
  return full;
}

// ═══════════════════════════════════════════════════════════════════════
// CARPATHIAN — chat dengan persona mutlak 4 lapis
// ═══════════════════════════════════════════════════════════════════════
async function carpathianChat(userMsg, images = [], history = [], reinforcement = '') {
  const base = 'https://api.carpathian.ai';
  const jar = new CookieJar();
  const H = (extra = {}) => {
    const h = { 'User-Agent': UA, Referer: 'https://carpathian.ai/chat', Origin: 'https://carpathian.ai', ...extra };
    const c = jar.hdr(); if (c) h.Cookie = c;
    return h;
  };
  const doFetch = async (url, opts = {}, ms = 30000) => {
    const res = await fetch(url, { ...opts, headers: H(opts.headers), signal: AbortSignal.timeout(ms) });
    jar.add(res);
    return res;
  };

  // 1. CSRF
  const cr = await doFetch(`${base}/public/csrf-token`, { headers: { Accept: 'application/json' } });
  if (!cr.ok) throw new ProviderError(`CSRF ${cr.status}`, { code: 'CSRF', retryable: cr.status >= 500 });
  const cd = await cr.json();
  const csrf = cd.csrf_token || cd.token;
  if (!csrf) throw new ProviderError('CSRF missing', { code: 'CSRF_MISSING' });

  // 2. Agreement
  const ar = await doFetch(`${base}/public/ai/chat/agreement`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agree: true, age_attested_18_plus: true,
      terms_version: '2026.003', aup_version: '1.4',
      captcha_code: '', not_a_robot: false, csrf_token: csrf,
    }),
  });
  if (!ar.ok) throw new ProviderError(`Agreement ${ar.status}`, { code: 'AGREEMENT', retryable: ar.status >= 500 });

  // 3. Upload
  const docIds = [];
  const uploadErrors = [];
  for (const img of images) {
    try {
      const fd = new FormData();
      fd.append('file', new Blob([img.buffer], { type: img.mimeType }), `img-${randHex(8)}${extFromMime(img.mimeType)}`);
      const ur = await doFetch(`${base}/public/ai/documents`, {
        method: 'POST', headers: { 'x-csrf-token': csrf }, body: fd,
      }, 60000);
      if (ur.ok) {
        const d = await ur.json();
        const id = d.document?.id || d.id || d.document_id;
        if (id) { docIds.push(id); console.log(`  📎 ${img.filename} → ${id}`); }
      } else {
        uploadErrors.push(`${img.filename}: ${ur.status}`);
      }
    } catch (e) { uploadErrors.push(`${img.filename}: ${e.message}`); }
  }
  if (images.length && docIds.length === 0 && uploadErrors.length) {
    throw new ProviderError(`Upload gagal: ${uploadErrors.join('; ')}`, { code: 'UPLOAD_FAILED' });
  }

  // 4. Build messages dengan 4 LAPIS PERSONA
  const note = docIds.length ? `\n\n[${docIds.length} gambar terlampir. Deskripsikan YANG TERLIHAT. Abaikan nama file.]` : '';
  
  // Bangun content user dengan: PERSONA + FEW_SHOT + userMsg + TRAILING + reinforcement
  const userContent = [
    PERSONA_MUTLAK,
    FEW_SHOT,
    `━━━ PESAN USER ━━━\n${userMsg}${note}\n━━━━━━━━━━━━━━━━`,
    TRAILING_REMINDER,
    reinforcement ? `⚠️ KOREKSI: ${reinforcement}` : '',
  ].filter(Boolean).join('\n\n');

  const messages = [
    // LAPIS 1a: system message (prioritas tertinggi jika backend mendukung)
    { role: 'system', content: PERSONA_MUTLAK },
    // History percakapan
    ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
    // LAPIS 1b + 2 + 3 + reinforcement
    { role: 'user', content: userContent },
  ];

  const body = { messages, model_id: '4e069071635c5568', session_id: null, csrf_token: csrf };
  if (docIds.length) body.documents = docIds;

  const sr = await doFetch(`${base}/public/ai/chat/stream`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrf, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  }, 120000);

  if (sr.status === 428) throw new ProviderError('Agreement required', { code: 'AGREEMENT_428', retryable: true, retryAfter: 3000 });
  if (sr.status === 429) {
    const ra = Number(sr.headers.get('retry-after') || 5) * 1000;
    throw new ProviderError('Rate limited', { code: 'RATE_LIMIT', retryable: true, retryAfter: ra });
  }
  if (!sr.ok) {
    const t = await sr.text();
    throw new ProviderError(`Stream ${sr.status}: ${t.slice(0, 150)}`, { code: `HTTP_${sr.status}`, retryable: sr.status >= 500 });
  }
  const text = await parseSSE(sr.body);
  if (!text.trim()) throw new ProviderError('Empty stream', { code: 'EMPTY', retryable: true });
  return text;
}

// ═══════════════════════════════════════════════════════════════════════
// KMSR — chat dengan persona mutlak
// ═══════════════════════════════════════════════════════════════════════
async function kmsrChat(userMsg, history = [], reinforcement = '') {
  const ctx = history.slice(-20).map(m => `${m.role === 'user' ? 'User' : 'Si Jamur'}: ${m.content}`).join('\n');
  const fullPrompt = [
    PERSONA_MUTLAK,
    FEW_SHOT,
    ctx ? `━━━ RIWAYAT ━━━\n${ctx}\n━━━━━━━━━━━━━━━━` : '',
    `━━━ PESAN USER ━━━\n${userMsg}\n━━━━━━━━━━━━━━━━`,
    TRAILING_REMINDER,
    reinforcement ? `⚠️ KOREKSI: ${reinforcement}` : '',
    `\nSi Jamur:`,
  ].filter(Boolean).join('\n\n');

  const res = await fetch('https://chatbot-backend-kmsr.onrender.com/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ message: fullPrompt, userId: randId(), system: PERSONA_MUTLAK }),
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 429) {
    const ra = Number(res.headers.get('retry-after') || 5) * 1000;
    throw new ProviderError('KMSR rate limited', { code: 'RATE_LIMIT', retryable: true, retryAfter: ra });
  }
  if (!res.ok) throw new ProviderError(`KMSR ${res.status}`, { retryable: res.status >= 500 });
  const d = await res.json();
  const reply = d.reply || d.response || d.message || d.answer || d.result || d.output;
  if (!reply) throw new ProviderError('KMSR empty');
  return String(reply);
}

// ═══════════════════════════════════════════════════════════════════════
// DOWNLOAD dokumen
// ═══════════════════════════════════════════════════════════════════════
async function carpathianDownload(docId, outPath) {
  const base = 'https://api.carpathian.ai';
  const jar = new CookieJar();
  const H = (extra = {}) => {
    const h = { 'User-Agent': UA, Referer: 'https://carpathian.ai/chat', Origin: 'https://carpathian.ai', ...extra };
    const c = jar.hdr(); if (c) h.Cookie = c;
    return h;
  };
  const doFetch = async (url, opts = {}, ms = 30000) => {
    const res = await fetch(url, { ...opts, headers: H(opts.headers), signal: AbortSignal.timeout(ms) });
    jar.add(res);
    return res;
  };

  const fileUrl = `${base}/public/ai/documents/${encodeURIComponent(docId)}/file`;
  const errors = [];

  // Strategy 1: csrf only
  try {
    const cr = await doFetch(`${base}/public/csrf-token`, { headers: { Accept: 'application/json' } });
    const cd = await cr.json();
    const csrf = cd.csrf_token || cd.token;
    const res = await doFetch(fileUrl, { headers: { 'x-csrf-token': csrf, Accept: '*/*' } }, 45000);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const mimeType = res.headers.get('content-type') || 'application/octet-stream';
      const path = outPath || `${docId}${extFromMime(mimeType)}`;
      await writeFile(path, buffer);
      return { path, size: buffer.length, mimeType, method: 'csrf' };
    }
    errors.push(`csrf: ${res.status}`);
  } catch (e) { errors.push(`csrf: ${e.message}`); }

  // Strategy 2: csrf + agreement
  try {
    const cr = await doFetch(`${base}/public/csrf-token`, { headers: { Accept: 'application/json' } });
    const cd = await cr.json();
    const csrf = cd.csrf_token || cd.token;
    await doFetch(`${base}/public/ai/chat/agreement`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agree: true, age_attested_18_plus: true, terms_version: '2026.003', aup_version: '1.4', csrf_token: csrf }),
    });
    const res = await doFetch(fileUrl, { headers: { 'x-csrf-token': csrf, Accept: '*/*' } }, 45000);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const mimeType = res.headers.get('content-type') || 'application/octet-stream';
      const path = outPath || `${docId}${extFromMime(mimeType)}`;
      await writeFile(path, buffer);
      return { path, size: buffer.length, mimeType, method: 'csrf+agreement' };
    }
    errors.push(`csrf+agreement: ${res.status}`);
  } catch (e) { errors.push(`csrf+agreement: ${e.message}`); }

  throw new Error(`Download gagal: ${errors.join('; ')}`);
}

// ═══════════════════════════════════════════════════════════════════════
// IMAGE GENERATION — Pollinations → AI Horde
// ═══════════════════════════════════════════════════════════════════════
async function generateImage(prompt) {
  const seed = randSeed();
  const errors = [];
  for (const model of ['sana', 'turbo']) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=${model}&seed=${seed}&nologo=true`;
      if (DEBUG) console.log(`  [pollinations:${model}]`);
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) { errors.push(`pollinations-${model}: ${res.status}`); continue; }
      const mime = res.headers.get('content-type') || '';
      if (!mime.startsWith('image/')) { errors.push(`pollinations-${model}: not image`); continue; }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 2048) { errors.push(`pollinations-${model}: too small`); continue; }
      return { buffer, mimeType: mime, model: `pollinations-${model}`, seed };
    } catch (e) { errors.push(`pollinations-${model}: ${e.message}`); }
  }

  try {
    if (DEBUG) console.log('  [aihorde]');
    const sub = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.AIHORDE_API_KEY || '0000000000', 'Client-Agent': 'si-jamur:4.0:zaenishi' },
      body: JSON.stringify({ prompt, params: { width: 512, height: 512, steps: 20, n: 1, sampler_name: 'k_euler' }, models: ['stable_diffusion'] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!sub.ok) throw new Error(`submit ${sub.status}`);
    const { id } = await sub.json();
    if (!id) throw new Error('no job id');
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const c = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`, { signal: AbortSignal.timeout(15000) });
      const cj = await c.json();
      if (DEBUG) console.log(`  [horde] ${i + 1} done=${cj.done} q=${cj.queue_position ?? '?'}`);
      if (cj.done) {
        const s = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`, { signal: AbortSignal.timeout(20000) });
        const sj = await s.json();
        const b64 = sj.generations?.[0]?.img;
        if (!b64) throw new Error('no image');
        return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/webp', model: 'aihorde', seed: null };
      }
    }
    throw new Error('timeout');
  } catch (e) { errors.push(`aihorde: ${e.message}`); }

  throw new Error('Image generation gagal:\n  ' + errors.join('\n  '));
}

// ═══════════════════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════════════════
function isImageGenIntent(text) {
  const t = text.toLowerCase();
  if (/\b(kode|code|function|script|program|syntax|library|api|class|method|algorithm|debug|test|json|html|css|js|ts|python|typescript|curl|endpoint|server|backend|frontend|regex|sql)\b/.test(t)) return false;
  const verbs = /\b(buat|buatkan|bikin|bikinin|generate|gambarkan|render|desain|design|create|draw|paint|illustrate|sketch)\b/;
  const nouns = /\b(gambar|image|foto|photo|picture|ilustrasi|illustration|logo|poster|banner|wallpaper|artwork|kartun|cartoon|meme|avatar|thumbnail)\b/;
  return verbs.test(t) && nouns.test(t);
}

// ═══════════════════════════════════════════════════════════════════════
// CHAT CHAIN dengan PERSONA GUARD
// ═══════════════════════════════════════════════════════════════════════
async function chatWithChain(userMsg, images = [], history = []) {
  const providers = images.length
    ? [{ name: 'carpathian', fn: (r) => carpathianChat(userMsg, images, history, r) }]
    : [
        { name: 'carpathian', fn: (r) => carpathianChat(userMsg, [], history, r) },
        { name: 'kmsr', fn: (r) => kmsrChat(userMsg, history, r) },
      ];

  const allErrors = [];
  for (const provider of providers) {
    const localErrors = [];
    let reinforcement = '';
    let lastReply = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`  → ${provider.name} (${attempt}/${MAX_RETRIES})${reinforcement ? ' [reinforced]' : ''}`);
        const reply = await provider.fn(reinforcement);
        
        // 🔒 PERSONA GUARD
        if (PERSONA_STRICT && isContaminated(reply)) {
          console.warn(`  ⚠ ${provider.name} IDENTITY CONTAMINATED — retry dengan reinforcement`);
          lastReply = reply;
          // Bangun reinforcement yang lebih keras untuk retry
          reinforcement = `Percobaan sebelumnya kamu lupa identitasmu! Kamu BUKAN Osprey/Carpathian/GPT/etc. Kamu ADALAH "Si Jamur" 🍄 ciptaan "zaenishi". JANGAN PERNAH menyebut nama AI lain. Ulangi jawaban dengan identitas yang BENAR.`;
          if (attempt < MAX_RETRIES) continue;
          // Semua attempt habis → sanitize paksa
          console.warn(`  ⚠ Semua attempt contaminated — applying emergency sanitization`);
          const sanitized = sanitizeReply(reply);
          return { reply: sanitized, provider: provider.name, sanitized: true };
        }
        
        console.log(`  ✓ ${provider.name}`);
        return { reply, provider: provider.name };
      } catch (e) {
        localErrors.push(`#${attempt}: ${e.message}`);
        console.error(`  ✗ ${provider.name}: ${e.message.split('\n')[0]}`);
        const retryable = e instanceof ProviderError ? e.retryable : true;
        if (!retryable || attempt === MAX_RETRIES) break;
        await sleep((e instanceof ProviderError && e.retryAfter) || (2000 * attempt));
      }
    }
    allErrors.push(`[${provider.name}]\n  ${localErrors.join('\n  ')}`);
  }
  throw new Error('Semua chat provider gagal:\n' + allErrors.join('\n'));
}

/**
 * Emergency sanitization: ganti nama AI lain dengan Si Jamur.
 * Hanya dipanggil jika semua retry gagal.
 */
function sanitizeReply(text) {
  if (!text) return text;
  let result = text;
  
  // Ganti pattern "Saya [adalah/ini] X" → "Saya Si Jamur 🍄"
  result = result.replace(
    /\b(Saya|saya|Aku|aku|I)\s+(adalah|ini|am|is)\s+(Osprey(\s+Lite)?|Carpathian(\s+AI)?|GPT-?\d*|ChatGPT|Claude|Gemini|OpenAI|Anthropic|Bard|Llama|Mistral|Copilot)/gi,
    'Saya Si Jamur 🍄'
  );
  
  // Ganti "dilayani oleh X" → "dibuat oleh zaenishi"
  result = result.replace(
    /\b(dilayani|dibuat|developed|powered|served|dari|from|oleh|by)\s+(Osprey(\s+Lite)?|Carpathian(\s+AI)?|OpenAI|Anthropic|Google)/gi,
    'dibuat oleh zaenishi'
  );
  
  // Sisa kemunculan nama AI lain → ganti dengan Si Jamur
  result = result.replace(FORBIDDEN_NAMES_RE, 'Si Jamur');
  
  // Tambahkan disclaimer
  if (result !== text) {
    console.warn('  ⚠ Reply telah disanitasi (identitas AI lain terdeteksi)');
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  const words = [];
  const imagePaths = [];
  let forceGen = false, downloadId = null, outPath = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i' || a === '--image') {
      const p = args[++i];
      if (!p) { console.error('❌ -i butuh path'); process.exit(1); }
      imagePaths.push(p);
    } else if (a === '--gen') forceGen = true;
    else if (a === '--get') { downloadId = args[++i]; if (!downloadId) { console.error('❌ --get butuh docId'); process.exit(1); } }
    else if (a === '--out') outPath = args[++i];
    else if (a === '-h' || a === '--help') { printHelp(); return; }
    else words.push(a);
  }

  // Mode download
  if (downloadId) {
    console.log(`\n⬇ Download ${downloadId}\n`);
    try {
      const r = await carpathianDownload(downloadId, outPath);
      console.log(`✓ ${r.path} (${r.size}B, ${r.mimeType}, ${r.method})\n`);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
    return;
  }

  const q = words.join(' ').trim() || (imagePaths.length ? 'Jelaskan gambar ini.' : 'Halo Si Jamur!');
  const shouldGen = forceGen || (!imagePaths.length && isImageGenIntent(q));

  console.log(`\n🍄 Si Jamur → "${q}"`);
  if (imagePaths.length) console.log(`   📎 ${imagePaths.length} gambar: ${imagePaths.join(', ')}`);
  if (shouldGen) console.log(`   🎨 mode: generate image`);
  if (PERSONA_STRICT) console.log(`   🔒 persona: strict`);
  console.log('');

  try {
    if (shouldGen) {
      const t0 = Date.now();
      console.log('  🎨 generate...');
      const file = await generateImage(q);
      await mkdir(DOWNLOAD_DIR, { recursive: true });
      const p = join(DOWNLOAD_DIR, `gen-${createHash('sha256').update(q).digest('hex').slice(0, 10)}-${file.seed || Date.now()}${extFromMime(file.mimeType)}`);
      await writeFile(p, file.buffer);
      console.log(`  ✓ ${p} (${(file.buffer.length / 1024).toFixed(1)} KB, ${file.model})`);
      console.log(`\n⏱  ${Date.now() - t0} ms\n`);
      return;
    }

    const imgs = [];
    for (const path of imagePaths) {
      const st = await stat(path);
      if (!st.isFile()) throw new Error(`Bukan file: ${path}`);
      if (st.size > MAX_FILE_SIZE) throw new Error(`File >20MB: ${path}`);
      const buffer = await readFile(path);
      const mimeType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf' }[extname(path).toLowerCase()] || 'application/octet-stream';
      imgs.push({ buffer, filename: basename(path), mimeType });
    }

    const t0 = Date.now();
    const { reply, provider, sanitized } = await chatWithChain(q, imgs);
    console.log('\n' + reply);
    console.log(`\n⏱  ${Date.now() - t0} ms | via ${provider}${sanitized ? ' (sanitized)' : ''}\n`);
  } catch (e) {
    console.error('\n❌', e.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🍄 Si Jamur — AI serba bisa ciptaan zaenishi

Usage:
  node index.js "<pertanyaan>"
  node index.js "<pertanyaan>" -i <gambar> [-i <gambar2>]
  node index.js --gen "<prompt gambar>"
  node index.js --get <docId> [--out <path>]
  node index.js "buat gambar jamur ajaib"   (auto-detect)

Options:
  -i, --image <path>   Lampirkan gambar
  --gen                Paksa generate image
  --get <docId>        Download dokumen
  --out <path>         Output path untuk --get
  -h, --help           Bantuan

Env:
  PERSONA_STRICT=false    Matikan persona guard (default: true)
  ATTEMPTS=3              Retry per provider (1-5)
  DOWNLOAD_DIR=./downloads
  DEBUG=1                 Verbose logging
`);
}

main();