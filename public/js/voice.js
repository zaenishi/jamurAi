// Speech-to-Text (SpeechRecognition) & Text-to-Speech (speechSynthesis) bawaan browser.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = () => !!SR && 'speechSynthesis' in window;

let voices = [];
const loadVoices = () => { voices = speechSynthesis.getVoices(); };
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }

function pickVoice(lang) {
  const base = lang.slice(0, 2).toLowerCase();
  const cands = voices.filter((v) => v.lang?.toLowerCase().startsWith(base));
  return cands.find((v) => /google|natural|online/i.test(v.name)) || cands.find((v) => /female|damayanti|gadis/i.test(v.name)) || cands[0] || null;
}

export function listen({ lang, onInterim, onFinal, onEnd, onError }) {
  const rec = new SR();
  rec.lang = lang; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
  let got = false;
  rec.onresult = (e) => {
    let interim = '', fin = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      (r.isFinal ? (fin += r[0].transcript) : (interim += r[0].transcript));
    }
    if (interim) onInterim?.(interim);
    if (fin.trim()) { got = true; onFinal?.(fin.trim()); }
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.(got);
  try { rec.start(); } catch (e) { onError?.('start-failed'); }
  return { stop: () => { rec.onend = null; rec.onerror = null; try { rec.abort(); } catch {} } };
}

export function speak(text, { lang, pitch, rate, onStart, onBeat, onEnd }) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return { cancel() {} }; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.pitch = pitch; u.rate = rate; u.volume = 1;
  const v = pickVoice(lang); if (v) u.voice = v;
  let done = false;
  const end = () => { if (!done) { done = true; clearInterval(keep); onEnd?.(); } };
  u.onstart = () => onStart?.();
  u.onboundary = (e) => { if (e.name !== 'sentence') onBeat?.(); };
  u.onend = end; u.onerror = end;
  // Chrome kadang menghentikan ucapan panjang: pancing terus
  const keep = setInterval(() => { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 9000);
  speechSynthesis.speak(u);
  return { cancel() { done = true; clearInterval(keep); speechSynthesis.cancel(); } };
}

export const stopSpeaking = () => { try { speechSynthesis.cancel(); } catch {} };
