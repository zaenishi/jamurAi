// Provider chat 3 — Pollinations (teks; vision parsial, jadikan cadangan terakhir).
import { ProviderError, fetchWithTimeout } from './http.js';
import { buildPersona } from './persona.js';

const ENDPOINT = 'https://text.pollinations.ai/openai';
const TIMEOUT = Number(process.env.POLLINATIONS_TIMEOUT_MS) || 25000;

export const pollinations = {
  name: 'pollinations',
  supportsImages: true, // tapi tidak diandalkan; carpathian didahulukan oleh api/chat.js
  async chat(userMsg, history, { voice, userName, image } = {}) {
    const persona = buildPersona({ voice, userName });
    const user = image
      ? { role: 'user', content: [
          { type: 'text', text: `${userMsg}\n\n(Jelaskan apa yang benar-benar terlihat pada gambar. Abaikan nama file.)` },
          { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
        ] }
      : { role: 'user', content: userMsg };

    const messages = [
      { role: 'system', content: persona },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      user,
    ];

    const res = await fetchWithTimeout(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, private: true, referrer: 'sijamur' }),
    }, TIMEOUT);

    if (res.status === 429) throw new ProviderError('Rate limited', { code: 'RATE_LIMIT', retryable: true });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new ProviderError(`HTTP ${res.status}: ${txt.slice(0, 120)}`, { code: `HTTP_${res.status}`, retryable: res.status >= 500 });
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    const text = typeof data === 'string' ? data : data?.choices?.[0]?.message?.content;

    // ⬇ REVISI: deteksi jika model mengembalikan pesan "tidak bisa melihat gambar"
    //   supaya tidak dianggap sukses palsu.
    if (!text || !String(text).trim()) {
      throw new ProviderError('Empty reply', { code: 'EMPTY', retryable: true });
    }
    if (image && /(tidak bisa|can'?t|cannot|unable to).{0,40}(melihat|see|view|process).{0,40}(gambar|image)/i.test(text)) {
      throw new ProviderError('Pollinations tidak bisa melihat gambar', { code: 'NO_VISION' });
    }
    return { text: String(text) };
  },
};