# Myra AI v7

Asisten AI berbahasa Indonesia ciptaan zaenishi. Frontend statis + Vercel Functions. Gratis, tanpa daftar.

## Yang baru di v7
- **Respons AI rapi**: tabel Markdown sungguhan (zebra, header, geser horizontal di ponsel), daftar bertingkat, checklist, kutipan, kode, callout. Tabel yang bentuknya berantakan ikut dirapikan. Tanpa kedipan saat mengetik.
- **Lampiran gambar diperbaiki**: foto dikompres otomatis (≤1536px, ≤~1,4 MB), error kini jelas ("Detail teknis") + tombol **Coba lagi**, gangguan singkat diulang otomatis.
- **Lebih cepat & tahan gagal**: penyedia `llm` (Gemini dll.) ditambah; penyedia dibalap (hedge 3,5 dtk), circuit breaker menurunkan prioritas penyedia yang baru gagal, persona & riwayat dipangkas.
- **SEO & pratinjau WhatsApp**: halaman nyata `/`, `/fitur`, `/pembuat`, `/dokumentasi`, `/chat` (bukan lagi `#/…`), tiap halaman punya title/description/canonical/Open Graph/Twitter + JSON-LD (WebSite, WebApplication, Person, FAQPage, BreadcrumbList), `sitemap.xml`, `robots.txt`, `llms.txt`, manifest PWA, gambar OG 1200×630 (57 KB), ikon lengkap.
- **Diagnosa**: buka `/api/health` untuk melihat penyedia mana yang hidup (teks & gambar) beserta alasan gagalnya. Tambah `?image=1` untuk uji pembuat gambar.

## Langkah setelah deploy (penting)
1. **Isi `LLM_API_KEY`** (key gratis Gemini: aistudio.google.com/apikey) di Vercel → Settings → Environment Variables. Ini langkah paling berpengaruh untuk kecepatan dan analisis gambar.
2. **Isi `SITE_URL`** dengan domain asli (mis. `https://myra.contoh.com`), lalu redeploy. Tanpa ini canonical/OG/sitemap memakai URL bawaan `site.config.json`.
3. Buka `/api/health?image=1`: pastikan `verdict.chat` dan `verdict.vision` tidak kosong.
4. **Google Search Console**: tambahkan properti, kirim `https://DOMAIN/sitemap.xml`, lalu "Inspeksi URL → Minta pengindeksan" untuk tiap halaman.
5. **WhatsApp**: pratinjau di-cache. Jika masih lama, tambahkan `?v=2` di akhir tautan saat membagikan, atau uji di developers.facebook.com/tools/debug (klik "Scrape Again").

## Mengedit halaman
Sumber HTML ada di **`src/index.src.html`** (jangan edit `public/*.html`, itu hasil build). Setelah mengubah: `node scripts/build.mjs`. Vercel menjalankannya otomatis saat deploy. Judul/deskripsi tiap halaman ada di `scripts/build.mjs` (objek `PAGES`).

## Debug
Anti-inspect (`security.js`) menonaktifkan console/Network. Buka situs dengan **`?debug=1`** untuk mematikannya di browser kamu (`?debug=0` untuk mengembalikan). Error API juga tampil di chat sebagai "Detail teknis".

## Struktur
```
src/index.src.html   template halaman
scripts/build.mjs    build → public/*.html, sitemap, robots, llms, manifest
public/              css, js, aset (og-image.jpg, ikon), config.js
api/                 chat.js · image.js · health.js · _lib/{llm,kmsr,carpathian,pollinations,persona,http}.js
```

## Catatan
- Layanan keyless (KMSR, Carpathian, Pollinations tanpa key) dikelola pihak ketiga dan bisa berubah/dibatasi kapan saja; karena itu `LLM_API_KEY` disarankan.
- Link LinkedIn di `public/config.js` tampak salah (`linkedin.com/zaenishi/` → seharusnya `linkedin.com/in/zaenishi/`); tautan itu dilewati dari data terstruktur sampai diperbaiki.
- Batas body Vercel 4,5 MB; rate limit server in-memory per instance (best effort).
