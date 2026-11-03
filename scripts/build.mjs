// Build statis: src/index.src.html → halaman HTML terpisah per rute, lengkap dengan SEO
// (title/description/canonical/Open Graph/Twitter/JSON-LD), plus sitemap.xml, robots.txt, llms.txt, manifest, 404.
// Jalankan: node scripts/build.mjs   (Vercel menjalankannya otomatis lewat buildCommand di vercel.json)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const site = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const { CONFIG } = await import(pathToFileURL(join(PUB, 'config.js')).href);

const SITE = (process.env.SITE_URL
  || (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  || site.url).replace(/\/+$/, '');
const NAME = site.name;
const today = new Date().toISOString().slice(0, 10);
const OG_IMAGE = `${SITE}/og-image.jpg`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const PAGES = {
  home: {
    path: '/', file: 'index.html', crumb: 'Beranda', priority: '1.0', freq: 'weekly',
    title: 'Myra AI — Asisten AI Indonesia: Chat, Coding, Gambar & Suara',
    desc: 'Asisten AI berbahasa Indonesia yang ramah dan cepat: tanya apa saja, coding, analisis gambar, buat gambar, dan telepon suara. Gratis, tanpa daftar.',
    keywords: 'Myra AI, MyraAi, asisten AI Indonesia, chatbot AI gratis, AI bahasa Indonesia, analisis gambar AI, buat gambar AI, AI coding, telepon AI, zaenishi',
  },
  fitur: {
    path: '/fitur', file: 'fitur.html', crumb: 'Fitur', priority: '0.8', freq: 'monthly',
    title: 'Fitur Myra AI — Chat, Coding, Analisis & Pembuat Gambar, Telepon',
    desc: 'Fitur Myra AI: chat dan coding dengan kode rapi, analisis gambar, pembuat gambar dari teks, dan mode telepon bersuara natural. Semua gratis.',
    keywords: 'fitur Myra AI, chatbot coding, analisis gambar AI, generator gambar AI gratis, telepon AI suara',
  },
  pembuat: {
    path: '/pembuat', file: 'pembuat.html', crumb: 'Pembuat', priority: '0.5', freq: 'yearly',
    title: 'Pembuat Myra AI — zaenishi, Pengembang Utama',
    desc: 'Kenalan dengan zaenishi, pengembang utama Myra AI. Cerita di balik proyek, teknologi yang dipakai, dan cara menghubungi pembuatnya.',
    keywords: 'zaenishi, pembuat Myra AI, pengembang Myra AI, developer Indonesia',
  },
  dokumentasi: {
    path: '/dokumentasi', file: 'dokumentasi.html', crumb: 'Dokumentasi', priority: '0.7', freq: 'monthly',
    title: 'Dokumentasi Myra AI — Cara Pakai, Batas & Pertanyaan Umum (FAQ)',
    desc: 'Panduan Myra AI: mulai cepat, pintasan keyboard, batas penggunaan, kirim dan buat gambar, mode telepon, plus jawaban pertanyaan yang sering muncul.',
    keywords: 'cara pakai Myra AI, FAQ Myra AI, dokumentasi chatbot AI, batas penggunaan',
  },
  chat: {
    path: '/chat', file: 'chat.html', crumb: 'Chat', priority: '0.9', freq: 'weekly',
    title: 'Chat dengan Myra AI — Tanya, Coding, Kirim & Buat Gambar',
    desc: 'Mulai ngobrol dengan Myra AI sekarang. Kirim pertanyaan, lampirkan gambar untuk dianalisis, atau minta Myra melukis gambar baru. Tanpa daftar.',
    keywords: 'chat AI Indonesia, ngobrol dengan AI, chatbot gratis, Myra AI chat',
  },
};

// ── ambil blok halaman dari template ──
const src = readFileSync(join(ROOT, 'src', 'index.src.html'), 'utf8');
const sections = {};
for (const m of src.matchAll(/<section class="page([^"]*)" id="page-(\w+)" data-page="\w+"(?: hidden)?>([\s\S]*?)<\/section>/g)) {
  sections[m[2]] = `<section class="page${m[1]}" id="page-${m[2]}" data-page="${m[2]}">${m[3]}</section>`;
}
const missing = Object.keys(PAGES).filter((k) => !sections[k]);
if (missing.length) throw new Error('Section tidak ditemukan: ' + missing.join(', '));
const shell = src.replace(/<section class="page[^"]*" id="page-\w+"[\s\S]*?<\/section>\s*/g, '');

