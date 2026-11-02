// Mode telepon: layar penuh, bicara dua arah dengan MyraAi.
import { CONFIG } from '../config.js';
import { S, $, toast, sleep, reduceMotion } from './state.js';
import { toSpeech } from './parser.js';
import { createMushroom } from './mushroom.js';
import { voiceSupported, listen, speak, stopSpeaking } from './voice.js';
import { api, pushHistory, voiceOpts, renderThread } from './chat.js';

const L = CONFIG.LIMITS;
const call = { open: false, muted: false, rec: null, tts: null, m: null, busy: false, stage: 'idle', ask: null };

const LABELS = { listen: 'MyraAi mendengarkan…', think: 'MyraAi sedang berpikir…', talk: 'MyraAi berbicara', idle: 'Mikrofon mati. Ketuk ikon mic untuk bicara.' };
function setCall(stage) {
  call.stage = stage; $('#call').dataset.s = stage;
  $('#call-live').textContent = LABELS[stage] || ''; $('#call-label').textContent = LABELS[stage] || '';
}

export async function startCall(ev, ensureProfile) {
  if (call.open) return;
  if (!voiceSupported()) return toast('Browser ini belum mendukung suara. Coba Chrome atau Edge.');
  await ensureProfile?.();
  call.open = true; call.muted = false;
  const rect = ev?.currentTarget?.getBoundingClientRect?.();
  const el = $('#call');
  el.style.setProperty('--cx', rect ? rect.left + rect.width / 2 + 'px' : '50%'); el.style.setProperty('--cy', rect ? rect.top + rect.height / 2 + 'px' : '50%');
  el.setAttribute('aria-hidden', 'false'); el.classList.add('open'); document.body.style.overflow = 'hidden';
  $('#call-mute').setAttribute('aria-pressed', 'false');
  try { await el.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  call.m ||= createMushroom($('#call-mushroom'));
  await sleep(reduceMotion ? 0 : 650);
  if (!call.open) return;
  call.m.happy(2200);
  const name = S.profile?.name ? ` ${S.profile.name}` : '';
  say(`Halo${name}! Aku MyraAi. Mau ngobrol apa?`, () => listenLoop());
}

function say(text, then) {
  setCall('talk'); call.m.talk();
  call.tts = speak(text, {
    ...voiceOpts(call.m),
    onEnd: () => { call.m.stopTalk(); if (call.open) then?.(); },
  });
}

function listenLoop() {
  if (!call.open || call.muted || call.busy) { if (call.open && !call.busy) { setCall('idle'); call.m.idle(); } return; }
  setCall('listen'); call.m.listen();
  call.rec = listen({
    lang: CONFIG.VOICE.LANG,
    onInterim: (t) => { $('#call-label').textContent = t; },
    onFinal: (text) => handleSpeech(text),
    onEnd: (got) => { if (!got && call.open && !call.muted && !call.busy) setTimeout(listenLoop, 250); },
    onError: (err) => {
      if (['no-speech', 'aborted'].includes(err)) return;
      if (['not-allowed', 'service-not-allowed'].includes(err)) { toast('Izin mikrofon ditolak. Aktifkan di pengaturan browser.'); return endCall(); }
      setTimeout(listenLoop, 800);
    },
  });
}

async function handleSpeech(text) {
  call.busy = true; call.rec?.stop(); setCall('think'); call.m.think();
  const prior = S.history.slice(-L.HISTORY_SENT);
  pushHistory('user', text);
  try {
    const { reply } = await api('/api/chat', { message: text, history: prior, voice: true, userName: S.profile?.name || '' });
    pushHistory('assistant', reply);
    if (!call.open) return;
    call.busy = false;
    say(toSpeech(reply, CONFIG.VOICE.MAX_SPOKEN_CHARS), () => listenLoop());
  } catch (e) {
    call.busy = false; if (!call.open) return;
    say('Maaf, aku lagi susah mendengar. Coba bilang lagi ya.', () => listenLoop());
  }
}

export function toggleMute() {
  call.muted = !call.muted; $('#call-mute').setAttribute('aria-pressed', String(call.muted));
  $('#call-mute').setAttribute('aria-label', call.muted ? 'Nyalakan mikrofon' : 'Matikan mikrofon');
  if (call.muted) { call.rec?.stop(); if (call.stage === 'listen') { setCall('idle'); call.m.idle(); } }
  else if (call.stage === 'idle') listenLoop();
}

export function endCall() {
  if (!call.open) return;
  call.open = false; call.busy = false; call.rec?.stop(); call.tts?.cancel(); stopSpeaking(); call.m?.idle();
  const el = $('#call'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); setCall('idle');
  document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  if (S.route === 'chat') renderThread();
}

// ketuk MyraAi untuk menyela saat dia bicara
export function interrupt() { if (call.stage === 'talk') { call.tts?.cancel(); stopSpeaking(); call.m.stopTalk(); listenLoop(); } }
export const callOpen = () => call.open;

export function initCall() {
  $('#call-end').onclick = endCall; $('#call-mute').onclick = toggleMute; $('#call-mushroom').onclick = interrupt;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && call.open) endCall(); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && call.open) endCall(); });
}
