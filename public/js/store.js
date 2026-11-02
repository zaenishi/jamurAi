// Penyimpanan hybrid. Default: cache browser (localStorage + IndexedDB).
// CONFIG.USE_FIREBASE = true → Firebase Auth + Cloud Firestore. Antarmuka (API) sama persis.
const P_KEY = 'jamur.profile.v1';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

// ── Local ──
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('si-jamur', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
const idbOp = async (mode, fn) => {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => res(req?.result);
    tx.onerror = () => rej(tx.error);
  });
};

function localStore() {
  return {
    kind: 'browser',
    async init() {},
    async getProfile() { try { return JSON.parse(localStorage.getItem(P_KEY)) || null; } catch { return null; } },
    async saveProfile(p) { try { localStorage.setItem(P_KEY, JSON.stringify(p)); } catch {} },
    async getHistory() {
      try { return (await idbOp('readonly', (s) => s.get('history'))) || []; }
      catch { try { return JSON.parse(localStorage.getItem('jamur.history') || '[]'); } catch { return []; } }
    },
    async saveHistory(h) {
      try { await idbOp('readwrite', (s) => s.put(h, 'history')); }
      catch { try { localStorage.setItem('jamur.history', JSON.stringify(h)); } catch {} }
    },
    async clearHistory() {
      try { await idbOp('readwrite', (s) => s.delete('history')); } catch {}
      try { localStorage.removeItem('jamur.history'); } catch {}
    },
  };
}

// ── Firebase (dimuat dinamis hanya jika dipakai) ──
async function firebaseStore(cfg) {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${FB}firebase-app.js`), import(`${FB}firebase-auth.js`), import(`${FB}firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg.firebase);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  let uid = null;
  const ref = () => fs.doc(db, 'users', uid);

  return {
    kind: 'firebase',
    async init() {
      if (a.currentUser) { uid = a.currentUser.uid; return; }
      const cred = cfg.AUTH_METHOD === 'google'
        ? await auth.signInWithPopup(a, new auth.GoogleAuthProvider())
        : await auth.signInAnonymously(a);
      uid = cred.user.uid;
    },
    async getProfile() { const s = await fs.getDoc(ref()); return s.exists() ? s.data().profile || null : null; },
    async saveProfile(p) { await fs.setDoc(ref(), { profile: p }, { merge: true }); },
    async getHistory() { const s = await fs.getDoc(ref()); return s.exists() ? s.data().history || [] : []; },
    async saveHistory(h) { await fs.setDoc(ref(), { history: h }, { merge: true }); },
    async clearHistory() { await fs.setDoc(ref(), { history: [] }, { merge: true }); },
  };
}

export async function createStore(cfg) {
  if (cfg.USE_FIREBASE) {
    try { const s = await firebaseStore(cfg); await s.init(); return s; }
    catch (e) { /* jatuh kembali ke cache browser agar app tetap jalan */ }
  }
  const s = localStore(); await s.init(); return s;
}
