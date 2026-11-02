// Character Engine: jamur kartun 2D berbasis SVG. Ekspresif: kedip, mata mengikuti pointer,
// goyang saat berpikir, bergoyang saat bicara, mulut bergerak sesuai suara.
let uid = 0;

const svg = (p) => `
<svg class="jamur" data-state="idle" viewBox="0 0 300 340" role="img" aria-label="Si Jamur">
  <defs>
    <radialGradient id="${p}cap" cx="42%" cy="28%" r="85%"><stop offset="0" stop-color="#E07A4D"/><stop offset=".55" stop-color="#B8552F"/><stop offset="1" stop-color="#7C2A22"/></radialGradient>
    <linearGradient id="${p}stem" x1="0" x2="1"><stop offset="0" stop-color="#E9D9B8"/><stop offset=".5" stop-color="#FBF3E1"/><stop offset="1" stop-color="#DCC9A2"/></linearGradient>
    <radialGradient id="${p}spot" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF8E8"/><stop offset="1" stop-color="#F0DDB6"/></radialGradient>
  </defs>
  <g class="body">
    <path class="arm l" d="M104 238 C86 240 74 252 70 268" fill="none" stroke="#EBDDBF" stroke-width="13" stroke-linecap="round"/>
    <path class="arm r" d="M196 238 C214 240 226 252 230 268" fill="none" stroke="#EBDDBF" stroke-width="13" stroke-linecap="round"/>
    <path d="M104 168 C98 220 90 270 86 302 C84 322 112 330 150 330 C188 330 216 322 214 302 C210 270 202 220 196 168 Z" fill="url(#${p}stem)"/>
    <path d="M196 190 C202 230 208 270 210 300 C212 318 196 326 176 328 C196 316 194 270 190 190Z" fill="#CDB98F" opacity=".35"/>
    <g class="cap-g">
      <ellipse cx="150" cy="166" rx="112" ry="13" fill="#5A2A1E"/>
      <g stroke="#3d1b14" stroke-width="1.6" opacity=".5"><path d="M70 164v10M96 168v11M124 170v11M150 171v11M176 170v11M204 168v11M230 164v10"/></g>
      <path d="M30 150 C30 70 90 22 150 22 C210 22 270 70 270 150 C270 162 250 168 150 168 C50 168 30 162 30 150 Z" fill="url(#${p}cap)"/>
      <path d="M52 92 C66 58 100 36 138 31" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="7" stroke-linecap="round"/>
      <g fill="url(#${p}spot)"><circle cx="80" cy="98" r="15"/><circle cx="150" cy="62" r="11"/><circle cx="218" cy="102" r="17"/><circle cx="122" cy="126" r="9"/><circle cx="184" cy="136" r="8"/><circle cx="56" cy="134" r="7"/><circle cx="247" cy="140" r="6"/></g>
    </g>
    <!-- wajah -->
    <g class="face">
      <ellipse cx="112" cy="250" rx="13" ry="8" fill="#E8836A" opacity=".5"/><ellipse cx="188" cy="250" rx="13" ry="8" fill="#E8836A" opacity=".5"/>
      <g class="brow" stroke="#4A3524" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M114 205 q13 -9 25 -2"/><path d="M161 203 q13 -7 25 2"/></g>
      <g class="eye" data-eye><ellipse cx="127" cy="226" rx="12" ry="14" fill="#fff"/><g data-pupil><circle cx="127" cy="228" r="7.5" fill="#3A2718"/><circle cx="130" cy="224.500" r="2.600" fill="#fff"/></g></g>
      <g class="eye" data-eye><ellipse cx="173" cy="226" rx="12" ry="14" fill="#fff"/><g data-pupil><circle cx="173" cy="228" r="7.500" fill="#3A2718"/><circle cx="176" cy="224.500" r="2.600" fill="#fff"/></g></g>
      <path data-smile d="M133 256 Q150 270 167 256" fill="none" stroke="#5A2A1E" stroke-width="4" stroke-linecap="round"/>
      <g data-open style="display:none"><path data-mouth d="" fill="#5A1F22"/><path data-tongue d="" fill="#E06B6B"/></g>
    </g>
    <g class="bubble-dots" fill="#F4A83A"><circle cx="232" cy="28" r="6"/><circle cx="252" cy="16" r="6"/><circle cx="272" cy="4" r="6"/></g>
    <g fill="#F4A83A"><path class="sparkle" d="M22 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path class="sparkle" d="M278 52l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path class="sparkle" d="M262 200l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>
  </g>
</svg>`;

