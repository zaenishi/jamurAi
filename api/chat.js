// POST /api/chat  → { reply }      GET /api/chat → { ok: true } (dipakai indikator status)
import { sendJson, rateLimit, clientIp, sameOrigin, unseal } from './_lib/http.js';
import { kmsr } from './_lib/kmsr.js';
import { carpathian } from './_lib/carpathian.js';

const REGISTRY = { kmsr, carpathian };
const ORDER = (process.env.PROVIDERS || 'kmsr,carpathian').split(',').map((s) => s.trim()).filter((n) => REGISTRY[n]);
const MAX_MSG = 4000;

const cleanHistory = (h) => (Array.isArray(h) ? h : []).slice(-20)
  .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

export default async function handler(req, res) {
  if (req.method === 'GET') return sendJson(res, 200, { ok: ORDER.length > 0 });
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

  let state = null;
  if (body.uploadToken) {
    state = unseal(body.uploadToken);
    if (!state) return sendJson(res, 400, { error: 'Sesi gambar kedaluwarsa. Unggah ulang gambarnya.' });
    opts.state = state;
  }

  // Dengan gambar → hanya provider yang mendukung vision (sama seperti v4)
  const providers = ORDER.map((n) => REGISTRY[n]).filter((p) => !state || p.supportsImages);
  const errors = [];
  for (const p of providers) {
    try {
      const { text } = await p.chat(message, history, opts);
      return sendJson(res, 200, { reply: text });
    } catch (e) {
      errors.push(`[${p.name}] ${e.message}`);
      console.error(`chat ${p.name}:`, e.message.split('\n')[0]);
    }
  }
  console.error('Semua provider gagal:', errors.join(' || '));
  return sendJson(res, 502, { error: 'Si Jamur lagi kesulitan menjawab. Coba lagi sebentar ya.' });
}
