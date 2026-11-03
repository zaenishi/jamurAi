// POST /api/image { prompt, ratio: 'square'|'wide'|'tall' } → { image: 'data:image/...;base64,...', provider }
// Penyedia dibalap: Pollinations (gen.pollinations.ai, kunci opsional) → Pollinations endpoint lama → AI Horde.
import { sendJson, rateLimit, clientIp, sameOrigin, fetchWithTimeout, raceProviders, sleep, ProviderError } from './_lib/http.js';

const SIZES = { square: [1024, 1024], wide: [1280, 720], tall: [720, 1280] };
const seed = () => Math.floor(Math.random() * 1e9);

async function fetchImage(url, ms, withAuth) {
  const headers = { Accept: 'image/*' };
  if (withAuth && process.env.POLLINATIONS_API_KEY) headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  const res = await fetchWithTimeout(url, { headers }, ms);
  const ct = (res.headers.get('content-type') || '').split(';')[0];
  if (!res.ok || !ct.startsWith('image/')) {
    const txt = ct.startsWith('image/') ? '' : await res.text().catch(() => '');
    throw new ProviderError(`HTTP ${res.status} ${ct} ${txt.replace(/\s+/g, ' ').slice(0, 100)}`.trim(), { code: `HTTP_${res.status}` });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new ProviderError('Gambar kosong', { code: 'EMPTY' });
  return `data:${ct};base64,${buf.toString('base64')}`;
}

const pollinationsGen = (prompt, [w, h]) =>
  fetchImage(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${process.env.POLLINATIONS_IMAGE_MODEL || 'flux'}&width=${w}&height=${h}&seed=${seed()}&nologo=true&safe=true`, 45000, true);
const pollinationsLegacy = (prompt, [w, h]) =>
  fetchImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed()}&model=flux&nologo=true&private=true&safe=true`, 35000, false);

async function hordeImage(prompt, [w, h], budgetMs) {
  const H = { apikey: '0000000000', 'Content-Type': 'application/json', 'Client-Agent': 'myra-ai:6:web' };
  const fit = (n) => Math.max(256, Math.min(768, Math.round(((n / Math.max(w, h)) * 640) / 64) * 64));
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

export const IMAGE_PROVIDERS = [
  { name: 'pollinations', run: pollinationsGen },
  { name: 'pollinations-legacy', run: pollinationsLegacy },
  { name: 'aihorde', run: (p, s) => hordeImage(p, s, 38000) },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Metode tidak didukung.' }); }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
  if (!rateLimit(`image:${clientIp(req)}`, 6, 60_000)) return sendJson(res, 429, { error: 'Terlalu banyak permintaan gambar. Tunggu sebentar ya.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const prompt = typeof body?.prompt === 'string' ? body.prompt.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  if (prompt.length < 3) return sendJson(res, 400, { error: 'Jelaskan dulu gambar yang ingin dibuat.' });
  const size = SIZES[body?.ratio] || SIZES.square;

  try {
    const { image, provider } = await raceProviders(IMAGE_PROVIDERS, async (p) => ({ text: '', image: await p.run(prompt, size) }), 9000);
    return sendJson(res, 200, { image, provider });
  } catch (e) {
    console.error('image gagal:', e.message);
    return sendJson(res, 502, { error: 'Gambar belum bisa dibuat sekarang. Coba lagi sebentar atau ubah deskripsinya.', detail: (e.details || []).map((d) => `${d.provider}: ${d.code}`) });
  }
}
