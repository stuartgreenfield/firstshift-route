(function () {
  'use strict';
  var VERSION = 'FirstShift Route v0.4';
  var R = Math.PI / 180, KN = 1852 / 3600, $ = function (id) { return document.getElementById(id); };
  var meta, P = FSRouter.emptyPack(), T0, workers = [], wq = 0, jobs = {}, jid = 0;
  var STYLE = { ukv: ['--m1', []], ecmwf: ['--m2', [9, 4]], gfs: ['--m3', [2, 4]], aifs: ['--m4', [12, 4, 2, 4]], mog: ['--m5', [1, 5]] };
  var S = { t: 5, routes: [], sel: null, matrix: null, ghosts: null, from: null, running: false, show: { wind: true, tide: true, ghosts: true, real: false, band: true }, choice: {}, loaded: {} };
  var css = {};
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- colours ---------- */
  function readCss() { var cs = getComputedStyle(document.documentElement); ['--sea', '--sea2', '--land', '--landedge', '--shoal', '--shoaledge', '--route', '--wind', '--tide', '--ink', '--muted', '--panel', '--ghost', '--out', '--m1', '--m2', '--m3', '--m4', '--m5'].forEach(function (k) { css[k] = cs.getPropertyValue(k).trim(); }); }
  function setNight(on) {
    if (on) document.documentElement.setAttribute('data-night', ''); else document.documentElement.removeAttribute('data-night');
    $('nightBtn').setAttribute('aria-pressed', on); store('fs-night', on ? '1' : '0');
    [].forEach.call($('modeSeg').children, function (b) { b.setAttribute('aria-pressed', (b.dataset.mode === 'night') === on); });
    readCss(); buildDepth(); draw();
  }

  /* ---------- workers ---------- */
  function call(w, msg, tr) { return new Promise(function (ok, no) { msg.id = ++jid; jobs[jid] = { ok: ok, no: no }; w.postMessage(msg, tr || []); }); }
  function pool(msg) { if (!workers.length) return Promise.reject(new Error('This browser cannot run background routing.')); return call(workers[wq++ % workers.length], msg); }
  function all(msgFn) { return Promise.all(workers.map(function (w) { var m = msgFn(); return call(w, m.msg, m.tr); })); }
  var n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
  for (var i = 0; i < n; i++) { try { var w = new Worker('worker.js'); w.onmessage = function (e) { var j = jobs[e.data.id]; if (j) { delete jobs[e.data.id]; e.data.ok ? j.ok(e.data.r) : j.no(new Error(e.data.error)); } }; workers.push(w); } catch (e) { break; } }

  /* ---------- start ---------- */
  fetch('pack/pack.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
    meta = m; T0 = m.t0; setup();
    fetch('pack/' + m.coast.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { coastBits = new Uint8Array(b); buildDepth(); draw(); });
    var saved = store('fs-plan'); applyPlan(saved && PLANS[saved] ? saved : 'full');
    return download();
  }).then(function () { run(); }).catch(function (e) { $('dataChip').textContent = 'Could not load forecasts: ' + e.message; });

  /* ---------- data plans ---------- */
  var PLANS = {
    full: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'full', mog: 'full', nwscur: 'full', ibicur: 'full', nwswav: 'full', ecwav: 'full', emodnet: 'full' },
    coastal: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'off', mog: 'off', nwscur: 'full', ibicur: 'off', nwswav: 'lite', ecwav: 'off', emodnet: 'full' },
    lite: { ukv: 'lite', ecmwf: 'lite', gfs: 'lite', aifs: 'off', mog: 'off', nwscur: 'lite', ibicur: 'off', nwswav: 'off', ecwav: 'full', emodnet: 'lite' }
  };
  function applyPlan(p) { S.choice = Object.assign({}, PLANS[p]); S.plan = p; store('fs-plan', p); [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', b.dataset.plan === p); }); dataTable(); }
  function layer(id) { return meta.layers.find(function (l) { return l.id === id; }); }
  function mb(b) { return b < 1e5 ? (b / 1e3).toFixed(0) + ' kB' : (b / 1e6).toFixed(1) + ' MB'; }
  function res(v) { var a = v.res_km[0], b = v.res_km[1]; return a < 1 ? Math.round((a + b) / 2 * 1000) + ' m' : (Math.abs(a - b) / a < 0.25 ? ((a + b) / 2).toFixed(1) + ' km' : a.toFixed(0) + '×' + b.toFixed(0) + ' km'); }
  function dataTable() {
    if (!meta) return;
    var tot = 0, h = '<tr><th>Layer</th><th>Version</th><th>Grid</th><th>Step</th><th>Size</th></tr>', kinds = { wind: 'Wind', tide: 'Tide', wave: 'Sea state', depth: 'Depth' };
    meta.layers.forEach(function (L) {
      var c = S.choice[L.id] || 'off', v = L[c === 'off' ? 'full' : c], loaded = S.loaded[L.id];
      if (c !== 'off' && loaded !== c) tot += L[c].gz;
      h += '<tr><td style="font-family:var(--f-body)">' + kinds[L.kind] + ': ' + L.name + (loaded ? ' <span class="pill">on device</span>' : '') + '</td><td><select data-dl="' + L.id + '" aria-label="' + L.name + '">' +
        ['full', 'lite', 'off'].map(function (o) { return '<option value="' + o + '"' + (o === c ? ' selected' : '') + '>' + { full: 'Full', lite: 'Lite', off: 'Off' }[o] + '</option>'; }).join('') + '</select></td><td>' + (c === 'off' ? '-' : res(v)) + '</td><td>' + (c === 'off' || !v.step_h ? '-' : v.step_h + ' h') + '</td><td>' + (c === 'off' ? '-' : mb(L[c].gz)) + '</td></tr>';
    });
    var ovRow = $('ovChk').closest('label'); if (ovRow) ovRow.hidden = !meta.overview;
    if (meta.overview) { if ($('ovChk').checked && !S.ov) tot += meta.overview.gz; $('ovSize').textContent = mb(meta.overview.gz) + (S.ov ? ' · on device' : ''); }
    var bw = meta.course.band.map(function (b) { return b[4]; }), w = meta.course.window;
    $('bandNote').textContent = 'Cut to the race: forecasts only within ' + Math.round(Math.min.apply(null, bw)) + ' nm of the course in the Solent and ' + Math.round(Math.max.apply(null, bw)) + ' nm offshore (30% of each leg), from ' + clockH(w[0]).slice(4) + ' to ' + clockH(w[1]).slice(4) + ' UTC: an hour before the first start to 1.4 times the slowest routed finish. Shown as a dashed line on the chart.';
    $('dataTable').innerHTML = h; $('dlTotal').textContent = tot ? mb(tot) + ' to fetch' : 'nothing new to fetch';
    [].forEach.call($('dataTable').querySelectorAll('select'), function (s) { s.onchange = function () { S.choice[s.dataset.dl] = s.value; S.plan = 'custom'; [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', 'false'); }); dataTable(); }; });
    $('dataNote').textContent = 'Forecast run ' + meta.run + '. ' + meta.made + '. Choose what this device downloads: full detail on Starlink, less on a phone signal.';
  }
  function download() {
    var todo = meta.layers.filter(function (L) { var c = S.choice[L.id] || 'off'; return c !== S.loaded[L.id] && !(c === 'off' && !S.loaded[L.id]); });
    var ovJob = Promise.resolve();
    if (meta.overview && $('ovChk').checked && !S.ov) ovJob = fetch('pack/' + meta.overview.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { S.ov = b; layersPop(); });
    if (!$('ovChk').checked && S.ov) { S.ov = null; if (S.big) toggleBig(); }
    if (!todo.length) { return ovJob.then(function () { chip(); dataTable(); $('dlNote').textContent = 'Up to date.'; }); }
    busy('Downloading forecasts…');
    return Promise.all(todo.map(function (L) {
      var c = S.choice[L.id] || 'off';
      if (c === 'off') {
        if (L.kind === 'depth') P.depth = null; else delete P[L.kind][L.id];
        delete S.loaded[L.id];
        return all(function () { return { msg: { type: 'drop', kind: L.kind, lid: L.id } }; });
      }
      var v = L[c];
      var runs = v.runs ? fetch('pack/' + v.runs).then(function (r) { return r.json(); }) : Promise.resolve(null);
      return Promise.all([fetch('pack/' + v.file).then(function (r) { if (!r.ok) throw new Error(L.name + ' did not download'); return r.arrayBuffer(); }), runs]).then(function (two) {
        var buf = two[0], spec = Object.assign({ kind: L.kind, id: L.id, name: L.name }, v); if (two[1]) spec.druns = two[1];
        FSRouter.addLayer(P, spec, buf); S.loaded[L.id] = c;
        return all(function () { var copy = buf.slice(0); return { msg: { type: 'layer', L: spec, buf: copy }, tr: [copy] }; });
      });
    })).then(function () {
      return ovJob;
    }).then(function () {
      busy(''); dataTable(); modelsList(); selects(); chip(); buildDepth(); draw();
      $('dlNote').textContent = 'Up to date.';
    }).catch(function (e) { busy(''); $('dlNote').textContent = e.message; });
  }
  function chip() {
    var bytes = S.ov && meta.overview ? meta.overview.gz : 0, w = 0; meta.layers.forEach(function (L) { var c = S.loaded[L.id]; if (c) { bytes += L[c].gz; if (L.kind === 'wind') w++; } });
    var hi = S.loaded.ukv === 'full' ? 'UKV 1.5 km' : S.loaded.ukv ? 'UKV lite 3 km' : 'global only';
    $('dataChip').textContent = 'Route v0.4 · ' + (meta.live ? 'Live · ' : '') + 'Run ' + clockAbs(meta.t0).replace(/ (\d\d):00$/, ' $1Z') + ' · ' + w + ' wind models (' + hi + ') · ' + mb(bytes);
  }

  /* ---------- controls ---------- */
  var starts = [];
  function setup() {
    readCss();
    var bySt = {};
    meta.fleet.forEach(function (f) { if (!f.irc || !f.start) return; (bySt[f.start] = bySt[f.start] || {}); f.cls.forEach(function (c) { bySt[f.start][c] = 1; }); });
    if (meta.live) {
      // live forecasts: start any hour from the next one to 36 hours ahead
      var first = Math.max(meta.course.window[0] + 1, Math.ceil((Date.now() / 1000 - T0) / 3600));
      for (var hh = first; hh <= Math.min(first + 36, 46); hh++) { var ep = T0 + hh * 3600; starts.push(ep); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + ep + '">' + clockAbs(ep) + ' UTC</option>'); }
    } else Object.keys(bySt).sort().forEach(function (s) { starts.push(+s); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + s + '">' + clockAbs(+s).slice(4) + ' · ' + Object.keys(bySt[s]).sort().join(', ') + '</option>'); });
    $('startSel').value = String(starts[0]);
    S.tmin = (starts[0] - T0) / 3600; S.tmax = Math.min(48, S.tmin + 26);
    meta.fleet.filter(function (f) { return f.irc; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (f) { $('boatPick').insertAdjacentHTML('beforeend', '<option value="' + f.name + '">' + f.name + ' · TCC ' + f.tcc.toFixed(3) + '</option>'); });
    $('boatPick').onchange = function () { var f = meta.fleet.find(function (x) { return x.name === $('boatPick').value; }); if (f) { $('tcc').value = f.tcc.toFixed(3); if (!meta.live) $('startSel').value = String(f.start); } };
    $('depth').oninput = function () { $('depthV').textContent = (+$('depth').value).toFixed(1) + ' m'; buildDepth(); draw(); };
    $('run').onclick = function () { S.from = null; run(); };
    $('fromHere').onclick = function () { var on = $('fromHere').getAttribute('aria-pressed') !== 'true'; $('fromHere').setAttribute('aria-pressed', on); busy(on ? 'Tap the chart where the boat is now' : ''); };
    $('time').oninput = function () { S.t = tFromSlider(); update(); };
    $('play').onclick = togglePlay;
    $('nightBtn').onclick = function () { setNight(!document.documentElement.hasAttribute('data-night')); };
    [].forEach.call($('modeSeg').children, function (b) { b.onclick = function () { setNight(b.dataset.mode === 'night'); }; });
    $('setBtn').onclick = function () { $('sheet').hidden = false; };
    $('sheetX').onclick = function () { $('sheet').hidden = true; };
    $('sheet').onclick = function (e) { if (e.target === $('sheet')) $('sheet').hidden = true; };
    [].forEach.call(document.querySelectorAll('.stabs .tab'), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll('.stabs .tab'), function (x) { x.setAttribute('aria-selected', x === b); $('s-' + x.dataset.s).hidden = x !== b; }); }; });
    [].forEach.call(document.querySelectorAll('.tabs .tab'), function (b) { b.onclick = function () { openTab(b.dataset.tab, true); }; });
    $('panelBtn').onclick = function () { var p = $('panel'); if (wide()) { p.hidden = !p.hidden; } else { p.hidden = false; p.classList.toggle('collapsed'); } $('panelBtn').setAttribute('aria-expanded', !p.hidden && !p.classList.contains('collapsed')); setTimeout(resizeDraw, 0); };
    $('panelX').onclick = closePanel;
    // Esc closes whatever is on top: settings, then layers, then the info card, then results
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('sheet').hidden) $('sheet').hidden = true;
      else if (!$('layers').hidden) closeLayers();
      else if (!$('tip').hidden) $('tip').hidden = true;
      else if (!$('panel').hidden && !$('panel').classList.contains('collapsed')) closePanel();
    });
    $('dataChip').onclick = function () { $('panel').hidden = false; openTab('data'); };
    $('layersBtn').onclick = function () { var p = $('layers'); p.hidden = !p.hidden; $('layersBtn').setAttribute('aria-expanded', !p.hidden); layersPop(); };
    [].forEach.call($('plans').children, function (b) { b.onclick = function () { applyPlan(b.dataset.plan); }; });
    $('dlBtn').onclick = function () { download(); };
    $('ovChk').onchange = dataTable;
    $('tipX').onclick = function () { $('tip').hidden = true; };
    $('windShow').onchange = draw;
    ['windSym', 'tideSym'].forEach(function (id) { var v = store('fs-' + id); if (v && $(id).querySelector('option[value="' + v + '"]')) $(id).value = v; $(id).onchange = function () { store('fs-' + id, $(id).value); syncSym(); draw(); animate(); }; });
    $('sails').oninput = function () { plan(); update(); };
    if (!wide()) $('panel').hidden = false;
    setNight(store('fs-night') === '1');
    var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { readCss(); buildDepth(); draw(); });
    new MutationObserver(function () { readCss(); buildDepth(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.ResizeObserver) new ResizeObserver(resizeDraw).observe(document.querySelector('.chart')); else window.addEventListener('resize', resizeDraw);
    resize(); fit(); setTime((starts[0] - T0) / 3600); animate();
    document.addEventListener('visibilitychange', animate);
  }
  function syncSym() { var a = document.getElementById('lWind'), b = document.getElementById('lTide'); if (a) a.value = $('windSym').value; if (b) b.value = $('tideSym').value; }
  function closeLayers() { $('layers').hidden = true; $('layersBtn').setAttribute('aria-expanded', 'false'); }
  function closePanel() { var p = $('panel'); if (wide()) p.hidden = true; else p.classList.add('collapsed'); $('panelBtn').setAttribute('aria-expanded', 'false'); setTimeout(resizeDraw, 0); }
  function wide() { return matchMedia('(min-width: 900px)').matches; }
  function openTab(t, fromTab) {
    var p = $('panel'); p.hidden = false;
    var cur = document.querySelector('.tabs .tab[aria-selected="true"]');
    if (!wide() && fromTab && cur && cur.dataset.tab === t && !p.classList.contains('collapsed')) { p.classList.add('collapsed'); setTimeout(resizeDraw, 0); return; }
    p.classList.remove('collapsed');
    [].forEach.call(document.querySelectorAll('.tabs .tab'), function (x) { x.setAttribute('aria-selected', x.dataset.tab === t); $('t-' + x.dataset.tab).hidden = x.dataset.tab !== t; });
    setTimeout(resizeDraw, 0);
  }
  function modelsList() {
    var h = '', prev = selectedModels(), first = !$('models').children.length;
    meta.layers.filter(function (l) { return l.kind === 'wind'; }).forEach(function (l) {
      var on = !!P.wind[l.id], st = STYLE[l.id], v = l[S.loaded[l.id] || 'full'];
      h += '<label class="chk"><input type="checkbox" data-m="' + l.id + '"' + (on ? '' : ' disabled') + ((first ? on && l.id !== 'mog' : prev.indexOf(l.id) >= 0 && on) ? ' checked' : '') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + l.name + ' <span class="pill">' + (on ? res(v) + ', ' + v.step_h + ' h' : 'not downloaded') + '</span></label>';
    });
    $('models').innerHTML = h;
  }
  function selects() {
    function opts(kind, none) { return meta.layers.filter(function (l) { return l.kind === kind && P[kind][l.id]; }).map(function (l) { return '<option value="' + l.id + '">' + l.name + '</option>'; }).join('') + '<option value="">' + none + '</option>'; }
    var t = $('tideSel').value, w = $('waveSel').value, ws = $('windShow').value;
    $('tideSel').innerHTML = opts('tide', 'No tide'); $('waveSel').innerHTML = opts('wave', 'Ignore sea state'); $('windShow').innerHTML = opts('wind', 'No arrows');
    if (t && P.tide[t]) $('tideSel').value = t; if (w && P.wave[w]) $('waveSel').value = w; if (ws && P.wind[ws]) $('windShow').value = ws;
  }
  function layersPop() {
    var h = '<div class="pophead"><span>Chart layers</span><button class="close" id="layersX" aria-label="Close layers">\u00d7</button></div><label><input type="checkbox" data-l="wind"' + (S.show.wind ? ' checked' : '') + '><span class="sw" style="border-color:var(--wind)"></span>Wind</label><select id="lWind" aria-label="Wind symbol" style="margin-left:29px">' + $('windSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="tide"' + (S.show.tide ? ' checked' : '') + '><span class="sw" style="border-color:var(--tide)"></span>Tidal stream</label><select id="lTide" aria-label="Tide symbol" style="margin-left:29px">' + $('tideSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="ghosts"' + (S.show.ghosts ? ' checked' : '') + '><span class="sw" style="border-color:var(--ghost);border-top-style:dotted"></span>Fleet on your route</label>' +
      '<label><input type="checkbox" data-l="band"' + (S.show.band ? ' checked' : '') + '><span class="sw" style="border-color:var(--muted);border-top-style:dashed"></span>Forecast band edge</label>' +
      (S.ov ? '<label><input type="checkbox" data-big="1"' + (S.big ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Big picture: north-west Europe</label>' : '') +
      (meta.live ? '' : '<label><input type="checkbox" data-l="real"' + (S.show.real ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Real 2026 boats (YB)</label>');
    S.routes.forEach(function (s, i) { var st = s.combined ? ['--route', []] : STYLE[s.id]; h += '<label><input type="checkbox" data-r="' + i + '"' + (s.hidden ? '' : ' checked') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-width:' + (s.combined ? 4 : 3) + 'px;border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + s.name + ' · ' + fmtH(s.r.finish - S.start.t) + '</label>'; });
    $('layers').innerHTML = h;
    [].forEach.call($('layers').querySelectorAll('input'), function (c) { c.onchange = function () { if (c.dataset.big) { toggleBig(); animate(); return; } if (c.dataset.l) S.show[c.dataset.l] = c.checked; else S.routes[+c.dataset.r].hidden = !c.checked; draw(); animate(); }; });
    syncSym();
    $('layersX').onclick = closeLayers;
    $('lWind').onchange = function () { $('windSym').value = $('lWind').value; $('windSym').onchange(); };
    $('lTide').onchange = function () { $('tideSym').value = $('lTide').value; $('tideSym').onchange(); };
  }

  function clockAbs(epoch) { var d = new Date(epoch * 1000); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function clockH(h) { return clockAbs(T0 + h * 3600); }
  function fmtH(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0'); }
  function short(id) { return { ecmwf: 'ECMWF', ukv: 'UKV', gfs: 'GFS', aifs: 'AIFS', mog: 'MO Global' }[id] || id; }
  function busy(t) { $('busy').hidden = !t; $('busy').textContent = t; }

  /* ---------- routing ---------- */
  function opts(models) {
    var pol = null, txt = $('polarTxt').value.trim();
    if (txt) { try { pol = FSPolar.parsePolar(txt); } catch (e) { pol = null; } }
    return { models: models, tide: $('tideSel').value || null, wave: $('waveSel').value || null, tcc: +$('tcc').value || 1, polar: pol,
      sea: { up: +$('seaUp').value, reach: +$('seaReach').value, surf: +$('seaSurf').value, from: 0.5, surfFrom: 1.5 }, safety: +$('depth').value, tackS: +$('tackS').value, gybeS: +$('gybeS').value };
  }
  function legsFor(fromPt) {
    var c = meta.course, g = FSRouter.markGate(c.marks[0], c.start, c.finish, $('sideSel').value, 1.2);
    var legs = [{ name: c.marks[0].name, gate: g, dt: 180 }, { name: c.finish.name, point: [c.finish.lat, c.finish.lon], r: c.finish.radius_nm }];
    if (fromPt && !(fromPt.lat > 50.66 && fromPt.lon > -1.6)) legs = legs.slice(1);
    return legs;
  }
  function selectedModels() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.getAttribute('data-m'); }); }
  function run() {
    if (S.running) return;
    var ms = selectedModels(); if (!ms.length) { openTab('decision'); $('runNote').textContent = 'Tick at least one downloaded wind model in Settings, Forecasts.'; return; }
    if (!P.depth) { openTab('data'); $('dlNote').textContent = 'Download the seabed depth first: the router needs it to keep off the land.'; return; }
    S.running = true; busy('Routing ' + (ms.length + (ms.length > 1 ? 1 : 0)) + ' solutions…');
    var start = S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 };
    var legs = legsFor(S.from), base = opts(ms), t0 = Date.now();
    var sets = ms.map(function (m) { return { id: m, name: layer(m).name, models: [m] }; });
    if (ms.length > 1) sets.push({ id: 'all', name: 'Combined (' + ms.length + ' models)', models: ms, combined: true });
    Promise.all(sets.map(function (s) { return pool({ type: 'route', o: Object.assign({}, base, { models: s.models, start: start, legs: legs }) }).then(function (r) { s.r = r; return s; }, function (e) { s.err = e.message; return s; }); })).then(function (res) {
      S.routes = res.filter(function (s) { return s.r; });
      var errs = res.filter(function (s) { return s.err; });
      if (!S.routes.length) throw new Error(errs.length ? errs[0].err : 'No route found.');
      busy('Sailing each route through every model…');
      var selfJobs = S.routes.map(function (s) { return pool({ type: 'sail', o: Object.assign({}, base, { models: s.models }), paths: [s.r.path] }); });
      return Promise.all(ms.map(function (m) { return pool({ type: 'sail', o: Object.assign({}, base, { models: [m] }), paths: S.routes.map(function (s) { return s.r.path; }) }); }).concat(selfJobs)).then(function (allr) {
        var cols = allr.slice(0, ms.length), self = allr.slice(ms.length).map(function (x) { return x[0]; });
        S.routes.forEach(function (s, i) { var k = (s.r.finish - start.t) / Math.max(0.1, self[i] - start.t); cols.forEach(function (c) { c[i] = start.t + (c[i] - start.t) * k; }); });
        S.matrix = { models: ms, cols: cols, start: start.t };
        S.routes.forEach(function (s, i) { var v = cols.map(function (c) { return c[i]; }); s.mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length; s.worst = Math.max.apply(null, v); });
        var best = S.routes.slice().sort(function (a, b) { return a.mean - b.mean; })[0];
        S.routes.forEach(function (s) { s.best = s === best; });
        S.sel = best; S.base = base; S.legs = legs; S.start = start;
        $('runNote').textContent = 'Routed in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (errs.length ? '. ' + errs.map(function (e) { return e.name + ': ' + e.err; }).join(' ') : '.');
        return ghosts();
      });
    }).then(function () {
      S.running = false; busy(''); matrix(); plan(); fleetTable(); if (!$('layers').hidden) layersPop();
      var maxT = Math.max.apply(null, S.routes.map(function (s) { return s.r.finish; }));
      S.tmin = Math.min(S.start.t, (starts[0] - T0) / 3600); S.tmax = Math.min(48, maxT + 1);
      setTime(S.from ? S.from.t : S.start.t);
    }).catch(function (e) { S.running = false; busy(''); openTab('decision'); $('runNote').textContent = e.message; draw(); });
  }
  function ghosts() {
    if (!S.sel) return Promise.resolve();
    var boats = meta.fleet.filter(function (f) { return f.irc && f.start; }).map(function (f) { return { name: f.name, tcc: f.tcc, start: meta.live ? S.start.t : Math.max((f.start - T0) / 3600, S.from ? S.start.t : -1), f: f }; });
    return pool({ type: 'times', o: Object.assign({}, S.base, { models: S.sel.models }), path: S.sel.r.path, boats: boats.map(function (b) { return { tcc: b.tcc, start: b.start }; }) }).then(function (ts) {
      S.ghosts = boats.map(function (b, i) { return { name: b.name, tcc: b.tcc, f: b.f, ts: ts[i] }; });
    });
  }

  /* ---------- results ---------- */
  function swatch(s) { var st = s.combined ? ['--route', []] : STYLE[s.id]; return '<span class="sw" style="border-color:var(' + st[0] + ');border-top-style:' + (st[1].length ? 'dashed' : 'solid') + ';margin-right:6px;vertical-align:middle"></span>'; }
  function matrix() {
    var M = S.matrix; if (!M) return;
    var mins = M.models.map(function (m, j) { return Math.min.apply(null, M.cols[j]); });
    var h = '<tr><th>Route</th>' + M.models.map(function (m) { return '<th>in ' + short(m) + '</th>'; }).join('') + '<th>Average</th><th>Worst</th></tr>';
    S.routes.forEach(function (s, i) {
      h += '<tr class="click' + (s === S.sel ? ' sel' : '') + '" data-i="' + i + '"><td style="font-family:var(--f-body)">' + swatch(s) + (s.combined ? 'Combined' : short(s.id)) + (s.best ? ' <span class="pill">best</span>' : '') + '</td>' +
        M.models.map(function (m, j) { return '<td class="' + (Math.abs(M.cols[j][i] - mins[j]) < 1e-6 ? 'best' : '') + '">' + fmtH(M.cols[j][i] - M.start) + '</td>'; }).join('') +
        '<td class="' + (s.best ? 'best' : '') + '">' + fmtH(s.mean - M.start) + '</td><td>' + fmtH(s.worst - M.start) + '</td></tr>';
    });
    $('matrix').innerHTML = h;
    [].forEach.call($('matrix').querySelectorAll('tr.click'), function (tr) { tr.onclick = function () { S.sel = S.routes[+tr.dataset.i]; ghosts().then(function () { matrix(); plan(); fleetTable(); update(); }); }; });
    var best = S.routes.find(function (s) { return s.best; }), fins = S.routes.map(function (s) { return s.r.finish; }), spread = Math.max.apply(null, fins) - Math.min.apply(null, fins);
    $('decNote').innerHTML = 'Each row is a route; each column times it in one model’s wind, from ' + (S.from ? 'the chosen point' : 'your start') + '. The <b>' + (best.combined ? 'combined' : short(best.id)) + '</b> route loses least on average if the forecast is wrong. The models’ own best times differ by ' + fmtH(spread) + (spread > 2 ? ': low confidence.' : '.') + ' Tap a row to show it.';
  }
  function sailsList() { return FSRouter.parseCrossover($('sails').value); }
  function plan() {
    var s = S.sel; if (!s) return;
    var cr = sailsList(), p = s.r.path, rows = [], cur = null;
    for (var i = 1; i < p.length; i++) {
      var q = p[i], sail = FSRouter.sailFor(q, cr) || '-';
      if (!cur || cur.sail !== sail || cur.leg !== q.leg) { cur = { sail: sail, leg: q.leg, t0: p[i - 1].t, n: 0, hx: 0, hy: 0, tws: 0, twa: 0, bsp: 0, tacks: 0 }; rows.push(cur); }
      cur.t1 = q.t; cur.n++; cur.hx += Math.sin(q.hdg * R); cur.hy += Math.cos(q.hdg * R); cur.tws += q.tws; cur.twa += Math.abs(q.twa); cur.bsp += q.bsp; if (q.tack) cur.tacks++;
    }
    rows = rows.filter(function (r, i) { return r.t1 - r.t0 >= 0.33 || i === 0; });
    var h = '<tr><th>From</th><th>Sail</th><th>Hdg</th><th>TWS</th><th>TWA</th><th>BSP</th><th>Tacks</th></tr>', leg = -1;
    rows.forEach(function (r) {
      if (r.leg !== leg) { leg = r.leg; h += '<tr><td colspan="7" style="font-family:var(--f-body);color:var(--muted)">To ' + S.legs[Math.min(leg, S.legs.length - 1)].name + '</td></tr>'; }
      h += '<tr><td>' + clockH(r.t0).slice(4) + '</td><td style="font-family:var(--f-body)">' + r.sail + '</td><td>' + pad(Math.atan2(r.hx, r.hy) / R) + '°</td><td>' + (r.tws / r.n).toFixed(1) + '</td><td>' + Math.round(r.twa / r.n) + '°</td><td>' + (r.bsp / r.n).toFixed(1) + '</td><td>' + r.tacks + '</td></tr>';
    });
    s.r.arrivals.forEach(function (a) { h += '<tr><td>' + clockH(a.t).slice(4) + '</td><td colspan="6" style="font-family:var(--f-body)"><b>' + a.name + '</b> · ' + fmtH(a.t - S.start.t) + ' elapsed</td></tr>'; });
    $('plan').innerHTML = h;
  }
  function fleetTable() {
    if (!S.ghosts || !S.sel) return;
    var myCor = (S.sel.r.finish - S.start.t) * (+$('tcc').value || 1), path = S.sel.r.path, me = posAt(path.map(function (p) { return p.t; }), path, S.t);
    var rows = S.ghosts.map(function (g) { var fin = g.ts[g.ts.length - 1], pos = posAt(g.ts, path, S.t); return { g: g, fin: fin, cor: (fin - g.ts[0]) * g.tcc, gap: me && pos ? FSRouter.dist(me.la, me.lo, pos.la, pos.lo) * (pos.k > me.k ? 1 : -1) : null }; }).sort(function (a, b) { return a.cor - b.cor; });
    var h = '<tr><th>Boat</th><th>TCC</th><th>Now</th><th>Corrected</th><th>vs you</th></tr>';
    rows.forEach(function (r) { var d = (r.cor - myCor) * 60; h += '<tr><td style="font-family:var(--f-body)">' + r.g.name + '</td><td>' + r.g.tcc.toFixed(3) + '</td><td>' + (r.gap == null ? '-' : (r.gap >= 0 ? '+' : '−') + Math.abs(r.gap).toFixed(1) + ' nm') + '</td><td>' + fmtH(r.cor) + '</td><td>' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(0) + ' min</td></tr>'; });
    $('fleet').innerHTML = h;
  }

  /* ---------- chart ---------- */
  var cv = $('map'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, K = Math.cos(50.1 * R), view = { lo: -0.8, la: 50.15, s: 300 }, fitted = false;
  function resize() { var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); if (!fitted && W) { fit(); fitted = true; } }
  function resizeDraw() { resize(); draw(); }
  function fit() { var top = 70; view.s = Math.min(W / (2.25 * K), (H - top) / 1.4); view.lo = -0.8; view.la = 50.15 + top / 2 / view.s; }
  function X(lo) { return (lo - view.lo) * K * view.s + W / 2; }
  function Y(la) { return (view.la - la) * view.s + H / 2; }
  function LO(x) { return (x - W / 2) / (K * view.s) + view.lo; }
  function LA(y) { return view.la - (y - H / 2) / view.s; }
  var depthImg = null;
  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c); if (!m) return [128, 128, 128]; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function buildDepth() {
    if (!P.depth) { depthImg = null; return; }
    var L = P.depth.L, F = P.depth, nx = L.nx, ny = L.ny, safety = +$('depth').value, out = hex(css['--out'] || css['--sea']);
    var c = document.createElement('canvas'); c.width = nx; c.height = ny;
    var g = c.getContext('2d'), im = g.createImageData(nx, ny), d = im.data;
    var land = hex(css['--land']), sea = hex(css['--sea']), sea2 = hex(css['--sea2']), sh = hex(css['--shoal']), she = hex(css['--shoaledge']), le = hex(css['--landedge']);
    var Z = new Float32Array(nx * ny);
    for (var yy = 0; yy < ny; yy++) for (var xx = 0; xx < nx; xx++) { var q = F.cellAt('z', 0, yy, xx); Z[yy * nx + xx] = q === q ? q : (coastLand(L.lat0 + yy * L.dlat, L.lon0 + xx * L.dlon) ? 2 : 999); }
    function z(y, x) { var v = Z[y * nx + x]; return v === 999 ? -99 : v; }
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
      var v = Z[y * nx + x], o = ((ny - 1 - y) * nx + x) * 4, col;
      if (v === 999) col = out;
      else if (v === 2) col = land;
      else if (v > 0) col = ((x > 0 && z(y, x - 1) <= 0) || (x < nx - 1 && z(y, x + 1) <= 0) || (y > 0 && z(y - 1, x) <= 0) || (y < ny - 1 && z(y + 1, x) <= 0)) ? le : land;
      else if (-v < safety) col = ((x > 0 && -z(y, x - 1) >= safety) || (x < nx - 1 && -z(y, x + 1) >= safety) || (y > 0 && -z(y - 1, x) >= safety) || (y < ny - 1 && -z(y + 1, x) >= safety)) ? she : sh;
      else { var f = Math.min(1, -v / 60); col = [sea2[0] + (sea[0] - sea2[0]) * f, sea2[1] + (sea[1] - sea2[1]) * f, sea2[2] + (sea[2] - sea2[2]) * f]; }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); depthImg = c;
  }
  var coastBits = null;
  function coastLand(la, lo) { var C = meta.coast; if (!coastBits) return false; var y = Math.round((la - C.lat0) / C.dlat), x = Math.round((lo - C.lon0) / C.dlon); if (y < 0 || x < 0 || y >= C.ny || x >= C.nx) return false; var i = y * C.nx + x; return (coastBits[i >> 3] >> (7 - (i & 7))) & 1; }
  function draw() {
    if (!W || !meta) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.big) { drawBig(); return; }
    ctx.fillStyle = css['--sea']; ctx.fillRect(0, 0, W, H);
    if (depthImg) { var L = P.depth.L; ctx.imageSmoothingEnabled = view.s < 900; ctx.drawImage(depthImg, X(L.lon0 - L.dlon / 2), Y(L.lat0 + (L.ny - 0.5) * L.dlat), (L.nx * L.dlon) * K * view.s, L.ny * L.dlat * view.s); }
    grid();
    if (S.show.band) bandEdge();
    if (S.show.tide) arrows('tide');
    if (S.show.wind && $('windShow').value) arrows('wind');
    marks();
    S.routes.forEach(function (s) { if (!s.hidden && s !== S.sel) line(s, 1.8, 0.9); });
    if (S.sel && !S.sel.hidden) line(S.sel, 3.6, 1);
    if (S.show.real) realBoats();
    if (S.show.ghosts && S.ghosts && S.sel) ghostsDraw();
    S.routes.forEach(function (s) { if (s.hidden) return; var p = posAt(s.r.path.map(function (q) { return q.t; }), s.r.path, S.t); if (!p) return; var hd = hdgAt(s.r.path, p.k), x = X(p.lo), y = Y(p.la); if (s === S.sel) { triMark(x, y, hd, 13, css['--panel'], col(s), 3); } else triMark(x, y, hd, 9, css['--panel'], col(s), 2); });
    if (S.from) { ctx.strokeStyle = css['--ink']; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(S.from.lon), Y(S.from.lat), 10, 0, 7); ctx.stroke(); }
    scale();
  }
  function col(s) { return css[s.combined ? '--route' : STYLE[s.id][0]]; }
  function grid() {
    ctx.strokeStyle = css['--ink']; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.font = '10px "JetBrains Mono", monospace'; ctx.fillStyle = css['--muted'];
    var step = [1 / 60, 1 / 30, 1 / 12, 1 / 6, 0.25, 0.5, 1, 2, 5, 10].find(function (s) { return s * view.s > 90; }) || 10;
    ctx.beginPath();
    for (var lo = Math.ceil(LO(0) / step) * step; lo < LO(W); lo += step) { ctx.moveTo(X(lo), 0); ctx.lineTo(X(lo), H); }
    for (var la = Math.ceil(LA(H) / step) * step; la < LA(0); la += step) { ctx.moveTo(0, Y(la)); ctx.lineTo(W, Y(la)); }
    ctx.stroke(); ctx.globalAlpha = 1;
    for (lo = Math.ceil(LO(0) / step) * step; lo < LO(W); lo += step) ctx.fillText(dm(lo, 'EW'), X(lo) + 3, H - 6);
    for (la = Math.ceil(LA(H) / step) * step; la < LA(0); la += step) ctx.fillText(dm(la, 'NS'), 4, Y(la) - 3);
  }
  function dm(v, h) { var a = Math.abs(v), d = Math.floor(a + 1e-9), m = Math.round((a - d) * 60); if (m === 60) { d++; m = 0; } return d + '°' + String(m).padStart(2, '0') + '′' + (v < 0 ? h[1] : h[0]); }
  function scale() {
    var nm = view.s / 60, len = [1, 2, 5, 10, 20].find(function (n) { return n * nm > 60; }) || 20, x = W - 16 - len * nm, y = H - 22;
    ctx.strokeStyle = css['--ink']; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * nm, y); ctx.stroke();
    ctx.fillStyle = css['--ink']; ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillText(len + ' nm', x, y - 5);
  }
  /* ---------- wind and tide symbols (chosen in Settings, Display) ----------
     Wind: W2 barb, W5 slow streaks with numbers, W6 barb with number, W7 FirstShift triangle.
     Tide: T5 translucent weighted arrow, T6 translucent arrow outlined, T1 dotted arrow, T3 tidal atlas arrow. */
  function head(x, y, dx, dy, len, w) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * len - dy * w, y - dy * len + dx * w); ctx.lineTo(x - dx * len + dy * w, y - dy * len - dx * w); ctx.closePath(); ctx.fill(); }
  function barb(x, y, dx, dy, s) {
    var L = 24, ux = -dx, uy = -dy, ex = x + ux * L, ey = y + uy * L, r = Math.round(s / 5) * 5, pos = 0, px = -uy, py = ux, fl = 11;
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
    ctx.beginPath();
    while (r >= 50) { var bx = ex - ux * pos, by = ey - uy * pos; ctx.moveTo(bx, by); ctx.lineTo(bx + px * fl, by + py * fl); ctx.lineTo(bx - ux * 6, by - uy * 6); ctx.fill(); pos += 8; r -= 50; }
    while (r >= 10) { bx = ex - ux * pos; by = ey - uy * pos; ctx.moveTo(bx, by); ctx.lineTo(bx + px * fl + ux * 4, by + py * fl + uy * 4); pos += 4.5; r -= 10; }
    if (r >= 5) { if (pos === 0) pos = 4.5; bx = ex - ux * pos; by = ey - uy * pos; ctx.moveTo(bx, by); ctx.lineTo(bx + px * fl / 2 + ux * 2, by + py * fl / 2 + uy * 2); }
    ctx.stroke();
  }
  function arrows(kind) {
    var f = kind === 'wind' ? P.wind[$('windShow').value] : P.tide[$('tideSel').value]; if (!f) return;
    var sym = kind === 'wind' ? $('windSym').value : $('tideSym').value;
    var sp = kind === 'wind' ? (sym === 'W5' ? 30 : 60) : ({ T5: 46, T6: 46, T1: 38, T3: 42 }[sym] || 40);
    ctx.strokeStyle = css[kind === 'wind' ? '--wind' : '--tide']; ctx.fillStyle = ctx.strokeStyle; ctx.font = '10px "JetBrains Mono", monospace'; ctx.lineCap = 'round';
    var now = performance.now();
    var off = kind === 'tide' ? sp / 2 : 0;
    for (var y = 80 + off; y < H; y += sp) for (var x = sp / 2 + off; x < W; x += sp) {
      var la = LA(y), lo = LO(x);
      if (kind === 'tide') { if (!P.depth || !(P.depth.nearest('z', la, lo) < 0)) continue; }
      var u = f.sample('u', la, lo, S.t), v = f.sample('v', la, lo, S.t); if (!(u === u) || !(v === v)) continue;
      var s = Math.hypot(u, v) / KN; if (s < (kind === 'wind' ? 0.5 : 0.15)) continue;
      var dx = u / Math.hypot(u, v), dy = -v / Math.hypot(u, v), lbl = kind === 'wind' || (Math.round(x / sp) + Math.round(y / sp)) % 2 === 0;
      if (kind === 'tide') ctx.font = '9px "JetBrains Mono", monospace';
      if (sym === 'W2') barb(x, y, dx, dy, s);
      else if (sym === 'W6') { barb(x, y, dx, dy, s); ctx.fillText(s.toFixed(0), x + 5, y + 13); }
      else if (sym === 'W7') { var L = 12 + s * 1.4, w = 3.2 + s * 0.15; ctx.beginPath(); ctx.moveTo(x + dx * L / 2, y + dy * L / 2); ctx.lineTo(x - dx * L / 2 - dy * w, y - dy * L / 2 + dx * w); ctx.lineTo(x - dx * L / 2 + dy * w, y - dy * L / 2 - dx * w); ctx.closePath(); ctx.fill(); ctx.fillText(s.toFixed(0), x + 7, y + 13); }
      else if (sym === 'W5') {
        ctx.lineWidth = 1.3;
        for (var k = 0; k < 2; k++) { var ph = ((now * 0.00009 * s + k / 2 + ((la * 97 + lo * 31) % 1 + 1) % 1) % 1), L2 = 5 + s * 0.9, cx = x + dx * (ph - 0.5) * 26 + (k - 0.5) * dy * 10, cy = y + dy * (ph - 0.5) * 26 - (k - 0.5) * dx * 10;
          ctx.globalAlpha = 0.6 * Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(cx - dx * L2 / 2, cy - dy * L2 / 2); ctx.lineTo(cx + dx * L2 / 2, cy + dy * L2 / 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
        if ((Math.round(x / sp) + Math.round(y / sp)) % 2 === 0) { ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.fillText(s.toFixed(0), x - 4, y + 4); ctx.font = '10px "JetBrains Mono", monospace'; }
      }
      else if (sym === 'T5' || sym === 'T6') {
        var L3 = 12 + s * 9, w3 = 2 + s * 3.2, hw = w3 * 1.9, hl = 5 + s * 3, bx = x - dx * L3 / 2, by = y - dy * L3 / 2, tx = x + dx * L3 / 2, ty = y + dy * L3 / 2, nx = x + dx * (L3 / 2 - hl), ny = y + dy * (L3 / 2 - hl);
        ctx.beginPath(); ctx.moveTo(bx - dy * w3 / 2, by + dx * w3 / 2); ctx.lineTo(nx - dy * w3 / 2, ny + dx * w3 / 2); ctx.lineTo(nx - dy * hw / 2, ny + dx * hw / 2); ctx.lineTo(tx, ty); ctx.lineTo(nx + dy * hw / 2, ny - dx * hw / 2); ctx.lineTo(nx + dy * w3 / 2, ny - dx * w3 / 2); ctx.lineTo(bx + dy * w3 / 2, by - dx * w3 / 2); ctx.closePath();
        ctx.globalAlpha = 0.32; ctx.fill(); ctx.globalAlpha = 1; if (sym === 'T6') { ctx.lineWidth = 0.9; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1; }
        if (s >= 0.6 && lbl) { ctx.globalAlpha = 0.8; ctx.fillText(s.toFixed(1), x + 6, y - 6); ctx.globalAlpha = 1; }
      }
      else if (sym === 'T1') { var L4 = 8 + s * 7; for (var q = 0; q <= 4; q++) { var fq = q / 4 - 0.5; ctx.beginPath(); ctx.arc(x + dx * L4 * fq, y + dy * L4 * fq, 1.4, 0, 7); ctx.fill(); } head(x + dx * (L4 / 2 + 5), y + dy * (L4 / 2 + 5), dx, dy, 5, 2.8); if (s >= 0.5 && lbl) { ctx.globalAlpha = 0.8; ctx.fillText(s.toFixed(1), x + 5, y + 11); ctx.globalAlpha = 1; } }
      else if (sym === 'T3') { var L5 = 10 + s * 7, w5 = 0.8 + s * 1.6; ctx.lineWidth = w5; ctx.beginPath(); ctx.moveTo(x - dx * L5 / 2, y - dy * L5 / 2); ctx.lineTo(x + dx * (L5 / 2 - 4), y + dy * (L5 / 2 - 4)); ctx.stroke(); head(x + dx * L5 / 2, y + dy * L5 / 2, dx, dy, 4 + w5, 1.8 + w5); if (s >= 0.5 && lbl) { ctx.globalAlpha = 0.8; ctx.fillText(Math.round(s * 10), x + 5, y - 5); ctx.globalAlpha = 1; } }
    }
    ctx.lineCap = 'butt';
  }
  // the slow-streak wind symbol moves, so redraw about 20 times a second while it is on screen
  var animOn = false;
  function animate() {
    var want = $('windSym').value === 'W5' && S.show.wind && !S.big && !document.hidden;
    if (want && !animOn) { animOn = true; var last = 0; (function loop(ts) { if (!animOn) return; if (ts - last > 50) { last = ts; draw(); } requestAnimationFrame(loop); })(0); }
    if (!want) animOn = false;
  }
  function marks() {
    var c = meta.course; ctx.font = '600 11px Inter, sans-serif';
    [c.start].concat(c.marks).concat([c.finish]).forEach(function (m) { var mx = X(m.lon), my = Y(m.lat); ctx.beginPath(); ctx.arc(mx, my, 7.5, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--ink']; ctx.lineWidth = 1.5; ctx.stroke(); triMark(mx, my + 0.8, 0, 4.6, css['--ink']); ctx.fillStyle = css['--ink']; ctx.fillText(m.name, mx + 11, my - 8); });
    if (S.legs && S.legs[0].gate) { var g = S.legs[0].gate; ctx.strokeStyle = css['--ink']; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(g.a[1]), Y(g.a[0])); ctx.lineTo(X(g.b[1]), Y(g.b[0])); ctx.stroke(); ctx.setLineDash([]); }
  }
  /* FirstShift triangle markers: open for your boat, solid for the fleet, triangle in a circle for marks */
  function triMark(x, y, hdg, size, fill, stroke, lw) {
    var r = hdg * R, dx = Math.sin(r), dy = -Math.cos(r);
    ctx.beginPath(); ctx.moveTo(x + dx * size, y + dy * size); ctx.lineTo(x - dx * size * 0.7 - dy * size * 0.62, y - dy * size * 0.7 + dx * size * 0.62); ctx.lineTo(x - dx * size * 0.7 + dy * size * 0.62, y - dy * size * 0.7 - dx * size * 0.62); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function hdgAt(path, k) { var i = Math.max(0, Math.min(path.length - 2, Math.floor(k))), a = path[i], b = path[i + 1]; return (Math.atan2((b.lo - a.lo) * K, b.la - a.la) / R + 360) % 360; }
  function dot(la, lo, r, fill, stroke) { ctx.beginPath(); ctx.arc(X(lo), Y(la), r, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
  function line(s, w, a) {
    ctx.globalAlpha = a; ctx.strokeStyle = col(s); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.setLineDash(s.combined || s === S.sel ? [] : STYLE[s.id][1]);
    ctx.beginPath(); s.r.path.forEach(function (p, i) { i ? ctx.lineTo(X(p.lo), Y(p.la)) : ctx.moveTo(X(p.lo), Y(p.la)); }); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  function posAt(ts, path, t) {
    if (!ts || t < ts[0]) return null;
    var n = ts.length; if (t >= ts[n - 1]) return { la: path[n - 1].la, lo: path[n - 1].lo, k: n - 1, done: true };
    var lo = 0, hi = n - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ts[m] <= t) lo = m; else hi = m; }
    var f = (t - ts[lo]) / (ts[hi] - ts[lo] || 1); return { la: path[lo].la + (path[hi].la - path[lo].la) * f, lo: path[lo].lo + (path[hi].lo - path[lo].lo) * f, k: lo + f, i: lo };
  }
  function ghostsDraw() {
    S.ghostXY = [];
    S.ghosts.forEach(function (g) { var p = posAt(g.ts, S.sel.r.path, S.t); if (!p) return; var x = X(p.lo), y = Y(p.la); S.ghostXY.push([x, y, g]); ctx.globalAlpha = 0.85; triMark(x, y, hdgAt(S.sel.r.path, p.k), 6, css['--ghost']); ctx.globalAlpha = 1; });
  }
  function realBoats() {
    var t = T0 + S.t * 3600; S.realXY = [];
    meta.fleet.forEach(function (f) {
      var tr = f.track; if (!tr || !tr.length || t < tr[0][0] || t > tr[tr.length - 1][0] + 1800) return;
      var i = 0; while (i < tr.length - 1 && tr[i + 1][0] <= t) i++;
      var a = tr[i], b = tr[Math.min(i + 1, tr.length - 1)], k = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0, x = X(a[2] + (b[2] - a[2]) * k), y = Y(a[1] + (b[1] - a[1]) * k);
      S.realXY.push([x, y, f]); var rh = (Math.atan2((b[2] - a[2]) * K, b[1] - a[1]) / R + 360) % 360; triMark(x, y, rh, 6.5, null, css['--ink'], 1.3);
    });
  }


  /* ---------- course band edge ---------- */
  var bandPath = null;
  function bandEdge() {
    if (!bandPath) {
      // outline of the band from the depth layer's run ends, or from the geometry
      var B = meta.course.band, k = Math.cos(50.1 * R), pts = [];
      function ex(la, lo) { var best = 1e9; B.forEach(function (s) { var ax = s[1] * 60 * k, ay = s[0] * 60, bx = s[3] * 60 * k, by = s[2] * 60, px = lo * 60 * k, py = la * 60, dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(px - ax - u * dx, py - ay - u * dy) - s[4]); }); return best; }
      var segs = [], st = 0.02;
      for (var la = 49.2; la < 51.0; la += st) for (var lo = -2.3; lo < 0.6; lo += st / 0.64) {
        var a0 = ex(la, lo) <= 0, a1 = ex(la, lo + st / 0.64) <= 0, a2 = ex(la + st, lo) <= 0;
        if (a0 !== a1) segs.push([la, lo + st / 0.64, la + st, lo + st / 0.64]);
        if (a0 !== a2) segs.push([la + st, lo, la + st, lo + st / 0.64]);
      }
      bandPath = segs;
    }
    ctx.strokeStyle = css['--muted']; ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]); ctx.beginPath();
    bandPath.forEach(function (s) { ctx.moveTo(X(s[1]), Y(s[0])); ctx.lineTo(X(s[3]), Y(s[2])); }); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ---------- big picture: pressure and wind over north-west Europe ---------- */
  var saved = null;
  function toggleBig() {
    S.big = !S.big;
    if (S.big) { saved = { lo: view.lo, la: view.la, s: view.s }; var O = meta.overview, w = (O.nx - 1) * O.dlon, h = (O.ny - 1) * O.dlat; view.lo = O.lon0 + w / 2; view.la = O.lat0 + h / 2; view.s = Math.min(W / (w * K), (H - 70) / h); }
    else if (saved) { view.lo = saved.lo; view.la = saved.la; view.s = saved.s; }
    $('tip').hidden = true; layersPop(); draw();
  }
  function ovField(key) {
    var O = meta.overview, d = O[key], arr = new Int16Array(S.ov, d.off, d.n), plane = O.nx * O.ny, hrs = O.hours, t = Math.max(hrs[0], Math.min(hrs[hrs.length - 1], S.t));
    var i = 0; while (i < hrs.length - 2 && hrs[i + 1] <= t) i++; var f = (t - hrs[i]) / (hrs[i + 1] - hrs[i]);
    return function (y, x) { return (arr[i * plane + y * O.nx + x] * (1 - f) + arr[(i + 1) * plane + y * O.nx + x] * f) * d.scale; };
  }
  function drawBig() {
    var O = meta.overview, M = O.lsm, bits = new Uint8Array(S.ov, M.off, Math.ceil(M.nx * M.ny / 8));
    ctx.fillStyle = css['--sea']; ctx.fillRect(0, 0, W, H); ctx.fillStyle = css['--land'];
    for (var y = 0; y < M.ny; y++) for (var x = 0; x < M.nx; x++) { var i = y * M.nx + x; if ((bits[i >> 3] >> (7 - (i & 7))) & 1) { var la = M.lat0 + y * M.dlat, lo = M.lon0 + x * M.dlon; ctx.fillRect(X(lo - 0.125), Y(la + 0.125), 0.25 * K * view.s + 0.6, 0.25 * view.s + 0.6); } }
    grid();
    // isobars every 4 hPa by marching squares
    var p = ovField('msl'); ctx.strokeStyle = css['--ink']; ctx.lineWidth = 1.1; ctx.font = '10px "JetBrains Mono", monospace'; ctx.fillStyle = css['--ink'];
    var lo_ = 1e9, hi_ = -1e9; for (y = 0; y < O.ny; y++) for (x = 0; x < O.nx; x++) { var v = p(y, x); lo_ = Math.min(lo_, v); hi_ = Math.max(hi_, v); }
    for (var lev = Math.ceil(lo_ / 4) * 4; lev <= hi_; lev += 4) {
      ctx.beginPath(); var labelled = false;
      for (y = 0; y < O.ny - 1; y++) for (x = 0; x < O.nx - 1; x++) {
        var c = [p(y, x), p(y, x + 1), p(y + 1, x + 1), p(y + 1, x)], q = [[0, 0], [0, 1], [1, 1], [1, 0]], hits = [];
        for (var e = 0; e < 4; e++) { var a1 = c[e], a2 = c[(e + 1) % 4]; if ((a1 - lev) * (a2 - lev) < 0) { var t = (lev - a1) / (a2 - a1), py = q[e][0] + (q[(e + 1) % 4][0] - q[e][0]) * t, px = q[e][1] + (q[(e + 1) % 4][1] - q[e][1]) * t; hits.push([X(O.lon0 + (x + px) * O.dlon), Y(O.lat0 + (y + py) * O.dlat)]); } }
        for (var hh = 0; hh + 1 < hits.length; hh += 2) { ctx.moveTo(hits[hh][0], hits[hh][1]); ctx.lineTo(hits[hh + 1][0], hits[hh + 1][1]); if (!labelled && x % 9 === 4) { ctx.fillText(lev, hits[hh][0] + 2, hits[hh][1] - 2); labelled = true; } }
      }
      ctx.stroke();
    }
    // wind arrows at 2 degrees
    var u = ovField('u'), v2 = ovField('v'); ctx.strokeStyle = css['--wind']; ctx.fillStyle = css['--wind']; ctx.lineWidth = 1.5;
    for (y = 0; y < O.ny; y += 2) for (x = 0; x < O.nx; x += 2) {
      var uu = u(y, x), vv = v2(y, x), s = Math.hypot(uu, vv) / KN; if (s < 1) continue;
      var X0 = X(O.lon0 + x * O.dlon), Y0 = Y(O.lat0 + y * O.dlat), L = Math.min(30, 8 + s * 0.9), dx = uu / Math.hypot(uu, vv), dy = -vv / Math.hypot(uu, vv);
      ctx.beginPath(); ctx.moveTo(X0 - dx * L / 2, Y0 - dy * L / 2); ctx.lineTo(X0 + dx * L / 2, Y0 + dy * L / 2); ctx.stroke();
      var hx = X0 + dx * L / 2, hy = Y0 + dy * L / 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - dx * 6 - dy * 3.5, hy - dy * 6 + dx * 3.5); ctx.lineTo(hx - dx * 6 + dy * 3.5, hy - dy * 6 - dx * 3.5); ctx.fill();
      ctx.fillText(s.toFixed(0), X0 + 5, Y0 + 12);
    }
    // the race area
    ctx.strokeStyle = css['--route']; ctx.lineWidth = 2; ctx.strokeRect(X(-2.3), Y(51.0), 2.9 * K * view.s, 1.8 * view.s);
    ctx.fillStyle = css['--route']; ctx.font = '600 12px Inter, sans-serif'; ctx.fillText('Race area', X(-2.3), Y(51.0) - 6);
    ctx.fillStyle = css['--ink']; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText('Big picture: ECMWF pressure (hPa) and wind (kn), ' + clockH(Math.max(O.hours[0], Math.min(O.hours[O.hours.length - 1], S.t))).slice(4), 12, H - 30);
    scale();
  }

  /* ---------- time ---------- */
  function tFromSlider() { var a = S.tmin != null ? S.tmin : 5, b = S.tmax != null ? S.tmax : 30; return a + (b - a) * $('time').value / 1000; }
  function setTime(t) { S.t = t; var a = S.tmin != null ? S.tmin : 5, b = S.tmax != null ? S.tmax : 30; $('time').value = Math.round(1000 * (t - a) / (b - a)); update(); }
  function update() {
    $('clock').innerHTML = clockH(S.t) + '<small>' + (S.start ? (S.t >= S.start.t ? fmtH(S.t - S.start.t) + ' since start' : 'before start') : 'UTC') + '</small>';
    var s = S.sel, h = '';
    if (s) {
      var p = s.r.path, pos = posAt(p.map(function (q) { return q.t; }), p, S.t);
      if (pos && !pos.done && pos.i != null) {
        var q = p[pos.i + 1] || p[pos.i], lg = S.legs[Math.min(q.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a;
        var vmc = q.bsp * Math.cos((q.hdg - FSRouter.brg(pos.la, pos.lo, tg[0], tg[1])) * R);
        h = kv('Hdg', pad(q.hdg) + '°') + kv('BSP', q.bsp.toFixed(1)) + kv('TWA', Math.abs(Math.round(q.twa)) + (q.twa < 0 ? 'P' : 'S')) + kv('TWS', q.tws.toFixed(1)) + kv('VMG mark', vmc.toFixed(1)) + kv('Sail', FSRouter.sailFor(q, sailsList()) || '-') + kv('Sea', q.hs ? q.hs.toFixed(1) + ' m' : '-');
      } else if (pos && pos.done) h = kv('Finished', clockH(s.r.finish).slice(4));
    }
    $('now').innerHTML = h; draw(); if (S.ghosts && !$('t-fleet').hidden) fleetTable();
  }
  function kv(k, v) { return '<div><span>' + k + '</span><b>' + v + '</b></div>'; }
  function pad(x) { return String(Math.round(((x % 360) + 360) % 360)).padStart(3, '0'); }
  var playing = false, lastTs = 0;
  function togglePlay() { playing = !playing; $('playIcon').innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M7 5v14l12-7z"/>'; $('play').setAttribute('aria-label', playing ? 'Pause' : 'Play'); if (playing) { lastTs = 0; if (+$('time').value >= 1000) setTime(S.tmin || 5); requestAnimationFrame(tick); } }
  function tick(ts) { if (!playing) return; if (lastTs) { var t = S.t + (ts - lastTs) / 1000 * (+$('speed').value || 1); if (t >= (S.tmax || 30)) { t = S.tmax || 30; togglePlay(); } setTime(t); } lastTs = ts; if (playing) requestAnimationFrame(tick); }

  /* ---------- pointer ---------- */
  var ptrs = new Map(), pinch = 0, moved = 0;
  cv.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY > 0 ? 1 / 1.15 : 1.15); }, { passive: false });
  function zoomAt(x, y, f) { var lo = LO(x), la = LA(y); view.s = Math.max(150, Math.min(20000, view.s * f)); view.lo = lo - (x - W / 2) / (K * view.s); view.la = la + (y - H / 2) / view.s; draw(); }
  cv.addEventListener('dblclick', function () { fit(); draw(); });
  cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); moved = 0; closeLayers(); if (!wide() && !$('panel').classList.contains('collapsed')) closePanel(); });
  cv.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') hover(e.offsetX, e.offsetY, false); return; }
    var prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (ptrs.size === 1) { var dx = e.offsetX - prev[0], dy = e.offsetY - prev[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { view.lo -= dx / (K * view.s); view.la += dy / view.s; draw(); if (e.pointerType === 'mouse') $('tip').hidden = true; } return; }
    var v = Array.from(ptrs.values()), d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); moved = 99;
    if (pinch) zoomAt((v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2, d / pinch); pinch = d;
  });
  cv.addEventListener('pointerup', function (e) { if (ptrs.has(e.pointerId) && moved < 6 && ptrs.size === 1) tap(e.offsetX, e.offsetY, e.pointerType !== 'mouse'); ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointercancel', function (e) { ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs.size && !$('tip').classList.contains('docked')) $('tip').hidden = true; });
  function tap(x, y, touch) {
    if ($('fromHere').getAttribute('aria-pressed') === 'true') {
      var la = LA(y), lo = LO(x), z = P.depth ? P.depth.nearest('z', la, lo) : NaN;
      if (!(z <= -(+$('depth').value))) { busy('That is land or too shallow. Tap open water.'); return; }
      S.from = { lat: la, lon: lo, t: S.t }; $('fromHere').setAttribute('aria-pressed', 'false'); busy(''); run(); return;
    }
    hover(x, y, touch);
  }
  function hover(x, y, docked) {
    if (!meta) return;
    if (S.big) { var O = meta.overview, gy = Math.round((LA(y) - O.lat0) / O.dlat), gx = Math.round((LO(x) - O.lon0) / O.dlon); if (gy < 0 || gx < 0 || gy >= O.ny || gx >= O.nx) return;
      var pu = ovField('u')(gy, gx), pv = ovField('v')(gy, gx); $('tipBody').innerHTML = '<b>' + dm(LA(y), 'NS') + ' ' + dm(LO(x), 'EW') + '</b>' + r2('Pressure', ovField('msl')(gy, gx).toFixed(0) + ' hPa') + r2('Wind', (Math.hypot(pu, pv) / KN).toFixed(0) + ' kn from ' + pad(Math.atan2(-pu, -pv) / R) + '°');
      $('tip').hidden = false; $('tip').classList.toggle('docked', !!docked); if (!docked) { $('tip').style.left = Math.min(W - 230, x + 14) + 'px'; $('tip').style.top = Math.max(64, y + 14) + 'px'; } return; }
    var la = LA(y), lo = LO(x), t = S.t, rows = [], tip = $('tip');
    var z = P.depth ? P.depth.nearest('z', la, lo) : NaN;
    rows.push('<b>' + dm(la, 'NS') + ' ' + dm(lo, 'EW') + '</b>');
    rows.push(r2('Depth', z === z ? (z > 0 ? 'land' : z <= -99 ? 'over 20 m' : (-z).toFixed(1) + ' m') : 'outside forecast band'));
    var wm = $('windShow').value || (S.sel ? S.sel.models[0] : Object.keys(P.wind)[0]), wf = P.wind[wm], tws = 0, twd = 0;
    if (wf) { var u = wf.sample('u', la, lo, t), v = wf.sample('v', la, lo, t); tws = Math.hypot(u, v) / KN; twd = (Math.atan2(-u, -v) / R + 360) % 360; rows.push(r2('Wind ' + short(wm), tws.toFixed(1) + ' kn from ' + pad(twd) + '°')); }
    var tf = P.tide[$('tideSel').value];
    if (tf) { var cu = tf.sample('u', la, lo, t), cv2 = tf.sample('v', la, lo, t); if (cu === cu) rows.push(r2('Tide', (Math.hypot(cu, cv2) / KN).toFixed(1) + ' kn to ' + pad(Math.atan2(cu, cv2) / R) + '°')); }
    var wv = P.wave[$('waveSel').value], hsv = 0, wdv = NaN;
    if (wv) { hsv = wv.sample('hs', la, lo, t); wdv = wv.sampleDir(la, lo, t); var tp = wv.sample('tp', la, lo, t); if (hsv === hsv) rows.push(r2('Sea', hsv.toFixed(1) + ' m from ' + pad(wdv) + '°' + (tp === tp ? ', ' + tp.toFixed(0) + ' s' : ''))); else hsv = 0; }
    // boat figures only when the pointer is on a route: open water has no boat
    var best = null, bs = null, bd2 = docked ? 26 : 16;
    S.routes.forEach(function (s) { if (s.hidden) return; s.r.path.forEach(function (p) { if (p.bsp == null) return; var d = Math.hypot(X(p.lo) - x, Y(p.la) - y) - (s === S.sel ? 3 : 0); if (d < bd2) { bd2 = d; best = p; bs = s; } }); });
    if (best) {
      var lg = S.legs[Math.min(best.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a, o = opts(bs.models), spd = speedFn(o);
      var tgt = spd(best.tws, best.twa), sf = FSRouter.seaFactor(best.hs, best.wd, best.hdg, o.sea);
      var bu = FSRouter.bestVmg(spd, best.tws, true), bdn = FSRouter.bestVmg(spd, best.tws, false);
      rows.push('<b style="color:' + col(bs) + '">' + (bs.combined ? 'Combined' : short(bs.id)) + ' route, ' + clockH(best.t).slice(4) + '</b>');
      rows.push(r2('Heading', pad(best.hdg) + '\u00b0 · TWA ' + Math.abs(Math.round(best.twa)) + '\u00b0 ' + (best.twa < 0 ? 'port' : 'stbd')));
      rows.push(r2('Boat speed', best.bsp.toFixed(1) + ' kn' + (sf < 0.995 || sf > 1.005 ? ' (sea ' + (sf >= 1 ? '+' : '') + Math.round((sf - 1) * 100) + '%)' : '')));
      rows.push(r2('VMG to mark', (best.bsp * Math.cos((best.hdg - FSRouter.brg(best.la, best.lo, tg[0], tg[1])) * R)).toFixed(1) + ' kn'));
      rows.push(r2('True wind', best.tws.toFixed(1) + ' kn from ' + pad(best.twd) + '\u00b0'));
      rows.push(r2(Math.abs(best.twa) < 90 ? 'Upwind target' : 'Downwind target', Math.abs(best.twa) < 90 ? bu[0] + '\u00b0 · ' + bu[1].toFixed(1) + ' kn · VMG ' + bu[2].toFixed(1) : bdn[0] + '\u00b0 · ' + bdn[1].toFixed(1) + ' kn · VMG ' + bdn[2].toFixed(1)));
      var sl = FSRouter.sailFor(best, sailsList()); if (sl) rows.push(r2('Sail', sl));
      if (best.tack) rows.push(r2('Manoeuvre', Math.abs(best.twa) > 90 ? 'gybe' : 'tack'));
    }
    var near = null, nd = docked ? 16 : 10;
    ((S.show.ghosts && S.ghostXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ' if on your route (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    ((S.show.real && S.realXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ', real position (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    if (near) rows.push('<b>' + near + '</b>');
    $('tipBody').innerHTML = rows.join(''); tip.hidden = false; tip.classList.toggle('docked', !!docked);
    if (!docked) { var tw = tip.offsetWidth, th = tip.offsetHeight; tip.style.left = Math.min(W - tw - 6, x + 14) + 'px'; tip.style.top = Math.max(64, Math.min(H - th - 6, y + 14)) + 'px'; }
    else { tip.style.left = ''; tip.style.top = ''; dot(la, lo, 5, 'transparent', css['--ink']); }
  }
  function r2(k, v) { return '<div class="r"><span>' + k + '</span><span>' + v + '</span></div>'; }
  var spCache = {};
  function speedFn(o) { var key = o.polar ? 'p' + $('polarTxt').value.length : 't' + o.tcc; if (!spCache[key]) spCache[key] = FSRouter.polarTable(o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc)); return spCache[key]; }
})();
