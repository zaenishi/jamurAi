// POST /api/chat → { reply }      GET /api/chat → { ok: true } (indikator status + membangunkan server KMSR)
// Kecepatan: provider dibalap (hedged). Kalau provider utama belum menjawab dalam HEDGE_MS atau gagal,
// provider berikutnya langsung dijalankan paralel; jawaban tercepat dipakai.
import { sendJson, rateLimit, clientIp, sameOrigin, sniffImage, raceProviders } from './_lib/http.js';
import { kmsr, warmKmsr } from './_lib/kmsr.js';
import { carpathian } from './_lib/carpathian.js';
import { pollinations } from './_lib/pollinations.js';


const REGISTRY = { kmsr, carpathian, pollinations };
const ORDER = (process.env.PROVIDERS || 'kmsr,carpathian,pollinations').split(',').map((s) => s.trim()).filter((n) => REGISTRY[n]);
const HEDGE_MS = Number(process.env.HEDGE_MS) || 6000;
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

  // Gambar dikirim langsung di request yang sama (tanpa token/sesi terpisah)
  if (body.image) {
    if (typeof body.image.data !== 'string') return sendJson(res, 400, { error: 'Data gambar tidak valid.' });
    const buffer = Buffer.from(body.image.data, 'base64');
    if (buffer.length > MAX_IMG_BYTES) return sendJson(res, 413, { error: 'Gambar terlalu besar setelah dikompres.' });
    const kind = sniffImage(buffer);
    if (!kind) return sendJson(res, 415, { error: 'Format harus JPG, PNG, WebP, atau GIF.' });
    opts.image = { buffer, data: body.image.data, ...kind };
  }

  // Dengan gambar → hanya provider yang mendukung vision
  const providers = ORDER.map((n) => REGISTRY[n]).filter((p) => !opts.image || p.supportsImages);
  if (!providers.length) return sendJson(res, 503, { error: 'Belum ada layanan yang bisa membaca gambar.' });

  try {
    // Untuk gambar, Pollinations (satu panggilan, tanpa upload) didahulukan lalu Carpathian sebagai pendamping.
    const ordered = opts.image ? [...providers].sort((a, b) => (a.name === 'pollinations' ? -1 : b.name === 'pollinations' ? 1 : 0)) : providers;
    const { text, provider } = await raceProviders(ordered, (p) => p.chat(message, history, opts), opts.image ? 9000 : HEDGE_MS);
    return sendJson(res, 200, { reply: text, provider });
  } catch (e) {
    console.error('Semua provider gagal:', e.message);
    return sendJson(res, 502, { error: opts.image ? 'Si Jamur belum bisa membaca gambar ini. Coba gambar lain atau ulangi sebentar lagi.' : 'Si Jamur lagi kesulitan menjawab. Coba lagi sebentar ya.' });
  }
}
