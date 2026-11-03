// POST /api/chat → { reply, provider }      GET /api/chat → { ok, providers } (status + membangunkan server KMSR)
// Kecepatan & keandalan: penyedia dibalap (hedged) + circuit breaker (penyedia yang baru gagal diturunkan prioritasnya).
import { sendJson, rateLimit, clientIp, sameOrigin, sniffImage, raceProviders } from './_lib/http.js';
import { llm } from './_lib/llm.js';
import { kmsr, warmKmsr } from './_lib/kmsr.js';
import { carpathian } from './_lib/carpathian.js';
import { pollinations } from './_lib/pollinations.js';

const REGISTRY = { llm, kmsr, carpathian, pollinations };
const DEFAULT_ORDER = 'llm,kmsr,carpathian,pollinations';
const configured = () => (process.env.PROVIDERS || DEFAULT_ORDER).split(',').map((s) => s.trim()).filter((n) => REGISTRY[n]);
const active = () => configured().map((n) => REGISTRY[n]).filter((p) => p.available ? p.available() : true);
const HEDGE_MS = Number(process.env.HEDGE_MS) || 3500;
const MAX_MSG = 4000;
const MAX_IMG_BYTES = 3.2 * 1024 * 1024;

// ── circuit breaker sederhana (per instance) ──
const health = new Map();
const penalized = (p) => (health.get(p.name)?.until || 0) > Date.now();
const markOk = (p) => health.delete(p.name);
const markFail = (p) => { const h = health.get(p.name) || { fails: 0 }; h.fails++; if (h.fails >= 2) h.until = Date.now() + 90_000; health.set(p.name, h); };
const prioritize = (list) => [...list.filter((p) => !penalized(p)), ...list.filter(penalized)];

const cleanHistory = (h) => {
  const arr = (Array.isArray(h) ? h : []).slice(-10)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
  return arr.map((m, i) => ({ role: m.role, content: m.content.slice(0, i >= arr.length - 2 ? 3500 : 1200) }));
};

export default async function handler(req, res) {
  if (req.method === 'GET') { await warmKmsr(); const a = active(); return sendJson(res, 200, { ok: a.length > 0, providers: a.length }); }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return sendJson(res, 405, { error: 'Metode tidak didukung.' }); }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
  if (!rateLimit(`chat:${clientIp(req)}`, 20, 60_000)) return sendJson(res, 429, { error: 'Terlalu banyak permintaan. Tunggu sebentar ya.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return sendJson(res, 400, { error: 'Pesan kosong.' });
  if (message.length > MAX_MSG) return sendJson(res, 400, { error: `Pesan terlalu panjang (maks ${MAX_MSG} karakter).` });

  const history = cleanHistory(body.history);
  const opts = { voice: body.voice === true, userName: typeof body.userName === 'string' ? body.userName : '' };

  if (body.image) {
    if (typeof body.image.data !== 'string') return sendJson(res, 400, { error: 'Data gambar tidak valid.' });
    const buffer = Buffer.from(body.image.data, 'base64');
    if (buffer.length > MAX_IMG_BYTES) return sendJson(res, 413, { error: 'Gambar terlalu besar setelah dikompres.' });
    const kind = sniffImage(buffer);
    if (!kind) return sendJson(res, 415, { error: 'Format harus JPG, PNG, WebP, atau GIF.' });
    opts.image = { buffer, data: body.image.data, ...kind };
  }

  let providers = active().filter((p) => !opts.image || p.supportsImages);
  if (opts.image) { // urutan khusus gambar: penyedia yang paling mungkin berhasil dulu
    const rank = { llm: 0, pollinations: 1, carpathian: 2 };
    providers = [...providers].sort((a, b) => (rank[a.name] ?? 9) - (rank[b.name] ?? 9));
  }
  providers = prioritize(providers);
  if (!providers.length) return sendJson(res, 503, { error: 'Belum ada layanan AI yang aktif.' });

  try {
    const { text, provider } = await raceProviders(providers, async (p) => {
      try { const r = await p.chat(message, history, opts); markOk(p); return r; }
      catch (e) { markFail(p); throw e; }
    }, opts.image ? 7000 : HEDGE_MS);
    return sendJson(res, 200, { reply: text, provider });
  } catch (e) {
    console.error('Semua provider gagal:', e.message);
    const detail = (e.details || []).map((d) => `${d.provider}: ${d.code}`);
    return sendJson(res, 502, {
      error: opts.image ? 'Myra belum bisa membaca gambar ini. Coba lagi sebentar, atau gunakan gambar lain.' : 'Myra lagi kesulitan menjawab. Coba lagi sebentar ya.',
      detail,
    });
  }
}
