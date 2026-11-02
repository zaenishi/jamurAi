// POST /api/upload  { data: <base64>, mimeType }  → { token }
// Maksimal 1 gambar per permintaan. Body Vercel dibatasi 4,5 MB, jadi client memampatkan
// gambar (maks 20 MB asli) menjadi <= ~3 MB sebelum dikirim.
import { sendJson, rateLimit, clientIp, sameOrigin, seal } from './_lib/http.js';
import { carpathian } from './_lib/carpathian.js';

const MAX_BYTES = 3.2 * 1024 * 1024;

function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mimeType: 'image/jpeg', ext: '.jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png', ext: '.png' };
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return { mimeType: 'image/gif', ext: '.gif' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mimeType: 'image/webp', ext: '.webp' };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Metode tidak didukung.' }); }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
  if (!rateLimit(`upload:${clientIp(req)}`, 6, 60_000)) return sendJson(res, 429, { error: 'Terlalu banyak unggahan. Tunggu sebentar ya.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body.data !== 'string') return sendJson(res, 400, { error: 'Data gambar tidak ada.' });
  if (Array.isArray(body.data)) return sendJson(res, 400, { error: 'Hanya 1 gambar per permintaan.' });

  const buffer = Buffer.from(body.data, 'base64');
  if (buffer.length > MAX_BYTES) return sendJson(res, 413, { error: 'Gambar terlalu besar setelah dikompres.' });
  const kind = sniff(buffer); // validasi isi file, bukan percaya ekstensi/MIME dari client
  if (!kind) return sendJson(res, 415, { error: 'Format harus JPG, PNG, WebP, atau GIF.' });

  try {
    const state = await carpathian.prepareUpload({ buffer, ...kind });
    return sendJson(res, 200, { token: seal(state) });
  } catch (e) {
    console.error('upload:', e.message);
    return sendJson(res, 502, { error: 'Gambar belum bisa diunggah. Coba lagi sebentar ya.' });
  }
}
