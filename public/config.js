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
    name: 'zaenishi - Pengembang Utama',
    bio: `Hai! aku zaenishi, dengan nama lengkap "jaenar mohasan zaki" pengembang utama MyraAi!`,
    links: [
      { label: 'Instagram', url: 'https://instagram.com/znarss_' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/zaenishi/' },
      { label: 'GitHub', url: 'https://github.com/zaenishi' }
    ],
  },

  LIMITS: {
    MAX_IMAGE_MB: 20,           // batas file asli yang boleh dipilih
    UPLOAD_TARGET_MB: 2.2,      // hasil kompres yang dikirim (base64 +33%, batas body Vercel 4,5 MB)
    MAX_MESSAGE_CHARS: 4000,
    SEND_COOLDOWN_MS: 2500,     // jeda tombol kirim
    MAX_PER_MINUTE: 8,          // maksimal pesan per menit di sisi client
    HISTORY_SENT: 20,
    HISTORY_STORED: 60,
  },

  VOICE: {
    LANG: 'id-ID',
    PITCH: 1.06,                // nyaris alami; pitch tinggi membuat suara terdengar kaku/robot
    RATE: 0.98,
    MAX_SPOKEN_CHARS: 480,      // dibacakan utuh per kalimat, tidak dipotong di tengah
  },

  SECURITY: {
    ANTI_INSPECT: true,         // deterrent saja; keamanan sebenarnya ada di proxy /api
    DISABLE_ON_LOCALHOST: true,
  },
};
