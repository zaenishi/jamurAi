# Si Jamur v5 — AI Web App (Vercel)

Hasil rombak Si Jamur v4 (Node.js CLI) menjadi web app: frontend statis + Vercel Serverless Functions.

## Struktur
```
public/
  index.html            Landing + chat + layar telepon
  config.js             Konfigurasi modular (USE_FIREBASE, creator, batas, suara, keamanan)
  css/style.css         Tema hutan malam
  js/app.js             UI, chat, upload, cooldown, mode call
  js/mushroom.js        Character engine (SVG, ekspresi, kedip, lip-sync)
  js/parser.js          Markdown/[ALERT]/[SUCCESS]/kode → HTML aman + filter suara
  js/voice.js           Speech-to-Text & Text-to-Speech
  js/store.js           Cache browser (LocalStorage/IndexedDB) ⇄ Firebase
  js/security.js        Anti-inspect (deterrent)
api/
  chat.js               POST /api/chat, GET /api/chat (status)
  upload.js             POST /api/upload (1 gambar)
  _lib/                 http.js, persona.js, kmsr.js, carpathian.js (tidak jadi route)
vercel.json             Header keamanan + CSP
```

## Deploy
1. `npm i -g vercel` lalu `vercel` di folder ini (atau import repo di dashboard Vercel).
2. Set Environment Variable **`SESSION_SECRET`** (string acak ≥ 32 karakter). Wajib untuk upload gambar.
3. Opsional: `PROVIDERS`, `CARPATHIAN_MODEL`, `CARPATHIAN_UPLOAD_PATH`, `KMSR_USER_ID`, `KMSR_TIMEOUT_MS`, `CARPATHIAN_TIMEOUT_MS`, `ATTEMPTS`, `DEBUG` (lihat `.env.example`).
4. Uji lokal: `vercel dev`.

## Pindah ke Firebase
Di `public/config.js`: isi `firebase`, set `USE_FIREBASE: true`. Aktifkan Authentication (Anonymous atau Google) dan Firestore.
Rules minimal Firestore:
```
match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
```
Jika Firebase gagal dimuat, app otomatis kembali ke cache browser.

## Catatan penting
- **Batas 4,5 MB body Vercel**: gambar maks 20 MB boleh dipilih, tetapi dikompres di browser ke ≤ ~3 MB sebelum dikirim.
- **Upload stateless**: `/api/upload` membuat sesi Carpathian lalu menyegelnya (AES-256-GCM, kedaluwarsa 10 menit) menjadi token; `/api/chat` membukanya. Cookie/CSRF tidak pernah sampai ke client.
- **Timeout**: `maxDuration` diset 60 dtk (batas aman Hobby). KMSR di Render bisa cold-start; di plan Pro/Fluid naikkan di `vercel.json` dan `*_TIMEOUT_MS`.
- **Rate limit** server bersifat in-memory per instance (best effort). Untuk yang ketat pakai Upstash/Vercel KV.
- **Anti-inspect hanya deterrent.** Perlindungan nyata: key/endpoint tidak ada di client, request dibatasi same-origin, CSP aktif. Pada localhost fitur ini nonaktif.
- **Dihapus dari v4**: image generation (Pollinations/AI Horde) dan auto-download dokumen (butuh disk). Bisa ditambah sebagai `api/image.js` jika diperlukan.
- **Link Instagram** di `config.js` memakai `instagram.com/zaenishi` — pastikan username benar.
- Mode call: Chrome/Edge paling stabil; iOS Safari tidak mendukung fullscreen API pada elemen (layar tetap menutup penuh).
