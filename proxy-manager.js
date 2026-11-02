// proxy-manager.js — lazy, non-blocking
import { fetch as uFetch, ProxyAgent } from 'undici';

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';

const SOURCES = [
  'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/protocols/http/data.json',
  'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.json',
];

class ProxyManager {
  constructor() {
    this.pool = [];
    this.index = 0;
    this.loading = null;
    // warm-up di background — TIDAK memblokir apa pun
    setTimeout(() => this._ensure().catch(() => {}), 3000);
  }

  _ensure() {
    if (this.pool.length) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = this._load().finally(() => { this.loading = null; });
    return this.loading;
  }

  async _load() {
    const candidates = [];
    for (const src of SOURCES) {
      try {
        const r = await fetch(src, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!r.ok) continue;
        const d = await r.json();
        const list = Array.isArray(d) ? d : (d.proxies || []);
        for (const p of list.slice(0, 30)) {
          if (p.ip && p.port) candidates.push({ host: p.ip, port: p.port });
        }
      } catch { /* skip source */ }
    }

    // Validasi paralel 15 sekaligus
    const alive = [];
    const batch = 15;
    for (let i = 0; i < candidates.length && alive.length < 15; i += batch) {
      const chunk = candidates.slice(i, i + batch);
      const results = await Promise.allSettled(chunk.map(async (c) => {
        const url = `http://${c.host}:${c.port}`;
        try {
          const res = await uFetch('https://api.ipify.org?format=json', {
            dispatcher: new ProxyAgent(url),
            signal: AbortSignal.timeout(4000),
            headers: { 'User-Agent': UA },
          });
          if (!res.ok) return null;
          const j = await res.json();
          return { ...c, url, exitIp: j.ip };
        } catch { return null; }
      }));
      for (const r of results) if (r.status === 'fulfilled' && r.value) alive.push(r.value);
    }

    if (alive.length) {
      this.pool = alive;
      console.log(`[proxy] ${alive.length} proxy siap`);
    }
  }

  async get() {
    await this._ensure();
    if (!this.pool.length) return null;
    return this.pool[this.index++ % this.pool.length];
  }

  dispatcher(p) { return p ? new ProxyAgent(p.url) : undefined; }
  stats() { return { pool: this.pool.length, index: this.index }; }
}

export const proxyManager = new ProxyManager();