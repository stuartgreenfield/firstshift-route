/* FirstShift entry lists and AIS matching (Stuart 22 Nov 15:17). Built on the Corrected tool's reader: paste, CSV, TSV, semicolon
   or .xlsx, a header row found by name, IRC sections only. Each boat can carry a sail number and an MMSI as well as name and TCC.
   AIS sends a boat's name as at most 20 characters of 6-bit ASCII: capitals, digits and a few marks, no accents, padded with @
   (ITU-R M.1371, USCG Navigation Center: Message 5 for Class A, Message 24 Part A for Class B). So a name is matched on capitals and
   digits only, cut to 20 characters, and a boat is matched once only when exactly one entry fits. window.FSENT */
(function () {
  var TCC_RE = /^[0-2][.,]\d{2,4}$/, SAIL_RE = /^[A-Z]{1,3}[ -]?\d{1,5}[A-Z]?$/i, MMSI_RE = /^\d{9}$/;
  var COLS = { n: /^(boat|yacht|boat name|yacht name|name|vessel)$/, t: /^(tcc|irc|irc tcc|rating|tcf)$/, c: /class|division/, s: /^sail|sail ?(no|number|#)/, m: /mmsi/ };
  function num(x) { return parseFloat(String(x || '').replace(',', '.')); }
  function okT(t) { return t >= 0.7 && t <= 2.2; }
  function splitLine(l) {
    if (l.indexOf('\t') >= 0) return l.split('\t');
    if (l.indexOf(';') >= 0) return l.split(';');
    var cells = [], q = false, c = '';
    for (var i = 0; i < l.length; i++) { var h = l[i]; if (h === '"') q = !q; else if (h === ',' && !q) { cells.push(c); c = ''; } else c += h; }
    cells.push(c); return cells;
  }
  function cells(l) {
    var c = splitLine(l).map(function (x) { return x.replace(/^"|"$/g, '').trim(); });
    if (c.length === 1) { var m = l.match(/^(.+?)[\s,]+([0-2][.,]\d{2,4})\b\s*(.*)$/); if (m) c = [m[1], m[2], m[3]]; }
    return c;
  }
  function colOf(low, re) { for (var i = 0; i < low.length; i++) if (re.test(low[i])) return i; return -1; }
  function header(c) {
    var low = c.map(function (x) { return x.toLowerCase(); }), h = {};
    Object.keys(COLS).forEach(function (k) { h[k] = colOf(low, COLS[k]); });
    if (h.n < 0) h.n = colOf(low, /boat|yacht|name/);
    return h.n >= 0 && h.t >= 0 ? h : null;
  }
  function section(c) {
    if (!c[0] || c.slice(1).some(function (x) { return x; })) return null;
    var m = c[0].match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*Total:\s*\d+$/i); if (!m) return null;
    return { irc: /^irc$/i.test(m[1].trim()), c: /overall/i.test(m[2]) ? '' : m[2].replace(/\s+for seasons scoring/i, '').trim() };
  }
  function byHeader(c, h) { var g = function (k) { return h[k] >= 0 ? c[h[k]] || '' : ''; }; return { name: g('n'), tcc: num(g('t')), cls: g('c'), sail: g('s'), mmsi: g('m') }; }
  function guessName(c, ti) { return c.filter(function (x, i) { return i !== ti && /[A-Za-z]/.test(x) && !/^(irc|class)\b/i.test(x) && !SAIL_RE.test(x); })[0] || ''; }
  function guess(c) {
    var ti = -1; c.forEach(function (x, i) { if (ti < 0 && TCC_RE.test(x) && okT(num(x))) ti = i; });
    if (ti < 0) return null;
    var pick = function (re) { return c.filter(function (x, i) { return i !== ti && re.test(x); })[0] || ''; };
    return { name: guessName(c, ti), tcc: num(c[ti]), cls: pick(/^(irc|class)\b/i), sail: c.filter(function (x, i) { return i !== ti && SAIL_RE.test(x) && !/^(irc|orc|class)\b/i.test(x); })[0] || '', mmsi: pick(MMSI_RE) };
  }
  function tidy(b) {
    var name = String(b.name || '').trim(), mmsi = String(b.mmsi || '').replace(/\D/g, '');
    if (!name || !okT(b.tcc)) return null;
    return { name: name, tcc: Math.round(b.tcc * 1000) / 1000, cls: String(b.cls || '').trim(), sail: String(b.sail || '').trim().toUpperCase(), mmsi: MMSI_RE.test(mmsi) ? +mmsi : null };
  }
  /* returns { boats: [{name, tcc, cls, sail, mmsi}], skip: lines not read, other: non-IRC boats left out } */
  function parse(text) {
    var R = { boats: [], skip: 0, other: 0 }, hdr = null, sec = null, done = {};
    String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l, idx) {
      var c = cells(l), s = section(c);
      if (s) { sec = s; return; }
      if (!hdr && idx < 5 && (hdr = header(c))) return;
      var b = tidy((hdr ? byHeader(c, hdr) : guess(c)) || {});
      if (!b) { if (idx >= 5 || hdr) R.skip++; return; }
      if (sec && !sec.irc) { R.other++; return; }
      if (sec && !b.cls) b.cls = sec.c;
      var k = b.name.toUpperCase(); if (done[k]) return; done[k] = 1; R.boats.push(b);
    });
    return R;
  }
  /* --- .xlsx, read in the browser (from Corrected) --- */
  function zipIndex(buf) {
    var d = new DataView(buf), i = buf.byteLength - 22; while (i >= 0 && d.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error('zip');
    var n = d.getUint16(i + 10, true), p = d.getUint32(i + 16, true), o = {};
    for (var k = 0; k < n; k++) { var nl = d.getUint16(p + 28, true), xl = d.getUint16(p + 30, true), cl = d.getUint16(p + 32, true), name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl)); o[name] = { m: d.getUint16(p + 10, true), cs: d.getUint32(p + 20, true), off: d.getUint32(p + 42, true) }; p += 46 + nl + xl + cl; }
    return o;
  }
  function zipText(buf, e) {
    var d = new DataView(buf), st = e.off + 30 + d.getUint16(e.off + 26, true) + d.getUint16(e.off + 28, true), b = new Uint8Array(buf, st, e.cs);
    if (e.m === 0) return Promise.resolve(new TextDecoder().decode(b));
    return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  function tags(x, t) { return Array.prototype.slice.call(x.getElementsByTagNameNS('*', t)); }
  function xml(t) { return new DOMParser().parseFromString(t, 'application/xml'); }
  function colNo(ref) { var col = 0; for (var i = 0; i < ref.length; i++) col = col * 26 + ref.charCodeAt(i) - 64; return col; }
  function cellVal(c, ss) {
    var ty = c.getAttribute('t'), v = tags(c, 'v')[0];
    if (ty === 's') return v ? ss[parseInt(v.textContent, 10)] || '' : '';
    if (ty === 'inlineStr') return tags(c, 't').map(function (t) { return t.textContent; }).join('');
    if (!v) return '';
    var val = v.textContent, nm = Number(val);
    return ty !== 'str' && isFinite(nm) && val !== '' ? String(parseFloat(nm.toFixed(6))) : val;
  }
  function rowText(row, ss) {
    var out = [];
    tags(row, 'c').forEach(function (c) { var col = colNo((c.getAttribute('r') || '').replace(/\d/g, '')) || out.length + 1; while (out.length < col - 1) out.push(''); out[col - 1] = String(cellVal(c, ss)).replace(/[\t\r\n]+/g, ' '); });
    return out.join('\t');
  }
  function sheets(z) { return Object.keys(z).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/i.test(n); }).sort(function (a, b) { return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); }); }
  function readXlsx(buf) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('old'));
    var z = zipIndex(buf), names = sheets(z); if (!names.length) return Promise.reject(new Error('sheet'));
    var sst = z['xl/sharedStrings.xml'] ? zipText(buf, z['xl/sharedStrings.xml']) : Promise.resolve('');
    return Promise.all([sst, zipText(buf, z[names[0]])]).then(function (a) {
      var ss = a[0] ? tags(xml(a[0]), 'si').map(function (si) { return tags(si, 't').map(function (t) { return t.textContent; }).join(''); }) : [];
      return tags(xml(a[1]), 'row').map(function (r) { return rowText(r, ss); }).join('\n');
    });
  }
  /* a file from the picker: .xlsx, CSV or text, or a Corrected backup. Resolves to text for parse(), or rejects with words to show */
  function fileText(buf) {
    var u = new Uint8Array(buf);
    if (u[0] === 0x50 && u[1] === 0x4B) return readXlsx(buf).catch(function () { throw new Error('That spreadsheet could not be read. Copy its rows and paste them into the box instead.'); });
    if (u[0] === 0xD0 && u[1] === 0xCF) return Promise.reject(new Error('That is an old .xls file. Save it as .xlsx or CSV, or paste its rows into the box.'));
    var t = new TextDecoder().decode(u).replace(/^﻿/, '');
    return Promise.resolve(/^\s*\{/.test(t) && t.indexOf('firstshiftCorrected') >= 0 ? fromBackup(t) : t);
  }
  function fromBackup(t) { var o = JSON.parse(t), out = []; (o.lists || []).forEach(function (l) { (l.boats || []).forEach(function (b) { out.push(b.n + '\t' + b.t + '\t' + (b.c || '')); }); }); return 'Boat\tTCC\tClass\n' + out.join('\n'); }

  /* --- matching an AIS name to the list --- */
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
  function key(s) { return fold(s).replace(/@+\s*$/, '').replace(/[^A-Z0-9]/g, ''); }
  var DROP = /^(S\/?Y|S\/?V|M\/?Y|YACHT|SAILING YACHT)\s+/;
  function bare(s) { return key(fold(s).replace(/@+\s*$/, '').trim().replace(DROP, '').split(/\s+/).filter(function (w) { return !SAIL_RE.test(w); }).join(' ')); }
  function keys(e) { var f = fold(e.name), k = { full: key(f), cut: key(f.slice(0, 20)), bare: bare(f) }; k.sail = e.sail ? key(e.sail) : ''; return k; }
  function near(a, b) {   /* one letter different, missing or added, for names of 6 or more */
    if (a.length < 6 || b.length < 6 || Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  function level(x, k) {   /* 3 MMSI, 2 the name as AIS sends it, 1 a close name; 0 no match */
    var n = key(x.name), b = bare(x.name);
    if (!n) return 0;
    if (n === k.full || n === k.cut || (k.sail && n === k.sail)) return 2;
    if (b && (b === k.bare || b === k.full)) return 2;
    if ((n.length >= 6 && (k.full.indexOf(n) === 0 || n.indexOf(k.full) === 0)) || near(n, k.cut) || near(b, k.bare)) return 1;
    return 0;
  }
  function best(x, list, no) {
    var top = 0, hits = [];
    list.forEach(function (e) { var l = e.mmsi && +e.mmsi === +x.mmsi ? 3 : e.mmsi && x.mmsi ? 0 : level(x, e.k || (e.k = keys(e))); if (l && no[x.mmsi + '|' + e.name.toUpperCase()]) l = 0; if (l > top) { top = l; hits = [e]; } else if (l && l === top) hits.push(e); });
    return hits.length === 1 ? { e: hits[0], how: ['', 'close', 'name', 'mmsi'][top] } : null;
  }
  /* list: entries with name, tcc and maybe mmsi and sail. no: pairs 'mmsi|NAME' the user said are wrong. Returns { mmsi: {e, how} } */
  function match(targets, list, no) {
    var out = {}; no = no || {};
    targets.forEach(function (x) { var m = best(x, list, no); if (m) out[x.mmsi] = m; });
    return out;
  }
  window.FSENT = { parse: parse, fileText: fileText, readXlsx: readXlsx, key: key, match: match, near: near };
})();
