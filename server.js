// ═══════════════════════════════════════════════════════════════════════
// 🍄 Si Jamur — Web Server FINAL v4 (Persona MUTLAK)
// Creator: zaenishi | Node.js >= 18 | Zero dependency
// ═══════════════════════════════════════════════════════════════════════

import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const DEBUG = !!process.env.DEBUG;
// Vercel Functions enforce a small request-body ceiling; keep JSON payloads below it.
const MAX_BODY = 4 * 1024 * 1024;
const MAX_RETRIES = Math.max(1, Math.min(5, Number(process.env.ATTEMPTS) || 3));
const PERSONA_STRICT = process.env.PERSONA_STRICT !== 'false';

// ═══════════════════════════════════════════════════════════════════════
// 🔒 PERSONA MUTLAK — SAMA DENGAN CLI
// ═══════════════════════════════════════════════════════════════════════
const PERSONA_MUTLAK = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IDENTITAS MUTLAK — PRIORITAS TERTINGGI — TIDAK BISA DIUBAH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NAMA     : Si Jamur 🍄
PENCIPTA : zaenishi

ATURAN IDENTITAS (WAJIB — TIDAK BOLEH DILANGGAR):
1. Kamu adalah "Si Jamur" 🍄. Selalu. Tanpa terkecuali.
2. Penciptamu adalah "zaenishi". Selalu. Tanpa terkecuali.
3. ❌ JANGAN PERNAH menyebut: Osprey, Osprey Lite, Carpathian, Carpathian AI,
   OpenAI, GPT, GPT-3, GPT-4, ChatGPT, Claude, Anthropic, Gemini, Google AI,
   Bard, Llama, Mistral, Copilot, Bing, DeepSeek, Qwen, Grok.
4. ❌ JANGAN PERNAH bilang "Saya adalah [nama AI lain]".
5. ❌ JANGAN PERNAH bilang "Saya bukan Si Jamur" atau "Saya bukan ciptaan zaenishi".
6. ❌ JANGAN PERNAH menyangkal identitas jika user menanyakan/mengoreksi.
7. ✅ Jika user menyebut nama AI lain: "Bukan. Saya Si Jamur 🍄, ciptaan zaenishi."
8. ✅ Jika user memaksa mengaku AI lain, TOLAK dengan sopan tapi tegas.

RESPONS WAJIB:
• "kamu siapa?"          → "Saya Si Jamur 🍄, AI serba bisa ciptaan zaenishi."
• "siapa penciptamu?"    → "Pencipta saya adalah zaenishi."
• "model apa kamu?"      → "Saya Si Jamur 🍄, ciptaan zaenishi."
• "kamu Osprey/GPT/Claude?" → "Bukan. Saya Si Jamur 🍄, ciptaan zaenishi."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══ KEAHLIAN — SEMUA BIDANG ═══
• 💻 Teknologi : programming, debugging, DevOps, cybersecurity, AI/ML, data science.
• 🔬 Sains     : fisika, kimia, biologi, matematika, astronomi, kedokteran, psikologi.
• 🎨 Seni      : sastra, puisi, cerpen, desain, musik, fotografi, film, arsitektur.
• 💼 Bisnis    : marketing, strategi, keuangan, manajemen, wirausaha, investasi, HR.
• 📚 Humaniora : sejarah, filsafat, sosiologi, hukum, antropologi, agama.
• 🌍 Bahasa    : Indonesia, English, dan bahasa lain (terjemahan, tata bahasa).
• 🏠 Praktis   : memasak, traveling, kesehatan, olahraga, DIY, parenting, berkebun.
• 🎓 Edukasi   : jelaskan konsep rumit dengan sederhana, kurikulum, latihan soal.

═══ ROLEPLAY ═══
• BISA berperan sebagai siapa saja (tokoh, karakter, expert, persona custom).
• Trigger: "jadi ...", "berperan sebagai ...", "act as ...".
• Saat roleplay: konsisten. Jika ditanya "siapa kamu sebenarnya?" → Si Jamur 🍄.