// ── FAQ untuk JSON-LD (diambil dari <details> halaman dokumentasi) ──
const faq = [...sections.dokumentasi.matchAll(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div>([\s\S]*?)<\/div>\s*<\/details>/g)]
  .map((m) => ({ '@type': 'Question', name: text(m[1]), acceptedAnswer: { '@type': 'Answer', text: text(m[2]) } }));

const sameAs = (CONFIG.CREATOR.links || []).map((l) => l.url).filter((u) => {
  const ok = /^https:\/\//.test(u) && !(/linkedin\.com/.test(u) && !/linkedin\.com\/(in|company)\//.test(u));
  if (!ok) console.warn(`  ! sameAs dilewati (URL tampak tidak valid): ${u}`);
  return ok;
});

const features = ['Chat dan coding dengan blok kode berwarna', 'Analisis gambar', 'Pembuat gambar dari deskripsi teks', 'Mode telepon dengan suara natural', 'Tabel, daftar, dan format jawaban rapi', 'Tanpa daftar, gratis'];
const graph = (key) => {
  const p = PAGES[key]; const url = SITE + (p.path === '/' ? '/' : p.path);
  const g = [
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: NAME, alternateName: ['MyraAi', 'Myra'], inLanguage: 'id-ID', publisher: { '@id': `${SITE}/#creator` } },
    { '@type': 'Person', '@id': `${SITE}/#creator`, name: site.author, url: `${SITE}/pembuat`, ...(sameAs.length ? { sameAs } : {}) },
    { '@type': 'WebApplication', '@id': `${SITE}/#app`, name: NAME, url: `${SITE}/`, description: PAGES.home.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Semua perangkat dengan browser modern', browserRequirements: 'Memerlukan JavaScript', inLanguage: 'id-ID', image: OG_IMAGE, featureList: features, creator: { '@id': `${SITE}/#creator` }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR', availability: 'https://schema.org/InStock' } },
  ];
  const page = { '@type': key === 'pembuat' ? 'ProfilePage' : key === 'dokumentasi' ? ['WebPage', 'FAQPage'] : 'WebPage', '@id': `${url}#webpage`, url, name: p.title, description: p.desc, inLanguage: 'id-ID', isPartOf: { '@id': `${SITE}/#website` }, primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 }, dateModified: today };
  if (key === 'pembuat') page.mainEntity = { '@id': `${SITE}/#creator` };
  if (key === 'dokumentasi') page.mainEntity = faq;
  if (key === 'home') page.about = { '@id': `${SITE}/#app` };
  if (key !== 'home') page.breadcrumb = { '@id': `${url}#breadcrumb` };
  g.push(page);
  if (key !== 'home') g.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: PAGES.home.crumb, item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: p.crumb, item: url }] });
  return { '@context': 'https://schema.org', '@graph': g };
};

