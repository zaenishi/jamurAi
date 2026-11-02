// POST /api/chat → { reply }      GET /api/chat → { ok: true } (indikator status + membangunkan server KMSR)
import { sendJson, rateLimit, clientIp, sameOrigin, sniffImage, raceProviders } from './_lib/http.js';
import { kmsr, warmKmsr } from './_lib/kmsr.js';
import { carpathian } from './_lib/carpathian.js';
import { pollinations } from './_lib/pollinations.js';

const REGISTRY = { kmsr, carpathian, pollinations };
const ORDER = (process.env.PROVIDERS || 'kmsr,carpathian,pollinations')
  .split(',').map((s) => s.trim()).filter((n) => REGISTRY[n]);

// ⬇ DIPERCEPAT: 6s→3.5s (text), 9s→2.5s (gambar) supaya fallback cepat mulai
const HEDGE_TEXT  = Number(process.env.HEDGE_MS)        || 3500;
const HEDGE_IMAGE = Number(process.env.HEDGE_IMG_MS)    || 2500;

const MAX_MSG = 4000;
const MAX_IMG_BYTES = 3.2 * 1024 * 1024;

const cleanHistory = (h) => (Array.isArray(h) ? h : []).slice(-20)
  .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

export default async function handler(req, res) {
  if (req.method === 'GET') { await warmKmsr(); return sendJson(res, 200, { ok: ORDER.length > 0 }); }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return sendJson(res, 405, { error: 'Metode tidak didukung.' }); }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
  if (!rateLimit(`chat:${clientIp(req)}`, 15, 60_000)) return sendJson(res, 429, { error: 'Terlalu banyak permintaan. Tunggu sebentar ya.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return sendJson(res, 400, { error: 'Pesan kosong.' });
  if (message.length > MAX_MSG) return sendJson(res, 400, { error: `Pesan terlalu panjang (maks ${MAX_MSG} karakter).` });

  const history = cleanHistory(body.history);
  const opts = { voice: body.voice === true, userName: typeof body.userName === 'string' ? body.userName : '' };

  // Gambar dikirim langsung di request yang sama
  if (body.image) {
    if (typeof body.image.data !== 'string') return sendJson(res, 400, { error: 'Data gambar tidak valid.' });
    const buffer = Buffer.from(body.image.data, 'base64');
    if (buffer.length > MAX_IMG_BYTES) return sendJson(res, 413, { error: 'Gambar terlalu besar setelah dikompres.' });
    const kind = sniffImage(buffer);
    if (!kind) return sendJson(res, 415, { error: 'Format harus JPG, PNG, WebP, atau GIF.' });
    opts.image = { buffer, data: body.image.data, ...kind };
  }

  // Hanya provider yang mendukung vision saat ada gambar
  const providers = ORDER.map((n) => REGISTRY[n]).filter((p) => !opts.image || p.supportsImages);
  if (!providers.length) return sendJson(res, 503, { error: 'Belum ada layanan yang bisa membaca gambar.' });

  // ⬇ REVISI: untuk gambar, carpathian (vision asli) didahulukan.
  //   pollinations hanya fallback (endpoint-nya sering tidak support vision).
  const ordered = opts.image
    ? [...providers].sort((a, b) =>
        (a.name === 'carpathian' ? -1 : b.name === 'carpathian' ? 1 : 0))
    : providers;

  try {
    const { text, provider } = await raceProviders(
      ordered,
      (p) => p.chat(message, history, opts),
      opts.image ? HEDGE_IMAGE : HEDGE_TEXT,
    );
    return sendJson(res, 200, { reply: text, provider });
  } catch (e) {
    const debug = process.env.DEBUG === '1';
    console.error('Semua provider gagal:', e.message);
    return sendJson(res, 502, {
      error: opts.image
        ? 'Myra belum bisa membaca gambar ini. Coba gambar lain atau ulangi sebentar lagi.'
        : 'Myra lagi kesulitan menjawab. Coba lagi sebentar ya.',
      ...(debug ? { detail: String(e.message).slice(0, 500) } : {}),
    });
  }
}