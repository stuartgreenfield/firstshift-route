/* FirstShift Route sail editor. A table for the sail log (each sail's true wind angles and true wind speeds), simple reef points
   for the mainsail, a crossover chart that shows which sail wins for every wind, with this route's winds as dots, and a text
   view for pasting a chart from Expedition, PredictWind or SailGrib. It writes the two plain text boxes the router reads
   (#sails and #mains: name, TWA from, TWA to, TWS from, TWS to), so saving, boat codes and the router are unchanged. */
(function (root) {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var TOP = 60;   // a TWS "to" of 60 means no top limit

  var PRESETS = {
    asym: { name: 'Asymmetric kites on a bowsprit', rows: [['J1', 0, 65, 0, 13], ['J2', 0, 65, 13, 19], ['J3', 0, 65, 19, TOP], ['Code 0', 65, 100, 0, 14], ['J2 reaching', 65, 100, 14, TOP],
      ['A3', 100, 125, 0, 20], ['J3 reaching', 100, 125, 20, TOP], ['A2', 125, 180, 0, 18], ['A4', 125, 180, 18, TOP]] },
    sym: { name: 'Symmetric spinnaker on a pole', rows: [['Genoa', 0, 70, 0, 14], ['Jib', 0, 70, 14, 22], ['No 3 jib', 0, 70, 22, TOP], ['Genoa reaching', 70, 100, 0, 16], ['Jib reaching', 70, 100, 16, TOP],
      ['Reaching spinnaker', 100, 135, 0, 18], ['Jib broad reach', 100, 135, 18, TOP], ['Running spinnaker', 135, 180, 0, 20], ['Heavy spinnaker', 135, 180, 20, 28], ['Jib poled out', 135, 180, 28, TOP]] },
    white: { name: 'White sails only', rows: [['Genoa', 0, 180, 0, 15], ['Jib', 0, 180, 15, 25], ['Storm jib', 0, 180, 25, TOP]] },
    none: { name: 'Empty table', rows: [] }
  };
  /* Reef starting points: John Jourdane's Pacific Cup guide, "Sailing under control as the wind increases": first reef at 20 kn true upwind and
     25 kn downwind, second at 30, third or trysail at 35. Upwind here means a true wind angle below the split angle. */
  var REEF0 = { split: 90, r: [[20, 25], [30, 30], [35, 35]] };

  function parse(text) {
    var out = [];
    (text || '').split(/\r?\n/).forEach(function (l) {
      l = l.replace(/#.*/, '').trim(); if (!l) return;
      var p = l.split(/[,;\t]/).map(function (s) { return s.trim(); }); if (p.length < 5 || isNaN(+p[1])) return;
      out.push([p[0], +p[1], +p[2], +p[3], +p[4]]);
    });
    return out;
  }
  var num = function (v) { return Math.round(v * 10) / 10; };
  function write(rows) { return '# sail, twa from, twa to, tws from, tws to\n' + rows.map(function (r) { return [r[0] || 'Sail', num(r[1]), num(r[2]), num(r[3]), num(r[4])].join(', '); }).join('\n'); }

  /* A grid chart (SailGrib .sail, Expedition or a spreadsheet): first line TWS values, then one line per TWA starting with the angle,
     then the sail for each TWS. Each cell becomes a box from this angle and speed to the next; boxes of the same sail along a row merge. */
  function fromGrid(text) {
    var L = text.split(/\r?\n/).map(function (l) { return l.split(/[\t,;]/).map(function (s) { return s.trim(); }); }).filter(function (p) { return p.join('') !== ''; });
    if (L.length < 3) return null;
    var head = L[0].slice(1).map(Number); if (head.length < 2 || head.some(isNaN)) return null;
    var body = L.slice(1).filter(function (p) { return !isNaN(+p[0]) && p[0] !== ''; }); if (body.length < 2 || body.length < L.length - 2) return null;
    var twa = body.map(function (p) { return +p[0]; }), rows = [];
    body.forEach(function (p, i) {
      var a0 = i ? (twa[i - 1] + twa[i]) / 2 : 0, a1 = i < body.length - 1 ? (twa[i] + twa[i + 1]) / 2 : 180;
      for (var j = 0; j < head.length; j++) {
        var s = p[j + 1]; if (!s || s === '-' || s === '0') continue;
        var w0 = j ? (head[j - 1] + head[j]) / 2 : 0, k = j; while (k + 1 < head.length && p[k + 2] === s) k++;
        var w1 = k < head.length - 1 ? (head[k] + head[k + 1]) / 2 : TOP; rows.push([s, Math.round(a0), Math.round(a1), num(w0), num(w1)]); j = k;
      }
    });
    return rows.length ? rows : null;
  }

  function reefRows(rf) {
    var s = rf.split, out = [], lim = [[0, s], [s, 180]];
    lim.forEach(function (ab, side) {
      var from = 0, name = 'Full main';
      rf.r.forEach(function (x, i) { var w = x[side]; if (w > from) { out.push([name, ab[0], ab[1], from, w]); from = w; name = 'Reef ' + (i + 1); } });
      out.push([name, ab[0], ab[1], from, TOP]);
    });
    return out;
  }
  function readReefs(rows) {
    var rf = { split: REEF0.split, r: [[0, 0], [0, 0], [0, 0]] };
    rows.forEach(function (r) { if (r[1] === 0 && r[2] > 0 && r[2] < 180) rf.split = r[2]; });
    rows.forEach(function (r) { var m = /^reef\s*(\d)/i.exec(r[0]); if (!m || m[1] < 1 || m[1] > 3) return; rf.r[m[1] - 1][r[1] > 0 ? 1 : 0] = r[3]; });
    return rf;
  }

  function winner(rows, a, w) { for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (a >= r[1] && (a < r[2] || (r[2] >= 180 && a <= 180)) && w >= r[3] && w < r[4]) return i; } return -1; }

  var E = { rows: [], reef: null, pts: function () { return []; }, onChange: function () {}, armed: null };

  function colours() {
    var cs = getComputedStyle(document.documentElement), out = [];
    for (var i = 1; i <= 8; i++) out.push(cs.getPropertyValue('--m' + i).trim() || '#5CB8E0');
    return out.concat(['#9BC53D', '#E55934', '#5BC0EB', '#C3423F', '#7D5BA6', '#F7B32B']);
  }

  function save(why) {
    $('sails').value = write(E.rows); $('mains').value = E.reef ? write(reefRows(E.reef)) : '# no reefs set';
    try { localStorage.setItem('fs-sails', $('sails').value); localStorage.setItem('fs-mains', $('mains').value); } catch (e) {}
    draw(); E.onChange(why);
  }

  function table() {
    var h = '<div class="sl-h"><span>Sail</span><span>TWA<br>from</span><span>TWA<br>to</span><span>TWS<br>from</span><span>TWS<br>to</span><span></span></div>', C = colours();
    E.rows.forEach(function (r, i) {
      h += '<div class="sl-r" data-i="' + i + '"><span class="sw" style="background:' + C[i % C.length] + '"></span><input class="sl-n" data-k="0" value="' + esc(r[0]) + '" aria-label="Sail name" maxlength="24">' +
        [1, 2, 3, 4].map(function (k) { var v = r[k]; if (k === 4 && v >= TOP) v = ''; return '<input type="number" inputmode="decimal" data-k="' + k + '" value="' + v + '" min="0" max="' + (k < 3 ? 180 : 80) + '" step="1"' + (k === 4 ? ' placeholder="any"' : '') + ' aria-label="' + ['', 'TWA from', 'TWA to', 'TWS from', 'TWS to'][k] + '">'; }).join('') +
        '<span class="sl-b"><button class="slb" data-a="up" title="Move up: rows are checked from the top"' + (i ? '' : ' disabled') + '>↑</button><button class="slb" data-a="del" title="Remove this sail">✕</button></span></div>';
    });
    if (!E.rows.length) h += '<p class="note">No sails yet. Add one, or start from a typical inventory above.</p>';
    $('slTable').innerHTML = h;
    [].forEach.call($('slTable').querySelectorAll('input'), function (el) {
      el.oninput = function () { var i = +el.closest('.sl-r').dataset.i, k = +el.dataset.k; E.rows[i][k] = k ? (el.value === '' ? (k === 4 ? TOP : 0) : +el.value) : el.value; save('edit'); };
    });
    [].forEach.call($('slTable').querySelectorAll('button'), function (b) {
      b.onclick = function () { var i = +b.closest('.sl-r').dataset.i; if (b.dataset.a === 'del') E.rows.splice(i, 1); else if (i) E.rows.splice(i - 1, 0, E.rows.splice(i, 1)[0]); table(); save('edit'); };
    });
  }
  function reefTable() {
    var on = !!E.reef, rf = E.reef || REEF0;
    $('rfOn').checked = on; $('rfBox').hidden = !on;
    $('rfSplit').value = rf.split;
    $('rfRows').innerHTML = '<div class="rf-h"><span></span><span>Upwind,<br>from TWS</span><span>Downwind,<br>from TWS</span></div>' + rf.r.map(function (x, i) {
      return '<div class="rf-r"><span>Reef ' + (i + 1) + '</span><input type="number" inputmode="decimal" data-i="' + i + '" data-s="0" value="' + (x[0] || '') + '" placeholder="none" min="0" max="80"><input type="number" inputmode="decimal" data-i="' + i + '" data-s="1" value="' + (x[1] || '') + '" placeholder="none" min="0" max="80"></div>';
    }).join('');
    [].forEach.call($('rfRows').querySelectorAll('input'), function (el) { el.oninput = function () { E.reef.r[+el.dataset.i][+el.dataset.s] = +el.value || 0; save('reef'); }; });
  }

  function draw() {
    var cv = $('slChart'); if (!cv) return;
    var w = cv.clientWidth; if (!w) return;
    var hgt = Math.round(Math.min(320, Math.max(200, w * 0.62))), dpr = window.devicePixelRatio || 1;
    cv.style.height = hgt + 'px'; cv.width = w * dpr; cv.height = hgt * dpr;
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hgt);
    var cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--ink').trim() || '#fff', muted = cs.getPropertyValue('--muted').trim() || '#999', line = cs.getPropertyValue('--line').trim() || '#444';
    var L = 34, B = 26, T = 18, Rr = 16, pw = w - L - Rr, ph = hgt - T - B, WMAX = 40, C = colours();
    var X = function (a) { return L + a / 180 * pw; }, Y = function (s) { return T + ph - Math.min(s, WMAX) / WMAX * ph; };
    var cells = {}, gaps = [], NA = 90, NW = 40;
    for (var i = 0; i < NA; i++) for (var j = 0; j < NW; j++) {
      var a = (i + 0.5) * 180 / NA, s = (j + 0.5) * WMAX / NW, k = winner(E.rows, a, s);
      if (k < 0) { gaps.push([i, j]); continue; }
      g.fillStyle = C[k % C.length];
      g.fillRect(Math.floor(X(i * 180 / NA)), Math.floor(Y((j + 1) * WMAX / NW)), Math.ceil(pw / NA) + 1, Math.ceil(ph / NW) + 1);
      if (k >= 0) { var c = cells[k] || (cells[k] = { n: 0, a: 0, s: 0 }); c.n++; c.a += a; c.s += s; }
    }
    g.globalAlpha = 0.4; g.fillStyle = cs.getPropertyValue('--soft').trim() || '#223B53'; g.fillRect(L, T, pw, ph); g.globalAlpha = 1;
    g.fillStyle = 'rgba(128,128,128,.28)'; gaps.forEach(function (c) { g.fillRect(Math.floor(X(c[0] * 180 / NA)), Math.floor(Y((c[1] + 1) * WMAX / NW)), Math.ceil(pw / NA) + 1, Math.ceil(ph / NW) + 1); });
    g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = muted; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    [0, 30, 60, 90, 120, 150, 180].forEach(function (a) { g.beginPath(); g.moveTo(X(a), T); g.lineTo(X(a), T + ph); g.globalAlpha = 0.35; g.stroke(); g.globalAlpha = 1; g.fillText(a + '°', X(a), T + ph + 5); });
    g.textAlign = 'right'; g.textBaseline = 'middle';
    [0, 10, 20, 30, 40].forEach(function (s) { g.beginPath(); g.moveTo(L, Y(s)); g.lineTo(L + pw, Y(s)); g.globalAlpha = 0.35; g.stroke(); g.globalAlpha = 1; g.fillText(s + (s === 40 ? '+' : ''), L - 5, Y(s)); });
    if (E.reef) { g.setLineDash([4, 3]); g.strokeStyle = ink; g.globalAlpha = 0.7; g.fillStyle = ink; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.font = '10px system-ui, sans-serif';
      E.reef.r.forEach(function (x, i) { [[0, E.reef.split], [E.reef.split, 180]].forEach(function (ab, sd) { var v = x[sd]; if (!v || v > WMAX) return; g.beginPath(); g.moveTo(X(ab[0]), Y(v)); g.lineTo(X(ab[1]), Y(v)); g.stroke(); g.fillText('R' + (i + 1), X(ab[0]) + 3, Y(v) - 1); }); });
      g.setLineDash([]); g.globalAlpha = 1; }
    var P = E.pts() || [], miss = 0;
    g.fillStyle = ink;
    P.forEach(function (q) { if (q.twa == null) return; var a = Math.abs(q.twa), s = q.tws; if (winner(E.rows, a, s) < 0) miss++; g.globalAlpha = 0.75; g.beginPath(); g.arc(X(a), Y(s), 1.8, 0, 7); g.fill(); });
    g.globalAlpha = 1; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.n < 6) return; var x = X(c.a / c.n), y = Y(c.s / c.n), t = E.rows[k][0]; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(t, x, y); g.fillStyle = '#fff'; g.fillText(t, x, y); });
    g.font = '11px system-ui, sans-serif'; g.fillStyle = muted; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('TWS kn', 2, 0);
    var n = P.filter(function (q) { return q.twa != null; }).length;
    $('slMiss').textContent = !n ? 'Dots show the chosen route’s winds once a route is worked out.' : miss ? Math.round(miss / n * 100) + '% of the chosen route’s winds have no sail set: the dots in the grey areas.' : 'Every wind on the chosen route has a sail.';
    $('slMiss').className = 'note' + (n && miss ? ' warnt' : '');
  }
  function tap(ev) {
    var cv = $('slChart'), b = cv.getBoundingClientRect(), L = 34, B = 26, T = 18, pw = b.width - L - 16, ph = b.height - T - B;
    var a = Math.round((ev.clientX - b.left - L) / pw * 180), s = Math.round((T + ph - (ev.clientY - b.top)) / ph * 40);
    if (a < 0 || a > 180 || s < 0 || s > 40) return;
    var k = winner(E.rows, a, s), m = '';
    if (E.reef) { var mr = reefRows(E.reef), j = winner(mr, a, s); if (j >= 0) m = ', ' + mr[j][0].toLowerCase(); }
    $('slAt').textContent = 'At ' + a + '° and ' + s + ' kn: ' + (k < 0 ? 'no sail set' : E.rows[k][0]) + m + '.';
  }

  function fromText() {
    var t = $('sails').value, g = /^[^\n,;\t]*[\t,;]\s*\d/.test(t) && !/^\s*#/.test(t) ? fromGrid(t) : null;
    if (g) { E.rows = g; $('sails').value = write(g); } else E.rows = parse(t);
    var mr = parse($('mains').value); E.reef = mr.length ? readReefs(mr) : null;
    table(); reefTable(); draw();
  }

  function init(o) {
    E.pts = o.pts || E.pts; E.onChange = o.onChange || E.onChange;
    try { var a = localStorage.getItem('fs-sails'), b = localStorage.getItem('fs-mains'); if (a) $('sails').value = a; if (b) $('mains').value = b; } catch (e) {}
    $('slPreset').innerHTML = '<option value="">Start from a typical inventory…</option>' + Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + PRESETS[k].name + '</option>'; }).join('');
    /* choosing an inventory applies it at once; Undo puts your own table back */
    $('slPreset').onchange = function () {
      var k = this.value; if (!k || !PRESETS[k]) return;
      E.undo = (E.rows || []).map(function (r) { return r.slice(); });
      E.rows = PRESETS[k].rows.map(function (r) { return r.slice(); }); table(); save('preset');
      $('slUse').hidden = false; $('slUse').textContent = 'Undo: put my ' + E.undo.length + ' sails back';
    };
    $('slUse').onclick = function () {
      if (!E.undo) { this.hidden = true; return; }
      E.rows = E.undo; E.undo = null; $('slPreset').value = ''; this.hidden = true; table(); save('edit');
    };
    $('slAdd').onclick = function () { var l = E.rows[E.rows.length - 1]; E.rows.push(['New sail', l ? l[1] : 0, l ? l[2] : 180, l ? l[4] < TOP ? l[4] : 0 : 0, TOP]); table(); save('edit'); var ins = $('slTable').querySelectorAll('.sl-n'); if (ins.length) { ins[ins.length - 1].focus(); ins[ins.length - 1].select(); } };
    $('rfOn').onchange = function () { E.reef = this.checked ? JSON.parse(JSON.stringify(E.reef || REEF0)) : null; reefTable(); save('reef'); };
    $('rfSplit').oninput = function () { if (E.reef) { E.reef.split = Math.max(30, Math.min(150, +this.value || 90)); save('reef'); } };
    $('rfReset').onclick = function () { E.reef = JSON.parse(JSON.stringify(REEF0)); reefTable(); save('reef'); };
    ['sails', 'mains'].forEach(function (id) { $(id).addEventListener('input', function () { fromText(); try { localStorage.setItem('fs-' + id, $(id).value); } catch (x) {} }); });
    $('slChart').onclick = tap;
    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe($('slChart')); else window.addEventListener('resize', draw);
    fromText();
  }

  function usePreset(k) { if (!PRESETS[k]) return; E.rows = PRESETS[k].rows.map(function (r) { return r.slice(); }); table(); save('preset'); }
  function reefs(on) { E.reef = on ? JSON.parse(JSON.stringify(E.reef || REEF0)) : null; reefTable(); save('reef'); }
  function summary() { return { sails: E.rows.length, names: E.rows.map(function (r) { return r[0]; }), reef: !!E.reef }; }
  root.FSSails = { usePreset: usePreset, reefs: reefs, summary: summary, init: init, draw: draw, fromGrid: fromGrid, parse: parse, reefRows: reefRows, winner: winner, PRESETS: PRESETS };
})(this);