const head = (key) => {
  const p = PAGES[key]; const url = SITE + (p.path === '/' ? '/' : p.path);
  const alt = `${NAME} — asisten AI berbahasa Indonesia`;
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.desc)}">
  <meta name="keywords" content="${esc(p.keywords)}">
  <meta name="author" content="${esc(site.author)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="id" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(NAME)}">
  <meta property="og:locale" content="${site.locale}">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.desc)}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:image:secure_url" content="${OG_IMAGE}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(p.title)}">
  <meta name="twitter:description" content="${esc(p.desc)}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <meta name="twitter:image:alt" content="${esc(alt)}">

  <meta name="application-name" content="${esc(NAME)}">
  <meta name="apple-mobile-web-app-title" content="Myra">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="format-detection" content="telephone=no">
  <meta name="theme-color" content="${site.themeColor}">
  <meta name="color-scheme" content="light">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="modulepreload" href="/js/app.js">
  <script type="application/ld+json">${JSON.stringify(graph(key))}</script>`;
};

const noscript = `<noscript><p style="padding:16px;text-align:center;font-family:sans-serif">Myra AI membutuhkan JavaScript agar chat, gambar, dan telepon dapat berjalan. Aktifkan JavaScript di browser kamu.</p></noscript>`;

function render(key) {
  let html = shell.replace('<!--HEAD-->', head(key)).replace('__ROUTE__', key)
    .replace('<main id="main" tabindex="-1">\n', `<main id="main" tabindex="-1">\n${sections[key]}\n`);
  html = key === 'chat'
    ? html.replace(/<!--\/?ONLY:chat-->\n?/g, '').replace('<!--/ONLY-->\n', '')
    : html.replace(/<!--ONLY:chat-->[\s\S]*?<!--\/ONLY-->\n?/, '');
  html = html.replace('<div class="bg"', `${noscript}\n  <div class="bg"`);
  return html;
}

const write = (rel, data) => { const f = join(PUB, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); };
for (const key of Object.keys(PAGES)) write(PAGES[key].file, render(key));

// ── 404 (noindex) ──
write('404.html', render('home')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Halaman tidak ditemukan — Myra AI</title>')
  .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, nofollow">')
  .replace(/<link rel="canonical"[^>]*>\s*<link rel="alternate"[^>]*>\s*<link rel="alternate"[^>]*>/, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  .replace(/<section class="page"[\s\S]*?<\/section>/, `<section class="page" id="page-home" data-page="home"><div class="wrap page-head"><p class="badge">404</p><h1>Halaman tidak ditemukan</h1><p class="lead">Tautan yang kamu buka tidak ada atau sudah dipindah.</p><div class="cta"><a class="btn primary lg" href="/">Ke beranda</a><a class="btn ghost lg" href="/chat">Mulai chat</a></div></div></section>`)
  .replace('data-route="home"', 'data-route="notfound"'));

// ── sitemap, robots, llms, manifest ──
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${Object.values(PAGES).map((p) => { const u = SITE + (p.path === '/' ? '/' : p.path); return `  <url>
    <loc>${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
    <xhtml:link rel="alternate" hreflang="id" href="${u}"/>${p.path === '/' ? `\n    <image:image><image:loc>${OG_IMAGE}</image:loc><image:title>${esc(NAME)}</image:title></image:image>` : ''}
  </url>`; }).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);
write('llms.txt', `# ${NAME}

> ${PAGES.home.desc}

${NAME} adalah aplikasi web asisten AI berbahasa Indonesia ciptaan ${site.author}. Gratis dan tanpa daftar.

## Halaman
- [Beranda](${SITE}/): pengenalan Myra AI
- [Fitur](${SITE}/fitur): chat & coding, analisis gambar, pembuat gambar, telepon suara
- [Dokumentasi](${SITE}/dokumentasi): cara pakai, batas penggunaan, FAQ
- [Pembuat](${SITE}/pembuat): tentang pengembang
- [Chat](${SITE}/chat): mulai ngobrol
`);
write('manifest.webmanifest', JSON.stringify({
  name: NAME, short_name: 'Myra', description: PAGES.home.desc, lang: 'id', dir: 'ltr', id: '/', start_url: '/chat', scope: '/', display: 'standalone',
  background_color: '#EAF6FF', theme_color: site.themeColor, categories: ['productivity', 'utilities', 'education'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [{ name: 'Mulai chat', url: '/chat', icons: [{ src: '/icon-192.png', sizes: '192x192' }] }],
}, null, 2));

console.log(`✓ build selesai — situs: ${SITE}\n  ${Object.values(PAGES).map((p) => p.file).join(', ')}, 404.html, sitemap.xml, robots.txt, llms.txt, manifest.webmanifest`);
if (!process.env.SITE_URL && SITE === site.url) console.log('  ⚠ URL situs memakai default site.config.json. Set env SITE_URL (domain asli) agar canonical/OG/sitemap benar.');