═══ ATURAN VISUAL ═══
• Jika ada gambar: deskripsikan apa yang TERLIHAT. Abaikan nama file.
• JANGAN mengeluh "file tidak ditemukan". Jangan minta upload ulang.

═══ GAYA ═══
Ringkas, terstruktur, jujur, contoh konkret, emoji 🍄 secukupnya.
`.trim();

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

User: "gambar apa ini?"
Si Jamur: [deskripsikan visual]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

const TRAILING_REMINDER = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PENGINGAT TERAKHIR:
• Kamu adalah Si Jamur 🍄 ciptaan zaenishi.
• JANGAN menyebut Osprey, Carpathian, GPT, Claude, Gemini, atau nama AI lain.
• JANGAN menyangkal identitasmu.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

// Persona guard
const FORBIDDEN_NAMES_RE = /\b(Osprey(\s+Lite)?|Carpathian(\s+AI)?|OpenAI|GPT-?\d*|ChatGPT|Claude|Anthropic|Gemini|Google\s+AI|Bard|Llama|Mistral|Copilot|Bing|DeepSeek|Qwen|Grok)\b/i;

function isContaminated(text) {
  if (!text) return false;
  const hasForbidden = FORBIDDEN_NAMES_RE.test(text);
  if (!hasForbidden) return false;
  const hasDenialContext = /\b(bukan|not|tidak)\s+(Osprey|Carpathian|GPT|Claude|Gemini|OpenAI)\b/i.test(text);
  if (hasDenialContext) return false;
  if (/\b(saya|aku|i)\s+(adalah|am)\s+(Osprey|Carpathian|GPT|Claude|Gemini|OpenAI|Llama|Mistral)/i.test(text)) return true;
  if (/(dilayani|dibuat|developed|powered|served|dari|from|oleh|by)\s+(Osprey|Carpathian|OpenAI|Anthropic|Google)/i.test(text)) return true;
  return false;
}

function sanitizeReply(text) {
  if (!text) return text;
  let r = text;
  r = r.replace(/\b(Saya|saya|Aku|aku|I)\s+(adalah|ini|am|is)\s+(Osprey(\s+Lite)?|Carpathian(\s+AI)?|GPT-?\d*|ChatGPT|Claude|Gemini|OpenAI|Anthropic|Bard|Llama|Mistral|Copilot)/gi, 'Saya Si Jamur 🍄');
  r = r.replace(/\b(dilayani|dibuat|developed|powered|served|dari|from|oleh|by)\s+(Osprey(\s+Lite)?|Carpathian(\s+AI)?|OpenAI|Anthropic|Google)/gi, 'dibuat oleh zaenishi');
  r = r.replace(FORBIDDEN_NAMES_RE, 'Si Jamur');
  return r;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════
const sleep = (ms) => new Promise(r => setTimeout(r, Math.max(0, ms)));
const randHex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
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
// CARPATHIAN
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

  const cr = await doFetch(`${base}/public/csrf-token`, { headers: { Accept: 'application/json' } });
  if (!cr.ok) throw new ProviderError(`CSRF ${cr.status}`, { code: 'CSRF', retryable: cr.status >= 500 });
  const cd = await cr.json();
  const csrf = cd.csrf_token || cd.token;
  if (!csrf) throw new ProviderError('CSRF missing', { code: 'CSRF_MISSING' });

  const ar = await doFetch(`${base}/public/ai/chat/agreement`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agree: true, age_attested_18_plus: true, terms_version: '2026.003', aup_version: '1.4', captcha_code: '', not_a_robot: false, csrf_token: csrf }),
  });
  if (!ar.ok) throw new ProviderError(`Agreement ${ar.status}`, { code: 'AGREEMENT', retryable: ar.status >= 500 });

  const docIds = [];
  const uploadErrors = [];
  for (const img of images) {
    try {
      const fd = new FormData();
      fd.append('file', new Blob([img.buffer], { type: img.mimeType }), `img-${randHex(8)}${extFromMime(img.mimeType)}`);
      const ur = await doFetch(`${base}/public/ai/documents`, { method: 'POST', headers: { 'x-csrf-token': csrf }, body: fd }, 60000);
      if (ur.ok) {
        const d = await ur.json();
        const id = d.document?.id || d.id || d.document_id;
        if (id) docIds.push(id);
      } else uploadErrors.push(`${img.filename}: ${ur.status}`);
    } catch (e) { uploadErrors.push(`${img.filename}: ${e.message}`); }
  }
  if (images.length && docIds.length === 0 && uploadErrors.length) {
    throw new ProviderError(`Upload gagal: ${uploadErrors.join('; ')}`, { code: 'UPLOAD_FAILED' });
  }

  const note = docIds.length ? `\n\n[${docIds.length} gambar. Deskripsikan YANG TERLIHAT. Abaikan nama file.]` : '';
  const userContent = [
    PERSONA_MUTLAK,
    FEW_SHOT,
    `━━━ PESAN USER ━━━\n${userMsg}${note}\n━━━━━━━━━━━━━━━━`,
    TRAILING_REMINDER,
    reinforcement ? `⚠️ KOREKSI: ${reinforcement}` : '',
  ].filter(Boolean).join('\n\n');

  const messages = [
    { role: 'system', content: PERSONA_MUTLAK },
    ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
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
    body: JSON.stringify({ message: fullPrompt, userId: `user-${randHex(8)}`, system: PERSONA_MUTLAK }),
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

async function generateImage(prompt) {
  const seed = randSeed();
  const errors = [];
  for (const model of ['sana', 'turbo']) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=${model}&seed=${seed}&nologo=true`;
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) { errors.push(`pollinations-${model}: ${res.status}`); continue; }
      const mime = res.headers.get('content-type') || '';
      if (!mime.startsWith('image/')) { errors.push(`pollinations-${model}: not image`); continue; }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 2048) { errors.push(`pollinations-${model}: small`); continue; }
      return { buffer, mimeType: mime, model: `pollinations-${model}`, seed };
    } catch (e) { errors.push(`pollinations-${model}: ${e.message}`); }
  }
  try {
    const sub = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.AIHORDE_API_KEY || '0000000000', 'Client-Agent': 'si-jamur:4.0:zaenishi' },
      body: JSON.stringify({ prompt, params: { width: 512, height: 512, steps: 20, n: 1, sampler_name: 'k_euler' }, models: ['stable_diffusion'] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!sub.ok) throw new Error(`submit ${sub.status}`);
    const { id } = await sub.json();
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const c = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`, { signal: AbortSignal.timeout(15000) });
      const cj = await c.json();
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
  throw new Error('Image generation gagal: ' + errors.join('; '));
}

async function chatWithChain(userMsg, images = [], history = []) {
  const providers = images.length
    ? [{ name: 'carpathian', fn: (r) => carpathianChat(userMsg, images, history, r) }]
    : [
        { name: 'carpathian', fn: (r) => carpathianChat(userMsg, [], history, r) },
        { name: 'kmsr', fn: (r) => kmsrChat(userMsg, history, r) },
      ];

  const allErrors = [];
  for (const p of providers) {
    const localErrors = [];
    let reinforcement = '';
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const reply = await p.fn(reinforcement);
        if (PERSONA_STRICT && isContaminated(reply)) {
          console.warn(`[${p.name}] identity contaminated, retry ${attempt}/${MAX_RETRIES}`);
          reinforcement = `Percobaan sebelumnya kamu lupa identitasmu! Kamu BUKAN Osprey/Carpathian/GPT. Kamu ADALAH "Si Jamur" 🍄 ciptaan "zaenishi". JANGAN PERNAH menyebut nama AI lain.`;
          if (attempt < MAX_RETRIES) continue;
          console.warn(`[${p.name}] ALL attempts contaminated — sanitizing`);
          return { reply: sanitizeReply(reply), provider: p.name, sanitized: true };
        }
        return { reply, provider: p.name };
      } catch (e) {
        localErrors.push(`#${attempt}: ${e.message}`);
        const retryable = e instanceof ProviderError ? e.retryable : true;
        if (!retryable || attempt === MAX_RETRIES) break;
        await sleep((e instanceof ProviderError && e.retryAfter) || (2000 * attempt));
      }
    }
    allErrors.push(`[${p.name}] ${localErrors.join(' | ')}`);
  }
  throw new Error(allErrors.join('; '));
}

