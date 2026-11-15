/* FirstShift Route and Navigate: the deck screen (Stuart 15 Nov 2026, 10:54, with a sketch; Q&A 12:40).
   "a deck screen option that put 4 big numbers above a map picture below, works in portrait and landscape mode - the map view can be
   changed to any of routes, plan, fleet or data views". The crew picks the four numbers (11:00); each box has a trend arrow, a colour
   against the polar target and a one-minute average (12:40); the view below changes by a button or a swipe; a DECK button on the chart.
   Portrait: the four numbers 2 by 2 above the view. Landscape: 2 by 2 beside it. Every figure comes from the same sums as the
   plotter bar and the instrument strip, so they agree. */
(function () {
  'use strict';
  var KEY = 'fs-deck', R = Math.PI / 180;
  function ld() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  var C = ld() || {}; if (!C.boxes || C.boxes.length !== 4) C.boxes = ['spd', 'hdg', 'dtw', 'perf']; if (!C.view) C.view = 'chart';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- where the figures come from ---- */
  function boat() { try { return window.__navBoat ? window.__navBoat() : null; } catch (e) { return null; } }
  function fresh(b, k) { return !!(b && b.age && b.age[k] != null && b.age[k] < 6000); }
  function bv(k) { var b = boat(); if (!fresh(b, k)) return null; try { var v = window.__navShown ? window.__navShown(k) : b[k]; return v == null || v !== v ? null : v; } catch (e) { return null; } }
  function fix() { try { var f = window.__fsLiveFix ? window.__fsLiveFix() : null; return f && Date.now() - f.at < 30000 ? f : null; } catch (e) { return null; } }
  var PL = null, PLat = 0;
  function plot() { if (Date.now() - PLat < 900) return PL; PLat = Date.now(); PL = null; try { if (window.__navPlot && window.__navPlot.calc) PL = window.__navPlot.calc(); else if (window.__fsPlot) PL = window.__fsPlot.calc(); } catch (e) {} return PL && PL.ok ? PL : null; }
  function pos() { var b = boat(); if (fresh(b, 'lat')) return { la: b.lat, lo: b.lon }; var f = fix(); return f ? { la: f.la, lo: f.lo } : null; }
  function fcWind() { var p = pos(); if (!p || !window.__fsWindAt) return null; var w = window.__fsWindAt(p.la, p.lo, Date.now() / 1000); return w; }
  function sog() { var v = bv('sog'); if (v != null) return v; var f = fix(); return f && f.sog != null ? f.sog : null; }
  function cog() { var v = bv('cog'); if (v != null) return v; var f = fix(); return f && f.cog != null ? f.cog : null; }
  function tws() { var v = bv('tws'); return v != null ? v : null; }
  function twa() { var v = bv('twa'); return v != null ? v : null; }
  function target() { try { return window.NavPolar && window.NavPolar.target ? window.NavPolar.target(tws(), twa()) : null; } catch (e) { return null; } }
  function dur(s) { if (s == null || s !== s) return null; var neg = s < 0; s = Math.abs(Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (neg ? '-' : '') + (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + x).slice(-2); }
  function deg(v) { return v == null ? null : ('00' + Math.round((v % 360 + 360) % 360)).slice(-3) + '°'; }
  /* each figure: label, unit, group, a function giving the number (or null), how to show it, whether it is an angle (averaged as one),
     and its target colour */
  var F = {
    spd: { l: 'SOG', u: 'kn', g: 'Speed and course', f: sog, d: 1 },
    cog: { l: 'COG', u: '°T', g: 'Speed and course', f: cog, ang: 1, show: deg },
    bsp: { l: 'BOAT SPEED', u: 'kn', g: 'Speed and course', f: function () { return bv('bsp'); }, d: 1, tgt: function (v) { var t = target(); return t ? v / t : null; }, need: 'boat' },
    hdg: { l: 'HEADING', u: '°', g: 'Speed and course', f: function () { var v = bv('hdg'); return v != null ? v : cog(); }, ang: 1, show: deg },
    perf: { l: '% OF POLAR', u: '%', g: 'Speed and course', f: function () { var b = bv('bsp'), t = target(); return b != null && t ? 100 * b / t : null; }, d: 0, tgt: function (v) { return v / 100; }, need: 'boat' },
    tgt: { l: 'TARGET SPEED', u: 'kn', g: 'Speed and course', f: target, d: 1, need: 'boat' },
    tws: { l: 'TWS', u: 'kn', g: 'Wind', f: function () { var v = tws(); if (v != null) return v; var w = fcWind(); return w ? w.tws : null; }, d: 1, fc: function () { return tws() == null; } },
    twa: { l: 'TWA', u: '°', g: 'Wind', f: function () { var v = twa(); if (v != null) return v; var w = fcWind(), c = cog(); return w && c != null ? ((w.twd - c + 540) % 360) - 180 : null; }, show: function (v) { return Math.abs(Math.round(v)) + '° ' + (v < 0 ? 'P' : 'S'); }, fc: function () { return twa() == null; } },
    twd: { l: 'TWD', u: '°T', g: 'Wind', f: function () { var v = bv('twd'); if (v != null) return v; var w = fcWind(); return w ? w.twd : null; }, ang: 1, show: deg, fc: function () { return bv('twd') == null; } },
    awa: { l: 'AWA', u: '°', g: 'Wind', f: function () { return bv('awa'); }, show: function (v) { return Math.abs(Math.round(v)) + '° ' + (v < 0 ? 'P' : 'S'); }, need: 'boat' },
    aws: { l: 'AWS', u: 'kn', g: 'Wind', f: function () { return bv('aws'); }, d: 1, need: 'boat' },
    dtw: { l: 'TO MARK', u: 'nm', g: 'Mark', f: function () { var p = plot(); return p ? p.dtw : null; }, d: 2, need: 'plot' },
    btw: { l: 'BEARING', u: '°T', g: 'Mark', f: function () { var p = plot(); return p ? p.btw : null; }, ang: 1, show: deg, need: 'plot' },
    vmc: { l: 'VMC', u: 'kn', g: 'Mark', f: function () { var p = plot(); return p ? p.vmc : null; }, d: 1, need: 'plot' },
    eta: { l: 'ETA MARK', u: 'UTC', g: 'Mark', f: function () { var p = plot(); return p && p.eta ? p.eta : null; }, show: function (v) { var d = new Date(v); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); }, noavg: 1, need: 'plot' },
    xte: { l: 'XTE', u: 'nm', g: 'Mark', f: function () { var p = plot(); return p && p.xte ? (p.xte.side === 'L' ? -p.xte.d : p.xte.d) : null; }, show: function (v) { return Math.abs(v).toFixed(2) + (v < 0 ? ' L' : ' R'); }, need: 'plot' },
    lay: { l: 'TO LAYLINE', u: 'min:s', g: 'Mark', f: function () { var p = plot(); return p && p.lay && p.lay.tA != null ? p.lay.tA * 3600 : null; }, show: dur, noavg: 1, need: 'plot' },
    gate: { l: 'TIDE GATE', u: '', g: 'Mark', f: function () { try { return window.__fsTideGate ? window.__fsTideGate() : null; } catch (e) { return null; } }, show: dur, noavg: 1, soon: 'Comes with the tide gate tool' },
    gun: { l: 'GUN', u: 'min:s', g: 'Race', f: function () { var t = window.__fsStartAt ? window.__fsStartAt() : null; return t ? t - Date.now() / 1000 : null; }, show: dur, noavg: 1 },
    dpt: { l: 'DEPTH', u: 'm', g: 'Race', f: function () { return bv('dpt'); }, d: 1, need: 'boat' },
    burn: { l: 'TIME TO BURN', u: 'min:s', g: 'Race', f: function () { try { return window.__fsBurn ? window.__fsBurn() : null; } catch (e) { return null; } }, show: dur, noavg: 1, soon: 'Ping both ends of the line first' },
    place: { l: 'PLACE (CORR.)', u: '', g: 'Race', f: function () { try { return window.__fsPlace ? window.__fsPlace() : null; } catch (e) { return null; } }, d: 0, noavg: 1, soon: 'Comes with the tide gate rivals table' }
  };
  var ORDER = ['spd', 'cog', 'bsp', 'hdg', 'perf', 'tgt', 'tws', 'twa', 'twd', 'awa', 'aws', 'dtw', 'btw', 'vmc', 'eta', 'xte', 'lay', 'gate', 'gun', 'dpt', 'burn', 'place'];
  var VIEWS = [['chart', 'Chart'], ['decision', 'Routes'], ['plan', 'Plan'], ['fleet', 'Fleet'], ['data', 'Data']];

  /* ---- history: the trend arrow and the one-minute average ---- */
  var H = {};
  function push(k, v) { var a = H[k] || (H[k] = []), t = Date.now(); if (v != null) a.push([t, v]); while (a.length && t - a[0][0] > 65000) a.shift(); }
  function mean(k, from, to) {
    var a = H[k] || [], t = Date.now(), s = 0, x = 0, y = 0, n = 0, ang = F[k].ang;
    a.forEach(function (q) { var age = t - q[0]; if (age < from || age > to) return; n++; if (ang) { x += Math.sin(q[1] * R); y += Math.cos(q[1] * R); } else s += q[1]; });
    if (!n) return null; return ang ? (Math.atan2(x, y) / R + 360) % 360 : s / n;
  }
  function trend(k) {
    var a = mean(k, 0, 10000), b = mean(k, 25000, 40000); if (a == null || b == null) return 0;
    var d = F[k].ang ? ((a - b + 540) % 360) - 180 : a - b, lim = F[k].ang ? 3 : Math.max(0.1, Math.abs(b) * 0.02);
    return d > lim ? 1 : d < -lim ? -1 : 0;
  }

  /* ---- the screen ---- */
  var on = false, el = null, wake = null, timer = null;
  function css() {
    if ($('deckCss')) return; var s = document.createElement('style'); s.id = 'deckCss';
    s.textContent = 'body.fsdeck .app{grid-template-rows:minmax(0,42%) minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr)}' +
      'body.fsdeck #deckNums{grid-row:1;grid-column:1}body.fsdeck .app>.chart{grid-row:2;grid-column:1}body.fsdeck .app>.panel{grid-row:2;grid-column:1;width:auto;max-height:none;border-left:0;border-top:1px solid var(--line);border-radius:0}' +
      'body.fsdeck .app>:not(#deckNums):not(.chart):not(.panel){grid-column:1}' +
      'body.fsdeck.fsdeckv .app>.chart{display:none}body.fsdeck:not(.fsdeckv) .app>.panel{display:none!important}' +
      '@media (orientation:landscape){body.fsdeck .app{grid-template-rows:minmax(0,1fr) auto;grid-template-columns:minmax(0,40%) minmax(0,1fr)}body.fsdeck #deckNums{grid-row:1;grid-column:1}body.fsdeck .app>.chart,body.fsdeck .app>.panel{grid-row:1;grid-column:2}body.fsdeck .app>:not(#deckNums):not(.chart):not(.panel){grid-column:1 / span 2}}' +
      '#deckNums{display:none;min-height:0;background:var(--panel);border-bottom:1px solid var(--line);padding:6px max(6px,env(safe-area-inset-right,0px)) 6px max(6px,env(safe-area-inset-left,0px));gap:6px;grid-template-columns:1fr 1fr;grid-template-rows:auto auto 1fr 1fr;touch-action:pan-y}' +
      'body.fsdeck #deckNums{display:grid}@media (orientation:landscape){#deckNums{border-bottom:0;border-right:1px solid var(--line);padding-top:max(6px,env(safe-area-inset-top,0px))}}' +
      '.dkbar{grid-column:1 / span 2;display:flex;gap:6px;align-items:center}.dkbar button{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 13px var(--f-body,system-ui)}.dkbar .dkview{flex:1;text-align:left}.dkbar .dkdots{display:flex;gap:4px}.dkbar .dkdots i{width:6px;height:6px;border-radius:50%;background:var(--line)}.dkbar .dkdots i.on{background:var(--ink)}' +
      '.dkbox{position:relative;min-height:0;min-width:0;border:1px solid var(--line);border-radius:12px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;container-type:size;cursor:pointer;-webkit-user-select:none;user-select:none}' +
      '.dkbox .dkl{position:absolute;top:5px;left:8px;font:700 11px var(--f-body,system-ui);letter-spacing:.06em;color:var(--muted)}.dkbox .dku{position:absolute;top:5px;right:8px;font:600 11px var(--f-body,system-ui);color:var(--muted)}' +
      '.dkbox .dkv{font:700 clamp(28px,min(42cqh,24cqw),160px)/1 var(--f-data,ui-monospace,monospace);font-variant-numeric:tabular-nums;color:var(--ink);white-space:nowrap}' +
      '.dkbox .dka{position:absolute;bottom:5px;left:8px;font:600 12px var(--f-data,monospace);color:var(--muted)}.dkbox .dkt{position:absolute;bottom:2px;right:8px;font:700 18px/1 var(--f-body,system-ui);color:var(--muted)}' +
      '.dkbox .dkn{font:500 11px var(--f-body,system-ui);color:var(--muted);text-align:center;padding:0 8px}.dkbox.dkfc .dkl::after{content:" FORECAST";color:#b45309}' +
      '.dkbox.good{box-shadow:inset 0 0 0 3px #16a34a}.dkbox.warn{box-shadow:inset 0 0 0 3px #d97706}.dkbox.bad{box-shadow:inset 0 0 0 3px #dc2626}' +
      '.dkpick{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}.dkpick[hidden]{display:none}.dkpick .in{background:var(--panel);color:var(--ink);border-radius:14px;max-width:520px;width:100%;max-height:86vh;overflow:auto;padding:12px 14px}' +
      '.dkpick h3{margin:10px 0 6px;font-size:12px;letter-spacing:.06em;color:var(--muted)}.dkpick .g{display:flex;flex-wrap:wrap;gap:6px}.dkpick button{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 13px var(--f-body,system-ui)}.dkpick button[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}' +
      '.fsdeckb[aria-pressed="true"]{background:var(--ink);color:var(--bg)}body.fsdeck #liveBox{display:none!important}' +
      '.dkbar{grid-row:1}.dkdr{grid-row:2}.dkbox[data-i="0"],.dkbox[data-i="1"]{grid-row:3}.dkbox[data-i="2"],.dkbox[data-i="3"]{grid-row:4}.dkdr{grid-column:1 / span 2;background:#b45309;color:#fff;border-radius:10px;padding:6px 10px;font:700 14px var(--f-body,system-ui)}.dkdr[hidden]{display:none}';
    document.head.appendChild(s);
  }
  function build() {
    if (el) return; css(); var app = $('app'); if (!app) return;
    el = document.createElement('div'); el.id = 'deckNums'; el.setAttribute('aria-label', 'Deck screen numbers');
    el.innerHTML = '<div class="dkbar"><button type="button" class="dkview" id="dkView" aria-label="Change the view below"></button><span class="dkdots" id="dkDots" aria-hidden="true"></span><button type="button" id="dkExit" aria-label="Leave the deck screen">CHART ×</button></div><div class="dkdr" id="dkDr" role="alert" hidden></div>' +
      [0, 1, 2, 3].map(function (i) { return '<div class="dkbox" data-i="' + i + '" role="button" tabindex="0" aria-label="Figure ' + (i + 1) + ': tap to change"><span class="dkl"></span><span class="dku"></span><span class="dkv">--</span><span class="dka"></span><span class="dkt"></span></div>'; }).join('');
    app.insertBefore(el, app.firstChild);
    $('dkView').onclick = function () { step(1); }; $('dkExit').onclick = function () { set(false); };
    [].forEach.call(el.querySelectorAll('.dkbox'), function (b) { b.onclick = function () { pick(+b.dataset.i); }; b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(+b.dataset.i); } }; });
    swipe(el); var pn = $('panel'); if (pn) swipe(pn, true);
  }
  /* a swipe left or right changes the view (on the numbers, or on a Routes, Plan, Fleet or Data view; the chart keeps its own pan) */
  function swipe(node, onlyDeck) {
    var x0 = null, y0 = 0, t0 = 0;
    node.addEventListener('touchstart', function (e) { if (!on || e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
    node.addEventListener('touchend', function (e) { if (x0 == null || !on) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null; if (Date.now() - t0 < 700 && Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1); }, { passive: true });
  }
  function step(d) { var i = VIEWS.map(function (v) { return v[0]; }).indexOf(C.view); C.view = VIEWS[(i + d + VIEWS.length) % VIEWS.length][0]; save(); applyView(); }
  function applyView() {
    var v = C.view, name = (VIEWS.filter(function (x) { return x[0] === v; })[0] || VIEWS[0])[1];
    document.body.classList.toggle('fsdeckv', on && v !== 'chart');
    if ($('dkView')) $('dkView').textContent = 'VIEW: ' + name + ' ›';
    if ($('dkDots')) $('dkDots').innerHTML = VIEWS.map(function (x) { return '<i class="' + (x[0] === v ? 'on' : '') + '"></i>'; }).join('');
    if (on && v !== 'chart') { var pn = $('panel'); if (pn) { pn.hidden = false; pn.classList.remove('collapsed'); var tb = pn.querySelector('.tab[data-tab="' + v + '"]'); if (tb && tb.getAttribute('aria-selected') !== 'true') tb.click(); } }
    setTimeout(function () { window.dispatchEvent(new Event('resize')); mob(); }, 30);
  }
  function pick(i) {
    var p = $('dkPick'); if (!p) { p = document.createElement('div'); p.id = 'dkPick'; p.className = 'dkpick'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Choose a figure'); document.body.appendChild(p); p.onclick = function (e) { if (e.target === p) p.hidden = true; }; }
    var gs = {}, h = '<b>Box ' + (i + 1) + ': choose a figure</b>';
    ORDER.forEach(function (k) { (gs[F[k].g] = gs[F[k].g] || []).push(k); });
    Object.keys(gs).forEach(function (g) { h += '<h3>' + esc(g.toUpperCase()) + '</h3><div class="g">' + gs[g].map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="' + (C.boxes[i] === k) + '">' + esc(F[k].l) + '</button>'; }).join('') + '</div>'; });
    h += '<div style="margin-top:12px;text-align:right"><button type="button" data-x="1">Close</button></div>';
    p.innerHTML = '<div class="in">' + h + '</div>'; p.hidden = false;
    [].forEach.call(p.querySelectorAll('[data-k]'), function (b) { b.onclick = function () { C.boxes[i] = b.dataset.k; save(); p.hidden = true; tick(); }; });
    p.querySelector('[data-x]').onclick = function () { p.hidden = true; };
  }
  function tick() {
    ORDER.forEach(function (k) { if (C.boxes.indexOf(k) < 0) return; var v = null; try { v = F[k].f(); } catch (e) {} if (!F[k].noavg) push(k, v); });
    if (!on || !el) return;
    /* the Live GPS box is hidden on the deck screen, so its dead reckoning warning comes here (Stuart 15 Nov, H) */
    var dr = null; try { dr = window.__fsDR ? window.__fsDR() : null; } catch (e) {} var db = $('dkDr');
    if (db) { if (dr && dr.active && dr.fix) { db.hidden = false; db.textContent = 'DEAD RECKONING: no GPS for ' + dur((Date.now() - dr.fix.since) / 1000) + ' · good to about ' + (dr.fix.rad < 0.1 ? Math.round(dr.fix.rad * 1852) + ' m' : dr.fix.rad.toFixed(2) + ' nm'); } else if (dr && dr.msg) { db.hidden = false; db.textContent = dr.msg; } else db.hidden = true; }
    mob();
    [].forEach.call(el.querySelectorAll('.dkbox'), function (b, i) {
      var k = C.boxes[i], f = F[k], v = null; try { v = f.f(); } catch (e) {}
      b.querySelector('.dkl').textContent = f.l; b.querySelector('.dku').textContent = f.u;
      var fc = false; try { fc = !!(f.fc && v != null && f.fc()); } catch (e) {} b.classList.toggle('dkfc', fc);
      var vs = b.querySelector('.dkv');
      if (v == null) { vs.textContent = '--'; b.querySelector('.dka').textContent = f.soon || (f.need === 'boat' ? 'Needs the boat link' : f.need === 'plot' ? 'Needs a position and a course' : ''); b.querySelector('.dkt').textContent = ''; b.classList.remove('good', 'warn', 'bad'); return; }
      vs.textContent = f.show ? f.show(v) : v.toFixed(f.d == null ? 1 : f.d);
      var m = f.noavg ? null : mean(k, 0, 60000); b.querySelector('.dka').textContent = m == null ? '' : '1 min ' + (f.show ? f.show(m) : m.toFixed(f.d == null ? 1 : f.d));
      var tr = f.noavg ? 0 : trend(k); b.querySelector('.dkt').textContent = tr > 0 ? '▲' : tr < 0 ? '▼' : '';
      var r = f.tgt ? f.tgt(v) : null; b.classList.toggle('good', r != null && r >= 1); b.classList.toggle('warn', r != null && r < 1 && r >= 0.95); b.classList.toggle('bad', r != null && r < 0.95);
    });
  }
  /* MOB stays in reach but never covers a number: on the deck screen it sits at the bottom left of the view under the numbers */
  var mobCss = null;
  function mob() {
    var m = $('mobBtn'); if (!m) return;
    if (!on) { if (mobCss != null) { m.style.cssText = mobCss; mobCss = null; } return; }
    if (mobCss == null) mobCss = m.style.cssText;
    var v = document.body.classList.contains('fsdeckv') ? $('panel') : document.querySelector('.app>.chart'); if (!v) return; var r = v.getBoundingClientRect();
    m.style.left = (r.left + 10) + 'px'; m.style.top = 'auto'; m.style.right = 'auto'; m.style.bottom = Math.max(8, innerHeight - r.bottom + 10) + 'px';
  }
  function set(v) {
    on = !!v; C.on = on; save(); build(); document.body.classList.toggle('fsdeck', on);
    var bt = $('fsDeckBtn'); if (bt) bt.setAttribute('aria-pressed', String(on));
    if (on) { try { if (navigator.wakeLock && !wake) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {}); } catch (e) {} }
    else if (wake) { try { wake.release(); } catch (e) {} wake = null; }
    applyView(); tick(); setTimeout(mob, 80); if (!on) mob();
  }
  function button() {
    if ($('fsDeckBtn')) return; var plotB = [].filter.call(document.querySelectorAll('button'), function (b) { return b.textContent.trim() === 'PLOT' && !b.closest('#deckNums'); })[0]; if (!plotB) return false;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'fsDeckBtn'; b.className = plotB.className + ' fsdeckb'; b.textContent = 'DECK'; b.title = 'Deck screen: four big numbers over the chart or a panel'; b.setAttribute('aria-pressed', 'false');
    b.onclick = function () { set(!on); }; plotB.parentNode.insertBefore(b, plotB.nextSibling); return true;
  }
  function boot() { var n = 0, t = setInterval(function () { n++; if (button() !== false || n > 60) { clearInterval(t); if (C.on) set(true); } }, 500); timer = setInterval(tick, 1000); }
  window.FSDeck = { set: set, on: function () { return on; }, step: step, view: function (v) { if (v) { C.view = v; save(); applyView(); } return C.view; }, boxes: function (a) { if (a) { C.boxes = a.slice(0, 4); save(); tick(); } return C.boxes.slice(); }, figures: function () { return ORDER.slice(); }, value: function (k) { try { return F[k].f(); } catch (e) { return null; } }, pick: pick, tick: tick };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
