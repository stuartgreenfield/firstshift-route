(function () {
  'use strict';
  var VERSION = 'FirstShift Route v0.5.1';
  var R = Math.PI / 180, KN = 1852 / 3600, $ = function (id) { return document.getElementById(id); };
  var meta, P = FSRouter.emptyPack(), T0, workers = [], wq = 0, jobs = {}, jid = 0;
  var STYLE = { ukv: ['--m1', []], ecmwf: ['--m2', [9, 4]], gfs: ['--m3', [2, 4]], aifs: ['--m4', [12, 4, 2, 4]], mog: ['--m5', [1, 5]], icon: ['--m6', [6, 3, 1, 3]], arome: ['--m7', [3, 2]], arpege: ['--m8', [10, 3, 3, 3, 3, 3]], om: ['--brand', [4, 2, 1, 2]], chain: ['--ink', [14, 4, 2, 4, 2, 4]] };
  var S = { t: 5, routes: [], sel: null, matrix: null, ghosts: null, from: null, running: false, show: { wind: true, tide: true, ghosts: true, real: false, band: true, tss: true, lights: true, lay: true }, choice: {}, loaded: {} };
  var css = {};
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- colours ---------- */
  function readCss() { var cs = getComputedStyle(document.documentElement); ['--sea', '--sea2', '--land', '--landedge', '--shoal', '--shoaledge', '--route', '--wind', '--tide', '--ink', '--muted', '--panel', '--ghost', '--out', '--m1', '--m2', '--m3', '--m4', '--m5', '--m6', '--m7', '--m8'].forEach(function (k) { css[k] = cs.getPropertyValue(k).trim(); }); }
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
  (function () { var mq = matchMedia('(max-width:899px) and (orientation:portrait), (max-width:899px) and (min-height:501px)'), fh = $('fromHere'), home = fh.parentNode, next = fh.nextSibling;
    function place() { var bar = document.querySelector('.bar'); if (mq.matches) { bar.insertBefore(fh, $('time')); bar.classList.add('fh'); } else if (fh.parentNode !== home) { home.insertBefore(fh, next); bar.classList.remove('fh'); } }
    place(); if (mq.addEventListener) mq.addEventListener('change', place); })();
  /* ---------- offline: keep the app, forecasts and routes on the device (sw.js) ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }
  function offBadge() { var o = !navigator.onLine; $('offBadge').hidden = !o; $('offBadge').title = o ? 'No signal: Route is using the forecast saved on this device' : ''; }
  window.addEventListener('online', function () { offBadge(); if (meta) chip(); }); window.addEventListener('offline', function () { offBadge(); if (meta) chip(); });
  setTimeout(offBadge, 0);

  /* ---------- landing page: shows while Route starts, at least 5 s before launch (Stuart 12 Nov), at most 12 s; tap to skip ---------- */
  var SPLASH_MIN = (function () { try { var o = JSON.parse(localStorage.getItem('fs-sess-' + location.pathname.replace(/\/+$/, '').split('/').pop()) || 'null'); if (o && Date.now() < o.until) return 1200; } catch (e) {} return 5000; })();   /* pre-launch: long enough to read; quick when carrying on mid-race */
  /* Info buttons: the longer explanations sit behind a small (i) beside the control they explain, so the panels stay short. */
  (function () {
    var n = 0;
    [].forEach.call(document.querySelectorAll('p.note[data-i]'), function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ibtn'; b.textContent = 'i';
      b.setAttribute('aria-label', 'More about this'); b.setAttribute('aria-expanded', 'false');
      p.id = p.id || 'inote' + (++n); b.setAttribute('aria-controls', p.id); p.hidden = true; p.classList.add('inote');
      b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); b.classList.toggle('on', !p.hidden); };
      var host = p.previousElementSibling, h = null;
      if (p.dataset.i) h = document.getElementById(p.dataset.i);
      else
      if (host && /^(H3|H4)$/.test(host.tagName)) h = host;
      else if (host && (host.classList.contains('row') || host.tagName === 'SUMMARY')) h = host;
      else if (host && host.tagName === 'LABEL') h = host;
      else { var q = p; while ((q = q.previousElementSibling)) if (/^(H3|H4)$/.test(q.tagName)) { h = q; break; } }
      if (h) h.appendChild(b);
      else p.parentNode.insertBefore(b, p);
    });
  })();
  function errShow(msg) { var b = $('errBox'); if (!b) return; $('errMsg').textContent = msg; b.hidden = false; }
  function errHide() { var b = $('errBox'); if (b) b.hidden = true; }
  (function () { var b = $('errBox'); if (!b) return; $('errX').onclick = errHide; $('errRetry').onclick = function () { errHide(); S.running = false; S.preBad = true; S.routes = []; run(); }; })();
  setInterval(function () {   /* a route that has run for two minutes with nothing to show is stuck: say so */
    if (S.running) { S.runSince = S.runSince || Date.now(); if (Date.now() - S.runSince > 120000 && !(S.routes && S.routes.length) && $('errBox') && $('errBox').hidden) errShow('Routing is taking far longer than usual. Try again, or choose fewer wind models in Settings, Forecasts.'); }
    else S.runSince = 0;
  }, 5000);
  try { localStorage.setItem('fs-lastpage', location.pathname); } catch (e) {}   /* so the terms page can always find its way back */
  var TERMS_DAY = (function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); })();
  var TERMS_OK = (function () { try { return localStorage.getItem('fs-terms') === TERMS_DAY; } catch (e) { return false; } })();
  if (TERMS_OK) SPLASH_MIN = Math.min(SPLASH_MIN, 1200);   /* once accepted today, opening again is quick */
  (function () { var sp = $('splash'); if (!sp) return; var t0 = Date.now(), gone = false; function hide() { if (gone) return; gone = true; sp.classList.add('out'); setTimeout(function () { sp.hidden = true; }, 550); }
    if (!TERMS_OK) {   /* the first open each day: the disclaimer must be accepted before Route can be used */
      sp.classList.add('terms'); var tb = $('spTerms'); if (tb) tb.hidden = false;
      S.splashDone = function () {};
      $('spAgree').onclick = function (ev) { ev.stopPropagation(); try { localStorage.setItem('fs-terms', TERMS_DAY); } catch (e) {} TERMS_OK = true; hide(); };
      if (tb) tb.addEventListener('click', function (ev) { ev.stopPropagation(); });
      return;
    }
    S.splashDone = function () { setTimeout(hide, Math.max(0, SPLASH_MIN - (Date.now() - t0))); }; sp.addEventListener('click', hide); setTimeout(hide, 12000); })();
  /* ---------- start ---------- */
  fetch('pack/pack.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
    meta = m; T0 = m.t0; if (S.splashDone) S.splashDone(); setup(); loadRaces(); loadChartExtras(); xInit(); adjInit(); helpInit(); racesInit(); mobInit(); aisInit(); spdInit(); mfInit(); wizInit(); crewInit(); askInit(); bcInit();
    ['windDim', 'tideDim'].forEach(function (id) { var el = $(id), v = store('fs-' + id); if (v != null) el.value = v; var f = function () { $(id + 'V').textContent = el.value + '%'; store('fs-' + id, el.value); draw(); }; el.oninput = f; $(id + 'V').textContent = el.value + '%'; }); if (W) { fit(); fitted = true; }
    fetch('pack/' + m.coast.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { coastBits = new Uint8Array(b); buildDepth(); draw(); });
    var saved = store('fs-plan'); applyPlan(saved && PLANS[saved] ? saved : 'full');
    return loadPre().then(function () { earlyPre(); return download(); });
  }).then(function () { return omFallback(); }).then(function () { run(); watchForNew(); }).catch(function (e) { $('dataChip').textContent = 'Could not load forecasts: ' + e.message; errShow('Could not load the forecasts: ' + e.message); });

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
      if (S.sessStale && !nextMeta && !S.running) { S.sessStale = false; $('newData').hidden = true; $('newDataBtn').textContent = 'New data: update routing'; run(); return; }
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
    full: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'full', mog: 'full', icon: 'full', arome: 'full', arpege: 'full', nwscur: 'full', ibicur: 'full', nwswav: 'full', ecwav: 'full', ecmet: 'full', mars: 'full', emodnet: 'full' },
    coastal: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'off', mog: 'off', icon: 'full', arome: 'full', arpege: 'off', nwscur: 'full', ibicur: 'off', nwswav: 'lite', ecwav: 'off', ecmet: 'full', mars: 'full', emodnet: 'full' },
    lite: { ukv: 'lite', ecmwf: 'lite', gfs: 'lite', aifs: 'off', mog: 'off', icon: 'lite', arome: 'lite', arpege: 'off', nwscur: 'lite', ibicur: 'off', nwswav: 'off', ecwav: 'full', ecmet: 'lite', mars: 'lite', emodnet: 'lite' }
  };
  function applyPlan(p) { S.choice = Object.assign({}, PLANS[p]); S.plan = p; store('fs-plan', p); [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', b.dataset.plan === p); }); dataTable(); }
  function layer(id) { return meta.layers.find(function (l) { return l.id === id; }); }
  function mb(b) { return b < 1e5 ? (b / 1e3).toFixed(0) + ' kB' : (b / 1e6).toFixed(1) + ' MB'; }
  function res(v) { var a = v.res_km[0], b = v.res_km[1]; return a < 1 ? Math.round((a + b) / 2 * 1000) + ' m' : (Math.abs(a - b) / a < 0.25 ? ((a + b) / 2).toFixed(1) + ' km' : a.toFixed(0) + '×' + b.toFixed(0) + ' km'); }
  /* forecast age: the model run, when it reached the FirstShift server, when it reached this device */
  function hhmm(ms) { var d = new Date(ms); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function dayhm(ms) { var d = new Date(ms), today = new Date(); return (d.toDateString() === today.toDateString() ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ') + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }   /* ms; the later hhmm() takes seconds */
  function ageTxt(h) { return h < 1 ? Math.round(h * 60) + ' min' : Math.floor(h) + ' h ' + String(Math.round((h % 1) * 60)).padStart(2, '0'); }
  function runTxt(t0) { var d = new Date(t0 * 1000); return String(d.getUTCHours()).padStart(2, '0') + 'Z ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]; }
  function ageCls(h) { return h > 18 ? ' style="color:var(--shoaledge);font-weight:700"' : h > 12 ? ' style="color:var(--warn);font-weight:700"' : ''; }
  function dataTable() {
    if (!meta) return;
    var tot = 0, now = Date.now(), h = '<tr><th>Layer</th><th>Version</th><th>Grid</th><th>Step</th><th>Size</th></tr>', kinds = { wind: 'Wind', tide: 'Tide', wave: 'Sea state', depth: 'Depth', met: 'Weather' };
    meta.layers.forEach(function (L) {
      if (L.kind === 'ens') return;   /* the ensemble members load only when asked for, from the Routes tab */
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
    var todo = meta.layers.filter(function (L) { if (L.device) return false; var c = S.choice[L.id] || 'off'; return c !== S.loaded[L.id] && !(c === 'off' && !S.loaded[L.id]); });
    var ovJob = Promise.resolve();
    if (meta.overview && $('ovChk').checked && !S.ov) ovJob = fetch('pack/' + meta.overview.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { S.ov = b; layersPop(); });
    if (!$('ovChk').checked && S.ov) { S.ov = null; if (S.big) toggleBig(); }
    if (!todo.length) { return ovJob.then(function () { chip(); dataTable(); $('dlNote').textContent = 'Up to date.'; }); }
    busy('');
    var dlN = todo.filter(function (L) { return (S.choice[L.id] || 'off') !== 'off'; }).length, dlDone = 0, dlTot = 0, dlGot = 0;
    todo.forEach(function (L) { var c = S.choice[L.id]; if (c && c !== 'off' && L[c]) dlTot += L[c].bytes || L[c].size || 0; });
    var dlShow = function () { prog('Loading forecasts', dlN ? dlDone / dlN : null, dlDone + ' of ' + dlN + ' forecasts' + (dlTot ? ', ' + mb(dlGot) + ' of ' + mb(dlTot) : '')); };
    if (dlN) dlShow();
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
        FSRouter.addLayer(P, spec, buf); S.loaded[L.id] = c; (S.gotAt = S.gotAt || {})[L.id] = Date.now(); dlDone++; dlGot += buf.byteLength; dlShow();
        return all(function () { var copy = buf.slice(0); return { msg: { type: 'layer', L: spec, buf: copy }, tr: [copy] }; });
      });
    })).then(function () {
      return ovJob;
    }).then(function () {
      busy(''); prog(''); dataTable(); modelsList(); selects(); chip(); buildDepth(); draw();
      $('dlNote').textContent = 'Up to date.';
    }).catch(function (e) { busy(''); prog(''); $('dlNote').textContent = e.message; });
  }
  /* ---------- fallback: when the server's forecasts are missing or old, fetch wind for the area straight from Open-Meteo on this device ---------- */
  function omFallback() {
    var age = (Date.now() / 1000 - meta.t0) / 3600, none = !Object.keys(P.wind).length;
    if (!navigator.onLine || !(none || (meta.live && age > 12)) || P.wind.om) return Promise.resolve();
    var c = meta.course, la = [c.start.lat, c.finish.lat], lo = [c.start.lon, c.finish.lon]; c.marks.forEach(function (m) { la.push(m.lat); lo.push(m.lon); });
    var b = dataBox || { s: Math.min.apply(0, la) - 0.7, n: Math.max.apply(0, la) + 0.7, w: Math.min.apply(0, lo) - 1, e: Math.max.apply(0, lo) + 1 };
    var step = 0.25; while (((b.n - b.s) / step + 1) * ((b.e - b.w) / step + 1) > 300) step += 0.25;
    var ny = Math.floor((b.n - b.s) / step) + 1, nx = Math.floor((b.e - b.w) / step) + 1, lats = [], lons = [];
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) { lats.push((b.s + y * step).toFixed(2)); lons.push((b.w + x * step).toFixed(2)); }
    prog('Fresh wind from Open-Meteo', null, (none ? 'The forecast pack did not load' : 'The server forecast is ' + Math.round(age) + ' h old') + ', so Route is fetching wind for ' + lats.length + ' points straight to this device.');
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lats.join(',') + '&longitude=' + lons.join(',') + '&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timeformat=unixtime&forecast_days=7', ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('Open-Meteo answered ' + r.status); return r.json(); }).then(function (j) {
        clearTimeout(tm); if (!Array.isArray(j)) j = [j];
        var times = j[0].hourly.time, nt = times.length, plane = ny * nx, buf = new ArrayBuffer(plane * nt * 4), u = new Int16Array(buf, 0, plane * nt), v = new Int16Array(buf, plane * nt * 2, plane * nt);
        j.forEach(function (pt, k) { var ws = pt.hourly.wind_speed_10m, wd = pt.hourly.wind_direction_10m; for (var ti = 0; ti < nt; ti++) { var sp = ws[ti], d = wd[ti], i = ti * plane + k; if (sp == null || d == null) { u[i] = v[i] = -32768; continue; } u[i] = Math.round(-sp * Math.sin(d * R) * 100); v[i] = Math.round(-sp * Math.cos(d * R) * 100); } });
        var hours = times.map(function (t) { return (t - T0) / 3600; }), spec = { kind: 'wind', id: 'om', name: 'Open-Meteo (fetched on this device)', ny: ny, nx: nx, lat0: b.s, lon0: b.w, dlat: step, dlon: step, hours: hours, u: { off: 0, n: plane * nt, scale: 0.01 }, v: { off: plane * nt * 2, n: plane * nt, scale: 0.01 } };
        var full = { ny: ny, nx: nx, lat0: b.s, lon0: b.w, dlat: step, dlon: step, hours: hours, bytes: buf.byteLength, gz: buf.byteLength, size: buf.byteLength, step_h: 1, res_km: [step * 111, step * 111 * Math.cos(b.s * R)] };
        if (!meta.layers.some(function (L) { return L.id === 'om'; })) meta.layers.push({ kind: 'wind', id: 'om', name: 'Open-Meteo (on this device)', full: full, device: true });
        FSRouter.addLayer(P, spec, buf); S.loaded.om = 'full'; S.choice.om = 'full';
        S.omNote = 'Includes wind fetched on this device from Open-Meteo because the server forecast is ' + (none ? 'missing' : Math.round(age) + ' h old') + '.';
        var copy = buf.slice(0);
        return all(function () { return { msg: { type: 'layer', L: spec, buf: copy }, tr: [copy] }; }).then(function () { prog(''); modelsList(); selects(); dataTable(); chip(); var cb = document.querySelector('[data-m="om"]'); if (cb && !cb.checked) cb.checked = true; });
      }).catch(function (e) { clearTimeout(tm); prog(''); S.omNote = 'Could not fetch fresh wind from Open-Meteo: ' + e.message; });
  }
  setInterval(function () { if (meta) { chip(); dataTable(); } }, 60000);
  function chip() {
    var bytes = S.ov && meta.overview ? meta.overview.gz : 0, w = 0; meta.layers.forEach(function (L) { var c = S.loaded[L.id]; if (c) { bytes += L[c].gz; if (L.kind === 'wind') w++; } });
    var hi = S.loaded.ukv === 'full' ? 'UKV 1.5 km' : S.loaded.ukv ? 'UKV lite 3 km' : 'global only';
    var age = (Date.now() / 1000 - meta.t0) / 3600;
    $('dataChip').textContent = 'Route v0.5.1 · ' + (!navigator.onLine ? 'Offline: saved forecast · ' : meta.live ? 'Live · ' : '') + 'Run ' + clockAbs(meta.t0).replace(/ (\d\d):00$/, ' $1Z') + (meta.live ? ' (' + ageTxt(age) + ' old)' : '') + ' · ' + w + ' wind models (' + hi + ') · ' + mb(bytes) + (P.wind.om ? ' · plus Open-Meteo fetched on this device' : '');
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
    /* From here: with no position on this device (a Mac without location, or location turned off), it says so and you tap the chart where the boat is */
    try { if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (st) { var f = function () { var no = st.state === 'denied' || !navigator.geolocation; $('fromHere').classList.toggle('nogps', no); $('fromHere').title = no ? 'From here: no position on this device, so tap the chart where the boat is' : 'From here: route from where you are now (GPS), or tap the chart'; }; f(); st.onchange = f; }).catch(function () {}); } catch (e) {}
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
        var gz = P.depth ? P.depth.nearest('z', la, lo) : NaN;
        if (!inData({ lat: la, lon: lo })) return tap('You are outside this page\'s forecast area.');
        if (!(gz <= -(+$('depth').value))) return tap('You look to be ashore or in shallow water.');   /* at home or on the dock: route from where the boat will be instead */
        S.from = { lat: la, lon: lo, t: t, gps: true }; $('fromHere').setAttribute('aria-pressed', 'false'); busy(''); run();
      }, function () { tap('No GPS fix.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    };
    /* friends and family: the boat's GPS position every five minutes and the chosen route, under the boat code, for the follow page */
    (function () {
      var cb = $('shareTrack'); if (!cb) return; cb.checked = store('fs-share') === '1';
      cb.onchange = function () { store('fs-share', cb.checked ? '1' : '0'); if (cb.checked && !BC.code) $('shareNote').textContent = 'Make or join a boat code first: tap the race name, then Boat code.'; if (cb.checked) { send(); sendRoute(); } };
      function post(o) { if (!BC.code || !navigator.onLine) return; o.name = $('boatName').value || ''; fetch('/api/track/' + BC.code, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).catch(function () {}); }
      function send() { if (!cb.checked || !BC.code || !navigator.geolocation || document.hidden) return; navigator.geolocation.getCurrentPosition(function (g) { post({ pos: [Date.now() / 1000, g.coords.latitude, g.coords.longitude, g.coords.speed != null && g.coords.speed >= 0 ? g.coords.speed / KN : null] }); }, function () {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }); }
      var lastKey = '';
      function sendRoute() { if (!cb.checked || !BC.code || !S.sel || !S.sel.r) return; var p = S.sel.r.path, key = S.sel.id + p.length + (S.sel.r.finish || 0); if (key === lastKey) return; lastKey = key; var step = Math.max(1, Math.floor(p.length / 600)), path = p.filter(function (q, i) { return i % step === 0 || i === p.length - 1; }).map(function (q) { return [q.la, q.lo]; });
        post({ route: { name: meta.course.name, path: path, finish: S.sel.r.partial ? null : T0 + S.sel.r.finish * 3600 } }); }
      setInterval(send, 300000); setInterval(sendRoute, 60000);
      $('shareLink').onclick = function () { if (!BC.code) { $('shareNote').textContent = 'Make or join a boat code first: tap the race name, then Boat code.'; return; } var link = location.origin + '/follow/?boat=' + BC.code, t = 'Follow ' + ($('boatName').value || 'the boat') + ' on FirstShift Route: ' + link; if (navigator.share) navigator.share({ title: 'Follow the boat', text: t }).catch(function () {}); else (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('shareNote').textContent = 'Link copied: ' + link; }, function () { $('shareNote').textContent = link; }); };
    })();
    /* while racing: once From here has a GPS fix, route again from the boat's position on a timer */
    (function () {
      var sel = $('autoFrom'), v = store('fs-autofrom'); if (v != null) sel.value = v; sel.onchange = function () { store('fs-autofrom', sel.value); };
      var last = 0;
      setInterval(function () {
        var mins = +sel.value; if (!mins || !S.from || !S.from.gps || S.running || document.hidden || !navigator.geolocation) return;
        if (Date.now() - last < mins * 60000) return; last = Date.now();
        navigator.geolocation.getCurrentPosition(function (g) {
          var la = g.coords.latitude, lo = g.coords.longitude, t = (Date.now() / 1000 - T0) / 3600, gz = P.depth ? P.depth.nearest('z', la, lo) : NaN;
          if (t > HMAX() - 1 || !inData({ lat: la, lon: lo }) || !(gz <= -(+$('depth').value))) { $('runNote').textContent = 'Automatic reroute paused: the position is outside the forecast area or in shallow water.'; return; }
          S.from = { lat: la, lon: lo, t: t, gps: true }; run();
        }, function () { $('runNote').textContent = 'Automatic reroute paused: no GPS fix.'; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
      }, 30000);
    })();
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
    var DISPLAY_ONLY = /^(windDim|tideDim|windSym|tideSym|windShow|speed|ovChk|autoFrom|shareTrack|leeway)=/;
    function routeSnap() { return settingsSnap().split('|').filter(function (x) { return !DISPLAY_ONLY.test(x); }).join('|'); }
    $('setBtn').onclick = function () { setSnap = routeSnap(); $('sheet').hidden = false; plotPolar(); };
    $('sheetX').onclick = function () { $('sheet').hidden = true; if (setSnap && routeSnap() !== setSnap && !S.running) { busy('Settings changed: routing again…'); S.from = null; run(); } setSnap = ''; };
    $('sheet').onclick = function (e) { if (e.target === $('sheet')) $('sheetX').onclick(); };
    [].forEach.call(document.querySelectorAll('.stabs .tab'), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll('.stabs .tab'), function (x) { x.setAttribute('aria-selected', x === b); $('s-' + x.dataset.s).hidden = x !== b; }); }; });
    [].forEach.call(document.querySelectorAll('.tabs .tab'), function (b) { b.onclick = function () { openTab(b.dataset.tab, true); }; });
    $('panelBtn').onclick = function () { var p = $('panel'); if (wide()) { p.hidden = !p.hidden; store('fs-panel', p.hidden ? 'closed' : 'open'); } else { p.hidden = false; p.classList.toggle('collapsed'); } $('panelBtn').setAttribute('aria-expanded', !p.hidden && !p.classList.contains('collapsed')); setTimeout(resizeDraw, 0); };
    $('panelX').onclick = function () { if (wide()) store('fs-panel', 'closed'); closePanel(); };
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
    if (window.FSSails) FSSails.init({ pts: function () { return S.sel && S.sel.r ? S.sel.r.path : []; }, onChange: function () { plan(); compareTable(); update(); } });
    ['sails', 'mains'].forEach(function (id) { $(id).addEventListener('input', function () { plan(); update(); }); });
    if (!wide()) $('panel').hidden = false;
    else if (store('fs-panel') !== 'closed') { $('panel').hidden = false; $('panel').classList.remove('collapsed'); $('panelBtn').setAttribute('aria-expanded', 'true'); }   /* on a computer the results open beside the chart unless you closed them */
    window.addEventListener('scroll', function () { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
    /* iPhone: focusing a field in the set-up can scroll the body or html element itself (overflow:hidden still scrolls by focus), which
       pushes the top bar off the screen and leaves a gap at the bottom. Put it back whenever that happens or the keyboard goes away. */
    (function () { function home() { var d = document.documentElement, bd = document.body; if (d.scrollTop || bd.scrollTop || window.scrollY) { d.scrollTop = 0; bd.scrollTop = 0; window.scrollTo(0, 0); } }
      function idle() { var ae = document.activeElement; if (!ae || !/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) home(); }
      document.body.addEventListener('scroll', idle); document.documentElement.addEventListener('scroll', idle);
      document.addEventListener('focusout', function () { setTimeout(home, 60); setTimeout(home, 400); });
      if (window.visualViewport) { visualViewport.addEventListener('resize', function () { setTimeout(home, 60); }); }
      window.addEventListener('pageshow', home); document.addEventListener('visibilitychange', home); })();   /* the app fills the window; never let the page itself scroll and hide the top bar */
    dayMode = ['auto', 'light', 'dark'].indexOf(store('fs-theme')) >= 0 ? store('fs-theme') : 'dark'; setMode(store('fs-night') === '1' ? 'night' : dayMode);
    var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { readCss(); buildDepth(); draw(); });
    new MutationObserver(function () { readCss(); buildDepth(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.ResizeObserver) new ResizeObserver(resizeDraw).observe(document.querySelector('.chart')); else window.addEventListener('resize', resizeDraw);
    resize(); fit(); setTime((starts[0] - T0) / 3600); animate();
    document.addEventListener('visibilitychange', animate);
    document.addEventListener('visibilitychange', function () { if (document.hidden) sessSave(); }); window.addEventListener('pagehide', function () { sessSave(); });
  }
  function syncSym() { var a = document.getElementById('lWind'), b = document.getElementById('lTide'); if (a) a.value = $('windSym').value; if (b) b.value = $('tideSym').value; }
  function closeLayers() { $('layers').hidden = true; $('layersBtn').setAttribute('aria-expanded', 'false'); }
  function closePanel() { var p = $('panel'); if (wide()) p.hidden = true; else p.classList.add('collapsed'); $('panelBtn').setAttribute('aria-expanded', 'false'); setTimeout(resizeDraw, 0); }
  function wide() { return matchMedia('(min-width:900px), (orientation:landscape) and (max-height:500px)').matches; }   /* a phone on its side gets the computer layout: a short screen needs the chart beside the results */
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
      h += '<label class="chk"><input type="checkbox" data-m="' + l.id + '"' + (on ? '' : ' disabled') + ((first ? on && l.id !== 'mog' && l.id !== 'arpege' : prev.indexOf(l.id) >= 0 && on) ? ' checked' : '') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + l.name + ' <span class="pill">' + (on ? res(v) + ', ' + v.step_h + ' h' : 'not downloaded') + '</span></label>';
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
    var h = '<div class="pophead"><span>Chart layers</span><button class="close" id="layersX" aria-label="Close layers">\u00d7</button></div><div class="lquick"><button class="btn" id="lAll">Show all</button><button class="btn" id="lRoute">Just the route</button></div><label><input type="checkbox" data-l="wind"' + (S.show.wind ? ' checked' : '') + '><span class="sw" style="border-color:var(--wind)"></span>Wind</label><select id="lWind" aria-label="Wind symbol" style="margin-left:29px">' + $('windSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="tide"' + (S.show.tide ? ' checked' : '') + '><span class="sw" style="border-color:var(--tide)"></span>Tidal stream</label><select id="lTide" aria-label="Tide symbol" style="margin-left:29px">' + $('tideSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="ghosts"' + (S.show.ghosts ? ' checked' : '') + '><span class="sw" style="border-color:var(--ghost);border-top-style:dotted"></span>Fleet on your route</label>' +
      (ZONES.length ? '<label><input type="checkbox" data-l="tss"' + (S.show.tss ? ' checked' : '') + '><span class="sw" style="border-color:var(--warn)"></span>Traffic separation schemes</label>' : '') +
      (LIGHTS.length ? '<label><input type="checkbox" data-l="lights"' + (S.show.lights ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink);border-top-style:dotted"></span>Lighthouses and main buoys</label>' : '') +
      '<label><input type="checkbox" data-l="lay"' + (S.show.lay ? ' checked' : '') + '><span class="sw" style="border-color:var(--brand);border-top-style:dashed"></span>Laylines to the next mark</label>' +
      (metField() ? '<div class="lgrp">Weather from ECMWF, at the slider time</div>' + MET.map(function (m) { return '<label><input type="checkbox" data-l="' + m[0] + '"' + (S.show[m[0]] ? ' checked' : '') + '><span class="sw" style="border-color:' + m[3] + '"></span>' + m[1] + '</label>'; }).join('') : '') +
      '<label><input type="checkbox" data-l="iso"' + (S.show.iso ? ' checked' : '') + '><span class="sw" style="border-color:var(--muted)"></span>Isochrones of the chosen route (each hour)</label>' +
      '<label><input type="checkbox" data-l="band"' + (S.show.band ? ' checked' : '') + '><span class="sw" style="border-color:var(--muted);border-top-style:dashed"></span>Forecast band edge</label>' +
      (S.ov ? '<label><input type="checkbox" data-big="1"' + (S.big ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Big picture: north-west Europe</label>' : '') +
      (meta.live ? '' : '<label><input type="checkbox" data-l="real"' + (S.show.real ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Real 2026 boats (YB)</label>');
    S.routes.forEach(function (s, i) { var st = s.combined ? ['--route', []] : STYLE[s.id]; h += '<label><input type="checkbox" data-r="' + i + '"' + (s.hidden ? '' : ' checked') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-width:' + (s.combined ? 4 : 3) + 'px;border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + s.name + ' · ' + fmtH(s.r.finish - S.start.t) + '</label>'; });
    $('layers').innerHTML = h;
    var LK = ['wind', 'tide', 'ghosts', 'tss', 'lights', 'lay', 'band'];
    $('lAll').onclick = function () { LK.forEach(function (k) { S.show[k] = true; }); S.routes.forEach(function (r) { r.hidden = false; }); layersPop(); draw(); };
    $('lRoute').onclick = function () { LK.forEach(function (k) { S.show[k] = false; }); S.routes.forEach(function (r) { r.hidden = r !== S.sel; }); layersPop(); draw(); };
    [].forEach.call($('layers').querySelectorAll('input'), function (c) { c.onchange = function () { if (c.dataset.big) { toggleBig(); animate(); return; } if (c.dataset.l) { S.show[c.dataset.l] = c.checked; if (c.dataset.l === 'iso' && c.checked) isoFetch(); } else S.routes[+c.dataset.r].hidden = !c.checked; draw(); animate(); }; });
    syncSym();
    $('layersX').onclick = closeLayers;
    $('lWind').onchange = function () { $('windSym').value = $('lWind').value; $('windSym').onchange(); };
    $('lTide').onchange = function () { $('tideSym').value = $('lTide').value; $('tideSym').onchange(); };
  }

  function clockAbs(epoch) { var d = new Date(epoch * 1000); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function clockH(h) { return clockAbs(T0 + h * 3600); }
  function fmtH(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0'); }
  function short(id) { return { ecmwf: 'ECMWF', ukv: 'UKV', gfs: 'GFS', aifs: 'AIFS', mog: 'MO Global', icon: 'ICON-EU', arome: 'AROME', arpege: 'ARPEGE', om: 'Open-Meteo', chain: 'Finest first' }[id] || id; }
  /* Progress card. Nielsen Norman Group: waits of 2 to 10 seconds get a looped indicator, longer ones a percent-done bar with a step count
     and a rough time left (Katie Sherwin, "Progress Indicators Make a Slow System Less Insufferable", 2014). */
  var PG = { t0: 0, est: 0 };
  function raceKey() { return (meta && meta.course && (meta.course.raceId || meta.course.name)) || 'x'; }
  function prog(title, frac, detail, est) {
    if (!title) { $('prog').hidden = true; PG.title = ''; return; }
    if (title !== PG.title) { PG.title = title; PG.t0 = Date.now(); PG.est = est || 0; }
    $('prog').hidden = false; $('pgT').textContent = title; $('prog').classList.toggle('mini', /^Step 2/.test(title));   /* first routes are on screen: the refining card steps aside */
    $('prog').classList.toggle('ind', frac == null);
    $('pgBar').style.width = frac == null ? '' : Math.round(Math.max(0.03, Math.min(1, frac)) * 100) + '%';
    $('pgP').textContent = frac == null ? '' : Math.round(Math.min(1, frac) * 100) + '%';
    var left = '';
    if (PG.est) { var el = (Date.now() - PG.t0) / 1000, rem = PG.est - el; left = rem > 2 ? ' · about ' + Math.ceil(rem) + ' s left' : ' · nearly done'; }
    $('pgD').textContent = (detail || '') + left;
  }
  /* leeway: the bow points to windward of the track by the leeway angle; full close-hauled, none by a beam reach */
  /* the router's true wind angle is heading minus wind direction, so a negative angle has the wind on the starboard side: starboard tack */
  function steerOff(q) { var L = +($('leeway') || {}).value || 0; if (!L || q.twa == null) return 0; var a = Math.abs(q.twa), f = a <= 45 ? 1 : a >= 90 ? 0 : (90 - a) / 45; return f ? (q.twa < 0 ? 1 : -1) * L * f : 0; }
  /* weather beyond the wind (ECMWF): each one a layer you switch on, so the chart stays clear */
  var MET = [['mGust', 'Gusts', 'gust', '#E8A33D'], ['mMsl', 'Pressure (isobars)', 'msl', '#9AAEBB'], ['mRain', 'Rain', 'rain', '#4FA3E0'], ['mCape', 'Thunderstorm and squall risk', 'cape', '#C04BD8'], ['mCloud', 'Cloud', 'cloud', '#8C99A6'], ['mTemp', 'Air temperature', 'temp', '#E07A5F']];
  function metField() { var k = Object.keys(P.met || {}); return k.length ? P.met[k[0]] : null; }
  function metAt(k, la, lo, t) { var f = metField(); if (!f) return NaN; return f.sample(k, la, lo, t); }
  function drawMet() {
    var f = metField(); if (!f) return; var on = MET.filter(function (m) { return S.show[m[0]]; }); if (!on.length) return;
    var L = f.L, t = S.t, la0 = Math.max(L.lat0, LA(H)), la1 = Math.min(L.lat0 + L.dlat * (L.ny - 1), LA(0)), lo0 = Math.max(L.lon0, LO(0)), lo1 = Math.min(L.lon0 + L.dlon * (L.nx - 1), LO(W));
    var cw = Math.abs(X(L.lon0 + L.dlon) - X(L.lon0)), ch = Math.abs(Y(L.lat0 + L.dlat) - Y(L.lat0)), every = Math.max(1, Math.ceil(46 / Math.min(cw, ch)));
    ctx.save(); ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var cells = []; for (var y = 0; y < L.ny; y++) { var la = L.lat0 + y * L.dlat; if (la < la0 - L.dlat || la > la1 + L.dlat) continue; for (var x = 0; x < L.nx; x++) { var lo = L.lon0 + x * L.dlon; if (lo < lo0 - L.dlon || lo > lo1 + L.dlon) continue; cells.push([y, x, la, lo]); } }
    var fill = function (k, colour, alphaOf) { ctx.fillStyle = colour; cells.forEach(function (c) { var v = f.sample(k, c[2], c[3], t); var a = v === v ? alphaOf(v) : 0; if (a <= 0) return; ctx.globalAlpha = a; ctx.fillRect(X(c[3] - L.dlon / 2), Y(c[2] + L.dlat / 2), cw + 1, ch + 1); }); ctx.globalAlpha = 1; };
    var label = function (k, colour, txt) { ctx.fillStyle = colour; cells.forEach(function (c) { if (c[0] % every || c[1] % every) return; var v = f.sample(k, c[2], c[3], t); if (!(v === v)) return; var s2 = txt(v); if (s2) ctx.fillText(s2, X(c[3]), Y(c[2])); }); };
    if (S.show.mCloud) fill('cloud', '#8C99A6', function (v) { return v > 20 ? v / 100 * 0.32 : 0; });
    if (S.show.mRain) fill('rain', '#2F7FD0', function (v) { return v >= 0.1 ? Math.min(0.55, 0.12 + v / 6) : 0; });
    if (S.show.mCape) fill('cape', '#C04BD8', function (v) { return v >= 300 ? Math.min(0.5, 0.12 + (v - 300) / 2500) : 0; });
    if (S.show.mGust) { fill('gust', '#E8A33D', function (v) { var kn = v / KN; return kn >= 25 ? Math.min(0.5, 0.12 + (kn - 25) / 40) : 0; }); label('gust', css['--ink'] || '#fff', function (v) { return 'G' + Math.round(v / KN); }); }
    if (S.show.mTemp) label('temp', '#E07A5F', function (v) { return Math.round(v) + '°'; });
    if (S.show.mMsl) {   /* isobars every 2 hPa, by marching squares over the forecast grid */
      ctx.strokeStyle = css['--muted'] || '#9AAEBB'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.85; var g = {};
      var val = function (y, x) { var k2 = y + ',' + x; if (!(k2 in g)) g[k2] = f.sample('msl', L.lat0 + y * L.dlat, L.lon0 + x * L.dlon, t); return g[k2]; };
      var mn = 1e9, mx = -1e9; cells.forEach(function (c) { var v = val(c[0], c[1]); if (v === v) { mn = Math.min(mn, v); mx = Math.max(mx, v); } });
      for (var lev = Math.ceil(mn / 2) * 2; lev <= mx; lev += 2) {
        ctx.beginPath(); var lab = null;
        cells.forEach(function (c) { var y = c[0], x = c[1]; if (y >= L.ny - 1 || x >= L.nx - 1) return;
          var v = [val(y, x), val(y, x + 1), val(y + 1, x + 1), val(y + 1, x)]; if (v.some(function (q) { return !(q === q); })) return;
          var P4 = [[y, x], [y, x + 1], [y + 1, x + 1], [y + 1, x]], pts = [];
          for (var e = 0; e < 4; e++) { var a = v[e], b = v[(e + 1) % 4]; if ((a < lev) !== (b < lev)) { var fr = (lev - a) / (b - a), pa = P4[e], pb = P4[(e + 1) % 4]; pts.push([L.lat0 + (pa[0] + (pb[0] - pa[0]) * fr) * L.dlat, L.lon0 + (pa[1] + (pb[1] - pa[1]) * fr) * L.dlon]); } }
          for (var q = 0; q + 1 < pts.length; q += 2) { ctx.moveTo(X(pts[q][1]), Y(pts[q][0])); ctx.lineTo(X(pts[q + 1][1]), Y(pts[q + 1][0])); if (!lab) lab = pts[q]; } });
        ctx.stroke(); if (lab) { ctx.fillStyle = css['--muted'] || '#9AAEBB'; ctx.fillText(String(lev), X(lab[1]), Y(lab[0]) - 7); }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  /* isochrones: the router's front each hour for the chosen route, worked out when the layer is switched on */
  function isoFetch() {
    var s = S.sel; if (!s || s.iso || S.isoBusy || !meta) { draw(); return; }
    S.isoBusy = true; busy('Working out the isochrones…');
    var L = S.lastReq || { base: opts(s.models), start: startPt(), legs: legsFor(S.from) };
    pool({ type: 'route', o: Object.assign({}, L.base, { models: s.models, start: L.start, legs: L.legs, iso: true }) }).then(function (r) { S.isoBusy = false; busy(''); s.iso = r.iso || []; draw(); }, function (e) { S.isoBusy = false; busy('Isochrones: ' + e.message); });
  }
  function drawIso() {
    var s = S.sel; if (!S.show.iso || !s) return; if (!s.iso) { isoFetch(); return; }
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = css['--muted'] || '#8899aa'; ctx.font = '500 10px var(--f-data), monospace'; ctx.fillStyle = ctx.strokeStyle;
    var near = null, bd = 1e9; s.iso.forEach(function (f) { var d = Math.abs(f.t - S.t); if (d < bd) { bd = d; near = f; } });
    s.iso.forEach(function (f) {
      var now = f === near && bd < 0.6; ctx.globalAlpha = now ? 0.95 : 0.35; ctx.lineWidth = now ? 2 : 1;
      ctx.beginPath(); for (var i = 0; i < f.p.length; i++) { var x = X(f.p[i][1]), y = Y(f.p[i][0]), gap = i && FSRouter.dist(f.p[i - 1][0], f.p[i - 1][1], f.p[i][0], f.p[i][1]) > 8; if (i && !gap) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();   /* a gap of more than 8 nm is where the front broke on land: no line across it */
      if (Math.round(f.t - S.start.t) % 6 === 0 || now) { var q = f.p[Math.floor(f.p.length / 2)]; ctx.globalAlpha = now ? 1 : 0.6; ctx.fillText('+' + Math.round(f.t - S.start.t) + 'h', X(q[1]) + 3, Y(q[0]) - 3); }
    });
    ctx.restore();
  }
  function busy(t) { $('busy').hidden = !t; $('busy').textContent = t; $('busy').classList.toggle('spin', /…$/.test(t || '')); }

  /* ---------- routing ---------- */
  function opts(models) {
    var spec = boatSpec(), b = FSBoat.resolve(spec), pol = b.pol;
    return { models: models, tide: $('tideSel').value || null, wave: $('waveSel').value || null, tcc: +$('tcc').value || 1, polar: pol, polKey: JSON.stringify([spec.src, spec.type, spec.tcc, spec.src === 'polar' ? spec.text.length + ':' + spec.text.slice(-40) : '', spec.tune]),
      sea: { up: +$('seaUp').value, reach: +$('seaReach').value, surf: +$('seaSurf').value, from: 0.5, surfFrom: 1.5 }, safety: +$('depth').value, nogo: nogoRings(), maxHours: HMAX() + 2, tackS: +$('tackS').value, gybeS: +$('gybeS').value, adj: adjVals(), tideWind: $('tideWind') ? $('tideWind').checked : true };
  }
  /* legs from the course: a gate at each mark on its rounding side, then the finish. Fine time steps near the start. */
  var ADJ = [['adjWdir', 'wdir', '°', 1], ['adjWspd', 'wspd', '%', 1], ['adjWtime', 'wtime', ' h', 1], ['adjTspd', 'tspd', '%', 1], ['adjTtime', 'ttime', ' min', 60]];
  function adjBox() { var v = ($('adjBox') || {}).value; if (!v || $('adjWhere').value !== 'box') return null; var q = v.split(',').map(Number); return q.length === 4 && q.every(function (x) { return x === x; }) ? { s: q[0], n: q[1], w: q[2], e: q[3] } : null; }
  function adjVals() { var a = null; ADJ.forEach(function (x) { var el = $(x[0]), v = el ? +el.value / x[3] : 0; if (v) { a = a || {}; a[x[1]] = v; } }); if (a && $('adjWhere').value === 'box') { a.box = adjBox(); if (!a.box) a = null; } return a; }
  function adjInit() {
    ADJ.forEach(function (x) { var el = $(x[0]); if (!el) return; var out = $(x[0] + 'V'), f = function () { var v = +el.value; out.textContent = (v > 0 ? '+' : '') + v + x[2] + (x[1] === 'wdir' && v ? (v > 0 ? ' veer' : ' back') : x[1] === 'wtime' && v ? (v > 0 ? ' later' : ' earlier') : x[1] === 'ttime' && v ? (v > 0 ? ' later' : ' earlier') : ''); $('adjNote').hidden = !adjVals(); if ($('adjPill')) adjPill(); }; el.oninput = f; f(); });
    $('adjReset').onclick = function () { ADJ.forEach(function (x) { var el = $(x[0]); el.value = 0; el.oninput(); }); adjPill(); };
    $('adjPillX').onclick = function () { $('adjReset').onclick(); busy('Back to the forecast: routing again…'); S.from = null; run(); };
    var boxTxt = function () { var b = adjBox(), on = $('adjWhere').value === 'box'; $('adjBoxRow').hidden = $('adjBoxNote').hidden = !on; $('adjBoxTxt').textContent = b ? dm(b.s, 'NS') + ' to ' + dm(b.n, 'NS') + ', ' + dm(b.w, 'EW') + ' to ' + dm(b.e, 'EW') : 'No area yet: changes are not used until you draw one.'; adjPill(); draw(); };
    $('adjWhere').onchange = boxTxt; $('adjBox').addEventListener('change', boxTxt);
    $('adjDraw').onclick = function () { S.adjDraw = []; $('sheet').hidden = true; busy('Tap one corner of the area on the chart'); };
    S.adjBoxTxt = boxTxt; boxTxt();
    adjPill();
  }
  /* a note on the chart whenever the forecast has been changed, with one tap back to the forecast as published */
  function adjPill() {
    var a = adjVals(), t = [];
    if (a) ADJ.forEach(function (x) { var v = +$(x[0]).value; if (v) t.push(({ wdir: 'wind ', wspd: 'wind ', wtime: 'wind ', tspd: 'tide ', ttime: 'tide ' })[x[1]] + $(x[0] + 'V').textContent); });
    $('adjPill').hidden = !a; $('adjPillTxt').textContent = 'Forecast changed' + (a && a.box ? ' in your area' : '') + ': ' + t.join(', ');
  }
  function HMAX() { var w = (meta.course0 || meta.course).window; return w ? w[1] : 48; }
  function legsFor(fromPt) {
    if (S.to) return [{ name: 'Your point', point: [S.to.lat, S.to.lon], r: 0.3, at: [S.to.lat, S.to.lon] }];
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
    setShort(r.name.replace(/^Rolex\s+/, '').replace(/\s+(Trophy\s+)?Race$/, '').replace(/\s+Trophy$/, ''));
    var w = warnText(r); $('courseWarn').hidden = !w; $('courseWarn').textContent = w + (r.setNote ? ' ' + r.setNote : '');
    /* the standard warning on every RORC course, plus the course-not-confirmed line where it applies; hidden with x until the next visit */
    var std = '<b>Check against the sailing instructions.</b> Before the start, check this course against the sailing instructions and any amendments. For some races the course is only published the day before, and it can be changed at any time up to the start.';
    $('cbannerTxt').innerHTML = r.custom ? '' : std + (w ? '<br><b>Course not confirmed.</b> ' + w : '');
    $('cbanner').hidden = !!r.custom || (S.bannerHidden || {})[r.id];
    $('markSides').innerHTML = r.marks.length ? r.marks.map(function (m, i) { return '<div class="row"><label for="side' + i + '">' + m.name + '</label><select id="side' + i + '" data-mk="' + i + '"><option value="port">to port</option><option value="starboard">to starboard</option></select>' + (m.sideAssumed ? '<span class="note">assumed</span>' : '') + '</div>'; }).join('') : '<p class="note">No marks between start and finish in this course.</p>';
    r.marks.forEach(function (m, i) { $('side' + i).value = m.side || 'port'; $('side' + i).onchange = function () { meta.course.marks[i].side = this.value; meta.course.marks[i].sideAssumed = false; S.legs = null; draw(); }; });
    var issue = courseIssue(meta.course);
    $('courseNote').innerHTML = (r.custom ? 'Your own course' + (r.nm ? ', about ' + r.nm + ' nm' : '') + '. ' : (r.nm ? 'About ' + r.nm + ' nm. ' : '') + (r.date2027 ? 'Start ' + new Date(r.date2027 + 'T12:00Z').toUTCString().slice(0, 16) + ' (' + r.dateSource + '). ' : (r.dateSource || '') + '. ') + '<a href="' + r.source + '" target="_blank" rel="noopener">Source</a>') + (issue ? '<br><b style="color:var(--warn)">' + issue + '</b>' : '');
    try { history.replaceState(null, '', location.pathname + (!r.custom && r.id !== HERE && r.page ? '?race=' + encodeURIComponent(r.id) : '')); } catch (e) {}   /* the address always matches what is on screen, so a reload reopens it */
    if (!r.custom) store('fs-race', r.id); lastSet(r.custom ? { my: S.myId || r.id } : { race: r.id }); S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; if (W) fit(); draw();
  }
  function loadRaces() {
    var d = meta.layers && meta.layers.filter(function (L) { return L.kind === 'depth'; })[0], f = d && (d.full || d);
    if (f && f.lat0 != null) { var la1 = f.lat0 + f.dlat * (f.ny - 1), lo1 = f.lon0 + f.dlon * (f.nx - 1); dataBox = { s: Math.min(f.lat0, la1), n: Math.max(f.lat0, la1), w: Math.min(f.lon0, lo1), e: Math.max(f.lon0, lo1) }; }
    $('cbanner').addEventListener('click', function (e) { if (e.target.id !== 'cbannerX') this.classList.toggle('open'); });
    $('cbannerX').onclick = function () { $('cbanner').hidden = true; var r = meta.course.race; if (r) { S.bannerHidden = S.bannerHidden || {}; S.bannerHidden[r.id] = true; } };
    fetch('../courses/rorc.json', { cache: 'no-store' }).then(function (x) { return x.json(); }).then(function (j) {
      RACES = j.races; REGIONS = j.regions || []; $('raceSel').innerHTML = RACES.map(function (r) { return '<option value="' + r.id + '">' + r.name + (r.date2027 ? ' · ' + r.date2027.slice(8) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+r.date2027.slice(5, 7) - 1] : '') + (courseIssue(r) ? ' (wider area needed)' : '') + '</option>'; }).join('');
      var pageOf = function (id) { var r = RACES.filter(function (x) { return x.id === id; })[0]; return r ? (r.page || r.id) : HERE; };
      var hop = function (id) { var pg = pageOf(id); if (pg === HERE) return false; location.replace('../' + pg + '/' + (pg !== id ? '?race=' + encodeURIComponent(id) : '')); return true; };   /* a race only routes on the page that holds its forecasts */
      $('raceSel').onchange = function () { if (!hop($('raceSel').value)) applyRace($('raceSel').value); };
      var home = meta.course0 ? meta.course0.raceId : meta.course.raceId; home = home || 'cervantes'; var want = home === 'cervantes' ? (store('fs-race') || home) : home; if (!RACES.some(function (r) { return r.id === want; })) want = home;
      var qr = QS0.get('race'); if (qr && RACES.some(function (r) { return r.id === qr && (r.page || r.id) === HERE; })) want = qr;
      if (want !== home && hop(want)) return;
      var lastBoot = LAST0; $('raceSel').value = want; applyRace(want);
      if (!RACES.some(function (r) { return r.id === want; })) { var c0 = meta.course; $('raceTitle').textContent = c0.name + ' · ' + c0.start.name.replace(/^Start,\s*/, '') + ' to ' + c0.finish.name.replace(/^Finish,\s*/, ''); setShort(c0.name.replace(/^English /, '').replace(/^Southern /, '')); }
      var qs = QS0, my = qs.get('my'), last = lastBoot;
      if (!my && !qr && !qs.get('course') && !S.pendingCourse && last) {
        if (last.my && myRaces().some(function (x) { return x.id === last.my && (!x.page || x.page === HERE); })) my = last.my;
        else if (last.race && last.race !== want && RACES.some(function (r) { return r.id === last.race && (r.page || r.id) === HERE; })) { $('raceSel').value = last.race; applyRace(last.race); }
        if (last.start) S.pendingStart = last.start;
        S.startChosen = false;   /* asked every time a race is opened (Stuart 12 Nov); the last start is offered first */
        var rg = startRange(); if (last.start && rg && +last.start >= rg[0] && +last.start <= rg[1] && ![].some.call($('startSel').options, function (o) { return o.value === last.start; })) setStart(+last.start);
      }
      if (my) setTimeout(function () { openMy(my, true); if (last && last.start && [].some.call($('startSel').options, function (o) { return o.value === last.start; })) { $('startSel').value = last.start; } }, 0);
      if (qs.get('new')) { setTimeout(function () { startEdit(null); }, 400); } else wizBoot(qs);
      if (S.pendingCourse) { applyCourseObj(asRace(S.pendingCourse)); S.pendingCourse = null; }
      if (S.pendingStart && [].some.call($('startSel').options, function (o) { return o.value === S.pendingStart; })) $('startSel').value = S.pendingStart; S.pendingStart = null;
      var ss = !qr && !qs.get('course') && !qs.get('new') && sessGet(); if (ss) { S.resume = ss; S.startChosen = true; if ([].some.call($('startSel').options, function (o) { return o.value === ss.startVal; })) $('startSel').value = ss.startVal; chipStart(); }   /* carrying on: no questions, straight back in */
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
    var fl = (meta.fleet || []).filter(function (x) { return x.tcc; }).slice(0, 8).map(function (x) { return x.name.toUpperCase(); });
    var names = fl.length >= 4 ? fl : ['JOLLY JACK', 'TIGER', 'DIABLE', 'SEA BISCUIT', 'NOIR', 'HAMPSHIRE ROSE', 'ARCHER', 'BLUE MOON'], f = [];
    names.forEach(function (n, i) { f.push({ mmsi: 235100100 + i, cls: 'B', name: n, shiptype: 36, len: 10 + (i % 4) * 2, callsign: 'M' + (7100 + i), kind: 'race', pace: 0.94 + ((i * 37) % 13) / 100, side: ((i % 2) ? 1 : -1) * (0.3 + (i % 3) * 0.6) }); });
    var c = meta.course, la0 = Math.min(c.start.lat, c.finish.lat), la1 = Math.max(c.start.lat, c.finish.lat), lo0 = Math.min(c.start.lon, c.finish.lon), lo1 = Math.max(c.start.lon, c.finish.lon);
    c.marks.forEach(function (m) { la0 = Math.min(la0, m.lat); la1 = Math.max(la1, m.lat); lo0 = Math.min(lo0, m.lon); lo1 = Math.max(lo1, m.lon); });
    var ships = [['ATLANTIC STAR', 71, 300, 252, 17], ['NORDIC SPIRIT', 80, 180, 72, 13], ['EVER BRIGHT', 70, 330, 250, 19], ['CELTIC FERRY', 60, 170, 160, 21], ['MARE DORICUM', 81, 240, 70, 12], ['PILOT ONE', 50, 20, 10, 9]];
    ships.forEach(function (x, i) { f.push({ mmsi: 636000100 + i, cls: 'A', name: x[0], shiptype: x[1], len: x[2], callsign: 'D5' + i, dest: i % 2 ? 'ROTTERDAM' : 'SOUTHAMPTON', kind: 'ship', cog: x[3], sog: x[4],
      lat0: la0 + (la1 - la0) * ((i + 1) / 7), lon0: lo0 + (lo1 - lo0) * ((i * 3 + 1) % 7) / 7 }); });
    return AIS.fleet = f;
  }
  function aisEmulate() {   // positions at the replay time, encoded as !AIVDM and decoded back through the engine
    var f = aisFleet(); if (!f) return;
    if (AIS.lastT != null && Math.abs(S.t - AIS.lastT) > 0.25) Object.keys(AIS.tg.t).forEach(function (m) { AIS.tg.t[m].track = []; }); AIS.lastT = S.t;
    var lines = [], now = aisNowMs(), p = S.sel.r.path, ts = tsOf(p), t0 = S.start.t, k = Math.cos(50 * R);
    f.forEach(function (b, i) {
      var x = Object.assign({}, b);
      if (b.kind === 'race') {
        var tt = t0 + (S.t - t0) * b.pace, a = posAt(ts, p, tt); if (!a) return; var j = Math.min(p.length - 2, a.i || 0), h = hdgAt(p, a.k), q = p[j + 1];
        x.lat = a.la + Math.sin((h - 90) * R) * 0 + Math.cos((h + 90) * R) * b.side / 60; x.lon = a.lo + Math.sin((h + 90) * R) * b.side / 60 / k; x.sog = (q.bsp || 6) * b.pace; x.cog = h; x.hdg = h;
      } else {
        var d = ((S.t - t0) * b.sog) % 120 - 60; x.lat = b.lat0 + Math.cos(b.cog * R) * d / 60; x.lon = b.lon0 + Math.sin(b.cog * R) * d / 60 / k; x.hdg = b.cog;
        if (coastLand(x.lat, x.lon)) { if (AIS.tg.t[b.mmsi]) delete AIS.tg.t[b.mmsi]; return; }   /* a pretend ship never sails across land */
      }
      lines = lines.concat(FSAIS.encodePosition(x));
      if (!AIS.tg.t[b.mmsi] || !AIS.tg.t[b.mmsi].name) lines = lines.concat(FSAIS.encodeStatic(x, i));
    });
    lines.forEach(function (l) { AIS.tg.add(FSAIS.decodeLine(l), now); });
    AIS.lines = (AIS.lines || 0) + lines.length;
  }
  var AIS_SHOW = [['all', 'All targets'], ['ships', 'All vessels (no marks)'], ['moving', 'Moving vessels only'], ['race', 'Race boats'], ['sail', 'Sailing and pleasure'], ['commercial', 'Cargo ships and tankers'], ['passenger', 'Passenger and ferries'], ['fishing', 'Fishing'], ['service', 'Tugs, pilots and service'], ['official', 'Military, police and rescue'], ['hsc', 'High-speed craft'], ['aton', 'Navigation marks'], ['sart', 'Emergency beacons'], ['unknown', 'Type not yet known']];
  function aisShown(x, v) {
    if (v === 'all') return true; if (v === 'ships') return x.cat !== 'aton'; if (v === 'moving') return x.cat !== 'aton' && x.sog > 0.5;
    if (v === 'commercial') return x.cat === 'cargo' || x.cat === 'tanker'; return x.cat === v;
  }
  function aisShowOpts(cnt, total) {
    var el = $('aisShow'); if (!el) return; var v = el.dataset.h ? el.value : (store('fs-aisShow') || 'all');
    var n = function (k) { return k === 'all' ? total : k === 'commercial' ? (cnt.cargo || 0) + (cnt.tanker || 0) : k === 'ships' || k === 'moving' ? null : cnt[k] || 0; };
    var h = AIS_SHOW.map(function (o) { var c = n(o[0]); return '<option value="' + o[0] + '">' + o[1] + (c != null ? ' (' + c + ')' : '') + '</option>'; }).join('');
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; el.value = v; }
  }
  function aisUpdate() {
    if (AIS.src === 'off') { $('aisBox').hidden = true; return; }
    if (AIS.src === 'test') aisEmulate();
    var own = ownForCpa(), lim = +$('cpaNm').value || 0.5, tl = +$('tcpaMin').value || 15, now = aisNowMs(), list = AIS.tg.list(10 * 60000, now), danger = {};
    list.forEach(function (x) { x.c = own ? FSAIS.cpa(own, x) : null; x.danger = !!(x.c && x.c.cpa < lim && x.c.tcpa > 0 && x.c.tcpa < tl); if (x.danger) danger[x.mmsi] = 1; });
    var fresh = Object.keys(danger).filter(function (m) { return !AIS.warned[m]; });
    if (fresh.length && $('cpaSound').checked && (!AIS.lastBeep || Date.now() - AIS.lastBeep > 4000)) { beep(); AIS.lastBeep = Date.now(); }
    AIS.warned = danger; AIS.all = list; AIS.own = own;
    list.sort(function (a, b) { return (b.danger - a.danger) || ((a.c ? a.c.range : 99) - (b.c ? b.c.range : 99)); });
    var myT = +$('tcc').value || 1, rest = S.sel ? Math.max(0, S.sel.r.finish - S.t) : 0, ent = {}, byM = {}; (meta.fleet || []).forEach(function (e) { if (e.tcc) ent[e.name.toUpperCase()] = e; }); myFleet().forEach(function (e) { ent[e.name.toUpperCase()] = e; if (e.mmsi) byM[e.mmsi] = e; });
    list.forEach(function (x) { x.race = !!(byM[x.mmsi] || (x.name && ent[x.name.toUpperCase()])); x.cat = x.race ? 'race' : FSAIS.shipCat(x); });
    var cnt = {}; list.forEach(function (x) { cnt[x.cat] = (cnt[x.cat] || 0) + 1; }); aisShowOpts(cnt, list.length);
    var show = $('aisShow') ? $('aisShow').value : 'all', shown = list.filter(function (x) { return x.danger || aisShown(x, show); });   /* a close-quarters target always shows, whatever is chosen */
    AIS.list = shown;
    var dz = list.filter(function (x) { return x.danger; })[0];
    $('cpaWarn').hidden = !dz; if (dz) $('cpaWarn').textContent = 'Close quarters: ' + (dz.name || dz.mmsi) + ' passes ' + dz.c.cpa.toFixed(2) + ' nm away in ' + Math.round(dz.c.tcpa) + ' min';
    var og = function (x) { var e = byM[x.mmsi] || (x.name && ent[x.name.toUpperCase()]); if (!e) return ''; var perH = (e.tcc / myT - 1) * 60, tot = perH * (S.sel ? S.sel.r.finish - S.start.t : 0); return '<span class="note">TCC ' + e.tcc.toFixed(3) + ', ' + (perH >= 0 ? 'owes you ' : 'you owe ') + Math.abs(perH).toFixed(1) + ' min/h' + (tot ? ' (' + Math.round(Math.abs(tot)) + ' min race)' : '') + '</span>'; };
    var h = '<tr><th>Target</th><th>Range</th><th>Brg</th><th>CPA</th><th>TCPA</th><th>SOG</th></tr>' + shown.slice(0, 40).map(function (x) {
      var c = x.c; return '<tr data-mmsi="' + x.mmsi + '" class="' + (x.danger ? 'danger' : '') + '"><td style="font-family:var(--f-body)">' + (x.name || x.mmsi) + ' <span class="note">' + (FSAIS.CATS[x.cat] || '') + (x.at && now - x.at > 150000 ? ', seen ' + Math.round((now - x.at) / 60000) + ' min ago' : '') + '</span>' + (x.race ? '' : '<button class="aisrb" data-rb="' + x.mmsi + '">Race boat</button>') + (og(x) ? '<br>' + og(x) : '') + '<span class="aistcc" id="rb' + x.mmsi + '" hidden><input type="number" inputmode="decimal" step="0.001" placeholder="TCC" aria-label="TCC"><button class="aisrb" data-rbok="' + x.mmsi + '">Add</button></span>' + '</td><td>' + (c ? c.range.toFixed(1) : '-') + '</td><td>' + (c ? pad(c.brg) + '°' : '-') + '</td><td>' + (c ? c.cpa.toFixed(2) : '-') + '</td><td>' + (c && c.tcpa > 0 ? Math.round(c.tcpa) + ' min' : '-') + '</td><td>' + (x.sog != null ? x.sog.toFixed(1) : '-') + '</td></tr>'; }).join('');
    var ae = document.activeElement; if (AIS.open && Date.now() - AIS.open.at < 90000 && ae && $('aisTable').contains(ae)) return;   /* someone is typing a TCC: do not redraw the table under them */
    if (AIS.tableAt && Date.now() - AIS.tableAt < 2000 && !AIS.forceTable) return; AIS.tableAt = Date.now(); AIS.forceTable = false;   /* the table redraws at most every 2 s, so a tap on a button lands (it was redrawn on every frame of the replay) */
    $('aisTable').innerHTML = h; $('aisBox').hidden = false;
    if (AIS.open && Date.now() - AIS.open.at < 90000) { var ob = $('rb' + AIS.open.m), obt = $('aisTable').querySelector('[data-rb="' + AIS.open.m + '"]'); if (ob) { ob.hidden = false; if (obt) obt.hidden = true; var oi = ob.querySelector('input'); oi.value = AIS.open.v || ''; oi.oninput = function () { AIS.open.v = this.value; }; } }
    $('aisNote').textContent = (shown.length < list.length ? shown.length + ' of ' : '') + list.length + ' targets · ' + (AIS.src === 'test' ? 'test fleet, ' + (AIS.lines || 0) + ' sentences decoded' : AIS.err ? AIS.err : 'live from the shore network (free volunteer stations, patchy), updated every 30 s, kept 20 min') + (own ? ' · CPA from ' + (own.src === 'GPS' ? 'your GPS' : 'the route boat') : ' · route first for CPA');
    [].forEach.call($('aisTable').querySelectorAll('[data-rb]'), function (b) { b.onclick = function (e) { e.stopPropagation(); var box = $('rb' + b.dataset.rb); box.hidden = false; b.hidden = true; var x = AIS.tg.t[b.dataset.rb], k = x && x.name && (meta.fleet || []).filter(function (f) { return f.name.toUpperCase() === x.name.toUpperCase(); })[0]; if (k) box.querySelector('input').value = k.tcc; var inp = box.querySelector('input'); AIS.open = { m: b.dataset.rb, v: inp.value, at: Date.now() }; inp.oninput = function () { AIS.open.v = this.value; AIS.open.at = Date.now(); }; inp.focus(); AIS.hold = Date.now(); }; });
    [].forEach.call($('aisTable').querySelectorAll('[data-rbok]'), function (b) { b.onclick = function (e) { e.stopPropagation(); var x = AIS.tg.t[b.dataset.rbok], v = b.previousSibling.value; AIS.open = null; AIS.forceTable = true; if (!mfAdd(x ? x.name || String(x.mmsi) : b.dataset.rbok, v, +b.dataset.rbok)) { busy('Enter the TCC, for example 1.021.'); setTimeout(function () { busy(''); }, 2000); } }; });
    [].forEach.call($('aisTable').querySelectorAll('.aistcc input'), function (i) { i.onclick = function (e) { e.stopPropagation(); }; });
    [].forEach.call($('aisTable').querySelectorAll('tr[data-mmsi]'), function (tr) { tr.onclick = function () { var x = AIS.tg.t[tr.dataset.mmsi]; if (x) { view.la = x.lat; view.lo = x.lon; draw(); } }; });
  }
  function aisDraw() {
    if (AIS.src === 'off' || !AIS.list) return; var flash = Math.floor(Date.now() / 400) % 2;
    ctx.save(); ctx.font = '600 10px Inter, sans-serif';
    if (AIS.src === 'test') { ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = css['--m3']; ctx.textAlign = 'right'; ctx.fillText('AIS: TEST FLEET, PRETEND BOATS', W - 12, H - 40); ctx.textAlign = 'left'; ctx.font = '600 10px Inter, sans-serif'; }
    AIS.list.forEach(function (x) {
      var px = X(x.lon), py = Y(x.lat); if (px < -20 || py < -20 || px > W + 20 || py > H + 20) return;
      var kind = FSAIS.shipKind(x), col = x.danger ? (flash ? '#ff3b30' : css['--ink']) : x.race ? css['--brand'] : kind === 'yacht' ? css['--ghost'] : css['--m3'];
      if (x.cat === 'aton' || x.cat === 'sart') { var dc = x.cat === 'sart' ? '#ff3b30' : col; ctx.strokeStyle = dc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 5, py); ctx.closePath(); ctx.stroke(); if (view.s > 600 || x.cat === 'sart') { ctx.fillStyle = dc; ctx.fillText(x.name || String(x.mmsi), px + 8, py - 6); } return; }
      var h = x.hdg != null ? x.hdg : (x.cog || 0), sz = kind === 'yacht' ? 6 : 8;
      if (x.track.length > 1) { ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); var pq = null; x.track.concat([[x.lat, x.lon]]).forEach(function (q) { var jump = !pq || Math.abs(q[0] - pq[0]) > 0.05 || Math.abs(q[1] - pq[1]) > 0.08; if (jump) ctx.moveTo(X(q[1]), Y(q[0])); else ctx.lineTo(X(q[1]), Y(q[0])); pq = q; }); ctx.stroke(); ctx.globalAlpha = 1; }   /* a gap over about 3 nm (slider moved, or a test ship wrapping round) is not drawn as a track */
      if (x.sog > 0.5 && x.cog != null) { var d = x.sog / 10; ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X(x.lon + Math.sin(x.cog * R) * d / 60 / Math.cos(x.lat * R)), Y(x.lat + Math.cos(x.cog * R) * d / 60)); ctx.stroke(); ctx.setLineDash([]); }
      if (x.danger) { ctx.beginPath(); ctx.arc(px, py, 14, 0, 7); ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2; ctx.stroke(); }
      triMark(px, py, h, sz, kind === 'yacht' && !x.race ? null : col, col, x.race ? 2.2 : 1.6);
      if (view.s > 600 || x.danger || x.race) { ctx.fillStyle = col; ctx.fillText(x.name || String(x.mmsi), px + 9, py - 7); }
    });
    ctx.restore();
  }
  /* live AIS from the shore network through FirstShift's relay (/api/ais), every 30 seconds while online */
  function aisLive() {
    if (AIS.src !== 'live' || AIS.busy || Date.now() - (AIS.liveAt || 0) < 30000 || !navigator.onLine) return;
    var la0 = Math.max(35.5, LA(H)), la1 = Math.min(61.5, LA(70)), lo0 = Math.max(-15, LO(0)), lo1 = Math.min(12, LO(W)), cl = (la0 + la1) / 2, co = (lo0 + lo1) / 2;
    la0 = Math.max(la0, cl - 3); la1 = Math.min(la1, cl + 3); lo0 = Math.max(lo0, co - 5); lo1 = Math.min(lo1, co + 5);
    la0 = Math.floor(la0 * 2) / 2; la1 = Math.ceil(la1 * 2) / 2; lo0 = Math.floor(lo0 * 2) / 2; lo1 = Math.ceil(lo1 * 2) / 2;   /* a steady grid, so the server's memory of an area builds up */
    if (la1 - la0 > 6) la1 = la0 + 6; if (lo1 - lo0 > 10) lo1 = lo0 + 10;
    AIS.busy = true; AIS.liveAt = Date.now();
    fetch('/api/ais?s=' + la0.toFixed(1) + '&n=' + la1.toFixed(1) + '&w=' + lo0.toFixed(1) + '&e=' + lo1.toFixed(1)).then(function (r) { return r.json(); }).then(function (j) {
      AIS.busy = false; if (j.error) { AIS.err = j.error; aisUpdate(); return; } AIS.err = '';
      j.targets.forEach(function (x) { AIS.tg.add(x, Date.now() - (x.age || 0) * 1000); }); AIS.lines = (AIS.lines || 0) + j.targets.length; aisUpdate(); draw();
    }).catch(function () { AIS.busy = false; AIS.err = 'Live AIS server not reachable.'; aisUpdate(); });
  }
  function aisInit() {
    var saved = store('fs-aisSrc'); if (saved && saved !== 'test') $('aisSrc').value = saved;   /* the pretend test fleet is never brought back on its own */
    $('aisSrc').onchange = function () { AIS.src = this.value; store('fs-aisSrc', this.value); AIS.tg = new FSAIS.Targets(); AIS.fleet = null; AIS.lines = 0; AIS.liveAt = 0; AIS.forceTable = true; aisUpdate(); draw(); };
    AIS.src = $('aisSrc').value;
    if ($('aisShow')) $('aisShow').onchange = function () { store('fs-aisShow', this.value); AIS.forceTable = true; aisUpdate(); draw(); };
    setInterval(aisLive, 5000);
    setInterval(function () { if (AIS.src !== 'off') { aisUpdate(); if (Object.keys(AIS.warned).length) draw(); } }, 1000);
  }
  /* replay speed: the button beside Play steps through the speeds in Settings, Display */
  function spdLabel() { var v = +$('speed').value; $('spdBtn').innerHTML = '<span class="spl">speed</span>' + (v < 1 ? Math.round(v * 60) + 'm/s' : v + 'h/s'); $('spdBtn').title = 'Replay speed: ' + $('speed').options[$('speed').selectedIndex].textContent + '. Tap to change.'; }
  function spdInit() { var o = [].map.call($('speed').options, function (x) { return x.value; }); $('spdBtn').onclick = function (e) {
      e.stopPropagation(); var m = $('spdMenu');
      if (!m.hidden) { m.hidden = true; return; }
      m.innerHTML = '<div class="note" style="padding:4px 8px">Replay speed: race time per second</div>' + [].map.call($('speed').options, function (x) { return '<button data-v="' + x.value + '"' + (x.value === $('speed').value ? ' aria-checked="true"' : '') + '>' + x.textContent + '</button>'; }).join('');
      var r = $('spdBtn').getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - 200, r.left)) + 'px'; m.style.top = ''; m.style.bottom = (innerHeight - r.top + 6) + 'px'; m.hidden = false;
      [].forEach.call(m.querySelectorAll('button'), function (b) { b.onclick = function () { $('speed').value = b.dataset.v; $('speed').dispatchEvent(new Event('change', { bubbles: true })); m.hidden = true; }; });
    };
    document.addEventListener('click', function (e) { if (!$('spdMenu').hidden && !$('spdMenu').contains(e.target)) $('spdMenu').hidden = true; }); $('speed').addEventListener('change', spdLabel); spdLabel(); $('followBtn').onclick = function () { followSet(!follow); }; followSet(follow); }
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
      var p = s.r.path, cr = sailsList(), mr = mainsList(), out = [], cur = null;
      for (var i = 1; i < p.length && out.length < 4; i++) { var sl = rig(p[i], cr, mr); if (!cur || cur.sl !== sl) { cur = { sl: sl, t: p[i - 1].t, h: p[i].hdg }; out.push(cur); } }
      lines.push('First legs (' + (s.combined ? 'Combined' : short(s.id)) + '):'); out.forEach(function (o) { lines.push('  ' + clockH(o.t).slice(4) + ' ' + o.sl + ', heading ' + pad(o.h) + '°'); });
    }
    lines.push('Open in Route: ' + crewLink()); lines.push('Planning aid, not for navigation.');
    return lines.join('\n');
  }
  function crewInit() {
    $('crewPre').parentElement.addEventListener('toggle', function () { if (this.open) $('crewPre').textContent = S.sel ? crewText() : 'Route first, then the message shows here.'; });
    $('xCrew').onclick = function () {
      var t = crewText();
      if (navigator.share) { navigator.share({ title: 'FirstShift Route: ' + meta.course.name, text: t }).catch(function () {}); return; }
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    };
    $('xCopy').onclick = function () { var t = crewText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('xNote').textContent = 'Copied: paste it into WhatsApp, a message or an email.'; }, function () { $('xNote').textContent = t; }); };
    var q = QS0, cs = q.get('course'), st = q.get('start');
    if (cs) { try { var cc = JSON.parse(decodeURIComponent(escape(atob(cs)))), P0 = cc.p.map(function (a) { return { lat: a[0], lon: a[1], name: a[2], side: a[3] === 's' ? 'starboard' : 'port' }; });
      S.pendingCourse = { name: cc.n, start: P0[0], marks: P0.slice(1, -1), finish: P0[P0.length - 1] }; } catch (e) {} }
    if (st) S.pendingStart = st;
  }
  /* ---------- Ask Route: fixed questions answered from the chosen route at the replay time (or now, from your GPS) ---------- */
  function ask(q) {
    if (q === 'brief') return briefing();
    var s = S.sel; if (!s) return 'Route first: there is no route to answer from yet.';
    var p = s.r.path, ts = tsOf(p), t = S.t, pos = posAt(ts, p, t); if (!pos) return 'The replay time is before the start. Move the slider to the race.';
    if (pos.done) return 'At this time the boat has finished, at ' + clockH(s.r.finish).slice(4) + ' UTC.';
    var i0 = Math.max(1, (pos.i || 0) + 1), nm = function (a, b) { return FSRouter.dist(a.la, a.lo, b.la, b.lo); }, when = function (tt) { var m = Math.round((tt - t) * 60); return clockH(tt).slice(4) + ' UTC, ' + (m < 90 ? m + ' minutes' : (m / 60).toFixed(1) + ' hours') + ' from now'; };
    var cur = p[i0], name = s.combined ? 'the combined route' : 'the ' + short(s.id) + ' route';
    if (q === 'tack') { var side = cur.twa < 0 ? -1 : 1; for (var i = i0 + 1; i < p.length; i++) { var sd = p[i].twa < 0 ? -1 : 1; if (sd !== side) return 'On ' + name + ', the next ' + (Math.abs(p[i].twa) > 90 ? 'gybe' : 'tack') + ' is at ' + when(p[i - 1].t) + ', onto ' + (sd < 0 ? 'starboard' : 'port') + ' heading ' + pad(p[i].hdg) + '°, true wind angle ' + Math.abs(Math.round(p[i].twa)) + '°.'; } return 'No more tacks or gybes on ' + name + ' before the finish.'; }
    if (q === 'sail') { var cr = sailsList(), mr = mainsList(), now = rig(cur, cr, mr); for (var j = i0 + 1; j < p.length; j++) { var sl = rig(p[j], cr, mr); if (sl && sl !== now) { var k = j; while (k < p.length && rig(p[k], cr, mr) === sl && p[k].t - p[j].t < 0.5) k++; if (k >= p.length || p[k].t - p[j].t >= 0.5) return 'Sail now: ' + (now || 'none set') + '. Next change to ' + sl + ' at ' + when(p[j].t) + ', true wind ' + Math.round(p[j].tws) + ' knots at ' + Math.abs(Math.round(p[j].twa)) + '°.'; } } return 'Stay with ' + (now || 'the same sail') + ' to the finish on ' + name + '.'; }
    if (q === 'shift') { var best = null; for (var m = i0; m < p.length && p[m].t - t <= 12; m++) { var d = ((p[m].twd - cur.twd + 540) % 360) - 180; if (!best || Math.abs(d) > Math.abs(best.d)) best = { d: d, q: p[m] }; } if (!best || Math.abs(best.d) < 10) return 'No shift over 10° in the next 12 hours: wind stays about ' + pad(cur.twd) + '° at ' + Math.round(cur.tws) + ' knots.'; return 'Biggest shift in the next 12 hours: ' + Math.abs(Math.round(best.d)) + '° ' + (best.d > 0 ? 'veer' : 'back') + ', from ' + pad(cur.twd) + '° to ' + pad(best.q.twd) + '° by ' + when(best.q.t) + ', ' + Math.round(best.q.tws) + ' knots.'; }
    if (q === 'mark') { var arr = s.r.arrivals.filter(function (a) { return a.t > t; })[0]; if (!arr) return 'All marks rounded.'; var lg = S.legs.filter(function (l) { return l.name === arr.name; })[0], at = lg && lg.at, dd = at ? FSRouter.dist(pos.la, pos.lo, at[0], at[1]) : null; return 'Next mark ' + arr.name + (dd != null ? ', ' + dd.toFixed(1) + ' nm away, bearing ' + pad(FSRouter.brg(pos.la, pos.lo, at[0], at[1])) + '°' : '') + '. Routed arrival ' + when(arr.t) + '.'; }
    if (q === 'tide') { var c = cur.cu != null ? [cur.cu, cur.cv] : [0, 0], sp = Math.hypot(c[0], c[1]); if (sp < 0.1) return 'Tide is slack here.'; var dir = (Math.atan2(c[0], c[1]) / R + 360) % 360, rel = ((dir - cur.hdg + 540) % 360) - 180; return 'Tide ' + sp.toFixed(1) + ' knots setting ' + pad(dir) + '°: ' + (Math.abs(rel) < 45 ? 'with you' : Math.abs(rel) > 135 ? 'against you' : 'across you from ' + (rel > 0 ? 'port' : 'starboard')) + ' on a heading of ' + pad(cur.hdg) + '°.'; }
    return [ask('mark'), ask('tack'), ask('sail'), ask('shift')].join(' ');
  }
  /* a race briefing for the chosen route, leg by leg, in plain words to read to the crew */
  function briefing() {
    var s = S.sel; if (!s) return 'Route first: there is no route to brief from yet.';
    var p = s.r.path, st = routeStats(s), cr = sailsList(), mr = mainsList(), name = s.combined ? 'The combined route' : 'The ' + short(s.id) + ' route', out = [];
    var fins = S.routes.filter(function (r) { return r.r && r.r.finish && !r.r.partial; }).map(function (r) { return r.r.finish; }), spread = fins.length > 1 ? Math.max.apply(0, fins) - Math.min.apply(0, fins) : 0;
    var pc = function (x) { return Math.round(x * 100) + ' percent'; }, comp = function (d) { return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((d % 360) + 360) % 360 / 45) % 8]; };
    out.push(name + (s.r.partial ? ' runs out of forecast ' + s.r.partial.togo + ' nm short of the finish.' : ' finishes ' + clockH(s.r.finish).slice(4) + ' UTC, ' + fmtH(s.r.finish - S.start.t) + ' after the start') + ', sailing ' + Math.round(st.nm) + ' nm.' +
      ' About ' + pc(st.upP) + ' upwind, ' + pc(st.reachP) + ' reaching and ' + pc(st.downP) + ' downwind.' +
      (spread ? (spread < 2 ? ' The models agree well: their finish times sit within ' + fmtH(spread) + '.' : spread < 6 ? ' The models differ by ' + fmtH(spread) + ' on the finish, so keep an eye on which one is matching the sky.' : ' The models disagree by ' + fmtH(spread) + ' on the finish: treat the plan as a starting point and watch for the real wind.') : ''));
    var legs = [], cur = null; p.forEach(function (q, i) { if (!i) return; var L = q.leg || 0; if (!cur || cur.leg !== L) { cur = { leg: L, pts: [] }; legs.push(cur); } cur.pts.push(q); });
    legs.forEach(function (lg) {
      var q = lg.pts, nmL = S.legs && S.legs[lg.leg] ? S.legs[lg.leg].name : 'the finish', a = q[0], z = q[q.length - 1];
      var up = 0, down = 0, tot = 0, wmin = 99, wmax = 0, man = 0, side = 0, sails = [], last = null, cand = null, candT = 0, against = 0, tideT = null;
      q.forEach(function (x, i) { var dt = i ? x.t - q[i - 1].t : 0, twa = Math.abs(x.twa || 0); tot += dt; if (twa < 60) up += dt; else if (twa > 120) down += dt; wmin = Math.min(wmin, x.tws || 0); wmax = Math.max(wmax, x.tws || 0);
        var sd = (x.twa || 0) < 0 ? -1 : 1; if (side && sd !== side) man++; side = sd; var sl = rig(x, cr, mr); if (sl && sl !== last) { if (sl !== cand) { cand = sl; candT = x.t; } else if (x.t - candT >= 0.5 || !last) { sails.push(sl); last = sl; cand = null; } } else cand = null;   /* a sail counts once it has been up for half an hour */
        var c = (x.cu || 0) * Math.sin((x.hdg || 0) * R) + (x.cv || 0) * Math.cos((x.hdg || 0) * R); if (c < -1) { against += dt; if (tideT == null) tideT = x.t; } });
      var kind = up / (tot || 1) > 0.6 ? 'a beat' : down / (tot || 1) > 0.6 ? 'a run' : 'mostly a reach';
      var shift = ((z.twd - a.twd + 540) % 360) - 180;
      var t = 'To ' + nmL + ': ' + kind + ', ' + fmtH(z.t - (q[0].t)) + ', arriving ' + clockH(z.t).slice(4) + ' UTC. Wind ' + Math.round(wmin) + ' to ' + Math.round(wmax) + ' knots from the ' + comp(a.twd) + (Math.abs(shift) >= 20 ? ', ' + (shift > 0 ? 'veering' : 'backing') + ' ' + Math.abs(Math.round(shift)) + ' degrees by the mark' : '') + '.';
      if (man) t += ' ' + man + ' ' + (up > down ? 'tack' : 'gybe') + (man > 1 ? 's' : '') + '.';
      if (sails.length) t += ' Sails: ' + sails.slice(0, 4).join(', then ') + (sails.length > 4 ? ' and more' : '') + '.';
      if (against >= 1) t += ' Foul tide for about ' + fmtH(against) + ' from ' + clockH(tideT).slice(4) + ': that is where the inshore or offshore choice matters.';
      out.push(t);
    });
    var risks = [];
    if (metField()) { var gMax = 0, gT = 0, sq = null; p.forEach(function (q) { var g = metAt('gust', q.la, q.lo, q.t) / KN, c = metAt('cape', q.la, q.lo, q.t), rn = metAt('rain', q.la, q.lo, q.t); if (g > gMax) { gMax = g; gT = q.t; } if (!sq && c >= 500 && rn >= 0.5) sq = q; });
      if (gMax >= 25) risks.push('gusts to ' + Math.round(gMax) + ' knots around ' + clockH(gT).slice(4) + ' UTC'); if (sq) risks.push('squalls possible from ' + clockH(sq.t).slice(4) + ' UTC, with rain and thunderstorm energy on the route'); }
    if (st.maxW >= 25) risks.push('wind up to ' + Math.round(st.maxW) + ' knots around ' + clockH(st.maxWt).slice(4) + ' UTC'); if (st.maxS >= 2.5) risks.push('sea up to ' + st.maxS.toFixed(1) + ' m');
    out.push((risks.length ? 'Watch for ' + risks.join(' and ') + '. ' : '') + (st.sails ? st.sails + ' sail changes' : 'No sail changes') + (st.reefs ? ' and ' + st.reefs + ' reef changes' : '') + ' in all. Planning aid, not for navigation.');
    return out.join('\n\n');
  }
  /* ensemble: route the course in each ECMWF ensemble member (quick routes), draw them as a spaghetti and give the spread of finish times */
  function ensRun() {
    var ids = meta.layers.filter(function (L) { return L.kind === 'ens'; }).map(function (L) { return L.id; });
    if (!ids.length) { $('ensOut').innerHTML = '<p class="note">The ensemble is not on the server for this page yet: it comes with the next forecast build.</p>'; return; }
    if (S.running || S.ensBusy) return; S.ensBusy = true; $('ensRun').textContent = 'Downloading the ensemble…';
    ids.forEach(function (id) { if (!S.loaded[id]) S.choice[id] = 'full'; });
    download().then(function () {
      var base = Object.assign(opts(ids.slice(0, 1)), { dt: 1200, hstep: 10, sectors: 180 }), st = startPt(), legs = legsFor(S.from), done = 0;
      $('ensRun').textContent = 'Routing 0 of ' + ids.length + '…';
      return Promise.all(ids.map(function (id) { return pool({ type: 'route', o: Object.assign({}, base, { models: [id], start: st, legs: legs }) }).then(function (r) { done++; $('ensRun').textContent = 'Routing ' + done + ' of ' + ids.length + '…'; return { id: id, r: r }; }, function (e) { done++; return { id: id, err: e.message }; }); }));
    }).then(function (res) {
      S.ensBusy = false; $('ensRun').textContent = 'Route the ensemble again';
      S.ens = res.filter(function (x) { return x.r; });
      var fin = S.ens.filter(function (x) { return !x.r.partial; }).map(function (x) { return x.r.finish; }).sort(function (a, b) { return a - b; }), part = S.ens.length - fin.length;
      if (!fin.length) { $('ensOut').innerHTML = '<p class="note">The ensemble forecasts end before any member finishes' + (part ? ' (' + part + ' routes shown as far as they reach)' : '') + '.</p>'; draw(); return; }
      var med = fin[Math.floor(fin.length / 2)], spread = fin[fin.length - 1] - fin[0];
      $('ensOut').innerHTML = '<div class="fit ' + (spread < 3 ? 'ok' : spread < 8 ? 'tight' : 'no') + '"><b>' + (spread < 3 ? 'The members agree.' : spread < 8 ? 'Some spread between the members.' : 'The members disagree.') + '</b> Fastest finish ' + clockH(fin[0]).slice(4) + ', middle ' + clockH(med).slice(4) + ', slowest ' + clockH(fin[fin.length - 1]).slice(4) + ' UTC: a spread of ' + fmtH(spread) + '.' + (part ? ' ' + part + ' of the members run out of forecast before the finish.' : '') + ' The thin grey lines on the chart are the ' + S.ens.length + ' ensemble routes.</div>';
      draw();
    }).catch(function (e) { S.ensBusy = false; $('ensRun').textContent = 'Route the ensemble'; $('ensOut').innerHTML = '<p class="note">' + e.message + '</p>'; });
  }
  function drawEns() {
    if (!S.ens || !S.ens.length) return; ctx.save(); ctx.strokeStyle = css['--muted'] || '#9AAEBB'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55; ctx.setLineDash([]);
    S.ens.forEach(function (x) { var p = x.r.path; ctx.beginPath(); for (var i = 0; i < p.length; i++) { var X1 = X(p[i].lo), Y1 = Y(p[i].la); if (i) ctx.lineTo(X1, Y1); else ctx.moveTo(X1, Y1); } ctx.stroke(); });
    ctx.restore();
  }
  /* departure planning: the chosen route's models from starts every 6 hours (quick routes), finish and elapsed for each */
  function depRun() {
    var s = S.sel, r = startRange(); if (!s || !r) { $('depTable').innerHTML = '<tr><td>Route first.</td></tr>'; return; }
    if (S.running || S.depBusy) return; S.depBusy = true;
    var c = meta.course, legs = (function () { var keepTo = S.to, keepFrom = S.from; S.to = null; var L = legsFor(null); S.to = keepTo; S.from = keepFrom; return L; })();
    var base = Object.assign(opts(s.models), { dt: 1200, hstep: 10, sectors: 180 }), starts = [];
    for (var ep = Math.ceil(Math.max(r[0], Date.now() / 1000) / 21600) * 21600; ep <= r[1] && starts.length < 20; ep += 21600) starts.push(ep);
    var done = 0, rows = starts.map(function (ep) { return { ep: ep }; });
    var show = function () {
      var ok = rows.filter(function (x) { return x.r && !x.r.partial; }), best = ok.length ? Math.min.apply(0, ok.map(function (x) { return x.r.finish - (x.ep - T0) / 3600; })) : null;
      $('depTable').innerHTML = '<tr><th>Start (UTC)</th><th>Finish</th><th>Elapsed</th></tr>' + rows.map(function (x) {
        if (!x.r && !x.err) return '<tr><td>' + clockAbs(x.ep) + '</td><td colspan="2">…</td></tr>';
        if (x.err || !x.r) return '<tr><td>' + clockAbs(x.ep) + '</td><td colspan="2">' + (x.err || '') + '</td></tr>';
        if (x.r.partial) return '<tr><td>' + clockAbs(x.ep) + '</td><td colspan="2">Forecast ends ' + x.r.partial.togo + ' nm short</td></tr>';
        var el = x.r.finish - (x.ep - T0) / 3600; return '<tr' + (el === best ? ' class="sel"' : '') + '><td>' + clockAbs(x.ep) + '</td><td>' + clockH(x.r.finish).slice(4) + '</td><td>' + fmtH(el) + (el === best ? ' <span class="pill">quickest</span>' : '') + '</td></tr>';
      }).join('');
    };
    show(); $('depRun').textContent = 'Working…';
    Promise.all(rows.map(function (x) { return pool({ type: 'route', o: Object.assign({}, base, { start: { lat: c.start.lat, lon: c.start.lon, t: (x.ep - T0) / 3600 }, legs: legs }) }).then(function (res) { x.r = res; }, function (e) { x.err = e.message.split('.')[0]; }).then(function () { done++; show(); }); }))
      .then(function () { S.depBusy = false; $('depRun').textContent = 'Compare start times'; });
  }
  function askInit() {
    $('depRun').onclick = depRun; $('ensRun').onclick = ensRun;
    [].forEach.call($('askRow').querySelectorAll('[data-q]'), function (b) { b.onclick = function () { $('askTxt').textContent = ask(b.dataset.q); $('askAns').hidden = false; }; });
    $('askSay').onclick = function () { try { if (speechSynthesis.speaking) { speechSynthesis.cancel(); $('askSay').textContent = 'Read it out'; return; } var u = new SpeechSynthesisUtterance($('askTxt').textContent.replace(/°/g, ' degrees').replace(/UTC/g, 'U T C')); var v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : 'en-GB'; u.onend = u.onerror = function () { $('askSay').textContent = 'Read it out'; }; speechSynthesis.speak(u); $('askSay').textContent = 'Stop reading'; } catch (e) {} };
  }
  /* ---------- boat code: one code keeps boat settings and My races the same on every crew device (/api/boat/<code>) ---------- */
  var BC = { code: store('fs-boatcode') || '', at: +(store('fs-boatcode-at') || 0), msg: '' };
  function bcNew() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = ''; var r = new Uint32Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (x, i) { r[i] = Math.random() * 1e9; }); for (var i = 0; i < 6; i++) c += A[r[i] % A.length]; return c; }
  function bcData() { var src = (document.querySelector('#srcSeg [aria-pressed="true"]') || {}).dataset; var st = snapSettings(); st.__src = src && src.src; var d = { myraces: myRaces(), settings: st }; if (BC.moment) d.moment = BC.moment; return d; }
  function bcPush() {
    if (!BC.code || !navigator.onLine) return Promise.resolve();
    return fetch('/api/boat/' + BC.code, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: bcData() }) }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) { BC.msg = j.error; return; } BC.at = j.at; store('fs-boatcode-at', String(j.at)); BC.msg = 'Shared ' + new Date(j.at).toUTCString().slice(17, 22) + ' UTC';
    }).catch(function () { BC.msg = 'Not shared: no connection. It will share next time.'; });
  }
  function bcPull(force) {
    if (!BC.code || !navigator.onLine) return Promise.resolve(false);
    return fetch('/api/boat/' + BC.code, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) { BC.msg = j.error; return false; }
      if (j.data && j.data.moment && (!BC.moment || j.data.moment.at > BC.moment.at)) BC.moment = j.data.moment;   /* keep the latest crew moment, so this device's next share does not drop it */
      if (!force && j.at <= BC.at) { BC.msg = 'Up to date'; return false; }
      var mine = myRaces(), byId = {}; mine.concat(j.data.myraces || []).forEach(function (r) { if (!byId[r.id] || byId[r.id].savedAt < r.savedAt) byId[r.id] = r; });
      setMyRaces(Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return b.savedAt - a.savedAt; }));
      if (j.data.settings) putSettings(j.data.settings);
      BC.at = j.at; store('fs-boatcode-at', String(j.at)); BC.msg = 'Updated from the boat ' + new Date(j.at).toUTCString().slice(17, 22) + ' UTC'; return true;
    }).catch(function () { BC.msg = 'Could not reach the boat code server.'; return false; });
  }
  function bcBox() {
    var h = '<h3>Boat code</h3>';
    if (BC.code) h += '<p class="note">This device shares boat settings and My races under <b class="bcode">' + BC.code + '</b>. Give the code (or the link) to the crew. ' + (BC.msg || '') + '</p><div class="xrow"><button class="btn" id="bcShare">Send the code to crew</button><button class="btn" id="bcSync">Update now</button><button class="btn" id="bcLeave">Stop sharing</button></div>';
    else h += '<p class="note">One code keeps the boat, its settings and My races the same on every phone, tablet and computer aboard. No logins.</p><div class="xrow"><button class="btn primary" id="bcMake">Make a boat code</button></div><div class="row"><label for="bcIn">Join with a code</label><input id="bcIn" maxlength="6" autocapitalize="characters" placeholder="ABC234"><button class="btn" id="bcJoin">Join</button></div>';
    return h;
  }
  function bcWire() {
    if ($('bcMake')) $('bcMake').onclick = function () { BC.code = bcNew(); store('fs-boatcode', BC.code); bcPush().then(racesSheet); };
    if ($('bcJoin')) $('bcJoin').onclick = function () { var c = $('bcIn').value.trim().toUpperCase(); if (!/^[A-HJ-NP-Z2-9]{6}$/.test(c)) { $('bcIn').focus(); return; } BC.code = c; BC.at = 0; store('fs-boatcode', c); bcPull(true).then(function (ok) { racesSheet(); if (ok) { S.from = null; run(); } }); };
    if ($('bcSync')) $('bcSync').onclick = function () { bcPull(false).then(function (ok) { return ok ? null : bcPush(); }).then(racesSheet); };
    if ($('bcLeave')) $('bcLeave').onclick = function () { BC.code = ''; store('fs-boatcode', ''); racesSheet(); };
    if ($('bcShare')) $('bcShare').onclick = function () { var link = location.origin + location.pathname + '?boat=' + BC.code, t = 'FirstShift Route boat code ' + BC.code + ': open ' + link + ' to share our boat settings and races.'; if (navigator.share) navigator.share({ title: 'FirstShift Route boat code', text: t }).catch(function () {}); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); };
  }
  function bcInit() {
    var q = QS0.get('boat'); if (q && /^[A-HJ-NP-Z2-9]{6}$/i.test(q)) { BC.code = q.toUpperCase(); BC.at = 0; store('fs-boatcode', BC.code); }
    if (BC.code) setTimeout(function () { bcPull(false); }, 1500);
    var push = function () { if (BC.code) setTimeout(bcPush, 300); };
    var sx = $('sheetX').onclick; $('sheetX').onclick = function () { sx(); push(); };
    var bs = $('boatSave'); if (bs) bs.addEventListener('click', push);
    BC.push = push;
    /* crew moments: the navigator sends a snapshot to every device on the boat code; the others see it within two minutes */
    var dev = store('fs-dev'); if (!dev) { dev = bcNew() + bcNew(); store('fs-dev', dev); } BC.dev = dev;
    var seen = +(store('fs-moment-seen') || 0);
    function showMoment(m) {
      $('momentTxt').textContent = 'From the boat, ' + new Date(m.at).toUTCString().slice(17, 22) + ' UTC:\n' + m.text.split('\n').slice(0, 4).join('\n'); $('momentBox').hidden = false;
      $('momentOpen').onclick = function () { $('momentBox').hidden = true; seen = m.at; store('fs-moment-seen', String(m.at)); if (m.link) location.href = m.link; };
      $('momentX').onclick = function () { $('momentBox').hidden = true; seen = m.at; store('fs-moment-seen', String(m.at)); };
    }
    setInterval(function () {
      if (!BC.code || !navigator.onLine || document.hidden) return;
      fetch('/api/boat/' + BC.code, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { var m = j.data && j.data.moment; if (m && (!BC.moment || m.at > BC.moment.at)) BC.moment = m; if (m && m.at > seen && m.dev !== BC.dev) showMoment(m); }).catch(function () {});
    }, 120000);
    $('xMoment').onclick = function () {
      if (!BC.code) { $('xMomentNote').textContent = 'Make or join a boat code first: tap the race name, then Boat code.'; return; }
      if (!S.sel) { $('xMomentNote').textContent = 'Route first.'; return; }
      var t = crewText(); BC.moment = { at: Date.now(), dev: BC.dev, text: t, link: crewLink() };
      $('xMomentNote').textContent = 'Sending…';
      bcPush().then(function () { $('xMomentNote').textContent = /^Shared/.test(BC.msg) ? 'Sent. Devices on boat code ' + BC.code + ' show it within two minutes while Route is open.' : BC.msg; });
    };
  }
  /* ---------- laylines to the next mark: from the polar's best upwind or downwind angle in the forecast wind at the mark ---------- */
  function laylines() {
    var s = S.sel; if (!s || !S.legs) return; var p = s.r.path, pos = posAt(tsOf(p), p, S.t); if (!pos || pos.done) return;
    var q = p[Math.min(p.length - 1, (pos.i || 0) + 1)], lg = S.legs[Math.min(q.leg, S.legs.length - 1)], at = lg && lg.at; if (!at) return;
    var W = FSRouter.windSampler(P, s.models)(at[0], at[1], S.t), tws = W[0], twd = W[1]; if (!(tws > 0.5)) return;
    var brg = FSRouter.brg(pos.la, pos.lo, at[0], at[1]), off = Math.abs(((brg - twd + 540) % 360) - 180), up = off < 70, down = off > 115; if (!up && !down) return;
    var b = FSRouter.bestVmg(speedFn(opts(s.models)), tws, up), a = b[0]; if (!a) return;
    var k = Math.cos(at[0] * R), L = 25, mx = X(at[1]), my = Y(at[0]);
    ctx.save(); ctx.strokeStyle = css['--brand'] || '#6FA9E0'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.6; ctx.setLineDash([8, 5]); ctx.font = '600 10px Inter, sans-serif';
    [[-1, 'starboard'], [1, 'port']].forEach(function (sd) {
      var hdg = (twd + sd[0] * (up ? a : a) + 360) % 360, back = (hdg + 180) % 360;   // the boat's heading on this tack, and the line back from the mark
      var ex = at[1] + Math.sin(back * R) * L / 60 / k, ey = at[0] + Math.cos(back * R) * L / 60;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(X(ex), Y(ey)); ctx.stroke();
      var lx = at[1] + Math.sin(back * R) * 14 / 60 / k, ly = at[0] + Math.cos(back * R) * 14 / 60; ctx.fillText((sd[1] === 'starboard' ? 'Stbd' : 'Port') + ' layline ' + pad(hdg) + '°', X(lx) + 6, Y(ly) - 4);
    });
    ctx.setLineDash([]); ctx.fillText((up ? "Upwind" : "Downwind") + " TWA " + a + "°, wind " + pad(twd) + "° " + Math.round(tws) + " kn", mx + 10, my + 30);
    ctx.restore();
  }
  /* ---------- races: the race menu (tap the race name), My races kept on this device, and the course editor ---------- */
  var READY = {};   // races with forecasts on the server: their own page
  var QS0 = new URLSearchParams(location.search);   /* the address as opened, before Route rewrites it */
  var HERE = location.pathname.replace(/\/+$/, '').split('/').pop(), LAST0 = (function () { try { return JSON.parse(localStorage.getItem('fs-last-' + location.pathname.replace(/\/+$/, '').split('/').pop()) || 'null'); } catch (e) { return null; } })();
  function myRaces() { try { return JSON.parse(store('fs-myraces') || '[]'); } catch (e) { return []; } }
  function setMyRaces(a) { store('fs-myraces', JSON.stringify(a)); }
  function snapSettings() { var o = {}; [].forEach.call(document.querySelectorAll('#sheet input[id], #sheet select[id], #sheet textarea[id]'), function (el) { if (/^side\d|^adjNote|^raceSel$|^ed[A-Z]/.test(el.id)) return; o[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
  function putSettings(o) {
    Object.keys(o || {}).forEach(function (id) { if (id === 'raceSel') return;   /* the course comes with the saved race, never from its settings */ var el = $(id); if (!el) return; if (el.tagName === 'SELECT' && ![].some.call(el.options, function (x) { return x.value === String(o[id]); })) return;   /* a saved choice that no longer exists (a start that has passed) would blank the list: keep the current one */ if (el.type === 'checkbox') el.checked = o[id]; else el.value = o[id]; ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); });
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
    a = a.filter(function (x) { return x.id !== rec.id; }); a.unshift(rec); setMyRaces(a); S.myId = rec.id; lastSet({ my: rec.id }); if (BC.push) BC.push(); return rec;
  }
  /* reopen the course last used on this page (a RORC race or one of My races) and its start time */
  function setShort(t) { $('raceTitle').setAttribute('data-short', t); $('raceShort').textContent = t; }   /* a real element: Safari does not always redraw text taken from an attribute */
  function lastGet() { try { return JSON.parse(store('fs-last-' + HERE) || 'null'); } catch (e) { return null; } }
  function lastSet(o) { if (S.booting) return; var old = lastGet() || {}, same = old.race === o.race && old.my === o.my; o.start = o.start || (same ? old.start : null); o.chosen = same ? !!old.chosen : false; if (!same) { S.startChosen = false; } store('fs-last-' + HERE, JSON.stringify(o)); chipStart(); }
  function openMy(id, boot) {
    var rec = myRaces().filter(function (x) { return x.id === id; })[0]; if (!rec) return;
    if (rec.page && rec.page !== HERE) { if (!boot) try { sessionStorage.setItem('fs-wiz', '1'); } catch (e) {} location.href = '../' + rec.page + '/?my=' + encodeURIComponent(id); return; }
    if (courseIssue(rec.course) && regionFor(rec.course) && regionFor(rec.course).id !== HERE) { var rg2 = regionFor(rec.course), all2 = myRaces(); all2.forEach(function (x) { if (x.id === rec.id) x.page = rg2.id; }); setMyRaces(all2); location.href = '../' + rg2.id + '/?my=' + encodeURIComponent(id); return; }   /* drawn on a page without its forecasts: open it where they are */
    S.myId = id; applyCourseObj(asRace(rec.course, rec.id)); putSettings(rec.settings); $('races').hidden = true; if (!boot && wizCourseChosen(false)) return; if (boot && WIZ.on) return; S.from = null; run();
  }
  function racesSheet(mode) {
    var c = meta.course, mine = myRaces(), h = '';
    $('racesH').textContent = mode === 'new' ? 'Start new course' : mode === 'saved' ? 'Saved routes' : mode === 'rorc' ? 'RORC races' : 'Races';
    if (mode === 'new') {   /* one question, then the whole area and the set-up steps */
      h = '<p class="note">The routes on the chart now are kept under Saved routes.</p>' +
        '<div class="ritem"><div><b>A RORC race</b><span class="note">Pick from the RORC course library, then the set-up steps</span></div><div class="xrow"><button class="btn primary" id="nRorc">Choose a RORC race</button></div></div>' +
        '<div class="ritem"><div><b>Draw my own course</b><span class="note">The whole forecast area opens; tap the start, the marks and the finish</span></div><div class="xrow"><button class="btn primary" id="nDraw">Draw a course</button></div></div>';
      $('raceList').innerHTML = h;
      $('nRorc').onclick = function () { archiveRoutes(); $('races').hidden = true; S.drawnNew = true; wizOpen(2); };
      $('nDraw').onclick = function () { $('races').hidden = true; newCourse(); };
      return;
    }
    if (mode === 'saved') {   /* one list, newest first: courses you saved and routes kept when you started something new */
      var all = mine.map(function (r) { return { kind: 'my', id: r.id, name: r.name, at: r.savedAt, sum: r.summary || (r.course ? courseNm(r.course) + ' nm' : ''), on: r.id === S.myId }; })
        .concat(oldRoutes().map(function (o) { return { kind: 'old', id: o.id, name: o.name, at: o.savedAt, sum: o.summary }; }))
        .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      h = all.length ? all.map(function (x) { return '<div class="ritem' + (x.on ? ' on' : '') + '"><div><b>' + wizEsc(x.name) + '</b><span class="note">' + (x.at ? new Date(x.at).toUTCString().slice(5, 22) : '') + (x.sum ? ' · ' + wizEsc(x.sum) : '') + (x.kind === 'old' ? ' · routes kept' : ' · your course') + '</span></div><div class="xrow"><button class="btn" data-sv="' + x.kind + ':' + x.id + '">Open</button><button class="btn" data-svdel="' + x.kind + ':' + x.id + '">Delete</button></div></div>'; }).join('')
        : '<p class="note">Nothing saved yet. Routes are kept here when you start a new course, and courses you draw are saved here too.</p>';
      $('raceList').innerHTML = h;
      [].forEach.call($('raceList').querySelectorAll('[data-sv]'), function (b) { b.onclick = function () { var k = b.dataset.sv.split(':'); if (k[0] === 'old') openOld(k[1]); else { archiveRoutes(); openMy(k[1]); } }; });
      [].forEach.call($('raceList').querySelectorAll('[data-svdel]'), function (b) { b.onclick = function () {
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
        var k = b.dataset.svdel.split(':');
        if (k[0] === 'old') store('fs-oldroutes', JSON.stringify(oldRoutes().filter(function (x) { return x.id !== k[1]; })));
        else { setMyRaces(myRaces().filter(function (x) { return x.id !== k[1]; })); if (S.myId === k[1]) S.myId = null; }
        racesSheet('saved'); }; });
      return;
    }
    h += '<div class="rcur"><div><b>' + c.name + '</b><span class="note">' + (c.race && c.race.custom ? 'Your own course' : 'RORC course library') + ' · ' + courseNm(c) + ' nm</span></div>' +
      '<div class="xrow"><button class="btn primary" id="rSave">' + (S.myId ? 'Save changes' : 'Save as my race') + '</button><button class="btn" id="rEdit">Edit on the chart</button><button class="btn" id="rMarks">Edit the marks</button><button class="btn" id="rNew">New course</button></div></div>';
    h += '<h3>My races</h3>' + (mine.length ? mine.map(function (r) { return '<div class="ritem' + (r.id === S.myId ? ' on' : '') + '"><div><b>' + r.name + '</b><span class="note">' + new Date(r.savedAt).toUTCString().slice(5, 22) + (r.summary ? ' · ' + r.summary : '') + (r.page !== HERE ? ' · on the ' + r.page + ' forecasts' : '') + '</span></div><div class="xrow"><button class="btn" data-open="' + r.id + '">Open</button><button class="btn" data-del="' + r.id + '" aria-label="Delete ' + r.name + '">Delete</button></div></div>'; }).join('') : '<p class="note">None yet. Save the race on screen, or build a new course, and it is kept here on this device.</p>');
    var olds = oldRoutes(); if (olds.length) h += '<h3>Old routes</h3>' + olds.map(function (o) { return '<div class="ritem"><div><b>' + wizEsc(o.name) + '</b><span class="note">Kept ' + new Date(o.savedAt).toUTCString().slice(5, 22) + (o.summary ? ' · ' + wizEsc(o.summary) : '') + '</span></div><div class="xrow"><button class="btn" data-old="' + o.id + '">Open</button><button class="btn" data-olddel="' + o.id + '">Delete</button></div></div>'; }).join('');
    h += '<h3>RORC races</h3>' + RACES.map(function (r) { var pg = r.page || r.id, ready = READY[pg]; return '<div class="ritem"><div><b>' + r.name + '</b><span class="note">' + (r.date2027 ? r.date2027.split('-').reverse().slice(0, 2).join('/') + ' 2027 · ' : '') + raceReady(r, ready) + '</span></div><div class="xrow"><button class="btn" data-race="' + r.id + '">' + (ready ? 'Open' : 'Show course') + '</button></div></div>'; }).join('');
    h += bcBox();
    $('raceList').innerHTML = h; bcWire();
    $('rSave').onclick = function () { var n = $('rName') ? $('rName').value : ''; var rec = saveMyRace(n); racesSheet(); busy('Saved as ' + rec.name); setTimeout(function () { busy(''); }, 1800); };
    $('rEdit').onclick = function () { startEdit(courseCopy()); };
    $('rMarks').onclick = function () { startEdit(courseCopy()); editForm(); };
    $('rNew').onclick = function () { newCourse(); };
    [].forEach.call($('raceList').querySelectorAll('[data-open]'), function (b) { b.onclick = function () { openMy(b.dataset.open); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-old]'), function (b) { b.onclick = function () { openOld(b.dataset.old); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-olddel]'), function (b) { b.onclick = function () { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; } store('fs-oldroutes', JSON.stringify(oldRoutes().filter(function (x) { return x.id !== b.dataset.olddel; }))); racesSheet(); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-del]'), function (b) { b.onclick = function () {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
      setMyRaces(myRaces().filter(function (x) { return x.id !== b.dataset.del; })); if (S.myId === b.dataset.del) S.myId = null; racesSheet(); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-race]'), function (b) { b.onclick = function () {
      var id = b.dataset.race, rr = RACES.filter(function (x) { return x.id === id; })[0], pg = (rr && rr.page) || id; if (READY[pg] && pg !== HERE) { try { sessionStorage.setItem('fs-wiz', '1'); } catch (e) {} location.href = '../' + pg + '/?race=' + encodeURIComponent(id); return; }
      S.myId = null; applyRace(id); $('races').hidden = true; if (wizCourseChosen(false)) return; if (!courseIssue(meta.course)) { S.from = null; run(); } };
    });
  }


  /* exact class start: a day from the forecast window and a time to the minute (UTC); routes from that minute */
  function startRange() { var o = [].map.call($('startSel').options, function (x) { return +x.value; }).filter(function (x) { return x > 0; }); return o.length ? [Math.min.apply(null, o), Math.max.apply(null, o)] : null; }
  function startDayList() { var r = startRange(), out = []; if (!r) return out; for (var t = Math.floor(r[0] / 86400) * 86400; t <= r[1]; t += 86400) out.push({ v: t, k: new Date(t * 1000).toUTCString().slice(0, 11) }); return out; }
  function hhmm(ep) { return new Date(ep * 1000).toUTCString().slice(17, 22); }
  function exactEpoch(dayV, tm) { var m = /^(\d{1,2}):(\d{2})/.exec(tm || ''); if (!m) return NaN; return +dayV + (+m[1]) * 3600 + (+m[2]) * 60; }
  function startCheck(ep) { var r = startRange(); if (!r || !(ep === ep)) return 'Enter a time, for example 10:20.'; if (ep < r[0] - 3600 || ep > r[1]) return 'Starts can be from ' + clockAbs(r[0]) + ' to ' + clockAbs(r[1]) + ' UTC with these forecasts.'; return ''; }
  function setStart(ep) {
    var v = String(Math.round(ep)), sel = $('startSel');
    if (![].some.call(sel.options, function (o) { return o.value === v; })) { var o = document.createElement('option'); o.value = v; o.textContent = clockAbs(+v) + ' (exact)'; var after = [].filter.call(sel.options, function (x) { return +x.value < +v; }).pop(); if (after) after.after(o); else sel.prepend(o); }
    sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function startPickerHtml(id, cur) { var days = startDayList(), cd = Math.floor(cur / 86400) * 86400; return '<div class="row"><label for="' + id + 'Day">Day</label><select id="' + id + 'Day">' + days.map(function (d) { return '<option value="' + d.v + '"' + (d.v === cd ? ' selected' : '') + '>' + d.k + '</option>'; }).join('') + '</select></div><div class="row"><label for="' + id + 'Time">Time (UTC)</label><input type="time" id="' + id + 'Time" step="60" value="' + hhmm(cur) + '" required></div><p class="note" id="' + id + 'Err" style="color:var(--warn)"></p>'; }
  function startPickerRead(id) { var ep = exactEpoch($(id + 'Day').value, $(id + 'Time').value), e = startCheck(ep); $(id + 'Err').textContent = e; return e ? NaN : ep; }
  /* Will the forecasts last the race? Each wind model's last hour against a rough finish time (course length at about
     5.5 knots times the TCC). A model that ends early hands over to the longer ones; only when every model has ended
     can Route not finish the race. */
  function fitHtml(startEp, c) {
    c = c || meta.course; var st = (+startEp - T0) / 3600, nm = courseNm(c), tcc = +$('tcc').value || 1, est = nm / (5.5 * tcc), fin = st + est;
    var ms = selectedModels(); if (!ms.length) ms = meta.layers.filter(function (L) { return L.kind === 'wind'; }).map(function (L) { return L.id; });
    var ends = ms.map(function (id) { var L = layer(id), v = L && (L[S.loaded[id] || 'full'] || L.full), h = v && v.hours; return { id: id, end: h && h.length ? h[h.length - 1] : 0 }; }).sort(function (a, b) { return b.end - a.end; });
    if (!ends.length) return '';
    var last = ends[0].end, ok = last >= fin, tight = ok && last < fin + est * 0.25;
    var rows = ends.map(function (e) { var cov = e.end - st, all = e.end >= fin; return '<li>' + short(e.id) + ': to ' + clockAbs(T0 + e.end * 3600) + ' UTC' + (all ? ', covers the race' : cov > 0 ? ', about the first ' + Math.round(cov) + ' h, then the longer forecasts take over' : ', ends before this start') + '</li>'; }).join('');
    return '<div class="fit ' + (ok ? (tight ? 'tight' : 'ok') : 'no') + '"><b>' + (ok ? (tight ? 'Close: the race should just fit the forecasts.' : 'The forecasts cover the race.') : 'The race may not finish before the forecasts end.') + '</b> ' + nm + ' nm, roughly ' + Math.round(est) + ' h at your rating (a rough guide: upwind in a blow takes much longer), so a finish around ' + clockAbs(T0 + fin * 3600) + ' UTC. The longest forecast runs to ' + clockAbs(T0 + last * 3600) + ' UTC.' + (ok ? ' Route confirms it when it routes.' : ' Choose an earlier start, or wait for a later forecast run: Route will say if it cannot finish.') + '<details><summary>Each forecast</summary><ul>' + rows + '</ul><p class="note">Forecasts are published for 2 to 5 days ahead here; the global models go further and longer runs are coming.</p></details></div>';
  }
  /* ---------- guided set-up: boat, race, start, fleet, check, route; in the order a navigator prepares a race ---------- */
  var WIZ = { on: false, step: 0 }, WIZN = ['Race and boat', 'Choose the race', 'The start', 'Boats you are racing', 'Check and route'], WIZD = [0, 1, 1, 2, 3, 4];   /* five screens, four steps: the race list is part of step 1 (Stuart 12 Nov: race and boat first, then the start) */
  function wizSave() { try { sessionStorage.setItem('fs-wiz', WIZ.on ? String(WIZ.step) : ''); } catch (e) {} }
  function boatIsSet() { return store('fs-boatset') === '1' || Object.keys(boats()).length > 0 || !!BC.code; }
  function boatWarn() { $('boatWarn').hidden = boatIsSet() || WIZ.on; }
  /* a set-up step that cannot go on says why, in red, beside Next, and marks the box to fix */
  function wizErr(msg, id) {
    var h = $('wizHint'); h.textContent = msg; h.classList.add('err');
    var el = id && $(id); if (el) { el.classList.add('bad'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { try { el.focus(); } catch (e) {} }, 250); el.addEventListener('input', function f() { el.classList.remove('bad'); h.classList.remove('err'); h.textContent = ''; el.removeEventListener('input', f); }); }
  }
  function wizOpen(n) { WIZ.on = true; S.wizHold = true; boatWarn(); wizShow(n || 1); }
  function wizClose(route) {
    WIZ.on = false; S.wizHold = false; $('wiz').hidden = true; $('wizBar').hidden = true; $('races').hidden = true; store('fs-wizdone', '1'); wizSave(); boatWarn();
    if (route) { S.from = null; run(); }
  }
  /* every race or course you choose goes through start, fleet and check before it routes (Stuart 12 Nov), whether or not the set-up was open */
  /* the start is the sailor's to give: Route asks for it before routing a race (Stuart 12 Nov), and the chip under the race name shows it */
  /* what the race list can honestly say: the chart and forecast area are ready, but a race's own forecast only exists within about 10 days of its start */
  function raceReady(r, ready) {
    if (!ready) return 'Course only: forecasts for this area come later';
    if (!r.date2027) return 'Chart ready · routes from the latest forecast';
    var st = Date.parse(r.date2027 + 'T00:00Z') / 1000, end = T0 + HMAX() * 3600;
    if (st <= end) return 'Forecast covers race day';
    var from = new Date((st - 10 * 86400) * 1000);
    return 'Chart ready · race-day forecast from about ' + from.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][from.getUTCMonth()];
  }
  function startGate() { return store('fs-autostart') !== '1' && !S.startChosen; }
  /* ---------- carry on: reopening Route brings back the last race, boat, start and routes exactly as they were (Stuart 12 Nov).
     Kept until 24 hours after the routed finish; a small box offers a new race or boat instead. ---------- */
  function sessKey() { return 'fs-sess-' + HERE; }
  function sessSave(give) {
    if (!S.routes || !S.routes.length || !S.start || (S.running && !give) || (!give && startGate())) return null;
    try {
      var l = lastGet() || {}, fin = Math.max.apply(null, S.routes.map(function (s) { return s.r.finish; }));
      var o = { v: 1, rk: raceKey(), at: Date.now(), T0: T0, built: meta.built || meta.t0, race: l.race || null, my: l.my || null, startVal: $('startSel').value,
        until: (T0 + fin * 3600) * 1000 + 24 * 3600 * 1000, from: S.from || null, to: S.to || null, t: S.t, sel: S.routes.indexOf(S.sel),
        start: S.start, legs: S.legs, base: S.base, matrix: S.matrix,
        routes: S.routes.map(function (s) { return { id: s.id, name: s.name, models: s.models, combined: !!s.combined, best: !!s.best, mean: s.mean, worst: s.worst, hidden: !!s.hidden, r: { arrivals: s.r.arrivals, path: s.r.path, finish: s.r.finish, partial: s.r.partial || undefined } }; }) };
      if (give) return o;
      store(sessKey(), JSON.stringify(o));
    } catch (e) {}
    return null;
  }
  /* old routes: when a new course is started, the routes on the chart are kept here (newest first, six at most) and cleared */
  function oldRoutes() { try { return JSON.parse(store('fs-oldroutes') || '[]'); } catch (e) { return []; } }
  function archiveRoutes() {
    var o = sessSave(true); if (!o) return null;
    o.id = 'o' + Date.now().toString(36); o.name = meta.course.name; o.page = HERE; o.savedAt = Date.now();
    o.summary = S.sel ? (S.sel.combined ? 'Combined' : short(S.sel.id)) + ' ' + fmtH(S.sel.r.finish - S.start.t) : '';
    var a = [o].concat(oldRoutes()).slice(0, 6);
    while (a.length) { try { localStorage.setItem('fs-oldroutes', JSON.stringify(a)); break; } catch (e) { a.pop(); } }   /* phone storage full: drop the oldest */
    S.gen = (S.gen || 0) + 1; S.running = false; prog(''); busy('');
    if ($('runNote')) $('runNote').textContent = '';
    sessDrop(); S.routes = []; S.sel = null; S.matrix = null; S.ens = null; S.from = null; S.to = null; if ($('finBox')) $('finBox').innerHTML = ''; draw();
    return o;
  }
  function openOld(id) {
    var o = oldRoutes().filter(function (x) { return x.id === id; })[0]; if (!o) return;
    var r = Object.assign({}, o, { until: Date.now() + 24 * 3600 * 1000 }); delete r.id; delete r.name; delete r.page; delete r.savedAt; delete r.summary;
    try { localStorage.setItem('fs-sess-' + o.page, JSON.stringify(r)); localStorage.setItem('fs-last-' + o.page, JSON.stringify({ race: o.race, my: o.my, start: +o.startVal || null, chosen: true })); } catch (e) {}
    try { sessionStorage.setItem('fs-wiz', ''); } catch (e) {} WIZ.on = false;   /* the set-up must not take over: old routes open as they were */
    location.href = '../' + o.page + '/';
  }
  function sessGet() { try { var o = JSON.parse(store(sessKey()) || 'null'); return o && o.v === 1 && Date.now() < o.until ? o : null; } catch (e) { return null; } }
  function sessDrop() { try { localStorage.removeItem(sessKey()); } catch (e) {} }
  function sessRestore(o) {
    var d = (o.T0 - T0) / 3600, sh = function (x) { return x == null ? x : x + d; };   /* a newer forecast pack counts its hours from a different moment */
    S.routes = o.routes.map(function (s) { s.mean = sh(s.mean); s.worst = sh(s.worst); var r = s.r; r.finish = sh(r.finish); r.path.forEach(function (p) { p.t = sh(p.t); }); (r.arrivals || []).forEach(function (a) { a.t = sh(a.t); }); if (r.partial && r.partial.end != null) r.partial.end = sh(r.partial.end); return s; });
    if (o.matrix) { o.matrix.start = sh(o.matrix.start); o.matrix.cols = o.matrix.cols.map(function (c) { return c.map(sh); }); }
    S.matrix = o.matrix; S.sel = S.routes[o.sel] || S.routes.filter(function (s) { return s.best; })[0] || S.routes[0];
    S.base = o.base; S.legs = o.legs; S.start = Object.assign({}, o.start, { t: sh(o.start.t) }); S.from = o.from ? Object.assign({}, o.from, { t: sh(o.from.t) }) : null; S.to = o.to; S.ghosts = []; S.key = null;
    $('runNote').textContent = 'Routes kept from ' + dayhm(o.at) + ' UTC, as you left them.' + ((o.built !== (meta.built || meta.t0)) ? ' A newer forecast has arrived since: tap Route again to use it.' : ' Change any setting, or tap Route again, to work them out afresh.');
    if (o.built !== (meta.built || meta.t0)) { $('newData').hidden = false; $('newDataTxt').textContent = 'Newer forecast since these routes'; $('newDataBtn').textContent = 'Route again'; S.sessStale = true; }
    return ghosts().then(function () { show(); if (o.t != null) try { setTime(Math.max(S.tmin, Math.min(S.tmax, sh(o.t)))); } catch (e) {} });
  }
  function sessAsk() {
    var b = $('sessBox'); if (!b) return; b.hidden = false;
    $('sessNo').onclick = function () { b.hidden = true; };
    $('sessYes').onclick = function () { b.hidden = true; S.resume = null; sessDrop(); startChosen(false); S.routes = []; S.sel = null; run(); };
  }
  function startChosen(v) { S.startChosen = v !== false; var l = lastGet(); if (l) { l.chosen = S.startChosen; l.start = $('startSel').value; store('fs-last-' + HERE, JSON.stringify(l)); } chipStart(); }
  function chipStart() { var c = $('startChip'); if (!c) return; var v = +$('startSel').value; c.classList.toggle('ask', !S.startChosen && store('fs-autostart') !== '1'); var ok = (S.startChosen || store('fs-autostart') === '1') && v, d = new Date(v * 1000), hm = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
    c.innerHTML = '<span class="stl">Start' + (ok ? '<i class="utc"> UTC</i>' : '') + '</span><span class="stv">' + (ok ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + (innerWidth >= 700 && !matchMedia('(orientation:landscape) and (max-height:500px)').matches ? d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' : '') + hm : 'tap to choose') + '</span>';
    c.title = ok ? 'Class start ' + clockAbs(v) + ' UTC: tap to change' : 'Class start: tap to choose'; }   /* its own button beside the race name (Stuart 12 Nov: the two were too close for a finger) */
  function wizCourseChosen(fromEditor) { var fresh = !WIZ.on || S.drawnNew; S.drawnNew = false; if (!WIZ.on) { WIZ.on = true; S.wizHold = true; boatWarn(); } wizShow(fromEditor && !fresh ? 4 : 1); return true; }   /* a course drawn from scratch goes through every step: race and boat, start, fleet, check */
  function wizEsc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wizShow(n) {
    WIZ.step = n; wizSave(); if ($('wizHint')) $('wizHint').classList.remove('err');
    var dn = WIZD[n]; $('wizDots').innerHTML = [1, 2, 3, 4].map(function (i) { return '<i class="' + (i === dn ? 'on' : i < dn ? 'done' : '') + '"></i>'; }).join('');
    if (n === 2) { $('wiz').hidden = true; racesSheet(); $('races').hidden = false; $('wizBar').hidden = false; $('wizBarT').textContent = 'Step 1 of 4: choose a race, open one of yours, or New course'; return; }
    $('wizBar').hidden = true; $('races').hidden = true; $('wiz').hidden = false;
    $('wizH').textContent = 'Step ' + dn + ' of 4: ' + WIZN[n - 1];
    $('wizBack').hidden = n === 1; $('wizNext').textContent = n === 5 ? 'Route it' : n === 4 ? 'Next (or skip)' : 'Next'; $('wizNext').disabled = false; $('wizHint').textContent = '';
    var h = '<div class="wizstep">', B = $('wizBody');
    if (n === 1) {
      var bl = Object.keys(boats()).sort(), cur = $('boatName').value, known = bl.indexOf(cur) >= 0, c1 = meta.course, r1 = c1.race || {};
      h += '<div class="wzrace"><span class="wzk">Race</span><b>' + wizEsc(c1.name) + '</b><span class="note">' + courseNm(c1) + ' nm' + (r1.date2027 ? ' · ' + wizEsc(raceReady(r1, true)) : '') + '</span>' +
        '<div class="xrow"><button class="btn" id="wzRace">Change race</button><button class="btn" id="wzNew">New course</button></div></div>' +
        '<div class="wzboat"><span class="wzk">Boat</span>' +
        '<div class="row"><select id="wzMy" aria-label="Your boat">' + bl.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + wizEsc(x) + '</option>'; }).join('') + '<option value=""' + (known ? '' : ' selected') + '>' + (bl.length ? 'A new boat…' : 'Your boat') + '</option></select></div>' +
        (known ? '<p class="note">IRC TCC ' + (+$('tcc').value).toFixed(3) + ', ' + wizEsc($('boatType').options[$('boatType').selectedIndex].text) + ', ' + (window.FSSails ? FSSails.summary().sails : 0) + ' sails</p>' : '') +
        '<details id="wzMore"' + (known ? '' : ' open') + '><summary>' + (known ? 'Change the boat details' : 'Boat details') + '</summary>' +
        '<div class="row"><label for="wzName">Boat name</label><input type="text" id="wzName" value="' + wizEsc(known ? cur : '') + '" placeholder="For example Morning After" autocomplete="off"></div>' +
        '<div class="row"><label for="wzType">Boat type</label><select id="wzType">' + $('boatType').innerHTML + '</select></div>' +
        '<div class="row"><label for="wzTcc">IRC TCC</label><input type="number" id="wzTcc" step="0.001" min="0.7" max="2.2" inputmode="decimal" value="' + wizEsc($('tcc').value) + '"></div>' +
        '<div class="row"><label for="wzPct">Your speed</label><input type="number" id="wzPct" min="80" max="110" step="1" inputmode="numeric" value="' + Math.round((+$('tuUp').value + +$('tuReach').value + +$('tuRun').value) / 3) + '"><span class="note">% of the polar you expect to sail at (95 is typical for a well-sailed race)</span></div>' +
        '<div class="row"><label for="wzSails">Sails</label><select id="wzSails"><option value="">Keep my sails (' + (window.FSSails ? FSSails.summary().sails : 0) + ')</option><option value="asym">Asymmetric kites on a bowsprit</option><option value="sym">Symmetric spinnaker on a pole</option><option value="white">White sails only</option></select></div>' +
        '<label class="row" style="gap:8px"><input type="checkbox" id="wzReef"' + (window.FSSails && FSSails.summary().reef ? ' checked' : '') + '> Tell me when to reef</label>' +
        '<p class="note">Kept on this device; a boat code shares it with the crew. Your own polar file, exact sail ranges and reef points: Settings, any time.</p></details></div>';
      B.innerHTML = h + '</div>';
      $('wzType').value = $('boatType').value;
      $('wzMy').onchange = function () { if (!this.value) { $('wzMore').open = true; $('wzName').value = ''; $('wzName').focus(); return; } $('myBoat').value = this.value; $('myBoat').dispatchEvent(new Event('change')); store('fs-boatset', '1'); wizShow(1); };
      $('wzRace').onclick = function () { wizShow(2); };
      $('wzNew').onclick = function () { $('wiz').hidden = true; newCourse(); };
      $('wizNext').textContent = 'Next: the start';
    } else if (n === 3) {
      var cur = +$('startSel').value;
      h += '<h3>' + wizEsc(meta.course.name) + '</h3><p class="wlead">When does your class start? Give the exact time from the sailing instructions, in UTC: UK time in winter, one hour behind UK summer time.</p>' + startPickerHtml('wz', cur) +
        '<div id="wzFit"></div><p class="note">For a race further ahead, set it up now and choose the start nearer the day.</p>';
      B.innerHTML = h + '</div>';
      var fit = function () { var ep = startPickerRead('wz'); $('wzFit').innerHTML = ep === ep ? fitHtml(ep) : ''; $('wizNext').disabled = !(ep === ep); };
      $('wzDay').onchange = fit; $('wzTime').oninput = fit; fit();
      var order = startDayList();
      if (!order.length) { $('wizHint').textContent = 'No start times: the forecast has not loaded yet.'; }
    } else if (n === 4) {
      var mf = myFleet(), ent = (meta.fleet || []).filter(function (f) { return f.irc && f.start; });
      h += '<h3>Boats you are racing</h3><p class="wlead">Optional. Route sails each one along your route at its own TCC, so you can see who should be ahead on the water and on corrected time.</p>' +
        (ent.length ? '<p class="note">' + ent.length + ' boats from the entry list are already in.</p>' : '') +
        '<p class="note" id="wzMfN">' + (mf.length ? mf.length + ' added by you: ' + mf.map(function (f) { return wizEsc(f.name); }).join(', ') : 'None added yet.') + '</p>' +
        '<div class="mfadd"><input id="wzMfName" placeholder="Boat name" maxlength="40" aria-label="Boat name"><input id="wzMfTcc" type="number" inputmode="decimal" step="0.001" placeholder="TCC" aria-label="TCC"><button class="btn" id="wzMfAdd">Add</button></div>' +
        '<p class="note">Or paste the entry list, one boat per line with its TCC (for example <i>Jolly Jack, 1.021</i>):</p><textarea id="wzMfPaste" spellcheck="false" style="min-height:90px"></textarea>';
      B.innerHTML = h + '</div>';
      var redraw = function () { var a = myFleet(); $('wzMfN').textContent = a.length ? a.length + ' added by you: ' + a.map(function (f) { return f.name; }).join(', ') : 'None added yet.'; };
      $('wzMfAdd').onclick = function () { if (mfAdd($('wzMfName').value, $('wzMfTcc').value)) { $('wzMfName').value = ''; $('wzMfTcc').value = ''; redraw(); } else $('wizHint').textContent = 'Enter a name and a TCC, for example 1.021.'; };
    } else if (n === 5) {
      var c = meta.course, issue = courseIssue(c), bs = boatIsSet(), sl = window.FSSails ? FSSails.summary() : { sails: 0, reef: false };
      var ms = selectedModels().map(function (m) { return short(m); }), fl = myFleet().length + (meta.fleet || []).filter(function (f) { return f.irc && f.start; }).length;
      var pct = Math.round((+$('tuUp').value + +$('tuReach').value + +$('tuRun').value) / 3), tide = $('tideSel').options[$('tideSel').selectedIndex];
      var row = function (k, v, step, warn) { return '<div><b>' + k + '</b><span' + (warn ? ' class="warn"' : '') + '>' + v + '</span><button class="btn" data-go="' + step + '">Change</button></div>'; };
      h += '<h3>Check before routing</h3><p class="wlead">Everything Route will use. Change anything, or Route it.</p><div class="wcheck">' +
        row('Boat', bs ? wizEsc($('boatName').value || 'Your boat') + ', TCC ' + (+$('tcc').value).toFixed(3) + ', ' + pct + '% of the polar' : 'Generic boat: TCC ' + (+$('tcc').value).toFixed(3) + '. Set up your boat for a true answer.', 1, !bs) +
        row('Sails', sl.sails + ' sails' + (sl.reef ? ', reef points on' : ''), 1) +
        row('Race', wizEsc(c.name) + ', ' + courseNm(c) + ' nm' + (issue ? '. ' + wizEsc(issue) : ''), 2, !!issue) +
        row('Start', clockAbs(+$('startSel').value) + ' UTC' + (/class="fit no/.test(fitHtml($('startSel').value)) ? '. The race may outlast the forecasts.' : ''), 3, /class="fit no/.test(fitHtml($('startSel').value))) +
        row('Fleet', fl ? fl + ' boats' : 'None: optional', 4) +
        '<div><b>Forecasts</b><span>' + (ms.length ? ms.length + ' wind models (' + ms.join(', ') + '), tide: ' + (tide ? tide.textContent : 'none') : 'No wind model ticked') + '</span><button class="btn" id="wzFc">Change</button></div></div>';
      B.innerHTML = h + '</div>';
      [].forEach.call(B.querySelectorAll('[data-go]'), function (b) { b.onclick = function () { wizShow(+b.dataset.go); }; });
      $('wzFc').onclick = function () { $('wiz').hidden = true; $('setBtn').click(); var t = document.querySelector('.stabs .tab[data-s="fc"]'); if (t) t.click(); WIZ.back = 5; };
      if (issue || !ms.length) { $('wizNext').disabled = true; $('wizHint').textContent = issue ? 'This course cannot be routed on this page.' : 'Tick a wind model first.'; }
    }
    B.scrollTop = 0;
  }
  function wizNext() {
    var n = WIZ.step;
    if (n === 1) {
      var nm = $('wzName').value.trim(), tc = +$('wzTcc').value, pc = +$('wzPct').value;
      if (!(tc >= 0.7 && tc <= 2.2)) { wizErr(tc ? 'TCC ' + tc + ' is not an IRC TCC. Enter the TCC from your IRC certificate, between 0.700 and 2.200, for example 1.031.' : 'Enter the TCC from your IRC certificate, for example 1.031.', 'wzTcc'); return; }
      if (!(pc >= 50 && pc <= 120)) { wizErr('Your speed is a percentage of the polar: between 50 and 120, usually about 95.', 'wzPct'); return; }
      $('boatName').value = nm || 'My boat';
      if ($('wzType').value !== $('boatType').value) { $('boatType').value = $('wzType').value; $('boatType').dispatchEvent(new Event('change')); }
      $('tcc').value = tc.toFixed(3); $('tcc').dispatchEvent(new Event('input'));
      if (pc >= 80 && pc <= 110) ['tuUp', 'tuReach', 'tuRun'].forEach(function (id) { $(id).value = pc; $(id).oninput && $(id).oninput(); });
      if (window.FSSails) { if ($('wzSails').value) FSSails.usePreset($('wzSails').value); if ($('wzReef').checked !== FSSails.summary().reef) FSSails.reefs($('wzReef').checked); }
      $('boatSave').click(); store('fs-boatset', '1'); wizShow(3); return;
    }
    if (n === 3) { var ep3 = startPickerRead('wz'); if (!(ep3 === ep3)) return; setStart(ep3); startChosen(); wizShow(4); return; }
    if (n === 4) { var t = $('wzMfPaste').value; if (t.trim()) { $('mfPaste').value = t; $('mfPasteGo').click(); } wizShow(5); return; }
    if (n === 5) { wizClose(true); return; }
  }
  function wizInit() {
    $('wizX').onclick = function () { wizClose(false); };
    $('wizBack').onclick = function () { if (WIZ.step > 1) wizShow(WIZ.step === 3 ? 1 : WIZ.step - 1); };
    $('wizNext').onclick = wizNext;
    $('wizBarBack').onclick = function () { wizShow(1); };
    $('boatWarn').onclick = function () { wizOpen(1); };
    $('sheetX').addEventListener('click', function () { if (WIZ.on && WIZ.back) { var b = WIZ.back; WIZ.back = 0; setTimeout(function () { wizShow(b); }, 0); } });
    $('racesX').addEventListener('click', function () { if (WIZ.on && WIZ.step === 2) wizClose(false); });
    boatWarn();
  }
  /* after the race list loads: resume a set-up that moved to another forecast page, or start one for a first-time user */
  function wizBoot(qs) {
    var st = 0; try { st = +(sessionStorage.getItem('fs-wiz') || 0); } catch (e) {}
    if (st) { WIZ.on = true; S.wizHold = true; setTimeout(function () { wizShow((st <= 3) && (qs.get('race') || qs.get('my')) ? 1 : st); }, 300); return; }
    if (!store('fs-wizdone') && !qs.get('course') && !qs.get('my') && !qs.get('race') && !boatIsSet()) setTimeout(function () { wizOpen(1); }, 300);
  }
  var REGIONS = [];
  /* the forecast page whose whole-area box holds every point of a course, if there is one */
  function regionFor(c) { var pts = [c.start].concat(c.marks).concat([c.finish]); return REGIONS.filter(function (g) { var b = g.region; return READY[g.id] && pts.every(function (q) { return q.lat >= b.s && q.lat <= b.n && q.lon >= b.w && q.lon <= b.e; }); })[0] || null; }
  function racesInit() {
    fetch('../status.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { Object.keys(j.sources || {}).forEach(function (k) { READY[k.split(':')[0]] = true; }); }).catch(function () { READY[HERE] = true; });
    READY[HERE] = true;
    /* the race box next to the logo opens a short menu (Stuart 12 Nov): new course, saved routes, RORC races, edit */
    $('raceBtn').onclick = function (e) {
      var m = $('raceMenu'); if (!m.hidden) { m.hidden = true; return; }
      var n = myRaces().length + oldRoutes().length; $('rmSaved').textContent = '☰ Saved routes' + (n ? ' (' + n + ')' : '');
      var r = $('raceBtn').getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - 250, r.left)) + 'px'; m.style.top = (r.bottom + 6) + 'px'; m.style.bottom = ''; m.hidden = false; if (e) e.stopPropagation();
    };
    ['raceTitle', 'raceShort'].forEach(function (id) { $(id).onclick = function (e) { $('raceBtn').onclick(e); }; });   /* the name itself is a tap target, so a phone does not nudge the tap onto the start chip below it */
    document.addEventListener('click', function (e) { var m = $('raceMenu'); if (!m.hidden && !m.contains(e.target) && !$('raceBtn').contains(e.target)) m.hidden = true; });
    $('rmNew').onclick = function () { $('raceMenu').hidden = true; racesSheet('new'); $('races').hidden = false; };
    $('rmSaved').onclick = function () { $('raceMenu').hidden = true; racesSheet('saved'); $('races').hidden = false; };
    $('rmRorc').onclick = function () { $('raceMenu').hidden = true; if (store('fs-wizdone')) wizOpen(2); else { racesSheet('rorc'); $('races').hidden = false; } };
    $('rmEdit').onclick = function () { $('raceMenu').hidden = true; startEdit(courseCopy()); };
    $('dataChip').addEventListener('click', function (e) { e.stopPropagation(); });
    $('racesX').onclick = function () { $('races').hidden = true; };
    $('races').onclick = function (e) { if (e.target === $('races')) $('races').hidden = true; };
    $('edUndo').onclick = function () { S.edit.pts.pop(); editPrompt(); draw(); };
    $('edCancel').onclick = function () { S.edit = null; $('editBar').hidden = true; draw(); if (QS0.get('new') && !S.newDone) { S.newDone = true; run(); } };
    $('edDone').onclick = function () { if (S.edit.pts.length < 2) return; editForm(); };

  }
  /* course editor: any course, from the race list or your own. On the chart: tap to place points, drag any point to move it.
     In the list: names, rounding sides, positions typed as latitude and longitude, add, remove and reorder marks. */
  function fmtPos(v, ns) { var h = v < 0 ? ns[1] : ns[0], a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; if (m >= 59.995) { d++; m = 0; } return d + '°' + (m < 10 ? '0' : '') + m.toFixed(2) + '\'' + h; }
  function parsePos(t, lat) {   /* 50°38.24'N, 50 38.24 N, 50.6373, -1.65, 1 38.98W */
    t = String(t || '').trim().toUpperCase().replace(/[°'’′"″]/g, ' ').replace(/,/g, '.'); if (!t) return NaN;
    var neg = /[SW]/.test(t) || /^-/.test(t), n = (t.match(/\d+(\.\d+)?/g) || []).map(Number); if (!n.length) return NaN;
    var v = n.length === 1 ? n[0] : n[0] + n[1] / 60 + (n[2] || 0) / 3600; v = neg ? -v : v;
    return Math.abs(v) <= (lat ? 90 : 180) ? v : NaN;
  }
  /* a new course is drawn on the forecast area that will route it, so the wind, tide and depth are there when it is saved (Stuart 12 Nov) */
  function myRegion() { return REGIONS.filter(function (g) { return g.id === HERE; })[0] || null; }
  function newCourse() {
    var arc = archiveRoutes(); if (arc) { busy('Routes for ' + arc.name + ' kept under Races, Old routes'); setTimeout(function () { busy(''); }, 2500); }
    if (myRegion()) { startEdit(null); return; }
    var opts2 = REGIONS.filter(function (g) { return READY[g.id]; });
    if (opts2.length === 1) { goNew(opts2[0].id); return; }
    var AREA = { 'channel-area': 'From the Scillies to Dover, the Channel Islands and north Brittany', 'northsea-area': 'From the Thames Estuary to the Dutch and Belgian coasts', 'irishsea-area': "From St George's Channel to the North Channel, Wales to the east coast of Ireland", 'fastnet': 'From the Solent west past the Scillies to Fastnet Rock and the south coast of Ireland', 'biscay-area': 'From Ushant to Cape Finisterre, the French coast down to the Gironde' };
    $('raceList').innerHTML = '<h3>Where is the race?</h3><p class="note">Route draws your course on the forecast area that will route it, so the wind, tide and depth are ready when you save it.</p>' +
      opts2.map(function (g) { return '<div class="ritem"><div><b>' + g.name + '</b><span class="note">' + (AREA[g.id] || '') + '</span></div><div class="xrow"><button class="btn primary" data-newin="' + g.id + '">Draw here</button></div></div>'; }).join('') +
      '<p class="note">Further afield comes later.</p>';
    $('races').hidden = false;
    [].forEach.call($('raceList').querySelectorAll('[data-newin]'), function (b) { b.onclick = function () { goNew(b.dataset.newin); }; });
  }
  function goNew(id) { try { if (WIZ.on) sessionStorage.setItem('fs-wiz', ''); } catch (e) {} location.href = '../' + id + '/?new=1'; }
  function startEdit(c) {
    $('races').hidden = true; $('wizBar').hidden = true; closePanel(); $('cbanner').hidden = true; $('tip').hidden = true;
    S.edit = { name: c ? c.name : 'My course', pts: c ? [c.start].concat(c.marks).concat([c.finish]).map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name, side: p.side }; }) : [], closed: !!c };
    if (!c) S.drawnNew = true;
    if (!c) { var rg = { region: { s: 48.4, n: 55.3, w: -10.6, e: 5.4 } }; if (rg && rg.region) { var b = rg.region;   /* the whole of Route's waters: the Irish Sea, out past Fastnet Rock, the Channel and the southern North Sea (Biscay is a pan away) */ var cv = $('map').getBoundingClientRect(); $('editBar').hidden = false; var eb = $('editBar').getBoundingClientRect(), pn = $('panel') && !$('panel').hidden ? $('panel').getBoundingClientRect() : null;
        var top = Math.max(0, eb.bottom - cv.top + 6), bot = pn && pn.top > cv.top + 100 ? Math.min(H, pn.top - cv.top - 6) : H - 10, room = Math.max(120, bot - top);   /* fit between the edit bar and the panel */
        view.s = Math.max(20, Math.min(W / ((b.e - b.w) * K * 1.04), room / ((b.n - b.s) * 1.04))); view.lo = (b.w + b.e) / 2; view.la = (b.s + b.n) / 2 + ((top + bot) / 2 - H / 2) / view.s; S.routes = []; S.sel = null; } }   /* a new course: the whole area Route can route, nothing old on it */
    $('editBar').hidden = false; editPrompt(); draw();
  }
  function editPrompt() {
    var n = S.edit.pts.length;
    $('edTxt').textContent = S.edit.closed ? 'Drag any point to move it. Tap the chart to add a mark before the finish. Done for names, sides and positions.' :
      n === 0 ? 'Tap the chart to place the start.' : n === 1 ? 'Tap to add each mark in order, and the finish last. Drag a point to move it.' : n + ' points. Tap to add more, or Done: the last point is the finish.';
    $('edDone').disabled = n < 2; $('edUndo').disabled = !n;
  }
  function editOk(la, lo) {
    if (la < 35.5 || la > 61.5 || lo < -15 || lo > 12) { busy('Outside the routing area: cannot route there.'); setTimeout(function () { busy(''); }, 2500); return false; }
    var inAny = REGIONS.some(function (g) { var b = g.region; return READY[g.id] && la >= b.s && la <= b.n && lo >= b.w && lo <= b.e; });
    if (REGIONS.length && !inAny) { busy('Outside every forecast area (the dashed boxes): Route cannot route there yet.'); setTimeout(function () { busy(''); }, 3500); return false; }   /* any area will do: on saving, Route opens the course on the area that covers it */
    var z = P.depth ? P.depth.nearest('z', la, lo) : NaN; if (z > 0) { busy('That is land. Choose open water.'); setTimeout(function () { busy(''); }, 2000); return false; }
    return true;
  }
  function editTap(x, y) {
    var la = LA(y), lo = LO(x); if (!editOk(la, lo)) return;
    var q = { lat: +la.toFixed(5), lon: +lo.toFixed(5) };
    if (S.edit.closed && S.edit.pts.length >= 2) S.edit.pts.splice(S.edit.pts.length - 1, 0, q); else S.edit.pts.push(q);
    editPrompt(); draw();
  }
  function editHit(x, y) { var p = S.edit && S.edit.pts, best = -1, bd = 18; if (!p) return -1; p.forEach(function (q, i) { var d = Math.hypot(X(q.lon) - x, Y(q.lat) - y); if (d < bd) { bd = d; best = i; } }); return best; }
  function editDraw() {
    var p = S.edit.pts; if (!p.length) return;
    ctx.save(); ctx.strokeStyle = css['--route']; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 12px Inter, sans-serif';
    p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat), on = S.drag === i; ctx.beginPath(); ctx.arc(x, y, on ? 11 : 8, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--route']; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.fillStyle = css['--ink'];
      var lbl = i === 0 ? 'Start' : i === p.length - 1 && (p.length > 1) ? (S.edit.closed ? 'Finish' : 'Finish?') : 'Mark ' + i; ctx.fillText(q.name || lbl, x + 12, y - 10); });
    ctx.restore();
  }
  function editRead() {   // take what is typed in the list back into the points
    var p = S.edit.pts; if (!$('edName')) return true; var ok = true; S.edit.name = $('edName').value.trim() || 'My course';
    p.forEach(function (q, i) {
      var la = parsePos($('edLa' + i).value, true), lo = parsePos($('edLo' + i).value, false);
      if (isNaN(la) || isNaN(lo)) { ok = false; $('edLa' + i).classList.toggle('bad', isNaN(la)); $('edLo' + i).classList.toggle('bad', isNaN(lo)); return; }
      q.lat = +la.toFixed(5); q.lon = +lo.toFixed(5); q.name = $('edN' + i).value.trim(); if ($('edS' + i)) q.side = $('edS' + i).value;
    });
    return ok;
  }
  function editForm() {
    S.edit.closed = true; var p = S.edit.pts, h = '<div class="row"><label for="edName">Course name</label><input id="edName" value="' + (S.edit.name || 'My course').replace(/"/g, '&quot;') + '"></div>';
    h += '<p class="note">Positions as on the chart, for example 50°38.24\'N and 1°38.98\'W, or in decimal degrees (50.6373, -1.6497).</p>';
    p.forEach(function (q, i) {
      var kind = i === 0 ? 'Start' : i === p.length - 1 ? 'Finish' : 'Mark ' + i, mid = i > 0 && i < p.length - 1;
      h += '<div class="edpt"><div class="edhd"><b>' + kind + '</b><span class="edbtn">' + (mid ? '<button class="btn" data-up="' + i + '" aria-label="Move up">↑</button><button class="btn" data-dn="' + i + '" aria-label="Move down">↓</button><button class="btn" data-rm="' + i + '" aria-label="Remove ' + kind + '">Remove</button>' : '') + '</span></div>' +
        '<div class="edgrid"><input id="edN' + i + '" placeholder="Name" value="' + (q.name || kind).replace(/"/g, '&quot;') + '"><input id="edLa' + i + '" inputmode="text" aria-label="' + kind + ' latitude" value="' + fmtPos(q.lat, 'NS') + '"><input id="edLo' + i + '" inputmode="text" aria-label="' + kind + ' longitude" value="' + fmtPos(q.lon, 'EW') + '">' +
        (mid ? '<select id="edS' + i + '"><option value="port">to port</option><option value="starboard">to starboard</option></select>' : '<span></span>') + '</div></div>';
      if (i < p.length - 1) h += '<button class="btn edadd" data-add="' + (i + 1) + '">+ Add a mark here</button>';
    });
    /* when is the start: the exact class start, asked first so a new course always routes from the right start */
    var cur = $('startSel').value;
    var when = '<div class="edwhen"><b>When is the start?</b>' + startPickerHtml('ed', +cur) + '<p class="note" style="margin:6px 0 0">The exact class start, in UTC: UK time in winter, one hour behind UK summer time. Then Save and route.</p><div id="edFit"></div><input type="hidden" id="edStart" value="' + cur + '"></div>';
    h = when + h;
    var opts = '';
    h += '<p class="note">Starts run to ' + ($('startSel').options.length ? clockAbs(+$('startSel').options[$('startSel').options.length - 1].value) + ' UTC' : 'the end of the forecast') + ', as far as the forecasts allow the whole race to be routed. For a later race, save the course now and choose the start nearer the day.</p>';
    h += '<p class="note" id="edNm">' + courseNm({ start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }) + ' nm along the course. Saved on this device under My races.</p><div class="xrow"><button class="btn primary" id="edSave">Save and route</button><button class="btn" id="edMap">Edit on the chart</button><button class="btn" id="edCancel2">Cancel</button></div>';
    $('raceList').innerHTML = '<h3>Course</h3>' + h; $('races').hidden = false; $('editBar').hidden = true;
    var edC = function () { return { start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }; };
    var edFit = function () { var ep = startPickerRead('ed'); if (ep === ep) $('edStart').value = String(ep); if ($('edFit')) $('edFit').innerHTML = ep === ep ? fitHtml(ep, edC()) : ''; };
    if ($('edDay')) { $('edDay').onchange = edFit; $('edTime').oninput = edFit; edFit(); }
    $('raceList').scrollTop = 0;
    p.forEach(function (q, i) { if ($('edS' + i)) $('edS' + i).value = q.side || 'port'; });
    var redo = function (fn) { if (!editRead()) { busy('Check the positions marked in red.'); setTimeout(function () { busy(''); }, 2000); return; } fn(); editForm(); draw(); };
    [].forEach.call($('raceList').querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { redo(function () { p.splice(+b.dataset.rm, 1); }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-up]'), function (b) { b.onclick = function () { var i = +b.dataset.up; if (i > 1) redo(function () { var t = p[i]; p[i] = p[i - 1]; p[i - 1] = t; }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-dn]'), function (b) { b.onclick = function () { var i = +b.dataset.dn; if (i < p.length - 2) redo(function () { var t = p[i]; p[i] = p[i + 1]; p[i + 1] = t; }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-add]'), function (b) { b.onclick = function () { redo(function () { var i = +b.dataset.add, a = p[i - 1], c = p[i]; p.splice(i, 0, { lat: +((a.lat + c.lat) / 2).toFixed(5), lon: +((a.lon + c.lon) / 2).toFixed(5), side: 'port' }); }); }; });
    [].forEach.call($('raceList').querySelectorAll('.edgrid input'), function (el) { el.onchange = function () { if (editRead()) { $('edNm').textContent = courseNm({ start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }) + ' nm along the course. Saved on this device under My races.'; draw(); } }; });
    $('edMap').onclick = function () { if (!editRead()) return; $('races').hidden = true; $('wizBar').hidden = true; $('editBar').hidden = false; editPrompt(); draw(); };
    $('edCancel2').onclick = function () { S.edit = null; $('races').hidden = true; draw(); };
    $('edSave').onclick = function () {
      if (!editRead()) { busy('Check the positions marked in red.'); setTimeout(function () { busy(''); }, 2000); return; }
      if (p.length < 2) return;
      var bad = p.filter(function (q) { return q.lat < 35.5 || q.lat > 61.5 || q.lon < -15 || q.lon > 12; }); if (bad.length) { busy('Cannot route: a point is outside the routing area.'); setTimeout(function () { busy(''); }, 2500); return; }
      var pts = p.map(function (q, i) { return { name: q.name || (i === 0 ? 'Start' : i === p.length - 1 ? 'Finish' : 'Mark ' + i), lat: q.lat, lon: q.lon, side: i > 0 && i < p.length - 1 ? (q.side || 'port') : undefined }; });
      var c = { name: S.edit.name || 'My course', start: pts[0], marks: pts.slice(1, -1), finish: pts[pts.length - 1] };
      if ($('edDay') && !(startPickerRead('ed') === startPickerRead('ed'))) { busy('Check the start time.'); setTimeout(function () { busy(''); }, 2000); return; }
      var stv = $('edStart').value, keepId = S.myId; S.edit = null; applyCourseObj(asRace(c, keepId || undefined)); S.myId = keepId; setStart(+stv); var rec = saveMyRace(c.name); startChosen(); S.newDone = true; meta.course.race.id = rec.id;
      $('races').hidden = true; busy('Saved under My races. Routing ' + c.name + ' from ' + clockAbs(+stv) + ' UTC…');
      var issue = courseIssue(meta.course), reg = issue ? regionFor(c) : null;
      if (reg && reg.id !== HERE) {   /* outside this page's forecasts but inside a whole-area page: keep the course there and open it */
        var all = myRaces(); all.forEach(function (x) { if (x.id === rec.id) x.page = reg.id; }); setMyRaces(all);
        if (WIZ.on || S.drawnNew) { var nw = S.drawnNew; WIZ.on = true; WIZ.step = nw ? 1 : 4; wizSave(); }   /* a new course carries on through the set-up on the area that routes it */
        busy('Opening ' + c.name + ' on the ' + reg.name + ' forecasts…'); location.href = '../' + reg.id + '/?my=' + encodeURIComponent(rec.id); return;
      }
      if (issue) { busy(''); openTab('decision'); $('runNote').textContent = issue + (reg ? '' : ' No forecast area covers the whole course yet.'); } else { if (wizCourseChosen(true)) { busy(''); return; } S.from = null; run(); }
    };
  }
  function selectedModels() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.getAttribute('data-m'); }); }
  /* ---------- server pre-routes: the forecast job routes each race for the standard settings, so most users see routes at once ---------- */
  function loadPre() {
    S.pre = null;
    return fetch('pre/routes.json?b=' + encodeURIComponent(meta.built || meta.t0)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.built === (meta.built || meta.t0)) S.pre = j; }).catch(function () {});
  }
  function startPt() { return S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 }; }
  function liteKey(base, st) { return JSON.stringify([base.polKey, Math.round(st.t * 100), st.lat.toFixed(4), st.lon.toFixed(4), meta.course.raceId || '', meta.course.marks.map(function (m) { return (m.side || '') + m.lat.toFixed(3) + m.lon.toFixed(3); }), meta.course.finish.lat.toFixed(3) + meta.course.finish.lon.toFixed(3), base.tackS, base.gybeS, base.safety, base.sea.up, base.sea.reach, base.sea.surf, base.adj].concat(base.tideWind === false ? ['ground wind'] : [])); }
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
  function earlyPre() { if (startGate() || S.wizHold) return; var h = preEntry(false); if (h && !S.routes.length) { try { usePre(h, true); } catch (e) {} } }
  function show() {
    busy(''); matrix(); plan(); fleetTable(); if (!$('layers').hidden) layersPop();
    var maxT = Math.max.apply(null, S.routes.map(function (s) { return s.r.finish; }));
    S.tmin = Math.min(S.start.t, (starts[0] - T0) / 3600); S.tmax = Math.min(HMAX(), maxT + 1);
    try { setTime(S.from ? S.from.t : S.start.t); } catch (e) { draw(); }
  }
  window.__fsDump = function () { return S.key ? { key: S.key, routes: S.routes.map(function (s) { return { id: s.id, name: s.name, models: s.models, combined: !!s.combined, best: !!s.best, mean: s.mean, worst: s.worst, r: s.r }; }), matrix: S.matrix } : null; };
  function run() {
    if (S.running || S.wizHold || S.edit || QS0.get('new') && !S.newDone) return;   /* drawing a new course: nothing routes until it is saved */
    if (startGate()) { busy(''); if (!WIZ.on) { WIZ.on = true; S.wizHold = true; boatWarn(); wizShow(1); } return; }
    if (!$('startSel').value && $('startSel').options.length) $('startSel').selectedIndex = 0;   /* never route from 1 January 1970 */
    S.ens = null; if ($('ensOut')) $('ensOut').innerHTML = '';   /* an ensemble belongs to the routes it was run with */
    if (!S.from) S.to = null;   /* routing to a tapped point lasts until the next ordinary route */
    var ms = selectedModels(); if (!ms.length) { openTab('decision'); $('runNote').textContent = 'Tick at least one downloaded wind model in Settings, Forecasts.'; return; }
    if (!P.depth) { openTab('data'); $('dlNote').textContent = 'Download the seabed depth first: the router needs it to keep off the land.'; return; }
    var issue = courseIssue(meta.course); if (issue) { openTab('decision'); $('runNote').textContent = issue; busy(issue); setTimeout(function () { busy(''); }, 4000); return; }
    if (S.resume && !S.from) { var rs = S.resume; S.resume = null; if (rs.rk !== raceKey() || rs.startVal !== $('startSel').value) { S.startChosen = false; if (startGate()) return run(); } else { S.running = true; chipStart(); sessRestore(rs).then(function () { S.running = false; sessAsk(); }, function () { S.running = false; S.routes = []; run(); }); return; } }
    var hit = !S.preBad && preEntry(true); if (hit) { S.running = true; usePre(hit, false).then(function () { S.running = false; setTimeout(sessSave, 0); }, function (e) { S.running = false; S.preBad = true; console.warn('pre-route failed, routing fresh', e && e.message); run(); }); return; }
    S.running = true; busy(''); S.key = null; var gen = S.gen = (S.gen || 0) + 1;   /* a newer run, or a new course, abandons this one */
    var tq = Date.now(), estQ = +(store('fs-estQ-' + raceKey()) || 0), estF = +(store('fs-estF-' + raceKey()) || 0);
    pass(true).then(function () { return pass(false); }).then(function () { if (gen !== S.gen) return; S.running = false; setTimeout(sessSave, 0); prog(''); busy(''); store('fs-estF-' + raceKey(), String(Math.round((Date.now() - tq) / 1000 - (+S.quickS || 0)))); $('runNote').textContent += ' First answer in ' + S.quickS + ' s.'; })
    .catch(function (e) { if (e && e.abandoned || gen !== S.gen) return; S.running = false; busy(''); prog(''); openTab('decision'); var fromFail = !!S.from; S.from = null; $('runNote').textContent = (fromFail ? 'Could not route from that point: ' : '') + e.message + (fromFail ? ' Route again goes back to the start.' : ''); errShow('Route could not finish: ' + e.message); draw(); });
    function pass(quick) {
    var start = S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 };
      var legs = legsFor(S.from), base = opts(ms), t0 = Date.now(); if (!quick) S.lastReq = { base: base, start: start, legs: legs };
      if (quick) Object.assign(base, { dt: 1200, hstep: 10, sectors: 180 });   /* quick first pass: about a sixth of the work */
      var sets = ms.map(function (m) { return { id: m, name: layer(m).name, models: [m] }; });
      if (ms.length > 1) sets.push({ id: 'all', name: 'Combined (' + ms.length + ' models)', models: ms, combined: true });
      var FINE = ['ukv', 'arome', 'icon', 'arpege', 'ecmwf', 'mog', 'om', 'gfs', 'aifs'], chain = FINE.filter(function (m) { return ms.indexOf(m) >= 0; });   /* finest first: each model where it is sharpest, handing over as it ends */
      if (chain.length > 1) sets.push({ id: 'chain', name: 'Finest first (' + chain.map(short).join(', ') + ')', models: ['chain'].concat(chain) });
      var jobs = sets.length * 2 + ms.length, done = 0, title = quick ? 'Step 1 of 2: first routes' : 'Step 2 of 2: refining the routes';
      var tick = function () { if (gen !== S.gen) return; done++; prog(title, done / jobs, done <= sets.length ? 'Routing ' + Math.min(done, sets.length) + ' of ' + sets.length + ' models' : 'Checking each route in every model', quick ? estQ : estF); };
      prog(title, 0.02, 'Routing 0 of ' + sets.length + ' models' + (quick ? '' : '. You can use the first routes meanwhile.'), quick ? estQ : estF);
      return Promise.all(sets.map(function (s) { return pool({ type: 'route', o: Object.assign({}, base, { models: s.models, start: start, legs: legs }) }).then(function (r) { tick(); s.r = r; return s; }, function (e) { tick(); s.err = e.message; return s; }); })).then(function (res) {
        if (gen !== S.gen) throw { abandoned: true };
        S.routes = res.filter(function (s) { return s.r; });
        var errs = res.filter(function (s) { return s.err; });
        if (!S.routes.length) throw new Error(errs.length ? errs[0].err : 'No route found.');
        var selfJobs = S.routes.map(function (s) { return pool({ type: 'sail', o: Object.assign({}, base, { models: s.models }), paths: [s.r.path] }).then(function (x) { tick(); return x; }); });
        return Promise.all(ms.map(function (m) { return pool({ type: 'sail', o: Object.assign({}, base, { models: [m] }), paths: S.routes.map(function (s) { return s.r.path; }) }).then(function (x) { tick(); return x; }); }).concat(selfJobs)).then(function (allr) { if (gen !== S.gen) throw { abandoned: true };
          var cols = allr.slice(0, ms.length), self = allr.slice(ms.length).map(function (x) { return x[0]; });
          S.routes.forEach(function (s, i) { var k = (s.r.finish - start.t) / Math.max(0.1, self[i] - start.t); cols.forEach(function (c) { c[i] = start.t + (c[i] - start.t) * k; }); });
          S.matrix = { models: ms, cols: cols, start: start.t };
          S.routes.forEach(function (s, i) { var v = cols.map(function (c) { return c[i]; }); s.mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length; s.worst = Math.max.apply(null, v); });
          var rank = function (x) { return x.r.partial ? 1e6 + x.r.partial.togo : x.mean; };   /* a route cut short by the end of the forecasts ranks by distance still to sail */
          var best = S.routes.slice().sort(function (a, b) { return rank(a) - rank(b); })[0];
          S.routes.forEach(function (s) { s.best = s === best; });
          S.sel = best; S.base = base; S.legs = legs; S.start = start;
          var part = S.routes.filter(function (x) { return x.r.partial; });
          $('runNote').textContent = (quick ? 'Quick route in ' : 'Routed in ') + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (quick ? '. Refining…' : '') + (errs.length ? '. ' + errs.map(function (e) { return e.name + ': ' + e.err; }).join(' ') : '.') + (part.length ? ' The forecasts end before the finish on ' + (part.length === S.routes.length ? 'every route' : part.length + ' routes') + ': they show as far as the forecasts reach, with the distance still to sail. Choose an earlier start for a full route.' : '') + (S.to ? ' These routes go from the boat to the point you tapped. Route again goes back to the course.' : '');
          return ghosts();
        });
      }).then(function () {
        show(); if (!quick && !S.from) S.key = fullKey(Object.assign({}, base, { models: ms }), start);
      }).then(function () { if (quick) { S.quickS = ((Date.now() - tq) / 1000).toFixed(1); store('fs-estQ-' + raceKey(), String(Math.round(+S.quickS))); } });
    }
  }
  var TS = typeof WeakMap === 'function' ? new WeakMap() : null;
  function tsOf(path) { if (!TS) return path.map(function (q) { return q.t; }); var a = TS.get(path); if (!a) { a = path.map(function (q) { return q.t; }); TS.set(path, a); } return a; }   /* one times array per route, not one per frame */
  /* boats you are racing, added by hand, pasted from an entry list or picked from AIS; kept on this device for each race */
  function mfKey() { return 'fs-fleet-' + raceKey(); }
  function myFleet() { try { return JSON.parse(store(mfKey()) || '[]') || []; } catch (e) { return []; } }
  function setMyFleet(a) { store(mfKey(), JSON.stringify(a)); mfShow(); ghosts().then(function () { fleetTable(); draw(); }, function (e) { console.error('fleet', e && e.message); }); if (AIS.src !== 'off') aisUpdate(); }
  function mfAdd(name, tcc, mmsi) {
    name = String(name || '').trim(); tcc = +tcc; if (!name || !(tcc >= 0.7 && tcc <= 2.2)) return false;
    var a = myFleet().filter(function (f) { return f.name.toUpperCase() !== name.toUpperCase() && (!mmsi || f.mmsi !== mmsi); }); a.push({ name: name, tcc: tcc, mmsi: mmsi || null }); setMyFleet(a); return true;
  }
  function mfShow() {
    var a = myFleet(), esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    $('mfList').innerHTML = a.length ? a.map(function (f, i) { return '<div class="mfrow"><b>' + esc(f.name) + '</b><span>TCC ' + f.tcc.toFixed(3) + (f.mmsi ? ' · AIS' : '') + '</span><button class="slb" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '">✕</button></div>'; }).join('') : '<p class="note">None added yet.</p>';
    [].forEach.call($('mfList').querySelectorAll('button'), function (b) { b.onclick = function () { var x = myFleet(); x.splice(+b.dataset.i, 1); setMyFleet(x); }; });
  }
  function mfInit() {
    var exSync = function () { var v = +$('startSel').value; if (v) $('startExact').value = hhmm(v); };
    $('startSel').addEventListener('change', exSync); setTimeout(exSync, 0);
    $('startExact').onchange = function () { var d = Math.floor(+$('startSel').value / 86400) * 86400, ep = exactEpoch(d, this.value), e = startCheck(ep); $('startExactErr').textContent = e; if (!e) { setStart(ep); startChosen(); } };
    $('startSel').addEventListener('change', function () { var l = lastGet(); if (l) { l.start = $('startSel').value; store('fs-last-' + HERE, JSON.stringify(l)); } });
    $('startSel').addEventListener('change', function (e) { if (e.isTrusted && !$('sheet').hidden) startChosen(); chipStart(); });   /* a start picked by hand in Settings counts as chosen */
    $('startChip').onclick = function (e) { e.stopPropagation(); if (!WIZ.on) { WIZ.on = true; S.wizHold = true; boatWarn(); } wizShow(3); };
    chipStart();
    $('mfAdd').onclick = function () { if (mfAdd($('mfName').value, $('mfTcc').value)) { $('mfName').value = ''; $('mfTcc').value = ''; $('mfName').focus(); } else { busy('Enter a name and a TCC between 0.5 and 2, for example 1.021.'); setTimeout(function () { busy(''); }, 2500); } };
    $('mfPasteGo').onclick = function () {
      var a = myFleet(), n = 0;
      $('mfPaste').value.split(/\r?\n/).forEach(function (l) { var m = /^(.*?)[\s,;\t]+([01]\.\d{2,4})\s*$/.exec(l.trim()); if (!m) return; var nm = m[1].replace(/[,;\t]+$/, '').trim(); a = a.filter(function (f) { return f.name.toUpperCase() !== nm.toUpperCase(); }); a.push({ name: nm, tcc: +m[2], mmsi: null }); n++; });
      setMyFleet(a); $('mfPaste').value = ''; busy(n + ' boats added.'); setTimeout(function () { busy(''); }, 2000);
    };
    mfShow();
  }
  function ghosts() {
    if (!S.sel) return Promise.resolve();
    var boats = meta.fleet.filter(function (f) { return f.irc && f.start; }).map(function (f) { return { name: f.name, tcc: f.tcc, start: meta.live ? S.start.t : Math.max((f.start - T0) / 3600, S.from ? S.start.t : -1), f: f }; });
    var have = {}; boats.forEach(function (b) { have[b.name.toUpperCase()] = 1; });
    myFleet().forEach(function (m) { if (!have[m.name.toUpperCase()]) boats.push({ name: m.name, tcc: m.tcc, start: S.start.t, f: { name: m.name, tcc: m.tcc, mine: true, mmsi: m.mmsi } }); });
    return pool({ type: 'times', o: Object.assign({}, S.base, { models: S.sel.models }), path: S.sel.r.path, boats: boats.map(function (b) { return { tcc: b.tcc, start: b.start }; }) }).then(function (ts) {
      S.ghosts = boats.map(function (b, i) { return { name: b.name, tcc: b.tcc, f: b.f, ts: ts[i] }; });
    });
  }

  /* ---------- results ---------- */
  function swatch(s) { var st = s.combined ? ['--route', []] : STYLE[s.id]; return '<span class="sw" style="border-color:var(' + st[0] + ');border-top-style:' + (st[1].length ? 'dashed' : 'solid') + ';margin-right:6px;vertical-align:middle"></span>'; }
  /* ---------- compare routes: point of sail, worst conditions and crew work for each route ---------- */
  function routeStats(s) {
    var p = s.r.path, cr = sailsList(), mr = mainsList(), st = { up: 0, reach: 0, down: 0, maxW: 0, maxWt: 0, maxS: 0, nm: 0, sails: 0, reefs: 0, man: 0 }, last = null, side = 0, lastR = null;
    for (var i = 1; i < p.length; i++) {
      var q = p[i], a = p[i - 1], dt = q.t - a.t, twa = Math.abs(q.twa || 0);
      if (twa < 60) st.up += dt; else if (twa > 120) st.down += dt; else st.reach += dt;
      if ((q.tws || 0) > st.maxW) { st.maxW = q.tws; st.maxWt = q.t; }
      if ((q.hs || 0) > st.maxS) st.maxS = q.hs;
      st.nm += FSRouter.dist(a.la, a.lo, q.la, q.lo);
      var sl = FSRouter.sailFor(q, cr);   /* a change counts once the new sail has been up for half an hour */
      if (sl && sl !== last) { if (sl !== st.cand) { st.cand = sl; st.candT = q.t; } else if (q.t - st.candT >= 0.5) { if (last) st.sails++; last = sl; st.cand = null; } } else st.cand = null;
      var rf = mr.length ? reefOf(q, mr) || 'full' : null;   /* the same half-hour rule for reefs */
      if (rf && rf !== lastR) { if (rf !== st.rc) { st.rc = rf; st.rcT = q.t; } else if (q.t - st.rcT >= 0.5) { if (lastR) st.reefs++; lastR = rf; st.rc = null; } } else st.rc = null;
      var sd = (q.twa || 0) < 0 ? -1 : 1; if (side && sd !== side) st.man++; side = sd;
    }
    var T = st.up + st.reach + st.down || 1; st.upP = st.up / T; st.reachP = st.reach / T; st.downP = st.down / T;
    return st;
  }
  function compareTable() {
    if (!S.routes || !S.routes.length) { $('compare').innerHTML = ''; return; }
    var R = S.routes.map(function (s) { return { s: s, st: routeStats(s) }; }), pc = function (x) { return Math.round(x * 100) + '%'; };
    var rows = [['Finish', function (x) { return clockH(x.s.r.finish).slice(4); }], ['Elapsed', function (x) { return fmtH(x.s.r.finish - S.start.t); }], ['Distance sailed', function (x) { return Math.round(x.st.nm) + ' nm'; }],
      ['Upwind', function (x) { return pc(x.st.upP); }], ['Reaching', function (x) { return pc(x.st.reachP); }], ['Downwind', function (x) { return pc(x.st.downP); }],
      ['Most wind', function (x) { return x.st.maxW.toFixed(0) + ' kn, ' + clockH(x.st.maxWt).slice(4, 13); }], ['Biggest sea', function (x) { return x.st.maxS ? x.st.maxS.toFixed(1) + ' m' : '-'; }],
      ['Sail changes', function (x) { return x.st.sails; }]].concat(mainsList().length ? [['Reefs in or out', function (x) { return x.st.reefs; }]] : []).concat([ ['Tacks and gybes', function (x) { return x.st.man; }]]);
    var h = '<tr><th></th>' + R.map(function (x) { return '<th>' + swatch(x.s) + (x.s.combined ? 'Comb.' : short(x.s.id)) + '</th>'; }).join('') + '</tr>';
    rows.forEach(function (r) { h += '<tr><td style="font-family:var(--f-body)">' + r[0] + '</td>' + R.map(function (x) { return '<td' + (x.s === S.sel ? ' class="best"' : '') + '>' + r[1](x) + '</td>'; }).join('') + '</tr>'; });
    $('compare').innerHTML = h;
  }
  function matrix() {
    var M = S.matrix; if (!M) return;
    var mins = M.models.map(function (m, j) { return Math.min.apply(null, M.cols[j]); });
    var h = '<tr><th>Route</th><th>Finish</th>' + M.models.map(function (m) { return '<th>in ' + short(m) + '</th>'; }).join('') + '<th>Average</th><th>Worst</th></tr>';
    S.routes.forEach(function (s, i) {
      h += '<tr class="click' + (s === S.sel ? ' sel' : '') + '" data-i="' + i + '"><td style="font-family:var(--f-body)">' + swatch(s) + (s.combined ? 'Combined' : short(s.id)) + (s.best ? ' <span class="pill">best</span>' : '') + '</td><td style="white-space:nowrap">' + (s.r.partial ? '<b>' + s.r.partial.togo + ' nm</b><br><span style="color:var(--muted)">to go</span>' : '<b>' + clockH(s.r.finish).slice(0, 3) + ' ' + clockH(s.r.finish).slice(-5) + '</b><br><span style="color:var(--muted)">' + fmtH(s.r.finish - M.start) + '</span>') + '</td>' +
        M.models.map(function (m, j) { return '<td class="' + (Math.abs(M.cols[j][i] - mins[j]) < 1e-6 ? 'best' : '') + '">' + fmtH(M.cols[j][i] - M.start) + '</td>'; }).join('') +
        '<td class="' + (s.best ? 'best' : '') + '">' + fmtH(s.mean - M.start) + '</td><td>' + fmtH(s.worst - M.start) + '</td></tr>';
    });
    $('matrix').innerHTML = h; compareTable();
    [].forEach.call($('matrix').querySelectorAll('tr.click'), function (tr) { tr.onclick = function () { S.sel = S.routes[+tr.dataset.i]; ghosts().then(function () { matrix(); plan(); fleetTable(); update(); }); }; });
    var best = S.routes.find(function (s) { return s.best; }), fins = S.routes.map(function (s) { return s.r.finish; }), spread = Math.max.apply(null, fins) - Math.min.apply(null, fins);
    var comb = S.routes.find(function (s) { return s.combined; });
    var fastT = Math.min.apply(null, S.routes.filter(function (s) { return !s.r.partial; }).map(function (s) { return s.r.finish; }).concat([Infinity]));
    $('finBox').innerHTML = S.routes.map(function (s) { var fast = !s.r.partial && s.r.finish === fastT; return '<div class="fin' + (s.combined ? ' comb' : '') + (fast ? ' fast' : '') + '"' + (fast ? ' title="Fastest model"' : '') + '>' + (fast ? '<i class="fastTag">❯❯ Fastest</i>' : '') + swatch(s) + '<span>' + (s.combined ? 'Combined (all models)' : short(s.id)) + '</span>' + (s.r.partial ? '<b>' + s.r.partial.togo + ' nm to go</b><em>forecast ends ' + clockH(s.r.finish).slice(4) + '</em>' : '<b>' + clockH(s.r.finish).slice(4) + '</b><em>' + fmtH(s.r.finish - M.start) + '</em>') + '</div>'; }).join('');
    $('decNote').innerHTML = 'Each row is a route; each column times it in one model’s wind, from ' + (S.from ? 'the chosen point' : 'your start') + '. The <b>' + (best.combined ? 'combined' : short(best.id)) + '</b> route loses least on average if the forecast is wrong. The models’ own best times differ by ' + fmtH(spread) + (spread > 2 ? ': low confidence.' : '.') + ' Tap a row to show it.';
  }
  function sailsList() { return FSRouter.parseCrossover($('sails').value); }
  function mainsList() { return FSRouter.parseCrossover($('mains').value); }
  function reefOf(q, mr) { var m = (mr || mainsList()).length ? FSRouter.sailFor(q, mr || mainsList()) : ''; return m && !/^full/i.test(m) ? m : ''; }
  function rig(q, cr, mr) { var sl = FSRouter.sailFor(q, cr || sailsList()), m = reefOf(q, mr); return (sl || '-') + (m ? ', ' + m.toLowerCase() : ''); }
  function plan() {
    var s = S.sel; if (!s) return;
    var cr = sailsList(), mr = mainsList(), p = s.r.path, rows = [], cur = null;
    for (var i = 1; i < p.length; i++) {
      var q = p[i], sail = rig(q, cr, mr);
      if (!cur || cur.sail !== sail || cur.leg !== q.leg) { cur = { sail: sail, leg: q.leg, t0: p[i - 1].t, n: 0, hx: 0, hy: 0, tws: 0, twa: 0, bsp: 0, tacks: 0 }; rows.push(cur); }
      cur.t1 = q.t; cur.n++; cur.hx += Math.sin(q.hdg * R); cur.hy += Math.cos(q.hdg * R); cur.tws += q.tws; cur.twa += Math.abs(q.twa); cur.bsp += q.bsp; cur.sog = (cur.sog || 0) + Math.hypot(q.bsp * Math.sin(q.hdg * R) + (q.cu || 0), q.bsp * Math.cos(q.hdg * R) + (q.cv || 0)); if (q.tack) cur.tacks++;
    }
    rows = rows.filter(function (r, i) { return r.t1 - r.t0 >= 0.33 || i === 0; });
    var h = '<tr><th>From</th><th>Sail</th><th>Hdg</th><th>TWS</th><th>TWA</th><th>BSP</th><th>SOG</th><th>Tacks</th></tr>', leg = -1;
    rows.forEach(function (r) {
      if (r.leg !== leg) { leg = r.leg; h += '<tr><td colspan="8" style="font-family:var(--f-body);color:var(--muted)">To ' + S.legs[Math.min(leg, S.legs.length - 1)].name + '</td></tr>'; }
      h += '<tr><td>' + clockH(r.t0).slice(4) + '</td><td style="font-family:var(--f-body)">' + r.sail + '</td><td>' + pad(Math.atan2(r.hx, r.hy) / R) + '°</td><td>' + (r.tws / r.n).toFixed(1) + '</td><td>' + Math.round(r.twa / r.n) + '°</td><td>' + (r.bsp / r.n).toFixed(1) + '</td><td>' + ((r.sog || 0) / r.n).toFixed(1) + '</td><td>' + r.tacks + '</td></tr>';
    });
    s.r.arrivals.forEach(function (a) { h += '<tr><td>' + clockH(a.t).slice(4) + '</td><td colspan="7" style="font-family:var(--f-body)"><b>' + a.name + '</b> · ' + fmtH(a.t - S.start.t) + ' elapsed</td></tr>'; });
    $('plan').innerHTML = h; if (window.FSSails) FSSails.draw();
  }
  /* ---------- help: text and a spoken run-through, using the device's own speech (free, works offline) ---------- */
  var HELP = [
    ['What Route does', 'Route works out the fastest way round the race course for your boat, in each forecast model, with the tide. It routes as soon as you open it, again when new forecasts arrive, and again when you close Settings after a change. Route again, at the top of Routes, forces it. A planning aid, not for navigation.'],
    ['Routes', 'The boxes at the top give the finish time for each model\'s route and for the combined route. The table below sails every route through every model: the best route is the one that loses least if the forecast is wrong. Tap a row or a box to show that route on the chart.'],
    ['Play the race', 'Press the play button to watch the boat sail the chosen route. The strip along the bottom gives heading, boat speed, wind angle and speed, the sail and the sea state at each moment. Choose the speed under Settings, Display.'],
    ['Plan', 'The Plan tab turns the chosen route into a sailing plan: when to change sail, the heading, wind and boat speed for each part, and the time at each mark. Save GPX puts the route on your plotter; How to load it explains the steps for your make.'],
    ['Setting up a race', 'The first time, Route takes you through five steps: your boat, the race, the start, the boats you are racing, then a check card before it routes. After that, tap the race name at the top to set up the next race the same way. A new course drawn outside this page\'s forecasts moves to the area page that covers it. Until your boat is set up, an orange note says Route is using a generic boat.'],
    ['Routing while racing', 'Press From here: Route finds the boat by the phone or tablet GPS and routes from there, from now. If there is no GPS, tap the chart where the boat is. To keep the route fresh, Settings, Course, While racing: choose Every 10, 20 or 30 minutes and Route routes again from the new position on that timer while the screen is on.'],
    ['Route to any point', 'Tap the water anywhere on the chart (click on a computer) and choose Route here from the boat: Route works out the routes from where the boat is at the slider time to that point, in every model. Useful for a waypoint, a tidal gate or a what-if. Route again goes back to the course.'],
    ['Family and friends', 'Settings, Course, While racing: tick Let family and friends follow the boat, then Send the follow link. While Route is open on a crew phone with a boat code, it sends the boat\'s GPS position every five minutes and the chosen route. The link opens a simple map with the track so far, the planned route and the finish time. Only people with the code can see it.'],
    ['Isochrones', 'Layers, Isochrones of the chosen route. Each line is how far the boat could have got by that hour, sailing its fastest in every direction from the start or the last mark. The line nearest the slider time is drawn brighter, and every sixth hour is labelled. Where the lines bunch up, the boat is slow; where they bulge, the wind or tide is helping.'],
    ['Follow the boat', 'The button with the boat in a frame, beside the replay speed. When it is lit, moving the time slider or playing the race keeps the boat in the middle of the chart. Drag the chart to look elsewhere and it switches off; tap it to follow again.'],
    ['Your sails and reefs', 'Settings, Sails. Copy each sail from your sail log: the true wind angles and true wind speeds you use it in. Rows are checked from the top and the first that fits wins. Tick Show when to reef and enter the wind speed for each reef, upwind and downwind. The crossover chart colours each sail, marks the reefs and puts this route\'s winds on it as dots, so you can see any wind with no sail set. You can paste a chart grid from Expedition, PredictWind or SailGrib under Edit as text.'],
    ['Your boat', 'Settings, Boat. Pick a boat type, enter your TCC, or load your own polar. The three sliders tune the polar upwind, reaching and downwind: 95 percent means you expect to sail at 95 percent of the polar.'],
    ['If you think the forecast is wrong', 'Settings, Boat, below the tuning sliders. Shift the wind direction, change its strength, or make a front arrive earlier or later. You can do the same for the tide if you know the area better than the model. To change only part of the race, set Where to an area, tap Draw the area and tap two opposite corners on the chart: the change applies inside it and fades out over 3 nm. Close Settings and Route works it out again; Back to the forecast undoes it.'],
    ['Route from where you are', 'The target button reroutes from the boat\'s position now. On a phone or tablet it uses the GPS; otherwise tap the chart where the boat is.'],
    ['New forecasts', 'Route checks for new forecasts every few minutes. When one arrives, a button appears: New data, update routing. The Data tab shows each model\'s run time, when the server got it and how old it is.'],
    ['Ask Route', 'In the Plan tab, Ask Route answers set questions from the chosen route at the replay time: the next mark, the next tack or gybe, the next sail change, the biggest wind shift in the next 12 hours, and what the tide is doing. Read it out speaks the answer.'],
    ['Send to the crew', 'Plan tab, Send to crew. On a phone choose WhatsApp, Messages or email. The message carries the finish times, the first legs and a link that opens the same course and start in Route on their phones.'],
    ['AIS', 'Settings, Display, AIS. Test fleet shows emulated race boats and ships to try the screens; Live online shows real AIS from shore stations when you have signal. The Fleet tab lists every target with range, bearing, CPA and time to CPA; a target inside the CPA alarm flashes red and beeps.'],
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
    var PIC = { 'What Route does': 'overview', 'Routes': 'decision', 'Play the race': 'bar', 'Plan': 'plan', 'Setting up a race': 'setup', 'Your sails and reefs': 'sails', 'Your boat': 'boat', 'Routing while racing': 'course', 'Fleet': 'fleet' };
    $('helpList').innerHTML = HELP.map(function (h, i) { return '<div class="htopic"><h3>' + h[0] + '<button class="btn say" data-say="' + i + '">Listen</button></h3><p>' + h[1] + '</p>' + (PIC[h[0]] ? '<img class="hpic" loading="lazy" alt="Screen picture: ' + h[0] + '" src="../help/' + PIC[h[0]] + '.webp">' : '') + '</div>'; }).join('');
    [].forEach.call(document.querySelectorAll('[data-say]'), function (b) { b.onclick = function () { say([+b.dataset.say]); }; });
    $('sayAll').onclick = function () { say(HELP.map(function (h, i) { return i; })); };
    $('sayStop').onclick = sayStop;
    $('helpBtn').onclick = function () { $('help').hidden = false; };
    if ($('setHelp')) $('setHelp').onclick = function () { $('sheetX').click(); $('help').hidden = false; };   /* on phones Help lives in Settings, to give the race name room (Stuart 12 Nov) */
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
    if (!S.sel) { $('xNote').textContent = 'Route first, then pick a route under Routes.'; return; }
    var x = xFile(kind), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([x.text], { type: x.type })); a.download = x.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $('xNote').textContent = 'Saved ' + x.name + (x.n ? ' (' + x.n + ' waypoints)' : '') + '.';
  }
  function xInit() {
    $('xGpx').onclick = function () { xSave('gpx'); }; $('xKml').onclick = function () { xSave('kml'); };
    $('xHelpBtn').onclick = function () { var h = $('xHelp'); h.hidden = !h.hidden; this.setAttribute('aria-expanded', String(!h.hidden)); };
    try { if (navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.gpx', { type: 'application/gpx+xml' })] })) $('xShare').hidden = false; } catch (e) {}
    $('xShare').onclick = function () {
      if (!S.sel) { $('xNote').textContent = 'Route first, then pick a route under Routes.'; return; }
      var x = xFile('gpx'); navigator.share({ files: [new File([x.text], x.name, { type: x.type })], title: xName() }).catch(function (e) { if (e && e.name !== 'AbortError') $('xNote').textContent = 'Sharing did not work here: use Save GPX.'; });
    };
  }
  function fleetTable() {
    if (!S.ghosts || !S.sel) return;
    var myCor = (S.sel.r.finish - S.start.t) * (+$('tcc').value || 1), path = S.sel.r.path, me = posAt(tsOf(path), path, S.t);
    var rows = S.ghosts.map(function (g) { var fin = g.ts[g.ts.length - 1], pos = posAt(g.ts, path, S.t); return { g: g, fin: fin, cor: (fin - g.ts[0]) * g.tcc, gap: me && pos ? FSRouter.dist(me.la, me.lo, pos.la, pos.lo) * (pos.k > me.k ? 1 : -1) : null }; }).sort(function (a, b) { return a.cor - b.cor; });
    var h = '<tr><th>Boat</th><th>TCC</th><th>Now</th><th>Corrected</th><th>vs you</th></tr>';
    rows.forEach(function (r) { var d = (r.cor - myCor) * 60; h += '<tr><td style="font-family:var(--f-body)">' + r.g.name + '</td><td>' + r.g.tcc.toFixed(3) + '</td><td>' + (r.gap == null ? '-' : (r.gap >= 0 ? '+' : '−') + Math.abs(r.gap).toFixed(1) + ' nm') + '</td><td>' + fmtH(r.cor) + '</td><td>' + (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(0) + ' min</td></tr>'; });
    $('fleet').innerHTML = rows.length ? h : ''; $('fleetEmpty').hidden = !!rows.length;
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
      else if (v > 0) col = land;   /* edges are drawn as clean lines on top (depthLines), not as pixels */
      else if (-v < safety) col = sh;
      else { var f = Math.min(1, -v / 60); col = [sea2[0] + (sea[0] - sea2[0]) * f, sea2[1] + (sea[1] - sea2[1]) * f, sea2[2] + (sea[2] - sea2[2]) * f]; }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); depthImg = c;
    /* the coastline and the safety-depth line as vector segments (marching squares), so they stay sharp at any zoom (Stuart 12 Nov) */
    function contour(level) {
      var out2 = [], la0 = L.lat0, lo0 = L.lon0, dla = L.dlat, dlo = L.dlon;
      function val(y, x) { var v = Z[y * nx + x]; return v === 999 ? -99 : v; }
      for (var y = 0; y < ny - 1; y++) for (var x = 0; x < nx - 1; x++) {
        var a = val(y, x), b = val(y, x + 1), c2 = val(y + 1, x + 1), d2 = val(y + 1, x), k = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c2 > level ? 2 : 0) | (d2 > level ? 1 : 0);
        if (k === 0 || k === 15) continue;
        var e = function (p, q, py, px, qy, qx) { var f = (level - p) / (q - p); return [lo0 + (px + (qx - px) * f) * dlo, la0 + (py + (qy - py) * f) * dla]; };
        var T = e(a, b, y, x, y, x + 1), R2 = e(b, c2, y, x + 1, y + 1, x + 1), B = e(d2, c2, y + 1, x, y + 1, x + 1), Lf = e(a, d2, y, x, y + 1, x), segs;
        switch (k) { case 1: case 14: segs = [Lf, B]; break; case 2: case 13: segs = [B, R2]; break; case 3: case 12: segs = [Lf, R2]; break; case 4: case 11: segs = [T, R2]; break;
          case 5: segs = [Lf, T, B, R2]; break; case 6: case 9: segs = [T, B]; break; case 7: case 8: segs = [Lf, T]; break; case 10: segs = [Lf, B, T, R2]; break; }
        for (var i = 0; i < segs.length; i += 2) out2.push(segs[i][0], segs[i][1], segs[i + 1][0], segs[i + 1][1]);
      }
      return new Float32Array(out2);
    }
    depthLines = { coast: contour(0.5), safe: safety > 0 ? contour(-safety) : null };
  }
  var depthLines = null;
  function drawDepthLines() {
    if (!depthLines) return; var lo0 = LO(0), lo1 = LO(W), la1 = LA(0), la0 = LA(H), kx = K * view.s, ox = W / 2 - view.lo * kx, sy = view.s, oy = H / 2 + view.la * sy;
    function strokeSegs(a, colour, w) { if (!a) return; ctx.beginPath(); for (var i = 0; i < a.length; i += 4) { var x1 = a[i], y1 = a[i + 1], x2 = a[i + 2], y2 = a[i + 3]; if ((x1 < lo0 && x2 < lo0) || (x1 > lo1 && x2 > lo1) || (y1 < la0 && y2 < la0) || (y1 > la1 && y2 > la1)) continue; ctx.moveTo(x1 * kx + ox, oy - y1 * sy); ctx.lineTo(x2 * kx + ox, oy - y2 * sy); } ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.stroke(); }
    ctx.save(); ctx.lineCap = 'round';
    strokeSegs(depthLines.safe, css['--shoaledge'], 1.1);
    strokeSegs(depthLines.coast, css['--landedge'], 1.3);
    ctx.restore();
  }
  /* a light coastline for all of Route's waters (Natural Earth 1:50m), under the detailed charts, so land shows outside this page's own area too */
  var LAND50 = null;
  fetch('../courses/land50.json').then(function (r) { return r.json(); }).then(function (j) { LAND50 = j.rings; draw(); }).catch(function () {});
  function baseLand() {
    if (!LAND50) return; ctx.save(); ctx.fillStyle = css['--land']; ctx.strokeStyle = css['--landedge']; ctx.lineWidth = 1; ctx.beginPath();
    LAND50.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { var x = X(r[i + 1]), y = Y(r[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); });
    ctx.fill('evenodd'); ctx.globalAlpha = 0.8; ctx.stroke(); ctx.restore();
  }
  var coastBits = null;
  function coastLand(la, lo) { var C = meta.coast; if (!coastBits) return false; var y = Math.round((la - C.lat0) / C.dlat), x = Math.round((lo - C.lon0) / C.dlon); if (y < 0 || x < 0 || y >= C.ny || x >= C.nx) return false; var i = y * C.nx + x; return (coastBits[i >> 3] >> (7 - (i & 7))) & 1; }
  function draw() {
    if (!W || !meta) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.big) { drawBig(); return; }
    ctx.fillStyle = css['--sea']; ctx.fillRect(0, 0, W, H);
    baseLand();
    if (depthImg) { var L = P.depth.L; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';   /* smooth the coast and shoal edges when zoomed in, instead of square cells */ ctx.drawImage(depthImg, X(L.lon0 - L.dlon / 2), Y(L.lat0 + (L.ny - 0.5) * L.dlat), (L.nx * L.dlon) * K * view.s, L.ny * L.dlat * view.s); }
    try { drawDepthLines(); } catch (e) {}
    grid();
    if (S.show.band) bandEdge();
    if (S.show.tide) { ctx.save(); ctx.globalAlpha = (+$('tideDim').value || 0) / 100; arrows('tide'); ctx.restore(); }
    if (S.show.wind && $('windShow').value) { ctx.save(); ctx.globalAlpha = (+$('windDim').value || 0) / 100; arrows('wind'); ctx.restore(); }
    zonesDraw(); lightsDraw();
    if (!(S.edit && S.drawnNew)) marks();   /* drawing a new course: the old course's marks are not shown */
    /* the chosen route is a wide band underneath, so routes that run within a mile of it still show on top */
    var selOn = S.sel && !S.sel.hidden;
    if (selOn) line(S.sel, 9, 0.35);
    S.routes.forEach(function (s) { if (!s.hidden && s !== S.sel) line(s, 2.2, 1); });
    if (selOn) line(S.sel, 2.2, 1);
    if (S.edit) editDraw();
    if (S.mob) mobDraw();
    if (S.edit) { ctx.save(); ctx.strokeStyle = css['--brand'] || '#6FA9E0'; ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px Inter, sans-serif'; ctx.setLineDash([6, 5]);   /* every area a drawn course can route in, each named */
      REGIONS.forEach(function (g) { if (!READY[g.id]) return; var rb = g.region; ctx.globalAlpha = g.id === HERE ? 1 : 0.6; ctx.lineWidth = g.id === HERE ? 1.8 : 1.2; ctx.strokeRect(X(rb.w), Y(rb.n), X(rb.e) - X(rb.w), Y(rb.s) - Y(rb.n)); ctx.fillText(g.name, X(rb.w) + 5, Y(rb.n) + 13); });
      ctx.restore(); }   /* the area a new course must stay inside */
    try { drawMet(); } catch (e) {}
    try { drawEns(); } catch (e) {}
    try { drawIso(); } catch (e) {}
    if (S.show.lay) { try { laylines(); } catch (e) {} }
    var ab = $('adjWhere') && $('adjWhere').value === 'box' ? adjBox() : null;   /* the area of a forecast override */
    if (ab) { ctx.save(); ctx.strokeStyle = css['--warn'] || '#E8A33D'; ctx.lineWidth = 2; ctx.setLineDash([10, 6]); var x0 = X(ab.w), y0 = Y(ab.n); ctx.strokeRect(x0, y0, X(ab.e) - x0, Y(ab.s) - y0); ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px Inter, sans-serif'; ctx.fillText(adjVals() ? 'Forecast changed here' : 'Override area', x0 + 6, y0 + 15); ctx.restore(); }
    if (S.adjDraw && S.adjDraw.length) { ctx.save(); ctx.fillStyle = css['--warn'] || '#E8A33D'; ctx.beginPath(); ctx.arc(X(S.adjDraw[0][1]), Y(S.adjDraw[0][0]), 6, 0, 7); ctx.fill(); ctx.restore(); }
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
      else if (coastLand(la, lo)) continue;   /* wind symbols only over the sea */
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
    var ck = clockH(S.t), ckT = ck.slice(-5), ckD = ck.slice(0, -6), since = S.start ? (S.t >= S.start.t ? fmtH(S.t - S.start.t) : '') : '';
    $('clock').innerHTML = '<span class="ckd">' + ckD + ' </span><b class="ckt">' + ckT + '</b><small>' + (S.start ? (S.t >= S.start.t ? '<span class="ckl">' + since + ' since start</span><span class="cks">+' + since + '</span>' : 'before start') : 'UTC') + '</small>';
    var s = S.sel, h = '';
    if (s) {
      var p = s.r.path, pos = posAt(tsOf(p), p, S.t);
      if (pos && !pos.done && pos.i != null) {
        var q = p[pos.i + 1] || p[pos.i], lg = S.legs[Math.min(q.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a;
        var vmc = q.bsp * Math.cos((q.hdg - FSRouter.brg(pos.la, pos.lo, tg[0], tg[1])) * R);
        h = kv('Hdg', pad(q.hdg) + '°') + kv('BSP', q.bsp.toFixed(1)) + kv('TWA', Math.abs(Math.round(q.twa)) + (q.twa < 0 ? 'S' : 'P')) + kv('TWS', q.tws.toFixed(1)) + kv('VMG mark', vmc.toFixed(1)) + kv('Sail', rig(q)) + kv('Sea', q.hs ? q.hs.toFixed(1) + ' m' : '-');
      } else if (pos && pos.done) h = kv(s.r.partial ? 'Forecast end' : 'Finished', clockH(s.r.finish).slice(-5)) + ['BSP', 'TWA', 'TWS', 'VMG mark', 'Sail', 'Sea'].map(function (k) { return kv(k, '-'); }).join('');   /* same seven boxes, so the time slider beside them never changes width under your finger */
      else h = ['Hdg', 'BSP', 'TWA', 'TWS', 'VMG mark', 'Sail', 'Sea'].map(function (k) { return kv(k, '-'); }).join('');
    }
    $('now').innerHTML = h; followBoat(); draw(); if (S.ghosts && !$('t-fleet').hidden) fleetTable();
  }
  /* Follow the boat: with it on, moving the time slider or playing keeps the chosen route's boat in the middle of the open chart.
     Dragging the chart turns it off; the button turns it back on. */
  var follow = store('fs-follow') !== '0';
  function followSet(on) { follow = on; store('fs-follow', on ? '1' : '0'); $('followBtn').setAttribute('aria-pressed', on); $('followBtn').title = on ? 'Following the boat: tap to stop' : 'Follow the boat: keeps it in the middle as the time moves'; if (on) { followBoat(); draw(); } }
  function followBoat() {
    if (!follow || !S.sel || !W) return;
    var p = S.sel.r.path, pos = posAt(tsOf(p), p, S.t); if (!pos) pos = { la: p[0].la, lo: p[0].lo };
    var top = 70, bot = H, bar = document.querySelector('.bar'), pn = $('panel'), cr = cv.getBoundingClientRect();
    [bar, !wide() && pn && !pn.hidden && !pn.classList.contains('collapsed') ? pn : null].forEach(function (el) { if (!el) return; var r = el.getBoundingClientRect(); if (r.height && r.top > cr.top + top && r.left < cr.left + W / 2 && r.right > cr.left + W / 2) bot = Math.min(bot, r.top - cr.top); });
    var left = 0, right = W; if (wide() && pn && !pn.hidden) { var r2 = pn.getBoundingClientRect(); if (r2.left - cr.left > W / 2) right = r2.left - cr.left; else if (r2.right - cr.left < W / 2) left = r2.right - cr.left; }
    var cx = (left + right) / 2, cy = (top + bot) / 2;
    view.lo = pos.lo - (cx - W / 2) / (K * view.s); view.la = pos.la + (cy - H / 2) / view.s;
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
  cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); moved = 0; S.drag = (S.edit && !$('editBar').hidden && ptrs.size === 1) ? editHit(e.offsetX, e.offsetY) : -1; if (S.drag < 0) S.drag = null; else S.dragFrom = Object.assign({}, S.edit.pts[S.drag]); closeLayers(); if (!wide() && !$('panel').classList.contains('collapsed')) closePanel(); });
  cv.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && ($('tip').hidden || !$('tip').classList.contains('docked'))) hover(e.offsetX, e.offsetY, false); return; }   /* a tip pinned by a click stays until closed */
    var prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (S.drag != null && ptrs.size === 1) { var dq = S.edit.pts[S.drag]; dq.lat = +LA(e.offsetY).toFixed(5); dq.lon = +LO(e.offsetX).toFixed(5); moved = 99; draw(); return; }
    if (ptrs.size === 1) { var dx = e.offsetX - prev[0], dy = e.offsetY - prev[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { if (follow) followSet(false); view.lo -= dx / (K * view.s); view.la += dy / view.s; draw(); if (e.pointerType === 'mouse') $('tip').hidden = true; } return; }
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
  cv.addEventListener('pointerup', function (e) {
    if (S.drag != null) { var dq = S.edit.pts[S.drag]; if (!editOk(dq.lat, dq.lon)) Object.assign(dq, S.dragFrom); S.drag = null; ptrs.delete(e.pointerId); pinch = 0; draw(); return; } if (ptrs.has(e.pointerId) && moved < 6 && ptrs.size === 1) tap(e.offsetX, e.offsetY, e.pointerType !== 'mouse'); ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointercancel', function (e) { ptrs.delete(e.pointerId); pinch = 0; });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs.size && !$('tip').classList.contains('docked')) $('tip').hidden = true; });
  function tap(x, y, touch) {
    if (S.edit) { editTap(x, y); return; }
    if (S.adjDraw) {   /* drawing the area for a forecast override: two opposite corners */
      S.adjDraw.push([LA(y), LO(x)]);
      if (S.adjDraw.length < 2) { busy('Now tap the opposite corner'); draw(); return; }
      var A = S.adjDraw[0], Bq = S.adjDraw[1]; S.adjDraw = null; busy('');
      $('adjBox').value = [Math.min(A[0], Bq[0]), Math.max(A[0], Bq[0]), Math.min(A[1], Bq[1]), Math.max(A[1], Bq[1])].map(function (v) { return v.toFixed(4); }).join(',');
      S.adjBoxTxt(); $('sheet').hidden = false; return;
    }
    if (S.mobTap) { store('fs-mob', JSON.stringify({ lat: LA(y), lon: LO(x), t: Date.now(), how: 'tapped' })); beep(); mobShow(); return; }
    if ($('fromHere').getAttribute('aria-pressed') === 'true') {
      var la = LA(y), lo = LO(x), z = P.depth ? P.depth.nearest('z', la, lo) : NaN;
      if (!(z <= -(+$('depth').value))) { busy('That is land or too shallow. Tap open water.'); return; }
      S.from = { lat: la, lon: lo, t: S.t }; $('fromHere').setAttribute('aria-pressed', 'false'); busy(''); run(); return;
    }
    hover(x, y, true, true);
  }
  /* tap anywhere on the water: route there from where the boat is at the slider time */
  function routeHere(la, lo) {
    var s = S.sel, pos = s ? posAt(tsOf(s.r.path), s.r.path, S.t) : null;
    if (pos && !pos.done && pos.la != null) S.from = { lat: pos.la, lon: pos.lo, t: S.t }; else S.from = { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 };
    S.to = { lat: la, lon: lo }; $('tip').hidden = true; busy('Routing to your point…'); run();
  }
  function hover(x, y, docked, tapped) {
    if (!meta) return;
    if (S.big) { var O = meta.overview, gy = Math.round((LA(y) - O.lat0) / O.dlat), gx = Math.round((LO(x) - O.lon0) / O.dlon); if (gy < 0 || gx < 0 || gy >= O.ny || gx >= O.nx) return;
      var pu = ovField('u')(gy, gx), pv = ovField('v')(gy, gx); $('tipBody').innerHTML = '<b>' + dm(LA(y), 'NS') + ' ' + dm(LO(x), 'EW') + '</b>' + r2('Pressure', ovField('msl')(gy, gx).toFixed(0) + ' hPa') + r2('Wind', (Math.hypot(pu, pv) / KN).toFixed(0) + ' kn from ' + pad(Math.atan2(-pu, -pv) / R) + '°');
      $('tip').hidden = false; $('tip').classList.toggle('docked', !!docked); if (!docked) { $('tip').style.left = Math.min(W - 230, x + 14) + 'px'; $('tip').style.top = Math.max(64, y + 14) + 'px'; } return; }
    var la = LA(y), lo = LO(x), t = S.t, rows = [], tip = $('tip');
    var z = P.depth ? P.depth.nearest('z', la, lo) : NaN;
    rows.push('<b>' + dm(la, 'NS') + ' ' + dm(lo, 'EW') + '</b>');
    rows.push(r2('Depth', z === z ? (z > 0 ? 'land' : z <= -99 ? 'over 20 m' : (-z).toFixed(1) + ' m') : 'outside forecast band'));
    var wm = $('windShow').value || (S.sel ? S.sel.models[0] : Object.keys(P.wind)[0]), wf = P.wind[wm], tws = 0, twd = 0;
    if (wf) { var u = wf.sample('u', la, lo, t), v = wf.sample('v', la, lo, t); tws = Math.hypot(u, v) / KN; twd = (Math.atan2(-u, -v) / R + 360) % 360; rows.push(r2('Wind ' + short(wm), tws === tws ? tws.toFixed(1) + ' kn from ' + pad(twd) + '°' : 'no forecast here')); }
    var tf = P.tide[$('tideSel').value];
    if (tf) { var cu = tf.sample('u', la, lo, t), cv2 = tf.sample('v', la, lo, t); if (cu === cu) rows.push(r2('Tide', (Math.hypot(cu, cv2) / KN).toFixed(1) + ' kn to ' + pad(Math.atan2(cu, cv2) / R) + '°')); }
    var wv = P.wave[$('waveSel').value], hsv = 0, wdv = NaN;
    if (wv) { hsv = wv.sample('hs', la, lo, t); wdv = wv.sampleDir(la, lo, t); var tp = wv.sample('tp', la, lo, t); if (hsv === hsv) rows.push(r2('Sea', hsv.toFixed(1) + ' m from ' + pad(wdv) + '°' + (tp === tp ? ', ' + tp.toFixed(0) + ' s' : ''))); else hsv = 0; }
    if (metField()) MET.forEach(function (m) { if (!S.show[m[0]]) return; var v = metAt(m[2], la, lo, t); if (!(v === v)) return;
      rows.push(r2(m[1].replace(' (isobars)', ''), m[2] === 'gust' ? Math.round(v / KN) + ' kn' : m[2] === 'msl' ? v.toFixed(0) + ' hPa' : m[2] === 'rain' ? v.toFixed(1) + ' mm an hour' : m[2] === 'cape' ? (v < 300 ? 'low' : v < 1000 ? 'some' : v < 2500 ? 'high' : 'very high') + ' (' + Math.round(v) + ' J/kg)' : m[2] === 'cloud' ? Math.round(v) + '%' : Math.round(v) + '°C')); });
    // boat figures only when the pointer is on a route: open water has no boat
    var best = null, bs = null, bd2 = docked ? 26 : 16;
    S.routes.forEach(function (s) { if (s.hidden) return; s.r.path.forEach(function (p) { if (p.bsp == null) return; var d = Math.hypot(X(p.lo) - x, Y(p.la) - y) - (s === S.sel ? 3 : 0); if (d < bd2) { bd2 = d; best = p; bs = s; } }); });
    if (best) {
      var lg = S.legs[Math.min(best.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a, o = opts(bs.models), spd = speedFn(o);
      var tgt = spd(best.tws, best.twa), sf = FSRouter.seaFactor(best.hs, best.wd, best.hdg, o.sea);
      var bu = FSRouter.bestVmg(spd, best.tws, true), bdn = FSRouter.bestVmg(spd, best.tws, false);
      rows.push('<b style="color:' + col(bs) + '">' + (bs.combined ? 'Combined' : short(bs.id)) + ' route, ' + clockH(best.t).slice(4) + '</b>');
      rows.push(r2('Heading', pad(best.hdg) + '\u00b0 · TWA ' + Math.abs(Math.round(best.twa)) + '\u00b0 ' + (best.twa < 0 ? 'stbd' : 'port')));
      var lw = steerOff(best); if (lw) rows.push(r2('Steer', pad((best.hdg + lw + 360) % 360) + '\u00b0 (leeway ' + Math.abs(lw).toFixed(1) + '\u00b0)'));
      rows.push(r2('Boat speed', best.bsp.toFixed(1) + ' kn' + (sf < 0.995 || sf > 1.005 ? ' (sea ' + (sf >= 1 ? '+' : '') + Math.round((sf - 1) * 100) + '%)' : '')));
      rows.push(r2('VMG to mark', (best.bsp * Math.cos((best.hdg - FSRouter.brg(best.la, best.lo, tg[0], tg[1])) * R)).toFixed(1) + ' kn'));
      var gx = best.bsp * Math.sin(best.hdg * R) + (best.cu || 0), gy = best.bsp * Math.cos(best.hdg * R) + (best.cv || 0);   /* over the ground: boat speed through the water plus the tide */
      rows.push(r2('Over the ground', 'SOG ' + Math.hypot(gx, gy).toFixed(1) + ' kn · COG ' + pad((Math.atan2(gx, gy) / R + 360) % 360) + '\u00b0'));
      if (best.cu != null && Math.hypot(best.cu, best.cv) >= 0.1) rows.push(r2('Tide on the route', Math.hypot(best.cu, best.cv).toFixed(1) + ' kn to ' + pad((Math.atan2(best.cu, best.cv) / R + 360) % 360) + '\u00b0'));
      rows.push(r2('True wind', best.tws.toFixed(1) + ' kn from ' + pad(best.twd) + '\u00b0'));
      rows.push(r2(Math.abs(best.twa) < 90 ? 'Upwind target' : 'Downwind target', Math.abs(best.twa) < 90 ? bu[0] + '\u00b0 · ' + bu[1].toFixed(1) + ' kn · VMG ' + bu[2].toFixed(1) : bdn[0] + '\u00b0 · ' + bdn[1].toFixed(1) + ' kn · VMG ' + bdn[2].toFixed(1)));
      var sl = FSRouter.sailFor(best, sailsList()), rf = reefOf(best); if (sl || rf) rows.push(r2('Sail', (sl || '-') + (rf ? ', ' + rf.toLowerCase() : '')));
      if (best.tack) rows.push(r2('Manoeuvre', Math.abs(best.twa) > 90 ? 'gybe' : 'tack'));
    }
    var near = null, nd = docked ? 16 : 10;
    ((S.show.ghosts && S.ghostXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ' if on your route (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    ((S.show.real && S.realXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ', real position (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    if (near) rows.push('<b>' + near + '</b>');
    var wetHere = !(P.depth && !(P.depth.nearest('z', la, lo) <= -(+$('depth').value)));
    if (tapped && S.sel && wetHere && inData({ lat: la, lon: lo })) rows.push('<div class="xrow" style="margin-top:6px"><button class="btn" id="tipRoute">Route here from the boat</button></div>');
    $('tipBody').innerHTML = rows.join(''); tip.hidden = false; tip.classList.toggle('docked', !!docked);
    if ($('tipRoute')) $('tipRoute').onclick = function (e) { e.stopPropagation(); routeHere(la, lo); };
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
    $('boatSave').onclick = function () { var n = $('boatName').value.trim() || 'My boat', b = boats(); $('boatName').value = n; b[n] = { spec: boatSpec(), tackS: +$('tackS').value, gybeS: +$('gybeS').value, sails: $('sails').value, mains: $('mains').value }; store('fsBoats', JSON.stringify(b)); store('fs-boat-cur', n); listBoats(n); busy('Saved ' + n + ' on this device'); setTimeout(function () { busy(''); }, 1600); };
    $('boatDel').onclick = function () { var n = $('myBoat').value, b = boats(); if (!n) return; delete b[n]; store('fsBoats', JSON.stringify(b)); listBoats(''); };
    $('myBoat').onchange = function () { var n = $('myBoat').value, b = boats()[n]; $('boatDel').hidden = !n; if (!b) return; store('fs-boat-cur', n); var s = b.spec; $('boatName').value = n; $('tcc').value = (+s.tcc).toFixed(3); $('boatType').value = s.type || 'perf'; eg(); $('polarTxt').value = s.text || ''; $('tuUp').value = s.tune.up; $('tuReach').value = s.tune.reach; $('tuRun').value = s.tune.run; if (b.tackS) $('tackS').value = b.tackS; if (b.gybeS) $('gybeS').value = b.gybeS; ['sails', 'mains'].forEach(function (id) { if (b[id]) { $(id).value = b[id]; $(id).dispatchEvent(new Event('input')); } }); setSrc(s.src); readOwn(true); boatChanged(); };
    listBoats(''); setSrc('type'); boatChanged();
    /* the boat you last used comes back on this device every time: no typing it in twice */
    var cur = store('fs-boat-cur') || (Object.keys(boats()).length === 1 ? Object.keys(boats())[0] : ''); if (cur && boats()[cur]) { listBoats(cur); $('myBoat').value = cur; $('myBoat').dispatchEvent(new Event('change')); }
  }
  var spCache = {};
  function speedFn(o) { var key = o.polKey || 't' + o.tcc; if (!spCache[key]) spCache[key] = FSRouter.polarTable(o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc)); return spCache[key]; }
})();
