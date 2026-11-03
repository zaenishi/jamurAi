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
// Teks yang masuk sudah di-escape HTML. Kode inline disimpan dulu sebagai placeholder agar isinya tidak diformat.
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => { codes.push(`<code class="inl">${c}</code>`); return `\u0001${codes.length - 1}\u0001`; });
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  s = s.replace(/(^|[\s(>])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  s = s.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w])__([^_\n]+?)__(?=[^\w]|$)/g, '$1<strong>$2</strong>');
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
  s = s.replace(/(^|[\s(>])\*([^*\s][^*\n]*?)\*(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(>])_([^_\s][^_\n]*?)_(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[+i]);
}

// ── Tabel ──
const SEP_CELL = /^\s*:?-{2,}:?\s*$/;
function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  const cells = []; let cur = '', tick = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '`') tick = !tick;
    if (c === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '|' && !tick) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}
const isSepRow = (line) => /\|/.test(line) && /-/.test(line) && splitRow(line).every((c) => SEP_CELL.test(c));
const looksRow = (line) => /\|/.test(line) && line.trim().length > 2;
const isPipeLine = (line) => /^\s*\|.*\|\s*$/.test(line);

function renderTable(rows, aligns) {
  const n = rows[0].length;
  const fix = (r) => { r = r.slice(0, n); while (r.length < n) r.push(''); return r; };
  const al = (i) => (aligns[i] ? ` style="text-align:${aligns[i]}"` : '');
  const th = rows[0].map((c, i) => `<th scope="col"${al(i)}>${inline(c)}</th>`).join('');
  const body = rows.slice(1).map((r) => `<tr>${fix(r).map((c, i) => `<td${al(i)}>${inline(c) || '&nbsp;'}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap" role="region" aria-label="Tabel" tabindex="0"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ── Daftar bertingkat ──
const LIST_RE = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;
function buildList(items) {
  let html = ''; const stack = [];
  const closeTop = () => { const t = stack.pop(); html += (t.li ? '</li>' : '') + `</${t.type}>`; };
  for (const it of items) {
    while (stack.length && it.indent < stack[stack.length - 1].indent) closeTop();
    let top = stack[stack.length - 1];
    if (top && it.indent === top.indent && top.type !== it.type) { closeTop(); top = stack[stack.length - 1]; }
    if (!top || it.indent > top.indent || top.indent !== it.indent) {
      html += it.type === 'ol' && it.num > 1 ? `<ol start="${it.num}">` : `<${it.type}>`;
      stack.push({ indent: it.indent, type: it.type, li: false }); top = stack[stack.length - 1];
    } else if (top.li) { html += '</li>'; top.li = false; }
    const task = it.text.match(/^\[([ xX])\]\s+(.*)$/);
    html += task
      ? `<li class="task${/x/i.test(task[1]) ? ' done' : ''}"><span class="box" aria-hidden="true"></span>${inline(task[2])}`
      : `<li>${inline(it.text)}`;
    top.li = true;
    if (it.extra.length) html += '<br>' + it.extra.map(inline).join('<br>');
  }
  while (stack.length) closeTop();
  return html;
}

const CALL = /^\s*(?:\[(ALERT|SUCCESS|INFO)\]|(⚠️|⚠)|(✅|✔️))\s*/i;
const isBlockStart = (l) => /^\u0000\d+\u0000$/.test(l) || /^(#{1,6})\s/.test(l) || /^\s*(---+|\*\*\*+|___+)\s*$/.test(l) || LIST_RE.test(l) || /^&gt;/.test(l) || CALL.test(l);

export function renderRich(raw) {
  let src = String(raw ?? '').replace(/🍄/g, '').replace(/\r/g, '');
  const blocks = [];
  // 1. blok kode berpagar (termasuk yang belum ditutup saat mengetik)
  src = src.replace(/(?:```|~~~)([\w+#.-]*)[^\n]*\n([\s\S]*?)(?:```|~~~|$)/g, (_, lang, code) => {
    blocks.push(codeBlock(code.replace(/\n$/, ''), lang));
    return `\n\u0000${blocks.length - 1}\u0000\n`;
  });
  // 2. escape semua sisanya
  src = esc(src);
  const lines = src.split('\n');
  let html = '', para = [];
  const flushP = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    if (ph) { flushP(); html += blocks[+ph[1]]; continue; }
    if (!line.trim()) { flushP(); continue; }

    // callout
    const c = line.match(CALL);
    if (c) {
      flushP();
      const type = c[1] ? c[1].toLowerCase() : c[2] ? 'alert' : 'success';
      const body = [line.replace(CALL, '')];
      while (i + 1 < lines.length && lines[i + 1].trim() && !isBlockStart(lines[i + 1]) && !isPipeLine(lines[i + 1])) body.push(lines[++i]);
      html += `<div class="callout ${type}" role="${type === 'alert' ? 'alert' : 'note'}">${ICONS[type]}<div>${body.map(inline).join('<br>')}</div></div>`;
      continue;
    }

    // tabel (GFM) — juga menoleransi tabel tanpa baris pemisah
    if (looksRow(line) && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      flushP();
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((s) => { const t = s.trim(); return t.startsWith(':') && t.endsWith(':') ? 'center' : t.endsWith(':') ? 'right' : t.startsWith(':') ? 'left' : ''; });
      const rows = [head]; i += 2;
      while (i < lines.length && looksRow(lines[i]) && !isSepRow(lines[i])) rows.push(splitRow(lines[i++]));
      i--; html += renderTable(rows, aligns); continue;
    }
    if (isPipeLine(line) && i + 1 < lines.length && isPipeLine(lines[i + 1])) {
      flushP(); const rows = [];
      while (i < lines.length && isPipeLine(lines[i])) { if (!isSepRow(lines[i])) rows.push(splitRow(lines[i])); i++; }
      i--; if (rows.length > 1) html += renderTable(rows, []); else html += `<p>${inline(rows[0].join(' | '))}</p>`; continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { flushP(); const lv = h[1].length <= 2 ? 3 : h[1].length === 3 ? 4 : 5; html += `<h${lv}>${inline(h[2])}</h${lv}>`; continue; }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { flushP(); html += '<hr>'; continue; }

    // daftar (bertingkat, bisa dipisah baris kosong)
    if (LIST_RE.test(line)) {
      flushP(); const items = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (m) {
          const ind = m[1].replace(/\t/g, '    ').length;
          items.push({ indent: ind, type: /\d/.test(m[2]) ? 'ol' : 'ul', num: parseInt(m[2], 10) || 1, text: m[3], extra: [] }); i++; continue;
        }
        if (!lines[i].trim()) { // baris kosong: lanjut jika setelahnya masih item daftar
          let j = i + 1; while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && LIST_RE.test(lines[j])) { i = j; continue; }
          break;
        }
        if (/^\s+\S/.test(lines[i]) && !isBlockStart(lines[i]) && !isPipeLine(lines[i])) { items[items.length - 1].extra.push(lines[i].trim()); i++; continue; }
        break;
      }
      i--; html += buildList(items); continue;
    }

    // kutipan (beberapa baris jadi satu blok)
    if (/^&gt;/.test(line)) {
      flushP(); const q = [];
      while (i < lines.length && /^&gt;/.test(lines[i])) q.push(lines[i++].replace(/^&gt;\s?/, ''));
      i--; html += `<blockquote>${q.map(inline).join('<br>')}</blockquote>`; continue;
    }
    para.push(line);
  }
  flushP();
  return html;
}

// ── Filter suara: buang semua markup, ringkas, ramah anak ──
const EMOJI = /[\p{Extended_Pictographic}\u200d\ufe0f]/gu;
export function toSpeech(raw, maxChars = 480) {
  let hadCode = false, hadTable = false;
  let t = String(raw ?? '')
    .replace(/```[\s\S]*?(```|$)/g, () => { hadCode = true; return ' '; })
    .replace(/^\s*\|.*\|\s*$/gm, () => { hadTable = true; return ' '; })
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
  if (cut || hadCode || hadTable) out += (/[.!?]$/.test(out) ? ' ' : '. ') + (hadCode ? 'Kodenya sudah aku taruh di chat ya.' : hadTable ? 'Tabelnya ada di chat ya.' : 'Selengkapnya ada di chat ya.');
  return out || 'Hmm, aku belum bisa menjawabnya. Coba tanya lagi ya.';
}
