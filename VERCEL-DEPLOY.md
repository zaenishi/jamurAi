# Deployment Si Jamur ke Vercel (GitHub)

## Perubahan kompatibilitas
- `api/[...path].js` mengekspor handler Node.js untuk seluruh endpoint `/api/*`.
- `server.js` hanya membuka `http.listen()` saat dijalankan lokal; saat diimpor Vercel, ia mengekspor handler saja.
- `index.html` di root menjadi static entry point Vercel; `public/index.html` tetap dipakai oleh server lokal. `vercel.json` mengarahkan `/` ke `/index.html`.
- Gambar vision dikompresi di browser agar payload tetap di bawah batas request Serverless Function.
- Hasil image generation dikirim sebagai data URL saat berjalan di Vercel karena filesystem function bersifat sementara. Mode lokal tetap memakai folder `downloads/`.

## Deploy dari GitHub
1. Ekstrak ZIP hasil perbaikan dan salin seluruh isinya ke root repository GitHub (jangan menaruhnya di subfolder).
2. Pastikan `package.json`, `vercel.json`, `server.js`, `api/`, dan `public/` berada di root.
3. Commit dan push ke branch yang terhubung ke Vercel.
4. Di Vercel > Project > Settings > General, pastikan Framework Preset = Other, Root Directory = `./`, Build Command kosong, Output Directory kosong, Install Command dapat dibiarkan otomatis.
5. Tambahkan Environment Variables yang memang diperlukan provider. Jangan menaruh secret di `public/` atau di GitHub.
6. Redeploy.
7. Uji `https://DOMAIN/api/health`, lalu uji chat, vision, dan generate gambar.

## Batasan yang perlu diketahui
- Rate limiter bawaan masih process-local; untuk penggunaan publik/multi-instance, pindahkan ke Redis/KV.
- Filesystem serverless tidak persisten. Generated image dikirim langsung ke browser; riwayat gambar tidak disimpan permanen.
- Vision dibatasi oleh payload request Vercel; browser mengompresi gambar ke sekitar 500 KB per gambar.
- `maxDuration` diset 60 detik. Batas aktual tetap mengikuti paket Vercel dan pengaturan akun.
- API provider eksternal dapat gagal karena rate limit, perubahan API, atau kebijakan provider; itu berbeda dari kegagalan invocation Vercel.
