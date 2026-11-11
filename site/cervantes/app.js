(function () {
  'use strict';
  var VERSION = 'FirstShift Route v0.5.0';
  var R = Math.PI / 180, KN = 1852 / 3600, $ = function (id) { return document.getElementById(id); };
  var meta, P = FSRouter.emptyPack(), T0, workers = [], wq = 0, jobs = {}, jid = 0;
  var STYLE = { ukv: ['--m1', []], ecmwf: ['--m2', [9, 4]], gfs: ['--m3', [2, 4]], aifs: ['--m4', [12, 4, 2, 4]], mog: ['--m5', [1, 5]], icon: ['--m6', [6, 3, 1, 3]] };
  var S = { t: 5, routes: [], sel: null, matrix: null, ghosts: null, from: null, running: false, show: { wind: true, tide: true, ghosts: true, real: false, band: true, tss: true, lights: true }, choice: {}, loaded: {} };
  var css = {};
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- colours ---------- */
  function readCss() { var cs = getComputedStyle(document.documentElement); ['--sea', '--sea2', '--land', '--landedge', '--shoal', '--shoaledge', '--route', '--wind', '--tide', '--ink', '--muted', '--panel', '--ghost', '--out', '--m1', '--m2', '--m3', '--m4', '--m5', '--m6'].forEach(function (k) { css[k] = cs.getPropertyValue(k).trim(); }); }
  /* screen: follow the device, light, dark, or night red; the Night button flips between night and the last day setting */
  var dayMode = 'auto';
  var MODEICON = { dark: '<svg viewBox="0 0 24 24"><path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/></svg>',
    night: '<svg viewBox="0 0 24 24"><path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' };
  function setMode(mode) {
    var r = document.documentElement;
    if (mode === 'night') r.setAttribute('data-night', ''); else { r.removeAttribute('data-night'); dayMode = mode; store('fs-theme', mode); }
    if (mode === 'light' || mode === 'dark') r.setAttribute('data-theme', mode); else if (mode === 'auto') r.removeAttribute('data-theme');
    $('nightBtn').setAttribute('aria-pressed', mode === 'night'); store('fs-night', mode === 'night' ? '1' : '0');
    var cur = mode === 'night' ? 'night' : mode === 'light' || (mode === 'auto' && !matchMedia('(prefers-color-scheme: dark)').matches) ? 'light' : 'dark';
    $('nightBtn').innerHTML = MODEICON[cur] + '<span class="lbl">' + { dark: 'Dark', night: 'Night', light: 'Light' }[cur] + '</span>';
    $('nightBtn').title = 'Screen: ' + { dark: 'dark', night: 'night red', light: 'light' }[cur] + '. Tap to change';
    [].forEach.call($('modeSeg').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    readCss(); buildDepth(); draw(); if (!$('sheet').hidden) plotPolar();
  }
  function setNight(on) { setMode(on ? 'night' : dayMode); }

  /* ---------- workers ---------- */
  function call(w, msg, tr) { return new Promise(function (ok, no) { msg.id = ++jid; jobs[jid] = { ok: ok, no: no }; w.postMessage(msg, tr || []); }); }
  function pool(msg) { if (!workers.length) return Promise.reject(new Error('This browser cannot run background routing.')); return call(workers[wq++ % workers.length], msg); }
  function all(msgFn) { return Promise.all(workers.map(function (w) { var m = msgFn(); return call(w, m.msg, m.tr); })); }
  var n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
  for (var i = 0; i < n; i++) { try { var w = new Worker('worker.js'); w.onmessage = function (e) { var j = jobs[e.data.id]; if (j) { delete jobs[e.data.id]; e.data.ok ? j.ok(e.data.r) : j.no(new Error(e.data.error)); } }; workers.push(w); } catch (e) { break; } }

  /* phones: From here sits beside Play in the bottom bar */
  (function () { var mq = matchMedia('(max-width:899px)'), fh = $('fromHere'), home = fh.parentNode, next = fh.nextSibling;
    function place() { var bar = document.querySelector('.bar'); if (mq.matches) { bar.insertBefore(fh, $('time')); bar.classList.add('fh'); } else if (fh.parentNode !== home) { home.insertBefore(fh, next); bar.classList.remove('fh'); } }
    place(); if (mq.addEventListener) mq.addEventListener('change', place); })();
  /* ---------- offline: keep the app, forecasts and routes on the device (sw.js) ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }
  function offBadge() { var o = !navigator.onLine; $('offBadge').hidden = !o; $('offBadge').title = o ? 'No signal: Route is using the forecast saved on this device' : ''; }
  window.addEventListener('online', function () { offBadge(); if (meta) chip(); }); window.addEventListener('offline', function () { offBadge(); if (meta) chip(); });
  setTimeout(offBadge, 0);

  /* ---------- start ---------- */
  fetch('pack/pack.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
    meta = m; T0 = m.t0; setup(); loadRaces(); loadChartExtras(); xInit(); adjInit(); helpInit(); racesInit(); mobInit(); aisInit(); spdInit(); crewInit();
    ['windDim', 'tideDim'].forEach(function (id) { var el = $(id), v = store('fs-' + id); if (v != null) el.value = v; var f = function () { $(id + 'V').textContent = el.value + '%'; store('fs-' + id, el.value); draw(); }; el.oninput = f; $(id + 'V').textContent = el.value + '%'; }); if (W) { fit(); fitted = true; }
    fetch('pack/' + m.coast.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { coastBits = new Uint8Array(b); buildDepth(); draw(); });
    var saved = store('fs-plan'); applyPlan(saved && PLANS[saved] ? saved : 'full');
    return loadPre().then(function () { earlyPre(); return download(); });
  }).then(function () { run(); watchForNew(); }).catch(function (e) { $('dataChip').textContent = 'Could not load forecasts: ' + e.message; });

  /* ---------- new forecasts: check every 5 minutes; a button downloads them and routes again ---------- */
  var nextMeta = null;
  function watchForNew() {
    if (!meta.live) return;
    setInterval(function () {
      fetch('pack/pack.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
        if ((m.built || m.t0) === (meta.built || meta.t0) || (nextMeta && (nextMeta.built || nextMeta.t0) === (m.built || m.t0))) return;
        nextMeta = m;
        $('newData').hidden = false;
        $('newDataTxt').textContent = 'New forecast: ' + clockAbs(m.t0).replace(/ (\d\d):00$/, ' $1Z') + ' run';
      }).catch(function () {});
    }, 5 * 60 * 1000);
    $('newDataBtn').onclick = function () {
      if (!nextMeta || S.running) return;
      var m = nextMeta, raceId = meta.course && meta.course.race ? meta.course.race.id : null; nextMeta = null;
      $('newData').hidden = true; busy('Downloading the new forecast…');
      meta = m; T0 = m.t0; meta.course0 = m.course; S.loaded = {}; S.gotAt = {}; S.ov = null; S.routes = []; S.sel = null; S.legs = null; S.ghosts = [];
      if (raceId) applyRace(raceId);
      var st = (+$('startSel').value - T0) / 3600; S.tmin = Math.min(st, S.tmin - 0); S.tmax = Math.min(HMAX(), S.tmax);
      loadPre().then(function () { earlyPre(); return download(); }).then(function () { chip(); dataTable(); run(); }).catch(function (e) { busy(''); $('dlNote').textContent = e.message; });
    };
  }

  /* ---------- data plans ---------- */
  var PLANS = {
    full: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'full', mog: 'full', icon: 'full', nwscur: 'full', ibicur: 'full', nwswav: 'full', ecwav: 'full', emodnet: 'full' },
    coastal: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'off', mog: 'off', icon: 'full', nwscur: 'full', ibicur: 'off', nwswav: 'lite', ecwav: 'off', emodnet: 'full' },
    lite: { ukv: 'lite', ecmwf: 'lite', gfs: 'lite', aifs: 'off', mog: 'off', icon: 'lite', nwscur: 'lite', ibicur: 'off', nwswav: 'off', ecwav: 'full', emodnet: 'lite' }
  };
  function applyPlan(p) { S.choice = Object.assign({}, PLANS[p]); S.plan = p; store('fs-plan', p); [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', b.dataset.plan === p); }); dataTable(); }
  function layer(id) { return meta.layers.find(function (l) { return l.id === id; }); }
  function mb(b) { return b < 1e5 ? (b / 1e3).toFixed(0) + ' kB' : (b / 1e6).toFixed(1) + ' MB'; }
  function res(v) { var a = v.res_km[0], b = v.res_km[1]; return a < 1 ? Math.round((a + b) / 2 * 1000) + ' m' : (Math.abs(a - b) / a < 0.25 ? ((a + b) / 2).toFixed(1) + ' km' : a.toFixed(0) + '×' + b.toFixed(0) + ' km'); }
  /* forecast age: the model run, when it reached the FirstShift server, when it reached this device */
  function hhmm(ms) { var d = new Date(ms); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function dayhm(ms) { var d = new Date(ms), today = new Date(); return (d.toDateString() === today.toDateString() ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ') + hhmm(ms); }
  function ageTxt(h) { return h < 1 ? Math.round(h * 60) + ' min' : Math.floor(h) + ' h ' + String(Math.round((h % 1) * 60)).padStart(2, '0'); }
  function runTxt(t0) { var d = new Date(t0 * 1000); return String(d.getUTCHours()).padStart(2, '0') + 'Z ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]; }
  function ageCls(h) { return h > 18 ? ' style="color:var(--shoaledge);font-weight:700"' : h > 12 ? ' style="color:var(--warn);font-weight:700"' : ''; }
  function dataTable() {
    if (!meta) return;
    var tot = 0, now = Date.now(), h = '<tr><th>Layer</th><th>Version</th><th>Grid</th><th>Step</th><th>Size</th></tr>', kinds = { wind: 'Wind', tide: 'Tide', wave: 'Sea state', depth: 'Depth' };
    meta.layers.forEach(function (L) {
      var c = S.choice[L.id] || 'off', v = L[c === 'off' ? 'full' : c], loaded = S.loaded[L.id];
      if (c !== 'off' && loaded !== c) tot += L[c].gz;
      h += '<tr><td style="font-family:var(--f-body)">' + kinds[L.kind] + ': ' + L.name + (loaded ? ' <span class="pill">on device</span>' : '') + '</td><td><select data-dl="' + L.id + '" aria-label="' + L.name + '">' +
        ['full', 'lite', 'off'].map(function (o) { return '<option value="' + o + '"' + (o === c ? ' selected' : '') + '>' + { full: 'Full', lite: 'Lite', off: 'Off' }[o] + '</option>'; }).join('') + '</select></td><td>' + (c === 'off' ? '-' : res(v)) + '</td><td>' + (c === 'off' || !v.step_h ? '-' : v.step_h + ' h') + '</td><td>' + (c === 'off' ? '-' : mb(L[c].gz)) + '</td></tr>' + (L.kind === 'depth' ? '' : '<tr class="agerow"><td colspan="5">' + (L.run_t0 ? '<b' + ageCls((now / 1000 - L.run_t0) / 3600) + '>' + ageTxt((now / 1000 - L.run_t0) / 3600) + ' old</b> · run ' + runTxt(L.run_t0) : '') + (L.recv || meta.built ? ' · server ' + dayhm((L.recv || meta.built) * 1000) : '') + (S.gotAt && S.gotAt[L.id] ? ' · device ' + dayhm(S.gotAt[L.id]) : '') + '</td></tr>');
    });
    var ovRow = $('ovChk').closest('label'); if (ovRow) ovRow.hidden = !meta.overview;
    if (meta.overview) { if ($('ovChk').checked && !S.ov) tot += meta.overview.gz; $('ovSize').textContent = mb(meta.overview.gz) + (S.ov ? ' · on device' : ''); }
    var w = meta.course.window, RG = (meta.course0 || meta.course).region;
    if (RG) $('bandNote').textContent = 'Whole area: forecasts for every point from ' + RG.s + '° to ' + RG.n + '°N and ' + Math.abs(RG.w) + '°W to ' + Math.abs(RG.e) + '°' + (RG.e >= 0 ? 'E' : 'W') + ', from ' + clockH(w[0]).slice(4) + ' to ' + clockH(w[1]).slice(4) + ' UTC. Any course inside the box routes. Shown as a dashed line on the chart.';
    else {
    var bw = meta.course.band.map(function (b) { return b[4]; });
    $('bandNote').textContent = 'Cut to the race: forecasts only within ' + Math.round(Math.min.apply(null, bw)) + ' nm of the course in the Solent and ' + Math.round(Math.max.apply(null, bw)) + ' nm offshore (30% of each leg), from ' + clockH(w[0]).slice(4) + ' to ' + clockH(w[1]).slice(4) + ' UTC: an hour before the first start to 1.4 times the slowest routed finish. Shown as a dashed line on the chart.';
    }
    $('dataTable').innerHTML = h; $('dlTotal').textContent = tot ? mb(tot) + ' to fetch' : 'nothing new to fetch';
    [].forEach.call($('dataTable').querySelectorAll('select'), function (s) { s.onchange = function () { S.choice[s.dataset.dl] = s.value; S.plan = 'custom'; [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', 'false'); }); dataTable(); }; });
    $('dataNote').textContent = 'Forecast run ' + meta.run + (meta.built ? '; published on the FirstShift server at ' + dayhm(meta.built * 1000) + ' UTC' : '') + '. Age is the time since each model run; amber over 12 hours, red over 18. Times in UTC. Choose what this device downloads: full detail on Starlink, less on a phone signal.';
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
        FSRouter.addLayer(P, spec, buf); S.loaded[L.id] = c; (S.gotAt = S.gotAt || {})[L.id] = Date.now();
        return all(function () { var copy = buf.slice(0); return { msg: { type: 'layer', L: spec, buf: copy }, tr: [copy] }; });
      });
    })).then(function () {
      return ovJob;
    }).then(function () {
      busy(''); dataTable(); modelsList(); selects(); chip(); buildDepth(); draw();
      $('dlNote').textContent = 'Up to date.';
    }).catch(function (e) { busy(''); $('dlNote').textContent = e.message; });
  }
  setInterval(function () { if (meta) { chip(); dataTable(); } }, 60000);
  function chip() {
    var bytes = S.ov && meta.overview ? meta.overview.gz : 0, w = 0; meta.layers.forEach(function (L) { var c = S.loaded[L.id]; if (c) { bytes += L[c].gz; if (L.kind === 'wind') w++; } });
    var hi = S.loaded.ukv === 'full' ? 'UKV 1.5 km' : S.loaded.ukv ? 'UKV lite 3 km' : 'global only';
    var age = (Date.now() / 1000 - meta.t0) / 3600;
    $('dataChip').textContent = 'Route v0.5.0 · ' + (!navigator.onLine ? 'Offline: saved forecast · ' : meta.live ? 'Live · ' : '') + 'Run ' + clockAbs(meta.t0).replace(/ (\d\d):00$/, ' $1Z') + (meta.live ? ' (' + ageTxt(age) + ' old)' : '') + ' · ' + w + ' wind models (' + hi + ') · ' + mb(bytes);
    $('dataChip').style.color = meta.live && age > 18 ? 'var(--shoaledge)' : meta.live && age > 12 ? 'var(--warn)' : '';
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
      for (var hh = first; hh <= Math.min(first + 36, HMAX() - 6); hh++) { var ep = T0 + hh * 3600; starts.push(ep); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + ep + '">' + clockAbs(ep) + ' UTC</option>'); }
    } else Object.keys(bySt).sort().forEach(function (s) { starts.push(+s); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + s + '">' + clockAbs(+s).slice(4) + ' · ' + Object.keys(bySt[s]).sort().join(', ') + '</option>'); });
    $('startSel').value = String(starts[0]);
    S.tmin = (starts[0] - T0) / 3600; S.tmax = Math.min(HMAX(), S.tmin + 26);
    meta.fleet.filter(function (f) { return f.irc; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (f) { $('boatPick').insertAdjacentHTML('beforeend', '<option value="' + f.name + '">' + f.name + ' · TCC ' + f.tcc.toFixed(3) + '</option>'); });
    $('boatPick').onchange = function () { var f = meta.fleet.find(function (x) { return x.name === $('boatPick').value; }); if (f) { $('tcc').value = f.tcc.toFixed(3); if (!$('boatName').value) $('boatName').value = f.name; if (!meta.live) $('startSel').value = String(f.start); boatChanged(); } };
    initBoat();
    $('depth').oninput = function () { $('depthV').textContent = (+$('depth').value).toFixed(1) + ' m'; buildDepth(); draw(); };
    $('run').onclick = function () { S.from = null; run(); };
    $('fromHere').onclick = function () {   /* reroute from where the boat is now: the device's GPS first, else tap the chart */
      var on = $('fromHere').getAttribute('aria-pressed') !== 'true'; $('fromHere').setAttribute('aria-pressed', on);
      if (!on) { busy(''); return; }
      var tap = function (why) { if ($('fromHere').getAttribute('aria-pressed') === 'true') busy((why ? why + ' ' : '') + 'Tap the chart where the boat is now'); };
      if (!navigator.geolocation) return tap('');
      busy('Finding your position…');
      navigator.geolocation.getCurrentPosition(function (g) {
        if ($('fromHere').getAttribute('aria-pressed') !== 'true') return;
        var la = g.coords.latitude, lo = g.coords.longitude, t = (Date.now() / 1000 - T0) / 3600;
        if (la < 35.5 || la > 61.5 || lo < -15 || lo > 12) return tap('Your position is outside the routing area.');
        if (t < 0 || t > HMAX() - 1) return tap('Now is outside the forecast window.');
        S.from = { lat: la, lon: lo, t: t, gps: true }; $('fromHere').setAttribute('aria-pressed', 'false'); busy(''); run();
      }, function () { tap('No GPS fix.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    };
    $('time').oninput = function () { S.t = tFromSlider(); update(); };
    $('play').onclick = togglePlay;
    $('nightBtn').onclick = function (e) {   /* screen menu: dark, night red, light, or follow the device */
      e.stopPropagation(); var m = $('modeMenu'); if (!m.hidden) { m.hidden = true; return; }
      var r = this.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
      var r0 = document.documentElement, cur = r0.hasAttribute('data-night') ? 'night' : (r0.getAttribute('data-theme') || 'auto');
      [].forEach.call(m.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === cur)); }); m.hidden = false;
    };
    [].forEach.call($('modeMenu').querySelectorAll('button'), function (b) { b.onclick = function () { setMode(b.dataset.m); $('modeMenu').hidden = true; }; });
    document.addEventListener('click', function (e) { if (!$('modeMenu').hidden && !$('modeMenu').contains(e.target)) $('modeMenu').hidden = true; });
    [].forEach.call($('modeSeg').children, function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
    if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'), ch = function () { if (dayMode === 'auto' && !document.documentElement.hasAttribute('data-night')) { readCss(); buildDepth(); draw(); } }; if (mq.addEventListener) mq.addEventListener('change', ch); else if (mq.addListener) mq.addListener(ch); }
    /* Settings: route again by itself on closing, if anything that affects the routes changed */
    var setSnap = '';
    function settingsSnap() { return [].map.call(document.querySelectorAll('#sheet input, #sheet select, #sheet textarea'), function (el) { return el.id + '=' + (el.type === 'checkbox' ? el.checked : el.value); }).join('|') + '|' + JSON.stringify(meta && meta.course ? [meta.course.name, meta.course.marks, meta.course.start, meta.course.finish] : ''); }
    var DISPLAY_ONLY = /^(windDim|tideDim|windSym|tideSym|windShow|speed|ovChk)=/;
    function routeSnap() { return settingsSnap().split('|').filter(function (x) { return !DISPLAY_ONLY.test(x); }).join('|'); }
    $('setBtn').onclick = function () { setSnap = routeSnap(); $('sheet').hidden = false; plotPolar(); };
    $('sheetX').onclick = function () { $('sheet').hidden = true; if (setSnap && routeSnap() !== setSnap && !S.running) { busy('Settings changed: routing again…'); S.from = null; run(); } setSnap = ''; };
    $('sheet').onclick = function (e) { if (e.target === $('sheet')) $('sheetX').onclick(); };
    [].forEach.call(document.querySelectorAll('.stabs .tab'), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll('.stabs .tab'), function (x) { x.setAttribute('aria-selected', x === b); $('s-' + x.dataset.s).hidden = x !== b; }); }; });
    [].forEach.call(document.querySelectorAll('.tabs .tab'), function (b) { b.onclick = function () { openTab(b.dataset.tab, true); }; });
    $('panelBtn').onclick = function () { var p = $('panel'); if (wide()) { p.hidden = !p.hidden; } else { p.hidden = false; p.classList.toggle('collapsed'); } $('panelBtn').setAttribute('aria-expanded', !p.hidden && !p.classList.contains('collapsed')); setTimeout(resizeDraw, 0); };
    $('panelX').onclick = closePanel;
    // Esc closes whatever is on top: settings, then layers, then the info card, then results
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('sheet').hidden) $('sheetX').onclick();
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
    dayMode = ['auto', 'light', 'dark'].indexOf(store('fs-theme')) >= 0 ? store('fs-theme') : 'dark'; setMode(store('fs-night') === '1' ? 'night' : dayMode);
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
      (ZONES.length ? '<label><input type="checkbox" data-l="tss"' + (S.show.tss ? ' checked' : '') + '><span class="sw" style="border-color:var(--warn)"></span>Traffic separation schemes</label>' : '') +
      (LIGHTS.length ? '<label><input type="checkbox" data-l="lights"' + (S.show.lights ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink);border-top-style:dotted"></span>Lighthouses and main buoys</label>' : '') +
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
  function short(id) { return { ecmwf: 'ECMWF', ukv: 'UKV', gfs: 'GFS', aifs: 'AIFS', mog: 'MO Global', icon: 'ICON-EU' }[id] || id; }
  function busy(t) { $('busy').hidden = !t; $('busy').textContent = t; $('busy').classList.toggle('spin', /…$/.test(t || '')); }

  /* ---------- routing ---------- */
  function opts(models) {
    var spec = boatSpec(), b = FSBoat.resolve(spec), pol = b.pol;
    return { models: models, tide: $('tideSel').value || null, wave: $('waveSel').value || null, tcc: +$('tcc').value || 1, polar: pol, polKey: JSON.stringify([spec.src, spec.type, spec.tcc, spec.src === 'polar' ? spec.text.length + ':' + spec.text.slice(-40) : '', spec.tune]),
      sea: { up: +$('seaUp').value, reach: +$('seaReach').value, surf: +$('seaSurf').value, from: 0.5, surfFrom: 1.5 }, safety: +$('depth').value, nogo: nogoRings(), maxHours: HMAX() + 2, tackS: +$('tackS').value, gybeS: +$('gybeS').value, adj: adjVals() };
  }
  /* legs from the course: a gate at each mark on its rounding side, then the finish. Fine time steps near the start. */
  var ADJ = [['adjWdir', 'wdir', '°', 1], ['adjWspd', 'wspd', '%', 1], ['adjWtime', 'wtime', ' h', 1], ['adjTspd', 'tspd', '%', 1], ['adjTtime', 'ttime', ' min', 60]];
  function adjVals() { var a = null; ADJ.forEach(function (x) { var el = $(x[0]), v = el ? +el.value / x[3] : 0; if (v) { a = a || {}; a[x[1]] = v; } }); return a; }
  function adjInit() {
    ADJ.forEach(function (x) { var el = $(x[0]); if (!el) return; var out = $(x[0] + 'V'), f = function () { var v = +el.value; out.textContent = (v > 0 ? '+' : '') + v + x[2] + (x[1] === 'wdir' && v ? (v > 0 ? ' veer' : ' back') : x[1] === 'wtime' && v ? (v > 0 ? ' later' : ' earlier') : x[1] === 'ttime' && v ? (v > 0 ? ' later' : ' earlier') : ''); $('adjNote').hidden = !adjVals(); if ($('adjPill')) adjPill(); }; el.oninput = f; f(); });
    $('adjReset').onclick = function () { ADJ.forEach(function (x) { var el = $(x[0]); el.value = 0; el.oninput(); }); adjPill(); };
    $('adjPillX').onclick = function () { $('adjReset').onclick(); busy('Back to the forecast: routing again…'); S.from = null; run(); };
    adjPill();
  }
  /* a note on the chart whenever the forecast has been changed, with one tap back to the forecast as published */
  function adjPill() {
    var a = adjVals(), t = [];
    if (a) ADJ.forEach(function (x) { var v = +$(x[0]).value; if (v) t.push(({ wdir: 'wind ', wspd: 'wind ', wtime: 'wind ', tspd: 'tide ', ttime: 'tide ' })[x[1]] + $(x[0] + 'V').textContent); });
    $('adjPill').hidden = !a; $('adjPillTxt').textContent = 'Forecast changed: ' + t.join(', ');
  }
  function HMAX() { var w = (meta.course0 || meta.course).window; return w ? w[1] : 48; }
  function legsFor(fromPt) {
    var c = meta.course, pts = [c.start].concat(c.marks).concat([c.finish]), legs = [];
    c.marks.forEach(function (m, i) {
      var near = FSRouter.dist(c.start.lat, c.start.lon, m.lat, m.lon) < 25, legNm = FSRouter.dist(pts[i].lat, pts[i].lon, m.lat, m.lon);
      /* an offshore rounding mark gets a long gate ray, so the router has to sail round it rather than past it */
      legs.push({ name: m.name, gate: FSRouter.markGate(m, pts[i], pts[i + 2], m.side || 'port', near ? 1.2 : Math.min(30, Math.max(3, legNm * 0.1))), dt: near ? 180 : undefined, at: [m.lat, m.lon] });
    });
    legs.push({ name: c.finish.name, point: [c.finish.lat, c.finish.lon], r: c.finish.radius_nm || 0.4, at: [c.finish.lat, c.finish.lon] });
    if (fromPt) {   // from a point on the water: drop the marks already rounded, judged by distance along the course
      var along = function (la, lo) { var best = 1e9, acc = 0, at = 0; for (var k = 0; k < pts.length - 1; k++) { var a = pts[k], b = pts[k + 1], L = FSRouter.dist(a.lat, a.lon, b.lat, b.lon), d1 = FSRouter.dist(a.lat, a.lon, la, lo), d2 = FSRouter.dist(la, lo, b.lat, b.lon), off = d1 + d2 - L; if (off < best) { best = off; at = acc + Math.min(L, d1); } acc += L; } return at; };
      var me = along(fromPt.lat, fromPt.lon), cum = 0;
      legs = legs.filter(function (lg, k) { cum += FSRouter.dist(pts[k].lat, pts[k].lon, pts[k + 1].lat, pts[k + 1].lon); return k === legs.length - 1 || cum > me + 0.5; });
    }
    return legs;
  }
  /* ---------- the RORC course library ---------- */
  var RACES = [], dataBox = null;
  /* forecasts on this server are cut to a band round the Cervantes course: a point must sit inside that band */
  function inData(p) {
    var B = meta.course && meta.course.band; if (!B) return !dataBox || (p.lat >= dataBox.s && p.lat <= dataBox.n && p.lon >= dataBox.w && p.lon <= dataBox.e);
    return B.some(function (b) { var k = Math.cos(p.lat * R), ax = b[1] * k, ay = b[0], bx = b[3] * k, by = b[2], px = p.lon * k, py = p.lat, dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - t * dx, py - ay - t * dy) * 60 <= b[4] + 0.5; });
  }
  function courseIssue(c) { var out = [c.start].concat(c.marks).concat([c.finish]).filter(function (p) { return !inData(p); }); return out.length ? 'Cannot route: ' + out.map(function (p) { return p.name; }).join(', ') + ' outside the forecast area on this server. The wider area comes with the next update.' : ''; }
  function warnText(r) {
    if (!r) return '';
    var y = r.courseStatus === 'last-edition' ? 'the ' + r.courseYear + ' course (last edition)' : r.courseStatus === 'set-on-day' ? 'a course set on the day' : 'the ' + r.courseYear + ' course';
    return r.courseStatus === 'published' ? '' : 'Showing ' + y + '. The 2027 course is not published yet and will change: check the sailing instructions.';
  }
  function applyRace(id) {
    var r = RACES.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    applyCourseObj(r);
  }
  function applyCourseObj(r) {
    var keep = meta.course0 || (meta.course0 = meta.course); meta.course = { name: r.name, start: r.start, marks: r.marks.map(function (m) { return Object.assign({}, m); }), finish: r.finish, band: keep.band, window: keep.window, race: r };
    $('raceTitle').textContent = r.name + ' · ' + r.start.name.replace(/^Start,\s*/, '').replace(/^RYS line,\s*/, '') + ' to ' + r.finish.name.replace(/^Finish,\s*/, '');
    $('raceTitle').setAttribute('data-short', r.name.replace(/^Rolex\s+/, '').replace(/\s+(Trophy\s+)?Race$/, '').replace(/\s+Trophy$/, ''));
    var w = warnText(r); $('courseWarn').hidden = !w; $('courseWarn').textContent = w + (r.setNote ? ' ' + r.setNote : '');
    $('cbannerTxt').innerHTML = w ? '<b>Course not confirmed.</b> ' + w : ''; $('cbanner').hidden = !w || store('fs-hideBanner-' + r.id) === '1';
    $('markSides').innerHTML = r.marks.length ? r.marks.map(function (m, i) { return '<div class="row"><label for="side' + i + '">' + m.name + '</label><select id="side' + i + '" data-mk="' + i + '"><option value="port">to port</option><option value="starboard">to starboard</option></select>' + (m.sideAssumed ? '<span class="note">assumed</span>' : '') + '</div>'; }).join('') : '<p class="note">No marks between start and finish in this course.</p>';
    r.marks.forEach(function (m, i) { $('side' + i).value = m.side || 'port'; $('side' + i).onchange = function () { meta.course.marks[i].side = this.value; meta.course.marks[i].sideAssumed = false; S.legs = null; draw(); }; });
    var issue = courseIssue(meta.course);
    $('courseNote').innerHTML = (r.custom ? 'Your own course' + (r.nm ? ', about ' + r.nm + ' nm' : '') + '. ' : (r.nm ? 'About ' + r.nm + ' nm. ' : '') + (r.date2027 ? 'Start ' + new Date(r.date2027 + 'T12:00Z').toUTCString().slice(0, 16) + ' (' + r.dateSource + '). ' : (r.dateSource || '') + '. ') + '<a href="' + r.source + '" target="_blank" rel="noopener">Source</a>') + (issue ? '<br><b style="color:var(--warn)">' + issue + '</b>' : '');
    if (!r.custom) store('fs-race', r.id); S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; if (W) fit(); draw();
  }
  function loadRaces() {
    var d = meta.layers && meta.layers.filter(function (L) { return L.kind === 'depth'; })[0], f = d && (d.full || d);
    if (f && f.lat0 != null) { var la1 = f.lat0 + f.dlat * (f.ny - 1), lo1 = f.lon0 + f.dlon * (f.nx - 1); dataBox = { s: Math.min(f.lat0, la1), n: Math.max(f.lat0, la1), w: Math.min(f.lon0, lo1), e: Math.max(f.lon0, lo1) }; }
    $('cbannerX').onclick = function () { $('cbanner').hidden = true; var r = meta.course.race; if (r) store('fs-hideBanner-' + r.id, '1'); };
    fetch('../courses/rorc.json', { cache: 'no-store' }).then(function (x) { return x.json(); }).then(function (j) {
      RACES = j.races; $('raceSel').innerHTML = RACES.map(function (r) { return '<option value="' + r.id + '">' + r.name + (r.date2027 ? ' · ' + r.date2027.slice(8) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+r.date2027.slice(5, 7) - 1] : '') + (courseIssue(r) ? ' (wider area needed)' : '') + '</option>'; }).join('');
      $('raceSel').onchange = function () { applyRace($('raceSel').value); };
      var home = meta.course0 ? meta.course0.raceId : meta.course.raceId; home = home || 'cervantes'; var want = home === 'cervantes' ? (store('fs-race') || home) : home; if (!RACES.some(function (r) { return r.id === want; })) want = home;
      var qr = new URLSearchParams(location.search).get('race'); if (qr && RACES.some(function (r) { return r.id === qr && (r.page || r.id) === HERE; })) want = qr;
      $('raceSel').value = want; applyRace(want);
      if (!RACES.some(function (r) { return r.id === want; })) { var c0 = meta.course; $('raceTitle').textContent = c0.name + ' · ' + c0.start.name.replace(/^Start,\s*/, '') + ' to ' + c0.finish.name.replace(/^Finish,\s*/, ''); $('raceTitle').setAttribute('data-short', c0.name.replace(/^English /, '').replace(/^Southern /, '')); }
      var my = new URLSearchParams(location.search).get('my'); if (my) setTimeout(function () { openMy(my); }, 0);
      if (S.pendingCourse) { applyCourseObj(asRace(S.pendingCourse)); S.pendingCourse = null; }
      if (S.pendingStart && [].some.call($('startSel').options, function (o) { return o.value === S.pendingStart; })) $('startSel').value = S.pendingStart; S.pendingStart = null;
    }).catch(function () { $('raceSel').innerHTML = '<option>Cervantes Trophy Race</option>'; });
  }
  /* ---------- man overboard: hold the red button; marks the position from the GPS, then gives bearing, distance and
     time to where they went in, and to where the tide has probably carried them (drift from the tide model) ---------- */
  var mobWatch = null, mobLock = null, me = null;
  function mobGet() { try { return JSON.parse(store('fs-mob') || 'null'); } catch (e) { return null; } }
  function beep() { try { var a = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.35, 0.7].forEach(function (d) { var o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.value = 0.25; o.start(a.currentTime + d); o.stop(a.currentTime + d + 0.22); }); } catch (e) {} }
  function mobDrift(m) {   // carry the person with the tide from the moment they went in to now, a minute at a time
    var id = $('tideSel').value, f = id && P.tide && P.tide[id]; if (!f) return null;
    var tide = FSRouter.tideSampler(P, id), la = m.lat, lo = m.lon, t0 = (m.t / 1000 - T0) / 3600, t1 = (Date.now() / 1000 - T0) / 3600;
    for (var t = t0; t < t1; t += 1 / 60) { var c = tide(la, lo, Math.min(t, HMAX())); la += c[1] / 60 / 60; lo += c[0] / 60 / 60 / Math.cos(la * R); }
    return { lat: la, lon: lo };
  }
  function mobStart() {
    var go = function (la, lo, how) { var m = { lat: la, lon: lo, t: Date.now(), how: how }; store('fs-mob', JSON.stringify(m)); beep(); mobShow(); };
    if (me && Date.now() - me.at < 30000) go(me.lat, me.lon, 'GPS');
    else if (navigator.geolocation) { $('mobTxt').textContent = 'Getting a GPS fix…'; $('mob').hidden = false;
      navigator.geolocation.getCurrentPosition(function (g) { go(g.coords.latitude, g.coords.longitude, 'GPS'); }, function () { $('mobTxt').textContent = 'No GPS fix. Tap the chart where they went in.'; S.mobTap = true; }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }); }
    else { $('mob').hidden = false; $('mobTxt').textContent = 'No GPS on this device. Tap the chart where they went in.'; S.mobTap = true; }
  }
  function mobShow() {
    var m = mobGet(); if (!m) return; $('mob').hidden = false; S.mobTap = false;
    if (navigator.geolocation && mobWatch == null) mobWatch = navigator.geolocation.watchPosition(function (g) { me = { lat: g.coords.latitude, lon: g.coords.longitude, sog: g.coords.speed, cog: g.coords.heading, at: Date.now() }; mobTick(); }, function () {}, { enableHighAccuracy: true, maximumAge: 2000 });
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { mobLock = l; }).catch(function () {}); } catch (e) {}
    var tn = (Date.now() / 1000 - T0) / 3600; if (S.tmin != null && tn >= S.tmin && tn <= S.tmax) setTime(tn);   // chart arrows at the time now
    if (!S.mobTimer) S.mobTimer = setInterval(mobTick, 1000); mobTick();
  }
  function mobLine(label, from, to) {
    var d = FSRouter.dist(from.lat, from.lon, to.lat, to.lon), b = FSRouter.brg(from.lat, from.lon, to.lat, to.lon);
    return '<div><span>' + label + '</span><b>' + pad(b) + '° T</b><b>' + (d < 0.5 ? Math.round(d * 1852) + ' m' : d.toFixed(2) + ' nm') + '</b></div>';
  }
  function mobTick() {
    var m = mobGet(); if (!m) return;
    var sec = Math.floor((Date.now() - m.t) / 1000), dr = mobDrift(m);
    var h = '<div class="mobtime">' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + '<small>since ' + new Date(m.t).toUTCString().slice(17, 22) + ' UTC · ' + m.lat.toFixed(4) + ' ' + m.lon.toFixed(4) + '</small></div>';
    if (me && Date.now() - me.at < 20000) { h += mobLine('To where they went in', me, m); if (dr) h += mobLine('To tide drift estimate', me, dr); if (me.sog != null) h += '<div><span>Your SOG, COG</span><b>' + (me.sog / KN).toFixed(1) + ' kn</b><b>' + (me.cog != null && !isNaN(me.cog) ? pad(me.cog) + '° T' : '-') + '</b></div>'; }
    else h += '<p class="note">Waiting for your GPS position for bearing and distance.</p>';
    if (dr) { var dd = FSRouter.dist(m.lat, m.lon, dr.lat, dr.lon); h += '<p class="note">Tide has probably carried them ' + (dd < 0.5 ? Math.round(dd * 1852) + ' m' : dd.toFixed(2) + ' nm') + ' towards ' + pad(FSRouter.brg(m.lat, m.lon, dr.lat, dr.lon)) + '° T (tide model, not wind drift).</p>'; }
    $('mobTxt').innerHTML = h; S.mob = m; S.mobDr = dr; draw();
  }
  function mobEnd() { store('fs-mob', ''); S.mob = null; S.mobDr = null; $('mob').hidden = true; clearInterval(S.mobTimer); S.mobTimer = null; if (mobWatch != null) navigator.geolocation.clearWatch(mobWatch); mobWatch = null; try { if (mobLock) mobLock.release(); } catch (e) {} draw(); }
  function mobDraw() {
    var m = S.mob; if (!m) return; var x = X(m.lon), y = Y(m.lat);
    ctx.save(); ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke();
    if (S.mobDr) { var dx = X(S.mobDr.lon), dy = Y(S.mobDr.lat); ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(dx, dy); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(dx, dy, 7, 0, 7); ctx.stroke(); }
    if (me) { ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(X(me.lon), Y(me.lat), 5, 0, 7); ctx.fill(); ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(X(me.lon), Y(me.lat)); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.restore();
  }
  function hold(btn, ms, fn) {   // press and hold, so a pocket or a wave cannot set it off
    var t = null, start = function (e) { e.preventDefault(); btn.classList.add('holding'); t = setTimeout(function () { btn.classList.remove('holding'); t = null; fn(); }, ms); }, stop = function () { btn.classList.remove('holding'); if (t) clearTimeout(t); t = null; };
    btn.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { btn.addEventListener(n, stop); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }
  function mobInit() {
    hold($('mobBtn'), 1000, mobStart);
    hold($('mobEnd'), 1500, mobEnd);
    $('mobCentre').onclick = function (e) { e.stopPropagation(); var m = mobGet(); if (!m) return; var small = $('mob').classList.toggle('small'); this.textContent = small ? 'Full panel' : 'Show on chart'; if (small) { view.la = m.lat; view.lo = m.lon; view.s = Math.max(view.s, 4000); } closePanel(); draw(); };
    if (mobGet()) mobShow();
  }
  /* ---------- AIS: targets from an AIS feed (test fleet now; the boat's own receiver and an online feed next), CPA alarm ---------- */
  var AIS = { tg: new FSAIS.Targets(), src: 'off', danger: {}, lastEmit: -1, fleet: null, warned: {} };
  function aisNowMs() { return AIS.src === 'test' ? (T0 + S.t * 3600) * 1000 : Date.now(); }
  function ownForCpa() {
    if (me && Date.now() - me.at < 30000 && AIS.src !== 'test') return { lat: me.lat, lon: me.lon, sog: (me.sog || 0) / KN, cog: me.cog || 0, src: 'GPS' };
    var s = S.sel; if (!s) return null; var p = s.r.path, pos = posAt(tsOf(p), p, S.t); if (!pos || pos.done) return null;
    var q = p[Math.min(p.length - 1, (pos.i || 0) + 1)]; return { lat: pos.la, lon: pos.lo, sog: q.bsp || 0, cog: q.hdg || 0, src: 'route' };
  }
  /* the test fleet: race boats near the chosen route, ships on straight tracks across the area */
  function aisFleet() {
    if (AIS.fleet || !S.sel) return AIS.fleet;
    var names = ['JOLLY JACK', 'TIGER', 'DIABLE', 'SEA BISCUIT', 'NOIR', 'HAMPSHIRE ROSE', 'ARCHER', 'BLUE MOON'], f = [];
    names.forEach(function (n, i) { f.push({ mmsi: 235100100 + i, cls: 'B', name: n, shiptype: 36, len: 10 + (i % 4) * 2, callsign: 'M' + (7100 + i), kind: 'race', pace: 0.94 + ((i * 37) % 13) / 100, side: ((i % 2) ? 1 : -1) * (0.3 + (i % 3) * 0.6) }); });
    var c = meta.course, la0 = Math.min(c.start.lat, c.finish.lat), la1 = Math.max(c.start.lat, c.finish.lat), lo0 = Math.min(c.start.lon, c.finish.lon), lo1 = Math.max(c.start.lon, c.finish.lon);
    c.marks.forEach(function (m) { la0 = Math.min(la0, m.lat); la1 = Math.max(la1, m.lat); lo0 = Math.min(lo0, m.lon); lo1 = Math.max(lo1, m.lon); });
    var ships = [['ATLANTIC STAR', 71, 300, 252, 17], ['NORDIC SPIRIT', 80, 180, 72, 13], ['EVER BRIGHT', 70, 330, 250, 19], ['CELTIC FERRY', 60, 170, 160, 21], ['MARE DORICUM', 81, 240, 70, 12], ['PILOT ONE', 50, 20, 10, 9]];
    ships.forEach(function (x, i) { f.push({ mmsi: 636000100 + i, cls: 'A', name: x[0], shiptype: x[1], len: x[2], callsign: 'D5' + i, dest: i % 2 ? 'ROTTERDAM' : 'SOUTHAMPTON', kind: 'ship', cog: x[3], sog: x[4],
      lat0: la0 + (la1 - la0) * ((i + 1) / 7), lon0: lo0 + (lo1 - lo0) * ((i * 3 + 1) % 7) / 7 }); });
    return AIS.fleet = f;
  }
  function aisEmulate() {   // positions at the replay time, encoded as !AIVDM and decoded back through the engine
    var f = aisFleet(); if (!f) return; var lines = [], now = aisNowMs(), p = S.sel.r.path, ts = tsOf(p), t0 = S.start.t, k = Math.cos(50 * R);
    f.forEach(function (b, i) {
      var x = Object.assign({}, b);
      if (b.kind === 'race') {
        var tt = t0 + (S.t - t0) * b.pace, a = posAt(ts, p, tt); if (!a) return; var j = Math.min(p.length - 2, a.i || 0), h = hdgAt(p, a.k), q = p[j + 1];
        x.lat = a.la + Math.sin((h - 90) * R) * 0 + Math.cos((h + 90) * R) * b.side / 60; x.lon = a.lo + Math.sin((h + 90) * R) * b.side / 60 / k; x.sog = (q.bsp || 6) * b.pace; x.cog = h; x.hdg = h;
      } else {
        var d = ((S.t - t0) * b.sog) % 120 - 60; x.lat = b.lat0 + Math.cos(b.cog * R) * d / 60; x.lon = b.lon0 + Math.sin(b.cog * R) * d / 60 / k; x.hdg = b.cog;
      }
      lines = lines.concat(FSAIS.encodePosition(x));
      if (!AIS.tg.t[b.mmsi] || !AIS.tg.t[b.mmsi].name) lines = lines.concat(FSAIS.encodeStatic(x, i));
    });
    lines.forEach(function (l) { AIS.tg.add(FSAIS.decodeLine(l), now); });
    AIS.lines = (AIS.lines || 0) + lines.length;
  }
  function aisUpdate() {
    if (AIS.src === 'off') { $('aisBox').hidden = true; return; }
    if (AIS.src === 'test') aisEmulate();
    var own = ownForCpa(), lim = +$('cpaNm').value || 0.5, tl = +$('tcpaMin').value || 15, now = aisNowMs(), list = AIS.tg.list(10 * 60000, now), danger = {};
    list.forEach(function (x) { x.c = own ? FSAIS.cpa(own, x) : null; x.danger = !!(x.c && x.c.cpa < lim && x.c.tcpa > 0 && x.c.tcpa < tl); if (x.danger) danger[x.mmsi] = 1; });
    var fresh = Object.keys(danger).filter(function (m) { return !AIS.warned[m]; });
    if (fresh.length && $('cpaSound').checked && (!AIS.lastBeep || Date.now() - AIS.lastBeep > 4000)) { beep(); AIS.lastBeep = Date.now(); }
    AIS.warned = danger; AIS.list = list; AIS.own = own;
    list.sort(function (a, b) { return (b.danger - a.danger) || ((a.c ? a.c.range : 99) - (b.c ? b.c.range : 99)); });
    var h = '<tr><th>Target</th><th>Range</th><th>Brg</th><th>CPA</th><th>TCPA</th><th>SOG</th></tr>' + list.slice(0, 30).map(function (x) {
      var c = x.c; return '<tr data-mmsi="' + x.mmsi + '" class="' + (x.danger ? 'danger' : '') + '"><td style="font-family:var(--f-body)">' + (x.name || x.mmsi) + ' <span class="note">' + FSAIS.shipKind(x) + '</span></td><td>' + (c ? c.range.toFixed(1) : '-') + '</td><td>' + (c ? pad(c.brg) + '°' : '-') + '</td><td>' + (c ? c.cpa.toFixed(2) : '-') + '</td><td>' + (c && c.tcpa > 0 ? Math.round(c.tcpa) + ' min' : '-') + '</td><td>' + (x.sog != null ? x.sog.toFixed(1) : '-') + '</td></tr>'; }).join('');
    $('aisTable').innerHTML = h; $('aisBox').hidden = false;
    $('aisNote').textContent = list.length + ' targets · ' + (AIS.src === 'test' ? 'test fleet, ' + (AIS.lines || 0) + ' sentences decoded' : AIS.err ? AIS.err : 'live from the shore network, updated every 30 s') + (own ? ' · CPA from ' + (own.src === 'GPS' ? 'your GPS' : 'the route boat') : ' · route first for CPA');
    [].forEach.call($('aisTable').querySelectorAll('tr[data-mmsi]'), function (tr) { tr.onclick = function () { var x = AIS.tg.t[tr.dataset.mmsi]; if (x) { view.la = x.lat; view.lo = x.lon; draw(); } }; });
  }
  function aisDraw() {
    if (AIS.src === 'off' || !AIS.list) return; var flash = Math.floor(Date.now() / 400) % 2;
    ctx.save(); ctx.font = '600 10px Inter, sans-serif';
    AIS.list.forEach(function (x) {
      var px = X(x.lon), py = Y(x.lat); if (px < -20 || py < -20 || px > W + 20 || py > H + 20) return;
      var kind = FSAIS.shipKind(x), col = x.danger ? (flash ? '#ff3b30' : '#ffffff') : kind === 'yacht' ? css['--ghost'] : '#F2994A';
      var h = x.hdg != null ? x.hdg : (x.cog || 0), sz = kind === 'yacht' ? 6 : 8;
      if (x.track.length > 1) { ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); x.track.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.lineTo(px, py); ctx.stroke(); ctx.globalAlpha = 1; }
      if (x.sog > 0.5 && x.cog != null) { var d = x.sog / 10; ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X(x.lon + Math.sin(x.cog * R) * d / 60 / Math.cos(x.lat * R)), Y(x.lat + Math.cos(x.cog * R) * d / 60)); ctx.stroke(); ctx.setLineDash([]); }
      triMark(px, py, h, sz, kind === 'yacht' ? null : col, col, 1.6);
      if (view.s > 600 || x.danger) { ctx.fillStyle = col; ctx.fillText(x.name || String(x.mmsi), px + 9, py - 7); }
    });
    ctx.restore();
  }
  /* live AIS from the shore network through FirstShift's relay (/api/ais), every 30 seconds while online */
  function aisLive() {
    if (AIS.src !== 'live' || AIS.busy || Date.now() - (AIS.liveAt || 0) < 30000 || !navigator.onLine) return;
    var la0 = Math.max(35.5, LA(H)), la1 = Math.min(61.5, LA(70)), lo0 = Math.max(-15, LO(0)), lo1 = Math.min(12, LO(W)), cl = (la0 + la1) / 2, co = (lo0 + lo1) / 2;
    la0 = Math.max(la0, cl - 3); la1 = Math.min(la1, cl + 3); lo0 = Math.max(lo0, co - 5); lo1 = Math.min(lo1, co + 5);
    AIS.busy = true; AIS.liveAt = Date.now();
    fetch('/api/ais?s=' + la0.toFixed(1) + '&n=' + la1.toFixed(1) + '&w=' + lo0.toFixed(1) + '&e=' + lo1.toFixed(1)).then(function (r) { return r.json(); }).then(function (j) {
      AIS.busy = false; if (j.error) { AIS.err = j.error; aisUpdate(); return; } AIS.err = '';
      j.targets.forEach(function (x) { AIS.tg.add(x, Date.now()); }); AIS.lines = (AIS.lines || 0) + j.targets.length; aisUpdate(); draw();
    }).catch(function () { AIS.busy = false; AIS.err = 'Live AIS server not reachable.'; aisUpdate(); });
  }
  function aisInit() {
    var saved = store('fs-aisSrc'); if (saved) $('aisSrc').value = saved;
    $('aisSrc').onchange = function () { AIS.src = this.value; store('fs-aisSrc', this.value); AIS.tg = new FSAIS.Targets(); AIS.fleet = null; AIS.lines = 0; AIS.liveAt = 0; aisUpdate(); draw(); };
    AIS.src = $('aisSrc').value;
    setInterval(aisLive, 5000);
    setInterval(function () { if (AIS.src !== 'off') { aisUpdate(); if (Object.keys(AIS.warned).length) draw(); } }, 1000);
  }
  /* replay speed: the button beside Play steps through the speeds in Settings, Display */
  function spdLabel() { var v = +$('speed').value; $('spdBtn').textContent = v < 1 ? Math.round(v * 60) + 'm/s' : v + 'h/s'; }
  function spdInit() { var o = [].map.call($('speed').options, function (x) { return x.value; }); $('spdBtn').onclick = function () { var i = o.indexOf($('speed').value); $('speed').value = o[(i + 1) % o.length]; $('speed').dispatchEvent(new Event('change', { bubbles: true })); spdLabel(); }; $('speed').addEventListener('change', spdLabel); spdLabel(); }
  /* ---------- send to the crew: a summary and a link that opens the same course and start in Route ---------- */
  function crewLink() {
    var c = meta.course, base = location.origin + location.pathname, st = $('startSel').value;
    if (c.race && !c.race.custom) return base + '?race=' + encodeURIComponent(c.race.id) + '&start=' + st;
    var cc = { n: c.name, p: [c.start].concat(c.marks).concat([c.finish]).map(function (q) { return [+q.lat.toFixed(4), +q.lon.toFixed(4), q.name, q.side ? q.side[0] : '']; }) };
    return base + '?course=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cc))))) + '&start=' + st;
  }
  function crewText() {
    var c = meta.course, s = S.sel, lines = ['FirstShift Route: ' + c.name, 'Start ' + clockAbs(+$('startSel').value) + ' UTC'];
    if (S.routes && S.routes.length) {
      lines.push('Finish times:'); S.routes.forEach(function (r) { lines.push('  ' + (r.combined ? 'Combined' : short(r.id)) + ': ' + clockH(r.r.finish).slice(4) + ' (' + fmtH(r.r.finish - S.start.t) + ')' + (r === s ? ' <- chosen' : '')); });
      var p = s.r.path, cr = sailsList(), out = [], cur = null;
      for (var i = 1; i < p.length && out.length < 4; i++) { var sl = FSRouter.sailFor(p[i], cr) || '-'; if (!cur || cur.sl !== sl) { cur = { sl: sl, t: p[i - 1].t, h: p[i].hdg }; out.push(cur); } }
      lines.push('First legs (' + (s.combined ? 'Combined' : short(s.id)) + '):'); out.forEach(function (o) { lines.push('  ' + clockH(o.t).slice(4) + ' ' + o.sl + ', heading ' + pad(o.h) + '°'); });
    }
    lines.push('Open in Route: ' + crewLink()); lines.push('Planning aid, not for navigation.');
    return lines.join('\n');
  }
  function crewInit() {
    $('xCrew').onclick = function () {
      var t = crewText();
      if (navigator.share) { navigator.share({ title: 'FirstShift Route: ' + meta.course.name, text: t }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    };
    $('xCopy').onclick = function () { var t = crewText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('xNote').textContent = 'Copied: paste it into WhatsApp, a message or an email.'; }, function () { $('xNote').textContent = t; }); };
    var q = new URLSearchParams(location.search), cs = q.get('course'), st = q.get('start');
    if (cs) { try { var cc = JSON.parse(decodeURIComponent(escape(atob(cs)))), P0 = cc.p.map(function (a) { return { lat: a[0], lon: a[1], name: a[2], side: a[3] === 's' ? 'starboard' : 'port' }; });
      S.pendingCourse = { name: cc.n, start: P0[0], marks: P0.slice(1, -1), finish: P0[P0.length - 1] }; } catch (e) {} }
    if (st) S.pendingStart = st;
  }
  /* ---------- races: the race menu (tap the race name), My races kept on this device, and the course editor ---------- */
  var READY = {};   // races with forecasts on the server: their own page
  var HERE = location.pathname.replace(/\/+$/, '').split('/').pop();
  function myRaces() { try { return JSON.parse(store('fs-myraces') || '[]'); } catch (e) { return []; } }
  function setMyRaces(a) { store('fs-myraces', JSON.stringify(a)); }
  function snapSettings() { var o = {}; [].forEach.call(document.querySelectorAll('#sheet input[id], #sheet select[id], #sheet textarea[id]'), function (el) { if (/^side\d|^adjNote/.test(el.id)) return; o[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
  function putSettings(o) {
    Object.keys(o || {}).forEach(function (id) { var el = $(id); if (!el) return; if (el.type === 'checkbox') el.checked = o[id]; else el.value = o[id]; ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); });
    var src = o.__src; if (src) { var b = document.querySelector('#srcSeg [data-src="' + src + '"]'); if (b) b.click(); }
  }
  function courseCopy() { var c = meta.course; return { name: c.name, start: Object.assign({}, c.start), marks: c.marks.map(function (m) { return { name: m.name, lat: m.lat, lon: m.lon, side: m.side || 'port' }; }), finish: Object.assign({}, c.finish) }; }
  function courseNm(c) { var p = [c.start].concat(c.marks).concat([c.finish]), d = 0; for (var i = 1; i < p.length; i++) d += FSRouter.dist(p[i - 1].lat, p[i - 1].lon, p[i].lat, p[i].lon); return Math.round(d); }
  function asRace(c, id) { return { id: id || 'my', custom: true, courseStatus: 'published', name: c.name, start: c.start, marks: c.marks, finish: Object.assign({ radius_nm: 0.4 }, c.finish), nm: courseNm(c) }; }
  function saveMyRace(name) {
    var a = myRaces(), c = courseCopy(); c.name = name || c.name;
    var src = (document.querySelector('#srcSeg [aria-pressed="true"]') || {}).dataset; var set = snapSettings(); set.__src = src && src.src;
    var fin = S.sel ? fmtH(S.sel.r.finish - S.start.t) : '';
    var cur = S.myId && a.filter(function (x) { return x.id === S.myId; })[0];
    var rec = { id: cur ? cur.id : 'r' + Date.now().toString(36), name: c.name, page: HERE, course: c, settings: set, savedAt: Date.now(), summary: fin ? (S.sel.combined ? 'Combined' : short(S.sel.id)) + ' ' + fin : '', raceId: meta.course.race && !meta.course.race.custom ? meta.course.race.id : null };
    a = a.filter(function (x) { return x.id !== rec.id; }); a.unshift(rec); setMyRaces(a); S.myId = rec.id; return rec;
  }
  function openMy(id) {
    var rec = myRaces().filter(function (x) { return x.id === id; })[0]; if (!rec) return;
    if (rec.page && rec.page !== HERE) { location.href = '../' + rec.page + '/?my=' + encodeURIComponent(id); return; }
    S.myId = id; applyCourseObj(asRace(rec.course, rec.id)); putSettings(rec.settings); $('races').hidden = true; S.from = null; run();
  }
  function racesSheet() {
    var c = meta.course, mine = myRaces(), h = '';
    h += '<div class="rcur"><div><b>' + c.name + '</b><span class="note">' + (c.race && c.race.custom ? 'Your own course' : 'RORC course library') + ' · ' + courseNm(c) + ' nm</span></div>' +
      '<div class="xrow"><button class="btn primary" id="rSave">' + (S.myId ? 'Save changes' : 'Save as my race') + '</button><button class="btn" id="rEdit">Edit this course</button><button class="btn" id="rNew">New course</button></div></div>';
    h += '<h3>My races</h3>' + (mine.length ? mine.map(function (r) { return '<div class="ritem' + (r.id === S.myId ? ' on' : '') + '"><div><b>' + r.name + '</b><span class="note">' + new Date(r.savedAt).toUTCString().slice(5, 22) + (r.summary ? ' · ' + r.summary : '') + (r.page !== HERE ? ' · on the ' + r.page + ' forecasts' : '') + '</span></div><div class="xrow"><button class="btn" data-open="' + r.id + '">Open</button><button class="btn" data-del="' + r.id + '" aria-label="Delete ' + r.name + '">Delete</button></div></div>'; }).join('') : '<p class="note">None yet. Save the race on screen, or build a new course, and it is kept here on this device.</p>');
    h += '<h3>RORC races</h3>' + RACES.map(function (r) { var pg = r.page || r.id, ready = READY[pg]; return '<div class="ritem"><div><b>' + r.name + '</b><span class="note">' + (r.date2027 ? r.date2027.split('-').reverse().slice(0, 2).join('/') + ' 2027 · ' : '') + (ready ? 'Forecasts ready' : 'Course only: forecasts for this area come later') + '</span></div><div class="xrow"><button class="btn" data-race="' + r.id + '">' + (ready ? 'Open' : 'Show course') + '</button></div></div>'; }).join('');
    $('raceList').innerHTML = h;
    $('rSave').onclick = function () { var n = $('rName') ? $('rName').value : ''; var rec = saveMyRace(n); racesSheet(); busy('Saved as ' + rec.name); setTimeout(function () { busy(''); }, 1800); };
    $('rEdit').onclick = function () { startEdit(courseCopy()); };
    $('rNew').onclick = function () { startEdit(null); };
    [].forEach.call($('raceList').querySelectorAll('[data-open]'), function (b) { b.onclick = function () { openMy(b.dataset.open); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-del]'), function (b) { b.onclick = function () {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
      setMyRaces(myRaces().filter(function (x) { return x.id !== b.dataset.del; })); if (S.myId === b.dataset.del) S.myId = null; racesSheet(); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-race]'), function (b) { b.onclick = function () {
      var id = b.dataset.race, rr = RACES.filter(function (x) { return x.id === id; })[0], pg = (rr && rr.page) || id; if (READY[pg] && pg !== HERE) { location.href = '../' + pg + '/' + (pg !== id ? '?race=' + id : ''); return; }
      S.myId = null; applyRace(id); $('races').hidden = true; if (!courseIssue(meta.course)) { S.from = null; run(); } };
    });
  }
  function racesInit() {
    fetch('../status.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { Object.keys(j.sources || {}).forEach(function (k) { READY[k.split(':')[0]] = true; }); }).catch(function () { READY[HERE] = true; });
    READY[HERE] = true;
    $('raceBtn').onclick = function () { racesSheet(); $('races').hidden = false; };
    $('dataChip').addEventListener('click', function (e) { e.stopPropagation(); });
    $('racesX').onclick = function () { $('races').hidden = true; };
    $('races').onclick = function (e) { if (e.target === $('races')) $('races').hidden = true; };
    $('edUndo').onclick = function () { S.edit.pts.pop(); editPrompt(); draw(); };
    $('edCancel').onclick = function () { S.edit = null; $('editBar').hidden = true; draw(); };
    $('edDone').onclick = function () { if (S.edit.pts.length < 2) return; editForm(); };
  }
  /* course editor: tap the chart to place the start, each mark, then the finish */
  function startEdit(c) {
    $('races').hidden = true; closePanel(); $('cbanner').hidden = true; $('tip').hidden = true;
    S.edit = { name: c ? c.name : 'My course', pts: c ? [c.start].concat(c.marks).concat([c.finish]).map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name, side: p.side }; }) : [] };
    $('editBar').hidden = false; editPrompt(); draw();
  }
  function editPrompt() {
    var n = S.edit.pts.length;
    $('edTxt').textContent = n === 0 ? 'Tap the chart to place the start.' : n === 1 ? 'Tap to add each mark in order, and the finish last.' : n + ' points. Tap to add more, or Done: the last point is the finish.';
    $('edDone').disabled = n < 2; $('edUndo').disabled = !n;
  }
  function editTap(x, y) {
    var la = LA(y), lo = LO(x);
    if (la < 35.5 || la > 61.5 || lo < -15 || lo > 12) { busy('Outside the routing area: cannot route there.'); setTimeout(function () { busy(''); }, 2500); return; }
    var z = P.depth ? P.depth.nearest('z', la, lo) : NaN; if (z > 0) { busy('That is land. Tap open water.'); setTimeout(function () { busy(''); }, 2000); return; }
    S.edit.pts.push({ lat: +la.toFixed(5), lon: +lo.toFixed(5) }); editPrompt(); draw();
  }
  function editDraw() {
    var p = S.edit.pts; if (!p.length) return;
    ctx.save(); ctx.strokeStyle = css['--route']; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 12px Inter, sans-serif';
    p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--route']; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = css['--ink'];
      var lbl = i === 0 ? 'Start' : i === p.length - 1 && p.length > 1 ? 'Finish?' : String(i); ctx.fillText(q.name || lbl, x + 11, y - 9); });
    ctx.restore();
  }
  function editForm() {
    var p = S.edit.pts, h = '<div class="row"><label for="edName">Course name</label><input id="edName" value="' + (S.edit.name || 'My course').replace(/"/g, '&quot;') + '"></div>';
    p.forEach(function (q, i) {
      var kind = i === 0 ? 'Start' : i === p.length - 1 ? 'Finish' : 'Mark ' + i;
      h += '<div class="row"><label for="edN' + i + '">' + kind + '</label><input id="edN' + i + '" value="' + (q.name || kind).replace(/"/g, '&quot;') + '">' + (i > 0 && i < p.length - 1 ? '<select id="edS' + i + '"><option value="port">to port</option><option value="starboard">to starboard</option></select>' : '') + '</div>';
    });
    var opts = [].map.call($('startSel').options, function (o) { return '<option value="' + o.value + '"' + (o.value === $('startSel').value ? ' selected' : '') + '>' + o.textContent + '</option>'; }).join('');
    h += '<div class="row"><label for="edStart">Start</label><select id="edStart">' + opts + '</select></div><p class="note">Starts run to ' + ($('startSel').options.length ? clockAbs(+$('startSel').options[$('startSel').options.length - 1].value) + ' UTC' : 'the end of the forecast') + ', as far as the forecasts allow the whole race to be routed. For a later race, save the course now and choose the start nearer the day.</p>';
    h += '<p class="note">' + courseNm({ start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }) + ' nm along the course. Saved on this device under My races.</p><div class="xrow"><button class="btn primary" id="edSave">Save and route</button><button class="btn" id="edBack">Back to the chart</button></div>';
    $('raceList').innerHTML = '<h3>Your course</h3>' + h; $('races').hidden = false; $('editBar').hidden = true;
    p.forEach(function (q, i) { if ($('edS' + i)) $('edS' + i).value = q.side || 'port'; });
    $('edBack').onclick = function () { $('races').hidden = true; $('editBar').hidden = false; };
    $('edSave').onclick = function () {
      var pts = p.map(function (q, i) { return { name: $('edN' + i).value.trim() || (i ? 'Mark ' + i : 'Start'), lat: q.lat, lon: q.lon, side: $('edS' + i) ? $('edS' + i).value : undefined }; });
      var c = { name: $('edName').value.trim() || 'My course', start: pts[0], marks: pts.slice(1, -1), finish: pts[pts.length - 1] };
      var stv = $('edStart').value; S.edit = null; S.myId = null; applyCourseObj(asRace(c)); $('startSel').value = stv; $('startSel').dispatchEvent(new Event('change', { bubbles: true })); var rec = saveMyRace(c.name); meta.course.race.id = rec.id;
      $('races').hidden = true; busy('Saved under My races. Routing ' + c.name + ' from ' + clockAbs(+stv) + ' UTC…'); var issue = courseIssue(meta.course); if (issue) { openTab('decision'); $('runNote').textContent = issue; } else { S.from = null; run(); }
    };
  }
  function selectedModels() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.getAttribute('data-m'); }); }
  /* ---------- server pre-routes: the forecast job routes each race for the standard settings, so most users see routes at once ---------- */
  function loadPre() {
    S.pre = null;
    return fetch('pre/routes.json?b=' + encodeURIComponent(meta.built || meta.t0)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.built === (meta.built || meta.t0)) S.pre = j; }).catch(function () {});
  }
  function startPt() { return S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 }; }
  function liteKey(base, st) { return JSON.stringify([base.polKey, Math.round(st.t * 100), st.lat.toFixed(4), st.lon.toFixed(4), meta.course.raceId || '', meta.course.marks.map(function (m) { return (m.side || '') + m.lat.toFixed(3) + m.lon.toFixed(3); }), meta.course.finish.lat.toFixed(3) + meta.course.finish.lon.toFixed(3), base.tackS, base.gybeS, base.safety, base.sea.up, base.sea.reach, base.sea.surf, base.adj]); }
  function fullKey(base, st) { return JSON.stringify([liteKey(base, st), base.models.slice().sort(), base.tide, base.wave, base.nogo.length]); }
  function preEntry(full) {
    if (!S.pre || S.from) return null;
    var base = opts(full ? selectedModels() : []), st = startPt(), e = null;
    if (full) e = S.pre.r[fullKey(base, st)];
    else { var lk = liteKey(base, st); Object.keys(S.pre.r).some(function (k) { if (JSON.parse(k)[0] === lk) { e = S.pre.r[k]; return true; } return false; }); }
    return e ? { e: e, base: base, st: st } : null;
  }
  function usePre(h, early) {
    S.routes = h.e.routes; S.matrix = h.e.matrix; S.sel = S.routes.filter(function (s) { return s.best; })[0] || S.routes[0];
    S.base = Object.assign({}, h.base, { models: S.sel.models }); S.legs = legsFor(null); S.start = h.st; S.ghosts = [];
    $('runNote').textContent = 'Routed on the server ' + clockAbs(S.pre.at) + (early ? '; forecasts still loading for the replay.' : '. Change any setting and Route works it out on your device.');
    return (early ? Promise.resolve() : ghosts()).then(show);
  }
  function earlyPre() { var h = preEntry(false); if (h && !S.routes.length) { try { usePre(h, true); } catch (e) {} } }
  function show() {
    busy(''); matrix(); plan(); fleetTable(); if (!$('layers').hidden) layersPop();
    var maxT = Math.max.apply(null, S.routes.map(function (s) { return s.r.finish; }));
    S.tmin = Math.min(S.start.t, (starts[0] - T0) / 3600); S.tmax = Math.min(HMAX(), maxT + 1);
    try { setTime(S.from ? S.from.t : S.start.t); } catch (e) { draw(); }
  }
  window.__fsDump = function () { return S.key ? { key: S.key, routes: S.routes.map(function (s) { return { id: s.id, name: s.name, models: s.models, combined: !!s.combined, best: !!s.best, mean: s.mean, worst: s.worst, r: s.r }; }), matrix: S.matrix } : null; };
  function run() {
    if (S.running) return;
    var ms = selectedModels(); if (!ms.length) { openTab('decision'); $('runNote').textContent = 'Tick at least one downloaded wind model in Settings, Forecasts.'; return; }
    if (!P.depth) { openTab('data'); $('dlNote').textContent = 'Download the seabed depth first: the router needs it to keep off the land.'; return; }
    var issue = courseIssue(meta.course); if (issue) { openTab('decision'); $('runNote').textContent = issue; busy(issue); setTimeout(function () { busy(''); }, 4000); return; }
    var hit = preEntry(true); if (hit) { S.running = true; usePre(hit, false).then(function () { S.running = false; }, function () { S.running = false; }); return; }
    S.running = true; busy('Quick route…'); S.key = null;
    var tq = Date.now();
    pass(true).then(function () { return pass(false); }).then(function () { S.running = false; $('runNote').textContent += ' First answer in ' + S.quickS + ' s.'; })
    .catch(function (e) { S.running = false; busy(''); openTab('decision'); $('runNote').textContent = e.message; draw(); });
    function pass(quick) {
    var start = S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 };
      var legs = legsFor(S.from), base = opts(ms), t0 = Date.now();
      if (quick) Object.assign(base, { dt: 1200, hstep: 10, sectors: 180 });   /* quick first pass: about a sixth of the work */
      var sets = ms.map(function (m) { return { id: m, name: layer(m).name, models: [m] }; });
      if (ms.length > 1) sets.push({ id: 'all', name: 'Combined (' + ms.length + ' models)', models: ms, combined: true });
      return Promise.all(sets.map(function (s) { return pool({ type: 'route', o: Object.assign({}, base, { models: s.models, start: start, legs: legs }) }).then(function (r) { s.r = r; return s; }, function (e) { s.err = e.message; return s; }); })).then(function (res) {
        S.routes = res.filter(function (s) { return s.r; });
        var errs = res.filter(function (s) { return s.err; });
        if (!S.routes.length) throw new Error(errs.length ? errs[0].err : 'No route found.');
        busy(quick ? 'Quick route ready, refining…' : 'Refining: sailing each route through every model…');
        var selfJobs = S.routes.map(function (s) { return pool({ type: 'sail', o: Object.assign({}, base, { models: s.models }), paths: [s.r.path] }); });
        return Promise.all(ms.map(function (m) { return pool({ type: 'sail', o: Object.assign({}, base, { models: [m] }), paths: S.routes.map(function (s) { return s.r.path; }) }); }).concat(selfJobs)).then(function (allr) {
          var cols = allr.slice(0, ms.length), self = allr.slice(ms.length).map(function (x) { return x[0]; });
          S.routes.forEach(function (s, i) { var k = (s.r.finish - start.t) / Math.max(0.1, self[i] - start.t); cols.forEach(function (c) { c[i] = start.t + (c[i] - start.t) * k; }); });
          S.matrix = { models: ms, cols: cols, start: start.t };
          S.routes.forEach(function (s, i) { var v = cols.map(function (c) { return c[i]; }); s.mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length; s.worst = Math.max.apply(null, v); });
          var best = S.routes.slice().sort(function (a, b) { return a.mean - b.mean; })[0];
          S.routes.forEach(function (s) { s.best = s === best; });
          S.sel = best; S.base = base; S.legs = legs; S.start = start;
          $('runNote').textContent = (quick ? 'Quick route in ' : 'Routed in ') + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (quick ? '. Refining…' : '') + (errs.length ? '. ' + errs.map(function (e) { return e.name + ': ' + e.err; }).join(' ') : '.');
          return ghosts();
        });
      }).then(function () {
        show(); if (!quick && !S.from) S.key = fullKey(Object.assign({}, base, { models: ms }), start);
      }).then(function () { if (quick) S.quickS = ((Date.now() - tq) / 1000).toFixed(1); });
    }
  }
  var TS = typeof WeakMap === 'function' ? new WeakMap() : null;
  function tsOf(path) { if (!TS) return path.map(function (q) { return q.t; }); var a = TS.get(path); if (!a) { a = path.map(function (q) { return q.t; }); TS.set(path, a); } return a; }   /* one times array per route, not one per frame */
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
    var h = '<tr><th>Route</th><th>Finish</th>' + M.models.map(function (m) { return '<th>in ' + short(m) + '</th>'; }).join('') + '<th>Average</th><th>Worst</th></tr>';
    S.routes.forEach(function (s, i) {
      h += '<tr class="click' + (s === S.sel ? ' sel' : '') + '" data-i="' + i + '"><td style="font-family:var(--f-body)">' + swatch(s) + (s.combined ? 'Combined' : short(s.id)) + (s.best ? ' <span class="pill">best</span>' : '') + '</td><td style="white-space:nowrap"><b>' + clockH(s.r.finish).slice(0, 3) + ' ' + clockH(s.r.finish).slice(-5) + '</b><br><span style="color:var(--muted)">' + fmtH(s.r.finish - M.start) + '</span></td>' +
        M.models.map(function (m, j) { return '<td class="' + (Math.abs(M.cols[j][i] - mins[j]) < 1e-6 ? 'best' : '') + '">' + fmtH(M.cols[j][i] - M.start) + '</td>'; }).join('') +
        '<td class="' + (s.best ? 'best' : '') + '">' + fmtH(s.mean - M.start) + '</td><td>' + fmtH(s.worst - M.start) + '</td></tr>';
    });
    $('matrix').innerHTML = h;
    [].forEach.call($('matrix').querySelectorAll('tr.click'), function (tr) { tr.onclick = function () { S.sel = S.routes[+tr.dataset.i]; ghosts().then(function () { matrix(); plan(); fleetTable(); update(); }); }; });
    var best = S.routes.find(function (s) { return s.best; }), fins = S.routes.map(function (s) { return s.r.finish; }), spread = Math.max.apply(null, fins) - Math.min.apply(null, fins);
    var comb = S.routes.find(function (s) { return s.combined; });
    $('finBox').innerHTML = S.routes.map(function (s) { return '<div class="fin' + (s.combined ? ' comb' : '') + '">' + swatch(s) + '<span>' + (s.combined ? 'Combined (all models)' : short(s.id)) + '</span><b>' + clockH(s.r.finish).slice(4) + '</b><em>' + fmtH(s.r.finish - M.start) + '</em></div>'; }).join('');
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
  /* ---------- help: text and a spoken run-through, using the device's own speech (free, works offline) ---------- */
  var HELP = [
    ['What Route does', 'Route works out the fastest way round the race course for your boat, in each forecast model, with the tide. It routes as soon as you open it, again when new forecasts arrive, and again when you close Settings after a change. Route again, at the top of Decision, forces it. A planning aid, not for navigation.'],
    ['Decision', 'The boxes at the top give the finish time for each model\'s route and for the combined route. The table below sails every route through every model: the best route is the one that loses least if the forecast is wrong. Tap a row or a box to show that route on the chart.'],
    ['Play the race', 'Press the play button to watch the boat sail the chosen route. The strip along the bottom gives heading, boat speed, wind angle and speed, the sail and the sea state at each moment. Choose the speed under Settings, Display.'],
    ['Plan', 'The Plan tab turns the chosen route into a sailing plan: when to change sail, the heading, wind and boat speed for each part, and the time at each mark. Save GPX puts the route on your plotter; How to load it explains the steps for your make.'],
    ['Your boat', 'Settings, Boat. Pick a boat type, enter your TCC, or load your own polar. The three sliders tune the polar upwind, reaching and downwind: 95 percent means you expect to sail at 95 percent of the polar.'],
    ['If you think the forecast is wrong', 'Settings, Boat, below the tuning sliders. Shift the wind direction, change its strength, or make a front arrive earlier or later. You can do the same for the tide if you know the area better than the model. Close Settings and Route works it out again; Back to the forecast undoes it.'],
    ['Route from where you are', 'The target button reroutes from the boat\'s position now. On a phone or tablet it uses the GPS; otherwise tap the chart where the boat is.'],
    ['New forecasts', 'Route checks for new forecasts every few minutes. When one arrives, a button appears: New data, update routing. The Data tab shows each model\'s run time, when the server got it and how old it is.'],
    ['Man overboard', 'Press and hold the red MOB button for one second. Route marks the position from the phone GPS, starts the clock and shows the bearing and distance back to where they went in, and to where the tide has probably carried them. Show on chart shrinks the panel so you can see both. Hold End MOB to finish. Route is no substitute for the boat\'s own MOB drill, the VHF DSC button and the Coastguard.'],
    ['Fleet', 'The Fleet tab compares your boat with others on corrected time, using their TCC: who you owe time to, and who owes you.']
  ];
  var speaking = -1;
  function voice() { var v = speechSynthesis.getVoices(); return v.filter(function (x) { return /en-GB/i.test(x.lang); })[0] || v.filter(function (x) { return /^en/i.test(x.lang); })[0] || null; }
  function sayStop() { try { speechSynthesis.cancel(); } catch (e) {} speaking = -1; hiTopic(); $('sayStop').hidden = true; }
  function hiTopic() { [].forEach.call(document.querySelectorAll('.htopic'), function (d, i) { d.classList.toggle('on', i === speaking); }); }
  function say(list) {
    sayStop(); if (!window.speechSynthesis) { $('helpList').insertAdjacentHTML('afterbegin', '<p class="note">This device has no speech: read the text below.</p>'); return; }
    $('sayStop').hidden = false;
    list.forEach(function (i, n) {
      var u = new SpeechSynthesisUtterance(HELP[i][0] + '. ' + HELP[i][1]); var v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : 'en-GB'; u.rate = 1;
      u.onstart = function () { speaking = i; hiTopic(); var el = document.querySelectorAll('.htopic')[i]; if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      if (n === list.length - 1) u.onend = function () { speaking = -1; hiTopic(); $('sayStop').hidden = true; };
      speechSynthesis.speak(u);
    });
  }
  function helpInit() {
    $('helpList').innerHTML = HELP.map(function (h, i) { return '<div class="htopic"><h3>' + h[0] + '<button class="btn say" data-say="' + i + '">Listen</button></h3><p>' + h[1] + '</p></div>'; }).join('');
    [].forEach.call(document.querySelectorAll('[data-say]'), function (b) { b.onclick = function () { say([+b.dataset.say]); }; });
    $('sayAll').onclick = function () { say(HELP.map(function (h, i) { return i; })); };
    $('sayStop').onclick = sayStop;
    $('helpBtn').onclick = function () { $('help').hidden = false; };
    $('helpX').onclick = function () { sayStop(); $('help').hidden = true; };
  }
  /* ---------- route export: GPX and KML (planning aid, not for navigation) ---------- */
  function xEsc(t) { return String(t).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function iso(h) { return new Date((T0 + h * 3600) * 1000).toISOString().replace(/\.\d+Z$/, 'Z'); }
  function turns(p) {   // waypoints where the heading changes by 15 degrees or more, a leg ends, or 3 hours pass
    var out = [p[0]], last = p[1] || p[0];
    for (var i = 1; i < p.length - 1; i++) {
      var q = p[i], d = Math.abs(((q.hdg - last.hdg + 540) % 360) - 180);
      if (d >= 15 || q.leg !== last.leg || q.tack || q.t - last.t >= 3) { out.push(q); last = q; }
    }
    out.push(p[p.length - 1]); return out;
  }
  function xName() { var s = S.sel; return (meta.course.name || 'Route') + ' ' + (s.combined ? 'Combined' : short(s.id)) + ' ' + clockH(S.start.t); }
  function xFile(kind) {
    var s = S.sel, p = s.r.path, nm = xName(), f = nm.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (kind === 'gpx') {
      var w = turns(p), g = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FirstShift Route" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>' + xEsc(nm) + '</name><desc>Planning aid, not for navigation</desc><time>' + iso(S.start.t) + '</time></metadata>\n';
      S.legs.forEach(function (l, i) { if (l.at) g += '<wpt lat="' + l.at[0].toFixed(5) + '" lon="' + l.at[1].toFixed(5) + '"><name>' + xEsc(l.name) + '</name><type>Mark</type></wpt>\n'; });
      g += '<rte><name>' + xEsc(nm) + '</name>\n';
      w.forEach(function (q, i) { g += '<rtept lat="' + q.la.toFixed(5) + '" lon="' + q.lo.toFixed(5) + '"><time>' + iso(q.t) + '</time><name>FS' + String(i + 1).padStart(3, '0') + '</name>' + (isFinite(q.hdg) ? '<desc>' + Math.round(q.hdg) + 'T, TWS ' + (q.tws || 0).toFixed(0) + ' kn, BSP ' + (q.bsp || 0).toFixed(1) + ' kn</desc>' : '') + '</rtept>\n'; });
      g += '</rte>\n<trk><name>' + xEsc(nm) + ' track</name><trkseg>\n';
      p.forEach(function (q) { g += '<trkpt lat="' + q.la.toFixed(5) + '" lon="' + q.lo.toFixed(5) + '"><time>' + iso(q.t) + '</time></trkpt>\n'; });
      return { name: f + '.gpx', type: 'application/gpx+xml', text: g + '</trkseg></trk>\n</gpx>\n', n: w.length };
    }
    var k = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + xEsc(nm) + '</name><description>Planning aid, not for navigation</description>\n<Style id="r"><LineStyle><color>ff2b8cff</color><width>3</width></LineStyle></Style>\n<Placemark><name>' + xEsc(nm) + '</name><styleUrl>#r</styleUrl><LineString><tessellate>1</tessellate><coordinates>' + p.map(function (q) { return q.lo.toFixed(5) + ',' + q.la.toFixed(5) + ',0'; }).join(' ') + '</coordinates></LineString></Placemark>\n';
    S.legs.forEach(function (l) { if (l.at) k += '<Placemark><name>' + xEsc(l.name) + '</name><Point><coordinates>' + l.at[1].toFixed(5) + ',' + l.at[0].toFixed(5) + ',0</coordinates></Point></Placemark>\n'; });
    return { name: f + '.kml', type: 'application/vnd.google-earth.kml+xml', text: k + '</Document></kml>\n' };
  }
  function xSave(kind) {
    if (!S.sel) { $('xNote').textContent = 'Route first, then pick a route under Decision.'; return; }
    var x = xFile(kind), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([x.text], { type: x.type })); a.download = x.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $('xNote').textContent = 'Saved ' + x.name + (x.n ? ' (' + x.n + ' waypoints)' : '') + '.';
  }
  function xInit() {
    $('xGpx').onclick = function () { xSave('gpx'); }; $('xKml').onclick = function () { xSave('kml'); };
    $('xHelpBtn').onclick = function () { var h = $('xHelp'); h.hidden = !h.hidden; this.setAttribute('aria-expanded', String(!h.hidden)); };
    try { if (navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.gpx', { type: 'application/gpx+xml' })] })) $('xShare').hidden = false; } catch (e) {}
    $('xShare').onclick = function () {
      if (!S.sel) { $('xNote').textContent = 'Route first, then pick a route under Decision.'; return; }
      var x = xFile('gpx'); navigator.share({ files: [new File([x.text], x.name, { type: x.type })], title: xName() }).catch(function (e) { if (e && e.name !== 'AbortError') $('xNote').textContent = 'Sharing did not work here: use Save GPX.'; });
    };
  }
  function fleetTable() {
    if (!S.ghosts || !S.sel) return;
    var myCor = (S.sel.r.finish - S.start.t) * (+$('tcc').value || 1), path = S.sel.r.path, me = posAt(tsOf(path), path, S.t);
    var rows = S.ghosts.map(function (g) { var fin = g.ts[g.ts.length - 1], pos = posAt(g.ts, path, S.t); return { g: g, fin: fin, cor: (fin - g.ts[0]) * g.tcc, gap: me && pos ? FSRouter.dist(me.la, me.lo, pos.la, pos.lo) * (pos.k > me.k ? 1 : -1) : null }; }).sort(function (a, b) { return a.cor - b.cor; });
    var h = '<tr><th>Boat</th><th>TCC</th><th>Now</th><th>Corrected</th><th>vs you</th></tr>';
    rows.forEach(function (r) { var d = (r.cor - myCor) * 60; h += '<tr><td style="font-family:var(--f-body)">' + r.g.name + '</td><td>' + r.g.tcc.toFixed(3) + '</td><td>' + (r.gap == null ? '-' : (r.gap >= 0 ? '+' : '−') + Math.abs(r.gap).toFixed(1) + ' nm') + '</td><td>' + fmtH(r.cor) + '</td><td>' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(0) + ' min</td></tr>'; });
    $('fleet').innerHTML = h;
  }

  /* ---------- chart ---------- */
  var cv = $('map'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, K = Math.cos(50.1 * R), view = { lo: -0.8, la: 50.15, s: 300 }, fitted = false;
  function resize() { var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); if (!fitted && W) { fit(); fitted = true; } }
  function resizeDraw() { resize(); draw(); }
  /* frame the whole course: start, marks, finish and the forecast band */
  function fit() {
    var top = 70, c = meta && (meta.course || {}), pts = [];
    if (c && c.start) pts = [c.start].concat(c.marks || []).concat([c.finish]).map(function (p) { return [p.lat, p.lon]; });
    ((c && c.band) || []).forEach(function (b) { pts.push([b[0], b[1]], [b[2], b[3]]); });
    if (!pts.length) { view.s = Math.min(W / (2.25 * K), (H - top) / 1.4); view.lo = -0.8; view.la = 50.15 + top / 2 / view.s; return; }
    var s = 90, n = -90, w = 180, e = -180; pts.forEach(function (p) { s = Math.min(s, p[0]); n = Math.max(n, p[0]); w = Math.min(w, p[1]); e = Math.max(e, p[1]); });
    var pad = 0.08; s -= (n - s) * pad; n += (n - s) * pad; w -= (e - w) * pad; e += (e - w) * pad;
    view.s = Math.max(150, Math.min(W / ((e - w) * K), (H - top - 90) / (n - s))); view.lo = (w + e) / 2; view.la = (s + n) / 2 + top / 2 / view.s;
  }
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
    if (S.show.tide) { ctx.save(); ctx.globalAlpha = (+$('tideDim').value || 0) / 100; arrows('tide'); ctx.restore(); }
    if (S.show.wind && $('windShow').value) { ctx.save(); ctx.globalAlpha = (+$('windDim').value || 0) / 100; arrows('wind'); ctx.restore(); }
    zonesDraw(); lightsDraw();
    marks();
    /* the chosen route is a wide band underneath, so routes that run within a mile of it still show on top */
    var selOn = S.sel && !S.sel.hidden;
    if (selOn) line(S.sel, 9, 0.35);
    S.routes.forEach(function (s) { if (!s.hidden && s !== S.sel) line(s, 2.2, 1); });
    if (selOn) line(S.sel, 2.2, 1);
    if (S.edit) editDraw();
    if (S.mob) mobDraw();
    aisDraw();
    if (S.show.real) realBoats();
    if (S.show.ghosts && S.ghosts && S.sel) ghostsDraw();
    S.routes.forEach(function (s) { if (s.hidden) return; var p = posAt(tsOf(s.r.path), s.r.path, S.t); if (!p) return; var hd = hdgAt(s.r.path, p.k), x = X(p.lo), y = Y(p.la); if (s === S.sel) { triMark(x, y, hd, 13, css['--panel'], col(s), 3); } else triMark(x, y, hd, 9, css['--panel'], col(s), 2); });
    if (S.from) { ctx.strokeStyle = css['--ink']; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(S.from.lon), Y(S.from.lat), 10, 0, 7); ctx.stroke(); }
    scale();
  }
  /* ---------- traffic separation schemes, keep-out areas, lighthouses and buoys (not for navigation) ---------- */
  var ZONES = [], LIGHTS = [], hatchPat = null;
  function loadChartExtras() {
    fetch('../zones/tss.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { ZONES = j.zones || []; draw(); } }).catch(function () {});
    fetch('../zones/marks.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { LIGHTS = j.marks || []; draw(); } }).catch(function () {});
  }
  function viewBox() { return { s: LA(H), n: LA(0), w: LO(0), e: LO(W) }; }
  function ringOn(ring, vb) { for (var i = 0; i < ring.length; i++) { var q = ring[i]; if (q[0] >= vb.s && q[0] <= vb.n && q[1] >= vb.w && q[1] <= vb.e) return true; } var la = 0, lo = 0; ring.forEach(function (q) { la += q[0]; lo += q[1]; }); la /= ring.length; lo /= ring.length; return la > vb.s - 2 && la < vb.n + 2 && lo > vb.w - 3 && lo < vb.e + 3; }
  function hatch(colr) {
    var c = document.createElement('canvas'); c.width = c.height = 10; var g = c.getContext('2d'); g.strokeStyle = colr; g.globalAlpha = 0.55; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 10); g.lineTo(10, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke(); return ctx.createPattern(c, 'repeat');
  }
  function polyPath(ring) { ctx.beginPath(); ring.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.closePath(); }
  function zonesDraw() {
    var vb = viewBox(), obs = (meta.course && meta.course.race && meta.course.race.obstructions) || [], pat = hatch(css['--shoaledge'] || '#B0302A');
    if (S.show.tss && ZONES.length) {
      ZONES.forEach(function (z) {
        if (!ringOn(z.poly, vb)) return; polyPath(z.poly);
        if (z.kind === 'zone') { ctx.fillStyle = pat; ctx.fill(); }
        ctx.strokeStyle = css['--shoaledge']; ctx.globalAlpha = z.kind === 'lane' ? 0.6 : z.kind === 'zone' ? 0.85 : 0.45; ctx.lineWidth = z.kind === 'zone' ? 1.4 : 1; ctx.setLineDash(z.kind === 'lane' ? [] : z.kind === 'zone' ? [] : [5, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
    }
    obs.forEach(function (o) { polyPath(o.poly); ctx.fillStyle = pat; ctx.fill(); ctx.strokeStyle = css['--shoaledge']; ctx.lineWidth = 2; ctx.stroke(); var q = o.poly[0]; ctx.fillStyle = css['--shoaledge']; ctx.font = '600 11px Inter, sans-serif'; ctx.fillText(o.name, X(q[1]) + 4, Y(q[0]) - 5); });
  }
  function lightsDraw() {
    if (!S.show.lights || !LIGHTS.length) return;
    var vb = viewBox(), z = view.s, buoys = z > 700, taken = [];   /* view.s: pixels per degree of latitude */
    function free(x, y, w, h) { for (var i = 0; i < taken.length; i++) { var t = taken[i]; if (x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1]) return false; } taken.push([x, y, w, h]); return true; }
    ctx.font = '10.5px Inter, sans-serif';
    [true, false].forEach(function (pass) {   /* lighthouses first, so they keep their labels */
      LIGHTS.forEach(function (m) {
        if ((m.k === 'light') !== pass) return;
        if (m.la < vb.s || m.la > vb.n || m.lo < vb.w || m.lo > vb.e) return;
        if (m.k !== 'light' && !buoys) return;
        var x = X(m.lo), y = Y(m.la);
        if (!free(x - 4, y - 7, 8, 11)) return;
        ctx.strokeStyle = css['--ink']; ctx.fillStyle = css['--ink']; ctx.lineWidth = 1.2;
        if (m.k === 'light') { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 2.6, y + 3); ctx.lineTo(x - 2.6, y + 3); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.stroke(); }
        var show = m.k === 'light' ? z > 350 : z > 1100;
        if (!show) return;
        var label = m.n + (m.lt && z > 1400 ? ' ' + m.lt : ''), w = ctx.measureText(label).width;
        if (free(x + 6, y - 6, w, 12)) { ctx.fillStyle = css['--muted']; ctx.fillText(label, x + 6, y + 3); }
      });
    });
  }
  /* no-go rings for the router: the race's keep-out boxes always; traffic separation lanes and zones when ticked */
  function nogoRings() {
    var c = meta.course, pts = [c.start].concat(c.marks).concat([c.finish]), s = 90, n = -90, w = 180, e = -180;
    pts.forEach(function (p) { s = Math.min(s, p.lat); n = Math.max(n, p.lat); w = Math.min(w, p.lon); e = Math.max(e, p.lon); });
    var rings = ((c.race && c.race.obstructions) || []).map(function (o) { return o.poly; });
    if ($('tssNogo') && $('tssNogo').checked) ZONES.forEach(function (z) { if (z.kind !== 'lane' && z.kind !== 'zone') return; if (z.poly.some(function (q) { return q[0] > s - 1.5 && q[0] < n + 1.5 && q[1] > w - 2 && q[1] < e + 2; })) rings.push(z.poly); });
    return rings;
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
  var BB = null;   /* while set, barbs collect into two paths drawn once per frame instead of hundreds of separate strokes */
  function barb(x, y, dx, dy, s) {
    var L = 24, ux = -dx, uy = -dy, ex = x + ux * L, ey = y + uy * L, r = Math.round(s / 5) * 5, pos = 0, px = -uy, py = ux, fl = 11, bx, by;
    var own = !BB, l = own ? new Path2D() : BB.l, f = own ? new Path2D() : BB.f;
    l.moveTo(x, y); l.lineTo(ex, ey); f.moveTo(x + 2, y); f.arc(x, y, 2, 0, 7);
    while (r >= 50) { bx = ex - ux * pos; by = ey - uy * pos; f.moveTo(bx, by); f.lineTo(bx + px * fl, by + py * fl); f.lineTo(bx - ux * 6, by - uy * 6); f.closePath(); pos += 8; r -= 50; }
    while (r >= 10) { bx = ex - ux * pos; by = ey - uy * pos; l.moveTo(bx, by); l.lineTo(bx + px * fl + ux * 4, by + py * fl + uy * 4); pos += 4.5; r -= 10; }
    if (r >= 5) { if (pos === 0) pos = 4.5; bx = ex - ux * pos; by = ey - uy * pos; l.moveTo(bx, by); l.lineTo(bx + px * fl / 2 + ux * 2, by + py * fl / 2 + uy * 2); }
    if (own) { ctx.lineWidth = 1.6; ctx.stroke(l); ctx.fill(f); }
  }
  function arrows(kind) {
    var A0 = ctx.globalAlpha;   /* the brightness slider; symbols' own transparency multiplies it */
    var f = kind === 'wind' ? P.wind[$('windShow').value] : P.tide[$('tideSel').value]; if (!f) return;
    var sym = kind === 'wind' ? $('windSym').value : $('tideSym').value;
    var sp = kind === 'wind' ? (sym === 'W5' ? 30 : 60) : ({ T5: 46, T6: 46, T1: 38, T3: 42 }[sym] || 40);
    ctx.strokeStyle = css[kind === 'wind' ? '--wind' : '--tide']; ctx.fillStyle = ctx.strokeStyle; ctx.font = '10px "JetBrains Mono", monospace'; ctx.lineCap = 'round';
    var now = performance.now();
    if (kind === 'wind' && (sym === 'W2' || sym === 'W6')) BB = { l: new Path2D(), f: new Path2D() };
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
          ctx.globalAlpha = A0 * 0.6 * Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(cx - dx * L2 / 2, cy - dy * L2 / 2); ctx.lineTo(cx + dx * L2 / 2, cy + dy * L2 / 2); ctx.stroke(); }
        ctx.globalAlpha = A0 * 1;
        if ((Math.round(x / sp) + Math.round(y / sp)) % 2 === 0) { ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.fillText(s.toFixed(0), x - 4, y + 4); ctx.font = '10px "JetBrains Mono", monospace'; }
      }
      else if (sym === 'T5' || sym === 'T6') {
        var L3 = 12 + s * 9, w3 = 2 + s * 3.2, hw = w3 * 1.9, hl = 5 + s * 3, bx = x - dx * L3 / 2, by = y - dy * L3 / 2, tx = x + dx * L3 / 2, ty = y + dy * L3 / 2, nx = x + dx * (L3 / 2 - hl), ny = y + dy * (L3 / 2 - hl);
        ctx.beginPath(); ctx.moveTo(bx - dy * w3 / 2, by + dx * w3 / 2); ctx.lineTo(nx - dy * w3 / 2, ny + dx * w3 / 2); ctx.lineTo(nx - dy * hw / 2, ny + dx * hw / 2); ctx.lineTo(tx, ty); ctx.lineTo(nx + dy * hw / 2, ny - dx * hw / 2); ctx.lineTo(nx + dy * w3 / 2, ny - dx * w3 / 2); ctx.lineTo(bx + dy * w3 / 2, by - dx * w3 / 2); ctx.closePath();
        ctx.globalAlpha = A0 * 0.32; ctx.fill(); ctx.globalAlpha = A0 * 1; if (sym === 'T6') { ctx.lineWidth = 0.9; ctx.globalAlpha = A0 * 0.85; ctx.stroke(); ctx.globalAlpha = A0 * 1; }
        if (s >= 0.6 && lbl) { ctx.globalAlpha = A0 * 0.8; ctx.fillText(s.toFixed(1), x + 6, y - 6); ctx.globalAlpha = A0 * 1; }
      }
      else if (sym === 'T1') { var L4 = 8 + s * 7; for (var q = 0; q <= 4; q++) { var fq = q / 4 - 0.5; ctx.beginPath(); ctx.arc(x + dx * L4 * fq, y + dy * L4 * fq, 1.4, 0, 7); ctx.fill(); } head(x + dx * (L4 / 2 + 5), y + dy * (L4 / 2 + 5), dx, dy, 5, 2.8); if (s >= 0.5 && lbl) { ctx.globalAlpha = A0 * 0.8; ctx.fillText(s.toFixed(1), x + 5, y + 11); ctx.globalAlpha = A0 * 1; } }
      else if (sym === 'T3') { var L5 = 10 + s * 7, w5 = 0.8 + s * 1.6; ctx.lineWidth = w5; ctx.beginPath(); ctx.moveTo(x - dx * L5 / 2, y - dy * L5 / 2); ctx.lineTo(x + dx * (L5 / 2 - 4), y + dy * (L5 / 2 - 4)); ctx.stroke(); head(x + dx * L5 / 2, y + dy * L5 / 2, dx, dy, 4 + w5, 1.8 + w5); if (s >= 0.5 && lbl) { ctx.globalAlpha = A0 * 0.8; ctx.fillText(Math.round(s * 10), x + 5, y - 5); ctx.globalAlpha = A0 * 1; } }
    }
    if (BB) { ctx.lineWidth = 1.6; ctx.stroke(BB.l); ctx.fill(BB.f); BB = null; }
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
    var RG = (meta.course0 || meta.course).region;
    if (RG) { ctx.save(); ctx.strokeStyle = css['--muted']; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.2; ctx.strokeRect(X(RG.w), Y(RG.n), X(RG.e) - X(RG.w), Y(RG.s) - Y(RG.n)); ctx.restore(); return; }
    if (!bandPath) {
      // outline of the band from the depth layer's run ends, or from the geometry
      var B = meta.course.band, k = Math.cos(50.1 * R), pts = [];
      function ex(la, lo) { var best = 1e9; B.forEach(function (s) { var ax = s[1] * 60 * k, ay = s[0] * 60, bx = s[3] * 60 * k, by = s[2] * 60, px = lo * 60 * k, py = la * 60, dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(px - ax - u * dx, py - ay - u * dy) - s[4]); }); return best; }
      var segs = [], st = 0.02;
      var bb = B.reduce(function (a, b) { var w = b[4] / 60 + 0.1; return [Math.min(a[0], b[0] - w, b[2] - w), Math.max(a[1], b[0] + w, b[2] + w), Math.min(a[2], b[1] - w / 0.6, b[3] - w / 0.6), Math.max(a[3], b[1] + w / 0.6, b[3] + w / 0.6)]; }, [90, -90, 180, -180]);
      st = Math.max(0.02, (bb[1] - bb[0]) / 220);
      for (var la = bb[0]; la < bb[1]; la += st) for (var lo = bb[2]; lo < bb[3]; lo += st / 0.64) {
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
      var p = s.r.path, pos = posAt(tsOf(p), p, S.t);
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
  function tick(ts) { if (!playing) return; if (lastTs) { var t = S.t + Math.min(ts - lastTs, 50) / 1000 * (+$('speed').value || 1);   /* a slow frame slows the replay a moment instead of jumping it */ if (t >= (S.tmax || 30)) { t = S.tmax || 30; togglePlay(); } setTime(t); } lastTs = ts; if (playing) requestAnimationFrame(tick); }

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
    if (pinch && !iosG) zoomAt((v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2, d / pinch); pinch = d;
  });
  /* iPhone and iPad Safari: take the pinch from its own gesture events and stop it zooming the whole page */
  var iosG = 'ongesturestart' in window, gScale = 1, gMid = null;
  cv.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  if (iosG) {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
    cv.addEventListener('gesturestart', function (e) { gScale = 1; var r = cv.getBoundingClientRect(); gMid = [e.clientX - r.left, e.clientY - r.top]; moved = 99; });
    cv.addEventListener('gesturechange', function (e) { if (!gMid || !(e.scale > 0)) return; zoomAt(gMid[0], gMid[1], e.scale / gScale); gScale = e.scale; });
    cv.addEventListener('gestureend', function () { gMid = null; });
  }
  cv.addEventListener('pointerup', function (e) { if (ptrs.has(e.pointerId) && moved < 6 && ptrs.size === 1) tap(e.offsetX, e.offsetY, e.pointerType !== 'mouse'); ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointercancel', function (e) { ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs.size && !$('tip').classList.contains('docked')) $('tip').hidden = true; });
  function tap(x, y, touch) {
    if (S.edit) { editTap(x, y); return; }
    if (S.mobTap) { store('fs-mob', JSON.stringify({ lat: LA(y), lon: LO(x), t: Date.now(), how: 'tapped' })); beep(); mobShow(); return; }
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
  /* ---------- the boat: type, TCC or own polar, tuning, saved boats ---------- */
  var boatSrc = 'type';
  function boatSpec() { return { src: boatSrc, type: $('boatType').value, tcc: +$('tcc').value || 1, text: $('polarTxt').value, tune: { up: +$('tuUp').value, reach: +$('tuReach').value, run: +$('tuRun').value } }; }
  function setSrc(src) {
    boatSrc = src; [].forEach.call($('srcSeg').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.src === src)); });
    $('srcType').hidden = src !== 'type'; $('srcPolar').hidden = src !== 'polar'; $('srcTccNote').hidden = src !== 'tcc';
  }
  function polarGrid(pol) {
    if (!pol || pol.tws.length * pol.twa.length > 900) { $('polarGrid').innerHTML = ''; return; }
    var h = '<table><thead><tr><th>TWA \\ TWS</th>' + pol.tws.map(function (w) { return '<th>' + w + '</th>'; }).join('') + '</tr></thead><tbody>';
    pol.twa.forEach(function (a, j) { h += '<tr><td>' + a + '°</td>' + pol.tws.map(function (w, i) { var x = pol.v[i][j]; return '<td><input inputmode="decimal" data-i="' + i + '" data-j="' + j + '" value="' + (x == null ? '' : (+x).toFixed(2)) + '" aria-label="' + a + '° at ' + w + ' kn"></td>'; }).join('') + '</tr>'; });
    $('polarGrid').innerHTML = h + '</tbody></table>';
  }
  var gridPol = null;
  function readOwn(rebuildGrid) {
    var r = FSBoat.readPolar($('polarTxt').value);
    if (!$('polarTxt').value.trim()) { $('polarRead').textContent = 'No polar yet: routing uses the TCC until you add one.'; gridPol = null; if (rebuildGrid) polarGrid(null); return; }
    if (!r) { $('polarRead').textContent = 'Could not read this polar. Check it has wind speeds across and angles down.'; gridPol = null; if (rebuildGrid) polarGrid(null); return; }
    gridPol = r.pol; $('polarRead').textContent = r.kind + ' read: ' + r.pol.tws.length + ' wind speeds, ' + r.pol.twa.length + ' angles' + (r.pol.name ? ' · ' + r.pol.name : '') + '.';
    if (rebuildGrid) polarGrid(r.pol);
  }
  function plotPolar() {
    var cv = $('polarPlot'), c = cv.getContext('2d'), W = cv.width, H = cv.height, cs = getComputedStyle(document.documentElement), tok = function (k) { return cs.getPropertyValue(k).trim(); };
    var b = FSBoat.resolve(boatSpec()), cx = 24, cy = H / 2, ws = [6, 10, 14, 20], cols = ['--m1', '--m2', '--m3', '--m4'], max = 0, R0 = Math.min(H / 2 - 24, W - 60);
    ws.forEach(function (w) { var t = FSRouter.polarTable(b.pol); for (var a = 0; a <= 180; a += 5) max = Math.max(max, t(w, a)); });
    var k = R0 / Math.max(4, Math.ceil(max / 2) * 2);
    c.clearRect(0, 0, W, H); c.font = '20px "JetBrains Mono", monospace'; c.lineWidth = 1;
    c.strokeStyle = tok('--line'); c.fillStyle = tok('--muted');
    for (var r = 2; r * k <= R0 + 1; r += 2) { c.beginPath(); c.arc(cx, cy, r * k, -Math.PI / 2, Math.PI / 2); c.stroke(); if (r % 4 === 0) c.fillText(r + (r + 4 > R0 / k ? ' kn' : ''), cx + r * k - 12, cy + 24); }
    [0, 45, 90, 135, 180].forEach(function (a) { var q = a * Math.PI / 180; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(q) * (R0 + 8), cy - Math.cos(q) * (R0 + 8)); c.stroke(); if (a && a < 180) c.fillText(a + '°', cx + Math.sin(q) * (R0 + 14), cy - Math.cos(q) * (R0 + 14) + 6); });
    function curve(pol, w, dash, colr, lw) { var t = FSRouter.polarTable(pol); c.setLineDash(dash); c.strokeStyle = colr; c.lineWidth = lw; c.beginPath(); for (var a = 25; a <= 180; a += 2) { var s = t(w, a), q = a * Math.PI / 180, x = cx + Math.sin(q) * s * k, y = cy - Math.cos(q) * s * k; if (a === 25) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); c.setLineDash([]); }
    var tuned = b.pol !== b.base;
    ws.forEach(function (w, i) { if (tuned) curve(b.base, w, [6, 6], tok(cols[i]), 2); curve(b.pol, w, [], tok(cols[i]), 4); });
    c.fillStyle = tok('--ink'); c.font = '600 22px Inter, sans-serif'; c.fillText(b.kind, W - c.measureText(b.kind).width - 14, 34);
    $('plotKey').innerHTML = ws.map(function (w, i) { return '<span style="color:' + tok(cols[i]) + ';font-weight:700">━</span> ' + w + ' kn'; }).join(' &nbsp; ') + (tuned ? ' &nbsp; dashed: before tuning' : '') + '. Boat speed in knots; wind from the top.';
  }
  var spTimer = null;
  function boatChanged() { spCache = {}; ['Up', 'Reach', 'Run'].forEach(function (n) { $('tu' + n + 'V').textContent = $('tu' + n).value + '%'; }); clearTimeout(spTimer); spTimer = setTimeout(plotPolar, 60); }
  function boats() { try { return JSON.parse(store('fsBoats') || '{}') || {}; } catch (e) { return {}; } }
  function listBoats(sel) { var b = boats(); $('myBoat').innerHTML = '<option value="">' + (Object.keys(b).length ? 'Choose a saved boat…' : 'Not saved yet') + '</option>' + Object.keys(b).sort().map(function (n) { return '<option>' + n.replace(/</g, '&lt;') + '</option>'; }).join(''); $('myBoat').value = sel || ''; $('boatDel').hidden = !sel; }
  function initBoat() {
    $('boatType').innerHTML = FSBoat.TYPES.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join('');
    $('boatType').value = 'perf';
    var eg = function () { var t = FSBoat.TYPES.filter(function (x) { return x.id === $('boatType').value; })[0]; $('typeEg').textContent = (t ? t.eg.charAt(0).toUpperCase() + t.eg.slice(1) + '. ' : '') + 'A FirstShift generic shape for the type, not a class polar; the TCC sets the overall speed.'; };
    eg(); $('boatType').onchange = function () { eg(); boatChanged(); };
    [].forEach.call($('srcSeg').querySelectorAll('button'), function (b) { b.onclick = function () { setSrc(b.dataset.src); if (b.dataset.src === 'polar') readOwn(true); boatChanged(); }; });
    $('tcc').addEventListener('input', boatChanged);
    ['tuUp', 'tuReach', 'tuRun'].forEach(function (id) { $(id).oninput = boatChanged; });
    $('tuReset').onclick = function () { ['tuUp', 'tuReach', 'tuRun'].forEach(function (id) { $(id).value = 100; }); boatChanged(); };
    $('polarTxt').oninput = function () { readOwn(true); boatChanged(); };
    $('polarFile').onchange = function () { var f = $('polarFile').files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { $('polarTxt').value = String(rd.result); readOwn(true); boatChanged(); }; rd.readAsText(f); };
    $('polarFromType').onclick = function () { $('polarTxt').value = FSBoat.toGrid(FSBoat.typedPolar($('boatType').value, +$('tcc').value || 1)); readOwn(true); boatChanged(); };
    $('polarGrid').addEventListener('change', function (e) { var t = e.target; if (!gridPol || !t.dataset) return; var v = parseFloat(t.value); gridPol.v[+t.dataset.i][+t.dataset.j] = isFinite(v) ? v : null; $('polarTxt').value = FSBoat.toGrid(gridPol); readOwn(false); boatChanged(); });
    $('boatSave').onclick = function () { var n = $('boatName').value.trim() || 'My boat', b = boats(); $('boatName').value = n; b[n] = { spec: boatSpec(), tackS: +$('tackS').value, gybeS: +$('gybeS').value }; store('fsBoats', JSON.stringify(b)); listBoats(n); busy('Saved ' + n + ' on this device'); setTimeout(function () { busy(''); }, 1600); };
    $('boatDel').onclick = function () { var n = $('myBoat').value, b = boats(); if (!n) return; delete b[n]; store('fsBoats', JSON.stringify(b)); listBoats(''); };
    $('myBoat').onchange = function () { var n = $('myBoat').value, b = boats()[n]; $('boatDel').hidden = !n; if (!b) return; var s = b.spec; $('boatName').value = n; $('tcc').value = (+s.tcc).toFixed(3); $('boatType').value = s.type || 'perf'; eg(); $('polarTxt').value = s.text || ''; $('tuUp').value = s.tune.up; $('tuReach').value = s.tune.reach; $('tuRun').value = s.tune.run; if (b.tackS) $('tackS').value = b.tackS; if (b.gybeS) $('gybeS').value = b.gybeS; setSrc(s.src); readOwn(true); boatChanged(); };
    listBoats(''); setSrc('type'); boatChanged();
  }
  var spCache = {};
  function speedFn(o) { var key = o.polKey || 't' + o.tcc; if (!spCache[key]) spCache[key] = FSRouter.polarTable(o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc)); return spCache[key]; }
})();
