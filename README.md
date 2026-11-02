# Si Jamur — Web AI Workspace

Upgrade frontend untuk aplikasi Si Jamur, dengan server Node.js yang tetap menggunakan provider dan persona dari proyek awal.

## Fitur

- Responsive dark glass UI untuk ponsel, tablet, desktop, dan layar lebar.
- Chat AI, analisis gambar (PNG/JPEG/WEBP), dan mode generate gambar.
- Markdown/GFM renderer dengan sanitasi HTML, code block + syntax highlighting + tombol salin.
- Callout `[ALERT]` / `⚠️`, `[SUCCESS]` / `✅`, dan `[INFO]` / `💡`.
- Typing effect, status online/thinking/listening, dan loading indicator.
- Speech-to-text dan Mode Telepon berbasis Web Speech API browser.
- Text-to-speech membersihkan Markdown, label status, URL, dan blok kode sebelum dibacakan.
- Security headers, validasi input, rate limit proses, pembatasan file, dan pemeriksaan path.

## Menjalankan lokal

Persyaratan: Node.js 18 atau lebih baru.

```bash
npm start
```

Buka `http://localhost:3000`.

Tidak ada API key yang perlu ditaruh di HTML atau JavaScript browser. Jika provider tertentu membutuhkan key, simpan sebagai environment variable server di dashboard deployment, bukan di file `public/` atau bundle frontend.

## Environment

| Variable | Kegunaan | Default |
|---|---|---|
| `PORT` | Port HTTP | `3000` |
| `DOWNLOAD_DIR` | Folder hasil gambar/unduhan | `./downloads` |
| `DEBUG` | Debug flag yang sudah tersedia di server | off |
| `ATTEMPTS` | Jumlah percobaan provider | `3` |
| `PERSONA_STRICT` | Persona guard | `true` |
| `AIHORDE_API_KEY` | Key server untuk fallback provider gambar | public/anonymous fallback |

## Endpoint

- `GET /api/health` — status layanan.
- `POST /api/chat` — `{ "message": "...", "history": [] }`.
- `POST /api/vision` — `{ "message": "...", "history": [], "images": [{ "data": "base64", "mimeType": "image/jpeg", "filename": "image.jpg" }] }`.
- `POST /api/generate` — `{ "prompt": "..." }`.

## Keamanan dan batasan deployment

1. API provider dipanggil oleh `server.js`; frontend hanya memanggil endpoint `/api/*`. Jangan pernah menaruh secret di `public/`, HTML, localStorage, atau variabel `VITE_*`/`NEXT_PUBLIC_*`.
2. Server menambahkan `nosniff`, `DENY` frame, referrer policy, permissions policy, CORP, dan CSP yang mengizinkan CDN UI yang digunakan.
3. CORS wildcard dihapus. Aplikasi dirancang same-origin; jangan membuka API ke origin lain tanpa allowlist dan autentikasi.
4. Rate limiter bawaan berada di memori proses. Untuk deployment multi-instance/serverless, ganti dengan Redis/KV rate limiter dan tambahkan autentikasi/session, kuota per akun, serta proteksi bot.
5. CSP masih mengizinkan inline script/style karena frontend awal disatukan dalam satu HTML. Untuk CSP lebih ketat, pindahkan CSS/JS ke file terpisah dan gunakan nonce/hash.
6. Speech recognition dan speech synthesis bergantung pada dukungan browser, izin mikrofon, serta voice yang terpasang. Beberapa browser hanya mengaktifkan SpeechRecognition pada HTTPS/localhost.
7. Disable klik kanan, memblokir DevTools, debugger loop, dan console cleanser sengaja tidak diterapkan. Itu bukan kontrol keamanan yang dapat diandalkan dan dapat merusak aksesibilitas/debugging. Kode frontend yang dikirim ke browser selalu dapat diperiksa.
8. Jangan anggap API key provider tersembunyi dari pengguna jika provider pihak ketiga mengembalikan URL/token sensitif. Semua operasi sensitif harus divalidasi di server.

## Catatan arsitektur

```text
Browser (UI + Markdown renderer + Voice APIs)
              │ same-origin /api/*
              ▼
Node HTTP server (validation, limits, security headers)
              │
              ├── Provider chat chain
              ├── Provider vision
              └── Image generation → downloads/
```

Markdown diparse ke DOM, lalu disanitasi dengan DOMPurify sebelum ditampilkan. Syntax highlighting hanya diterapkan pada elemen `pre > code`. Tombol copy menyalin `textContent`, bukan HTML. Konten suara dibuat terpisah melalui `cleanForSpeech()` sehingga simbol Markdown, status, tautan, dan blok kode tidak dibacakan mentah.
