// GET /api/health → diagnosa tiap penyedia AI (teks, gambar, buat-gambar) dengan waktu respons dan alasan gagal.
// Buka di browser setelah deploy:  /api/health   (tambah ?image=1 untuk uji pembuat gambar, ?key=... jika HEALTH_KEY diset)
import { deflateSync } from 'node:zlib';
import { sendJson, rateLimit, clientIp, sniffImage } from './_lib/http.js';
import { llm } from './_lib/llm.js';
import { kmsr } from './_lib/kmsr.js';
import { carpathian } from './_lib/carpathian.js';
import { pollinations } from './_lib/pollinations.js';
import { IMAGE_PROVIDERS } from './image.js';

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function testPng() { // PNG 64x64 merah polos
  const w = 64, h = 64, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 220; raw[o + 1] = 40; raw[o + 2] = 40; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const time = async (fn, ms = 25000) => {
  const t0 = Date.now();
  try { const r = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error(`>${ms}ms (terlalu lambat)`)), ms))]); return { ok: true, ms: Date.now() - t0, sample: String(r?.text ?? r ?? '').slice(0, 60) }; }
  catch (e) { return { ok: false, ms: Date.now() - t0, error: `${e.code ? `[${e.code}] ` : ''}${e.message}`.slice(0, 220) }; }
};

export default async function handler(req, res) {
  if (!rateLimit(`health:${clientIp(req)}`, 4, 60_000)) return sendJson(res, 429, { error: 'Coba lagi sebentar.' });
  const url = new URL(req.url, 'http://x');
  if (process.env.HEALTH_KEY && url.searchParams.get('key') !== process.env.HEALTH_KEY) return sendJson(res, 401, { error: 'Butuh ?key=' });

  const png = testPng(); const img = { buffer: png, data: png.toString('base64'), ...sniffImage(png) };
  const text = { llm, kmsr, carpathian, pollinations };
  const out = {
    config: {
      LLM_API_KEY: !!process.env.LLM_API_KEY, LLM_MODEL: process.env.LLM_MODEL || '(default gemini-2.5-flash-lite)',
      POLLINATIONS_API_KEY: !!process.env.POLLINATIONS_API_KEY, PROVIDERS: process.env.PROVIDERS || '(default)',
      node: process.version,
    },
    text: {}, vision: {}, image: undefined,
  };
  const jobs = [];
  for (const [name, p] of Object.entries(text)) {
    if (p.available && !p.available()) { out.text[name] = { ok: false, error: 'tidak aktif (env belum diisi)' }; out.vision[name] = out.text[name]; continue; }
    jobs.push(time(() => p.chat('Balas dengan satu kata saja: halo', [], {})).then((r) => { out.text[name] = r; }));
    if (p.supportsImages) jobs.push(time(() => p.chat('Warna apa yang dominan di gambar ini? Jawab satu kata.', [], { image: img }), 35000).then((r) => { out.vision[name] = r; }));
  }
  if (url.searchParams.get('image') === '1') {
    out.image = {};
    for (const p of IMAGE_PROVIDERS.slice(0, 2)) jobs.push(time(() => p.run('a red circle on white background', [512, 512]), 45000).then((r) => { out.image[p.name] = { ok: r.ok, ms: r.ms, error: r.error }; }));
  }
  await Promise.all(jobs);
  out.verdict = {
    chat: Object.entries(out.text).filter(([, v]) => v.ok).map(([k]) => k),
    vision: Object.entries(out.vision).filter(([, v]) => v.ok).map(([k]) => k),
  };
  return sendJson(res, 200, out);
}
