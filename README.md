# Si Jamur v6 — AI Web App (Vercel)

Hasil rombak Si Jamur v4 (Node.js CLI) menjadi web app: frontend statis + Vercel Serverless Functions.

## Yang baru di v6
- **Suara tidak terpotong & lebih natural**: teks dipecah per kalimat, ada jeda napas, variasi nada tipis, suara Indonesia terbaik dipilih otomatis (bisa diganti di Pengaturan), watchdog jika satu potongan macet.
- **Tema cerah**, responsif (ponsel sampai desktop), animasi penuh (menghormati `prefers-reduced-motion`).
- **Navbar** + halaman terpisah: Beranda, Fitur, Pembuat, Dokumentasi, Chat (`#/fitur`, `#/pembuat`, ...).
- **Bersihkan chat** (tombol tempat sampah + dialog konfirmasi).
- **Lebih cepat**: penyedia AI dibalap (hedged). Jika KMSR belum menjawab dalam `HEDGE_MS` atau gagal, Carpathian (lalu Pollinations) jalan paralel; yang tercepat dipakai. Sesi Carpathian di-cache, server KMSR dibangunkan lewat ping status.
- **Analisis gambar**: gambar dikirim di request chat yang sama (tanpa `/api/upload` & `SESSION_SECRET`). Penyedia vision: Pollinations dan Carpathian.
- **Buat gambar**: `api/image.js` (Pollinations Flux → Turbo → AI Horde). Di chat: tombol bintang, atau ketik "buatkan gambar ...".

## Struktur
```
public/  index.html, config.js, css/style.css
         js/app.js (router, navbar, efek) · chat.js · call.js · voice.js · mushroom.js · parser.js · store.js · state.js · security.js
api/     chat.js (POST/GET)  image.js (POST)  _lib/{http,persona,kmsr,carpathian,pollinations}.js
```

## Deploy
1. `vercel` di folder ini (atau import repo di dashboard Vercel). Tidak ada env wajib.
2. Opsional: lihat `.env.example`. Uji lokal: `vercel dev`.

## Catatan
- Fitur gambar bergantung pada layanan gratis pihak ketiga (Pollinations, AI Horde, Carpathian) yang bisa berubah/limit sewaktu-waktu. Lihat log Vercel (`DEBUG=1`) bila gagal.
- Batas body Vercel 4,5 MB: gambar dikompres di browser ke ≤ ~2,2 MB sebelum dikirim.
- Rate limit server in-memory per instance (best effort).
- Mode telepon: Chrome/Edge paling stabil; iOS Safari tidak mendukung fullscreen elemen.
- Anti-inspect hanya deterrent; nonaktif di localhost.
- Link Instagram di `config.js`: pastikan username benar.