export function createMushroom(host, { track = true } = {}) {
  host.innerHTML = svg(`m${++uid}-`);
  const root = host.querySelector('svg');
  const eyes = [...root.querySelectorAll('[data-eye]')];
  const pupils = [...root.querySelectorAll('[data-pupil]')];
  const smile = root.querySelector('[data-smile]');
  const open = root.querySelector('[data-open]');
  const mouth = root.querySelector('[data-mouth]');
  const tongue = root.querySelector('[data-tongue]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let state = 'idle', talking = false, amp = null, raf = 0, blinkT = 0, happyT = 0, dead = false;

  const setMouth = (o) => {
    if (o < 0.07) { smile.style.display = ''; open.style.display = 'none'; return; }
    smile.style.display = 'none'; open.style.display = '';
    const w = 15 + o * 4, y = 258, d = 4 + o * 22;
    mouth.setAttribute('d', `M${150 - w} ${y} Q150 ${y - 5} ${150 + w} ${y} Q150 ${y + d * 1.6} ${150 - w} ${y}Z`);
    tongue.setAttribute('d', `M${150 - w * .55} ${y + d * .78} Q150 ${y + d * .25} ${150 + w * .55} ${y + d * .78} Q150 ${y + d * 1.12} ${150 - w * .55} ${y + d * .78}Z`);
  };

  const set = (s) => { state = s; root.dataset.state = s; if (s !== 'talk') setMouth(0); };

  const blink = () => {
    if (dead) return;
    eyes.forEach((e) => e.classList.add('blink'));
    setTimeout(() => eyes.forEach((e) => e.classList.remove('blink')), 130);
    blinkT = setTimeout(blink, 1800 + Math.random() * 3200);
  };
  if (!reduce) blinkT = setTimeout(blink, 1200);

  // mulut: dorong dari amplitudo luar (boundary TTS) atau osilasi alami
  const loop = (t) => {
    if (dead) return;
    if (talking) {
      let o = amp !== null ? amp : (Math.sin(t / 85) * .5 + .5) * (.55 + Math.sin(t / 310) * .25) + (Math.random() * .12);
      setMouth(Math.max(0, Math.min(1, o)));
      if (amp !== null) amp *= .86;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // mata mengikuti pointer
  const look = (x, y) => {
    const r = root.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width * .8)));
    const dy = Math.max(-1, Math.min(1, (y - (r.top + r.height * .65)) / (r.height * .8)));
    pupils.forEach((p) => { p.style.transform = `translate(${dx * 4.5}px,${dy * 4}px)`; });
  };
  const onMove = (e) => { const p = e.touches?.[0] || e; look(p.clientX, p.clientY); };
  if (track && !reduce) { window.addEventListener('pointermove', onMove, { passive: true }); }

  return {
    el: root,
    get state() { return state; },
    idle() { talking = false; set('idle'); },
    think() { talking = false; set('think'); pupils.forEach((p) => { p.style.transform = 'translate(3px,-4px)'; }); },
    listen() { talking = false; set('listen'); },
    talk() { talking = true; amp = null; set('talk'); },
    pulse(v = 1) { amp = Math.min(1, v); },           // dipanggil dari onboundary TTS
    stopTalk() { talking = false; amp = null; set('idle'); },
    happy(ms = 1800) { clearTimeout(happyT); talking = false; set('happy'); happyT = setTimeout(() => { if (state === 'happy') set('idle'); }, ms); },
    destroy() { dead = true; cancelAnimationFrame(raf); clearTimeout(blinkT); window.removeEventListener('pointermove', onMove); },
  };
}
