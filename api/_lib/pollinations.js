// Provider chat 3 — Pollinations (teks + vision). Endpoint baru gen.pollinations.ai (kunci opsional: POLLINATIONS_API_KEY),
// dengan fallback ke endpoint lama bila yang baru menolak.
import { ProviderError, fetchWithTimeout } from './http.js';
import { buildPersona } from './persona.js';

const TIMEOUT = Number(process.env.POLLINATIONS_TIMEOUT_MS) || 30000;
const MODEL = () => process.env.POLLINATIONS_MODEL || 'openai';
const ENDPOINTS = () => [
  'https://gen.pollinations.ai/v1/chat/completions',
  'https://text.pollinations.ai/openai',
];

async function call(url, body) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.POLLINATIONS_API_KEY) headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) }, TIMEOUT);
  if (res.status === 429) throw new ProviderError('Rate limited', { code: 'RATE_LIMIT', retryable: true });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError(`HTTP ${res.status}: ${txt.replace(/\s+/g, ' ').slice(0, 120)}`, { code: `HTTP_${res.status}`, retryable: res.status >= 500 });
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  const text = typeof data === 'string' ? data : data?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) throw new ProviderError('Empty reply', { code: 'EMPTY', retryable: true });
  return String(text);
}

export const pollinations = {
  name: 'pollinations',
  supportsImages: true,
  async chat(userMsg, history, { voice, userName, image } = {}) {
    const user = image
      ? { role: 'user', content: [
          { type: 'text', text: `${userMsg}\n\n(Jelaskan apa yang benar-benar terlihat pada gambar. Abaikan nama file.)` },
          { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
        ] }
      : { role: 'user', content: userMsg };
    const body = {
      model: MODEL(),
      messages: [{ role: 'system', content: buildPersona({ voice, userName }) }, ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })), user],
      private: true,
    };
    const errs = [];
    for (const url of ENDPOINTS()) {
      try { return { text: await call(url, body) }; }
      catch (e) { errs.push(`${new URL(url).host}: ${e.message}`); if (e.code === 'RATE_LIMIT') break; }
    }
    throw new ProviderError(errs.join(' | '), { code: 'ALL_ENDPOINTS_FAILED', retryable: true });
  },
};
