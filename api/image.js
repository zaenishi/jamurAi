// POST /api/image { prompt, ratio: 'square'|'wide'|'tall' } → { image: 'data:image/...;base64,...' }
// Beberapa penyedia gambar gratis dibalap: Pollinations (Flux) → Pollinations (Turbo) → AI Horde.
import { sendJson, rateLimit, clientIp, sameOrigin, fetchWithTimeout, raceProviders, sleep, ProviderError } from './_lib/http.js';


const SIZES = { square: [1024, 1024], wide: [1280, 720], tall: [720, 1280] };
const seed = () => Math.floor(Math.random() * 1e9);

async function pollinationsImage(prompt, [w, h], model, ms) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed()}&model=${model}&nologo=true&private=true&safe=true`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'image/*' } }, ms);
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.startsWith('image/')) throw new ProviderError(`HTTP ${res.status} ${ct}`, { code: 'BAD_IMAGE' });
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new ProviderError('Gambar kosong', { code: 'EMPTY' });
  return `data:${ct.split(';')[0]};base64,${buf.toString('base64')}`;
}

async function hordeImage(prompt, [w, h], budgetMs) {
  const H = { apikey: '0000000000', 'Content-Type': 'application/json', 'Client-Agent': 'si-jamur:5:web' };
  const fit = (n) => Math.max(256, Math.min(768, Math.round((n / Math.max(w, h)) * 640 / 64) * 64));
  const res = await fetchWithTimeout('https://aihorde.net/api/v2/generate/async', {
    method: 'POST', headers: H,
    body: JSON.stringify({ prompt, params: { width: fit(w), height: fit(h), steps: 22, n: 1, sampler_name: 'k_euler_a' }, nsfw: false, censor_nsfw: true, r2: false, slow_workers: true }),
  }, 15000);
  const job = await res.json().catch(() => ({}));
  if (!res.ok || !job.id) throw new ProviderError(`Horde ${res.status}: ${job.message || 'tanpa id'}`, { code: 'HORDE' });
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    await sleep(2500);
    const r = await fetchWithTimeout(`https://aihorde.net/api/v2/generate/status/${job.id}`, { headers: H }, 10000);
    const j = await r.json().catch(() => ({}));
    const img = j?.generations?.[0]?.img;
    if (j.done && img) return img.startsWith('data:') ? img : `data:image/webp;base64,${img}`;
    if (j.faulted) throw new ProviderError('Horde gagal membuat gambar', { code: 'HORDE_FAULT' });
  }
  throw new ProviderError('Horde terlalu lama', { code: 'TIMEOUT' });
}

const PROVIDERS = [
  { name: 'pollinations-flux', run: (p, s) => pollinationsImage(p, s, 'flux', 30000) },
  { name: 'pollinations-turbo', run: (p, s) => pollinationsImage(p, s, 'turbo', 25000) },
  { name: 'aihorde', run: (p, s) => hordeImage(p, s, 38000) },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Metode tidak didukung.' }); }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
  if (!rateLimit(`image:${clientIp(req)}`, 5, 60_000)) return sendJson(res, 429, { error: 'Terlalu banyak permintaan gambar. Tunggu sebentar ya.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const prompt = typeof body?.prompt === 'string' ? body.prompt.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  if (prompt.length < 3) return sendJson(res, 400, { error: 'Jelaskan dulu gambar yang ingin dibuat.' });
  const size = SIZES[body?.ratio] || SIZES.square;

  try {
    const { image, provider } = await raceProviders(PROVIDERS, async (p) => ({ text: '', image: await p.run(prompt, size) }), 14000);
    return sendJson(res, 200, { image, provider });
  } catch (e) {
    console.error('image gagal:', e.message);
    return sendJson(res, 502, { error: 'Gambar belum bisa dibuat sekarang. Coba lagi sebentar atau ubah deskripsinya.' });
  }
}
