// ─────────────────────────────────────────────────────────────
// config.js — satu-satunya tempat pengaturan frontend Si Jamur.
// Ganti USE_FIREBASE ke true (dan isi firebase) untuk pindah dari
// cache browser ke Firebase Auth + Cloud Firestore. Tidak ada kode lain yang perlu diubah.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  USE_FIREBASE: false,
  AUTH_METHOD: 'anonymous', // 'anonymous' | 'google' (hanya dipakai jika USE_FIREBASE: true)
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  },

  CREATOR: {
    name: 'zaenishi',
    bio: 'Pembuat Si Jamur. Suka membangun AI, game, dan alat kecil yang berguna.',
    links: [
      { label: 'Instagram', url: 'https://instagram.com/znarss_' }, // pastikan username benar
      // { label: 'TikTok', url: 'https://tiktok.com/@zaenishi' },
      // { label: 'GitHub', url: 'https://github.com/zaenishi' },
    ],
  },

  LIMITS: {
    MAX_IMAGE_MB: 20,           // batas file asli yang boleh dipilih
    UPLOAD_TARGET_MB: 3,        // hasil kompres yang dikirim (batas body Vercel 4,5 MB)
    MAX_MESSAGE_CHARS: 4000,
    SEND_COOLDOWN_MS: 2500,     // jeda tombol kirim
    MAX_PER_MINUTE: 8,          // maksimal pesan per menit di sisi client
    HISTORY_SENT: 20,
    HISTORY_STORED: 60,
  },

  VOICE: {
    LANG: 'id-ID',
    PITCH: 1.3,                 // sedikit tinggi → terdengar ceria
    RATE: 1.02,
    MAX_SPOKEN_CHARS: 280,
  },

  SECURITY: {
    ANTI_INSPECT: true,         // deterrent saja; keamanan sebenarnya ada di proxy /api
    DISABLE_ON_LOCALHOST: true,
  },
};
