// Utilitas bersama untuk semua Serverless Function. Folder _lib tidak diekspos sebagai route.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
export const DEBUG = !!process.env.DEBUG;

export class ProviderError extends Error {
  constructor(message, { code = 'UNKNOWN', retryable = false, retryAfter = 0 } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
export const randHex = (n) => randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
export const randId = () => `user-${randHex(8)}${Date.now().toString(36).slice(-4)}`;

export async function fetchWithTimeout(url, options = {}, ms = 30000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new ProviderError(`Timeout ${ms}ms`, { code: 'TIMEOUT', retryable: true });
    throw new ProviderError(`Network: ${e.message}`, { code: 'NETWORK', retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

// ── Cookie jar (bisa diserialisasi supaya sesi bisa dilanjutkan antar-function) ──
export class CookieJar {
  constructor(init = {}) { this.cookies = new Map(Object.entries(init)); }
  _split(res) {
    try { const arr = res.headers.getSetCookie?.(); if (Array.isArray(arr) && arr.length) return arr; } catch {}
    const raw = res.headers.get('set-cookie');
    if (!raw) return [];
    const out = []; let cur = '';
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === ',' && /^[^=;]+=/.test(raw.slice(i + 1).trim())) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  addFromResponse(res) {
    for (const raw of this._split(res)) {
      const pair = raw.split(';')[0];
      const idx = pair.indexOf('=');
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
  toJSON() { return Object.fromEntries(this.cookies); }
}

// ── SSE parser ──
export async function parseSSE(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = ''; let full = ''; let sessionId = null;

  const extract = (payload) => {
    if (!payload || payload === '[DONE]') return '';
    try {
      const o = JSON.parse(payload);
      if (typeof o === 'string') return o;
      if (o.session_id) sessionId = o.session_id;
      if (o.data?.session_id) sessionId = o.data.session_id;
      return o.delta ?? o.content ?? o.text ?? o.token
        ?? o.message?.content ?? o.choices?.[0]?.delta?.content
        ?? o.data?.delta ?? o.data?.content ?? '';
    } catch { return payload; }
  };
  const handleBlock = (block) => {
    for (const line of block.split('\n')) {
      const t = line.trim();
      if (t.startsWith('data:')) full += extract(t.slice(5).trim());
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const ev of parts) handleBlock(ev);
    }
    if (buffer.trim()) handleBlock(buffer);
  } catch (e) {
    throw new ProviderError(`SSE error: ${e.message}`, { code: 'SSE_ERROR', retryable: true });
  }
  return { text: full, sessionId };
}

// ── Enkripsi token sesi (AES-256-GCM): cookie/CSRF Carpathian tidak pernah terlihat client ──
const aesKey = () => {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 16) throw new Error('SESSION_SECRET belum diset (min. 16 karakter)');
  return createHash('sha256').update(s).digest();
};
export function seal(obj, ttlMs = 10 * 60 * 1000) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', aesKey(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify({ ...obj, exp: Date.now() + ttlMs }), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
export function unseal(token) {
  try {
    const buf = Buffer.from(String(token), 'base64url');
    const d = createDecipheriv('aes-256-gcm', aesKey(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    const obj = JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
    return obj.exp > Date.now() ? obj : null;
  } catch { return null; }
}

// ── Rate limit in-memory (best effort per instance; untuk yang ketat pakai Upstash/Vercel KV) ──
const buckets = new Map();
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  return b.count <= limit;
}
export const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

// Hanya terima request dari origin yang sama (menghalangi situs lain memakai proxy-mu)
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}
