/* FirstShift Route (and Route+): the simple log as a PDF, in the style of the RYA's own log pages (Route catch-up stage 2,
   Stuart 13 Nov: "the simple log with RYA-style PDF"). From a filed track or the trail now: an entry every hour on the hour and at the
   start and end, with time, position, course and speed made good over the hour, distance run, the forecast wind there and then,
   and remarks (dead reckoning, a gap in the GPS). A header block for the boat, the race, the skipper and the crew to fill in by hand.
   Built overnight 15 to 16 Nov. The PDF is written here, by a few lines of code, with the standard Helvetica font: no library. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function nm(a, b) { var R = 3440.065, la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180, dl = (b[0] - a[0]) * Math.PI / 180, dn = (b[1] - a[1]) * Math.PI / 180; var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); }
  function brg(a, b) { var y = Math.sin((b[1] - a[1]) * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180), x = Math.cos(a[0] * Math.PI / 180) * Math.sin(b[0] * Math.PI / 180) - Math.sin(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.cos((b[1] - a[1]) * Math.PI / 180); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
  function ddm(v, p, n) { var a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; if (m >= 59.995) { d++; m = 0; } return d + '°' + (m < 10 ? '0' : '') + m.toFixed(2) + "'" + (v >= 0 ? p : n); }
  function z(n) { return ('0' + n).slice(-2); }
  function hhmm(t) { var d = new Date(t); return z(d.getUTCHours()) + z(d.getUTCMinutes()); }
  /* the entries: every whole hour UTC between the first and last point, plus the first and last */
  function entries(pts) {
    if (!pts || pts.length < 2) return [];
    var at = function (t) { for (var i = 1; i < pts.length; i++) if (pts[i][2] >= t) { var a = pts[i - 1], b = pts[i], f = b[2] === a[2] ? 0 : (t - a[2]) / (b[2] - a[2]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, t, i]; } return pts[pts.length - 1].concat([pts.length - 1]); };
    var t0 = pts[0][2], t1 = pts[pts.length - 1][2], times = [t0], h = Math.ceil(t0 / 3600000) * 3600000; for (; h < t1; h += 3600000) if (h - t0 > 120000) times.push(h); if (t1 - times[times.length - 1] > 60000) times.push(t1);
    var out = [], run = 0, prev = null, k0 = 0;
    times.forEach(function (t, j) {
      var p = at(t), seg = 0, gap = 0, k1 = p[3];
      if (prev) { if (k1 > k0) { seg = nm(prev, pts[k0]); for (var i = k0 + 1; i < k1; i++) { seg += nm(pts[i - 1], pts[i]); if (pts[i][2] - pts[i - 1][2] > 600000) gap = Math.max(gap, pts[i][2] - pts[i - 1][2]); } seg += nm(pts[k1 - 1], p); if (pts[k0][2] - prev[2] > 600000) gap = Math.max(gap, pts[k0][2] - prev[2]); } else seg = nm(prev, p); }   /* the track between the two entries, each piece once */
      run += seg; var hrs = prev ? (t - prev[2]) / 3600000 : 0;
      var w = null; try { w = window.__fsWindAt ? window.__fsWindAt(p[0], p[1], t / 1000) : null; } catch (e) {}
      out.push({ t: t, la: p[0], lo: p[1], cmg: prev ? Math.round(brg(prev, p)) : null, smg: prev && hrs > 0.05 ? nm(prev, p) / hrs : null, run: run, wind: w, rem: (j === 0 ? 'Log starts' : j === times.length - 1 ? 'Log ends' : '') + (gap ? (j === 0 || j === times.length - 1 ? '; ' : '') + 'GPS gap ' + Math.round(gap / 60000) + ' min' : '') });
      prev = p; k0 = k1;
    });
    return out;
  }
  /* ---- a small PDF writer: A4 landscape pages of Helvetica text and lines ---- */
  function pdf(pages) {
    var objs = [], add = function (s) { objs.push(s); return objs.length; };
    var font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    var pagesId = objs.length + 1; objs.push(null); var kids = [];
    pages.forEach(function (ops) { var st = ops.join('\n'), c = add('<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream'); kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ' + font + ' 0 R /F2 ' + bold + ' 0 R >> >> /Contents ' + c + ' 0 R >>')); });
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';
    var cat = add('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var x = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('000000000' + o).slice(-10) + ' 00000 n \n'; }).join('') + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
    var u = new Uint8Array(out.length); for (var i = 0; i < out.length; i++) { var ch = out.charCodeAt(i); u[i] = ch < 256 ? ch : 63; } return u;
  }
  function tx(s) { return String(s).replace(/[\\()]/g, '\\$&').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\xff]/g, '?'); }
  function text(x, y, s, size, b) { return 'BT /' + (b ? 'F2' : 'F1') + ' ' + (size || 9) + ' Tf ' + x + ' ' + y + ' Td (' + tx(s) + ') Tj ET'; }
  function line(x1, y1, x2, y2, w) { return (w || 0.5) + ' w ' + x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S'; }
  var COLS = [['Time UTC', 50], ['Position', 150], ['Course made good °T', 70], ['Speed made good kn', 70], ['Distance run nm', 65], ['Forecast wind', 85], ['Baro hPa', 50], ['Remarks', 222]];
  function build(t) {
    var E = entries(t.pts), pages = [], per = 26, d0 = new Date(t.at), title = 'Log: ' + (t.name || 'Track') + ', ' + d0.toUTCString().slice(5, 16);
    for (var pg = 0; pg * per < Math.max(1, E.length); pg++) {
      var ops = ['0 0 0 RG 0 0 0 rg'], y = 560;
      ops.push(text(36, y, title, 14, true)); ops.push(text(650, y, 'FirstShift Route. Not for navigation.', 8)); y -= 18;
      if (pg === 0) {
        [['Yacht', 'Sail number'], ['Skipper', 'Navigator'], ['Crew', 'Class / rating']].forEach(function (r) { ops.push(text(36, y, r[0] + ':', 9, true)); ops.push(line(90, y - 2, 400, y - 2, 0.4)); ops.push(text(420, y, r[1] + ':', 9, true)); ops.push(line(500, y - 2, 806, y - 2, 0.4)); y -= 16; });
        ops.push(text(36, y, 'From the GPS track: ' + new Date(t.at).toUTCString().slice(17, 22) + ' to ' + new Date(t.end || t.at).toUTCString().slice(17, 22) + ' UTC, ' + t.nm.toFixed(1) + ' nm sailed. Course and speed are made good over the ground between entries; wind is the forecast at that place and time.', 8)); y -= 16;
      }
      var x = 36; ops.push(line(36, y + 10, 806, y + 10, 0.8)); COLS.forEach(function (c) { var w = c[0].split(' '), half = Math.ceil(w.length / 2); ops.push(text(x + 2, y, w.slice(0, half).join(' '), 8, true)); if (w.length > 1) ops.push(text(x + 2, y - 9, w.slice(half).join(' '), 8, true)); x += c[1]; });
      y -= 14; ops.push(line(36, y, 806, y, 0.8)); y -= 12;
      E.slice(pg * per, pg * per + per).forEach(function (e) {
        var cells = [hhmm(e.t), ddm(e.la, 'N', 'S') + ' ' + ddm(e.lo, 'E', 'W'), e.cmg == null ? '' : ('00' + e.cmg).slice(-3), e.smg == null ? '' : e.smg.toFixed(1), e.run.toFixed(1), e.wind ? Math.round(e.wind.tws) + ' kn ' + ('00' + Math.round(e.wind.twd)).slice(-3) + '°' : '', '', e.rem];
        x = 36; cells.forEach(function (v, i) { ops.push(text(x + 2, y, v, 9)); x += COLS[i][1]; }); ops.push(line(36, y - 5, 806, y - 5, 0.2)); y -= 17;
      });
      x = 36; COLS.forEach(function (c) { ops.push(line(x, 0, x, 0, 0)); x += c[1]; });
      ops.push(text(36, 24, 'Page ' + (pg + 1) + ' of ' + Math.max(1, Math.ceil(E.length / per)) + '. Times UTC. Positions from the phone\'s GPS; check against the chart.', 7));
      pages.push(ops);
    }
    return pdf(pages);
  }
  function fileName(t) { var d = new Date(t.at); return 'firstshift-log-' + d.getUTCFullYear() + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + '-' + z(d.getUTCHours()) + z(d.getUTCMinutes()) + '.pdf'; }
  function save(t) {
    var u = build(t), n = fileName(t);
    if (window.NativeLink && window.NativeLink.saveBytes) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); window.NativeLink.saveBytes(n, btoa(s), 'application/pdf'); return n; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'application/pdf' })); a.download = n; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return n;
  }
  window.FSLogPdf = { entries: entries, build: build, save: save, fileName: fileName };
})();
