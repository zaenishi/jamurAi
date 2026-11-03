// Provider chat 1 — KMSR (port dari v4). Endpoint hanya ada di server.
import { ProviderError, fetchWithTimeout, sleep, randId, UA, DEBUG } from './http.js';
import { buildPersona } from './persona.js';

const ENDPOINT = 'https://chatbot-backend-kmsr.onrender.com/api/chat';
const MAX_HISTORY = 10;
const ATTEMPTS = Math.max(1, Math.min(3, Number(process.env.ATTEMPTS) || 2));
const TIMEOUT = Number(process.env.KMSR_TIMEOUT_MS) || 25000;

async function attempt(userMsg, history, persona) {
  const userId = process.env.KMSR_USER_ID || randId();
  const ctx = history.slice(-MAX_HISTORY)
    .map((m) => `${m.role === 'user' ? 'User' : 'Myra'}: ${m.content}`).join('\n');
  const prompt = [persona, ctx ? `\n--- Riwayat ---\n${ctx}` : '', `\n--- Baru ---\nUser: ${userMsg}\nMyra:`].join('\n');

  const res = await fetchWithTimeout(ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ message: prompt, userId, system: persona }),
  }, TIMEOUT);

  if (res.status === 429) {
    throw new ProviderError('Rate limited', { code: 'RATE_LIMIT', retryable: true, retryAfter: Number(res.headers.get('retry-after') || 3) * 1000 });
  }
  if (res.status >= 500) throw new ProviderError(`Server ${res.status}`, { code: 'SERVER', retryable: true, retryAfter: 1500 });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError(`HTTP ${res.status}: ${txt.slice(0, 120)}`, { code: `HTTP_${res.status}` });
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  const reply = (typeof data === 'string' && data) || data?.reply || data?.response
    || data?.message || data?.answer || data?.data?.reply || data?.data?.message
    || data?.result || data?.output;
  if (!reply) throw new ProviderError('Empty reply', { code: 'EMPTY', retryable: true });
  return String(reply);
}

// Bangunkan server Render yang tidur (cold start) tanpa menunggu lama.
export const warmKmsr = () => fetchWithTimeout(new URL(ENDPOINT).origin + '/', { method: 'GET', headers: { 'User-Agent': UA } }, 3500).catch(() => {});

export const kmsr = {
  name: 'kmsr',
  supportsImages: false,
  async chat(userMsg, history, { voice, userName } = {}) {
    const persona = buildPersona({ voice, userName });
    const errors = [];
    for (let i = 1; i <= ATTEMPTS; i++) {
      try {
        if (DEBUG) console.log(`[kmsr ${i}/${ATTEMPTS}]`);
        return { text: await attempt(userMsg, history, persona) };
      } catch (e) {
        errors.push(`#${i} ${e.message}`);
        if (!(e.retryable ?? true) || i === ATTEMPTS) break;
        await sleep(Math.min(e.retryAfter || 700, 1500));
      }
    }
    throw new Error('KMSR gagal: ' + errors.join(' | '));
  },
};