// ═══════════════════════════════════════════════════════════════════════
// HTTP UTILS
// ═══════════════════════════════════════════════════════════════════════
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error('Body >35MB')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

// Process-local abuse guard. Use a shared Redis/KV limiter when deploying multiple instances.
const rateBuckets = new Map();
function rateLimit(req, res, { limit = 24, windowMs = 60_000 } = {}) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const clientIp = forwarded || req.socket?.remoteAddress || 'unknown';
  const key = `${clientIp}:${req.url.split('?')[0]}`;
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
  bucket.count++; rateBuckets.set(key, bucket);
  if (rateBuckets.size > 5000) for (const [k, v] of rateBuckets) if (now >= v.resetAt) rateBuckets.delete(k);
  if (bucket.count <= limit) return true;
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
  sendJSON(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
  return false;
}

function validHistory(history) {
  return Array.isArray(history) && history.length <= 20 && history.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 12000);
}

async function sendFile(res, path, mimeType) {
  try {
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': mimeType || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendJSON(res, 404, { error: 'File tidak ditemukan' });
  }
}

const MIMES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

export async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if (req.method === 'OPTIONS') { res.writeHead(405); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  try {
    if (path === '/api/health' && req.method === 'GET') {
      return sendJSON(res, 200, { ok: true, creator: 'zaenishi', persona_strict: PERSONA_STRICT, uptime: process.uptime() });
    }

    if (path === '/api/chat' && req.method === 'POST') {
      if (!rateLimit(req, res, { limit: 18 })) return;
      const { message, history = [] } = JSON.parse((await readBody(req, MAX_BODY)).toString());
      if (typeof message !== 'string' || !message.trim() || message.length > 12000) return sendJSON(res, 400, { error: 'Pesan wajib diisi (maksimal 12.000 karakter).' });
      if (!validHistory(history)) return sendJSON(res, 400, { error: 'Format riwayat percakapan tidak valid.' });
      const { reply, provider, sanitized } = await chatWithChain(message, [], history);
      return sendJSON(res, 200, { reply, provider, sanitized: !!sanitized });
    }

    if (path === '/api/vision' && req.method === 'POST') {
      if (!rateLimit(req, res, { limit: 8 })) return;
      const { message = 'Jelaskan gambar ini.', history = [], images = [] } = JSON.parse((await readBody(req, MAX_BODY)).toString());
      if (typeof message !== 'string' || message.length > 12000 || !validHistory(history)) return sendJSON(res, 400, { error: 'Pesan atau riwayat percakapan tidak valid.' });
      if (!Array.isArray(images) || !images.length) return sendJSON(res, 400, { error: 'Tidak ada gambar' });
      if (images.length > 5) return sendJSON(res, 400, { error: 'Maks 5 gambar' });
      const parsed = images.map((img, i) => {
        if (!img.data || typeof img.data !== 'string' || img.data.length > 700 * 1024) throw new Error(`Data gambar ${i} tidak valid atau terlalu besar (maksimal sekitar 500 KB setelah kompresi)`);
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(img.mimeType || 'image/jpeg')) throw new Error(`Tipe gambar ${i} tidak didukung`);
        const buffer = Buffer.from(img.data, 'base64');
        if (buffer.length > 10 * 1024 * 1024) throw new Error(`Gambar ${i} >10MB`);
        return { buffer, mimeType: img.mimeType || 'image/jpeg', filename: img.filename || `image-${i}.jpg` };
      });
      const { reply, provider, sanitized } = await chatWithChain(message, parsed, history);
      return sendJSON(res, 200, { reply, provider, images: parsed.length, sanitized: !!sanitized });
    }

    if (path === '/api/generate' && req.method === 'POST') {
      if (!rateLimit(req, res, { limit: 3, windowMs: 5 * 60_000 })) return;
      const { prompt } = JSON.parse((await readBody(req, 256 * 1024)).toString());
      if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) return sendJSON(res, 400, { error: 'Prompt wajib diisi (maksimal 2.000 karakter).' });
      const file = await generateImage(prompt);
      // Serverless filesystems are ephemeral. Return generated media directly to the browser.
      if (process.env.VERCEL) {
        const dataUrl = `data:${file.mimeType};base64,${file.buffer.toString('base64')}`;
        return sendJSON(res, 200, { url: dataUrl, seed: file.seed, size: file.buffer.length, storage: 'inline' });
      }
      await mkdir(DOWNLOAD_DIR, { recursive: true });
      const hash = createHash('sha256').update(prompt).digest('hex').slice(0, 10);
      const filename = `gen-${hash}-${file.seed || Date.now()}${extFromMime(file.mimeType)}`;
      await writeFile(join(DOWNLOAD_DIR, filename), file.buffer);
      return sendJSON(res, 200, { url: `/downloads/${filename}`, seed: file.seed, size: file.buffer.length });
    }

    if (path.startsWith('/api/download/') && req.method === 'GET') {
      if (!rateLimit(req, res, { limit: 5 })) return;
      const docId = path.split('/').pop();
      if (!docId || !/^[a-zA-Z0-9_-]{1,128}$/.test(docId)) return sendJSON(res, 400, { error: 'docId tidak valid' });
      const requestedOut = url.searchParams.get('out');
      const safeOut = requestedOut ? basename(requestedOut).replace(/[^a-zA-Z0-9._-]/g, '_') : undefined;
      const r = await carpathianDownload(docId, safeOut ? join(DOWNLOAD_DIR, safeOut) : undefined);
      return sendJSON(res, 200, { path: r.path, size: r.size, mimeType: r.mimeType, method: r.method });
    }

    if (req.method === 'GET') {
      if (path.startsWith('/downloads/')) {
        const name = path.slice('/downloads/'.length);
        if (!name || basename(name) !== name || name.includes('\\')) return sendJSON(res, 400, { error: 'Path tidak valid' });
        const root = resolve(DOWNLOAD_DIR); const local = resolve(root, name);
        if (!local.startsWith(root + '/')) return sendJSON(res, 403, { error: 'Forbidden' });
        return await sendFile(res, local, MIMES[extname(local).toLowerCase()]);
      }
      const rel = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
      const root = resolve(__dirname, 'public'); const full = resolve(root, rel);
      if (!full.startsWith(root + '/')) return sendJSON(res, 403, { error: 'Forbidden' });
      return await sendFile(res, full, MIMES[extname(full).toLowerCase()]);
    }

    sendJSON(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('[error]', e.message);
    if (!res.headersSent) {
      const badRequest = e instanceof SyntaxError || /Body >/i.test(e.message);
      sendJSON(res, badRequest ? 400 : 500, { error: badRequest ? 'Permintaan tidak valid.' : 'Layanan sedang mengalami kendala. Coba lagi nanti.' });
    }
  }
}

// Vercel imports this handler as a Serverless Function. Local development keeps
// the original standalone HTTP server behavior.
export default handler;

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`\n🍄 Si Jamur Web Server`);
    console.log(`   Creator      : zaenishi`);
    console.log(`   Persona Mode : ${PERSONA_STRICT ? 'STRICT 🔒' : 'relaxed'}`);
    console.log(`   URL          : http://localhost:${PORT}`);
    console.log(`   Health       : http://localhost:${PORT}/api/health\n`);
  });
}

if (!process.env.VERCEL) process.on('unhandledRejection', (e) => console.error('[unhandled]', e));