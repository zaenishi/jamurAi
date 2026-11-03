// Provider chat 0 — LLM kompatibel OpenAI (Gemini, Groq, OpenRouter, dll.). Aktif jika LLM_API_KEY diisi.
// Default: Google Gemini (tier gratis di aistudio.google.com/apikey). Cepat, stabil, dan mendukung gambar.
import { ProviderError, fetchWithTimeout } from './http.js';
import { buildPersona } from './persona.js';

const BASE = () => (process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
const MODEL = () => process.env.LLM_MODEL || 'gemini-2.5-flash-lite';
const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS) || 28000;

export const llm = {
  name: 'llm',
  supportsImages: true,
  available: () => !!process.env.LLM_API_KEY,
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
      max_tokens: voice ? 260 : 2200,
      temperature: 0.7,
    };
    if (process.env.LLM_REASONING) body.reasoning_effort = process.env.LLM_REASONING;

    const res = await fetchWithTimeout(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify(body),
    }, TIMEOUT);
    if (res.status === 429) throw new ProviderError('Rate limited (kuota gratis habis sementara)', { code: 'RATE_LIMIT', retryable: true });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new ProviderError(`HTTP ${res.status}: ${txt.replace(/\s+/g, ' ').slice(0, 140)}`, { code: `HTTP_${res.status}`, retryable: res.status >= 500 });
    }
    const j = await res.json().catch(() => null);
    let text = j?.choices?.[0]?.message?.content;
    if (Array.isArray(text)) text = text.map((p) => p?.text || '').join('');
    if (!text || !String(text).trim()) throw new ProviderError('Empty reply', { code: 'EMPTY', retryable: true });
    return { text: String(text) };
  },
};
