// Visual Parsing Engine: teks AI → HTML aman (escape dulu, baru format). + filter khusus suara.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONS = {
  alert: '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/></svg>',
  success: '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
  info: '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
};

// ── Syntax highlight ringan ──
const KW = new Set(('const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw typeof instanceof in of null undefined true false this super static void ' +
  'def lambda pass None True False and or not is elif with as yield global print ' +
  'int float double char string bool boolean struct enum interface type public private protected package func go defer chan map range fn mut impl use pub trait match self echo SELECT FROM WHERE INSERT UPDATE DELETE JOIN CREATE TABLE INTO VALUES').split(' '));
const HASH_COMMENT = /^(py|python|sh|bash|shell|zsh|yaml|yml|rb|ruby|toml|dockerfile|r|ini|env)$/;

function highlight(code, lang) {
  const l = (lang || '').toLowerCase();
  if (['html', 'xml', 'svg', 'json', 'md', 'markdown', 'text', 'txt', ''].includes(l) && l !== '' && l !== 'json') return esc(code);
  const hash = HASH_COMMENT.test(l);
  const re = new RegExp(
    '(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*' + (hash ? '|#[^\\n]*' : '') + (l === 'sql' ? '|--[^\\n]*' : '') + ')' +
    '|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)' +
    '|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)(\\s*\\()?', 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [all, com, str, num, id, call] = m;
    if (com) out += `<span class="t-c">${esc(com)}</span>`;
    else if (str) out += `<span class="t-s">${esc(str)}</span>`;
    else if (num) out += `<span class="t-n">${num}</span>`;
    else if (KW.has(id)) out += `<span class="t-k">${id}</span>${esc(call || '')}`;
    else if (call) out += `<span class="t-f">${id}</span>${esc(call)}`;
    else out += esc(id);
    last = m.index + all.length;
  }
  return out + esc(code.slice(last));
}

const codeBlock = (code, lang) =>
  `<div class="codeblock"><header><span>${esc(lang || 'kode')}</span><button class="copy" type="button" data-copy>Salin</button></header><pre><code>${highlight(code, lang)}</code></pre></div>`;

// ── Inline ──
function inline(s) {
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code class="inl">${c}</code>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|[\s(>])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s;
}

const CALL = /^\s*(?:\[(ALERT|SUCCESS|INFO)\]|(⚠️|⚠)|(✅|✔️))\s*/i;

export function renderRich(raw) {
  let src = String(raw ?? '').replace(/🍄/g, '').replace(/\r/g, '');
  const blocks = [];
  // 1. blok kode (termasuk yang belum ditutup saat typing)
  src = src.replace(/```([\w+#-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g, (_, lang, code) => {
    blocks.push(codeBlock(code.replace(/\n$/, ''), lang));
    return `\n\u0000${blocks.length - 1}\u0000\n`;
  });
  // 2. escape sisanya
  src = esc(src);

  const lines = src.split('\n');
  let html = '', para = [], list = null;
  const flushP = () => { if (para.length) { html += `<p>${inline(para.join('<br>'))}</p>`; para = []; } };
  const flushL = () => { if (list) { html += `</${list}>`; list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    if (ph) { flushP(); flushL(); html += blocks[+ph[1]]; continue; }
    if (!line.trim()) { flushP(); flushL(); continue; }

    const c = line.match(CALL);
    if (c) {
      flushP(); flushL();
      const type = c[1] ? c[1].toLowerCase() : c[2] ? 'alert' : 'success';
      let body = line.replace(CALL, '');
      while (i + 1 < lines.length && lines[i + 1].trim() && !CALL.test(lines[i + 1]) && !/^\u0000/.test(lines[i + 1]) && !/^(\s*([-*•]|\d+\.)\s|#{1,4}\s)/.test(lines[i + 1])) body += '<br>' + lines[++i];
      html += `<div class="callout ${type}" role="${type === 'alert' ? 'alert' : 'note'}">${ICONS[type]}<div>${inline(body)}</div></div>`;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flushP(); flushL(); html += `<h${h[1].length < 3 ? 3 : 4}>${inline(h[2])}</h${h[1].length < 3 ? 3 : 4}>`; continue; }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { flushP(); flushL(); html += '<hr>'; continue; }
    const ul = line.match(/^\s*[-*•]\s+(.*)$/), ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushP(); const t = ul ? 'ul' : 'ol';
      if (list !== t) { flushL(); html += `<${t}>`; list = t; }
      html += `<li>${inline((ul || ol)[1])}</li>`; continue;
    }
    const q = line.match(/^&gt;\s?(.*)$/);
    if (q) { flushP(); flushL(); html += `<blockquote>${inline(q[1])}</blockquote>`; continue; }
    flushL(); para.push(line);
  }
  flushP(); flushL();
  return html;
}

// ── Filter suara: buang semua markup, ringkas, ramah anak ──
const EMOJI = /[\p{Extended_Pictographic}\u200d\ufe0f]/gu;
export function toSpeech(raw, maxChars = 480) {
  let hadCode = false;
  let t = String(raw ?? '')
    .replace(/```[\s\S]*?(```|$)/g, () => { hadCode = true; return ' '; })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[(ALERT|SUCCESS|INFO)\]/gi, ' ')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' tautan ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~#>|\\]+/g, ' ')
    .replace(EMOJI, ' ')
    .replace(/[\[\]{}=<>^]/g, ' ')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();

  const sentences = t.match(/[^.!?]+[.!?]*/g) || [t];
  let out = '', cut = false;
  for (const s of sentences) {
    if ((out + s).length > maxChars || out.split(/[.!?]/).filter(Boolean).length >= 6) { cut = out.length > 0 || cut; if (out) break; out = s.slice(0, maxChars); cut = true; break; }
    out += s;
  }
  out = out.trim();
  if (cut || hadCode) out += (/[.!?]$/.test(out) ? ' ' : '. ') + (hadCode ? 'Kodenya sudah aku taruh di chat ya.' : 'Selengkapnya ada di chat ya.');
  return out || 'Hmm, aku belum bisa menjawabnya. Coba tanya lagi ya.';
}
