/* F88 (Stuart 20 Nov 23:44, "Send follow link nothing happened"): the Android apps' browser has no share sheet, so every Share button did nothing there. One way to send text out: the app's own share (NativeLink.share), else the browser's, else the caller's fallback */
function sendOut(title, text) { try { if (window.NativeLink && window.NativeLink.share) { window.NativeLink.share(title, text); return true; } } catch (e) {} if (navigator.share) { navigator.share({ title: title, text: text }).catch(function () {}); return true; } return false; }
/* F26 (Stuart 17 Nov 2026 17:45, "MIN, minimise a window"): one minimise icon with the word Hide on every window in all four tools */
window.FS_HIDE = '<span class="fshide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Hide</span>';
(function () { try { var st = document.createElement('style'); st.textContent = '.fshide{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font:600 13px/1 Inter,system-ui,sans-serif;letter-spacing:.02em}.fshide svg{width:14px;height:14px;flex:none}'; (document.head || document.documentElement).appendChild(st); } catch (e) {} })();
(function () {
  'use strict';
  var VERSION = 'FirstShift Route v0.12.100';
  var R = Math.PI / 180, KN = 1852 / 3600, $ = function (id) { return document.getElementById(id); };
  var meta, P = FSRouter.emptyPack(), T0, workers = [], wq = 0, jobs = {}, jid = 0;
  var STYLE = { ukv: ['--m1', []], ecmwf: ['--m2', [9, 4]], gfs: ['--m3', [2, 4]], aifs: ['--m4', [12, 4, 2, 4]], mog: ['--m5', [1, 5]], icon: ['--m6', [6, 3, 1, 3]], arome: ['--m7', [3, 2]], arpege: ['--m8', [10, 3, 3, 3, 3, 3]], om: ['--brand', [4, 2, 1, 2]], chain: ['--ink', [14, 4, 2, 4, 2, 4]], fixed: ['--warn', [2, 3]] };   /* fixed: the Fixed wind route, amber dotted */
  var S = { t: 5, routes: [], sel: null, matrix: null, ghosts: null, from: null, running: false, show: { wind: true, tide: true, ghosts: true, real: false, band: true, tss: true, lights: true, lay: true, legs: true, tracks: (function () { try { return localStorage.getItem('fs-tracksshow') !== '0'; } catch (e) { return true; } })() }, choice: {}, loaded: {} };
  var css = {};
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- colours ---------- */
  function readCss() { var cs = getComputedStyle(document.documentElement); ['--brand', '--sea', '--sea2', '--land', '--landedge', '--shoal', '--shoaledge', '--route', '--wind', '--tide', '--ink', '--muted', '--panel', '--ghost', '--out', '--m1', '--m2', '--m3', '--m4', '--m5', '--m6', '--m7', '--m8'].forEach(function (k) { css[k] = cs.getPropertyValue(k).trim(); }); }
  /* screen: follow the device, light, dark, or night red; the Night button flips between night and the last day setting */
  var dayMode = 'auto';
  var MODEICON = { dark: '<svg viewBox="0 0 24 24"><path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/></svg>',
    night: '<svg viewBox="0 0 24 24"><path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' };
  function setMode(mode) {
    var r = document.documentElement;
    if (mode === 'night') nightRedFilter();
    if (mode === 'night') r.setAttribute('data-night', ''); else { r.removeAttribute('data-night'); dayMode = mode; store('fs-theme', mode); }
    if (mode === 'light' || mode === 'dark') r.setAttribute('data-theme', mode); else if (mode === 'auto') r.removeAttribute('data-theme');
    $('nightBtn').setAttribute('aria-pressed', mode === 'night'); store('fs-night', mode === 'night' ? '1' : '0');
    var cur = mode === 'night' ? 'night' : mode === 'light' || (mode === 'auto' && !matchMedia('(prefers-color-scheme: dark)').matches) ? 'light' : 'dark';
    $('nightBtn').innerHTML = MODEICON[cur] + '<span class="lbl">' + { dark: 'Dark', night: 'Night', light: 'Light' }[cur] + '</span>';
    $('nightBtn').title = 'Screen: ' + { dark: 'dark', night: 'night red', light: 'light' }[cur] + '. Tap to change';
    [].forEach.call($('modeSeg').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    readCss(); buildDepth(); draw(); if (!$('sheet').hidden) plotPolar();
  }
  /* F46 (Stuart 18 Nov 07:32, iPhone screenshot): night mode turns the WHOLE view red, chart and controls alike, so nothing green, blue or
     white is left to spoil night vision (TSS lanes, GPS button, window grips, buoy symbols). One colour matrix on the root element: red
     keeps its strength, green and blue add a little brightness to the red, and no green or blue light is left at all. */
  function nightRedFilter() {
    if (document.getElementById('fsNightRedSvg')) return;
    var d = document.createElement('div'); d.innerHTML = '<svg id="fsNightRedSvg" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><filter id="fsNightRed" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.45 0.6 0.2 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter></svg>';
    (document.body || document.documentElement).appendChild(d.firstChild);
    /* Safari and every iPhone browser (WebKit) do not apply an SVG filter to the page (Stuart's iPhone, 18 Nov 19:44: "Red view still has
       colours"): there a red sheet over everything, multiplied, leaves only red light; it takes no taps */
    var ua = navigator.userAgent || '', webkit = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua));
    if (webkit) { document.documentElement.classList.add('fsnightov'); var ov = document.createElement('div'); ov.id = 'fsNightOv'; ov.setAttribute('aria-hidden', 'true'); document.body.appendChild(ov); }
  }
  function setNight(on) { setMode(on ? 'night' : dayMode); }

  /* ---------- workers ---------- */
  function call(w, msg, tr) { return new Promise(function (ok, no) { msg.id = ++jid; jobs[jid] = { ok: ok, no: no }; w.postMessage(msg, tr || []); }); }
  function pool(msg) { return wReady.then(function () { return call(workers[wq++ % workers.length], msg); }); }
  /* speed plan 6 (Stuart 20 Nov 06:45): a short job (the fleet's times) does not wait behind routes still refining in the workers; while they are
     busy it runs on the page, which already holds the forecasts (the same worker code, as the main-thread fallback) */
  var WSRC = null;
  function poolShort(msg) { return wReady.then(function () { if (!Object.keys(jobs).length || !WSRC || workMode.mode === 'main') return pool(msg); if (!poolShort.w) { poolShort.w = mainThread(WSRC); poolShort.w.onmessage = onMsg; } return call(poolShort.w, msg); }); }
  function all(msgFn) { return wReady.then(function () { return Promise.all(workers.map(function (w) { var m = msgFn(); return call(w, m.msg, m.tr); })); }); }
  var MOBILE = /iPhone|iPad|iPod|Android|Mobi/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));   /* iPadOS calls itself a Mac */
  var n = Math.max(1, Math.min(MOBILE ? 2 : 4, (navigator.hardwareConcurrency || 2) - 1));   /* each worker holds every forecast: two on a phone or tablet, so iOS does not close Route for memory (Stuart 12 Nov) */
  /* Finding F2 (15 Nov 2026, Stuart: "C: both, plus check"). Offline on Android the page stayed at "Loading forecasts 100%": every
     forecast was handed to the routing workers and the page waited for an answer from a worker that had never started. Now:
     1. the workers are built from router.js, engine.js and worker.js as the page itself loads them (so on Android they come from
        inside the app, never the network); 2. if that fails, the worker file is loaded as before; 3. each worker must answer a ping
        within 10 s, and one that fails is dropped; 4. if none answer, routing runs on the main screen thread: slower, but it works.
     window.__fsWork() says which, for Data sources. */
  function onMsg(e) { var j = jobs[e.data.id]; if (j) { delete jobs[e.data.id]; e.data.ok ? j.ok(e.data.r) : j.no(new Error(e.data.error)); } }
  var workMode = { mode: 'starting', n: 0, why: '' };
  window.__fsWork = function () { return { mode: workMode.mode, n: workers.length, why: workMode.why }; };
  function wSrc() {
    var get = function (f) { return fetch(f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(f + ' ' + r.status); return r.text(); }); };
    var tm = new Promise(function (_, no) { setTimeout(function () { no(new Error('slow')); }, 8000); });
    return Promise.race([Promise.all([get('router.js'), get('engine.js'), get('worker.js')]), tm]).then(function (t) { var wk = t[2].replace(/^\s*importScripts\([^)]*\);?/m, ''); return { all: t[0] + '\n;\n' + t[1] + '\n;\n' + wk, wk: wk }; });
  }
  /* F14 (Stuart's Android tablet, 15 Nov 19:52: loading stopped at 9 of 14; "Both fixes"): a worker that is slow to answer is waited for,
     never shut down. Routing goes ahead as soon as one worker answers, and the others join as they answer. A worker counts as failed
     only if it reports an error, or nothing has answered in 60 s. */
  function startSet(make) {
    var set = []; for (var i = 0; i < n; i++) { try { var w = make(); w.onmessage = onMsg; set.push(w); } catch (e) { break; } }
    if (!set.length) return Promise.resolve([]);
    return new Promise(function (ok) {
      var good = [], left = set.length, over = false, end = function () { if (over) return; over = true; ok(good.slice()); };
      set.forEach(function (w) {
        var done = false, fin = function (g) { if (done) return; done = true; left--; if (g) { if (over) { if (workers.indexOf(w) < 0) workers.push(w); } else { good.push(w); end(); } } else { try { w.terminate(); } catch (e) {} if (!left && !over) end(); } };
        w.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); fin(false); };
        call(w, { type: 'ping' }).then(function () { fin(true); }, function () { fin(false); });
      });
      setTimeout(end, 60000);
    });
  }
  function mainThread(src) {   /* the worker's own code, run on the page: same answers, but the screen waits while it routes. It shares the page's own
       forecasts (P) instead of keeping a second copy, which a tablet has no memory for (F14) */
    var h = null, fake = { postMessage: function (msg) { if (msg && (msg.type === 'layer' || msg.type === 'drop')) { setTimeout(function () { fake.onmessage({ data: { id: msg.id, ok: true } }); }, 0); return; } setTimeout(function () { h({ data: msg }); }, 0); }, terminate: function () {} };
    h = new Function('postMessage', 'importScripts', '__pageP', 'var onmessage;\n' + src.replace(/var P = FSRouter\.emptyPack\(\);/, 'var P = __pageP;') + '\n;return onmessage;')   /* only worker.js: the page already has FSRouter and FSPolar */
      (function (r) { setTimeout(function () { fake.onmessage({ data: r }); }, 0); }, function () {}, P);
    return fake;
  }
  var wReady = wSrc().then(function (src) {
    var url = URL.createObjectURL(new Blob([src.all], { type: 'text/javascript' }));
    return startSet(function () { return new Worker(url); }).then(function (ok) { return { ok: ok, src: src.wk, how: 'background' }; });
  }, function (e) { return { ok: [], src: null, how: '', why: e.message }; }).then(function (r) {
    if (r.ok.length) return r;
    return startSet(function () { return new Worker('worker.js'); }).then(function (ok) { return { ok: ok, src: r.src, how: 'background (file)' }; });
  }).then(function (r) {
    WSRC = r.src || null;
    if (r.ok.length) { workers = r.ok; workMode.mode = r.how; return; }
    var src = r.src;
    if (!src) { workMode.mode = 'none'; workMode.why = 'The routing code could not be loaded.'; throw new Error('Routing could not start on this device: ' + workMode.why); }
    workers = [mainThread(src)]; workers[0].onmessage = onMsg; workMode.mode = 'main'; workMode.why = 'Background routing could not start on this device, so routing runs on the main screen. It works, but the screen may pause while it routes.';
  });
  wReady.catch(function () {});

  /* phones: From here sits beside Play in the bottom bar */
  (function () { var mq = matchMedia('(max-width:899px) and (orientation:portrait), (max-width:899px) and (min-height:501px)'), fh = $('fromHere'), home = fh.parentNode, next = fh.nextSibling;
    function place() { var ori = $('oriBtn'); if (mq.matches) { if (fh.parentNode !== ori.parentNode) ori.parentNode.insertBefore(fh, ori); fh.classList.add('fabhelp', 'fabhere'); fh.classList.remove('ib'); } else if (fh.parentNode !== home) { home.insertBefore(fh, next); fh.classList.remove('fabhelp', 'fabhere'); fh.classList.add('ib'); } }   /* phones: From here is a round button on the chart, so the bar keeps full-size buttons */
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
  function errHide() { var b = $('errBox'); if (b) b.hidden = true; if ($('errDepth')) $('errDepth').hidden = true; }
  /* F6 (Stuart 15 Nov 15:29, 17:10 "Plain message + depth button"): a route that cannot leave its start (no way through after 0 h) usually
     starts in water shallower than the safety depth. Say so plainly, with the charted depth there, and offer to route with a safety depth
     that the start allows. Try again alone would only repeat the same failure. */
  /* said under the route when it leaves the start through water shallower than the safety depth (the router allows that within 1 nm of
     the start, Stuart 15 Nov 20:04) */
  function shallowStartNote() {
    try { var r = S.sel && S.sel.r, safety = +$('depth').value; if (!r || !r.path || !P.depth || !(safety > 0)) return ''; var p0 = r.path[0], low = Infinity;
      for (var i = 0; i < r.path.length && i < 40; i++) { var q = r.path[i], dd = rhumb({ lat: p0.la, lon: p0.lo }, { lat: q.la, lon: q.lo }).nm; if (dd > 1.05) break; var z = P.depth.nearest('z', q.la, q.lo); if (z === z) low = Math.min(low, -z); }
      return low < safety ? ' Leaving the start the route crosses water about ' + Math.max(0, low).toFixed(1) + ' m deep on the chart, less than your safety depth of ' + safety.toFixed(1) + ' m: check the depth there on the tide.' : '';
    } catch (e) { return ''; } }
  function depthOffer(e, sp) {
    var b = $('errDepth'); if (!b) return; b.hidden = true;
    if (!e || !/after 0 h/.test(e.message || '') || !sp) return;
    var safety = +$('depth').value, z = P.depth ? P.depth.nearest('z', sp.lat, sp.lon) : NaN, wd = -z, who = sp.from ? 'The boat' : 'The start';
    var y = null, msg;
    /* the deepest safety depth with a way out, by the router's own test (every depth square on the line): a clear mile on at least one
       of 36 bearings, trying the safety depth less 0.5 m, then 1 m, and so on */
    var clearAt = function (d) { for (var bb = 0; bb < 360; bb += 10) { var la1 = sp.lat + Math.cos(bb * R) / 60, lo1 = sp.lon + Math.sin(bb * R) / (60 * Math.cos(sp.lat * R)); if (FSRouter.clearLine(P.depth, d, sp.lat, sp.lon, la1, lo1)) return true; } return false; };
    var exitD = -1; if (P.depth) for (var cd = Math.floor(safety * 2) / 2 - 0.5; cd >= 0; cd -= 0.5) if (clearAt(cd)) { exitD = cd; break; }
    if (wd === wd && wd <= 0) msg = who + ' is ashore or on a drying bank on the chart, so no route can leave it. ' + (sp.from ? 'Tap the chart where the boat really is, or route from the start.' : 'Move the start into the water.');
    else if (wd === wd && wd < safety) { y = exitD >= 0 ? exitD : Math.max(0, Math.floor(wd * 2) / 2); msg = who + ' is in water about ' + wd.toFixed(1) + ' m deep on the chart, shallower than your safety depth of ' + safety.toFixed(1) + ' m, so no route can leave it.'; }
    else { y = exitD >= 0 ? exitD : null; msg = 'No way out from ' + who.toLowerCase() + ' with a safety depth of ' + safety.toFixed(1) + ' m: within a mile in every direction the chart shows shallower water.'; }
    $('errMsg').textContent = msg;
    if (y != null && y < safety) { b.textContent = 'Route with ' + y.toFixed(1) + ' m'; b.hidden = false; b.onclick = function () { errHide(); depthSet(y); S.running = false; S.preBad = true; S.routes = []; run(); }; }
  }
  (function () { var b = $('errBox'); if (!b) return; $('errX').onclick = errHide; $('errRetry').onclick = function () { errHide(); S.running = false; S.preBad = true; S.routes = []; run(); }; })();
  setInterval(function () {   /* a route that has run for two minutes with nothing to show is stuck: say so */
    if (S.running) { S.runSince = S.runSince || Date.now(); var still = Date.now() - Math.max(S.runSince, S.progAt || 0); if (still > 120000 && !(S.routes && S.routes.length) && $('errBox') && $('errBox').hidden)   /* 17 Nov (Stuart's tablet photo at 2%): only when nothing has moved for two minutes; a new run starts the clock again */ errShow('Routing is taking far longer than usual. Try again, or choose fewer wind models in Settings, Forecasts.'); }
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
    var keep = false; try { keep = sessionStorage.getItem('fs-keep') === '1'; sessionStorage.removeItem('fs-keep'); } catch (e) {}
    if (keep) { gone = true; sp.hidden = true; S.splashDone = function () {}; setTimeout(function () { var n = $('spTourNo'); if (n) n.click(); }, 300); return; }   /* after Reload: straight back to the chart */
    if ($('spTour')) { S.splashDone = function () {}; sp.addEventListener('click', hide); return; }   /* Show me round? Yes or No, asked every time: the splash waits for the answer (Stuart 14 Nov) */
    S.splashDone = function () { setTimeout(hide, Math.max(0, SPLASH_MIN - (Date.now() - t0))); }; sp.addEventListener('click', hide); setTimeout(hide, 12000); })();
  /* ---------- start ---------- */
  /* Mark's Solent pack (18 Nov 19:30); until the forecast job has built it, or if it ever fails, Mark uses the whole Channel as before */
  fetch((window.FS_PACK || 'pack/') + 'pack.json', { cache: 'no-store' }).then(function (r) { return r.text().then(function (t) { var j = null; try { j = r.ok ? JSON.parse(t) : null; } catch (e) { j = null; } if (j) return j; if (window.FS_MARK && /solent-area/.test(window.FS_PACK)) { window.FS_PACK = '../channel-area/pack/'; return fetch(window.FS_PACK + 'pack.json', { cache: 'no-store' }).then(function (r2) { return r2.json(); }); } return JSON.parse(t); }); }).then(function (m) {   /* Stuart's iPhone 18 Nov 21:01: the site answers a missing Solent pack with a web page, not a 404, so the test is whether it reads as a pack */
    meta = m; T0 = m.t0; if (window.FS_MARK) meta.fleet = [];   /* Mark: no RORC or JOG entry lists (Stuart 17 Nov 06:38: offshore fleet out) */
    if (S.splashDone) S.splashDone(); setup(); loadRaces(); [loadChartExtras, xInit, adjInit, helpInit, racesInit, mobInit, aisInit, spdInit, mfInit, wizInit, crewInit, shareInit, askInit, bcInit].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error('Route: ' + (f.name || 'a part') + ' did not start: ' + e.message); } });   /* 17 Nov: a fault in one extra must never stop the forecasts loading */
    /* depth view and closest zoom (Stuart 15 Nov 2026, C and D): routes always follow the depth squares; the chart can show them smoothed or as they are */
    /* Shallow water shown: two buttons rather than a drop-down (Stuart 15 Nov 08:13: the drop-down would not open or select on the Android tablet) */
    (function () { var dv = $('depthView'), zm = $('zoomMax'), sg = $('depthViewSeg'); if (dv && sg) { var setV = function (v) { dv.value = v === 'squares' ? 'squares' : 'smooth'; [].forEach.call(sg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === dv.value)); }); }; setV(store('fs-depthView')); [].forEach.call(sg.querySelectorAll('button'), function (b) { b.onclick = function () { setV(b.dataset.v); store('fs-depthView', dv.value); buildDepth(); draw(); }; }); }
      if (zm) { var z = store('fs-zoomMax'); if (z != null) zm.value = z; var f = function () { var k = +zm.value || 1; $('zoomMaxV').textContent = (k === 1 ? 'Standard, ' : k + ' times, ') + 'about ' + (Math.max(320, Math.min(W || 400, 1400)) * 60 / (20000 * k)).toFixed(k > 3 ? 2 : 1) + ' nm across'; }; zm.oninput = function () { store('fs-zoomMax', zm.value); f(); if (view.s > ZMAX()) { view.s = ZMAX(); draw(); } }; f(); } })();
    ['windDim', 'tideDim'].forEach(function (id) { var el = $(id), v = store('fs-' + id); if (v != null) el.value = v; var f = function () { $(id + 'V').textContent = el.value + '%'; store('fs-' + id, el.value); draw(); }; el.oninput = f; $(id + 'V').textContent = el.value + '%'; }); if (W) { fit(); fitted = true; }
    fetch((window.FS_PACK || 'pack/') + '' + m.coast.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { coastBits = new Uint8Array(b); buildDepth(); draw(); });
    var saved = store('fs-plan'); applyPlan(saved && PLANS[saved] ? saved : 'full');
    return loadPre().then(function () { earlyPre(); return download(); });
  }).then(function () { return omFallback(); }).then(function () { run(); watchForNew(); }).catch(function (e) { $('dataChip').textContent = 'Could not load forecasts: ' + e.message; errShow('Could not load the forecasts: ' + e.message); });

  /* ---------- new forecasts: check every 5 minutes; a button downloads them and routes again ---------- */
  var nextMeta = null;
  function watchForNew() {
    if (!meta.live) return;
    setInterval(function () {
      fetch((window.FS_PACK || 'pack/') + 'pack.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
        if ((m.built || m.t0) === (meta.built || meta.t0) || (nextMeta && (nextMeta.built || nextMeta.t0) === (m.built || m.t0))) return;
        nextMeta = m;
        $('newData').hidden = false;
        $('newDataTxt').textContent = 'New forecast: ' + clockAbs(m.t0 - tzSh()).replace(/ (\d\d):00$/, ' $1Z') + ' run';
      }).catch(function () {});
    }, 5 * 60 * 1000);
    $('newDataBtn').onclick = function () {
      if (S.sessStale && !nextMeta && !S.running) { S.sessStale = false; $('newData').hidden = true; $('newDataBtn').textContent = 'New data: update routing'; run(); return; }
      if (!nextMeta || S.running) return;
      var m = nextMeta, cur = meta.course; nextMeta = null;
      $('newData').hidden = true; busy('Downloading the new forecast…');
      meta = m; T0 = m.t0; if (window.FS_MARK) meta.fleet = []; meta.course0 = m.course; S.loaded = {}; S.gotAt = {}; S.ov = null; S.routes = []; S.sel = null; S.legs = null; S.ghosts = [];
      /* keep the course on screen, whatever it is: a RORC race, its marks as set, or your own course (found 13 Nov: an own course
         jumped back to the area's default race whenever a new forecast came in). Only the forecast window comes from the new pack. */
      if (cur) meta.course = Object.assign({}, cur, { band: m.course && m.course.band || cur.band, window: m.course && m.course.window || cur.window });
      var st = (+$('startSel').value - T0) / 3600; S.tmin = Math.min(st, S.tmin - 0); S.tmax = Math.min(HMAX(), S.tmax);
      loadPre().then(function () { earlyPre(); return download(); }).then(function () { chip(); dataTable(); run(); }).catch(function (e) { busy(''); $('dlNote').textContent = e.message; });
    };
  }

  /* ---------- data plans ---------- */
  var PLANS = {
    full: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'full', mog: 'full', icon: 'full', arome: 'full', arpege: 'full', nwscur: 'full', ibicur: 'full', nwswav: 'full', ecwav: 'full', ecmet: 'full', mars: 'full', glocur: 'full', emodnet: 'full' },
    coastal: { ukv: 'full', ecmwf: 'full', gfs: 'full', aifs: 'off', mog: 'off', icon: 'full', arome: 'full', arpege: 'off', nwscur: 'full', ibicur: 'off', nwswav: 'lite', ecwav: 'off', ecmet: 'full', mars: 'full', glocur: 'full', emodnet: 'full' },
    lite: { ukv: 'lite', ecmwf: 'lite', gfs: 'lite', aifs: 'off', mog: 'off', icon: 'lite', arome: 'lite', arpege: 'off', nwscur: 'lite', ibicur: 'off', nwswav: 'off', ecwav: 'full', ecmet: 'lite', mars: 'lite', glocur: 'lite', emodnet: 'lite' }
  };
  function applyPlan(p) { S.choice = Object.assign({}, PLANS[p]); S.plan = p; store('fs-plan', p); [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', b.dataset.plan === p); }); dataTable(); }
  function layer(id) { return meta.layers.find(function (l) { return l.id === id; }); }
  function mb(b) { return b < 1e5 ? (b / 1e3).toFixed(0) + ' kB' : (b / 1e6).toFixed(1) + ' MB'; }
  function res(v) { var a = v.res_km[0], b = v.res_km[1]; return a < 1 ? Math.round((a + b) / 2 * 1000) + ' m' : (Math.abs(a - b) / a < 0.25 ? ((a + b) / 2).toFixed(1) + ' km' : a.toFixed(0) + '×' + b.toFixed(0) + ' km'); }
  /* forecast age: the model run, when it reached the FirstShift server, when it reached this device */
  /* Local or UTC (Stuart 20 Nov 16:01, 16:03): one setting for every time Route shows and every start time typed. Local is this device's offset, or the one set in the time bar */
  function tzOff() { var v = store('fs-tz'); return v != null && v !== '' && !isNaN(+v) ? +v : -new Date().getTimezoneOffset() / 60; }
  function tzLocal() { return store('fs-timemode') === 'local'; }
  function tzSh() { return tzLocal() ? Math.round(tzOff() * 3600) : 0; }   /* seconds to add to a UTC time */
  function tzMs(ms) { return ms + tzSh() * 1000; }
  function tzS1() { if (!tzLocal()) return 'UTC'; var o = tzOff(); return 'UTC' + (o >= 0 ? '+' : '−') + Math.abs(o); }
  function tzSet(v) { store('fs-timemode', v === 'local' ? 'local' : 'utc'); var sel = $('timeMode'); if (sel) sel.value = tzLocal() ? 'local' : 'utc'; try { chipStart(); } catch (e) {} try { if (S.routes && S.routes.length) show(); else draw(); } catch (e) {} try { if (!$('wiz').hidden && WIZ.step === 3) { if (S.card) cardStep(3); else wizShow(3); } } catch (e) {} }
  window.__fsTzSet = function (v) { tzSet(v); };
  window.__fsTZ = function () { return { local: tzLocal(), sh: tzSh(), label: tzS1() }; };
  function hhmm(ms) { var d = new Date(tzMs(ms)); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function dayhm(ms) { var d = new Date(tzMs(ms)), today = new Date(tzMs(Date.now())); return (d.toUTCString().slice(0, 16) === today.toUTCString().slice(0, 16) ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ') + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }   /* ms; the later hhmm() takes seconds */
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
    if (RG) $('bandNote').textContent = 'Whole area: forecasts for every point from ' + RG.s + '° to ' + RG.n + '°N and ' + Math.abs(RG.w) + '°W to ' + Math.abs(RG.e) + '°' + (RG.e >= 0 ? 'E' : 'W') + ', from ' + clockH(w[0]).slice(4) + ' to ' + clockH(w[1]).slice(4) + ' ' + tzS1() + '. Any course inside the box routes. Shown as a dashed line on the chart.';
    else {
    var bw = meta.course.band.map(function (b) { return b[4]; });
    $('bandNote').textContent = 'Cut to the race: forecasts only within ' + Math.round(Math.min.apply(null, bw)) + ' nm of the course in the Solent and ' + Math.round(Math.max.apply(null, bw)) + ' nm offshore (30% of each leg), from ' + clockH(w[0]).slice(4) + ' to ' + clockH(w[1]).slice(4) + ' ' + tzS1() + ': an hour before the first start to 1.4 times the slowest routed finish. Shown as a dashed line on the chart.';
    }
    $('dataTable').innerHTML = h; $('dlTotal').textContent = tot ? mb(tot) + ' to fetch' : 'nothing new to fetch';
    [].forEach.call($('dataTable').querySelectorAll('select'), function (s) { s.onchange = function () { S.choice[s.dataset.dl] = s.value; S.plan = 'custom'; [].forEach.call($('plans').children, function (b) { b.setAttribute('aria-pressed', 'false'); }); dataTable(); }; });
    $('dataNote').textContent = 'Forecast run ' + meta.run + (meta.built ? '; published on the FirstShift server at ' + dayhm(meta.built * 1000) + ' ' + tzS1() : '') + '. Age is the time since each model run; amber over 12 hours, red over 18. Times in UTC. Choose what this device downloads: full detail on Starlink, less on a phone signal.';
  }
  function download() {
    var todo = meta.layers.filter(function (L) { if (L.device) return false; var c = S.choice[L.id] || 'off'; return c !== S.loaded[L.id] && !(c === 'off' && !S.loaded[L.id]); });
    var ovJob = Promise.resolve();
    if (meta.overview && $('ovChk').checked && !S.ov) ovJob = fetch((window.FS_PACK || 'pack/') + '' + meta.overview.file).then(function (r) { return r.arrayBuffer(); }).then(function (b) { S.ov = b; layersPop(); });
    if (!$('ovChk').checked && S.ov) { S.ov = null; if (S.big) toggleBig(); }
    if (!todo.length) { return ovJob.then(function () { chip(); dataTable(); $('dlNote').textContent = 'Up to date.'; }); }
    busy('');
    var dlN = todo.filter(function (L) { return (S.choice[L.id] || 'off') !== 'off'; }).length, dlDone = 0, dlTot = 0, dlGot = 0;
    todo.forEach(function (L) { var c = S.choice[L.id]; if (c && c !== 'off' && L[c]) dlTot += L[c].bytes || L[c].size || 0; });
    var dlShow = function () { prog('Loading forecasts', dlN ? dlDone / dlN : null, dlDone + ' of ' + dlN + ' forecasts' + (dlTot ? ', ' + mb(dlGot) + ' of ' + mb(dlTot) : '')); };
    if (dlN) dlShow();
    /* F111 (Stuart 21 Nov 12:22, "Map is not rendering the depth contour ... connection is slow"): every file downloaded at once, so on a
       slow line the half-megabyte depth shared it with the wind files and the contours were drawn only once everything had arrived.
       The depth now comes first and the contours are drawn the moment it is in; the forecasts follow. */
    var one = function (L) {
      var c = S.choice[L.id] || 'off';
      if (c === 'off') {
        if (L.kind === 'depth') P.depth = null; else delete P[L.kind][L.id];
        delete S.loaded[L.id];
        return all(function () { return { msg: { type: 'drop', kind: L.kind, lid: L.id } }; });
      }
      var v = L[c];
      var runs = v.runs ? fetch((window.FS_PACK || 'pack/') + '' + v.runs).then(function (r) { return r.json(); }) : Promise.resolve(null);
      return Promise.all([fetch((window.FS_PACK || 'pack/') + '' + v.file).then(function (r) { if (!r.ok) throw new Error(L.name + ' did not download'); return r.arrayBuffer(); }), runs]).then(function (two) {
        var buf = two[0], spec = Object.assign({ kind: L.kind, id: L.id, name: L.name }, v); if (two[1]) spec.druns = two[1];
        FSRouter.addLayer(P, spec, buf); S.loaded[L.id] = c; (S.gotAt = S.gotAt || {})[L.id] = Date.now(); dlDone++; dlGot += buf.byteLength; dlShow();
        if (L.kind === 'depth') { try { buildDepth(); draw(); } catch (e) {} }
        return all(function () { var copy = buf.slice(0); return { msg: { type: 'layer', L: spec, buf: copy }, tr: [copy] }; });
      });
    };
    var isD = function (L) { return L.kind === 'depth'; };
    return Promise.all(todo.filter(isD).map(one)).then(function () { return Promise.all(todo.filter(function (L) { return !isD(L); }).map(one)); }).then(function () {
      return ovJob;
    }).then(function () {
      busy(''); prog(''); dataTable(); modelsList(); selects(); chip(); buildDepth(); draw(); try { setupRender(); } catch (e) {}
      $('dlNote').textContent = 'Up to date.';
    }).catch(function (e) { busy(''); prog(''); $('dlNote').textContent = e.message; });
  }
  /* ---------- fallback: when the server's forecasts are missing or old, fetch wind for the area straight from Open-Meteo on this device ---------- */
  /* B (Stuart 20 Nov 16:05, 16:18: "download locally the gribs that are out of date"): each wind model whose newest run on the server is more than
     18 hours old is fetched by name from Open-Meteo straight to this device (names checked against Open-Meteo on 20 Nov), and replaces the stale one;
     with no forecast pack at all, the one blended Open-Meteo wind as before */
  var OMN = { ukv: 'ukmo_uk_deterministic_2km', arome: 'meteofrance_arome_france_hd', icon: 'icon_eu', ecmwf: 'ecmwf_ifs025', aifs: 'ecmwf_aifs025_single', gfs: 'gfs_global', arpege: 'meteofrance_arpege_europe' };
  function omGrid() { var c = meta.course, la = [c.start.lat, c.finish.lat], lo = [c.start.lon, c.finish.lon]; c.marks.forEach(function (m) { la.push(m.lat); lo.push(m.lon); });
    var b = dataBox || { s: Math.min.apply(0, la) - 0.7, n: Math.max.apply(0, la) + 0.7, w: Math.min.apply(0, lo) - 1, e: Math.max.apply(0, lo) + 1 };
    /* 22 Nov (Stuart's Sydney Hobart screenshot): rows and columns reach past the far edges of the area; rounding down left the top row
       of a 0.75 degree grid at 33.85 S, short of the start off Sydney Heads, so that model had no wind there */
    var cells = function (st) { return (Math.ceil((b.n - b.s) / st - 1e-9) + 1) * (Math.ceil((b.e - b.w) / st - 1e-9) + 1); };
    var step = 0.25; while (cells(step) > 300) step += 0.25;
    var ny = Math.ceil((b.n - b.s) / step - 1e-9) + 1, nx = Math.ceil((b.e - b.w) / step - 1e-9) + 1, lats = [], lons = [];
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) { lats.push((b.s + y * step).toFixed(2)); lons.push((b.w + x * step).toFixed(2)); }
    return { b: b, step: step, ny: ny, nx: nx, lats: lats, lons: lons }; }
  function omLayer(G, j, id, name) {   /* Open-Meteo's answer for the grid points as a wind layer; hours past the model's last one are left out */
    if (!Array.isArray(j)) j = [j]; var times = j[0].hourly.time, plane = G.ny * G.nx, last = -1;
    j.forEach(function (pt) { var ws = pt.hourly.wind_speed_10m; for (var ti = ws.length - 1; ti > last; ti--) if (ws[ti] != null) { last = ti; break; } });
    var nt = last + 1; if (nt < 2) throw new Error('no wind in the answer');
    var buf = new ArrayBuffer(plane * nt * 4), u = new Int16Array(buf, 0, plane * nt), v = new Int16Array(buf, plane * nt * 2, plane * nt);
    j.forEach(function (pt, k) { var ws = pt.hourly.wind_speed_10m, wd = pt.hourly.wind_direction_10m; for (var ti = 0; ti < nt; ti++) { var sp = ws[ti], d = wd[ti], i = ti * plane + k; if (sp == null || d == null) { u[i] = v[i] = -32768; continue; } u[i] = Math.round(-sp * Math.sin(d * R) * 100); v[i] = Math.round(-sp * Math.cos(d * R) * 100); } });
    var hours = times.slice(0, nt).map(function (t) { return (t - T0) / 3600; }), b = G.b;
    return { buf: buf, spec: { kind: 'wind', id: id, name: name, ny: G.ny, nx: G.nx, lat0: b.s, lon0: b.w, dlat: G.step, dlon: G.step, hours: hours, u: { off: 0, n: plane * nt, scale: 0.01 }, v: { off: plane * nt * 2, n: plane * nt, scale: 0.01 } },
      full: { ny: G.ny, nx: G.nx, lat0: b.s, lon0: b.w, dlat: G.step, dlon: G.step, hours: hours, bytes: buf.byteLength, gz: buf.byteLength, size: buf.byteLength, step_h: 1, res_km: [G.step * 111, G.step * 111 * Math.cos(b.s * R)] } }; }
  function omFetch(G, model) { var ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + G.lats.join(',') + '&longitude=' + G.lons.join(',') + '&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timeformat=unixtime&forecast_days=7' + (model ? '&models=' + model : ''), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('Open-Meteo answered ' + r.status); return r.json(); }, function (e) { clearTimeout(tm); throw e; }); }
  /* Stuart 22 Nov 07:55 (decided 08:05): Get newest on a finish box fetches that one model's newest run to this device, then routes again */
  window.__fsCanFetch = function (id) { return !!(OMN[id] && P && P.wind && P.wind[id]); };
  window.__fsGetNewest = function (id) {
    var L = (meta.layers || []).filter(function (x) { return x.id === id; })[0]; if (!L || !OMN[id] || !navigator.onLine) return Promise.resolve(false);
    var G = omGrid(); return omFetch(G, OMN[id]).then(function (j) { var o = omLayer(G, j, id, L.name.replace(/ \(this device\)$/, '') + ' (this device)'); L.dev = o.full; L.name = o.spec.name; L.device = true; L.devAt = Date.now(); FSRouter.addLayer(P, o.spec, o.buf); S.loaded[id] = 'dev';
      S.omNote = 'Fetched on this device from Open-Meteo: ' + short(id) + ' (its newest run).'; var copy = o.buf.slice(0);
      return all(function () { return { msg: { type: 'layer', L: o.spec, buf: copy }, tr: [copy] }; }); })
      .then(function () { try { modelsList(); selects(); dataTable(); chip(); } catch (e) {} S.key = null; S.from = null; userRun(); return true; }, function (e) { L.devErr = e && e.message; return false; }); };
  function omFallback() {
    var age = (Date.now() / 1000 - meta.t0) / 3600, none = !Object.keys(P.wind).length;
    if (navigator.onLine && !none) { var nowS = Date.now() / 1000, stale = meta.layers.filter(function (L) { return L.kind === 'wind' && OMN[L.id] && P.wind[L.id] && !L.device && L.run_t0 && (nowS - L.run_t0) / 3600 > 18; });
      if (stale.length) { var G = omGrid(), got = [];
        prog('Fresh forecasts on this device', null, stale.map(function (L) { return short(L.id); }).join(', ') + (stale.length > 1 ? ' are' : ' is') + ' more than 18 h old on the server, so Route is fetching ' + (stale.length > 1 ? 'them' : 'it') + ' from Open-Meteo straight to this device.');
        return Promise.all(stale.map(function (L) { return omFetch(G, OMN[L.id]).then(function (j) { var o = omLayer(G, j, L.id, L.name + ' (this device)'); L.dev = o.full; L.name = L.name + ' (this device)'; L.device = true; L.devAt = Date.now(); FSRouter.addLayer(P, o.spec, o.buf); S.loaded[L.id] = 'dev'; got.push({ L: L, o: o }); }, function (e) { L.devErr = e.message; }); }))
          .then(function () { S.omNote = got.length ? 'Fetched on this device from Open-Meteo, as the server’s runs were more than 18 h old: ' + got.map(function (g) { return short(g.L.id); }).join(', ') + '.' + (got.length < stale.length ? ' Could not fetch: ' + stale.filter(function (L) { return L.devErr; }).map(function (L) { return short(L.id) + ' (' + L.devErr + ')'; }).join(', ') + '; the server’s run is used.' : '') : 'Could not fetch fresh forecasts from Open-Meteo; the server’s runs are used.';
            return Promise.all(got.map(function (g) { var copy = g.o.buf.slice(0); return all(function () { return { msg: { type: 'layer', L: g.o.spec, buf: copy }, tr: [copy] }; }); })); })
          .then(function () { prog(''); modelsList(); selects(); dataTable(); chip(); }, function () { prog(''); }); }
      return Promise.resolve(); }
    if (!navigator.onLine || !(none || (meta.live && age > 18)) || P.wind.om) return Promise.resolve();   /* F1 (17 Nov): the server's runs come every six hours and arrive some eight hours after their time, so 12 hours old is normal each morning; only past 18 hours is the phone sent to Open-Meteo */
    var c = meta.course, la = [c.start.lat, c.finish.lat], lo = [c.start.lon, c.finish.lon]; c.marks.forEach(function (m) { la.push(m.lat); lo.push(m.lon); });
    var b = dataBox || { s: Math.min.apply(0, la) - 0.7, n: Math.max.apply(0, la) + 0.7, w: Math.min.apply(0, lo) - 1, e: Math.max.apply(0, lo) + 1 };
    /* 22 Nov (Stuart's Sydney Hobart screenshot): rows and columns reach past the far edges of the area; rounding down left the top row
       of a 0.75 degree grid at 33.85 S, short of the start off Sydney Heads, so that model had no wind there */
    var cells = function (st) { return (Math.ceil((b.n - b.s) / st - 1e-9) + 1) * (Math.ceil((b.e - b.w) / st - 1e-9) + 1); };
    var step = 0.25; while (cells(step) > 300) step += 0.25;
    var ny = Math.ceil((b.n - b.s) / step - 1e-9) + 1, nx = Math.ceil((b.e - b.w) / step - 1e-9) + 1, lats = [], lons = [];
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
    $('dataChip').textContent = (window.FS_MARK ? 'Mark' : 'Route') + ' v0.12.100 · ' + (!navigator.onLine ? 'Offline: saved forecast · ' : meta.live ? 'Live · ' : '') + 'Run ' + clockAbs(meta.t0 - tzSh()).replace(/ (\d\d):00$/, ' $1Z') + (meta.live ? ' (' + ageTxt(age) + ' old)' : '') + ' · ' + w + ' wind models (' + hi + ') · ' + mb(bytes) + (P.wind.om ? ' · plus Open-Meteo fetched on this device' : '');
    $('dataChip').style.color = meta.live && age > 18 ? 'var(--shoaledge)' : meta.live && age > 12 ? 'var(--warn)' : '';
  }

  /* ---------- controls ---------- */
  var starts = [];
  function setup() {
    readCss();
    var bySt = {};
    meta.fleet.forEach(function (f) { if (!f.irc || !f.start) return; (bySt[f.start] = bySt[f.start] || {}); f.cls.forEach(function (c) { bySt[f.start][c] = 1; }); });
    if (meta.live) {
      // live forecasts: start any hour from the next one to six hours before the longest forecast ends (it was 36 h when forecasts ran 2 days; now up to 10)
      var first = Math.max(meta.course.window[0] + 1, Math.ceil((Date.now() / 1000 - T0) / 3600));
      for (var hh = first; hh <= HMAX() - 6; hh++) { var ep = T0 + hh * 3600; starts.push(ep); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + ep + '">' + clockAbs(ep) + ' ' + tzS1() + '</option>'); }
    } else Object.keys(bySt).sort().forEach(function (s) { starts.push(+s); $('startSel').insertAdjacentHTML('beforeend', '<option value="' + s + '">' + clockAbs(+s).slice(4) + ' · ' + Object.keys(bySt[s]).sort().join(', ') + '</option>'); });
    $('startSel').value = String(starts[0]);
    S.tmin = (starts[0] - T0) / 3600; S.tmax = Math.min(HMAX(), S.tmin + 26);
    meta.fleet.filter(function (f) { return f.irc; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (f) { $('boatPick').insertAdjacentHTML('beforeend', '<option value="' + f.name + '">' + f.name + ' · TCC ' + f.tcc.toFixed(3) + '</option>'); });
    $('boatPick').onchange = function () { var f = meta.fleet.find(function (x) { return x.name === $('boatPick').value; }); if (f) { $('tcc').value = f.tcc.toFixed(3); if (!$('boatName').value) $('boatName').value = f.name; if (!meta.live) $('startSel').value = String(f.start); boatChanged(); } };
    initBoat();
    (function () { var el = $('margin'); if (!el) return; var v = store('fs-margin'); if (v != null && el.querySelector('option[value="' + v + '"]')) el.value = v; el.onchange = function () { store('fs-margin', el.value); buildDepth(); draw(); }; })();
    $('depth').oninput = function () { depthSet($('depth').value); };
    if ($('depth2')) $('depth2').oninput = function () { depthSet($('depth2').value); };
    depthSet($('depth').value, true);
    $('run').onclick = function () { S.from = null; userRun(); };
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
    /* friends and family (Stuart 20 Nov 2026 06:25): the boat's GPS position every 15 minutes and the chosen route, posted under the crew's boat
       code; positions taken with no signal are kept on this device and sent when it returns; family follow with their own view-only follow code,
       so the follow link never carries the crew's code */
    (function () {
      var cb = $('shareTrack'); if (!cb) return; cb.checked = store('fs-share') === '1';
      var QK = 'fs-trackq', fol = function () { return BC.code ? store('fs-follow-' + BC.code) || '' : ''; };
      var q = function () { try { return JSON.parse(store(QK) || '[]') || []; } catch (e) { return []; } }, qset = function (a) { store(QK, JSON.stringify(a.slice(-2000))); };
      cb.onchange = function () { store('fs-share', cb.checked ? '1' : '0'); if (cb.checked && !BC.code) $('shareNote').textContent = 'Make or join a boat code first: tap the race name, then Boat code.'; if (cb.checked) { send(); sendRoute(); } };
      function post(o) { if (!BC.code || !navigator.onLine) return Promise.reject(new Error('offline')); o.name = $('boatName').value || ''; var code = BC.code;
        return fetch('/api/track/' + code, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) }).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw new Error(j.error); if (j.follow) store('fs-follow-' + code, j.follow); return j; }); }
      var busyQ = false;
      function flush() { if (busyQ || !cb.checked || !BC.code || !navigator.onLine) return; var a = q(); if (!a.length) return; busyQ = true; var n = a.length;
        post({ pts: a }).then(function () { qset(q().slice(n)); }, function () {}).then(function () { busyQ = false; }); }
      function send() { if (!cb.checked || !BC.code || !navigator.geolocation || document.hidden) return; navigator.geolocation.getCurrentPosition(function (g) { var a = q(); a.push([Date.now() / 1000, g.coords.latitude, g.coords.longitude, g.coords.speed != null && g.coords.speed >= 0 ? g.coords.speed / KN : null]); qset(a); flush(); }, function () {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }); }
      var lastKey = '';
      function sendRoute() { if (!cb.checked || !BC.code || !S.sel || !S.sel.r) return; var p = S.sel.r.path, key = S.sel.id + p.length + (S.sel.r.finish || 0); if (key === lastKey) return; var step = Math.max(1, Math.floor(p.length / 600)), path = p.filter(function (q2, i) { return i % step === 0 || i === p.length - 1; }).map(function (q2) { return [q2.la, q2.lo]; });
        post({ route: { name: meta.course.name, path: path, finish: S.sel.r.partial ? null : T0 + S.sel.r.finish * 3600 } }).then(function () { lastKey = key; }, function () {}); }
      setInterval(send, 900000); setInterval(sendRoute, 60000); setInterval(flush, 60000); window.addEventListener('online', function () { flush(); sendRoute(); });
      window.__fsTrackQ = function () { return q().length; }; window.__fsTrackSend = send;   /* for the automatic tests */
      $('shareLink').onclick = function () { if (!BC.code) { $('shareNote').textContent = 'Make or join a boat code first: tap the race name, then Boat code.'; return; }
        var go = function (f) { var link = pubOrigin() + '/follow/?f=' + f, t = 'Follow ' + ($('boatName').value || 'the boat') + ' on FirstShift Route: ' + link; if (sendOut('Follow the boat', t)) $('shareNote').textContent = 'Follow link: ' + link; else (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('shareNote').textContent = 'Link copied: ' + link; }, function () { $('shareNote').textContent = link; }); };
        if (fol()) return go(fol()); $('shareNote').textContent = 'Making the follow code…';
        post({}).then(function (j) { go(j.follow); }, function () { $('shareNote').textContent = 'The follow code needs a signal once. Try again when the phone is online.'; }); };
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
    var DISPLAY_ONLY = /^(windDim|tideDim|windSym|tideSym|windShow|speed|ovChk|autoFrom|shareTrack|leeway|depthView|zoomMax|depth2|bowOff|boatLoa|pingFrom)=/;
    /* F55 (Stuart 18 Nov 15:49): boat length and where the ping is called from fill in the phone-to-ping-point distance */
    (function () { var L = $('boatLoa'), F = $('pingFrom'), O = $('bowOff'); if (!L || !F || !O) return;
      var fill = function () { var loa = +L.value; O.value = F.value === 'bow' ? (loa > 0 ? loa : O.value) : 0; };
      L.addEventListener('change', fill); F.addEventListener('change', fill);
      window.__fsLoa = function (v) { if (v == null) return +L.value > 0 ? +L.value : null; L.value = v; fill(); try { L.dispatchEvent(new Event('change')); } catch (e) {} }; })();

    function routeSnap() { return settingsSnap().split('|').filter(function (x) { return !DISPLAY_ONLY.test(x); }).join('|'); }
    $('setBtn').onclick = function () { setSnap = routeSnap(); $('sheet').hidden = false; plotPolar(); };
    $('sheetX').onclick = function () { $('sheet').hidden = true; if (setSnap && routeSnap() !== setSnap && !S.running) { busy('Settings changed: routing again…'); S.from = null; run(); } setSnap = ''; };
    $('sheet').onclick = function (e) { if (e.target === $('sheet')) $('sheetX').onclick(); };
    [].forEach.call(document.querySelectorAll('.stabs .tab'), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll('.stabs .tab'), function (x) { x.setAttribute('aria-selected', x === b); $('s-' + x.dataset.s).hidden = x !== b; }); }; });
    [].forEach.call($('panel').querySelectorAll('.tabs .tab[data-tab]'), function (b) { b.onclick = function () { openTab(b.dataset.tab, true); }; });
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
    $('layersBtn').onclick = function () { var p = $('layers'); if (!p.hidden) { closeLayers(); return; } p.hidden = false; layDepth = +$('depth').value; $('layersBtn').setAttribute('aria-expanded', 'true'); layersPop(); popBelowTop(p); };
    [].forEach.call($('plans').children, function (b) { b.onclick = function () { applyPlan(b.dataset.plan); }; });
    $('dlBtn').onclick = function () { download(); };
    $('ovChk').onchange = dataTable;
    $('tipX').onclick = function () { $('tip').hidden = true; };
    $('windShow').onchange = draw;
    ['windSym', 'tideSym'].forEach(function (id) { var v = store('fs-' + id); if (v && $(id).querySelector('option[value="' + v + '"]')) $(id).value = v; $(id).onchange = function () { store('fs-' + id, $(id).value); syncSym(); draw(); animate(); }; });
    if (window.FSSails) FSSails.init({ pts: function () { return S.sel && S.sel.r ? S.sel.r.path : []; }, onChange: function () { plan(); compareTable(); update(); } });
    ['sails', 'mains'].forEach(function (id) { $(id).addEventListener('input', function () { plan(); update(); }); });
    if (!wide()) $('panel').hidden = false;
    else if (true) {   /* Stuart 17 Nov 14:19: opens with all the menus showing; closing the panel lasts until the next start */ $('panel').hidden = false; $('panel').classList.remove('collapsed'); $('panelBtn').setAttribute('aria-expanded', 'true'); }   /* on a computer the results open beside the chart unless you closed them */
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
    resize(); fit(); setTime((starts[0] - T0) / 3600); animate(); try { fixMount(); } catch (e) {}
    document.addEventListener('visibilitychange', animate);
    document.addEventListener('visibilitychange', function () { if (document.hidden) sessSave(); }); window.addEventListener('pagehide', function () { sessSave(); });
  }
  function syncSym() { var a = document.getElementById('lWind'), b = document.getElementById('lTide'); if (a) a.value = $('windSym').value; if (b) b.value = $('tideSym').value; }
  var layDepth = null;   /* the no-go depth when the Layers panel opened: closing it routes again if it changed, as closing Settings does */
  function closeLayers() { $('layers').hidden = true; $('layersBtn').setAttribute('aria-expanded', 'false'); if (layDepth != null && +$('depth').value !== layDepth) depthRerun(); layDepth = null; }
  function depthRerun() { if (S.running) { setTimeout(depthRerun, 1000); return; } busy('No-go depth changed: routing again…'); S.from = null; run(); }   /* waits for a route already being worked out, then routes again with the new depth */
  function closePanel() { var p = $('panel'); if (wide()) p.hidden = true; else p.classList.add('collapsed'); $('panelBtn').setAttribute('aria-expanded', 'false'); setTimeout(resizeDraw, 0); }
  function wide() { return matchMedia('(min-width:900px), (orientation:landscape) and (max-height:500px)').matches; }   /* a phone on its side gets the computer layout: a short screen needs the chart beside the results */
  function openTab(t, fromTab) {
    var p = $('panel'); p.hidden = false;
    var cur = p.querySelector('.tabs .tab[aria-selected="true"]');   /* Route's own panel only: Mark's panel has tabs of its own */
    if (!wide() && fromTab && cur && cur.dataset.tab === t && !p.classList.contains('collapsed')) { p.classList.add('collapsed'); setTimeout(resizeDraw, 0); return; }
    p.classList.remove('collapsed');
    [].forEach.call(p.querySelectorAll('.tabs .tab[data-tab]'), function (x) { x.setAttribute('aria-selected', x.dataset.tab === t); var sec = $('t-' + x.dataset.tab); if (sec) sec.hidden = x.dataset.tab !== t; });
    setTimeout(resizeDraw, 0);
  }
  /* newest run or an older one kept because the newest was not ready (Stuart 12 Nov): the navigator decides */
  var THUMB = '<svg class="thumb" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.3 0 2 1 2 2.2V10h5.4c1.1 0 1.9 1 1.7 2.1l-1.3 6.4c-.2.9-1 1.5-1.9 1.5H7"/></svg>';
  function runOf(l) { return (meta.runs && meta.runs[l.id]) || ''; }
  function runBadge(l) {
    if (l.latest === true) return '<span class="runok" title="The newest run of this model">' + THUMB + ' newest run ' + wizEsc(runOf(l)) + '</span>';
    if (l.latest === false) return '<span class="runold" title="The newest run was not ready, so the last good run is used">! older run ' + wizEsc(runOf(l).replace(' (older run kept)', '')) + ': the newest was not ready</span>';
    return runOf(l) ? '<span class="runnone">run ' + wizEsc(runOf(l)) + '</span>' : '';
  }
  function olderModels() { return (meta.layers || []).filter(function (l) { return l.kind === 'wind' && l.latest === false && selectedModels().indexOf(l.id) >= 0; }).map(function (l) { return short(l.id); }); }
  function modelsList() {
    var h = '', prev = selectedModels(), first = !$('models').children.length;
    meta.layers.filter(function (l) { return l.kind === 'wind'; }).forEach(function (l) {
      var on = !!P.wind[l.id], st = STYLE[l.id], v = l[S.loaded[l.id] || 'full'];
      h += '<label class="chk"><input type="checkbox" data-m="' + l.id + '"' + (on ? '' : ' disabled') + ((first ? on && l.id !== 'mog' && l.id !== 'arpege' : prev.indexOf(l.id) >= 0 && on) ? ' checked' : '') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + l.name + ' <span class="pill">' + (on ? res(v) + ', ' + v.step_h + ' h' : 'not downloaded') + '</span>' + runBadge(l) + '</label>';
    });
    $('models').innerHTML = h;
  }
  function selects() {
    function opts(kind, none) { return meta.layers.filter(function (l) { return l.kind === kind && P[kind][l.id]; }).map(function (l) { return '<option value="' + l.id + '">' + l.name + '</option>'; }).join('') + '<option value="">' + none + '</option>'; }
    var t = $('tideSel').value, w = $('waveSel').value, ws = $('windShow').value;
    $('tideSel').innerHTML = opts('tide', 'No tide'); $('waveSel').innerHTML = opts('wave', 'Ignore sea state'); $('windShow').innerHTML = opts('wind', 'No arrows');
    if (t && P.tide[t]) $('tideSel').value = t; if (w && P.wave[w]) $('waveSel').value = w; if (ws && P.wind[ws]) $('windShow').value = ws;
  }
  /* Screen rules (UI review step 1, 16 Nov): a window opens below the top bar, never over its second row of buttons (tablet sideways, PC) */
  function popBelowTop(p) { try { var t = document.querySelector('.top'), par = p.offsetParent || document.body; if (!t) return; var mt = document.getElementById('mkTop'), tb = t.getClientRects().length ? t.getBoundingClientRect().bottom : mt ? mt.getBoundingClientRect().bottom : par.getBoundingClientRect().top - 54;   /* Mark: under Mark's floating top bar */ ['navStrip', 'fsPlot', 'astroLine'].forEach(function (id) { var ns = document.getElementById(id); if (ns && !ns.hidden && ns.getClientRects().length) tb = Math.max(tb, ns.getBoundingClientRect().bottom); }); tb = tb - par.getBoundingClientRect().top + 6; p.style.top = Math.max(window.FS_MARK ? 8 : 60, Math.round(tb)) + 'px'; p.style.maxHeight = 'calc(100% - ' + (Math.max(window.FS_MARK ? 8 : 60, Math.round(tb)) + 20) + 'px)'; } catch (e) {} }
  function layersPop() {
    var h = '<div class="pophead"><span>Chart layers</span><button class="close" id="layersX" aria-label="Close layers">\u00d7</button></div><div class="lquick"><button class="btn" id="lAll">Show all</button><button class="btn" id="lCourse">Just the course</button><button class="btn" id="lRoute">Just the route</button></div>' +
      '<div class="ldepth"><label for="lDepth">No-go depth</label><input type="range" id="lDepth" min="0" max="20" step="0.5" value="' + (+$('depth').value) + '" aria-label="No-go depth (the safety depth)"><b id="lDepthV" style="font-family:var(--f-data)">' + (+$('depth').value).toFixed(1) + ' m</b></div>' + '<div class="lgrp">Chart (free, not for navigation)</div>' + Object.keys(CHARTS).map(function (k) { return '<label><input type="checkbox" data-l="' + k + '"' + (S.show[k] ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>' + CHARTS[k].name + '</label>'; }).join('') + '<div class="lgrp">Weather and race</div><label><input type="checkbox" data-l="wind"' + (S.show.wind ? ' checked' : '') + '><span class="sw" style="border-color:var(--wind)"></span>Wind</label><select id="lWind" aria-label="Wind symbol" style="margin-left:29px">' + $('windSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="tide"' + (S.show.tide ? ' checked' : '') + '><span class="sw" style="border-color:var(--tide)"></span>Tidal stream</label><select id="lTide" aria-label="Tide symbol" style="margin-left:29px">' + $('tideSym').innerHTML + '</select>' +
      '<label><input type="checkbox" data-l="ghosts"' + (S.show.ghosts ? ' checked' : '') + '><span class="sw" style="border-color:var(--ghost);border-top-style:dotted"></span>Fleet on your route</label>' +
      '<label><input type="checkbox" data-l="legs"' + (S.show.legs ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Course rhumb lines: course and distance</label>' +
      (ZONES.length ? '<label><input type="checkbox" data-l="tss"' + (S.show.tss ? ' checked' : '') + '><span class="sw" style="border-color:var(--warn)"></span>Traffic separation schemes</label>' : '') +
      (LIGHTS.length ? '<label><input type="checkbox" data-l="lights"' + (S.show.lights ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink);border-top-style:dotted"></span>Lighthouses and main buoys</label>' : '') +
      '<label><input type="checkbox" data-l="tracks"' + (S.show.tracks ? ' checked' : '') + '><span class="sw" style="border-color:#4CC38A"></span>Tracks: the boat\'s trail, dead reckoning and filed tracks</label>' +
      '<label><input type="checkbox" data-l="lay"' + (S.show.lay ? ' checked' : '') + '><span class="sw" style="border-color:var(--brand);border-top-style:dashed"></span>Laylines to the next mark</label>' +
      (metField() ? '<div class="lgrp">Weather from ECMWF, at the slider time</div>' + MET.map(function (m) { return '<label><input type="checkbox" data-l="' + m[0] + '"' + (S.show[m[0]] ? ' checked' : '') + '><span class="sw" style="border-color:' + m[3] + '"></span>' + m[1] + '</label>'; }).join('') : '') +
      '<label><input type="checkbox" data-l="iso"' + (S.show.iso ? ' checked' : '') + '><span class="sw" style="border-color:var(--muted)"></span>Isochrones of the chosen route (each hour)</label>' +
      '<label><input type="checkbox" data-l="band"' + (S.show.band ? ' checked' : '') + '><span class="sw" style="border-color:var(--muted);border-top-style:dashed"></span>Forecast band edge</label>' +
      (S.ov ? '<label><input type="checkbox" data-big="1"' + (S.big ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Big picture: north-west Europe</label>' : '') +
      (meta.live ? '' : '<label><input type="checkbox" data-l="real"' + (S.show.real ? ' checked' : '') + '><span class="sw" style="border-color:var(--ink)"></span>Real 2026 boats (YB)</label>');
    S.routes.forEach(function (s, i) { var st = s.combined ? ['--route', []] : STYLE[s.id]; h += '<label><input type="checkbox" data-r="' + i + '"' + (s.hidden ? '' : ' checked') + '><span class="sw" style="border-color:var(' + st[0] + ');border-top-width:' + (s.combined ? 4 : 3) + 'px;border-top-style:' + (st[1].length ? 'dashed' : 'solid') + '"></span>' + s.name + ' · ' + fmtH(s.r.finish - S.start.t) + '</label>'; });
    $('layers').innerHTML = h;
    var LK = ['wind', 'tide', 'ghosts', 'tss', 'lights', 'lay', 'band', 'legs'];
    $('lAll').onclick = function () { LK.forEach(function (k) { S.show[k] = true; }); S.routes.forEach(function (r) { r.hidden = false; }); layersPop(); draw(); };
    $('lCourse').onclick = function () { LK.forEach(function (k) { S.show[k] = false; }); S.show.legs = true; S.show.tss = true;   /* just the course: rhumb lines with course and distance on each leg, and the TSS, which always stay (Stuart 12 Nov) */ S.routes.forEach(function (r) { r.hidden = true; }); layersPop(); draw(); };
    $('lRoute').onclick = function () { LK.forEach(function (k) { S.show[k] = false; }); S.show.legs = true;   /* just the route still shows course and distance on each leg (Stuart 12 Nov) */ S.routes.forEach(function (r) { r.hidden = r !== S.sel; }); layersPop(); draw(); };
    [].forEach.call($('layers').querySelectorAll('input'), function (c) { if (c.type === 'range') return;   /* the No-go depth slider has its own handler (17 Nov: its change event threw here) */ c.onchange = function () { if (c.dataset.big) { toggleBig(); animate(); return; } if (c.dataset.l) { S.show[c.dataset.l] = c.checked; if (CHARTS[c.dataset.l]) { chartSave(); chartCredit(); } if (c.dataset.l === 'iso' && c.checked) isoFetch(); if (c.dataset.l === 'tracks') { try { localStorage.setItem('fs-tracksshow', c.checked ? '1' : '0'); } catch (e) {} } } else S.routes[+c.dataset.r].hidden = !c.checked; draw(); animate(); }; });
    syncSym();
    $('layersX').onclick = closeLayers;
    $('lDepth').oninput = function () { depthSet($('lDepth').value); };
    $('lWind').onchange = function () { $('windSym').value = $('lWind').value; $('windSym').onchange(); };
    $('lTide').onchange = function () { $('tideSym').value = $('lTide').value; $('tideSym').onchange(); };
  }

  function clockAbs(epoch) { var d = new Date((epoch + tzSh()) * 1000); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); }
  function clockH(h) { return clockAbs(T0 + h * 3600); }
  function fmtH(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0'); }
  function short(id) { return { ecmwf: 'ECMWF', ukv: 'UKV', gfs: 'GFS', aifs: 'AIFS', mog: 'MO Global', icon: 'ICON-EU', arome: 'AROME', arpege: 'ARPEGE', om: 'Open-Meteo', chain: 'Finest first', fixed: 'Fixed wind' }[id] || id; }
  /* Progress card. Nielsen Norman Group: waits of 2 to 10 seconds get a looped indicator, longer ones a percent-done bar with a step count
     and a rough time left (Katie Sherwin, "Progress Indicators Make a Slow System Less Insufferable", 2014). */
  var PG = { t0: 0, est: 0 };
  function raceKey() { return (meta && meta.course && (meta.course.raceId || meta.course.name)) || 'x'; }
  function ckSet(k, st, pct, secs) { if (!S.ck) return; S.ck.forEach(function (i) { if (i.k === k) { i.s = st; if (pct != null) i.p = pct; if (secs != null) i.sec = secs; } }); ckRender(); }
  function ckRender() { var p = $('prog'); if (!p) return; var L = $('pgCk'); if (!L) { L = document.createElement('ul'); L.id = 'pgCk'; L.className = 'pgck'; p.appendChild(L); }
    if (!S.ck || p.hidden) { L.innerHTML = ''; return; }
    L.innerHTML = S.ck.map(function (i) { return '<li class="' + i.s + '"><span>' + (i.s === 'done' ? '✓' : i.s === 'run' ? '◐' : '○') + '</span>' + i.t + (i.s === 'run' && i.p ? ' · ' + Math.round(i.p * 100) + '%' : '') + (i.s === 'done' && i.sec ? ' · ' + i.sec + ' s' : '') + '</li>'; }).join(''); }
  /* the routing card can be minimised to one line (Stuart 20 Nov 16:18: "needs a minimise button to clear it"); tap the line or + to open it again; remembered */
  (function () { var b = $('pgMin'), p = $('prog'); if (!b || !p) return; var set = function (on) { p.classList.toggle('small', on); b.textContent = on ? '+' : '–'; b.setAttribute('aria-label', on ? 'Show the routing progress' : 'Minimise the routing progress'); try { localStorage.setItem('fs-pgsmall', on ? '1' : ''); } catch (e) {} };
    var on0 = false; try { on0 = localStorage.getItem('fs-pgsmall') === '1'; } catch (e) {} set(on0); b.onclick = function (e) { e.stopPropagation(); set(!p.classList.contains('small')); }; p.addEventListener('click', function () { if (p.classList.contains('small')) set(false); }); })();
  function prog(title, frac, detail, est) { if (frac != null && frac !== S.progF) { S.progF = frac; S.progAt = Date.now(); }
    if (!title) { $('prog').hidden = true; PG.title = ''; return; }
    if (title !== PG.title) { PG.title = title; PG.t0 = Date.now(); PG.est = est || 0; }
    $('prog').hidden = false; $('pgT').textContent = title; $('prog').classList.toggle('mini', /^Step [23]/.test(title)); ckRender();   /* first routes are on screen: the refining card steps aside */
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
  /* the weather overlays are drawn once into a spare canvas and reused until the chart moves or the time changes (Stuart 12 Nov: phone closed with every overlay on) */
  var metC = null, metKey = '';
  function drawMetCached() {
    if (!metField() || !MET.some(function (m) { return S.show[m[0]]; })) return;
    if (ORI.ang) { drawMet(); return; }   /* turned chart: draw straight in */
    var key = [view.lo.toFixed(5), view.la.toFixed(5), view.s.toFixed(2), W, H, dpr, S.t.toFixed(3), MET.map(function (m) { return S.show[m[0]] ? 1 : 0; }).join(''), css['--ink'], css['--muted']].join('|');
    if (!metC || metC.width !== cv.width || metC.height !== cv.height) { metC = document.createElement('canvas'); metC.width = cv.width; metC.height = cv.height; metKey = ''; }
    if (key !== metKey) { var keep = ctx, oc = metC.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, metC.width, metC.height); oc.setTransform(dpr, 0, 0, dpr, 0, 0); ctx = oc; try { drawMet(); } finally { ctx = keep; } metKey = key; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(metC, 0, 0); ctx.restore();
  }
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
    /* F5 (15 Nov 2026): this used to call draw() while the isochrones were being worked out, and draw() calls this again: the chart was
       redrawn thousands of times in one go (65 s frozen on a computer, longer on a tablet; iOS closed the page). Now it only asks once,
       and the chart is drawn when they arrive. A failed attempt is not repeated on every redraw: Route again clears it. */
    var s = S.sel; if (!s || s.iso || S.isoBusy || !meta) return;
    S.isoBusy = true; busy('Working out the isochrones…');
    var L = S.lastReq || { base: opts(s.models), start: startPt(), legs: legsFor(S.from) };
    pool({ type: 'route', o: Object.assign({}, L.base, { models: s.models, start: L.start, legs: L.legs, iso: true }) }).then(function (r) { S.isoBusy = false; busy(''); s.iso = r.iso || []; draw(); }, function (e) { S.isoBusy = false; s.iso = []; busy('Isochrones: ' + e.message); setTimeout(function () { busy(''); }, 8000); draw(); });
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
    return { blend: store('nav-blend') === '1', models: models, tide: $('tideSel').value || null, wave: $('waveSel').value || null, tcc: +$('tcc').value || 1, polar: pol, polKey: JSON.stringify([spec.src, spec.type, spec.tcc, spec.src === 'polar' ? spec.text.length + ':' + spec.text.slice(-40) : '', spec.tune]),
      sea: { up: +$('seaUp').value, reach: +$('seaReach').value, surf: +$('seaSurf').value, from: 0.5, surfFrom: 1.5 }, safety: +$('depth').value, margin: +($('margin') ? $('margin').value : 1), nogo: nogoRings(), maxHours: HMAX() + 2, tackS: +$('tackS').value, gybeS: +$('gybeS').value, adj: adjVals(), tideWind: $('tideWind') ? $('tideWind').checked : true, polZ: polZ(), stab: $('stabOn') ? $('stabOn').checked : true };
  }
  /* the height the polar's wind speeds refer to: 10 m (ORC, designers, FirstShift and Route+'s learned polars) or the masthead (D, 14 Nov 2026) */
  function polZ() { var z = $('polZ') && $('polZ').value === 'mast' ? +$('mastZ').value : 10; return z > 0 ? z : 10; }
  /* legs from the course: a gate at each mark on its rounding side, then the finish. Fine time steps near the start. */
  var ADJ = [['adjWdir', 'wdir', '°', 1], ['adjWspd', 'wspd', '%', 1], ['adjWtime', 'wtime', ' h', 1], ['adjTspd', 'tspd', '%', 1], ['adjTtime', 'ttime', ' min', 60], ['adjTdir', 'tdir', '°', 1]];
  function adjBox() { var v = ($('adjBox') || {}).value; if (!v || $('adjWhere').value !== 'box') return null; var q = v.split(',').map(Number); return q.length === 4 && q.every(function (x) { return x === x; }) ? { s: q[0], n: q[1], w: q[2], e: q[3] } : null; }
  /* tide by hand (Stuart 17 Nov 09:35: "SETTING BY HAND THE TIDE WHICH IS CRUCIAL"): a steady tide, rate and the direction it runs to,
     for every route while it is on; set from Mark's tide step (by hand, or from the boat on Mark+) */
  var TH = (function () { try { return JSON.parse(store('fs-tidehand') || 'null') || {}; } catch (e) { return {}; } })();
  window.__fsTideHand = function (o) { if (o === undefined) return Object.assign({}, TH); var was = JSON.stringify(TH); TH = o || {}; store('fs-tidehand', JSON.stringify(TH)); if (was !== JSON.stringify(TH)) { adjPill(); clearTimeout(window.__fsThT); window.__fsThT = setTimeout(function () { if (S.routes && S.routes.length && !S.running && !(window.FSSolent && FSSolent.stepState && FSSolent.stepState().on)) { S.key = null; S.preBad = true; run(); } }, 700); } };
  function adjVals() { var a = null; ADJ.forEach(function (x) { var el = $(x[0]), v = el ? +el.value / x[3] : 0; if (v) { a = a || {}; a[x[1]] = v; } }); if (a && $('adjWhere').value === 'box') { a.box = adjBox(); if (!a.box) a = null; } if (a) { var un = +(store('nav-adj-until') || 0); if (un) a.until = un; } var lg = legTide(); if (lg) { a = a || {}; a.legs = lg; } if (TH.on && TH.spd >= 0 && TH.dir != null) { a = a || {}; a.fixT = { spd: +TH.spd, dir: +TH.dir }; } return a; }
  /* a Solent race's tide by hand for each leg (Stuart 15 Nov 11:30): a box round each leg, padded 0.15 nm */
  function legTide() { var c = meta && meta.course, L = c && c.legTide; if (!L || !L.some(function (q) { return q && (q.p || q.d); })) return null; var pp = [c.start].concat(c.marks || []).concat([c.finish]), out = []; for (var i = 1; i < pp.length; i++) { var q = L[i - 1]; if (!q || !(q.p || q.d) || !pp[i - 1] || !pp[i]) continue; var a0 = pp[i - 1], b0 = pp[i], pd = 0.15 / 60, pl = pd / Math.cos(a0.lat * Math.PI / 180); out.push({ box: { s: Math.min(a0.lat, b0.lat) - pd, n: Math.max(a0.lat, b0.lat) + pd, w: Math.min(a0.lon, b0.lon) - pl, e: Math.max(a0.lon, b0.lon) + pl }, tspd: q.p || 0, tdir: q.d || 0 }); } return out.length ? out : null; }
  function adjInit() {
    ADJ.forEach(function (x) { var el = $(x[0]); if (!el) return; var out = $(x[0] + 'V'), f = function () { var v = +el.value; out.textContent = (v > 0 ? '+' : '') + v + x[2] + (x[1] === 'wdir' && v ? (v > 0 ? ' veer' : ' back') : x[1] === 'wtime' && v ? (v > 0 ? ' later' : ' earlier') : x[1] === 'ttime' && v ? (v > 0 ? ' later' : ' earlier') + (Math.abs(v) >= 60 ? ' (' + (Math.abs(v) / 60).toFixed(Math.abs(v) % 60 ? 2 : 0) + ' h)' : '') : x[1] === 'tdir' && v ? (v > 0 ? ' clockwise' : ' anticlockwise') : ''); $('adjNote').hidden = !adjVals(); if ($('adjPill')) adjPill(); }; el.oninput = f; f(); });
    /* Stuart 22 Nov 06:42: the slider is fiddly to put back on zero; Tide on time sets it to 0 at a tap, and shows when it is there */
    (function () { var el = $('adjTtime'), on = $('adjTon'); if (!el || !on) return; var f0 = el.oninput; el.oninput = function () { if (f0) f0.apply(this, arguments); on.checked = +el.value === 0; }; on.checked = +el.value === 0;
      on.onchange = function () { if (on.checked) { el.value = 0; el.oninput(); el.dispatchEvent(new Event('change', { bubbles: true })); } else on.checked = +el.value === 0; }; })();
    $('adjReset').onclick = function () { store('nav-adj-until', ''); ADJ.forEach(function (x) { var el = $(x[0]); el.value = 0; el.oninput(); }); TH = {}; store('fs-tidehand', ''); try { if (window.FSSolent && FSSolent.tideReset) FSSolent.tideReset(); } catch (e) {} adjPill(); };   /* Stuart 17 Nov 13:16: Back to the forecast also ends the tide given by hand */
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
    if (a) ADJ.forEach(function (x) { var v = +$(x[0]).value; if (v) t.push(({ wdir: 'wind ', wspd: 'wind ', wtime: 'wind ', tspd: 'tide ', ttime: 'tide ', tdir: 'tide ' })[x[1]] + $(x[0] + 'V').textContent); });
    if (a && a.legs) t.push('tide on ' + a.legs.length + ' leg' + (a.legs.length === 1 ? '' : 's'));
    if (a && a.fixT) t.push('tide by hand ' + a.fixT.spd + ' kn to ' + ('00' + a.fixT.dir).slice(-3) + '°T');
    $('adjPill').hidden = !a; $('adjPillTxt').textContent = 'Forecast changed' + (a && a.box ? ' in your area' : '') + ': ' + t.join(', ');
  }
  function HMAX() { var w = (meta.course0 || meta.course).window; return w ? w[1] : 48; }
  function legsFor(fromPt) {
    if (S.to) return [{ name: 'Your point', point: [S.to.lat, S.to.lon], r: 0.3, at: [S.to.lat, S.to.lon] }];
    var c = meta.course, pts = [c.start].concat((c.marks || []).filter(function (m) { return !m.via || m.must; })).concat([c.finish]), legs = [];   /* waypoints the routes need not pass are left out */
    /* F10 (Stuart 15 Nov 16:33): on an inshore course (under 40 nm, a Solent race) the routes go right to the finish and round each mark close:
       the finish within 0.05 nm and a gate ray of 0.15 nm at each mark, instead of 0.4 nm and 1.2 nm offshore */
    var inshore = courseNm(c) < 40;
    pts.slice(1, -1).forEach(function (m, i) {
      if (m.via) { legs.push({ name: m.name || 'Waypoint', point: [m.lat, m.lon], r: 0.3, at: [m.lat, m.lon] }); return; }
      if (m.gate && m.gate.a && m.gate.b) { legs.push({ name: m.name, gate: { a: m.gate.a, b: m.gate.b }, dt: 180, at: [m.lat, m.lon] }); return; }   /* a leeward gate of two buoys (J3): cross the line between them */
      var near = FSRouter.dist(c.start.lat, c.start.lon, m.lat, m.lon) < 25, legNm = FSRouter.dist(pts[i].lat, pts[i].lon, m.lat, m.lon);
      /* an offshore rounding mark gets a long gate ray, so the router has to sail round it rather than past it */
      legs.push({ name: m.name, gate: FSRouter.markGate(m, pts[i], pts[i + 2], m.side || 'port', inshore ? 0.15 : near ? 1.2 : Math.min(30, Math.max(3, legNm * 0.1)), inshore ? 0.03 : 0), dt: near || inshore ? 180 : undefined, at: [m.lat, m.lon] });
    });
    legs.push({ name: c.finish.name, point: [c.finish.lat, c.finish.lon], r: inshore ? 0.05 : c.finish.radius_nm || 0.4, dt: inshore ? 180 : undefined, at: [c.finish.lat, c.finish.lon] });   /* inshore, the leg home in short steps too (Stuart 17 Nov 14:47: 20-minute steps could not leave Colten) */
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
  function orgOf(r) { return (r && r.org) || 'RORC'; }
  /* a race with its own menu, under its official name (Stuart 21 Nov 18:07: "Put Sydney Hobart race in it's own menu called the official name of the race - this is good for marketing. Later we will add the RORC Caribbean 600") */
  var MENUS = { CYCA: 'Rolex Sydney Hobart Yacht Race' };
  function groupName(o) { return MENUS[o] || o + ' races'; }
  function courseIssue(c) {
    /* a course set on the day (Channel Race, De Guingand Bowl): start and finish together and no marks yet, so there is nothing to route (Stuart 12 Nov, found by the live GPS check) */
    if (!(c.marks || []).length && FSRouter.dist(c.start.lat, c.start.lon, c.finish.lat, c.finish.lon) < 2) return 'Course set on the day: add the marks from the sailing instructions before routing. Tap the race name, then Edit this course.';
    var out = [c.start].concat(c.marks).concat([c.finish]).filter(function (p) { return !inData(p); }); return out.length ? 'Cannot route: ' + out.map(function (p) { return p.name; }).join(', ') + ' outside the forecast areas. Routing needs full forecasts, tides, depth and coastline there, and an area for this course has not been built yet.' : ''; }   /* F112 (21 Nov): the old wording promised a wider area with the next update, which never came */
  function warnText(r) {
    if (!r) return '';
    var y = r.courseStatus === 'last-edition' ? 'the ' + r.courseYear + ' course (last edition)' : r.courseStatus === 'set-on-day' ? 'a course set on the day' : r.courseStatus === 'not-published' ? 'the start and finish only' : 'the ' + r.courseYear + ' course';
    return r.courseStatus === 'published' ? '' : 'Showing ' + y + '. The 2027 course is not published yet and will change: check the sailing instructions.';
  }
  /* F101 (Stuart 21 Nov 07:31 and 07:37, "go for your recommendation"): editing a stored RORC or JOG race keeps your edit as your version
     of that race (one of My races, linked to it by raceId), and choosing the race again opens your version, not the stored course
     (which looked as if the edit had been lost). "Back to the published course" unlinks it: it stays under My races. If the stored
     course is corrected later, your version says the published course has changed since your edit. Shared by the boat code. */
  function courseSig(c) { var q = function (x) { return x ? (+x.lat).toFixed(4) + ',' + (+x.lon).toFixed(4) + (x.side || '') : ''; }; return [q(c.start)].concat((c.marks || []).map(q)).concat([q(c.finish)]).join(';'); }
  function yourVersion(id) { return myRaces().filter(function (x) { return x.raceId === id && x.course; })[0] || null; }
  function yourNote() {
    var y = S.yours, el = $('courseNote'); if (!y || !el) return;
    var d = new Date(tzMs(y.rec.savedAt)).toUTCString().slice(5, 16), moved = y.rec.baseSig && y.rec.baseSig !== courseSig(y.race);
    el.insertAdjacentHTML('afterbegin', '<span class="yourc"><b>Your course, edited ' + d + '.</b> ' + (moved ? '<b>The published course has changed since your edit.</b> ' : '') + '<button type="button" class="btn" id="yourPub">Back to the published course</button></span> ');
    $('yourPub').onclick = function () { var a = myRaces(); a.forEach(function (x) { if (x.id === y.rec.id) { x.raceId = null; if (!/your version/.test(x.name)) x.name += ' (your version)'; } }); setMyRaces(a); if (BC.push) BC.push(); S.myId = null; applyRace(y.race.id, true); S.from = null; run(); busy('Back to the published ' + y.race.name + '. Your version is kept under My races.'); setTimeout(function () { busy(''); }, 4000); };
  }
  function applyRace(id, pub) {
    var r = RACES.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    try { var rsel = $('raceSel'); if (rsel && rsel.value !== id) rsel.value = id; } catch (e) {}   /* the RORC race box shows the race chosen from the Races list too (Stuart 20 Nov 11:55: the box was blank) */
    var mine = !pub && yourVersion(id);
    if (mine) { S.myId = mine.id; applyCourseObj(asRace(mine.course, mine.id)); S.yours = { race: r, rec: mine }; yourNote(); return; }
    S.yours = null; applyCourseObj(r);
  }
  function applyCourseObj(r) {
    S.yours = null;
    var wasIn = S.inshore; S.cleared = false; S.inshore = !!r.solent;
    if (!r.solent) { S.offPrev = null; if (wasIn) { try { FSSolent.step(0); FSSolent.on(false); } catch (e) {} } }
    document.body.classList.toggle('inshore', S.inshore);
    var keep = meta.course0 || (meta.course0 = meta.course); meta.course = { name: r.name, start: r.start, marks: r.marks.map(function (m) { return Object.assign({}, m); }), finish: r.finish, band: keep.band, window: keep.window, race: r, legTide: r.legTide || null };   /* a Solent race keeps its tide by leg */
    $('raceTitle').textContent = r.name + ' · ' + r.start.name.replace(/^Start,\s*/, '').replace(/^RYS line,\s*/, '') + ' to ' + r.finish.name.replace(/^Finish,\s*/, '');
    if (r.solent) $('raceTitle').textContent = 'Solent race';   /* F17: the top left reads Solent race on a computer too */
    setShort(r.solent ? 'Solent race' : r.name.replace(/^Rolex\s+/, '').replace(/\s+(Trophy\s+)?Race$/, '').replace(/\s+Trophy$/, ''));   /* Stuart 16 Nov 08:00: the top left says Solent race */
    var w = warnText(r); $('courseWarn').hidden = !w; $('courseWarn').textContent = w + (r.setNote ? ' ' + r.setNote : '');
    /* the standard warning on every RORC course, plus the course-not-confirmed line where it applies; hidden with x until the next visit */
    var std = '<b>Check against the sailing instructions.</b> Before the start, check this course against the sailing instructions and any amendments. For some races the course is only published the day before, and it can be changed at any time up to the start.';
    $('cbannerTxt').innerHTML = r.custom ? '' : std + (w ? '<br><b>Course not confirmed.</b> ' + w : '');
    $('cbanner').hidden = !!r.custom || (S.bannerHidden || {})[r.id];
    $('markSides').innerHTML = realMarks(r).length ? r.marks.map(function (m, i) { if (m.via) return ''; return '<div class="row"><label for="side' + i + '">' + m.name + '</label><select id="side' + i + '" data-mk="' + i + '"><option value="port">to port</option><option value="starboard">to starboard</option></select>' + (m.sideAssumed ? '<span class="note">assumed</span>' : '') + '</div>'; }).join('') : '<p class="note">No marks between start and finish in this course.</p>';
    r.marks.forEach(function (m, i) { if (m.via) return; $('side' + i).value = m.side || 'port'; $('side' + i).onchange = function () { meta.course.marks[i].side = this.value; meta.course.marks[i].sideAssumed = false; S.legs = null; draw(); }; });
    var issue = courseIssue(meta.course);
    $('courseNote').innerHTML = (r.custom ? 'Your own course' + (r.nm ? ', about ' + r.nm + ' nm' : '') + '. ' : (r.nm ? 'About ' + r.nm + ' nm' + (r.nmSource ? ' (' + r.nmSource + ')' : '') + '. ' : '') + (r.date2027 ? 'Start ' + new Date(r.date2027 + 'T12:00Z').toUTCString().slice(0, 16) + ' (' + r.dateSource + '). ' : (r.dateSource || '') + '. ') + '<a href="' + r.source + '" target="_blank" rel="noopener">Source</a>') + (issue ? '<br><b style="color:var(--warn)">' + issue + '</b>' : '');
    try { history.replaceState(null, '', location.pathname + (!r.custom && r.id !== HERE && r.page ? '?race=' + encodeURIComponent(r.id) : '')); } catch (e) {}   /* the address always matches what is on screen, so a reload reopens it */
    try { var fk = raceKey(); if (FIX.on && FIX.for && FIX.for !== fk && !window.FS_SOLENT) { FIX.on = false; fixSave(true); busy('Fixed wind is off for this new race: set it again from the wind on the water.'); setTimeout(function () { busy(''); }, 4000); } if (FIX.on && !FIX.for) { FIX.for = fk; store('fs-fix', JSON.stringify(FIX)); } } catch (e) {}   /* F17 (Stuart 17 Nov 09:01): Fixed wind turns off at the start of a new course or race, so it never makes odd routes */
    if (!r.custom) store('fs-race', r.id); lastSet(r.custom ? { my: S.myId || r.id } : { race: r.id }); S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; if ($('finBox')) $('finBox').innerHTML = ''; if ($('runNote')) $('runNote').textContent = ''; if ($('fleet')) $('fleet').innerHTML = ''; if (W && !(r.solent || S.inshore)) fit(); draw();   /* 22 Nov (tests/races-sweep.js): the panel's route cards and note went with the old race too, not only its lines on the chart */   /* a Solent race keeps the chart where the user has it */
  }
  function loadRaces() {
    var d = meta.layers && meta.layers.filter(function (L) { return L.kind === 'depth'; })[0], f = d && (d.full || d);
    if (f && f.lat0 != null) { var la1 = f.lat0 + f.dlat * (f.ny - 1), lo1 = f.lon0 + f.dlon * (f.nx - 1); dataBox = { s: Math.min(f.lat0, la1), n: Math.max(f.lat0, la1), w: Math.min(f.lon0, lo1), e: Math.max(f.lon0, lo1) }; }
    $('cbanner').addEventListener('click', function (e) { if (e.target.id !== 'cbannerX') this.classList.toggle('open'); });
    $('cbannerX').onclick = function () { $('cbanner').hidden = true; var r = meta.course.race; if (r) { S.bannerHidden = S.bannerHidden || {}; S.bannerHidden[r.id] = true; } };
    Promise.all([fetch('../courses/rorc.json', { cache: 'no-store' }).then(function (x) { return x.json(); }), fetch('../courses/jog.json', { cache: 'no-store' }).then(function (x) { return x.ok ? x.json() : { races: [] }; }).catch(function () { return { races: [] }; })]).then(function (jj) {
      var j = jj[0]; RACES = j.races.concat(jj[1].races || []); REGIONS = j.regions || [];   /* JOG races beside the RORC ones (Stuart 14 Nov) */
      var opt = function (r) { return '<option value="' + r.id + '">' + r.name + (r.date2027 ? ' · ' + r.date2027.slice(8) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+r.date2027.slice(5, 7) - 1] : '') + (courseIssue(r) && !/set on the day/.test(courseIssue(r)) ? ' (wider area needed)' : '') + '</option>'; };
      $('raceSel').innerHTML = ['RORC', 'JOG', 'CYCA'].map(function (o) { var rs = RACES.filter(function (r) { return orgOf(r) === o; }); return rs.length ? '<optgroup label="' + groupName(o) + '">' + rs.map(opt).join('') + '</optgroup>' : ''; }).join('');
      var pageOf = function (id) { var r = RACES.filter(function (x) { return x.id === id; })[0]; return r ? (r.page || r.id) : HERE; };
      var hop = function (id) { var pg = pageOf(id); if (pg === HERE) return false; location.replace('../' + pg + '/' + (pg !== id ? '?race=' + encodeURIComponent(id) : '')); return true; };   /* a race only routes on the page that holds its forecasts */
      $('raceSel').onchange = function () { S.myId = null; if (!hop($('raceSel').value)) applyRace($('raceSel').value); };
      var home = meta.course0 ? meta.course0.raceId : meta.course.raceId; home = home || 'cervantes'; var want = home === 'cervantes' ? (store('fs-race') || home) : home; if (!RACES.some(function (r) { return r.id === want; })) want = home;
      var qr = QS0.get('race'); if (qr && RACES.some(function (r) { return r.id === qr && (r.page || r.id) === HERE; })) want = qr;
      if (want !== home && !QS0.get('my') && hop(want)) return;   /* a saved course in the address opens that course, not the last RORC race (Stuart 14 Nov: an edited course came back with no marks) */
      var lastBoot = LAST0; $('raceSel').value = want; applyRace(want);
      if (QS0.get('edit') === '1' && qr === want) setTimeout(function () { try { startEdit(courseCopy()); } catch (e) {} }, 1500);   /* F101: Edit from another page's race list */
      if (!RACES.some(function (r) { return r.id === want; })) { var c0 = meta.course; $('raceTitle').textContent = c0.name + ' · ' + c0.start.name.replace(/^Start,\s*/, '') + ' to ' + c0.finish.name.replace(/^Finish,\s*/, ''); setShort(c0.name.replace(/^English /, '').replace(/^Southern /, '')); }
      var qs = QS0, my = qs.get('my'), last = lastBoot;
      if (!my && !qr && !qs.get('course') && !S.pendingCourse && last) {
        if (last.my && myRaces().some(function (x) { return x.id === last.my && (!x.page || x.page === HERE); })) my = last.my;
        else if (last.race && last.race !== want && RACES.some(function (r) { return r.id === last.race && (r.page || r.id) === HERE; })) { $('raceSel').value = last.race; applyRace(last.race); }
        if (last.start) S.pendingStart = last.start;
        S.startChosen = false;   /* asked every time a race is opened (Stuart 12 Nov); the last start is offered first */
        var rg = startRange(); if (last.start && rg && +last.start >= rg[0] && +last.start <= rg[1] && ![].some.call($('startSel').options, function (o) { return o.value === last.start; })) setStart(+last.start);
      }
      /* Stuart 20 Nov 15:30: a class start chosen for a gun within the next 12 hours (or up to 10 minutes after it) is kept through a Reload or reopening,
         so the countdown and the start screen stay; further off, the start is asked again, as on 12 Nov */
      (function () { var lc = lastBoot; if (!lc || !lc.chosen || !(+lc.start > 0)) return; var g = +lc.start, nowS = Date.now() / 1000; if (g < nowS - 600 || g > nowS + 12 * 3600) return;
        var keep = function () { if (lc.my ? lc.my !== S.myId : (S.myId || (lc.race || '') !== ($('raceSel').value || ''))) return;   /* F93: no race (the page's own course) is null in the record and '' in the race box */
          S.keptGun = g; setStart(g, true); startChosen(true); chipStart(); };
        if (my || lc.my) setTimeout(keep, 1800); else keep(); })();
      if (my) setTimeout(function () { openMy(my, true); if (last && last.start && [].some.call($('startSel').options, function (o) { return o.value === last.start; })) { $('startSel').value = last.start; } }, 0);
      if (qs.get('view')) setTimeout(function () { viewOpen(qs.get('view')); }, 1500);   /* a crew phone opens on the navigator's page */
      if (window.FS_SOLENT) { setTimeout(function () { if (!S.inshore) { window.__fsInshore(true); if (window.FSSolent) { FSSolent.on(true); FSSolent.start(); } } }, my ? 1500 : 200); }   /* FirstShift Solent opens straight into inshore racing: the last course, or the course card */
      else if (qs.get('new')) { setTimeout(function () { startEdit(null); }, 400); } else wizBoot(qs);
      if (S.pendingCourse) { applyCourseObj(asRace(S.pendingCourse)); S.pendingCourse = null; }
      var linkSt = QS0.get('start'), fromLink = S.pendingStart && linkSt === S.pendingStart;
      if (S.pendingStart && [].some.call($('startSel').options, function (o) { return o.value === S.pendingStart; })) $('startSel').value = S.pendingStart;
      else if (fromLink && !beyond(+linkSt) && +linkSt > 0) setStart(+linkSt);   /* an exact start from the navigator's link */
      if (fromLink) { S.startChosen = true; setTimeout(function () { startChosen(); }, 0); }   /* the navigator chose it: the crew phone takes it as chosen */
      S.pendingStart = null;
      var ss = !qr && !qs.get('course') && !qs.get('new') && sessGet(); if (ss) { S.resume = ss; S.startChosen = true; if (+ss.startVal > 0 && !(S.keptGun && S.keptGun !== +ss.startVal)) setStart(+ss.startVal, true); chipStart(); }   /* F93 (21 Nov): the start the crew chose last (kept for the countdown) wins over a saved session's start; the page's session may be another race's, or older */   /* an exact start such as 16:20, or one now in the past, is put back as it was: otherwise the start no longer matched and Route routed again (Stuart 16 Nov 15:47) */   /* carrying on: no questions, straight back in */
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
    var h = '<div class="mobtime">' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + '<small>since ' + new Date(tzMs(m.t)).toUTCString().slice(17, 22) + ' ' + tzS1() + ' · ' + m.lat.toFixed(4) + ' ' + m.lon.toFixed(4) + '</small></div>';
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
  /* the plan bar on a narrow phone: a long figure ("Code 0", "125° P") shrinks to fit its cell instead of being cut off (Stuart's list, 14 Nov) */
  (function () { var now = $('now'); if (!now || !window.MutationObserver) return; var busyFit = false;
    function fit() { if (busyFit) return; busyFit = true; [].forEach.call(now.querySelectorAll('b'), function (b) { b.style.fontSize = ''; var cw = b.clientWidth, sw = b.scrollWidth; if (cw && sw > cw + 1) { var f = parseFloat(getComputedStyle(b).fontSize); b.style.fontSize = Math.max(9, Math.floor(f * cw / sw * 10) / 10) + 'px'; } }); busyFit = false; }
    new MutationObserver(function () { if (!busyFit) requestAnimationFrame(fit); }).observe(now, { childList: true, subtree: true, characterData: true }); window.addEventListener('resize', fit); })();
  function mobInit() {
    hold($('mobBtn'), 1000, mobStart);
    /* MOB can be moved about (Stuart 14 Nov): drag it anywhere and it stays there on this device; a press and hold still sets it off */
    hold($('mobEnd'), 1500, mobEnd);
    $('mobCentre').onclick = function (e) { e.stopPropagation(); var m = mobGet(); if (!m) return; var small = $('mob').classList.toggle('small'); this.textContent = small ? 'Full panel' : 'Show on chart'; if (small) { view.la = m.lat; view.lo = m.lon; view.s = Math.max(view.s, 4000); } closePanel(); draw(); };
    if (mobGet()) mobShow();
  }
  /* ---------- AIS: targets from an AIS feed (test fleet now; the boat's own receiver and an online feed next), CPA alarm ---------- */
  var AIS = { tg: new FSAIS.Targets(), src: 'off', danger: {}, lastEmit: -1, fleet: null, warned: {} };
  function aisNowMs() { return AIS.src === 'test' ? (T0 + S.t * 3600) * 1000 : Date.now(); }
  function ownForCpa() {
    /* F53 (Stuart 18 Nov 2026, found by the boat simulator): our position for the collision warning is the Live GPS fix whenever Live GPS
       is on (the boat's GPS on the + tools, or dead reckoning when the GPS is lost). It used to be the phone's GPS only while MOB was running,
       otherwise where the planned route said the boat should be at the slider time, and nothing at all without a route: a ferry on a
       collision course closed to 0.8 nm with no warning. The plan is used only when Live GPS is off (planning at home). */
    var lf = LIVE.on ? LIVE.fix : null;
    if (lf && lf.la != null && Date.now() - (lf.at || 0) < 30000 && AIS.src !== 'test') return { lat: lf.la, lon: lf.lo, sog: lf.sog || 0, cog: lf.cog || 0, src: lf.dr ? 'dead reckoning' : 'GPS' };
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
  function aisDry(la, lo) { if (coastLand(la, lo)) return true; try { if (P.depth) { var z = P.depth.nearest('z', la, lo); if (z === z && z > -2) return true; } } catch (e) {} return false; }   /* land, or water under 2 m, by the coastline and the seabed depth */
  function aisEmulate() {   // positions at the replay time, encoded as !AIVDM and decoded back through the engine
    var f = aisFleet(); if (!f) return;
    if (AIS.lastT != null && Math.abs(S.t - AIS.lastT) > 0.25) Object.keys(AIS.tg.t).forEach(function (m) { AIS.tg.t[m].track = []; }); AIS.lastT = S.t;
    var lines = [], now = aisNowMs(), p = S.sel.r.path, ts = tsOf(p), t0 = S.start.t, k = Math.cos(50 * R);
    f.forEach(function (b, i) {
      var x = Object.assign({}, b);
      if (b.kind === 'race') {
        var tt = t0 + (S.t - t0) * b.pace, a = posAt(ts, p, tt); if (!a) return; var j = Math.min(p.length - 2, a.i || 0), h = hdgAt(p, a.k), q = p[j + 1];
        var fs = [1, 0.6, 0.3, 0.1, 0, -0.3, -0.6, -1], wet = false; for (var fi = 0; fi < fs.length; fi++) { x.lat = a.la + Math.cos((h + 90) * R) * b.side * fs[fi] / 60; x.lon = a.lo + Math.sin((h + 90) * R) * b.side * fs[fi] / 60 / k; x.lat = Math.round(x.lat * 6e5) / 6e5; x.lon = Math.round(x.lon * 6e5) / 6e5; if (!aisDry(x.lat, x.lon)) { wet = true; break; } } if (!wet) { if (AIS.tg.t[b.mmsi]) delete AIS.tg.t[b.mmsi]; return; }   /* a pretend race boat never sits on land: closer to the route until it is in the water */ x.sog = (q.bsp || 6) * b.pace; x.cog = h; x.hdg = h;
      } else {
        var d = ((S.t - t0) * b.sog) % 120 - 60; x.lat = b.lat0 + Math.cos(b.cog * R) * d / 60; x.lon = b.lon0 + Math.sin(b.cog * R) * d / 60 / k; x.hdg = b.cog;
        if (aisDry(x.lat, x.lon)) { if (AIS.tg.t[b.mmsi]) delete AIS.tg.t[b.mmsi]; return; }   /* a pretend ship never sails across land */
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
    /* the red box can be closed (Stuart 12 Nov), but only for that ship: it comes back for another ship, if this one's CPA halves, or after 10 minutes */
    var dm = AIS.dismiss, hid = dz && dm && dm.mmsi === dz.mmsi && Date.now() - dm.at < 600000 && dz.c.cpa > dm.cpa / 2;
    $('cpaWarn').hidden = !dz || hid;
    if (dz && !hid) {   /* build the box once, then only change its words, so the × is never swapped out under a finger */
      if (!$('cpaX')) { $('cpaWarn').innerHTML = '<span id="cpaTxt"></span><button class="cpax" id="cpaX" aria-label="Close this warning for this ship">×</button>'; $('cpaX').onclick = function (ev) { ev.stopPropagation(); var d = AIS.cpaNow; if (d) AIS.dismiss = { mmsi: d.mmsi, at: Date.now(), cpa: d.c.cpa }; $('cpaWarn').hidden = true; }; }
      AIS.cpaNow = dz; var txt = 'Close quarters: ' + String(dz.name || dz.mmsi) + ' passes ' + dz.c.cpa.toFixed(2) + ' nm away in ' + Math.round(dz.c.tcpa) + ' min'; if ($('cpaTxt').textContent !== txt) $('cpaTxt').textContent = txt; }
    var og = function (x) { var e = byM[x.mmsi] || (x.name && ent[x.name.toUpperCase()]); if (!e) return ''; var perH = (e.tcc / myT - 1) * 60, tot = perH * (S.sel ? S.sel.r.finish - S.start.t : 0); return '<span class="note">TCC ' + e.tcc.toFixed(3) + ', ' + (perH >= 0 ? 'owes you ' : 'you owe ') + Math.abs(perH).toFixed(1) + ' min/h' + (tot ? ' (' + Math.round(Math.abs(tot)) + ' min race)' : '') + '</span>'; };
    var h = '<tr><th>Target</th><th>Range</th><th>Brg</th><th>CPA</th><th>TCPA</th><th>SOG</th></tr>' + shown.slice(0, 40).map(function (x) {
      var c = x.c; return '<tr data-mmsi="' + x.mmsi + '" class="' + (x.danger ? 'danger' : '') + '"><td style="font-family:var(--f-body)">' + (x.name || x.mmsi) + ' <span class="note">' + (FSAIS.CATS[x.cat] || '') + (x.at && now - x.at > 150000 ? ', seen ' + Math.round((now - x.at) / 60000) + ' min ago' : '') + '</span>' + (x.race ? '' : '<button class="aisrb" data-rb="' + x.mmsi + '">Race boat</button>') + (og(x) ? '<br>' + og(x) : '') + '<span class="aistcc" id="rb' + x.mmsi + '" hidden><input type="number" inputmode="decimal" step="0.001" placeholder="TCC" aria-label="TCC"><button class="aisrb" data-rbok="' + x.mmsi + '">Add</button></span>' + '</td><td>' + (c ? c.range.toFixed(1) : '-') + '</td><td>' + (c ? pad(c.brg) + '°' : '-') + '</td><td>' + (c ? c.cpa.toFixed(2) : '-') + '</td><td>' + (c && c.tcpa > 0 ? Math.round(c.tcpa) + ' min' : '-') + '</td><td>' + (x.sog != null ? x.sog.toFixed(1) : '-') + '</td></tr>'; }).join('');
    var ae = document.activeElement; if (AIS.open && Date.now() - AIS.open.at < 90000 && ae && $('aisTable').contains(ae)) return;   /* someone is typing a TCC: do not redraw the table under them */
    if (AIS.tableAt && Date.now() - AIS.tableAt < 2000 && !AIS.forceTable) return; AIS.tableAt = Date.now(); AIS.forceTable = false;   /* the table redraws at most every 2 s, so a tap on a button lands (it was redrawn on every frame of the replay) */
    $('aisTable').innerHTML = h; $('aisBox').hidden = false;
    if (AIS.open && Date.now() - AIS.open.at < 90000) { var ob = $('rb' + AIS.open.m), obt = $('aisTable').querySelector('[data-rb="' + AIS.open.m + '"]'); if (ob) { ob.hidden = false; if (obt) obt.hidden = true; var oi = ob.querySelector('input'); oi.value = AIS.open.v || ''; oi.oninput = function () { AIS.open.v = this.value; }; } }
    if ($('aisWarn')) $('aisWarn').hidden = AIS.src !== 'live';   /* the free online feed always carries its warning (Stuart 12 Nov) */
    $('aisNote').textContent = (shown.length < list.length ? shown.length + ' of ' : '') + list.length + ' targets · ' + (AIS.src === 'test' ? 'test fleet, ' + (AIS.lines || 0) + ' sentences decoded' : AIS.err ? AIS.err : 'free online AIS: not every target, not for navigation; updated every 30 s') + (own ? ' · CPA from ' + (own.src === 'GPS' ? 'your GPS' : own.src === 'dead reckoning' ? 'dead reckoning' : 'the route boat') : ' · route first for CPA');
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
  function spdLabel() { if ($('speed').selectedIndex < 0) $('speed').value = '1'; var v = +$('speed').value; $('spdBtn').innerHTML = '<span class="spl">speed</span>' + (v < 1 ? Math.round(v * 60) + 'm/s' : v + 'h/s'); var sp = $('speed'); if (sp.selectedIndex < 0) sp.value = '1'; var so = sp.options[sp.selectedIndex]; $('spdBtn').title = 'Replay speed: ' + (so ? so.textContent : '1 hour a second') + '. Tap to change.'; }   /* 17 Nov: on Stuart's iPhone the list had nothing chosen and this stopped the forecasts loading */
  function spdInit() { var o = [].map.call($('speed').options, function (x) { return x.value; }); $('spdBtn').onclick = function (e) {
      e.stopPropagation(); var m = $('spdMenu');
      if (!m.hidden) { m.hidden = true; return; }
      m.innerHTML = '<div class="note" style="padding:4px 8px">Replay speed: race time per second</div>' + [].map.call($('speed').options, function (x) { return '<button data-v="' + x.value + '"' + (x.value === $('speed').value ? ' aria-checked="true"' : '') + '>' + x.textContent + '</button>'; }).join('');
      var r = $('spdBtn').getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - 200, r.left)) + 'px'; m.style.top = ''; m.style.bottom = (innerHeight - r.top + 6) + 'px'; m.hidden = false;
      [].forEach.call(m.querySelectorAll('button'), function (b) { b.onclick = function () { $('speed').value = b.dataset.v; $('speed').dispatchEvent(new Event('change', { bubbles: true })); m.hidden = true; }; });
    };
    document.addEventListener('click', function (e) { if (!$('spdMenu').hidden && !$('spdMenu').contains(e.target)) $('spdMenu').hidden = true; }); $('speed').addEventListener('change', spdLabel); spdLabel(); $('followBtn').onclick = function () { followSet(!follow); }; followSet(follow); }
  /* ---------- send to the crew: a summary and a link that opens the same course and start in Route ---------- */
  /* links and QR codes carry FirstShift's own address (Stuart 14 Nov, option A); the pages.dev address keeps working.
     Route+ also runs at the pages.dev address, so its links use this too, and open in Route+ where it is installed (option C). */
  function pubOrigin() { return /(^|\.)firstshift-route\.pages\.dev$|^route\.firstshiftsailing\.com$/.test(location.hostname) ? 'https://route.firstshiftsailing.com' : location.origin; }
  function crewLink() {
    var c = meta.course, base = pubOrigin() + location.pathname, st = $('startSel').value;
    if (c.race && !c.race.custom) return base + '?race=' + encodeURIComponent(c.race.id) + '&start=' + st;
    var cc = { n: c.name, p: [c.start].concat(c.marks).concat([c.finish]).map(function (q) { return [+q.lat.toFixed(4), +q.lon.toFixed(4), q.name, q.via ? (q.must ? 'w' : 'v') : q.side ? q.side[0] : '']; }) };
    return base + '?course=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cc))))) + '&start=' + st;
  }
  /* Help and Share at the top of every settings window (Stuart 12 Nov): the share link opens the same race, start, boat code and page on a crew phone */
  function currentView() {
    if (!$('sheet').hidden) { var t = document.querySelector('.stabs .tab[aria-selected="true"]'); return 'settings:' + (t ? t.dataset.s : 'boat'); }
    if (!$('wiz').hidden) return WIZ.step === 3 ? 'start' : 'boat';
    if (!$('races').hidden) return 'races';
    return 'chart';
  }
  function shareUrl() { return crewLink() + (BC.code ? '&boat=' + BC.code : ''); }   /* crew land on Route's first page with the same race and start (Stuart 12 Nov), not on the navigator's settings page */
  function viewName(v) { return v === 'start' ? 'the start' : v === 'boat' ? 'the boat' : v === 'races' ? 'the race list' : /^settings:/.test(v) ? 'Settings, ' + ({ boat: 'Boat', course: 'Course', fc: 'Forecasts', sails: 'Sails', display: 'Display' }[v.split(':')[1]] || 'Settings') : 'the chart'; }
  function drawQr(cv, text) {
    if (!window.qrcode) return false; var q = qrcode(0, 'M'); q.addData(text); q.make(); var n = q.getModuleCount(), px = Math.floor(cv.width / (n + 2)), off = Math.floor((cv.width - px * n) / 2), g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * px, off + r * px, px, px);
    return true;
  }
  function openShare() {
    var url = shareUrl();
    $('shareWhat').textContent = meta.course.name + ' · start ' + clockAbs(+$('startSel').value) + ' ' + tzS1() + (BC.code ? ' · boat code ' + BC.code : '');
    $('shareUrl').value = url; if (!drawQr($('shareQr'), url)) $('shareWhat').textContent += ' (the code could not be drawn: use Share or Copy link)';
    $('shareBox').hidden = false;
  }
  function viewOpen(v) {
    if (!v || v === 'chart') return;
    if (/^settings:/.test(v)) { $('setBtn').click(); var t = document.querySelector('.stabs .tab[data-s="' + v.split(':')[1] + '"]'); if (t) t.click(); }
    else if (v === 'start') cardStep(3); else if (v === 'boat') cardSettings('boat'); else if (v === 'races') { racesSheet('rorc'); $('races').hidden = false; }
  }
  function shareInit() {
    [].forEach.call(document.querySelectorAll('[data-share]'), function (b) { b.onclick = function (e) { e.stopPropagation(); openShare(); }; });
    [].forEach.call(document.querySelectorAll('[data-help]'), function (b) { b.onclick = function (e) { e.stopPropagation(); $('help').hidden = false; }; });
    $('shareX').onclick = function () { $('shareBox').hidden = true; };
    $('shareBox').onclick = function (e) { if (e.target === $('shareBox')) $('shareBox').hidden = true; };
    $('shareSys').onclick = function () { var url = $('shareUrl').value; if (sendOut('FirstShift Route: ' + meta.course.name, 'Open the same race in Route: ' + url)) return; $('shareCopy').click(); };
    $('shareCopy').onclick = function () { var url = $('shareUrl').value; var ok = function () { $('shareCopy').textContent = 'Copied'; setTimeout(function () { $('shareCopy').textContent = 'Copy link'; }, 1500); }; if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, function () { $('shareUrl').select(); }); else $('shareUrl').select(); };
  }
  /* a newer Route on the server: say so, one tap to load it (Stuart 12 Nov: the Home Screen app has no reload button) */
  function updCheck() {
    if (!navigator.onLine || document.hidden) return;
    fetch('app.js?u=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var m = /FirstShift Route v([0-9.]+)/.exec(t || ''), now = /v([0-9.]+)/.exec(VERSION); if (!m || !now || m[1] === now[1]) return; var vn = function (x) { return x.split('.').map(Number); }, a = vn(m[1]), b0 = vn(now[1]), newer = false; for (var vi = 0; vi < 3; vi++) { if ((a[vi] || 0) !== (b0[vi] || 0)) { newer = (a[vi] || 0) > (b0[vi] || 0); break; } } if (!newer) return;   /* an older copy from a cache is not an update (16 Nov: it offered v0.12.26 to v0.12.60) */
      var b = $('updBar'); if (!b) return; b.textContent = (window.FS_MARK ? 'Mark' : 'Route') + ' v' + m[1] + ' is ready (you have v' + now[1] + '). Tap to update.'; b.hidden = false;
    }).catch(function () {});
  }
  function crewText() {
    var c = meta.course, s = S.sel, lines = ['FirstShift Route: ' + c.name, 'Start ' + clockAbs(+$('startSel').value) + ' ' + tzS1()];
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
      if (sendOut('FirstShift Route: ' + meta.course.name, t)) return;
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
    };
    $('xCopy').onclick = function () { var t = crewText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('xNote').textContent = 'Copied: paste it into WhatsApp, a message or an email.'; }, function () { $('xNote').textContent = t; }); };
    var q = QS0, cs = q.get('course'), st = q.get('start');
    if (cs) { try { var cc = JSON.parse(decodeURIComponent(escape(atob(cs)))), P0 = cc.p.map(function (a) { return a[3] === 'v' || a[3] === 'w' ? { lat: a[0], lon: a[1], name: a[2], via: true, must: a[3] === 'w' } : { lat: a[0], lon: a[1], name: a[2], side: a[3] === 's' ? 'starboard' : 'port' }; });
      S.pendingCourse = { name: cc.n, start: P0[0], marks: P0.slice(1, -1), finish: P0[P0.length - 1] }; } catch (e) {} }
    if (st) S.pendingStart = st;
  }
  /* ---------- Ask Route: fixed questions answered from the chosen route at the replay time (or now, from your GPS) ---------- */
  function ask(q) {
    if (q === 'brief') return briefing();
    var s = S.sel; if (!s) return 'Route first: there is no route to answer from yet.';
    var p = s.r.path, ts = tsOf(p), t = S.t, pos = posAt(ts, p, t); if (!pos) return 'The replay time is before the start. Move the slider to the race.';
    if (pos.done) return 'At this time the boat has finished, at ' + clockH(s.r.finish).slice(4) + ' ' + tzS1() + '.';
    var i0 = Math.max(1, (pos.i || 0) + 1), nm = function (a, b) { return FSRouter.dist(a.la, a.lo, b.la, b.lo); }, when = function (tt) { var m = Math.round((tt - t) * 60); return clockH(tt).slice(4) + ' ' + tzS1() + ', ' + (m < 90 ? m + ' minutes' : (m / 60).toFixed(1) + ' hours') + ' from now'; };
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
    out.push(name + (s.r.partial ? ' runs out of forecast at ' + clockH(s.r.finish).slice(4) + ' ' + tzS1() + ', ' + s.r.partial.togo + ' nm short of the finish' + (fins.length ? '; the other models carry on from there.' : '.') : ' finishes ' + clockH(s.r.finish).slice(4) + ' ' + tzS1() + ', ' + fmtH(s.r.finish - S.start.t) + ' after the start') + ', sailing ' + Math.round(st.nm) + ' nm.' +
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
      var t = 'To ' + nmL + ': ' + kind + ', ' + fmtH(z.t - (q[0].t)) + ', arriving ' + clockH(z.t).slice(4) + ' ' + tzS1() + '. Wind ' + Math.round(wmin) + ' to ' + Math.round(wmax) + ' knots from the ' + comp(a.twd) + (Math.abs(shift) >= 20 ? ', ' + (shift > 0 ? 'veering' : 'backing') + ' ' + Math.abs(Math.round(shift)) + ' degrees by the mark' : '') + '.';
      if (man) t += ' ' + man + ' ' + (up > down ? 'tack' : 'gybe') + (man > 1 ? 's' : '') + '.';
      if (sails.length) t += ' Sails: ' + sails.slice(0, 4).join(', then ') + (sails.length > 4 ? ' and more' : '') + '.';
      if (against >= 1) t += ' Foul tide for about ' + fmtH(against) + ' from ' + clockH(tideT).slice(4) + ': that is where the inshore or offshore choice matters.';
      out.push(t);
    });
    var risks = [];
    if (metField()) { var gMax = 0, gT = 0, sq = null; p.forEach(function (q) { var g = metAt('gust', q.la, q.lo, q.t) / KN, c = metAt('cape', q.la, q.lo, q.t), rn = metAt('rain', q.la, q.lo, q.t); if (g > gMax) { gMax = g; gT = q.t; } if (!sq && c >= 500 && rn >= 0.5) sq = q; });
      if (gMax >= 25) risks.push('gusts to ' + Math.round(gMax) + ' knots around ' + clockH(gT).slice(4) + ' ' + tzS1()); if (sq) risks.push('squalls possible from ' + clockH(sq.t).slice(4) + ' ' + tzS1() + ', with rain and thunderstorm energy on the route'); }
    if (st.maxW >= 25) risks.push('wind up to ' + Math.round(st.maxW) + ' knots around ' + clockH(st.maxWt).slice(4) + ' ' + tzS1()); if (st.maxS >= 2.5) risks.push('sea up to ' + st.maxS.toFixed(1) + ' m');
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
      $('ensOut').innerHTML = '<div class="fit ' + (spread < 3 ? 'ok' : spread < 8 ? 'tight' : 'no') + '"><b>' + (spread < 3 ? 'The members agree.' : spread < 8 ? 'Some spread between the members.' : 'The members disagree.') + '</b> Fastest finish ' + clockH(fin[0]).slice(4) + ', middle ' + clockH(med).slice(4) + ', slowest ' + clockH(fin[fin.length - 1]).slice(4) + ' ' + tzS1() + ': a spread of ' + fmtH(spread) + '.' + (part ? ' ' + part + ' of the members run out of forecast before the finish.' : '') + ' The thin grey lines on the chart are the ' + S.ens.length + ' ensemble routes.</div>';
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
  function bcData() { var src = (document.querySelector('#srcSeg [aria-pressed="true"]') || {}).dataset; var st = snapSettings(); st.__src = src && src.src; var d = { myraces: myRaces(), settings: st }; if (BC.moment) d.moment = BC.moment; try { if (window.FS_SOLENT && window.FSSolent && FSSolent.share) { var sh = FSSolent.share(); if (sh && (!BC.inshore || sh.at >= BC.inshore.at)) BC.inshore = sh; } } catch (e) {} if (BC.inshore) d.inshore = BC.inshore; return d; }   /* the inshore race (course, line, gun, wind) rides on the same boat code, and Route keeps it untouched for Mark (Stuart 17 Nov 06:55: crew across all four products by boat code) */
  function bcPush() {
    if (!BC.code || !navigator.onLine) return Promise.resolve();
    return fetch('/api/boat/' + BC.code, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: bcData() }) }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) { BC.msg = j.error; return; } BC.at = j.at; store('fs-boatcode-at', String(j.at)); BC.msg = 'Shared ' + new Date(tzMs(j.at)).toUTCString().slice(17, 22) + ' ' + tzS1();
    }).catch(function () { BC.msg = 'Not shared: no connection. It will share next time.'; });
  }
  function bcPull(force) {
    if (!BC.code || !navigator.onLine) return Promise.resolve(false);
    return fetch('/api/boat/' + BC.code, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) { BC.msg = j.error; return false; }
      if (j.data && j.data.moment && (!BC.moment || j.data.moment.at > BC.moment.at)) BC.moment = j.data.moment;   /* keep the latest crew moment, so this device's next share does not drop it */
      if (j.data && j.data.inshore && (!BC.inshore || j.data.inshore.at > BC.inshore.at)) { BC.inshore = j.data.inshore; try { if (window.FS_SOLENT && window.FSSolent && FSSolent.applyRemote) FSSolent.applyRemote(j.data.inshore); } catch (e) {} }
      if (!force && j.at <= BC.at) { BC.msg = 'Up to date'; return false; }
      var mine = myRaces(), byId = {}; mine.concat(j.data.myraces || []).forEach(function (r) { if (!byId[r.id] || byId[r.id].savedAt < r.savedAt) byId[r.id] = r; });
      setMyRaces(Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return b.savedAt - a.savedAt; }));
      if (j.data.settings) putSettings(j.data.settings);
      BC.at = j.at; store('fs-boatcode-at', String(j.at)); BC.msg = 'Updated from the boat ' + new Date(tzMs(j.at)).toUTCString().slice(17, 22) + ' ' + tzS1(); return true;
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
    if ($('bcShare')) $('bcShare').onclick = function () { var link = pubOrigin() + location.pathname + '?boat=' + BC.code, t = 'FirstShift Route boat code ' + BC.code + ': open ' + link + ' to share our boat settings and races.'; if (!sendOut('FirstShift Route boat code', t)) window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); };
  }
  function bcInit() {
    var q = QS0.get('boat'); if (q && /^[A-HJ-NP-Z2-9]{6}$/i.test(q)) { BC.code = q.toUpperCase(); BC.at = 0; store('fs-boatcode', BC.code); }
    if (BC.code) setTimeout(function () { bcPull(false); }, 1500);
    var push = function () { if (BC.code) setTimeout(bcPush, 300); };
    var sx = $('sheetX').onclick; $('sheetX').onclick = function () { sx(); push(); };
    var bs = $('boatSave'); if (bs) bs.addEventListener('click', push);
    BC.push = push; window.__fsBcPush = function () { if (BC.code) bcPush(); }; window.__fsBcPull = function () { return bcPull(false); }; window.__fsBcCode = function () { return BC.code || ''; };
    if (window.FS_SOLENT) setInterval(function () { if (BC.code && !document.hidden) bcPull(false); }, 10000);   /* Mark: the crew's course and line arrive within seconds */
    /* crew moments: the navigator sends a snapshot to every device on the boat code; the others see it within two minutes */
    var dev = store('fs-dev'); if (!dev) { dev = bcNew() + bcNew(); store('fs-dev', dev); } BC.dev = dev;
    var seen = +(store('fs-moment-seen') || 0);
    function showMoment(m) {
      $('momentTxt').textContent = 'From the boat, ' + new Date(tzMs(m.at)).toUTCString().slice(17, 22) + ' ' + tzS1() + ':\n' + m.text.split('\n').slice(0, 4).join('\n'); $('momentBox').hidden = false;
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
    var s = S.sel; if (!s || !S.legs || S.edit) return; var p = s.r.path, pos = posAt(tsOf(p), p, S.t); if (!pos || pos.done) return;
    var q = p[Math.min(p.length - 1, (pos.i || 0) + 1)], lg = S.legs[Math.min(q.leg, S.legs.length - 1)], at = lg && lg.at; if (!at) return;
    var W = FSRouter.windSampler(P, s.models)(at[0], at[1], S.t), tws = W[0], twd = W[1]; if (!(tws > 0.5)) return;
    var brg = FSRouter.brg(pos.la, pos.lo, at[0], at[1]), off = Math.abs(((brg - twd + 540) % 360) - 180), up = off < 70, down = off > 115; if (!up && !down) return;
    var b = FSRouter.bestVmg(speedFn(opts(s.models)), tws, up), a = b[0]; if (!a) return;
    var k = Math.cos(at[0] * R), L = 25, mx = X(at[1]), my = Y(at[0]);
    ctx.save(); ctx.strokeStyle = document.documentElement.hasAttribute('data-night') ? '#9A2A1A' : (css['--brand'] || '#6FA9E0'); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.6; ctx.setLineDash([8, 5]);   /* Route's laylines dim red at night (Stuart 13 Nov) */ ctx.font = '600 10px Inter, sans-serif';
    [[-1, 'starboard'], [1, 'port']].forEach(function (sd) {
      var hdg = (twd + sd[0] * (up ? a : a) + 360) % 360, back = (hdg + 180) % 360;   // the boat's heading on this tack, and the line back from the mark
      var ex = at[1] + Math.sin(back * R) * L / 60 / k, ey = at[0] + Math.cos(back * R) * L / 60;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(X(ex), Y(ey)); ctx.stroke();
      var lx = at[1] + Math.sin(back * R) * 14 / 60 / k, ly = at[0] + Math.cos(back * R) * 14 / 60, lt = (sd[1] === 'starboard' ? 'Stbd' : 'Port') + ' layline ' + pad(hdg) + '°', dl = lbFit(X(lx) + 6, Y(ly) - 16, ctx.measureText(lt).width, 14, 2); if (dl != null) ctx.fillText(lt, X(lx) + 6, Y(ly) - 4 + dl);
    });
    ctx.setLineDash([]); var ut = (up ? "Upwind" : "Downwind") + " TWA " + a + "°, wind " + pad(twd) + "° " + Math.round(tws) + " kn", du = lbFit(mx + 10, my + 18, ctx.measureText(ut).width, 14, 2); if (du != null) ctx.fillText(ut, mx + 10, my + 30 + du);
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
  function courseCopy() { var c = meta.course; return { name: c.name, start: Object.assign({}, c.start), marks: c.marks.map(function (m) { return m.via ? { name: m.name, lat: m.lat, lon: m.lon, via: true, must: !!m.must } : { name: m.name, lat: m.lat, lon: m.lon, side: m.side || 'port' }; }), finish: Object.assign({}, c.finish) }; }
  function courseNm(c) { var p = [c.start].concat(c.marks).concat([c.finish]), d = 0; for (var i = 1; i < p.length; i++) d += FSRouter.dist(p[i - 1].lat, p[i - 1].lon, p[i].lat, p[i].lon); return Math.round(d); }
  function asRace(c, id) { return { id: id || 'my', custom: true, courseStatus: 'published', name: c.name, start: c.start, marks: c.marks, finish: Object.assign({ radius_nm: 0.4 }, c.finish), nm: courseNm(c), legTide: c.legTide || null, solent: !!c.solent && !!window.FS_MARK, solPlan: window.FS_MARK ? c.solPlan || null : null }; }   /* Route and Route+ (16 Nov 22:16): a Solent race saved earlier opens as an ordinary race, routed as normal */   /* solPlan (Stuart 16 Nov 18:40): {route: bool, model} for a Solent race */
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
    if (window.FS_SOLENT) rec.page = HERE;   /* FirstShift Solent keeps its own races on its own page */
    if (rec.page && rec.page !== HERE) { if (!boot) try { sessionStorage.setItem('fs-wiz', '1'); } catch (e) {} location.href = '../' + rec.page + '/?my=' + encodeURIComponent(id); return; }
    if (courseIssue(rec.course) && regionFor(rec.course) && regionFor(rec.course).id !== HERE) { var rg2 = regionFor(rec.course), all2 = myRaces(); all2.forEach(function (x) { if (x.id === rec.id) x.page = rg2.id; }); setMyRaces(all2); location.href = '../' + rg2.id + '/?my=' + encodeURIComponent(id); return; }   /* drawn on a page without its forecasts: open it where they are */
    S.myId = id; applyCourseObj(asRace(rec.course, rec.id)); var rb = rec.raceId && RACES.filter(function (x) { return x.id === rec.raceId; })[0]; if (rb) { S.yours = { race: rb, rec: rec }; yourNote(); } putSettings(rec.settings); if (window.__fsPendingStart) { var pse = window.__fsPendingStart; window.__fsPendingStart = null; try { setStart(pse); startChosen(true); } catch (e) {} }   /* F17: the start time chosen in the Solent step box, so Route this race routes at once */ $('races').hidden = true; if (!boot && wizCourseChosen(false)) return; if (boot && WIZ.on) return; S.from = null; run();
  }
  /* Mark's first card lists the latest stored races (Stuart 17 Nov 09:42: "This first pull down window could also show list of previously saved races") */
  window.__fsSavedList = function (n) { try { return myRaces().map(function (r) { return { kind: 'my', id: r.id, name: r.name, at: r.savedAt, sum: r.summary || '' }; }).concat(oldRoutes().map(function (o) { return { kind: 'old', id: o.id, name: o.name, at: o.savedAt, sum: o.summary || '' }; })).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, n || 4); } catch (e) { return []; } };
  window.__fsOpenSaved = function (kind, id) { if (kind === 'old') openOld(id); else { archiveRoutes(); openMy(id); } };
  window.__fsStoredRaces = function () { racesSheet('saved'); $('races').hidden = false; };   /* Mark (Stuart 17 Nov 09:18): Stored races from the race button */
  function racesSheet(mode) {
    var c = meta.course, mine = myRaces(), h = '';
    $('racesH').textContent = mode === 'new' ? 'Start new course' : mode === 'saved' ? 'Saved routes' : mode === 'rorc' ? 'RORC races' : mode === 'jog' ? 'JOG races' : mode === 'other' ? groupName('CYCA') : 'Races';
    if (mode === 'new') {   /* one question, then the whole area and the set-up steps */
      h = '<p class="note">The routes on the chart now are kept under Saved routes.</p>' +
        '<div class="ritem"><div><b>A RORC race</b><span class="note">Pick from the RORC course library, then the set-up steps</span></div><div class="xrow"><button class="btn primary" id="nRorc">Choose a RORC race</button></div></div>' +
        '<div class="ritem"><div><b>A JOG race</b><span class="note">The 2027 JOG programme, then the set-up steps</span></div><div class="xrow"><button class="btn primary" id="nJog">Choose a JOG race</button></div></div>' +
        '<div class="ritem"><div><b>Draw my own course</b><span class="note">The whole forecast area opens; tap the start, the marks and the finish</span></div><div class="xrow"><button class="btn primary" id="nDraw">Draw a course</button></div></div>';
      $('raceList').innerHTML = h;
      $('nRorc').onclick = function () { archiveRoutes(); $('races').hidden = true; racesSheet('rorc'); $('races').hidden = false; };
      $('nJog').onclick = function () { archiveRoutes(); $('races').hidden = true; racesSheet('jog'); $('races').hidden = false; };
      $('nDraw').onclick = function () { $('races').hidden = true; newCourse(); };
      return;
    }
    if (mode === 'saved') {   /* one list, newest first: courses you saved and routes kept when you started something new */
      var all = mine.map(function (r) { return { kind: 'my', id: r.id, name: r.name, at: r.savedAt, sum: r.summary || (r.course ? courseNm(r.course) + ' nm' : ''), on: r.id === S.myId }; })
        .concat(oldRoutes().map(function (o) { return { kind: 'old', id: o.id, name: o.name, at: o.savedAt, sum: o.summary }; }))
        .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      h = all.length ? all.map(function (x) { return '<div class="ritem' + (x.on ? ' on' : '') + '"><div><b>' + wizEsc(x.name) + '</b><span class="note">' + (x.at ? new Date(tzMs(x.at)).toUTCString().slice(5, 22) : '') + (x.sum ? ' · ' + wizEsc(x.sum) : '') + (x.kind === 'old' ? ' · routes kept' : ' · your course') + '</span></div><div class="xrow"><button class="btn" data-sv="' + x.kind + ':' + x.id + '">Open</button><button class="btn" data-svdel="' + x.kind + ':' + x.id + '">Delete</button></div></div>'; }).join('')
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
    h += '<div class="rcur"><div><b>' + c.name + '</b><span class="note">' + (c.race && c.race.custom ? 'Your own course' : orgOf(c.race) + ' course library') + ' · ' + courseNm(c) + ' nm</span></div>' +
      '<div class="xrow"><button class="btn primary" id="rSave">' + (S.myId ? 'Save changes' : 'Save as my race') + '</button><button class="btn" id="rEdit">Edit on the chart</button><button class="btn" id="rMarks">Edit the marks</button><button class="btn" id="rNew">New course</button></div></div>';
    h += '<h3>My races</h3>' + (mine.length ? mine.map(function (r) { return '<div class="ritem' + (r.id === S.myId ? ' on' : '') + '"><div><b>' + r.name + '</b><span class="note">' + new Date(tzMs(r.savedAt)).toUTCString().slice(5, 22) + (r.summary ? ' · ' + r.summary : '') + (r.page !== HERE ? ' · on the ' + r.page + ' forecasts' : '') + '</span></div><div class="xrow"><button class="btn" data-open="' + r.id + '">Open</button><button class="btn" data-del="' + r.id + '" aria-label="Delete ' + r.name + '">Delete</button></div></div>'; }).join('') : '<p class="note">None yet. Save the race on screen, or build a new course, and it is kept here on this device.</p>');
    var olds = oldRoutes(); if (olds.length) h += '<h3>Old routes</h3>' + olds.map(function (o) { return '<div class="ritem"><div><b>' + wizEsc(o.name) + '</b><span class="note">Kept ' + new Date(tzMs(o.savedAt)).toUTCString().slice(5, 22) + (o.summary ? ' · ' + wizEsc(o.summary) : '') + '</span></div><div class="xrow"><button class="btn" data-old="' + o.id + '">Open</button><button class="btn" data-olddel="' + o.id + '">Delete</button></div></div>'; }).join('');
    var gAt = h.length;   /* Stuart 22 Nov 07:03: a race menu (Sydney Hobart, RORC, JOG) opens on its races; your own course and races follow */
    var orgs = mode === 'rorc' ? ['RORC'] : mode === 'jog' ? ['JOG'] : mode === 'other' ? ['CYCA'] : ['RORC', 'JOG', 'CYCA'];   /* CYCA: the Sydney Hobart (Stuart 21 Nov 15:28) */
    orgs.forEach(function (o) { var rs = RACES.filter(function (r) { return orgOf(r) === o; }); if (!rs.length) return;
    h += '<h3>' + groupName(o) + '</h3>' + (o === 'CYCA' ? '<p class="note">Run by the Cruising Yacht Club of Australia. The course is from the 2023 Sailing Instructions until the 2026 ones are published. Choose the entry for your start line: the route starts at that line’s seamark (Line 1 Mark Z, Lines 2 and 3 Mark Y, Line 4 Mark W).</p>' : '') + (o === 'JOG' ? '<p class="note">2027 dates from the JOG programme. JOG has not published its 2027 courses: coastal races are set on the day, and most passage races show the start and finish only.</p>' : '') + rs.map(function (r) { var pg = r.page || r.id, ready = READY[pg], yv = yourVersion(r.id); return '<div class="ritem"><div><b>' + r.name + '</b>' + (yv ? ' <span class="yourtag">your course</span>' : '') + '<span class="note">' + (r.date2027 ? r.date2027.split('-').reverse().slice(0, 2).join('/') + ' ' + r.date2027.slice(0, 4) + ' · ' : '') + (r.series ? r.series + ' · ' : '') + raceReady(r, ready) + '</span></div><div class="xrow"><button class="btn" data-race="' + r.id + '">' + (ready ? 'Open' : 'Show course') + '</button><button class="btn" data-redit="' + r.id + '" aria-label="Edit ' + r.name + '">Edit</button></div></div>'; }).join(''); });
    if (mode === 'rorc' || mode === 'jog' || mode === 'other') h = h.slice(gAt) + '<h3>This course</h3>' + h.slice(0, gAt);
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
    [].forEach.call($('raceList').querySelectorAll('[data-redit]'), function (b) { b.onclick = function () {   /* F101: Edit beside every stored race */
      var id = b.dataset.redit, rr = RACES.filter(function (x) { return x.id === id; })[0], pg = (rr && rr.page) || id; if (pg !== HERE) { location.href = '../' + pg + '/?race=' + encodeURIComponent(id) + '&edit=1'; return; }
      S.myId = null; applyRace(id); $('races').hidden = true; startEdit(courseCopy()); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-race]'), function (b) { b.onclick = function () {
      var id = b.dataset.race, rr = RACES.filter(function (x) { return x.id === id; })[0], pg = (rr && rr.page) || id; if (READY[pg] && pg !== HERE) { try { sessionStorage.setItem('fs-wiz', '1'); } catch (e) {} location.href = '../' + pg + '/?race=' + encodeURIComponent(id); return; }
      S.myId = null; applyRace(id); $('races').hidden = true;
        /* 22 Nov (found by tests/races-sweep.js): a race set on the day no longer keeps the last race's routes on screen under its name */
        var iss = courseIssue(meta.course); if (iss) { S.gen = (S.gen || 0) + 1; S.running = false; S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; busy(''); prog(''); if ($('finBox')) $('finBox').innerHTML = ''; $('runNote').textContent = iss; draw(); }
        if (wizCourseChosen(false)) return; if (!iss) { S.from = null; run(); } };
    });
  }


  /* exact class start: a day from the forecast window and a time to the minute (UTC); routes from that minute */
  function startRange() { var o = [].map.call($('startSel').options, function (x) { return +x.value; }).filter(function (x) { return x > 0; }); return o.length ? [Math.min.apply(null, o), Math.max.apply(null, o)] : null; }
  function startDayList() { var r = startRange(), out = [], sh = tzSh(); if (!r) return out; for (var t = Math.floor((r[0] + sh) / 86400) * 86400; t <= r[1] + sh; t += 86400) out.push({ v: t, k: new Date(t * 1000).toUTCString().slice(0, 11) }); return out; }
  function hhmm(ep) { return new Date((ep + tzSh()) * 1000).toUTCString().slice(17, 22); }
  function exactEpoch(dayV, tm) { var m = /^(\d{1,2}):(\d{2})/.exec(tm || ''); if (!m) return NaN; return +dayV + (+m[1]) * 3600 + (+m[2]) * 60 - tzSh(); }   /* the day and time are in the chosen zone */
  function futureKey() { return 'fs-future-' + HERE; }
  function futureGet() { try { var o = JSON.parse(store(futureKey()) || 'null'); return o && o.rk === raceKey() ? o : null; } catch (e) { return null; } }
  function futureSet(ep) { store(futureKey(), JSON.stringify({ rk: raceKey(), ep: ep })); }
  function futureDrop() { try { localStorage.removeItem(futureKey()); } catch (e) {} }
  function beyond(ep) { var r = startRange(); return !!(r && ep > r[1]); }
  function startCheck(ep) { var r = startRange(); if (!r || !(ep === ep)) return 'Enter a time, for example 10:20.'; if (ep > r[1]) return ''; if (ep < r[0] - 3600) return 'Starts can be from ' + clockAbs(r[0]) + ' to ' + clockAbs(r[1]) + ' ' + tzS1() + ' with these forecasts.'; return ''; }
  function setStart(ep, quiet) {
    var v = String(Math.round(ep)), sel = $('startSel');
    if (![].some.call(sel.options, function (o) { return o.value === v; })) { var o = document.createElement('option'); o.value = v; o.textContent = clockAbs(+v) + ' (exact)'; var after = [].filter.call(sel.options, function (x) { return +x.value < +v; }).pop(); if (after) after.after(o); else sel.prepend(o); }
    sel.value = v; if (!quiet) sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function laterDays(r) { var out = [], t0 = Math.floor((r[1] + tzSh()) / 86400) * 86400 + 86400; for (var t = t0; t < t0 + 90 * 86400; t += 86400) { var dd = new Date(t * 1000); out.push({ v: t, k: dd.toUTCString().slice(0, 11) + (dd.getUTCFullYear() !== new Date().getUTCFullYear() ? ' ' + dd.getUTCFullYear() : '') }); } return out; }
  function startPickerHtml(id, cur) { var days = startDayList(), r = startRange(), fu = futureGet(); if (fu) cur = fu.ep; var cd = Math.floor((cur + tzSh()) / 86400) * 86400, opt = function (d) { return '<option value="' + d.v + '"' + (d.v === cd ? ' selected' : '') + '>' + d.k + '</option>'; };
    return '<div class="row"><label for="' + id + 'Day">Day</label><select id="' + id + 'Day"><optgroup label="Forecasts ready">' + days.map(opt).join('') + '</optgroup>' + (r ? '<optgroup label="Later: no forecast yet">' + laterDays(r).map(opt).join('') + '</optgroup>' : '') + '</select></div><div class="row"><label for="' + id + 'Time">Time (' + (tzLocal() ? 'local, ' + tzS1() : 'UTC') + ')</label><input type="time" id="' + id + 'Time" step="60" value="' + hhmm(cur) + '" required></div><p class="note" id="' + id + 'Err" style="color:var(--warn)"></p>'; }
  function startPickerRead(id) { var ep = exactEpoch($(id + 'Day').value, $(id + 'Time').value), e = startCheck(ep); $(id + 'Err').textContent = e; return e ? NaN : ep; }
  /* Will the forecasts last the race? Each wind model's last hour against a rough finish time (course length at about
     5.5 knots times the TCC). A model that ends early hands over to the longer ones; only when every model has ended
     can Route not finish the race. */
  function beyondHtml(ep) { var r = startRange(); return '<div class="fitbox later"><b>Beyond the forecasts.</b> The forecasts reach ' + clockAbs(r[1]) + ' ' + tzS1() + '; this start is ' + clockAbs(ep) + ' ' + tzS1() + '. Route keeps the start and works out the routes once the forecasts reach it, about ten days before. Until then there is nothing to route.</div>'; }
  function fitHtml(startEp, c) { if (beyond(+startEp)) return beyondHtml(+startEp);
    c = c || meta.course; var st = (+startEp - T0) / 3600, nm = courseNm(c), tcc = +$('tcc').value || 1, est = nm / (5.5 * tcc), fin = st + est;
    var ms = selectedModels(); if (!ms.length) ms = meta.layers.filter(function (L) { return L.kind === 'wind'; }).map(function (L) { return L.id; });
    var ends = ms.map(function (id) { var L = layer(id), v = L && (L[S.loaded[id] || 'full'] || L.full), h = v && v.hours; return { id: id, end: h && h.length ? h[h.length - 1] : 0 }; }).sort(function (a, b) { return b.end - a.end; });
    if (!ends.length) return '';
    var last = ends[0].end, ok = last >= fin, tight = ok && last < fin + est * 0.25;
    var rows = ends.map(function (e) { var cov = e.end - st, all = e.end >= fin; return '<li>' + short(e.id) + ': to ' + clockAbs(T0 + e.end * 3600) + ' ' + tzS1() + (all ? ', covers the race' : cov > 0 ? ', about the first ' + Math.round(cov) + ' h, then the longer forecasts take over' : ', ends before this start') + '</li>'; }).join('');
    return '<div class="fit ' + (ok ? (tight ? 'tight' : 'ok') : 'no') + '"><b>' + (ok ? (tight ? 'Close: the race should just fit the forecasts.' : 'The forecasts cover the race.') : 'The race may not finish before the forecasts end.') + '</b> ' + nm + ' nm, roughly ' + Math.round(est) + ' h at your rating (a rough guide: upwind in a blow takes much longer), so a finish around ' + clockAbs(T0 + fin * 3600) + ' ' + tzS1() + '. The longest forecast runs to ' + clockAbs(T0 + last * 3600) + ' ' + tzS1() + '.' + (ok ? ' Route confirms it when it routes.' : ' Choose an earlier start, or wait for a later forecast run: Route will say if it cannot finish.') + '<details><summary>Each forecast</summary><ul>' + rows + '</ul><p class="note">Forecasts are published for 2 to 5 days ahead here; the global models go further and longer runs are coming.</p></details></div>';
  }
  /* ---------- guided set-up: boat, race, start, fleet, check, route; in the order a navigator prepares a race ---------- */
  var WIZ = { on: false, step: 0 }, WIZN = ['Race and boat', 'Choose the race', 'The start', 'Boats you are racing', 'Check and route'], WIZD = [0, 1, 1, 2, 3, 4];   /* five screens, four steps: the race list is part of step 1 (Stuart 12 Nov: race and boat first, then the start) */
  function wizSave() { try { sessionStorage.setItem('fs-wiz', WIZ.on ? String(WIZ.step) : ''); } catch (e) {} }
  function boatIsSet() { return store('fs-boatset') === '1' || Object.keys(boats()).length > 0 || !!BC.code; }
  /* what Route is sailing: TCC, where the polar comes from, and the boat (Stuart 12 Nov: say what is in use, not just "generic") */
  function boatDesc() {
    var tc = (+$('tcc').value || 1).toFixed(3), ty = $('boatType').selectedOptions[0] ? $('boatType').selectedOptions[0].textContent.split(',')[0] : '';
    var pol = boatSrc === 'polar' ? 'your own polar' : boatSrc === 'tcc' ? 'FirstShift generic, scaled to the TCC' : (ty ? ty + ' shape' : 'boat type') + ', scaled to the TCC';
    return { tcc: tc, polar: pol, name: $('boatName').value.trim() };
  }
  function boatWarn() {
    var d = boatDesc(), set = boatIsSet(); $('boatWarn').hidden = set || WIZ.on;
    $('boatWarn').textContent = 'TCC ' + d.tcc + ' · Polar: ' + d.polar + ' · Boat: ' + (d.name || 'not named') + (set ? '' : '. Tap to set up your boat');
  }
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
      var js = JSON.stringify(o); store(sessKey(), js); sessKeep(o.rk, js);
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
  /* each race keeps its own routes too (Stuart 16 Nov 15:47: "when i restarted it re-runs the routing ... it should go back exactly where it was"):
     reopening on a race whose routes were not the last ones saved puts its own routes back rather than routing again. Four races at most. */
  function sessKeep(rk, js) { try { var ix = JSON.parse(localStorage.getItem('fs-sessix-' + HERE) || '[]').filter(function (k) { return k !== rk; }); ix.unshift(rk);
      while (ix.length > 4) { localStorage.removeItem('fs-sessr-' + HERE + '-' + ix.pop()); }
      try { localStorage.setItem('fs-sessr-' + HERE + '-' + rk, js); } catch (e) { while (ix.length > 1) localStorage.removeItem('fs-sessr-' + HERE + '-' + ix.pop()); try { localStorage.setItem('fs-sessr-' + HERE + '-' + rk, js); } catch (x) { ix.shift(); } }
      localStorage.setItem('fs-sessix-' + HERE, JSON.stringify(ix)); } catch (e) {} }
  function sessFor(rk) { try { var o = JSON.parse(localStorage.getItem('fs-sessr-' + HERE + '-' + rk) || 'null'); return o && o.v === 1 && o.rk === rk && Date.now() < o.until ? o : null; } catch (e) { return null; } }
  function sessGet() { try { var o = JSON.parse(store(sessKey()) || 'null'); return o && o.v === 1 && Date.now() < o.until ? o : null; } catch (e) { return null; } }
  function sessDrop() { try { localStorage.removeItem(sessKey()); } catch (e) {} }
  function sessRestore(o) {
    var d = (o.T0 - T0) / 3600, sh = function (x) { return x == null ? x : x + d; };   /* a newer forecast pack counts its hours from a different moment */
    S.cleared = false; S.routes = o.routes.map(function (s) { s.mean = sh(s.mean); s.worst = sh(s.worst); var r = s.r; r.finish = sh(r.finish); r.path.forEach(function (p) { p.t = sh(p.t); }); (r.arrivals || []).forEach(function (a) { a.t = sh(a.t); }); if (r.partial && r.partial.end != null) r.partial.end = sh(r.partial.end); return s; });
    if (o.matrix) { o.matrix.start = sh(o.matrix.start); o.matrix.cols = o.matrix.cols.map(function (c) { return c.map(sh); }); }
    S.matrix = o.matrix; S.sel = S.routes[o.sel] || S.routes.filter(function (s) { return s.best; })[0] || S.routes[0];
    S.base = o.base; S.legs = o.legs; S.start = Object.assign({}, o.start, { t: sh(o.start.t) }); S.from = o.from ? Object.assign({}, o.from, { t: sh(o.from.t) }) : null; S.to = o.to; S.ghosts = []; S.key = null;
    $('runNote').textContent = 'Routes kept from ' + dayhm(o.at) + ' ' + tzS1() + ', as you left them.' + ((o.built !== (meta.built || meta.t0)) ? ' A newer forecast has arrived since: tap Route again to use it.' : ' Change any setting, or tap Route again, to work them out afresh.');
    if (o.built !== (meta.built || meta.t0)) { $('newData').hidden = false; $('newDataTxt').textContent = 'Newer forecast since these routes'; $('newDataBtn').textContent = 'Route again'; S.sessStale = true; }
    return ghosts().then(function () { show(); if (o.t != null) try { setTime(Math.max(S.tmin, Math.min(S.tmax, sh(o.t)))); } catch (e) {} });
  }
  function sessAsk() {
    var b = $('sessBox'); if (!b) return; if (window.__navQuiet && window.__navQuiet()) { b.hidden = true; return; }   /* reopening on the water carries straight on, no question */ b.hidden = false;
    $('sessNo').onclick = function () { b.hidden = true; };
    $('sessYes').onclick = function () { b.hidden = true; S.resume = null; sessDrop(); startChosen(false); S.routes = []; S.sel = null; run(); };
  }
  function startChosen(v) { S.startChosen = v !== false; var l = lastGet() || { race: ($('raceSel') && $('raceSel').value) || null, my: S.myId || null };   /* F93 (21 Nov): a page opened for the first time had no record yet, so a start chosen before the first routes were saved was lost on Reload */
    l.chosen = S.startChosen; l.start = $('startSel').value; store('fs-last-' + HERE, JSON.stringify(l)); chipStart(); }
  function chipStart() { setTimeout(function () { try { setupRender(); } catch (e) {} }, 0); var c = $('startChip'); if (!c) return; var v = +$('startSel').value; c.classList.toggle('ask', !S.startChosen && store('fs-autostart') !== '1'); var fu0 = futureGet(); if (fu0) v = fu0.ep; var ok = (S.startChosen || store('fs-autostart') === '1' || fu0) && v, d = new Date((v + tzSh()) * 1000), hm = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
    var past = !!(ok && v < Date.now() / 1000 - 600); if (past) c.classList.add('ask');   /* 13 (Stuart 20 Nov 15:59, the start had been set for yesterday): a start already gone says Started, in amber */
    c.innerHTML = '<span class="stl">' + (past ? 'Started' : 'Start') + (ok ? '<i class="utc"> ' + (tzLocal() ? 'LOCAL' : 'UTC') + '</i>' : '') + '</span><span class="stv">' + (ok ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + (innerWidth >= 700 && !matchMedia('(orientation:landscape) and (max-height:500px)').matches ? d.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' : '') + hm : 'tap to choose') + '</span>';
    c.title = ok ? (past ? 'The class start was ' : 'Class start ') + clockAbs(v) + ' ' + tzS1() + (past ? ': the race is under way. Tap to set a new start' : ': tap to change') : 'Class start: tap to choose'; }   /* its own button beside the race name (Stuart 12 Nov: the two were too close for a finger) */
  function wizCourseChosen(fromEditor) { S.drawnNew = false; showCard(); afterCard(); return true; }   /* a chosen race or drawn course comes back to the set-up card */   /* a course drawn from scratch goes through every step: race and boat, start, fleet, check */
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
        (known ? '<p class="note">IRC TCC ' + (+$('tcc').value).toFixed(3) + ', ' + wizEsc(($('boatType').options[$('boatType').selectedIndex] || { text: '' }).text) + ', ' + (window.FSSails ? FSSails.summary().sails : 0) + ' sails</p>' : '') +
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
      /* The start in three steps, in the order a crew does them (Stuart 20 Nov 15:11: "make this more intuitive", it was very confusing):
         1 the line (optional), 2 the class start time, 3 the countdown, with when it appears and a button to open it now */
      var ln0 = lineGet(), lnSet = !!(ln0 && ln0.boat && ln0.pin), barTxt = window.FS_MARK ? '15 minutes' : '1 hour';
      h += '<h3>' + wizEsc(meta.course.name) + '</h3><ol class="wzsteps">' +
        (window.__fsLineSet || window.__fsMarkLine ? '<li><b>Start line</b> <span class="wzst ' + (lnSet ? 'ok' : '') + '">' + (lnSet ? '✓ set' : 'optional') + '</span><p class="note" id="wzLnNote">' + (lnSet ? 'Both ends are set. Change it here.' : 'The RYS or JOG line, or your own. Without it, Route starts from the course start and the start screen has no time to burn.') + '</p><button class="btn" id="wzLine">' + (lnSet ? 'Change start line' : 'Set start line') + '</button></li>' : '') +
        '<li><b>Your class start</b> <span class="wztz"><button class="btn' + (tzLocal() ? '' : ' on') + '" data-tz="utc">UTC</button><button class="btn' + (tzLocal() ? ' on' : '') + '" data-tz="local">Local</button></span><p class="note">The exact time from the sailing instructions, in the time they use: UTC, or local time (' + tzS1() + ' on this device).</p>' + startPickerHtml('wz', cur) + '<div id="wzFit"></div></li>' +
        (window.__fsStartScreen ? '<li><b>Countdown</b><p class="note">With your start time set, the countdown bar appears by itself ' + barTxt + ' before the gun and the start screen 10 minutes before (change both on the start screen). Or open it now.</p><button class="btn primary" id="wzSS">Done, open the start screen</button></li>' : '') +
        '</ol><p class="note">For a race further ahead, set it up now and choose the start nearer the day.</p>';
      B.innerHTML = h + '</div>';
      [].forEach.call(B.querySelectorAll('[data-tz]'), function (b) { b.onclick = function () { var keep = startPickerRead('wz'); tzSet(b.dataset.tz); if (keep === keep) { /* keep the same moment, shown in the other zone */ var d = Math.floor((keep + tzSh()) / 86400) * 86400, dd = $('wzDay'), tt = $('wzTime'); if (dd) dd.value = String(d); if (tt) tt.value = hhmm(keep); } }; });   /* Local / UTC in the Start window: the same setting as Settings, Display (Stuart 20 Nov 16:03) */
      if ($('wzLine')) $('wzLine').onclick = function () { if (window.__fsLineSet) window.__fsLineSet(); else if (window.__fsMarkLine) { wizClose(false); window.__fsMarkLine(); } };
      if ($('wzSS')) $('wzSS').onclick = function () { if ($('wizNext').disabled) return; $('wizNext').click(); setTimeout(function () { if (window.__fsStartScreen) window.__fsStartScreen(); }, 700); };   /* sets the start as Done does, then opens the start screen */   /* A (Stuart 20 Nov 13:58): tapping START offers the start screen once a start is set */   /* Stuart 20 Nov 11:58: the start step offers the line first */
      var fit = function () { var ep = startPickerRead('wz'); $('wzFit').innerHTML = ep === ep ? fitHtml(ep) : ''; $('wizNext').disabled = !(ep === ep); };
      var dayMine = false;   /* F91 (21 Nov 00:10, refined 02:40): until the crew picks a day, a typed time goes to its nearest occurrence: at 23:07, 23:47 is today (not tomorrow), 21:00 is today (a race under way) and 06:00 is tomorrow */
      var nextDay = function () { if (dayMine) return; var dd = $('wzDay'), tt = $('wzTime'); if (!dd || !tt || !/^\d{1,2}:\d{2}/.test(tt.value)) return; var now = Date.now() / 1000, best = null;
        [].forEach.call(dd.options, function (o) { var ep = exactEpoch(o.value, tt.value); if (ep === ep && (best === null || Math.abs(ep - now) < Math.abs(best.ep - now))) best = { v: o.value, ep: ep }; }); if (best && dd.value !== best.v) dd.value = best.v; };
      $('wzDay').onchange = function () { dayMine = true; fit(); }; $('wzTime').oninput = function () { nextDay(); fit(); }; fit();
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
        row('Boat', (function () { var d = boatDesc(); return wizEsc(d.name || (bs ? 'Your boat' : 'Boat not named')) + ', TCC ' + d.tcc + ', polar: ' + wizEsc(d.polar) + ', ' + pct + '% of the polar' + (bs ? '' : '. Set up your boat for a true answer.'); })(), 1, !bs) +
        row('Sails', sl.sails + ' sails' + (sl.reef ? ', reef points on' : ''), 1) +
        row('Race', wizEsc(c.name) + ', ' + courseNm(c) + ' nm' + (issue ? '. ' + wizEsc(issue) : ''), 2, !!issue) +
        row('Start', clockAbs(+$('startSel').value) + ' ' + tzS1() + (/class="fit no/.test(fitHtml($('startSel').value)) ? '. The race may outlast the forecasts.' : ''), 3, /class="fit no/.test(fitHtml($('startSel').value))) +
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
      $('boatSave').click(); store('fs-boatset', '1'); if (S.card) { store('fs-wizdone', '1'); showCard(); afterCard(); return; } wizShow(3); return;
    }
    if (n === 3) { var ep3 = startPickerRead('wz'); if (!(ep3 === ep3)) return; if (beyond(ep3)) { futureSet(ep3); startChosen(); chipStart(); } else { futureDrop(); setStart(ep3); startChosen(); } if (S.card) { store('fs-wizdone', '1'); showCard(); afterCard(); return; } wizShow(4); return; }
    if (n === 4) { var t = $('wzMfPaste').value; if (t.trim()) { $('mfPaste').value = t; $('mfPasteGo').click(); } wizShow(5); return; }
    if (n === 5) { wizClose(true); return; }
  }
  function wizInit() {
    $('wizX').onclick = function () { wizClose(false); };
    $('wizBack').onclick = function () { if (WIZ.step > 1) wizShow(WIZ.step === 3 ? 1 : WIZ.step - 1); };
    $('wizNext').onclick = wizNext;
    $('wizBarBack').onclick = function () { wizShow(1); };
    $('boatWarn').onclick = function () { cardSettings('boat'); };
    $('sheetX').addEventListener('click', cardSettingsClosed);
    if ($('setDone')) $('setDone').onclick = function () { $('sheetX').click(); };
    $('sheetX').addEventListener('click', function () { if (WIZ.on && WIZ.back) { var b = WIZ.back; WIZ.back = 0; setTimeout(function () { wizShow(b); }, 0); } });
    $('racesX').addEventListener('click', function () { if (WIZ.on && WIZ.step === 2) wizClose(false); });
    boatWarn();
    try { if ($('oriBtn')) $('oriBtn').onclick = function () { ORI.mode = ORI.mode === 'north' ? 'course' : ORI.mode === 'course' ? 'route' : 'north'; store('fs-orient', ORI.mode); ORI.sm = null; busy(ORI.mode === 'north' ? 'North up' : ORI.mode === 'course' ? 'Course up: the GPS course over the ground is up (Live GPS on, moving over 1.5 kn); otherwise north up' : 'Route up: the course to the next mark is up'); setTimeout(function () { busy(''); }, 2500); draw(); }; } catch (e) {}
    try { liveSet(); $('liveBtn').onclick = function () { if (LIVE.on) { if (GPSWIN || LIVE.sim) liveStop(); else gpsMenu(); } else liveStart(); };   /* F104: with GPS on, a tap opens the GPS menu (Stop GPS is in it) */ } catch (e) {}
  }
  /* after the race list loads: resume a set-up that moved to another forecast page, or start one for a first-time user */
  function wizBoot(qs) {
    var st = 0; try { st = +(sessionStorage.getItem('fs-wiz') || 0); } catch (e) {}
    if (st) { try { sessionStorage.setItem('fs-wiz', ''); } catch (e) {} setTimeout(showCard, 300); return; }
    if (!store('fs-wizdone') && !qs.get('course') && !qs.get('my') && !qs.get('race') && !boatIsSet()) setTimeout(showCard, 300);
  }
  var REGIONS = [];
  /* the forecast page whose whole-area box holds every point of a course, if there is one */
  function regionFor(c) { var pts = [c.start].concat(c.marks).concat([c.finish]); return REGIONS.filter(function (g) { var b = g.region; return READY[g.id] && pts.every(function (q) { return q.lat >= b.s && q.lat <= b.n && q.lon >= b.w && q.lon <= b.e; }); })[0] || null; }
  function racesInit() {
    fetch('../status.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { Object.keys(j.sources || {}).forEach(function (k) { READY[k.split(':')[0]] = true; }); }).catch(function () { READY[HERE] = true; });
    READY[HERE] = true;
    /* the race box next to the logo opens a short menu (Stuart 12 Nov): new course, saved routes, RORC races, edit */
    $('raceBtn').onclick = function (e) {
      if (window.FS_SOLENT) { if (window.FSSolent) FSSolent.start(); return; }   /* FirstShift Solent: the race button opens the course card */
      var m = $('raceMenu'); if (!m.hidden) { m.hidden = true; return; }
      var n = myRaces().length + oldRoutes().length; $('rmSaved').textContent = '☰ Saved routes' + (n ? ' (' + n + ')' : '');
      var r = $('raceBtn').getBoundingClientRect(); m.style.left = Math.max(8, Math.min(innerWidth - 250, r.left)) + 'px'; m.style.top = (r.bottom + 6) + 'px'; m.style.bottom = ''; m.hidden = false; if (e) e.stopPropagation();
    };
    ['raceTitle', 'raceShort'].forEach(function (id) { $(id).onclick = function (e) { $('raceBtn').onclick(e); }; });   /* the name itself is a tap target, so a phone does not nudge the tap onto the start chip below it */
    document.addEventListener('click', function (e) { var m = $('raceMenu'); if (!m.hidden && !m.contains(e.target) && !$('raceBtn').contains(e.target)) m.hidden = true; });
    $('rmNew').onclick = function () { $('raceMenu').hidden = true; racesSheet('new'); $('races').hidden = false; };
    $('rmSaved').onclick = function () { $('raceMenu').hidden = true; racesSheet('saved'); $('races').hidden = false; };
    if ($('rmLine')) $('rmLine').onclick = function () { $('raceMenu').hidden = true; if (window.__fsLineSet) window.__fsLineSet(); else if (window.__fsMarkLine) window.__fsMarkLine(); };   /* Stuart 20 Nov 11:58: Set start line first in the race menu */
    $('rmRorc').onclick = function () { $('raceMenu').hidden = true; racesSheet('rorc'); $('races').hidden = false; };
    if ($('rmJog')) $('rmJog').onclick = function () { $('raceMenu').hidden = true; racesSheet('jog'); $('races').hidden = false; };
    if ($('rmOther')) $('rmOther').onclick = function () { $('raceMenu').hidden = true; racesSheet('other'); $('races').hidden = false; };
    if ($('rmSolent')) $('rmSolent').onclick = function () { $('raceMenu').hidden = true; window.__fsInshore(true); if (window.FSSolent) { FSSolent.on(true); FSSolent.start(); } };
    if ($('rmOffshore')) $('rmOffshore').onclick = function () { $('raceMenu').hidden = true; window.__fsInshore(false); };
    setInterval(function () { var b = $('rmOffshore'); if (b) { b.hidden = !S.offPrev; if (S.offPrev) b.textContent = '⚓ Back to ' + (S.offPrev.short || S.offPrev.name); } }, 500);   /* J3 (Stuart 15 Nov 17:32): Solent races below RORC and JOG */
    $('rmEdit').onclick = function () { $('raceMenu').hidden = true; startEdit(courseCopy()); };
    $('dataChip').addEventListener('click', function (e) { e.stopPropagation(); });
    $('racesX').onclick = function () { $('races').hidden = true; if (S.edit) { $('editBar').hidden = false; editPrompt(); draw(); } };   /* closing the course list mid-edit goes back to the edit on the chart, never to a hidden edit that stops routing (Stuart 12 Nov) */
    $('races').onclick = function (e) { if (e.target === $('races')) $('races').hidden = true; };
    $('edUndo').onclick = function () { if (!S.edit) return; if ($('markPop')) $('markPop').hidden = true; if (S.edit.hist.length) S.edit.pts = JSON.parse(S.edit.hist.pop()); else S.edit.pts.pop(); editPrompt(); draw(); };
    $('edCancel').onclick = function () { if ($('markPop')) $('markPop').hidden = true; S.edit = null; $('editBar').hidden = true; draw(); if (QS0.get('new') && !S.newDone) { S.newDone = true; run(); } };
    $('edGo').onclick = function () { if (!S.edit || S.edit.pts.length < 2) return; if ($('markPop')) $('markPop').hidden = true; var o0 = S.edit.orig ? JSON.parse(S.edit.orig) : [], same = function (q) { return o0.some(function (r) { return Math.abs(r.lat - q.lat) < 1e-6 && Math.abs(r.lon - q.lon) < 1e-6; }); }; var bad = S.edit.pts.filter(function (q) { return !same(q) && !editOk(q.lat, q.lon, q.name); }); if (bad.length) return;   /* only new or moved points are checked: a published finish or rock that sits on a land square of the depth chart (St Malo, Fastnet Rock) must not stop the course saving (Stuart 14 Nov: edited courses would not save or route) */ $('editBar').hidden = true; editCommit($('startSel').value); };
    $('edDone').onclick = function () { if (!S.edit || S.edit.pts.length < 2) return; if ($('markPop')) $('markPop').hidden = true; editForm(); };

  }
  /* course editor: any course, from the race list or your own. On the chart: tap to place points, drag any point to move it.
     In the list: names, rounding sides, positions typed as latitude and longitude, add, remove and reorder marks. */
  /* rhumb line between two points: the true course to steer and its length in nautical miles */
  function rhumb(a, b) {
    var p1 = a.lat * R, p2 = b.lat * R, dp = p2 - p1, dl = (b.lon - a.lon) * R; if (Math.abs(dl) > Math.PI) dl -= (dl > 0 ? 2 : -2) * Math.PI;
    var dq = Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2)), q = Math.abs(dq) > 1e-12 ? dp / dq : Math.cos(p1);
    return { nm: Math.sqrt(dp * dp + q * q * dl * dl) * 3440.065, brg: (Math.atan2(dl, dq) / R + 360) % 360 };
  }
  function legTxt(a, b) { var r = rhumb(a, b), c = Math.round(r.brg) % 360; return ('00' + c).slice(-3) + '°T · ' + (r.nm < 10 ? r.nm.toFixed(1) : Math.round(r.nm)) + ' nm'; }
  /* Waypoints (Stuart 12 Nov): points on a leg that are not rounding marks, kept in the course's marks list with via: true.
     Routes pass through one only when must is set. Wherever a leg crosses land, Route adds automatic waypoints that keep the course line
     1 nm off the land where it can, so the course and distance on each leg are ones a boat could sail. */
  function isVia(m) { return !!(m && m.via); }
  function realMarks(c) { return ((c && c.marks) || []).filter(function (m) { return !m.via; }); }
  function sideVal(q) { return q.via ? (q.must ? 'viamust' : 'via') : (q.side || 'port'); }
  function sideSet(q, v) { if (v === 'via' || v === 'viamust') { q.via = true; q.must = v === 'viamust'; delete q.side; } else { q.via = false; q.must = false; q.side = v; } q.auto = false; }
  var VIA = { key: null, pts: null };
  function zAt(la, lo) { return P.depth ? P.depth.nearest('z', la, lo) : NaN; }
  function crossesLand(a, b) {
    var L = FSRouter.dist(a.lat, a.lon, b.lat, b.lon), n = Math.max(4, Math.ceil(L / 0.2));
    for (var k = 1; k < n; k++) { var f = k / n; if (f * L < 0.3 || (1 - f) * L < 0.3) continue; if (zAt(a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f) > 0) return true; }
    return false;
  }
  function viaAuto(a, b) {   /* shortest water path on a grid over the leg, then the fewest straight lines along it */
    var L = FSRouter.dist(a.lat, a.lon, b.lat, b.lon), cm = Math.cos((a.lat + b.lat) / 2 * R), pad = Math.max(12, L * 0.3) / 60;
    var la0 = Math.min(a.lat, b.lat) - pad, la1 = Math.max(a.lat, b.lat) + pad, lo0 = Math.min(a.lon, b.lon) - pad / cm, lo1 = Math.max(a.lon, b.lon) + pad / cm;
    var res = Math.max(0.2, L / 300), nx, ny; for (;;) { ny = Math.ceil((la1 - la0) * 60 / res); nx = Math.ceil((lo1 - lo0) * 60 * cm / res); if (nx * ny <= 160000) break; res *= 1.25; }
    var dla = (la1 - la0) / ny, dlo = (lo1 - lo0) / nx, N = nx * ny, land = new Uint8Array(N), d = new Float32Array(N), i, j, k;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { k = j * nx + i; land[k] = zAt(la0 + (j + 0.5) * dla, lo0 + (i + 0.5) * dlo) > 0 ? 1 : 0; d[k] = land[k] ? 0 : 1e9; }
    var S2 = Math.SQRT2;   /* distance to land in cells, two passes */
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { k = j * nx + i; if (i) d[k] = Math.min(d[k], d[k - 1] + 1); if (j) { d[k] = Math.min(d[k], d[k - nx] + 1); if (i) d[k] = Math.min(d[k], d[k - nx - 1] + S2); if (i < nx - 1) d[k] = Math.min(d[k], d[k - nx + 1] + S2); } }
    for (j = ny - 1; j >= 0; j--) for (i = nx - 1; i >= 0; i--) { k = j * nx + i; if (i < nx - 1) d[k] = Math.min(d[k], d[k + 1] + 1); if (j < ny - 1) { d[k] = Math.min(d[k], d[k + nx] + 1); if (i < nx - 1) d[k] = Math.min(d[k], d[k + nx + 1] + S2); if (i) d[k] = Math.min(d[k], d[k + nx - 1] + S2); } }
    var cell = function (q) { return [Math.max(0, Math.min(nx - 1, Math.floor((q.lon - lo0) / dlo))), Math.max(0, Math.min(ny - 1, Math.floor((q.lat - la0) / dla)))]; };
    var A = cell(a), B = cell(b), ka = A[1] * nx + A[0], kb = B[1] * nx + B[0];
    /* 1 nm off the land is a strong preference, not a rule: water closer in costs up to three times as much to cross, so narrows like Hurst are still used when going round is longer */
    var need = 1 / res, cost = new Float32Array(N), near = 1.6 / res;
    for (k = 0; k < N; k++) { if (land[k]) { var x = k % nx, y = (k - x) / nx; cost[k] = (Math.hypot(x - A[0], y - A[1]) < 0.5 / res || Math.hypot(x - B[0], y - B[1]) < 0.5 / res) ? 3 : -1; } else cost[k] = d[k] >= need ? 1 : 1 + 2 * (1 - d[k] / need); }
    cost[ka] = Math.max(cost[ka], 1); cost[kb] = Math.max(cost[kb], 1);
    var path = viaAstar(cost, nx, ny, ka, kb); if (!path) return [];
    var clear = function (ia, ib) {   /* a straight line may replace part of the path if it keeps at least as far off the land as that part did */
      var lim = need; for (var m0 = ia; m0 <= ib; m0++) lim = Math.min(lim, d[path[m0]]); lim = Math.max(0, lim - 0.75);
      var p0 = path[ia], p1 = path[ib], x0 = p0 % nx, y0 = (p0 - x0) / nx, x1 = p1 % nx, y1 = (p1 - x1) / nx, n2 = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
      for (var m = 1; m < n2; m++) { var q = Math.round(y0 + (y1 - y0) * m / n2) * nx + Math.round(x0 + (x1 - x0) * m / n2); if (land[q] || d[q] < lim) return false; } return true; };
    var at = function (m) { if (m === 0) return a; if (m === path.length - 1) return b; var xk = path[m] % nx, yk = (path[m] - xk) / nx; return { lat: la0 + (yk + 0.5) * dla, lon: lo0 + (xk + 0.5) * dlo }; };
    var J = [0], ii = 0; while (ii < path.length - 1) { var jj = path.length - 1; while (jj > ii + 1 && (!clear(ii, jj) || crossesLand(at(ii), at(jj)))) jj--;   /* checked again at fine scale, so small islands such as Alderney are not cut */ J.push(jj); ii = jj; }
    /* the grid search bends in eight directions only, so pull each waypoint in towards the headland it clears: the shortest pair of legs that keeps as far off the land as before */
    var xy = function (k2) { var xk = k2 % nx; return [xk, (k2 - xk) / nx]; }, V = J.map(function (m) { return xy(path[m]); }), lims = [];
    for (var v = 1; v < J.length - 1; v++) { var lm = need; for (var m1 = J[v - 1]; m1 <= J[v + 1]; m1++) lm = Math.min(lm, d[path[m1]]); lims[v] = Math.max(0, lm - 0.75); }
    var nearEnd = 0.6 / res, segOK = function (P0, P1, lim) { var n2 = Math.ceil(Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) * 2) + 1; for (var m = 0; m <= n2; m++) { var xx = Math.round(P0[0] + (P1[0] - P0[0]) * m / n2), yy = Math.round(P0[1] + (P1[1] - P0[1]) * m / n2); if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) return false; var q = yy * nx + xx; if (land[q]) return false; if (d[q] < lim && Math.hypot(xx - A[0], yy - A[1]) > nearEnd && Math.hypot(xx - B[0], yy - B[1]) > nearEnd) return false; } return true; };
    var V0 = V.map(function (q) { return q.slice(); });
    for (var it = 0; it < 3; it++) for (v = 1; v < V.length - 1; v++) {
      var P0 = V[v - 1], P1 = V[v + 1], best = null, bd = Infinity, R2 = Math.min(40, Math.ceil(Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) / 2));
      for (var oy = -R2; oy <= R2; oy += 1) for (var ox = -R2; ox <= R2; ox += 1) { var c2 = [V[v][0] + ox, V[v][1] + oy], dd = Math.hypot(c2[0] - P0[0], c2[1] - P0[1]) + Math.hypot(P1[0] - c2[0], P1[1] - c2[1]); if (dd >= bd) continue; if (segOK(P0, c2, lims[v]) && segOK(c2, P1, lims[v])) { bd = dd; best = c2; } }
      if (best) V[v] = best;
    }
    var pt = function (q) { return { lat: la0 + (q[1] + 0.5) * dla, lon: lo0 + (q[0] + 0.5) * dlo }; };
    var good = true; for (v = 1; v < V.length; v++) if (crossesLand(v === 1 ? a : pt(V[v - 1]), v === V.length - 1 ? b : pt(V[v]))) { good = false; break; }
    if (!good) V = V0;
    var out = V.slice(1, -1).map(function (q) { var g = pt(q); return [+g.lat.toFixed(4), +g.lon.toFixed(4)]; });
    return out;
  }
  function viaAstar(cost, nx, ny, s0, g0) {   /* eight-way A* over a cost grid (below 0 is land), octile distance */
    var N = nx * ny, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), heap = [], hk = [];
    var gx = g0 % nx, gy = (g0 - gx) / nx, h = function (k) { var x = k % nx, y = (k - x) / nx, dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    var push = function (k, f) { heap.push(f); hk.push(k); var c = heap.length - 1; while (c) { var pp = (c - 1) >> 1; if (heap[pp] <= heap[c]) break; var t1 = heap[pp]; heap[pp] = heap[c]; heap[c] = t1; t1 = hk[pp]; hk[pp] = hk[c]; hk[c] = t1; c = pp; } };
    var pop = function () { var k = hk[0], lf = heap.pop(), lk = hk.pop(); if (heap.length) { heap[0] = lf; hk[0] = lk; var c = 0; for (;;) { var l = 2 * c + 1, r2 = l + 1, m = c; if (l < heap.length && heap[l] < heap[m]) m = l; if (r2 < heap.length && heap[r2] < heap[m]) m = r2; if (m === c) break; var t1 = heap[m]; heap[m] = heap[c]; heap[c] = t1; t1 = hk[m]; hk[m] = hk[c]; hk[c] = t1; c = m; } } return k; };
    gs[s0] = 0; push(s0, h(s0)); var steps = 0;
    while (heap.length) {
      var k = pop(); if (done[k]) continue; done[k] = 1; if (k === g0) break; if (++steps > 400000) return null;
      var x = k % nx, y = (k - x) / nx;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue; var q = yy * nx + xx; if (cost[q] < 0 || done[q]) continue; var g = gs[k] + (dx && dy ? Math.SQRT2 : 1) * (cost[q] + cost[k]) / 2; if (g < gs[q]) { gs[q] = g; from[q] = k; push(q, g + h(q)); } }
    }
    if (from[g0] < 0 && g0 !== s0) return null;
    var out = [g0]; while (out[out.length - 1] !== s0) out.push(from[out[out.length - 1]]); return out.reverse();
  }
  function courseFull(c) {   /* the course's own points plus automatic waypoints on any leg that crosses land */
    var pts = [c.start].concat(c.marks || []).concat([c.finish]); if (!P.depth) return pts;
    var key = JSON.stringify(pts.map(function (q) { return [q.lat, q.lon, !!q.via]; })); if (VIA.key === key) return VIA.pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i]; if (crossesLand(a, b)) viaAuto(a, b).forEach(function (q) { out.push({ lat: q[0], lon: q[1], name: '', via: true, auto: true }); }); out.push(b); }
    VIA.key = key; VIA.pts = out; return out;
  }
  function viaMark(x, y, must) { ctx.save(); ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fillStyle = must ? (css['--brand'] || '#6FA9E0') : css['--panel']; ctx.fill(); ctx.strokeStyle = css['--brand'] || '#6FA9E0'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
  function legsDraw(pts, strong, part) {   /* part: 'line' draws only the course lines (under the routes), 'label' only the labels (over them) */   /* course and distance at the middle of each leg */
    if (pts.length < 2) return; ctx.save(); ctx.font = '600 10.5px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], x1 = X(a.lon), y1 = Y(a.lat), x2 = X(b.lon), y2 = Y(b.lat);
      var t0 = 0, t1 = 1, dx = x2 - x1, dy = y2 - y1, m0 = 50, ok = [[-dx, x1 - m0], [dx, W - m0 - x1], [-dy, y1 - 70], [dy, H - 40 - y1]].every(function (q) {   /* clip to the visible chart, so the label sits on the part you can see */
        if (q[0] === 0) return q[1] >= 0; var r = q[1] / q[0]; if (q[0] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; });
      if (!strong && part !== 'label') { ctx.save(); var alone = !S.routes.some(function (r) { return !r.hidden; }); ctx.setLineDash(alone ? [] : [7, 6]); ctx.lineWidth = alone ? 2.2 : 1.4; ctx.globalAlpha = alone ? 0.95 : 0.75; ctx.strokeStyle = alone ? (css['--brand'] || '#6FA9E0') : (css['--muted'] || '#8EA3BF');   /* with every route hidden the course itself is the picture: solid and clear */ ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }   /* the course line itself, so the label never floats on its own (Stuart 12 Nov) */
      if (part === 'line' || !ok || Math.hypot(dx, dy) * (t1 - t0) < (strong ? 70 : 90)) continue;
      var t = legTxt(a, b), w = ctx.measureText(t).width + 10, mx = x1 + dx * (t0 + t1) / 2, my = y1 + dy * (t0 + t1) / 2;
      var dyL = lbFit(mx - w / 2, my - 9, w, 18, 4); if (dyL == null) continue; my += dyL;   /* an out-and-back course puts two legs on one line: the labels stack instead of overlapping (A14: and give way to every other label) */
      if (ORI.turned) { upright(mx, my, function (ux, uy) { ctx.globalAlpha = 0.92; ctx.fillStyle = css['--panel']; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(ux - w / 2, uy - 9, w, 18, 9); else ctx.rect(ux - w / 2, uy - 9, w, 18); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = strong ? css['--route'] : css['--line']; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = css['--ink']; ctx.fillText(t, ux - w / 2 + 5, uy + 0.5); }); continue; }
      ctx.globalAlpha = 0.92; ctx.fillStyle = css['--panel']; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(mx - w / 2, my - 9, w, 18, 9); else ctx.rect(mx - w / 2, my - 9, w, 18); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = strong ? css['--route'] : css['--line']; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = css['--ink']; ctx.fillText(t, mx - w / 2 + 5, my + 0.5);
    }
    ctx.restore();
  }
  /* my marks: named positions kept on this device for future courses */
  function myMarks() { try { return JSON.parse(store('fs-mymarks') || '[]'); } catch (e) { return []; } }
  function myMarksSet(a) { store('fs-mymarks', JSON.stringify(a.slice(0, 200))); }
  function myMarkSave(q, name) {
    var nm = (name || q.name || '').trim(); if (!nm) { busy('Give the mark a name first.'); setTimeout(function () { busy(''); }, 2000); return false; }
    var a = myMarks().filter(function (m) { return m.name.toLowerCase() !== nm.toLowerCase(); }); a.unshift({ name: nm, lat: +q.lat.toFixed(5), lon: +q.lon.toFixed(5) }); myMarksSet(a);
    busy('Saved to My marks: ' + nm); setTimeout(function () { busy(''); }, 1800); return true;
  }
  function myMarksDraw() {
    var vb = viewBox(), used = S.edit.pts; ctx.save(); ctx.font = '500 10.5px Inter, sans-serif';
    myMarks().forEach(function (m) {
      if (m.lat < vb.s || m.lat > vb.n || m.lon < vb.w || m.lon > vb.e) return;
      if (used.some(function (q) { return Math.abs(q.lat - m.lat) < 1e-4 && Math.abs(q.lon - m.lon) < 1e-4; })) return;
      var x = X(m.lon), y = Y(m.lat); ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--brand'] || css['--route']; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = css['--muted']; ctx.fillText(m.name, x + 9, y + 4);
    });
    ctx.restore();
  }
  function myMarkHit(x, y) { var best = null, bd = 16; myMarks().forEach(function (m) { var d = Math.hypot(X(m.lon) - x, Y(m.lat) - y); if (d < bd) { bd = d; best = m; } }); return best; }
  function legHit(x, y) {   /* the leg a tap lands on, as the index to insert before */
    var p = S.edit.pts, best = -1, bd = 16;
    for (var i = 1; i < p.length; i++) { var x1 = X(p[i - 1].lon), y1 = Y(p[i - 1].lat), x2 = X(p[i].lon), y2 = Y(p[i].lat), dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)), d = Math.hypot(x - x1 - t * dx, y - y1 - t * dy); if (d < bd && t > 0.08 && t < 0.92) { bd = d; best = i; } }
    return best;
  }
  /* the mark card: tap a point on the chart to name it, set its position or side, delete it or keep it in My marks */
  function markCard(i) {
    var p = S.edit.pts, q = p[i], n = p.length, kind = i === 0 ? 'Start' : i === n - 1 && S.edit.closed ? 'Finish' : q.via ? 'Waypoint' : 'Mark ' + i, mid = i > 0 && !(i === n - 1 && S.edit.closed), box = $('markPop');
    var legs = (i > 0 ? '<span>From ' + (p[i - 1].name || (i - 1 ? 'Mark ' + (i - 1) : 'Start')) + ': <b>' + legTxt(p[i - 1], q) + '</b></span>' : '') + (i < n - 1 ? '<span>To next: <b>' + legTxt(q, p[i + 1]) + '</b></span>' : '');
    box.innerHTML = '<div class="mphd"><b>' + kind + '</b><button class="btn" id="mpX" aria-label="Close">×</button></div>' +
      '<input id="mpN" placeholder="Name" value="' + (q.name || '').replace(/"/g, '&quot;') + '" aria-label="Name">' +
      '<div class="mpll"><input id="mpLa" aria-label="Latitude" value="' + fmtPos(q.lat, 'NS') + '"><input id="mpLo" aria-label="Longitude" value="' + fmtPos(q.lon, 'EW') + '"></div>' +
      (mid ? '<select id="mpS" aria-label="Mark or waypoint"><option value="port">Mark, leave to port</option><option value="starboard">Mark, leave to starboard</option><option value="via">Waypoint: course line only</option><option value="viamust">Waypoint: routes must pass</option></select><p class="note" style="margin:2px 0 0;font-size:11.5px">A waypoint is not rounded: it shapes the course line, course and distance. Routes only go through it if you choose "routes must pass".</p>' : '') +
      (legs ? '<div class="mplegs">' + legs + '</div>' : '') +
      '<div class="xrow"><button class="btn primary" id="mpOk">Done</button><button class="btn" id="mpKeep">Save to My marks</button><button class="btn warnb" id="mpDel">Delete</button></div>';
    box.hidden = false; if ($('mpS')) $('mpS').value = sideVal(q);
    var read = function () { var la = parsePos($('mpLa').value, true), lo = parsePos($('mpLo').value, false); $('mpLa').classList.toggle('bad', isNaN(la)); $('mpLo').classList.toggle('bad', isNaN(lo)); if (isNaN(la) || isNaN(lo)) return false; if (!editOk(la, lo)) return false; q.lat = +la.toFixed(5); q.lon = +lo.toFixed(5); q.name = $('mpN').value.trim(); if ($('mpS')) sideSet(q, $('mpS').value); return true; };
    $('mpX').onclick = function () { box.hidden = true; };
    $('mpOk').onclick = function () { var snap = JSON.stringify(p); if (!read()) return; if (snap !== JSON.stringify(p)) { S.edit.hist.push(snap); } box.hidden = true; editPrompt(); draw(); };
    $('mpKeep').onclick = function () { var snap = JSON.stringify(p); if (!read()) return; if (snap !== JSON.stringify(p)) S.edit.hist.push(snap); if (myMarkSave(q, q.name)) { box.hidden = true; editPrompt(); draw(); } };
    $('mpDel').onclick = function () { editSnap(); p.splice(i, 1); box.hidden = true; editPrompt(); draw(); };
  }
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
    var AREA = { 'tasman-area': 'From Sydney Heads down the New South Wales coast, across Bass Strait and down the east coast of Tasmania to Hobart', 'channel-area': 'From the Scillies to Dover, the Channel Islands and north Brittany', 'northsea-area': 'From the Thames Estuary to the Dutch and Belgian coasts', 'irishsea-area': "From St George's Channel to the North Channel, Wales to the east coast of Ireland", 'celtic-area': 'From Ushant and north Brittany to the south coast of Ireland, out past Fastnet Rock and the Scillies', 'biscay-area': 'From Ushant to Cape Finisterre, the French coast down to the Gironde' };
    $('raceList').innerHTML = '<h3>Where is the race?</h3><p class="note">Route draws your course on the forecast area that will route it, so the wind, tide and depth are ready when you save it.</p>' +
      opts2.map(function (g) { return '<div class="ritem"><div><b>' + g.name + '</b><span class="note">' + (AREA[g.id] || '') + '</span></div><div class="xrow"><button class="btn primary" data-newin="' + g.id + '">Draw here</button></div></div>'; }).join('') +
      '<p class="note">Further afield comes later.</p>';
    $('races').hidden = false;
    [].forEach.call($('raceList').querySelectorAll('[data-newin]'), function (b) { b.onclick = function () { goNew(b.dataset.newin); }; });
  }
  function goNew(id) { try { if (WIZ.on) sessionStorage.setItem('fs-wiz', ''); } catch (e) {} location.href = '../' + id + '/?new=1'; }
  function startEdit(c) {
    $('races').hidden = true; $('wizBar').hidden = true; closePanel(); $('cbanner').hidden = true; $('tip').hidden = true;
    if (!c || !(meta.course.race && meta.course.race.custom)) S.myId = null;   /* Stuart 14 Nov "loses the courses": a new course or an edited RORC or JOG race used to be saved over the My race opened before */
    var base0 = c ? (S.yours ? S.yours.race : meta.course.race && !meta.course.race.custom ? meta.course.race : null) : null;   /* F101: only an edit of a stored race's own course is your version of it; a new course never is */
    S.edit = { base: base0, name: c ? c.name : 'My course', pts: c ? [c.start].concat(c.marks || []).concat([c.finish]).filter(function (p) { return !p.auto; }).map(function (p) { return { lat: p.lat, lon: p.lon, name: p.name, side: p.side, via: !!p.via, must: !!p.must, auto: !!p.auto }; }) : [], closed: !!c, hist: [] };
    S.edit.orig = JSON.stringify(S.edit.pts);
    if (!c) S.drawnNew = true;
    var cb = null; if (c) { cb = { s: 90, n: -90, w: 180, e: -180 }; S.edit.pts.forEach(function (q) { cb.s = Math.min(cb.s, q.lat); cb.n = Math.max(cb.n, q.lat); cb.w = Math.min(cb.w, q.lon); cb.e = Math.max(cb.e, q.lon); }); var mla = Math.max(0.08, (cb.n - cb.s) * 0.15), mlo = Math.max(0.12, (cb.e - cb.w) * 0.15); cb.s -= mla; cb.n += mla; cb.w -= mlo; cb.e += mlo; }   /* an existing course: the whole course in view */
    if (!c || cb) { var rg = { region: cb || { s: 48.0, n: 56.0, w: -12.5, e: 6.5 } }; if (rg && rg.region) { var b = rg.region;   /* the whole of Route's waters: the Irish Sea, out past Fastnet Rock, the Channel and the southern North Sea (Biscay is a pan away) */ var cv = $('map').getBoundingClientRect(); $('editBar').hidden = false; var eb = $('editBar').getBoundingClientRect(), pn = $('panel') && !$('panel').hidden ? $('panel').getBoundingClientRect() : null;
        var top = Math.max(0, eb.bottom - cv.top + 6), bot = pn && pn.top > cv.top + 100 ? Math.min(H, pn.top - cv.top - 6) : H - 10, room = Math.max(120, bot - top);   /* fit between the edit bar and the panel */
        view.s = Math.max(20, Math.min(W / ((b.e - b.w) * K * 1.04), room / ((b.n - b.s) * 1.04))); view.lo = (b.w + b.e) / 2; view.la = (b.s + b.n) / 2 + ((top + bot) / 2 - H / 2) / view.s; if (!c) { S.routes = []; S.sel = null; } } }   /* a new course: the whole area Route can route, nothing old on it */
    $('editBar').hidden = false; editPrompt(); draw();
  }
  function editSnap() { S.edit.hist.push(JSON.stringify(S.edit.pts)); if (S.edit.hist.length > 60) S.edit.hist.shift(); }
  /* what has changed since editing began: moved, added or removed marks, by name */
  function editChanges() {
    if (!S.edit || !S.edit.closed || !S.edit.orig) return [];
    var o = JSON.parse(S.edit.orig), p = S.edit.pts, out = [], nm = function (q, i, a) { if (q.name) return q.name; if (i === 0) return 'Start'; if (i === a.length - 1) return 'Finish'; var n = 0; for (var j = 1; j <= i; j++) if (!!a[j].via === !!q.via) n++; return (q.via ? 'Waypoint ' : 'Mark ') + n; };   /* marks and waypoints numbered apart, so a waypoint never shifts a mark's number */
    var D = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    o.forEach(function (q, i) { var k = -1; p.forEach(function (r, j) { if (k < 0 && nm(r, j, p) === nm(q, i, o)) k = j; });
      if (k < 0) { out.push(nm(q, i, o) + ' removed'); return; }
      var r = rhumb(q, p[k]); if (r.nm >= 0.05) out.push(nm(q, i, o) + ' moved ' + (r.nm < 10 ? r.nm.toFixed(1) : Math.round(r.nm)) + ' nm ' + D[Math.round(r.brg / 45) % 8]);
      else if ((q.side || '') !== (p[k].side || '') && i > 0 && i < o.length - 1) out.push(nm(q, i, o) + ' now to ' + (p[k].side || 'port')); });
    p.forEach(function (r, j) { var hit = o.some(function (q, i) { return nm(q, i, o) === nm(r, j, p); }); if (!hit) out.push(nm(r, j, p) + ' added'); });
    if (!out.length && JSON.stringify(o.map(function (q) { return q.name; })) !== JSON.stringify(p.map(function (q) { return q.name; }))) out.push('marks reordered');
    return out;
  }
  /* courses saved before 14 Nov 18:30 can carry Route's own automatic waypoints as if placed by hand (Stuart: editing moved marks, would not route): offer to remove the unnamed ones */
  function strayVias() { return S.edit ? S.edit.pts.filter(function (q, i, a) { return i > 0 && i < a.length - 1 && q.via && !q.must && !q.name; }).length : 0; }
  function strayLink() { var k = strayVias(); return k ? ' <button class="btn" id="edStray" type="button">Remove ' + k + ' unnamed waypoint' + (k === 1 ? '' : 's') + '</button>' : ''; }
  function strayWire() { var b = $('edStray'); if (!b) return; b.onclick = function (e) { e.stopPropagation(); editSnap(); S.edit.pts = S.edit.pts.filter(function (q, i, a) { return !(i > 0 && i < a.length - 1 && q.via && !q.must && !q.name); }); editPrompt(); draw(); }; }
  function editPrompt() {
    editPrompt0(); strayWire();
  }
  function editPrompt0() {
    var n = S.edit.pts.length, ch = editChanges(); S.edit.changed = ch.length > 0;
    if ($('edGo')) $('edGo').hidden = !(S.edit.changed && n >= 2);
    if (S.edit.changed) { $('edTxt').innerHTML = '<b class="chg">Course changed.</b> ' + (ch.length > 2 ? ch.slice(0, 2).join('; ') + ' and ' + (ch.length - 2) + ' more' : ch.join('; ')) + '. ' + (S.routes && S.routes.length ? 'The faded routes are out of date: ' : '') + 'Re-route to update.' + strayLink(); $('edDone').textContent = 'Course list'; $('edDone').disabled = n < 2; $('edUndo').disabled = !S.edit.hist.length; return; }
    $('edDone').textContent = 'Done';
    $('edTxt').innerHTML = S.edit.closed ? 'Tap a mark to name it, set its position or delete it. Tap a leg, then Add a mark here, to add one. Drag a mark to move it. ◇ are My marks: tap one to use it.' + strayLink() :
      n === 0 ? 'Tap the chart to place the start, or a ◇ from My marks.' : n === 1 ? 'Tap to add each mark in order, and the finish last. Tap a mark to edit or delete it.' : n + ' points. Tap to add more, or Done: the last point is the finish.';
    $('edDone').disabled = n < 2; $('edUndo').disabled = !(S.edit.hist.length || (!S.edit.closed && n));
  }
  function editOk(la, lo, nm) {
    if (la < 35.5 || la > 61.5 || lo < -15 || lo > 12) { busy('Outside the routing area: cannot route there.'); setTimeout(function () { busy(''); }, 2500); return false; }
    var inAny = REGIONS.some(function (g) { var b = g.region; return READY[g.id] && la >= b.s && la <= b.n && lo >= b.w && lo <= b.e; });
    if (REGIONS.length && !inAny) { busy('Outside every forecast area (the dashed boxes): Route cannot route there yet.'); setTimeout(function () { busy(''); }, 3500); return false; }   /* any area will do: on saving, Route opens the course on the area that covers it */
    var z = P.depth ? P.depth.nearest('z', la, lo) : NaN; if (z > 0) { busy((nm ? nm + ' is' : 'That is') + ' on land. Choose open water.'); setTimeout(function () { busy(''); }, 4000); return false; }
    return true;
  }
  function editTap(x, y) {
    if ($('markPop') && !$('markPop').hidden) { $('markPop').hidden = true; return; }
    var hit = editHit(x, y); if (hit >= 0) { markCard(hit); return; }
    var mm = myMarkHit(x, y), q, la, lo;
    if (mm) q = { lat: mm.lat, lon: mm.lon, name: mm.name, side: 'port' };
    else { la = LA(y); lo = LO(x); if (!editOk(la, lo)) return; q = { lat: +la.toFixed(5), lon: +lo.toFixed(5) }; }
    var leg = legHit(x, y), p = S.edit.pts;
    if (S.edit.closed && !mm) {   /* an existing course: a tap never adds a mark by itself (Stuart 14 Nov 18:48: taps to move the chart were adding Mark 2, Mark 3 ...) */
      if (leg > 0) { addAsk(x, y, leg, q); return; }
      busy('Tap a leg to add a mark there, or drag a mark to move it.'); setTimeout(function () { busy(''); }, 2200); return;
    }
    editSnap();
    if (leg > 0) p.splice(leg, 0, q); else if (S.edit.closed && p.length >= 2) p.splice(p.length - 1, 0, q); else p.push(q);
    editPrompt(); draw();
  }
  function addAsk(x, y, leg, q) {   /* a small button at the tap: Add a mark here; any other tap closes it */
    var b = $('addPop'); if (!b) { b = document.createElement('button'); b.id = 'addPop'; b.type = 'button'; b.className = 'btn primary'; b.style.cssText = 'position:fixed;z-index:40;transform:translate(-50%,-130%);white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35)'; document.body.appendChild(b); document.addEventListener('pointerdown', function (e) { if (e.target !== b) b.hidden = true; }, true); }
    var r = $('map').getBoundingClientRect(); b.textContent = '＋ Add a mark here'; b.style.left = (r.left + x) + 'px'; b.style.top = (r.top + y) + 'px'; b.hidden = false;
    b.onclick = function (e) { e.stopPropagation(); b.hidden = true; if (!S.edit) return; editSnap(); S.edit.pts.splice(leg, 0, q); editPrompt(); draw(); };
  }
  window.__fsMatrix = function () { if (!S.matrix) return null; return { beaten: S.beaten || [], models: S.matrix.models, ids: S.routes.map(function (r) { return r.id; }), own: S.routes.map(function (r) { return r.r.finish; }), cols: S.matrix.cols, start: S.matrix.start }; };   /* E7: every route sailed in every model, for the automatic tests */
  window.__fsRoutes = function () { return (S.routes || []).map(function (r) { var p = r.r.path, w = 180, iw = 0; p.forEach(function (q, i) { if (q.lo < w) { w = q.lo; iw = i; } }); return { id: r.id, name: r.name, n: p.length, end: [p[p.length - 1].la, p[p.length - 1].lo], west: [p[iw].la, w, iw, p[iw].leg], legs: S.legs && S.legs.map(function (l) { return l.name; }) }; }); };
  window.__fsNear = function (la, lo, r) { var s = S.routes && S.routes[0]; if (!s) return null; return s.r.path.map(function (q, i) { return [i, +q.la.toFixed(3), +q.lo.toFixed(3), q.leg, q.t ? new Date(q.t * 1000).toISOString().slice(5, 16) : '']; }).filter(function (q) { return Math.abs(q[1] - la) < r && Math.abs(q[2] - lo) < r * 1.6; }); };
  window.__fsXY = function (la, lo) { var r = $('map').getBoundingClientRect(); return [r.left + X(lo), r.top + Y(la)]; };   /* for the automatic tests */
  window.__fsLive = function () { return LIVE.calc ? { plan: LIVE.calc.plan, xte: LIVE.calc.xte, ahead: LIVE.calc.ahead, rejoin: LIVE.calc.rejoin } : null; };   /* for the automatic tests */
  window.__fsPlan = function () { if (!S.sel || !S.sel.r) return null; var p = S.sel.r.path; return { T0: T0, name: S.sel.name, path: p.map(function (q) { return [q.la, q.lo, q.leg || 0]; }), ts: tsOf(p) }; };   /* for the automatic tests */
  window.__fsLine = function () { return LIVE.calc && LIVE.calc.pre ? LIVE.calc.pre.line : null; };   /* for the automatic tests */
  window.__fsScr = function (la, lo) { var r = $('map').getBoundingClientRect(), x = X(lo), y = Y(la); if (ORI.ang) { var a = -ORI.ang * R, dx = x - ORI.cx, dy = y - ORI.cy; x = ORI.cx + dx * Math.cos(a) - dy * Math.sin(a); y = ORI.cy + dx * Math.sin(a) + dy * Math.cos(a); } return [r.left + x, r.top + y, ORI.mode, Math.round(ORI.ang)]; };   /* for the automatic tests: where a position shows on a turned chart */
  window.__fsRoutePaths = function () { return { marks: ((meta.course && meta.course.marks) || []).map(function (m) { return { name: m.name, lat: m.lat, lon: m.lon, side: m.side, via: m.via }; }), legs: (S.legs || legsFor(null)).map(function (l) { return { name: l.name, gate: l.gate, point: l.point }; }), routes: (S.routes || []).map(function (s) { return { name: s.name, path: ((s.r && s.r.path) || []).map(function (q) { return { la: q.la, lo: q.lo, leg: q.leg }; }) }; }) }; };   /* for the mark-rounding test */
  window.__fsCourseFull = function () { var t = Date.now(); VIA.key = null; var f = courseFull(meta.course); return { ms: Date.now() - t, pts: f.map(function (q) { return [+q.lat.toFixed(4), +q.lon.toFixed(4), q.via ? (q.auto ? 'auto' : q.must ? 'must' : 'via') : q.name]; }), land: f.slice(1).map(function (b, i) { return crossesLand(f[i], b); }) }; };   /* for the automatic tests */
  window.__navFc = function () { return { P: P, T0: T0, sel: S.sel ? { id: S.sel.id, name: S.sel.name, models: S.sel.models, path: S.sel.r && S.sel.r.path, finish: S.sel.r && S.sel.r.finish, from: S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : null } : null, routes: (S.routes || []).map(function (s) { return { id: s.id, name: s.name, models: s.models }; }), running: !!S.running, ms: selectedModels(), choice: Object.assign({}, S.choice), built: meta && (meta.built || meta.t0), layers: meta && meta.layers, adj: adjVals(), short: short, lname: function (id) { var l = layer(id); return l ? l.name : short(id); } }; };   /* the forecast and routes, for the wind check */
  window.__navPick = function (id) { var r = (S.routes || []).filter(function (s) { return s.id === id; })[0]; if (!r) return false; S.sel = r; ghosts().then(function () { matrix(); plan(); fleetTable(); update(); }); return true; };
  window.__navReroute = function (la, lo) { if (S.running) return 'busy'; var t = (Date.now() / 1000 - T0) / 3600; if (t > HMAX() - 1 || !inData({ lat: la, lon: lo })) return 'outside'; S.from = { lat: la, lon: lo, t: t, gps: true }; run(); return 'ok'; };
  window.__navAdjust = function (wdir, wspd) { [['adjWdir', wdir], ['adjWspd', wspd]].forEach(function (x) { var el = $(x[0]); if (!el) return; el.value = x[1]; if (el.oninput) el.oninput(); }); adjPill(); };
  window.__navCourse = function () { var c = meta && meta.course; if ((S.cleared && !(S.routes && S.routes.length)) || !c || !c.start || !c.finish) return null; return { key: raceKey(), name: c.name, start: { name: c.start.name || 'Start', lat: c.start.lat, lon: c.start.lon }, marks: realMarks(c).map(function (m) { return { name: m.name, lat: m.lat, lon: m.lon, side: m.side || 'port' }; }), finish: { name: c.finish.name || 'Finish', lat: c.finish.lat, lon: c.finish.lon }, tide: $('tideSel') ? $('tideSel').value : '', gun: +$('startSel').value || null }; };   /* the course for the plotter */
  window.__navUp = function (x, y, fn) { upright(x, y, fn); };
  window.__fsLiveFix = function () { return LIVE.on ? LIVE.fix : null; };
  window.__fsAisWarn = function () { return { warned: Object.keys(AIS.warned || {}), own: AIS.own || null }; };   /* F53 test hook */
  /* Mark's test mode (Stuart 17 Nov 05:13): a practice boat feeds the GPS instead of the phone's own; nothing is sent anywhere */
  window.__fsSim = function (on) { if (on) { if (LIVE.watch != null) navigator.geolocation.clearWatch(LIVE.watch); LIVE.watch = null; clearInterval(LIVE.timer); LIVE.timer = null; LIVE.on = true; LIVE.sim = true; LIVE.fix = null; } else if (LIVE.sim) { LIVE.sim = false; liveStop(); } };
  window.__fsSimFix = function (la, lo, kn, cog) { if (!LIVE.sim) return; liveFix({ coords: { latitude: la, longitude: lo, accuracy: 4, speed: kn / 1.94384, heading: cog } }); };
  window.__fsOnLand = function (la, lo) { try { return !!(P && P.depth) && !FSRouter.clearLine(P.depth, 0, la, lo, la, lo); } catch (e) { return false; } };   /* Mark (21:33): a tapped or pinged mark on land is refused */
  window.__fsCog = function () { var t = (LIVE.pbuf || []).filter(function (q) { return Date.now() - q[2] < 15000; }); if (!LIVE.on || t.length < 3) return null; var a = t[0], b = t[t.length - 1], r = rhumb({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }); return r.nm > 0.008 ? r.brg : null; };   /* the course made good over the last 15 seconds, for setting the wind from each tack */
  window.__fsRedraw = function () { draw(); };
  window.__fsOpenTab = function (t) { try { openTab(t); } catch (e) {} };   /* Mark: its tabs live in Route's panel (17 Nov 06:05) */
  window.__fsFit = function () { try { fit(); draw(); } catch (e) {} };
  window.__fsFitBox = function (s, n, w, e, gap) { try { var pw = Math.max(e - w, 0.004), ph = Math.max(n - s, 0.003), mt = 0, hh = H - 120, gy = H / 2; if (gap && gap.b - gap.t > 60) { var mc = $('map'); mt = mc ? mc.getBoundingClientRect().top : 0; hh = gap.b - gap.t - 16; gy = (gap.t + gap.b) / 2 - mt; } view.s = Math.max(20, Math.min(W / (pw * 1.6 * K), hh / (ph * 1.6))); view.lo = (w + e) / 2; view.la = (s + n) / 2 + (gy - H / 2) / view.s; draw(); } catch (x) {} };   /* gap: fit into a strip of the screen (the see-through start screen, 18 Nov) */   /* Mark: zoom into the start line (Stuart 17 Nov 05:49) */   /* Mark: the chart fits the course */
  window.__navFollow = function (on) { if (on == null) return follow; followSet(!!on); };
  window.__navScale = function (nm) { view.s = Math.max(20, Math.min(ZMAX(), H * 0.22 / (nm / 60))); followSet(true); draw(); };   /* the boat and the next mark on screen */
  window.__navPanelMin = function () { if (!wide()) closePanel(); };
  window.__navLiveOn = function (mini) { if (!LIVE.on) liveStart(); if (mini && !LIVE.mini) { LIVE.mini = true; LIVE.big = false; store('fs-livemini', '1'); if (LIVE.fix) liveShow(); } };
  window.__navAisCheck = function (steps) { if (!S.sel) return null; var t0 = S.t, src = AIS.src, n = 0, dry = 0, bad = []; AIS.src = 'test'; AIS.fleet = null; AIS.tg = new FSAIS.Targets(); var a = S.start.t, b = S.sel.r.finish; for (var i = 0; i <= steps; i++) { S.t = a + (b - a) * i / steps; aisEmulate(); Object.keys(AIS.tg.t).forEach(function (m) { var x = AIS.tg.t[m]; if (x.lat == null || x.at < aisNowMs() - 1000) return; n++; if (aisDry(x.lat, x.lon)) { dry++; if (bad.length < 5) bad.push([x.name, x.lat.toFixed(4), x.lon.toFixed(4)]); } }); } S.t = t0; AIS.src = src; AIS.tg = new FSAIS.Targets(); AIS.fleet = null; return { n: n, dry: dry, bad: bad }; };   /* for the automatic tests */
  window.__navViewGet = function () { return { la: view.la, lo: view.lo, s: view.s, follow: follow }; };   /* reopen where it left off */
  window.__navViewSet = function (v) { if (!v || !(v.s > 0)) return; view.la = v.la; view.lo = v.lo; view.s = v.s; if (v.follow != null) followSet(!!v.follow); draw(); };
  window.__navLiveState = function () { return { on: !!LIVE.on, mini: !!LIVE.mini, big: !!LIVE.big }; };
  window.__navLiveRestore = function (st) { if (!st || !st.on || LIVE.on) return; LIVE.mini = !!st.mini; liveStart(); if (st.big) { LIVE.big = true; } };
  window.__navLand = function (la, lo) { return !!coastLand(la, lo); };
  window.__navShowLay = function () { return !!S.show.lay; };
  window.__navXY = function (la, lo) { var r = cv.getBoundingClientRect(); return [r.left + X(lo), r.top + Y(la)]; };   /* for the automatic tests (north up) */   /* Route's Laylines box also switches the plotter's laylines */
  window.__navDry = function (la, lo) { return aisDry(la, lo); };   /* land or under 2 m, for the practice boat */   /* laylines stop at the land */
  window.__navLayers = function (st) { if (!st) return { show: Object.assign({}, S.show), hid: S.routes.map(function (r) { return [r.id, !!r.hidden]; }) }; Object.keys(st.show || {}).forEach(function (k) { S.show[k] = !!st.show[k]; }); if (st.only) S.routes.forEach(function (r) { r.hidden = r !== S.sel; }); else if (st.hid) { var m = {}; st.hid.forEach(function (h) { m[h[0]] = h[1]; }); S.routes.forEach(function (r) { if (r.id in m) r.hidden = m[r.id]; }); } if ($('layers') && !$('layers').hidden) layersPop(); draw(); };   /* Deck and Nav views */
  window.__fsEditDepth = function () { return S.edit ? S.edit.pts.map(function (q) { return [q.name || '', q.lat, q.lon, P.depth ? P.depth.nearest('z', q.lat, q.lon) : null]; }) : null; };   /* for the automatic tests: depth under each point (above 0 is land) */
  window.__fsEditPts = function () { var r = $('map').getBoundingClientRect(); return S.edit ? S.edit.pts.map(function (q) { return [r.left + X(q.lon), r.top + Y(q.lat), q.name || '']; }) : null; };   /* for the automatic tests */
  function editHit(x, y) { var p = S.edit && S.edit.pts, best = -1, bd = 18; if (!p) return -1; p.forEach(function (q, i) { var d = Math.hypot(X(q.lon) - x, Y(q.lat) - y); if (d < bd) { bd = d; best = i; } }); return best; }
  function editDraw() {
    var p = S.edit.pts; if (!p.length) return;
    ctx.save(); ctx.strokeStyle = css['--route']; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 12px Inter, sans-serif';
    p.forEach(function (q, i) { var x = X(q.lon), y = Y(q.lat), on = S.drag === i;
      if (q.via && i > 0 && i < p.length - 1) { ctx.save(); ctx.beginPath(); var r0 = on ? 10 : 8; ctx.moveTo(x, y - r0); ctx.lineTo(x + r0, y); ctx.lineTo(x, y + r0); ctx.lineTo(x - r0, y); ctx.closePath(); ctx.fillStyle = q.must ? css['--route'] : css['--panel']; ctx.fill(); ctx.strokeStyle = css['--route']; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.restore(); ctx.fillStyle = css['--ink']; ctx.fillText(q.name || (q.auto ? 'Waypoint (auto)' : 'Waypoint') + (q.must ? ', routes pass' : ''), x + 12, y - 10); return; }
      ctx.beginPath(); ctx.arc(x, y, on ? 11 : 8, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--route']; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.fillStyle = css['--ink'];
      var lbl = i === 0 ? 'Start' : i === p.length - 1 && (p.length > 1) ? (S.edit.closed ? 'Finish' : 'Finish?') : 'Mark ' + i; ctx.fillText(q.name || lbl, x + 12, y - 10); if (S.edit.closed && i > 0 && i < p.length - 1) sideTag({ side: q.side || 'port' }, x + 12, y - 4); });
    ctx.restore(); legsDraw(p, true);
  }
  function editRead() {   // take what is typed in the list back into the points
    var p = S.edit.pts; if (!$('edName')) return true; var ok = true; S.edit.name = $('edName').value.trim() || 'My course';
    p.forEach(function (q, i) {
      var la = parsePos($('edLa' + i).value, true), lo = parsePos($('edLo' + i).value, false);
      if (isNaN(la) || isNaN(lo)) { ok = false; $('edLa' + i).classList.toggle('bad', isNaN(la)); $('edLo' + i).classList.toggle('bad', isNaN(lo)); return; }
      q.lat = +la.toFixed(5); q.lon = +lo.toFixed(5); q.name = $('edN' + i).value.trim(); if ($('edS' + i) && $('edS' + i).value !== sideVal(q)) sideSet(q, $('edS' + i).value);
    });
    return ok;
  }
  function editForm() {
    S.edit.closed = true; var p = S.edit.pts, h = '<div class="row"><label for="edName">Course name</label><input id="edName" value="' + (S.edit.name || 'My course').replace(/"/g, '&quot;') + '"></div>';
    h += '<p class="note">Positions as on the chart, for example 50°38.24\'N and 1°38.98\'W, or in decimal degrees (50.6373, -1.6497).</p>';
    p.forEach(function (q, i) {
      var kind = i === 0 ? 'Start' : i === p.length - 1 ? 'Finish' : q.via ? 'Waypoint' + (q.auto ? ' (automatic)' : '') : 'Mark ' + i, mid = i > 0 && i < p.length - 1;
      h += '<div class="edpt"><div class="edhd"><b>' + kind + '</b><span class="edbtn">' + (mid ? '<button class="btn" data-up="' + i + '" aria-label="Move up">↑</button><button class="btn" data-dn="' + i + '" aria-label="Move down">↓</button><button class="btn" data-rm="' + i + '" aria-label="Remove ' + kind + '">Remove</button>' : '') + '<button class="btn" data-keep="' + i + '" aria-label="Save ' + kind + ' to My marks" title="Save to My marks">☆</button></span></div>' +
        '<div class="edgrid"><input id="edN' + i + '" placeholder="Name" value="' + (q.name || kind).replace(/"/g, '&quot;') + '"><input id="edLa' + i + '" inputmode="text" aria-label="' + kind + ' latitude" value="' + fmtPos(q.lat, 'NS') + '"><input id="edLo' + i + '" inputmode="text" aria-label="' + kind + ' longitude" value="' + fmtPos(q.lon, 'EW') + '">' +
        (mid ? '<select id="edS' + i + '" aria-label="Mark or waypoint"><option value="port">Mark, leave to port</option><option value="starboard">Mark, leave to starboard</option><option value="via">Waypoint: course line only</option><option value="viamust">Waypoint: routes must pass</option></select>' : '<span></span>') + '</div></div>';
      if (i < p.length - 1) h += '<div class="edleg"><span class="legv">' + legTxt(q, p[i + 1]) + '</span><button class="btn edadd" data-add="' + (i + 1) + '">+ Add a mark here</button>' + (myMarks().length ? '<select class="edpick" data-pick="' + (i + 1) + '" aria-label="Add one of My marks here"><option value="">+ One of My marks…</option>' + myMarks().map(function (m, k) { return '<option value="' + k + '">' + m.name.replace(/</g, '&lt;') + '</option>'; }).join('') + '</select>' : '') + '</div>';
    });
    /* when is the start: the exact class start, asked first so a new course always routes from the right start */
    var cur = $('startSel').value;
    var when = '<div class="edwhen"><b>When is the start?</b>' + startPickerHtml('ed', +cur) + '<p class="note" style="margin:6px 0 0">The exact class start, in UTC: UK time in winter, one hour behind UK summer time. Then Save and route.</p><div id="edFit"></div><input type="hidden" id="edStart" value="' + cur + '"></div>';
    h = when + h;
    var opts = '';
    h += '<p class="note">Starts run to ' + ($('startSel').options.length ? clockAbs(+$('startSel').options[$('startSel').options.length - 1].value) + ' ' + tzS1() : 'the end of the forecast') + ', as far as the forecasts allow the whole race to be routed. For a later race, save the course now and choose the start nearer the day.</p>';
    var mk = myMarks(); if (mk.length) h += '<details class="edmy"><summary>My marks (' + mk.length + ')</summary>' + mk.map(function (m, k) { return '<div class="edmyr"><span><b>' + m.name.replace(/</g, '&lt;') + '</b> ' + fmtPos(m.lat, 'NS') + ' ' + fmtPos(m.lon, 'EW') + '</span><button class="btn" data-mdel="' + k + '" aria-label="Delete ' + m.name.replace(/"/g, '') + ' from My marks">Delete</button></div>'; }).join('') + '<p class="note">Kept on this device. Tap ☆ by any point to add it here.</p></details>';
    h += '<p class="note" id="edNm">' + courseNm({ start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }) + ' nm along the course. Saved on this device under My races.</p><div class="xrow"><button class="btn primary" id="edSave">Save and route</button><button class="btn" id="edMap">Edit on the chart</button><button class="btn" id="edCancel2">Cancel</button></div>';
    $('raceList').innerHTML = '<h3>Course</h3>' + h; $('races').hidden = false; $('editBar').hidden = true;
    var edC = function () { return { start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }; };
    var edFit = function () { var ep = startPickerRead('ed'); if (ep === ep) $('edStart').value = String(ep); if ($('edFit')) $('edFit').innerHTML = ep === ep ? fitHtml(ep, edC()) : ''; };
    if ($('edDay')) { $('edDay').onchange = edFit; $('edTime').oninput = edFit; edFit(); }
    $('raceList').scrollTop = 0;
    p.forEach(function (q, i) { if ($('edS' + i)) $('edS' + i).value = sideVal(q); });
    var redo = function (fn) { if (!editRead()) { busy('Check the positions marked in red.'); setTimeout(function () { busy(''); }, 2000); return; } fn(); editForm(); draw(); };
    [].forEach.call($('raceList').querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { redo(function () { p.splice(+b.dataset.rm, 1); }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-up]'), function (b) { b.onclick = function () { var i = +b.dataset.up; if (i > 1) redo(function () { var t = p[i]; p[i] = p[i - 1]; p[i - 1] = t; }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-dn]'), function (b) { b.onclick = function () { var i = +b.dataset.dn; if (i < p.length - 2) redo(function () { var t = p[i]; p[i] = p[i + 1]; p[i + 1] = t; }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-keep]'), function (b) { b.onclick = function () { if (!editRead()) return; var i = +b.dataset.keep; if (myMarkSave(p[i], p[i].name)) editForm(); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-pick]'), function (b) { b.onchange = function () { if (b.value === '') return; var m = myMarks()[+b.value]; redo(function () { p.splice(+b.dataset.pick, 0, { lat: m.lat, lon: m.lon, name: m.name, side: 'port' }); }); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-mdel]'), function (b) { b.onclick = function () { if (!editRead()) return; var a = myMarks(); a.splice(+b.dataset.mdel, 1); myMarksSet(a); editForm(); draw(); }; });
    [].forEach.call($('raceList').querySelectorAll('[data-add]'), function (b) { b.onclick = function () { redo(function () { var i = +b.dataset.add, a = p[i - 1], c = p[i]; p.splice(i, 0, { lat: +((a.lat + c.lat) / 2).toFixed(5), lon: +((a.lon + c.lon) / 2).toFixed(5), side: 'port' }); }); }; });
    [].forEach.call($('raceList').querySelectorAll('.edgrid input'), function (el) { el.onchange = function () { if (editRead()) { $('edNm').textContent = courseNm({ start: p[0], marks: p.slice(1, -1), finish: p[p.length - 1] }) + ' nm along the course. Saved on this device under My races.'; draw(); } }; });
    $('edMap').onclick = function () { if (!editRead()) return; $('races').hidden = true; $('wizBar').hidden = true; $('editBar').hidden = false; editPrompt(); draw(); };
    $('edCancel2').onclick = function () { S.edit = null; $('races').hidden = true; draw(); };
    $('edSave').onclick = function () {
      if (!editRead()) { busy('Check the positions marked in red.'); setTimeout(function () { busy(''); }, 2000); return; }
      if (p.length < 2) return;
      var bad = p.filter(function (q) { return q.lat < 35.5 || q.lat > 61.5 || q.lon < -15 || q.lon > 12; }); if (bad.length) { busy('Cannot route: a point is outside the routing area.'); setTimeout(function () { busy(''); }, 2500); return; }
      if ($('edDay') && !(startPickerRead('ed') === startPickerRead('ed'))) { busy('Check the start time.'); setTimeout(function () { busy(''); }, 2000); return; }
      editCommit($('edStart').value);
    };
  }
  /* save the edited course and route it from start stv0 (from the course page, or Re-route on the edit bar) */
  function editCommit(stv0) {
      var p = S.edit.pts;
      var pts = p.map(function (q, i) { var mid = i > 0 && i < p.length - 1; if (mid && q.via) return { name: q.name || '', lat: q.lat, lon: q.lon, via: true, must: !!q.must }; return { name: q.name || (i === 0 ? 'Start' : i === p.length - 1 ? 'Finish' : 'Mark ' + i), lat: q.lat, lon: q.lon, side: mid ? (q.side || 'port') : undefined }; });
      var c = { name: S.edit.name || 'My course', start: pts[0], marks: pts.slice(1, -1), finish: pts[pts.length - 1] };
      var base = S.edit.base || null;   /* F101: an edit of a stored race is your version of it (fixed 21 Nov: a new course drawn while your St Malo was open had been filed as your St Malo) */
      var stv = stv0, keepId = S.myId, later = beyond(+stv); if (later) { stv = String((startRange() || [0, 0])[1]); } S.edit = null; applyCourseObj(asRace(c, keepId || undefined)); S.myId = keepId; setStart(+stv); var rec = saveMyRace(c.name); if (base) { var ya = myRaces(); ya.forEach(function (x) { if (x.id === rec.id) { x.raceId = base.id; x.baseSig = courseSig(base); } else if (x.raceId === base.id) x.raceId = null; }); setMyRaces(ya); if (BC.push) BC.push(); rec = yourVersion(base.id) || rec; S.yours = { race: base, rec: rec }; } startChosen(); S.newDone = true; meta.course.race.id = rec.id; if (later) { futureSet(+stv0); chipStart(); } else futureDrop();
      $('races').hidden = true; busy('Saved under My races. Routing ' + c.name + ' from ' + clockAbs(+stv) + ' UTC…');
      var issue = courseIssue(meta.course), reg = issue ? regionFor(c) : null;
      if (reg && reg.id !== HERE) {   /* outside this page's forecasts but inside a whole-area page: keep the course there and open it */
        var all = myRaces(); all.forEach(function (x) { if (x.id === rec.id) x.page = reg.id; }); setMyRaces(all);
        if (WIZ.on || S.drawnNew) { var nw = S.drawnNew; WIZ.on = true; WIZ.step = nw ? 1 : 4; wizSave(); }   /* a new course carries on through the set-up on the area that routes it */
        busy('Opening ' + c.name + ' on the ' + reg.name + ' forecasts…'); location.href = '../' + reg.id + '/?my=' + encodeURIComponent(rec.id); return;
      }
      if (issue) { busy(''); openTab('decision'); $('runNote').textContent = issue + (reg ? '' : ' No forecast area covers the whole course yet.'); } else { if ((WIZ.on || S.drawnNew) && wizCourseChosen(true)) { busy(''); return; } S.from = null; run(); }   /* only a new course, or one changed during the set-up, goes back to the set-up card; Re-route and Save and route on a course already set up route at once (Stuart 14 Nov: turning a mark into a waypoint and tapping Re-route did nothing) */
  }
  /* routes that run along the edge of the forecast area are being stopped by the edge, not the weather: say so (Stuart 12 Nov) */
  function edgeHit() {
    var L = (meta.layers || []).filter(function (l) { return l.kind === 'wind' && l.full && l.full.lat0 != null; })[0]; if (!L || !S.routes) return '';
    var f = L.full, s = f.lat0, n = f.lat0 + f.dlat * (f.ny - 1), w = f.lon0, e = f.lon0 + f.dlon * (f.nx - 1), mla = 2.5 / 60, mlo = mla / Math.cos((s + n) / 2 * Math.PI / 180), hit = '';
    S.routes.forEach(function (r) { var k = 0, side = ''; (r.r.path || []).forEach(function (q) { var la = q.la, lo = q.lo; var sd = la - s < mla ? 'south' : n - la < mla ? 'north' : lo - w < mlo ? 'west' : e - lo < mlo ? 'east' : ''; if (sd) { k++; side = sd; } }); if (k >= 4 && !hit) hit = side; });
    return hit ? 'Warning: routes run along the ' + hit + ' edge of this forecast area (' + (hit === 'south' ? dm(s, 'NS') : hit === 'north' ? dm(n, 'NS') : hit === 'west' ? dm(w, 'EW') : dm(e, 'EW')) + '). The best route probably lies outside it, so treat these routes with care.' : '';
  }
  /* the set-up card (Stuart 12 Nov, wireframe A): Course, Boat, Start, Forecasts, each ticked or flagged, and one Route button */
  function setupRows() {
    var c = meta.course, rows = [], iss = courseIssue(c);
    rows.push({ k: 'course', t: 'Course', ok: !iss, s: iss ? iss : c.name + ' · ' + courseNm(c) + ' nm · ' + realMarks(c).length + ' mark' + (realMarks(c).length === 1 ? '' : 's') });
    var bs = boatIsSet(); rows.push({ k: 'boat', t: 'Boat', ok: bs, s: bs ? ($('boatName').value || 'My boat') + ' · TCC ' + (+$('tcc').value || 1).toFixed(3) + ' · ' + ($('boatType').selectedOptions[0] ? $('boatType').selectedOptions[0].textContent.split(',')[0] : '') + (function () { var n = ($('sails').value || '').split('\n').filter(function (l) { return l.trim() && !/^\s*#/.test(l); }).length; return n ? ' · ' + n + ' sail' + (n === 1 ? '' : 's') + ($('mains') && !/no reefs/.test($('mains').value) ? ', reefs set' : '') : ''; })() : 'Set up your boat: name, type and TCC' });
    var fu = futureGet(), st = +$('startSel').value, chosen = S.startChosen || store('fs-autostart') === '1';
    rows.push({ k: 'start', t: 'Start', ok: chosen && !fu, s: fu ? clockAbs(fu.ep) + ' ' + tzS1() + ': beyond the forecasts' : chosen && st ? clockAbs(st) + ' ' + tzS1() : 'Choose your class start (UTC)' });
    var ms = cardModels(), est = (st ? (st - T0) / 3600 : 0) + courseNm(c) / (5.5 * (+$('tcc').value || 1)), cover = ms.filter(function (id) { var L = layer(id), v = L && (L[S.loaded[id] || 'full'] || L.full), h = v && v.hours; return h && h.length && h[h.length - 1] >= est; }).length;
    rows.push({ k: 'fc', t: 'Forecasts', ok: ms.length > 0 && cover > 0, s: !ms.length ? 'Tick at least one forecast model' : ms.length + ' model' + (ms.length === 1 ? '' : 's') + ' · ' + (cover === ms.length ? 'all reach the finish' : cover ? cover + ' reach the finish, the rest hand over' : 'none reaches the finish') + (olderModels().length ? ' · ' + olderModels().length + ' on an older run' : '') });
    return rows;
  }
  /* the set-up card is the one place to set up a race (Stuart 12 Nov): the old steps open only for the single item tapped, then come back here */
  function showCard() {
    WIZ.on = false; S.wizHold = false; S.card = false; if ($('wiz')) $('wiz').hidden = true; if ($('wizBar')) $('wizBar').hidden = true; if ($('races')) $('races').hidden = true; wizSave();
    S.suOpen = true; openTab('decision'); setupRender(); var el = $('setupCard'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }
  function afterCard() { try { var rows = setupRows(); if (rows.every(function (r) { return r.ok; })) { S.suOpen = false; S.from = null; S.preBad = true; S.routes = []; run(); } else setupRender(); } catch (e) {} }   /* all four ready: route straight away */
  /* Boat and Forecasts open the full Settings tab (Stuart 12 Nov); closing Settings comes back to the set-up card */
  function cardSettings(tab) {
    S.card = tab; $('setBtn').click(); var t = document.querySelector('.stabs .tab[data-s="' + tab + '"]'); if (t) t.click();
    var d = $('setDone'); if (d) { d.hidden = false; d.textContent = tab === 'boat' ? 'Done: save the boat and back to set-up' : 'Done: back to set-up'; }
  }
  function cardSettingsClosed() {
    var tab = S.card; if (tab !== 'boat' && tab !== 'fc') return; S.card = false; if ($('setDone')) $('setDone').hidden = true;
    if (tab === 'boat') { var tc = +$('tcc').value; if (tc >= 0.7 && tc <= 2.2) { if (!$('boatName').value.trim()) $('boatName').value = 'My boat'; $('boatSave').click(); store('fs-boatset', '1'); store('fs-wizdone', '1'); } }
    setTimeout(function () { showCard(); if (!S.running && !(S.routes && S.routes.length)) afterCard(); }, 50);
  }
  function cardStep(n) { S.card = true; WIZ.on = true; S.wizHold = true; wizShow(n); $('wizH').textContent = n === 1 ? 'Your boat' : 'The start'; $('wizDots').innerHTML = ''; $('wizNext').textContent = 'Done'; $('wizBack').hidden = true; }   /* one item from the set-up card: no step numbers */
  function setupRender() {
    try { coverRender(); } catch (e) {}
    var el = $('setupCard'); if (!el || !meta) return; var rows; try { rows = setupRows(); } catch (e) { return; }
    var ready = rows.filter(function (r) { return r.ok; }).length, all = ready === rows.length, has = S.routes && S.routes.length;
    var open = S.suOpen || !all || !has;   /* routed and all ready: one line, tap to open */
    if (!open) { el.innerHTML = '<button class="srow" id="suOpen"><span class="sic">✓</span><span class="stx"><b>Set-up: all 4 ready</b><span>' + wizEsc(rows.map(function (r) { return r.s.split(' · ')[0]; }).join(' · ')) + '</span></span><span class="sgo">Show</span></button>'; $('suOpen').onclick = function () { S.suOpen = true; setupRender(); }; return; }
    el.innerHTML = '<div class="shd"><b>Race set-up</b><span>' + ready + ' of 4 ready' + (all && has ? ' · <a href="#" id="suHide">Hide</a>' : '') + '</span></div>' + rows.map(function (r) { return '<button class="srow' + (r.ok ? '' : ' warn') + '" data-su="' + r.k + '"><span class="sic">' + (r.ok ? '✓' : '!') + '</span><span class="stx"><b>' + r.t + '</b><span>' + wizEsc(r.s) + '</span></span><span class="sgo">' + (r.ok ? 'Change' : 'Set') + '</span></button>'; }).join('') +
      '<button class="sroute" id="suRoute"' + (all ? '' : ' disabled') + '>' + (all ? (has ? 'Route again' : 'Route') : 'Route (' + rows.filter(function (r) { return !r.ok; }).map(function (r) { return r.t.toLowerCase(); }).join(', ') + ' first)') + '</button>';
    [].forEach.call(el.querySelectorAll('[data-su]'), function (b) { b.onclick = function (ev) { var k = b.dataset.su;
      if (k === 'course') { if (ev) ev.stopPropagation(); $('raceMenu').hidden = true; $('raceBtn').onclick({ stopPropagation: function () {} }); }   /* the tap must not reach the page, which closes the menu */
      else if (k === 'boat') cardSettings('boat');
      else if (k === 'start') cardStep(3);
      else cardSettings('fc'); }; });
    $('suRoute').onclick = function () { S.suOpen = false; S.from = null; S.preBad = true; S.routes = []; userRun(); };
    if ($('suHide')) $('suHide').onclick = function (e) { e.preventDefault(); S.suOpen = false; setupRender(); };
  }
  /* how far each forecast reaches against the race (wireframe A4): a bar per wind model from the start, the white tick the estimated finish */
  function coverRender() {
    var el = $('fcCover'); if (!el || !meta || !meta.course) return;
    var st = +$('startSel').value; if (!st) { el.innerHTML = ''; return; }
    var s0 = (st - T0) / 3600, est = courseNm(meta.course) / (5.5 * (+$('tcc').value || 1)), fin = s0 + est, ms = cardModels();
    var L = (meta.layers || []).filter(function (l) { return l.kind === 'wind'; }).map(function (l) { var v = l[S.loaded[l.id] || 'full'] || l.full, h = v && v.hours; return { l: l, end: h && h.length ? h[h.length - 1] : 0 }; });
    if (!L.length) { el.innerHTML = ''; return; }
    var span = Math.max(est * 1.15, Math.max.apply(null, L.map(function (x) { return x.end - s0; }))), pc = function (h) { return Math.max(0, Math.min(100, h / span * 100)); }, tick = pc(est);
    var rows = L.map(function (x) {
      var on = ms.indexOf(x.l.id) >= 0, have = Math.max(0, x.end - s0), all = x.end >= fin;
      return '<div class="cvr' + (on ? '' : ' off') + '"><span class="cvn">' + wizEsc(short(x.l.id)) + (x.l.latest === false ? ' <b class="cvold" title="Older run: the newest was not ready">!</b>' : x.l.latest === true ? ' <span class="cvnew" title="Newest run">' + THUMB + '</span>' : '') + '</span>' +
        '<span class="cvb"><span class="cvf ' + (all ? 'all' : have > 0 ? 'part' : 'none') + '" style="width:' + pc(have).toFixed(1) + '%"></span><span class="cvt" style="left:' + tick.toFixed(1) + '%"></span></span><span class="cvh">' + Math.round(have) + ' h</span></div>';
    }).join('');
    el.innerHTML = '<h3>How far each forecast reaches</h3><p class="note">From your start, ' + clockAbs(st) + ' ' + tzS1() + '. The white tick is the estimated finish, about ' + Math.round(est) + ' h at TCC ' + (+$('tcc').value || 1).toFixed(3) + '. Green covers the race; amber stops short, and the longer forecasts take over. Faint: not ticked below.</p>' + rows;
  }
  document.addEventListener('change', function (e) { if (e.target && (e.target.matches('[data-m]') || e.target.id === 'startSel' || e.target.id === 'tcc')) coverRender(); });
  /* after routing: can you trust it? (Stuart 12 Nov) */
  function checksRender() {
    var el = $('checks'); if (!el) return; if (!S.routes || !S.routes.length) { el.innerHTML = ''; return; }
    var ck = [], part = S.routes.filter(function (s) { return s.r.partial; }).length;
    ck.push(part ? [0, 'The forecasts end before the finish on ' + (part === S.routes.length ? 'every route' : part + ' of ' + S.routes.length + ' routes') + ': choose an earlier start or longer models'] : [1, 'Every model used reaches the finish']);
    var edge = edgeHit(); ck.push(edge ? [0, 'Routes run along the edge of the forecast area: the best route may lie outside it'] : [1, 'Course and routes inside the forecast area, clear of its edges']);
    var own = S.routes.filter(function (s) { return !s.r.partial && !s.combined && s.id !== 'chain'; }).map(function (s) { return s.r.finish; });
    if (own.length > 1) { var sp = Math.max.apply(null, own) - Math.min.apply(null, own), dur = Math.min.apply(null, own) - (S.start ? S.start.t : 0); ck.push(sp > Math.max(1, dur * 0.08) ? [0, 'Models disagree by ' + fmtH(sp) + ' on the finish: compare the routes before you commit'] : [1, 'Models agree within ' + fmtH(sp) + ' on the finish']); }
    ck.push([1, 'Boat: ' + ($('boatName').value || 'My boat') + ', TCC ' + (+$('tcc').value || 1).toFixed(3) + ', sailing at ' + Math.round((+$('tuUp').value + +$('tuReach').value + +$('tuRun').value) / 3 || 100) + '% of the polar']);
    var om = olderModels(); if (om.length) ck.push([0, om.join(', ') + (om.length === 1 ? ' is' : ' are') + ' on an older run: the newest was not ready. Compare with the newest models before you commit']);
    ck.push(nextMeta || S.sessStale ? [0, 'A newer forecast is out: Route again to use it'] : [1, 'Forecast build ' + (meta.run || '') + ', the newest on the server']);
    el.innerHTML = '<h4>Can you trust it?</h4>' + ck.map(function (c) { return '<div class="ck' + (c[0] ? '' : ' w') + '"><i>' + (c[0] ? '✓' : '!') + '</i><span>' + wizEsc(c[1]) + '</span></div>'; }).join('');
  }
  /* the set-up card and coverage bars: before the forecasts finish downloading the tick list is empty, so use the standard set (Stuart 12 Nov) */
  function cardModels() { if ($('models') && $('models').children.length) return selectedModels(); return (meta.layers || []).filter(function (l) { return l.kind === 'wind' && l.id !== 'mog' && l.id !== 'arpege'; }).map(function (l) { return l.id; }); }
  function selectedModels() { return [].slice.call(document.querySelectorAll('[data-m]')).filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.getAttribute('data-m'); }); }

  /* ---------- real time now (Stuart 12 Nov): UTC, local at a chosen offset, and race time from the class start ---------- */
  (function () {
    var off = (function () { var v = store('fs-tz'); return v != null && v !== '' && !isNaN(+v) ? +v : -new Date().getTimezoneOffset() / 60; })();
    var p2 = function (n) { return ('0' + n).slice(-2); }, hm = function (m) { m = Math.max(0, Math.floor(m)); return Math.floor(m / 60) + 'h ' + p2(m % 60); };
    function tick() {
      if (!$('tzUtc')) return; var now = Date.now(), d = new Date(now), l = new Date(now + off * 3600000);
      $('tzUtc').textContent = p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds());
      $('tzOff').textContent = 'UTC' + (off >= 0 ? '+' : '−') + Math.abs(off); $('tzLoc').textContent = p2(l.getUTCHours()) + ':' + p2(l.getUTCMinutes());
      var st = $('startSel') ? +$('startSel').value : 0, fu = null; try { fu = meta ? futureGet() : null; } catch (e) {} if (fu && fu.ep) st = fu.ep;
      if (!st) { $('tzRace').innerHTML = ''; return; }
      var sec = Math.round(st - now / 1000);
      if ((sec < -600) !== !!S.chipPast) { S.chipPast = sec < -600; try { chipStart(); } catch (e) {} }   /* the START chip turns to Started once the gun is 10 min gone (13, Stuart 20 Nov 15:59) */
      try { if (LIVE.on && LIVE.fix && LIVE.calc && LIVE.calc.pre) { LIVE.calc = liveCalc(LIVE.fix); liveShow(); } } catch (e) {}   /* the GPS countdown ticks every second, between fixes too */
      var nar = innerWidth <= 520; $('tzRace').innerHTML = sec > 0 ? (nar ? 'Start ' : 'Start in ') + '<b' + (sec <= 600 ? ' class="soon"' : '') + '>' + (sec <= 600 ? Math.floor(sec / 60) + ':' + p2(sec % 60) : sec < 86400 ? hm(sec / 60) : Math.floor(sec / 86400) + 'd ' + hm((sec % 86400) / 60)) + '</b>' : 'Race <b>' + hm(-sec / 60) + '</b>';
    }
    function set(v) { off = Math.max(-12, Math.min(14, v)); store('fs-tz', String(off)); tick(); }
    if ($('tzMinus')) { $('tzMinus').onclick = function () { set(off - 1); }; $('tzPlus').onclick = function () { set(off + 1); }; }
    tick(); setInterval(tick, 1000);
  })();
  /* ---------- Live GPS (Stuart 12 Nov): the boat from this phone's GPS against the chosen route; how far off, ahead or behind, the way back ---------- */
  var LIVE = { mini: store('fs-livemini') === '1', on: false, watch: null, timer: null, fix: null, trail: (function () { try { var a = JSON.parse(store('fs-livetrail') || '[]'); return a.filter(function (q) { return Date.now() - q[2] < 24 * 3600000; }); } catch (e) { return []; } })(), wake: null, big: false, alarm: false, calc: null };
  /* dead reckoning when the GPS is lost (Stuart 15 Nov 2026, 09:13: "quite an important feature"): on by default */
  function drOn() { return !$('drOn') || $('drOn').checked; }
  function drPct() { var v = $('drPct') ? +$('drPct').value : 10; return (v >= 5 && v <= 25 ? v : 10) / 100; }   /* Stuart 15 Nov H Q&A: the growth of the circle of doubt is a setting, 5 to 25% */
  (function () { var e = $('drPct'); if (!e) return; var v = store('fs-drPct'); if (v != null) e.value = v; var f = function () { $('drPctV').textContent = e.value + '%'; }; f(); e.oninput = function () { store('fs-drPct', e.value); f(); }; })();
  (function () { var v = store('fs-drOn'); if ($('drOn')) { if (v != null) $('drOn').checked = v === '1'; $('drOn').onchange = function () { store('fs-drOn', $('drOn').checked ? '1' : '0'); if (!$('drOn').checked && LIVE.fix && LIVE.fix.dr) drEnd(null); }; } })();
  function liveSet() { ['gpsMode', 'xteLim', 'behLim'].forEach(function (id) { var v = store('fs-' + id); if (v != null && $(id)) $(id).value = v; $(id).onchange = function () { store('fs-' + id, $(id).value); if (id === 'gpsMode' && LIVE.on) { liveStop(true); liveStart(); } }; }); var ls = store('fs-liveSound'); if (ls != null) $('liveSound').checked = ls === '1'; $('liveSound').onchange = function () { store('fs-liveSound', this.checked ? '1' : '0'); }; }
  /* Keep the screen on (Stuart 21 Nov 00:04: "why can't you stop and change clear screen settings on all tools?"): one setting in Settings,
     Display, for all four tools. Always (the default), While the GPS is on, or Off. The Android apps switch the phone's own screen-on
     (NativeLink.keepOn); a browser holds a screen wake lock while the page is in view. */
  function keepMode() { var v = store('fs-keepon'); return v === 'always' || v === 'off' ? v : 'gps'; }   /* F102 (Stuart 21 Nov 14:15, A): the default is While the GPS is on, so the screen sleeps when you are not navigating */
  function keepApply() { var m = keepMode(), on = m === 'always' || (m === 'gps' && !!LIVE.on);
    try { if (window.NativeLink && window.NativeLink.keepOn) { window.NativeLink.keepOn(on); return; } } catch (e) {}
    try { if (on && navigator.wakeLock && !LIVE.wake && !LIVE.wakeAsk && document.visibilityState === 'visible') { LIVE.wakeAsk = true; navigator.wakeLock.request('screen').then(function (w) { LIVE.wakeAsk = false; if (keepMode() === 'off' || (keepMode() === 'gps' && !LIVE.on)) { w.release(); return; } LIVE.wake = w; w.addEventListener('release', function () { LIVE.wake = null; }); }).catch(function () { LIVE.wakeAsk = false; }); } else if (!on && LIVE.wake) { LIVE.wake.release(); LIVE.wake = null; } } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') keepApply(); });
  /* F102 (Stuart 21 Nov 14:15, A): what keeps a tool working when it is not in front (the Android apps ask this as they go to the
     background): the GPS on, the boat's instruments arriving, or a gun within 20 minutes. Otherwise the app pauses completely. */
  window.__fsBusyBg = function () { try { var g = window.__fsGunAt && window.__fsGunAt(), now = Date.now() / 1000; return !!(LIVE.on || (window.__navRx && window.__navRx()) || (g && g > now - 600 && g < now + 1200)); } catch (e) { return true; } };
  /* Low battery (F102): on the battery, not charging, below 20%, with the GPS on or boat data arriving (Stuart 21 Nov 15:16, option 3a), a note offers Save battery (GPS every 20 seconds, the
     screen sleeps, the Battery saver's lighter drawing). It is offered, never switched by itself: the GPS accuracy is a safety matter
     (standing order, 21 Nov 13:11). At most once an hour. Where the phone reports its battery (Android, the Route+ and Mark+ apps). */
  (function () { if (!navigator.getBattery) return; var told = 0;
    var offer = function (pc) { var n = $('battNote'); if (!n) { n = document.createElement('div'); n.id = 'battNote'; n.className = 'navtoast battnote'; n.setAttribute('role', 'alert'); document.body.appendChild(n); }
      var rxl = false; try { rxl = !!(window.__navRx && window.__navRx()); } catch (e) {} n.innerHTML = '<span>Battery ' + pc + '% and not charging. Save battery: ' + (LIVE.on ? 'GPS every 20 seconds, ' : '') + 'the screen sleeps, lighter drawing.' + (rxl ? ' The boat link and the log carry on.' : '') + '</span><span class="xrow"><button type="button" class="btn primary" id="battYes">Save battery</button><button type="button" class="btn" id="battNo">Not now</button></span>'; n.hidden = false; n.style.pointerEvents = 'auto';
      $('battNo').onclick = function () { n.hidden = true; };
      $('battYes').onclick = function () { n.hidden = true; var gm = $('gpsMode'); if (gm) { gm.value = 'battery'; gm.dispatchEvent(new Event('change', { bubbles: true })); } store('fs-keepon', 'off'); if ($('keepOn')) $('keepOn').value = 'off'; keepApply(); try { if (window.FSSaver) FSSaver.set(true); } catch (e) {} if (LIVE.on) { liveStop(); liveStart(); } try { window.NavToast('Saving battery: GPS every 20 seconds. Change it back in Settings.'); } catch (e) {} };
      clearTimeout(n._t); n._t = setTimeout(function () { n.hidden = true; }, 60000); };
    navigator.getBattery().then(function (bt) { var chk = function () { var rx = false; try { rx = !!(window.__navRx && window.__navRx()); } catch (e) {} if (bt.charging || !(bt.level <= 0.2) || !(LIVE.on || rx) || Date.now() - told < 3600000) return; if ($('gpsMode') && $('gpsMode').value === 'battery') return; told = Date.now(); offer(Math.round(bt.level * 100)); };
      ['levelchange', 'chargingchange'].forEach(function (k) { bt.addEventListener(k, chk); }); setInterval(chk, 60000); chk(); }).catch(function () {}); })();
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { if (!LIVE.wake && keepMode() !== 'off') keepApply(); }, { passive: true }); });   /* a browser grants the wake lock after a tap */
  (function () { var k = $('keepOn'); if (k) { k.value = keepMode(); k.onchange = function () { store('fs-keepon', k.value); keepApply(); }; } setTimeout(keepApply, 500); })();
  function liveWake() { keepApply(); }   /* F102 (21 Nov, found by tests/battery.js): one place holds the screen on; liveWake also asked for its own wake lock, so with the GPS on the screen was held twice and letting it sleep released only one */
  document.addEventListener('visibilitychange', function () { if (!document.hidden) liveWake(); });
  function liveStart() {
    if (LIVE.sim) return;   /* Mark's test mode: the practice boat is the GPS */
    if (!navigator.geolocation) { busy('This device has no GPS that Route can use.'); setTimeout(function () { busy(''); }, 3000); return; }
    LIVE.on = true; $('liveBtn').setAttribute('aria-pressed', 'true'); $('liveBox').hidden = false; $('liveBox').innerHTML = '<div class="lvl">Finding the boat by GPS…</div>'; liveWake();
    try { if (!LIVE.ac && (window.AudioContext || window.webkitAudioContext)) LIVE.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}   /* made on the tap, so the alert can sound later */
    var ok = function (g) { liveFix(g); }, bad = function (e) { if ($('liveBox').hidden) return; if (!(e && e.code === 1) && LIVE.fix && !LIVE.fix.dr && Date.now() - LIVE.fix.at < 30000) return;   /* Stuart 17 Nov 05:20, the green GPS pill flashing: a passing GPS error between good fixes no longer replaces the figures; lost only after 30 s without a fix */ var msg = e && e.code === 1 ? 'Location is not allowed for Route. Allow it for this site in the browser or phone settings, then tap GPS again.' : LIVE.fix ? 'GPS fix lost. Trying again.' : (/Mobi|Android|iPhone|iPad/.test(navigator.userAgent) ? 'No GPS fix yet. Offshore the first fix can take a minute or two. Trying again.' : 'This computer cannot find its position. A computer without GPS works out where it is from nearby Wi-Fi, which is not there at sea. Use Live GPS on a phone or tablet with GPS.');
      $('liveBox').innerHTML = '<div class="lvl lvwarn">' + msg + '</div><div class="lvx"><button class="btn" id="lvStop">Stop GPS</button></div>'; $('lvStop').onclick = function () { liveStop(); }; LIVE.err = msg; stripShow(); };
    if ($('gpsMode').value === 'battery') { var poll = function () { navigator.geolocation.getCurrentPosition(ok, bad, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }); }; poll(); LIVE.timer = setInterval(poll, 20000); }
    else LIVE.watch = navigator.geolocation.watchPosition(ok, bad, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    /* Stuart 17 Nov 14:53, Mark+: "gps lozenge does not appear unless you turn GPS off and on". Turned back on as the app opens, the first
       request can go in before the phone has granted location, and then no fix ever comes. With no fix 8 s on, ask again, as turning the GPS
       off and on did, up to six times. */
    clearTimeout(LIVE.kick); var tries = 0, t0k = Date.now(), kick = function () { if (!LIVE.on || LIVE.sim) return; var f = LIVE.fix; if (f && !f.dr && f.at > t0k) return; if (++tries > 6) return;
      try { if (LIVE.watch != null) { navigator.geolocation.clearWatch(LIVE.watch); LIVE.watch = navigator.geolocation.watchPosition(ok, bad, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }); } else navigator.geolocation.getCurrentPosition(ok, bad, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }); } catch (e) {}
      LIVE.kick = setTimeout(kick, 8000); };
    LIVE.kick = setTimeout(kick, 8000);
    clearInterval(LIVE.drTimer); LIVE.drTimer = setInterval(drTick, 1000);
    /* reopened at sea (Stuart 15 Nov, I): the last good fix was kept on the phone, so if the GPS does not answer the reckoning carries
       on from it, counting from when it was taken. Only within DR_KEEP of that fix, so a phone opened ashore next day starts clean. */
    if (!LIVE.real) try { var kr = JSON.parse(store('fs-livereal') || 'null'); if (kr && kr.la === kr.la && Date.now() - kr.at < DR_KEEP && Date.now() >= kr.at) { kr.kept = true; LIVE.real = kr; } } catch (e) {}
  }
  var DR_KEEP = 30 * 60000;
  function realKeep() { var f = LIVE.real; if (LIVE.on && f && !f.kept) store('fs-livereal', JSON.stringify({ la: f.la, lo: f.lo, at: f.at, acc: f.acc, sog: f.sog, cog: f.cog })); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) realKeep(); }); window.addEventListener('pagehide', realKeep);   /* closing keeps the very last fix */
  function liveStop(keep) { clearTimeout(LIVE.kick);
    if (LIVE.watch != null) navigator.geolocation.clearWatch(LIVE.watch); LIVE.watch = null; clearInterval(LIVE.timer); LIVE.timer = null; clearInterval(LIVE.drTimer); LIVE.drTimer = null; LIVE.real = null; LIVE.drTrack = [];
    if (LIVE.wake) { try { LIVE.wake.release(); } catch (e) {} LIVE.wake = null; }
    if (keep) return; store('fs-livereal', ''); LIVE.on = false; LIVE.fix = null;   /* GPS stopped on purpose: no reckoning from that fix later */ LIVE.big = false; $('liveBtn').setAttribute('aria-pressed', 'false'); $('liveBox').hidden = true; $('liveBig').hidden = true; LIVE.err = null; if ($('gpsMenu')) $('gpsMenu').hidden = true; stripShow(); draw();
  }
  function liveFix(g) {
    var c = g.coords, f = { la: c.latitude, lo: c.longitude, acc: c.accuracy, at: Date.now(), sog: c.speed != null && c.speed >= 0 ? c.speed * 1.94384 : null, cog: c.heading != null && c.heading === c.heading && c.heading >= 0 ? c.heading : null }, pv = LIVE.fix;
    if (pv && (f.sog == null || f.cog == null)) { var r = rhumb({ lat: pv.la, lon: pv.lo }, { lat: f.la, lon: f.lo }), dtH = (f.at - pv.at) / 3600000; if (dtH > 2 / 3600 && r.nm > 0.005 && r.nm / dtH < 40) { if (f.sog == null) f.sog = r.nm / dtH; if (f.cog == null) f.cog = r.brg; } }   /* a GPS jump is not boat speed */
    if (f.sog != null && f.sog > 40) f.sog = null;
    if (pv && pv.dr) { pv = LIVE.real; if (pv && (f.sog == null || f.cog == null)) { var r2 = rhumb({ lat: pv.la, lon: pv.lo }, { lat: f.la, lon: f.lo }), dt2 = (f.at - pv.at) / 3600000; if (dt2 > 0 && r2.nm / dt2 < 40) { if (f.sog == null) f.sog = r2.nm / dt2; if (f.cog == null) f.cog = r2.brg; } } if (f.acc <= 150) drEnd(f); }
    if (f.acc <= 150) { LIVE.real = f; if (!LIVE.realSaved || f.at - LIVE.realSaved > 5000) { LIVE.realSaved = f.at; store('fs-livereal', JSON.stringify({ la: f.la, lo: f.lo, at: f.at, acc: f.acc, sog: f.sog, cog: f.cog })); } }
    LIVE.err = null; LIVE.fix = f; if (f.acc <= 50) { (LIVE.pbuf = (LIVE.pbuf || []).filter(function (q) { return f.at - q[2] < 30000; })).push([f.la, f.lo, f.at]); }   /* the last 30 seconds of good fixes, for the course made good */
    if (f.acc > 150) { LIVE.calc = null; liveShow(); draw(); return; }   /* rough network position: no tail, no plan sums */
    /* the long tail: a point every 10 s (or 50 m), about 8 hours, kept on the phone so it survives closing Route */
    var lt = LIVE.trail[LIVE.trail.length - 1];
    if (!lt || f.at - lt[2] >= 10000 || rhumb({ lat: lt[0], lon: lt[1] }, { lat: f.la, lon: f.lo }).nm > 0.027) { LIVE.trail.push([+f.la.toFixed(5), +f.lo.toFixed(5), f.at, f.sog != null ? +f.sog.toFixed(1) : null, f.cog != null ? Math.round(f.cog) : null]); if (LIVE.trail.length > 3000) LIVE.trail.shift();
      if (!LIVE.saved || f.at - LIVE.saved > 60000) { LIVE.saved = f.at; store('fs-livetrail', JSON.stringify(LIVE.trail)); } }
    try { LIVE.calc = liveCalc(f); } catch (e) { LIVE.calc = null; } liveShow(); followBoat(); draw();
  }
  /* ---- dead reckoning: no GPS fix for DRT seconds, so the boat carries on from the last good fix ----
     Velocity: Route+'s instruments (true heading and log speed, window.__navDR) with the forecast tidal stream added, while they
     are fresh; otherwise the last course and speed over the ground from the GPS (which already includes the tide). The circle of
     doubt grows with the distance run: 0.05 nm plus a share of it, 10% unless set otherwise in the Course tab (5 to 25%). Nothing is added to the GPS trail; the reckoned track is kept apart. */
  function drAfter() { return ($('gpsMode') && $('gpsMode').value === 'battery' ? 45 : 10) * 1000; }
  function drVel(la, lo) {
    var nv = null; try { nv = window.__navDR ? window.__navDR() : null; } catch (e) {}
    if (nv && nv.bsp >= 0 && nv.hdg === nv.hdg) {
      var tu = 0, tv = 0, src = 'boat heading and log';
      try { var ts = $('tideSel') && $('tideSel').value; if (ts && P.tide[ts]) { var td = FSRouter.tideSampler(P, ts)(la, lo, (Date.now() / 1000 - T0) / 3600); if (td && td[0] === td[0]) { tu = td[0]; tv = td[1]; src += ' plus forecast tide'; } } } catch (e) {}
      var vx = nv.bsp * Math.sin(nv.hdg * R) + tu, vy = nv.bsp * Math.cos(nv.hdg * R) + tv;
      return { sog: Math.hypot(vx, vy), cog: (Math.atan2(vx, vy) / R + 360) % 360, src: src };
    }
    var r = LIVE.real; if (r && r.sog != null && r.cog != null) return { sog: r.sog, cog: r.cog, src: 'last GPS course and speed' };
    return null;
  }
  /* a Mac or PC has no GPS: its Wi-Fi position comes every half minute or so, and each gap started and ended the reckoning with a beep
     (Stuart 16 Nov 15:47: "route on mac is giving two beeps every 30sec"). Quiet on a computer; phones, tablets and Route+ still beep. */
  function drQuiet() { try { return !window.__navDR && !matchMedia('(any-pointer: coarse)').matches && !('ontouchstart' in window); } catch (e) { return false; } }
  function drTick() {
    if (!LIVE.on) return; var r = LIVE.real, now = Date.now();
    if (!r || !drOn() || now - r.at < drAfter()) { if (LIVE.fix && LIVE.fix.dr && r && now - r.at < drAfter()) drEnd(null); return; }
    var p = LIVE.fix && LIVE.fix.dr ? LIVE.fix : r, dt = (now - (p.dr ? p.at : r.at)) / 3600000, v = drVel(p.la, p.lo);
    var la = p.la, lo = p.lo, run = p.dr ? p.run : 0;
    if (v && v.sog > 0.05) { var d = v.sog * dt; la = p.la + d * Math.cos(v.cog * R) / 60; lo = p.lo + d * Math.sin(v.cog * R) / (60 * Math.cos(p.la * R)); run += d; }
    var f = { la: la, lo: lo, at: now, acc: 5, sog: v ? v.sog : null, cog: v ? v.cog : null, dr: true, since: r.at, run: run, rad: 0.05 + drPct() * run, src: v ? v.src : 'no speed known: holding the last position' };
    if (!p.dr) { LIVE.drTrack = [[r.la, r.lo]]; LIVE.drStart = r.at; if (!drQuiet()) try { liveBeep(); } catch (e) {} }
    LIVE.drTrack.push([la, lo]); if (LIVE.drTrack.length > 4000) LIVE.drTrack.shift();
    LIVE.fix = f; try { LIVE.calc = liveCalc(f); } catch (e) { LIVE.calc = null; } liveShow(); followBoat(); draw();
  }
  function drEnd(real) {   /* GPS back (real) or reckoning switched off (null) */
    var d = LIVE.fix; if (!d || !d.dr) return;
    if (real) { var e = rhumb({ lat: d.la, lon: d.lo }, { lat: real.la, lon: real.lo }), mins = Math.round((Date.now() - d.since) / 60000);
      LIVE.drMsg = 'GPS back after ' + (mins < 1 ? 'under a minute' : mins + ' min') + '. The reckoning was ' + (e.nm < 0.1 ? Math.round(e.nm * 1852) + ' m' : e.nm.toFixed(2) + ' nm') + ' out, ' + ('00' + Math.round(e.brg)).slice(-3) + '°T of the true position.';
      LIVE.drLast = { err: e.nm, brg: e.brg, mins: mins, at: Date.now() }; if (!drQuiet()) try { liveBeep(); } catch (x) {} setTimeout(function () { LIVE.drMsg = null; if (LIVE.fix) liveShow(); }, 20000);
    } else { LIVE.fix = LIVE.real; }
    LIVE.drTrack = [];
  }
  window.__fsOri = function () { return ORI.mode; };
  window.__fsBurn = function () { var p = LIVE.calc && LIVE.calc.pre; return p && p.line && p.line.burn != null ? p.line.burn : null; };   /* time to burn at the start, for the deck screen */
  /* for the Solent race builder (solent.js, Stuart 15 Nov): route a built course as one of My races, the safety depth, and the
     forecast wind at a place and time (true, from), from the models the set-up card would use */
  window.__fsSolPlan = function (plan) { if (!meta || !meta.course || !meta.course.race) return; meta.course.race.solPlan = plan; if (S.myId) { var a = myRaces(); a.forEach(function (x) { if (x.id === S.myId && x.course) x.course.solPlan = plan; }); setMyRaces(a); } S.routes = []; S.sel = null; run(); };
  window.__fsClearCourse = function () { S.gen = (S.gen || 0) + 1; S.running = false; busy(''); prog(''); LIVE.mk = null; S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; S.cleared = true; sessDrop(); if ($('finBox')) $('finBox').innerHTML = ''; if ($('runNote')) $('runNote').textContent = ''; draw(); };   /* Solent: clear the chart for the next course; the course stays in Saved races */
  window.__fsUseCourse = function (c) { archiveRoutes(); var a = myRaces(), rg = regionFor(c), rec = { id: 'r' + Date.now().toString(36), name: c.name, page: window.FS_SOLENT ? HERE : rg ? rg.id : HERE, course: c, settings: snapSettings(), savedAt: Date.now(), summary: '' };
    a.unshift(rec); setMyRaces(a); openMy(rec.id); return rec.id; };
  /* Inshore Solent racing (Stuart 16 Nov 08:00): "the top left name should change to Solent race and if any routing for an offshore race
     is on screen this should be saved away so the map is clear. If you want to go back to offshore race you can toggle this. So you have a
     clean palette to do inshore Solent racing". In: the offshore routes are kept under Saved routes and in memory, the course and routes
     leave the chart, the title reads Solent race, the chart goes to the Solent. Out: the offshore race and its routes come back as they were. */
  window.__fsInshore = function (on) {
    if (on) {
      if (S.inshore) return true;
      var r = meta.course.race || null, prev = { race: r, course: meta.course, title: $('raceTitle').textContent, myId: S.myId, name: meta.course.name, short: $('raceShort').textContent || meta.course.name, startVal: $('startSel').value, sess: null };
      try { if (S.routes && S.routes.length) prev.sess = archiveRoutes(); } catch (e) {}
      S.gen = (S.gen || 0) + 1; S.running = false; busy(''); prog(''); S.routes = []; S.sel = null; if ($('finBox')) $('finBox').innerHTML = '';
      S.offPrev = prev; S.inshore = true; S.cleared = true; document.body.classList.add('inshore'); try { closePanel(); } catch (e) {}   /* the offshore set-up panel would offer Route for the race just put away */
      $('raceTitle').textContent = 'Solent race'; setShort('Solent race');
      try { followSet(false); } catch (e) {} view.la = 50.77; view.lo = -1.27; view.s = Math.max(320, Math.min(W || 400, 1400)) / 20 * 43;   /* the Solent, about 20 nm across */
      draw(); return true;
    }
    var p = S.offPrev; S.offPrev = null; S.inshore = false; S.cleared = false; document.body.classList.remove('inshore');
    try { FSSolent.step(0); FSSolent.on(false); } catch (e) {}
    if (!p) { draw(); return false; }
    S.myId = p.myId; if (p.race) applyCourseObj(p.race); else { meta.course = p.course; $('raceTitle').textContent = p.title; setShort(p.short); S.legs = null; S.ghosts = []; lastSet({ race: p.course.raceId || null }); }   /* the page's own race has no race object */
    if (p.sess && p.sess.routes) { if (p.startVal) $('startSel').value = p.startVal; startChosen(true); S.running = true; sessRestore(p.sess).then(function () { S.running = false; draw(); }, function () { S.running = false; S.routes = []; run(); }); }
    else run();
    return true;
  };
  window.__fsLiveFold = function () { if (LIVE.mini) return; LIVE.mini = true; LIVE.big = false; var lb = $('liveBox'); if (lb) lb.classList.add('mini'); try { if (LIVE.on) liveShow(); } catch (e) {} };   /* after the gun (Stuart 20 Nov 16:22): the GPS window folds to its pill */
  window.__fsLiveOpen = function () { if (!LIVE.on) liveStart(); else { LIVE.mini = false; try { liveShow(); } catch (e) {} } };
  window.__fsStartNow = function () { var v = +$('startSel').value; return { chosen: !!S.startChosen, ep: v > 0 ? v : null, range: startRange() }; };
  window.__fsPanelClose = function () { try { closePanel(); } catch (e) {} };
  window.__fsOffshorePrev = function () { return S.offPrev ? { name: S.offPrev.name, short: S.offPrev.short } : null; };
  window.__fsCleared = function () { return !!S.cleared; };
  window.__fsDepth = function (v) { if (v == null) return +$('depth').value; depthSet(v); };
  window.__fsStartAt = function () { var v = +$('startSel').value; return v > 0 ? v : null; };
  /* the measuring tool (waypoints.js, Stuart 15 Nov, K): from A to B at the time on the slider. Wind and tide at the middle of the line,
     the boat's polar, the course to steer across the tide (liveSteer); on a beat or a run, the best VMG with the tack or gybe headings and
     the time including tacking; the sail from the crossover chart; whether the line crosses water under the safety depth */
  window.__fsMeasure = function (la0, lo0, la1, lo1, tH) {
    var t = tH != null ? tH : S.t, r = rhumb({ lat: la0, lon: lo0 }, { lat: la1, lon: lo1 }), ms = S.sel ? S.sel.models : cardModels(), o = { nm: r.nm, brg: r.brg, t: t, at: T0 + t * 3600 };
    var mla = (la0 + la1) / 2, mlo = (lo0 + lo1) / 2;
    try { var W = FSRouter.windSampler(P, ms)(mla, mlo, t); if (W && W[0] === W[0]) { o.tws = W[0]; o.twd = W[1]; } } catch (e) {}
    try { var td = $('tideSel').value ? FSRouter.tideSampler(P, $('tideSel').value)(mla, mlo, t) : null; if (td && td[0] === td[0]) { o.tu = td[0]; o.tv = td[1]; o.tide = Math.hypot(td[0], td[1]); o.tideTo = (Math.atan2(td[0], td[1]) / R + 360) % 360; o.tideAlong = td[0] * Math.sin(r.brg * R) + td[1] * Math.cos(r.brg * R); } } catch (e) {}
    if (o.tws != null) {
      var spd = speedFn(opts(ms)), st = liveSteer(r.brg, o.tws, o.twd, o.tu || 0, o.tv || 0, spd);
      if (st) { o.hdg = st.hdg; o.sog = st.sog; o.twa = st.twa; o.tack = !!st.tack; o.bsp = spd(o.tws, Math.abs(st.twa)); o.hours = st.sog > 0.2 ? r.nm / st.sog : null;
        if (st.tack) { o.kind = Math.abs(st.twa) < 90 ? 'beat' : 'run'; o.other = (st.hdg + 2 * (((o.twd - st.hdg + 540) % 360) - 180) + 360) % 360; }
        else o.kind = Math.abs(st.twa) < 70 ? 'fetch' : Math.abs(st.twa) < 140 ? 'reach' : 'run';
        try { o.sail = rig({ tws: o.tws, twa: Math.abs(st.twa), twd: o.twd }); } catch (e) {} }
    }
    try { if (P.depth) o.shallow = !FSRouter.clearLine(P.depth, +$('depth').value, la0, lo0, la1, lo1); } catch (e) {}
    return o;
  };
  window.__fsLL = function (cx, cy) { var r = $('map').getBoundingClientRect(), u = unrot(cx - r.left, cy - r.top); return { la: LA(u[1]), lo: LO(u[0]), x: u[0], y: u[1] }; };   /* screen point to position, for the measuring tool */
  window.__fsMarksGet = function () { return myMarks(); };
  window.__fsMarksSet = function (a) { myMarksSet(a); draw(); };
  window.__fsTimeH = function () { return S.t; };
  window.__fsWindAt = function (la, lo, ep) { try { var W = FSRouter.windSampler(P0(), cardModels())(la, lo, ((ep || Date.now() / 1000) - T0) / 3600); return W && W[0] === W[0] ? { tws: W[0], twd: W[1] } : null; } catch (e) { return null; } };   /* for the reopen test */
  window.__fsDR = function () { var f = LIVE.fix; return { on: drOn(), active: !!(f && f.dr), fix: f && f.dr ? { la: f.la, lo: f.lo, sog: f.sog, cog: f.cog, run: f.run, rad: f.rad, src: f.src, since: f.since } : null, last: LIVE.drLast || null, msg: LIVE.drMsg || null }; };   /* for Route+ and the automatic tests */
  /* the heading that makes good bearing B through the water and tide, and the speed over the ground it gives; on a beat or a run, the best VMG */
  function liveSteer(B, tws, twd, cu, cv, spd) {
    var best = null, vmg = null;
    for (var h = 0; h < 360; h += 2) { var twa = ((h - twd + 540) % 360) - 180, bs = spd(tws, twa); if (!(bs > 0)) continue; var vx = bs * Math.sin(h * R) + cu, vy = bs * Math.cos(h * R) + cv, al = vx * Math.sin(B * R) + vy * Math.cos(B * R), cr = vx * Math.cos(B * R) - vy * Math.sin(B * R);
      if (Math.abs(cr) < 0.3 && al > 0 && (!best || al > best.sog)) best = { hdg: h, sog: al, twa: twa }; if (!vmg || al > vmg.sog) vmg = { hdg: h, sog: al, twa: twa, tack: true }; }
    return best || (vmg && vmg.sog > 0.2 ? vmg : null);
  }
  /* start-line tools (Stuart 12 Nov): ping each end with the phone's GPS; distance to the line, time to it, time to burn, favoured end */
  function lineKey() { return 'fs-line-' + raceKey(); }
  function lineGet() { try { var l = JSON.parse(store(lineKey()) || 'null'); if ((!l || (!l.boat && !l.pin)) && S.inshore) l = JSON.parse(store('fs-line-solent') || 'null'); return l || {}; } catch (e) { return {}; } }   /* Solent (18:40): the start line is kept from one course to the next */
  window.__fsSetLine = function (end, la, lo) { setTimeout(wzLineMark, 0); var l = lineGet(); if (la == null) delete l[end]; else l[end] = [+la.toFixed(6), +lo.toFixed(6), Date.now(), 0]; store(lineKey(), JSON.stringify(l)); if (S.inshore) store('fs-line-solent', JSON.stringify(l)); try { if (LIVE.fix) { LIVE.calc = liveCalc(LIVE.fix); liveShow(); } } catch (e) {} draw(); };
  window.__fsLine = function () { return lineGet(); };
  window.__fsPing = function (end) { linePing(end === 'pin' ? 'pin' : 'boat'); };   /* for the start screen's own ping buttons */
  window.__fsLineKind = function (transit) { var l = lineGet(); if (transit) l.transit = true; else delete l.transit; store(lineKey(), JSON.stringify(l)); if (S.inshore) store('fs-line-solent', JSON.stringify(l)); draw(); };   /* Stuart 21:50: a shore transit line (ping on the transit close inshore, then at the outer distance mark), as the Startline tool */
  /* J3 (Stuart 15 Nov): the ping is where the bow is: the GPS position moved forward by the bow offset along the heading (the boat's
     compass in Route+, else the course over the ground when moving) */
  function bowPos(f) { var d = +(($('bowOff') || {}).value || 0); if (!d) return [f.la, f.lo, null];   /* F55: minus moves the ping aft */ var h = null; try { if (window.__navHdg) h = window.__navHdg(); } catch (e) {} if (h == null && f.sog > 0.5 && f.cog != null) h = f.cog; if (h == null) return [f.la, f.lo, 'no heading: GPS position used']; var n = d / 1852; return [f.la + n * Math.cos(h * R) / 60, f.lo + n * Math.sin(h * R) / (60 * Math.cos(f.la * R)), null]; }
  /* F44 cures (Stuart 18 Nov, iPhone): a ping with no GPS fix used to do nothing at all, and two ends in one place were accepted */
  function linePing(end) { var f = LIVE.fix, nm = end === 'pin' ? 'pin' : 'boat';
    if (!f || f.dr || Date.now() - (f.at || 0) > 15000) { busy('No GPS fix: the ' + nm + ' end was not saved. Wait for the GPS, then ping again.'); return; }
    var l0 = lineGet(), oth = l0[end === 'pin' ? 'boat' : 'pin'];
    if (oth && !l0.transit) { var dm = Math.hypot((f.lo - oth[1]) * Math.cos(f.la * R) * 60, (f.la - oth[0]) * 60) * 1852; if (dm < 20) { busy('Only ' + Math.round(dm) + ' m from the other end: the ' + nm + ' end was not saved. Ping it where it is.'); return; } }
    var l = lineGet(), bp = bowPos(f); l[end] = [+bp[0].toFixed(6), +bp[1].toFixed(6), Date.now(), Math.round(f.acc || 0)]; if (bp[2]) busy('Bow offset not used: ' + bp[2] + '.'); store(lineKey(), JSON.stringify(l)); if (S.inshore) store('fs-line-solent', JSON.stringify(l)); LIVE.calc = liveCalc(f); liveShow(); draw(); }
  function lineCalc(f, gun) {
    var tN = Date.now(); if (f && f.sog != null && !f.dr) { var hs = (LIVE.spdH = (LIVE.spdH || []).filter(function (q) { return tN - q[0] < 600000; })); if (!hs.length || tN - hs[hs.length - 1][0] > 2000) hs.push([tN, f.sog]); }   /* speeds seen, for the good speed below */
    var l = lineGet(); if (!l.boat || !l.pin) return { boat: l.boat, pin: l.pin };
    var la0 = (l.boat[0] + l.pin[0]) / 2, kx = Math.cos(la0 * R) * 60, xy = function (la, lo) { return [(lo - l.boat[1]) * kx, (la - l.boat[0]) * 60]; };
    var bq = bowPos(f), P = xy(l.pin[0], l.pin[1]), F = xy(bq[0], bq[1]), L = Math.hypot(P[0], P[1]) || 1e-9, ux = P[0] / L, uy = P[1] / L;
    var cr = (ux * F[1] - uy * F[0]), along = ux * F[0] + uy * F[1], fwd = null;   /* cr: signed distance from the line (left of boat-to-pin positive) */
    var c = meta.course, nx = realMarks(c)[0] || c.finish; if (nx) { var N = xy(nx.lat, nx.lon); fwd = (ux * N[1] - uy * N[0]) >= 0 ? 1 : -1; }   /* the course side: where the first mark is */
    var over = fwd != null && cr * fwd > 0, d = along < 0 && !l.transit ? Math.hypot(F[0], F[1]) : along > L ? Math.hypot(F[0] - P[0], F[1] - P[1]) : Math.abs(cr);
    var nrm = [-uy * (fwd || 1), ux * (fwd || 1)], perpBrg = (Math.atan2(nrm[0], nrm[1]) / R + 360) % 360;
    var vmg = f.sog != null && f.cog != null ? f.sog * Math.cos((f.cog - perpBrg) * R) * (over ? -1 : 1) : null, ttlBy = 'now', miss = false, stale = f.at != null && Date.now() - f.at > 5000;
    /* K4 (Mark review, 19 Nov 2026): outside the ends the distance is to the nearer end, so the speed is the speed towards that end; inside, the
       track must cross the line between the ends, or there is no exact countdown ("misses the line"); and no countdown on a fix older than 5 s */
    if (f.sog != null && f.cog != null && !l.transit && (along < 0 || along > L)) { var Ex = along < 0 ? [0, 0] : P, ex = Ex[0] - F[0], ey = Ex[1] - F[1], en = Math.hypot(ex, ey) || 1e-9; vmg = f.sog * (Math.sin(f.cog * R) * ex + Math.cos(f.cog * R) * ey) / en; }
    else if (f.sog != null && f.cog != null && vmg > 0.2 && !over) { var vx = f.sog * Math.sin(f.cog * R), vy = f.sog * Math.cos(f.cog * R), crd = ux * vy - uy * vx; if (crd * cr < 0) { var tl = -cr / crd, ac = along + (ux * vx + uy * vy) * tl; if (ac < -0.005 || ac > L + 0.005) miss = true; } }
    var ttl = !stale && !miss && vmg && vmg > 0.2 ? d / vmg * 3600 : null;
    /* F44 cure (Stuart 18 Nov, iPhone): stopped or slow near the line, time to burn was blank. Now it uses the good speed the boat has shown in the
       last 10 minutes (its 80th percentile, at least 2 kn), straight at the line: what the boat will do once it goes. */
    if (ttl == null && !over && !miss && !stale) { var sv = (LIVE.spdH || []).map(function (q) { return q[1]; }).sort(function (a, b) { return a - b; }), g = sv.length >= 5 ? sv[Math.floor(sv.length * 0.8)] : null; if (g && g >= 2) { ttl = d / g * 3600; ttlBy = 'good'; vmg = g; } }
    var o = { boat: l.boat, pin: l.pin, len: L, d: d, over: over, ttl: ttl, ttlBy: ttlBy, ttlV: vmg, miss: miss, stale: stale, burn: ttl != null ? gun - Date.now() / 1000 - ttl : null, brg: (Math.atan2(ux, uy) / R + 360) % 360 };
    try { var tH = (gun - T0) / 3600, ms = S.sel ? S.sel.models : cardModels(), wr = S.inshore && window.FSSolent && FSSolent.windRef ? FSSolent.windRef() : null, W = wr && wr.twd != null ? [10, wr.twd] : FSRouter.windSampler(P0(), ms)((l.boat[0] + l.pin[0]) / 2, (l.boat[1] + l.pin[1]) / 2, tH); if (wr && wr.twd != null) o.windSrc = 'race';   /* Mark (21:37 photo): the line bias uses the wind set for the race, not the forecast */
      if (W && W[0] > 0.5) { var wx = Math.sin(W[1] * R), wy = Math.cos(W[1] * R), ub = 0, up = P[0] * wx + P[1] * wy; o.wind = W; o.fav = up > ub ? 'pin' : 'boat'; o.favM = Math.abs(up - ub) * 1852; o.favDeg = Math.abs(((Math.atan2(ux, uy) / R - W[1] + 540) % 360) - 180) ; o.favDeg = Math.abs(90 - o.favDeg); } } catch (e) {}
    return o;
  }
  function P0() { return P; }
  /* marks while racing (Stuart 16 Nov 13:33, "take track round a mark"): the GPS ticks a mark off when the boat crosses its rounding line
     (the gate ray, on the side the mark is left to), or passes within 50 m of it and then sails away. The next mark then gets the course and distance. */
  /* ---------- Fixed wind (Stuart 16 Nov 12:18 and 13:33): the wind and tide seen on the water give one extra route beside the model routes ----------
     wind: speed and the direction it blows from, the same everywhere for the whole race. Tide: (1) the model, (2) the model corrected by a reading
     at a buoy (strength scaled and direction turned to match it), or (3) one steady tide. Set in the Solent guided set-up, under the course and in
     Settings, Boat; changing it re-routes at once. */
  var FIX = (function () { try { return JSON.parse(store('fs-fix') || 'null') || {}; } catch (e) { return {}; } })();
  function fixOn() { return FIX.on && +FIX.tws > 0 && FIX.twd !== '' && FIX.twd != null; }
  function fixHtml(px) {
    var v = function (k) { return FIX[k] == null ? '' : FIX[k]; }, tm = FIX.tmode || 'model', sg = function (val, lab) { return '<button type="button" data-fx="tmode" data-v="' + val + '" aria-pressed="' + (tm === val) + '">' + lab + '</button>'; };
    return '<h4>Fixed wind route</h4><label class="fixrow"><input type="checkbox" data-fx="on"' + (FIX.on ? ' checked' : '') + '> Add a route on the wind I see on the water</label>' +
      '<div class="fixrow"' + (FIX.on ? '' : ' hidden') + '><span>Wind</span><input type="number" inputmode="decimal" min="0" max="60" step="0.5" data-fx="tws" value="' + v('tws') + '" aria-label="Wind speed, knots" placeholder="kn"> kn from <input type="number" inputmode="numeric" min="0" max="360" data-fx="twd" value="' + v('twd') + '" aria-label="Wind from, degrees true" placeholder="°T">°T</div>' +
      '<div class="fixrow"' + (FIX.on ? '' : ' hidden') + '><span>Tide</span><span class="seg">' + sg('model', 'Model') + sg('buoy', 'At a buoy') + sg('steady', 'Steady') + '</span></div>' +
      (FIX.on && tm === 'buoy' ? '<div class="fixrow"><span>At buoy</span><input type="text" data-fx="bcode" value="' + v('bcode') + '" aria-label="Buoy code" placeholder="3G"> <input type="number" inputmode="decimal" min="0" max="8" step="0.1" data-fx="bspd" value="' + v('bspd') + '" aria-label="Tide seen, knots" placeholder="kn"> kn to <input type="number" inputmode="numeric" min="0" max="360" data-fx="bdir" value="' + v('bdir') + '" aria-label="Tide runs towards, degrees true" placeholder="°T">°T</div>' : '') +
      (FIX.on && tm === 'steady' ? '<div class="fixrow"><span>Tide</span><input type="number" inputmode="decimal" min="0" max="8" step="0.1" data-fx="tspd" value="' + v('tspd') + '" aria-label="Tide, knots" placeholder="kn"> kn to <input type="number" inputmode="numeric" min="0" max="360" data-fx="tdir" value="' + v('tdir') + '" aria-label="Tide runs towards, degrees true" placeholder="°T">°T</div>' : '') +
      '<p class="fixnote">' + (FIX.on ? (fixOn() ? 'Routes again with a Fixed wind route beside the model routes. ' + (fixTideNote() || '') : 'Give the wind speed and direction.') : 'Off. Tick to give the wind (and tide) you see.') + '</p>';
  }
  var fixT = null;
  function fixMount() { ['fixCourse', 'fixSet'].forEach(function (id) { var e = $(id); if (e) { e.innerHTML = fixHtml(id); fixBind(e); } }); try { if (window.FSSolent && FSSolent.stepState().on) FSSolent.step(FSSolent.stepState().n); } catch (e) {} }
  function fixBind(el) {
    if (!el) return;
    [].forEach.call(el.querySelectorAll('[data-fx]'), function (c) {
      var k = c.getAttribute('data-fx');
      if (c.tagName === 'BUTTON') c.onclick = function () { FIX[k] = c.getAttribute('data-v'); fixSave(true); };
      else if (c.type === 'checkbox') c.onchange = function () { FIX[k] = c.checked; fixSave(true); };
      else c.onchange = function () { FIX[k] = c.type === 'number' ? (c.value === '' ? '' : +c.value) : c.value.trim().toUpperCase(); fixSave(false); };
    });
  }
  function fixSave(redraw) { if (FIX.on) FIX.for = raceKey(); store('fs-fix', JSON.stringify(FIX)); if (redraw) fixMount(); else { [].forEach.call(document.querySelectorAll('.fixnote'), function (n) { n.textContent = FIX.on ? (fixOn() ? 'Routes again with a Fixed wind route beside the model routes. ' + (fixTideNote() || '') : 'Give the wind speed and direction.') : 'Off. Tick to give the wind (and tide) you see.'; }); }
    clearTimeout(fixT); fixT = setTimeout(function () { if (S.routes && S.routes.length && !S.running && !(window.FSSolent && FSSolent.stepState().on)) { S.key = null; S.preBad = true; run(); } }, 700); }   /* re-route at once (Stuart 12:18) */
  /* the buoy reading against the model there, at the start */
  function fixBuoy() {
    if (FIX.tmode !== 'buoy' || !(FIX.bspd >= 0) || FIX.bdir === '' || FIX.bdir == null || !FIX.bcode) return null;
    var mk = window.FSSolent && FSSolent.marks && (FSSolent.marks() || []).filter(function (m) { return m.id.toUpperCase() === String(FIX.bcode).toUpperCase(); })[0]; if (!mk) return { err: 'No Solent buoy ' + FIX.bcode + '.' };
    var tid = $('tideSel').value; if (!tid || !P.tide[tid]) return { err: 'No tide model loaded to correct.' };
    var t = (+$('startSel').value - T0) / 3600, C = FSRouter.tideSampler(P, tid)(mk.lat, mk.lon, t), ms = Math.sqrt(C[0] * C[0] + C[1] * C[1]); if (ms < 0.05) return { err: 'The model has almost no tide at ' + mk.id + ' then; use Steady instead.' };
    var md = (Math.atan2(C[0], C[1]) / R + 360) % 360, turn = ((FIX.bdir - md + 540) % 360) - 180;
    return { tspd: Math.round((FIX.bspd / ms - 1) * 100), tdir: Math.round(turn), model: [ms, md], at: mk.id };
  }
  function fixTideNote() { var tm = FIX.tmode || 'model'; if (tm === 'steady') return FIX.tspd >= 0 && FIX.tdir !== '' && FIX.tdir != null ? 'Tide ' + FIX.tspd + ' kn to ' + FIX.tdir + '°T everywhere.' : 'Give the tide speed and direction.';
    if (tm === 'buoy') { var b = fixBuoy(); return !b ? 'Give the buoy, and the tide you see there.' : b.err ? b.err : 'Model at ' + b.at + ': ' + b.model[0].toFixed(1) + ' kn to ' + Math.round(b.model[1]) + '°T; corrected ' + (b.tspd >= 0 ? '+' : '') + b.tspd + '% and ' + (b.tdir >= 0 ? '+' : '') + b.tdir + '°.'; }
    return 'Tide from the model.'; }
  function fixAdj(base) { var a = Object.assign({}, base || {}); a.fixW = { tws: +FIX.tws, twd: +FIX.twd }; var tm = FIX.tmode || 'model';
    if (tm === 'steady' && FIX.tspd >= 0 && FIX.tdir !== '' && FIX.tdir != null) a.fixT = { spd: +FIX.tspd, dir: +FIX.tdir };
    if (tm === 'buoy') { var b = fixBuoy(); if (b && !b.err) { a.tspd = (a.tspd || 0) + b.tspd; a.tdir = (a.tdir || 0) + b.tdir; } }
    delete a.wdir; delete a.wspd; delete a.wtime; return a; }
  window.__fsFix = { html: function () { return fixHtml('sol'); }, bind: fixBind, state: function () { return Object.assign({}, FIX); }, set: function (o) { Object.assign(FIX, o); fixSave(true); }, buoy: fixBuoy };
  /* End race (Stuart 16 Nov 12:25): file the boat's track with the result, keep the race (it was saved when routed) and clear the chart */
  function endRace() {
    var now = Date.now(), gun = +$('startSel').value; try { var fu = futureGet(); if (fu && fu.ep) gun = fu.ep; } catch (e) {}
    if (gun && gun > now / 1000) gun = null;   /* 17 Nov (Stuart's photo, 0h 00 from the gun): a gun still to come is not this race's gun */
    var el = gun ? Math.max(0, Math.round(now / 1000 - gun)) : null, hm = function (sec) { return Math.floor(sec / 3600) + 'h ' + ('0' + Math.floor(sec % 3600 / 60)).slice(-2); }, clk = function (ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
    var name = ($('raceTitle').textContent || 'Race') + ' ' + new Date(now).getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(now).getMonth()], M = LIVE.mk || { done: [] };
    var res = { name: name, course: meta && meta.course ? meta.course.name : '', gun: gun || null, end: Math.round(now / 1000), elapsed: el, marks: (M.done || []).map(function (d) { return { name: d.name, t: Math.round(d.t / 1000) }; }) };
    try { var all = JSON.parse(store('fs-results') || '[]'); all.unshift(res); store('fs-results', JSON.stringify(all.slice(0, 50))); } catch (e) {}
    var tn = name + ' · ended ' + clk(now) + (el != null ? ' · ' + hm(el) + ' from the gun' : '') + (res.marks.length ? ' · ' + res.marks.map(function (m) { return m.name.split(' ')[0] + ' ' + clk(m.t * 1000); }).join(', ') : '');
    var tr0 = (LIVE.trail || []).slice(); if (gun) { var cut = (gun - 900) * 1000, tr1 = tr0.filter(function (q) { return !q[2] || q[2] >= cut; }); if (tr1.length > 1) tr0 = tr1; } else if (tr0.length && tr0[0][2] && now - tr0[0][2] > 12 * 3600000) { var tr2 = tr0.filter(function (q) { return q[2] && now - q[2] <= 12 * 3600000; }); if (tr2.length > 1) tr0 = tr2; }   /* the race's own track: from 15 minutes before the gun, never a trail left running since the night before (Stuart's photo, 16 Nov 21:44) */
    var filed = false; try { if (window.FSTracks && tr0.length > 1) filed = FSTracks.file(tr0, tn); } catch (e) {}
    if (filed) { LIVE.trail = []; store('fs-livetrail', '[]'); }
    LIVE.mk = null; S.routes = []; S.sel = null; S.legs = null; S.ghosts = []; S.cleared = true;
    try { liveStop(); } catch (e) {} try { $('finBox').innerHTML = ''; } catch (e) {}
    busy('Race ended' + (el != null ? ': ' + hm(el) + ' from the gun' : '') + '. ' + (filed ? 'Track filed with the result. ' : '') + 'The race stays in Races, Saved routes; the chart is clear for the next one.'); setTimeout(function () { busy(''); }, 6000);
    draw();
  }
  window.__fsEndRace = endRace;
  function escMk(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function markTrack(f) {
    var legs = S.legs || (meta && meta.course ? legsFor(null) : null); if (!legs || !legs.length || !f) return null;
    var key = legs.map(function (l) { return l.name; }).join('|');
    if (!LIVE.mk || LIVE.mk.key !== key) LIVE.mk = { key: key, i: 0, done: [], prev: null, near: null };
    var M = LIVE.mk, kx = Math.cos(f.la * R);
    var cross = function (p, q, a, b) { var d1x = (q[1] - p[1]) * kx, d1y = q[0] - p[0], d2x = (b[1] - a[1]) * kx, d2y = b[0] - a[0], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-14) return false; var ex = (a[1] - p[1]) * kx, ey = a[0] - p[0], t = (ex * d2y - ey * d2x) / den, u = (ex * d1y - ey * d1x) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
    while (M.i < legs.length - 1) {   /* the last leg is the finish */
      var lg = legs[M.i], at = (lg.gate && lg.gate.mark) || lg.at || lg.point, d = FSRouter.dist(f.la, f.lo, at[0], at[1]), hit = false;
      if (lg.gate && M.prev) { var a = lg.gate.mark || lg.gate.a, b = lg.gate.b; hit = cross(M.prev, [f.la, f.lo], a, b); }
      if (!hit && lg.point && d < (lg.r || 0.05)) hit = true;
      if (!hit && d < 0.027) M.near = Math.min(M.near == null ? 9 : M.near, d);
      if (!hit && M.near != null && d > M.near + 0.03) hit = true;   /* came within 50 m and is now sailing away */
      if (!hit) break;
      M.done.push({ name: lg.name, t: Date.now() }); M.i++; M.near = null; M.just = Date.now(); try { liveBeep(); } catch (e) {}
    }
    M.prev = [f.la, f.lo];
    var nx = legs[Math.min(M.i, legs.length - 1)], tg = (nx.gate && nx.gate.mark) || nx.at || nx.point;
    return { name: nx.name, n: M.i + 1, of: legs.length, finish: M.i >= legs.length - 1, to: rhumb({ lat: f.la, lon: f.lon != null ? f.lon : f.lo }, { lat: tg[0], lon: tg[1] }), side: nx.gate && nx.gate.side, last: M.done[M.done.length - 1], fresh: M.just && Date.now() - M.just < 20000 };
  }
  /* Header or lift on a beat (Stuart 16 Nov 18:30, decided 18:40): against the wind set for the race (typed, head to wind, or the boat's
     instruments). With instruments the wind's own shift is used; without, the boat's course over the last 20 seconds, assuming she
     sails the same angle to the wind (42 degrees, or the polar's best upwind angle). Starboard tack: a veer is a lift; port: a back. */
  function shiftCalc(f) {
    var ref = window.FSSolent && FSSolent.windRef ? FSSolent.windRef() : null; if (!S.inshore || !ref || ref.twd == null) return null;
    /* the course made good over the last 20 seconds of fixes, so one-second fixes without a heading still give it */
    var H = LIVE.cogH = (LIVE.cogH || []).filter(function (q) { return Date.now() - q[2] < 20000; }); H.push([f.la, f.lo, Date.now()]); if (H.length < 3) return null;
    var cm = rhumb({ lat: H[0][0], lon: H[0][1] }, { lat: f.la, lon: f.lo }); if (cm.nm < 0.008) return null; var cog = cm.brg;
    var nw = null; try { nw = window.__navWind ? window.__navWind() : null; } catch (e) {}
    var twdNow = nw && nw[1] != null ? nw[1] : null, wd = twdNow != null ? twdNow : ref.twd, rel = ((wd - cog + 540) % 360) - 180;
    if (Math.abs(rel) > 70 || Math.abs(rel) < 15) return { off: true };   /* only on a beat */
    var tack = rel > 0 ? 'starboard' : 'port', BA = ref.ba || 42, d;
    if (twdNow != null) { var sh = ((twdNow - ref.twd + 540) % 360) - 180; d = tack === 'starboard' ? sh : -sh; }
    else d = tack === 'starboard' ? ((cog - (ref.twd - BA) + 540) % 360) - 180 : (((ref.twd + BA) - cog + 540) % 360) - 180;
    var kind = Math.abs(d) < 3 ? 'steady' : d > 0 ? 'lift' : 'header', deg = Math.round(Math.abs(d));
    if (kind === 'header' && deg >= 8) { if (!LIVE.hdrBeep) { LIVE.hdrBeep = true; try { liveBeep(); } catch (e) {} } } else if (deg < 3 || kind === 'lift') LIVE.hdrBeep = false;
    return { kind: kind, deg: deg, tack: tack, src: twdNow != null ? 'the boat\'s wind' : 'your course' };
  }
  function liveCalc(f) {
    var o = { fix: f }, nowH = (Date.now() / 1000 - T0) / 3600, s = S.sel; o.nowH = nowH;
    /* before the gun (Stuart 12 Nov): course and distance to the start and the countdown, not ahead or behind a plan that has not begun */
    var gun = +$('startSel').value; try { var fu = futureGet(); if (fu && fu.ep) gun = fu.ep; } catch (e) {}
    try { o.shift = shiftCalc(f); } catch (e) { o.shift = null; }   /* header or lift before the gun too: crews check the shifts on the line */
    if (gun && Date.now() / 1000 < gun && meta && meta.course && meta.course.start) { o.pre = { to: rhumb({ lat: f.la, lon: f.lo }, meta.course.start), secs: gun - Date.now() / 1000, name: meta.course.start.name || 'the start' }; o.pre.line = lineCalc(f, gun); return o; }
    try { o.mark = markTrack(f); } catch (e) { o.mark = null; }
    if (!s || !s.r || !s.r.path) return o;
    var p = s.r.path, ts = tsOf(p), kx = Math.cos(f.la * R) * 60, best = null, segs = [];
    for (var i = 0; i < p.length - 1; i++) { var ax = (p[i].lo - f.lo) * kx, ay = (p[i].la - f.la) * 60, bx = (p[i + 1].lo - f.lo) * kx, by = (p[i + 1].la - f.la) * 60, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-9, u = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)), qx = ax + u * dx, qy = ay + u * dy, d = Math.hypot(qx, qy);
      segs.push({ d: d, i: i, u: u, side: (dx * (-ay - u * dy) - dy * (-ax - u * dx)) > 0 ? 'L' : 'R', t: ts[i] + u * (ts[i + 1] - ts[i]), la: f.la + qy / 60, lo: f.lo + qx / kx }); }
    /* F59 (19 Nov 2026): a plan that passes the same water twice (out and back past the Scillies, laps of a course) has one nearest
       point per pass. Take each pass's nearest point, then the pass nearest in time as well as distance: each hour away from now
       counts as 0.25 nm. Within the chosen pass the point is still the plain nearest, so ahead, behind and off track stay exact. */
    for (var q = 0; q < segs.length; q++) { var g = segs[q]; if ((q > 0 && segs[q - 1].d < g.d) || (q < segs.length - 1 && segs[q + 1].d < g.d)) continue;
      var sc = g.d + 0.25 * Math.abs(g.t - nowH); if (!best || sc < best.sc) { best = g; best.sc = sc; } }
    if (!best) return o;
    o.xte = best; o.ahead = (best.t - nowH) * 60;   /* minutes: the plan reaches the boat's nearest point at best.t */
    var pn = posAt(ts, p, nowH); if (pn) { o.plan = pn; o.toPlan = rhumb({ lat: f.la, lon: f.lo }, { lat: pn.la, lon: pn.lo }); }
    /* fastest rejoin: the point ahead on the plan that the boat reaches for the least time lost, sailing straight there now */
    var W = FSRouter.windSampler(P, s.models)(f.la, f.lo, nowH), tid = $('tideSel').value ? FSRouter.tideSampler(P, $('tideSel').value)(f.la, f.lo, nowH) : [0, 0], spd = speedFn(opts(s.models)), safe = +$('depth').value;
    if (W && W[0] > 0.5) {
      o.wind = W; var cand = null;
      for (var j = best.i + 1; j < p.length; j++) { if (ts[j] > Math.max(nowH, best.t) + 1.5 || (p[j].leg || 0) !== (p[best.i + 1].leg || 0)) break;   /* rejoin on this leg, within the next 90 minutes of the plan: no cutting marks or corners on today's wind */ var r = rhumb({ lat: f.la, lon: f.lo }, { lat: p[j].la, lon: p[j].lo }); if (r.nm < 0.05) continue;
        var st = liveSteer(r.brg, W[0], W[1], tid[0] || 0, tid[1] || 0, spd); if (!st) continue;
        var ta = nowH + r.nm / st.sog / (st.tack ? 1 : 1), lost = ta - ts[j];
        var wet = FSRouter.clearLine(P.depth, safe, f.la, f.lo, p[j].la, p[j].lo);   /* every depth square on the way back, not 8 points over up to 11 nm (15 Nov 2026) */
        if (!wet) continue; (o.cands = o.cands || []).push({ j: j, la: p[j].la, lo: p[j].lo, brg: r.brg, nm: r.nm, steer: st.hdg, sog: st.sog, tack: !!st.tack, ta: ta, lost: lost }); }
      /* back on the plan soonest: of the ways back that lose no more than 2 minutes more than the best, the one that gets there first */
      /* regain the routing position soonest (Stuart 12 Nov): catch the plan, the earliest point reached no later than the plan; failing that, back on the planned track soonest */
      if (o.cands && (best.d > 0.1 || o.ahead < -1)) { var byT = o.cands.slice().sort(function (a, b) { return a.ta - b.ta; }), cat = byT.filter(function (q) { return q.lost <= 0; })[0]; o.rejoin = cat ? Object.assign(cat, { kind: 'catch' }) : Object.assign(byT[0], { kind: 'track' }); }
      delete o.cands;
    }
    return o;
  }
  function liveBeep() {
    try { if (navigator.vibrate) navigator.vibrate([300, 120, 300]); } catch (e) {}
    try { if (!$('liveSound').checked || !LIVE.ac) return; var ac = LIVE.ac; if (ac.state === 'suspended') ac.resume(); [0, 0.35].forEach(function (d) { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.22); }); } catch (e) {}
  }
  /* (i) on the live window: what each figure and colour means (Stuart 12 Nov) */
  function liveInfo() {
    var xl = +$('xteLim').value || 0, bl = +$('behLim').value || 0;
    return '<div class="lvinfo"><b>What these mean</b>' +
      '<p><b>SOG, COG:</b> speed and course over the ground from this phone\'s GPS. GPS gives no heading.</p>' +
      '<p><b>Off track:</b> distance from the planned route, L or R looking along it.</p>' +
      '<p><b>Plan:</b> minutes ahead (+) or behind (−) the plan at the point of the route you are level with.</p>' +
      '<p><b>To plan now:</b> course and distance to where the plan says the boat should be now (PLAN NOW on the chart).</p>' +
      '<p><b>Catch plan:</b> the course to steer, speed over the ground and time to be level with the plan again, from the wind, tide and your polar now. <b>Back on track:</b> when you cannot catch it, the soonest way back onto the planned track. The amber dashed line on the chart shows it.</p>' +
      '<p><b>Orange:</b> an alert limit is passed: off track by more than ' + (xl ? xl + ' nm' : 'the limit (off)') + ' or behind by more than ' + (bl ? bl + ' min' : 'the limit (off)') + '. It sounds once as it goes over. Change the limits, or set 0 to turn one off, in Settings, Course, While racing.</p>' +
      '<p><b>Green trail:</b> where the boat has been; tap it for time, SOG and COG. <b>GPS ±:</b> how sure the phone is of its position.</p>' +
      '<p><b>Dead reckoning:</b> if the GPS stops for 10 seconds, the boat carries on along its last course and speed, drawn amber and dashed with a circle of doubt, and DR ± says how far out it may be. Turn it off in Settings, Course, While racing.</p>' +
      '<p><b>Buttons:</b> <b>Hide</b> shrinks this window to a small GPS live pill: its dot and border are green within your limits and orange past one, with off track and the minutes; tap the pill (Open) for this window again. <b>Big</b> shows the figures large for the cockpit; Chart comes back. <b>Re-route</b> works out a fresh route from the boat and says how its finish compares with the plan; it then becomes the plan. <b>Stop</b> turns the GPS off (the trail stays on the chart). <b>Clear track</b> wipes the trail. <b>i</b> opens or closes these notes.</p>' +
      '<p><b>Before the start:</b> To the start (course and distance to the start position in the course) and Gun in (the countdown to your class start). <b>Ping boat</b> and <b>Ping pin</b> store each end of the line from this phone\'s GPS as you pass it; then Route shows the distance to the line (OVER if you are on the course side), the time to reach it at your speed towards it, the <b>time to burn</b> (countdown less time to the line; negative means you will be late), and the <b>favoured end</b> in metres from the forecast wind at the gun. Clear line starts again. Ahead, behind and the alerts begin at the gun.</p>' +
      '<p>Keep Route open with the screen on. Not for navigation.</p><button class="btn" id="lvInfoX">Close</button></div>';
  }
  function liveShow() {
    liveShow0(); stripShow();   /* F104: before the window's own early returns */ var f = LIVE.fix, b = $('liveBox'); if (!b) return; var old = b.querySelector('.lvdr'); if (old) old.remove();
    var h = '';
    if (f && f.dr) { var s = Math.round((Date.now() - f.since) / 1000), age = s >= 3600 ? Math.floor(s / 3600) + 'h ' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) : Math.floor(s / 60) + ' min ' + ('0' + s % 60).slice(-2) + ' s';
      h = '<div class="lvl lvdr lvwarn" role="alert"><b>DEAD RECKONING: no GPS for ' + age + '.</b> Carrying on ' + (f.cog != null && f.sog > 0.05 ? ('00' + Math.round(f.cog)).slice(-3) + '°T at ' + f.sog.toFixed(1) + ' kn, from the ' + f.src : f.src) + '. Position good to about ' + (f.rad < 0.1 ? Math.round(f.rad * 1852) + ' m' : f.rad.toFixed(2) + ' nm') + '. <button class="btn" id="drStop">Stop dead reckoning</button></div>'; }
    else if (LIVE.drMsg) h = '<div class="lvl lvdr">' + LIVE.drMsg + '</div>';
    if (LIVE.mini && !LIVE.big) { b.classList.toggle('drmode', !!(f && f.dr)); return; }   /* the small GPS pill: no extra lines spilling over the chart (16 Nov, seen in Stuart's Chrome) */
    var shf = LIVE.calc && LIVE.calc.shift, osh = b.querySelector('.lvsh'); if (osh) osh.remove();
    if (shf && !shf.off) b.insertAdjacentHTML('afterbegin', '<div class="lvl lvsh ' + shf.kind + '" role="status"><b>' + (shf.kind === 'steady' ? 'ON THE WIND' : shf.kind === 'lift' ? 'LIFT ' + shf.deg + '°' : 'HEADER ' + shf.deg + '°') + '</b> <span>' + shf.tack + ' tack, from ' + shf.src + '</span></div>');
    var mk = LIVE.calc && LIVE.calc.mark, om = b.querySelector('.lvmk'); if (om) om.remove();
    if (mk && !(LIVE.calc && LIVE.calc.pre)) { var nm1 = mk.to.nm < 0.1 ? Math.round(mk.to.nm * 1852) + ' m' : (mk.to.nm < 10 ? mk.to.nm.toFixed(1) : Math.round(mk.to.nm)) + ' nm';
      b.insertAdjacentHTML('afterbegin', '<div class="lvl lvmk"' + (mk.fresh ? ' role="status"' : '') + '>' + (mk.fresh && mk.last ? '<b class="lvok">✓ ' + escMk(mk.last.name) + ' rounded.</b> ' : '') + (mk.finish ? 'To the finish: ' : 'Next mark ' + mk.n + ' of ' + (mk.of - 1) + ': ') + '<b>' + escMk(mk.name) + '</b>' + (mk.side ? ' to ' + mk.side : '') + ' · <b>' + ('00' + Math.round(mk.to.brg)).slice(-3) + '°T ' + nm1 + '</b>' + (S.inshore ? ' <button class="btn sm" id="mkEnd" title="File the track, keep the result, clear the chart">' + (LIVE.endArm && Date.now() - LIVE.endArm < 5000 ? 'Tap again to end' : 'End race') + '</button>' : '') + (mk.finish ? '' : ' <button class="btn sm" id="mkSkip" title="Count this mark as rounded">Rounded</button>') + (LIVE.mk && LIVE.mk.i > 0 ? ' <button class="btn sm" id="mkBack" title="Go back one mark">Back</button>' : '') + '</div>');
      b.hidden = false; var sk = $('mkSkip'), bk = $('mkBack');
      if (sk) sk.onclick = function () { var M = LIVE.mk; if (!M) return; M.done.push({ name: mk.name, t: Date.now() }); M.i++; M.near = null; M.just = Date.now(); LIVE.calc = liveCalc(LIVE.fix); liveShow(); draw(); };
      var en = $('mkEnd'); if (en) en.onclick = function () { if (!(LIVE.endArm && Date.now() - LIVE.endArm < 5000)) { LIVE.endArm = Date.now(); liveShow(); return; } LIVE.endArm = null; endRace(); };
      if (bk) bk.onclick = function () { var M = LIVE.mk; if (!M || !M.i) return; M.i--; M.done.pop(); M.near = null; M.just = null; LIVE.calc = liveCalc(LIVE.fix); liveShow(); draw(); }; }
    if (h) { b.hidden = false; b.insertAdjacentHTML('afterbegin', h); var sb = $('drStop'); if (sb) sb.onclick = function () { if ($('drOn')) { $('drOn').checked = false; $('drOn').onchange(); } liveShow(); draw(); }; }
    b.classList.toggle('drmode', !!(f && f.dr));
  }
  /* F104 (Stuart 21 Nov 09:45, "You can go with A, recommended, for no floating window"; 07:41: "Keep losing the on-map controls, which are
     either hidden behind the GPS pill ..."): with GPS on, the strip at the foot shows the live figures (LIVE) in place of the plan at the
     slider time (PLAN), and a tap on GPS opens a short menu with everything the GPS window's buttons did. Nothing floats over the chart, so
     no button on it can be covered. Rollback without a release (Stuart: "ensure we have a roll back"): localStorage fs-gpswin = 1 brings
     the old window back. */
  var GPSWIN = store('fs-gpswin') === '1';
  if (!GPSWIN) document.body.classList.add('gpsstrip');   /* F116 (Stuart 21 Nov 17:02, "the old gps pill bounce in and out once"): from the start, not only after the first strip update, so the old pill never shows while the GPS starts */
  /* F116 (Stuart 21 Nov 17:00-17:02, the plane test): a tap made while the page was frozen is held by the phone and lands when it comes
     back, on whatever is under the finger by then. A tap the page could not act on within two seconds is dropped (a busy moment on a slow phone takes up to about 1.3 s, 21 Nov replay). */
  ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'].forEach(function (ev) { window.addEventListener(ev, function (e) { try { if (e.isTrusted && e.timeStamp > 0 && performance.now() - e.timeStamp > 2000) { e.stopImmediatePropagation(); e.preventDefault(); } } catch (x) {} }, { capture: true, passive: false }); });
  function stripOn() { return !GPSWIN && LIVE.on && !LIVE.sim; }
  function liveStrip(noSC) {
    var f = LIVE.fix, c = LIVE.calc, n1 = function (x) { return x < 10 ? x.toFixed(1) : String(Math.round(x)); }, p3 = function (x) { return pad((x + 360) % 360) + '°'; },
      ds = function (nm) { return nm < 0.1 ? Math.round(nm * 1852) + '<i class="unit"> m</i>' : n1(nm) + '<i class="unit"> nm</i>'; }, mmss = function (t) { var a = Math.abs(Math.round(t)); return (t < 0 ? '−' : '') + Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2); },
      mm = function (m) { var a = Math.abs(Math.round(m)); return a >= 60 ? Math.floor(a / 60) + 'h' + ('0' + a % 60).slice(-2) : a + 'm'; }, warn = function (k, v) { return kv(k, v).replace('<div', '<div class="warnc"'); };
    if (!f) return kv('GPS', LIVE.err ? 'no fix' : 'finding…') + (LIVE.err ? '<div class="gpserr">' + wizEsc(LIVE.err.replace(/<[^>]+>/g, '')).slice(0, 90) + '</div>' : '');
    if (f.acc > 150) return warn('GPS', 'rough') + kv('±', ds(f.acc / 1852));
    var h = (f.dr ? warn('DR', '±' + ds(f.rad || 0)) : '') + (noSC ? '' : kv('SOG', f.sog != null ? n1(f.sog) : '--') + kv('COG', f.cog != null && f.sog > 0.5 ? p3(f.cog) : '--'));
    if (c && c.pre) { var pr = c.pre, ln = pr.line || {}, sc = Math.max(0, Math.round(pr.secs));
      if (ln.d != null) h += (ln.over ? warn('Over', ds(ln.d)) : kv('Line', ds(ln.d))) + kv('Burn', ln.burn != null ? mmss(ln.burn) : '--');
      else h += kv('Start', p3(pr.to.brg) + ' ' + ds(pr.to.nm));
      h += kv('Gun', sc <= 600 ? Math.floor(sc / 60) + ':' + ('0' + sc % 60).slice(-2) : sc < 86400 ? Math.floor(sc / 3600) + 'h' + ('0' + Math.floor(sc % 3600 / 60)).slice(-2) : Math.floor(sc / 86400) + 'd' + Math.floor(sc % 86400 / 3600) + 'h');
      return h; }
    if (c) {
      var mk = c.mark; if (mk) { h += kv(mk.finish ? 'Finish' : 'Mark ' + mk.n, p3(mk.to.brg) + ' ' + ds(mk.to.nm));
        if (mk.fresh && mk.last && LIVE.toastMk !== mk.last.name + mk.n) { LIVE.toastMk = mk.last.name + mk.n; try { window.NavToast('✓ ' + mk.last.name + ' rounded. Next: ' + mk.name + '.'); } catch (e) {} } }
      var x = c.xte; if (S.sel && x) { var xl = +$('xteLim').value || 0, bl = +$('behLim').value || 0, xs = x.d < 0.05 ? '0.0' : n1(x.d) + ' ' + x.side, as = Math.abs(c.ahead) < 1 ? '0m' : (c.ahead > 0 ? '+' : '−') + mm(c.ahead);
        h += (xl > 0 && x.d > xl ? warn('Off', xs) : kv('Off', xs)) + (bl > 0 && c.ahead < -bl ? warn('Plan', as) : kv('Plan', as)); }
    }
    return h;
  }
  /* Stuart 22 Nov 09:16 (decided 09:20): a tap on the LIVE or BOAT strip shows the PLAN figures for 10 s, in the same columns, to compare */
  var PEEK = 0; function peeking() { return Date.now() < PEEK; }
  (function () { var n = $('now'); if (!n) return; n.addEventListener('click', function () { if (!n.classList.contains('live') || peeking() || ($('now2') && !$('now2').hidden)) return;   /* with the PLAN line showing under it, a tap has nothing to add */ PEEK = Date.now() + 10000; update(); setTimeout(function () { PEEK = 0; n.classList.remove('peek'); update(); stripShow(); }, 10100); }); })();
  function plan2() { var z = $('now2'); if (z && z.hidden && Date.now() - (plan2.at || 0) > 2000) { plan2.at = Date.now(); setTimeout(update, 0); } }   /* the PLAN line under LIVE or BOAT as soon as they show, not at the next slider move */
  function stripShow() { var n = $('now'); if (!n || peeking()) return; document.body.classList.toggle('gpsstrip', !GPSWIN); if (!stripOn()) { if (n.classList.contains('live')) { n.classList.remove('live', 'alarm'); update(); } return; }
    n.innerHTML = liveStrip(); n.classList.add('live'); n.classList.toggle('alarm', !!LIVE.alarm); plan2(); var m = $('gpsMenu'); if (m && !m.hidden) gpsMenu(true); }
  function mkRound() { var M = LIVE.mk, mk = LIVE.calc && LIVE.calc.mark; if (!M || !mk) return; M.done.push({ name: mk.name, t: Date.now() }); M.i++; M.near = null; M.just = Date.now(); LIVE.calc = liveCalc(LIVE.fix); liveShow(); draw(); }
  function mkBack() { var M = LIVE.mk; if (!M || !M.i) return; M.i--; M.done.pop(); M.near = null; M.just = null; LIVE.calc = liveCalc(LIVE.fix); liveShow(); draw(); }
  function gpsMenu(keep) {
    var m = $('gpsMenu'); if (!keep && m && !m.hidden) { m.hidden = true; return; } if (keep && (!m || m.hidden)) return;
    if (!m) { m = document.createElement('div'); m.id = 'gpsMenu'; m.className = 'gpsmenu'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'GPS'); document.body.appendChild(m);
      document.addEventListener('pointerdown', function (e) { if (!m.hidden && !m.contains(e.target) && !$('liveBtn').contains(e.target)) m.hidden = true; }, true); }
    var f = LIVE.fix, c = LIVE.calc || {}, mk = c.mark, b = function (k, t, cls) { return '<button type="button" class="btn' + (cls ? ' ' + cls : '') + '" data-g="' + k + '">' + t + '</button>'; };
    var h = '<div class="gmh"><b>GPS ' + (f ? (f.dr ? 'dead reckoning' : '±' + Math.round(f.acc || 0) + ' m') : 'finding the boat') + '</b><button type="button" class="close" data-g="x" aria-label="Close">×</button></div>';
    if (c.pre) h += b('pingb', lineGet().transit ? 'Ping inshore' : 'Ping boat') + b('pingp', lineGet().transit ? 'Ping outer mark' : 'Ping pin') + (window.__fsStartScreen ? b('ss', 'Start screen') : '') + (window.__fsLineSet ? b('setline', 'Set line') : '');
    if (mk && !c.pre) h += (mk.finish ? '' : b('round', 'Rounded ' + wizEsc(mk.name))) + (LIVE.mk && LIVE.mk.i > 0 ? b('back', 'Back one mark') : '') + (S.inshore ? b('end', LIVE.endArm && Date.now() - LIVE.endArm < 5000 ? 'Tap again to end' : 'End race') : '');
    if (S.sel) h += b('re', 'Re-route from here');
    h += b('big', 'Big numbers') + b('file', 'File track') + b('clr', 'Clear track') + (f && f.dr ? b('drstop', 'Stop dead reckoning') : '') + b('info', 'What these mean') + b('stop', 'Stop GPS', 'primary');
    if (LIVE.info) h += '<div class="gminfo">' + liveInfo() + '</div>';
    m.innerHTML = h; m.hidden = false;
    var r = $('liveBtn').getBoundingClientRect(), w = Math.min(360, innerWidth - 16); m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px'; m.style.bottom = Math.max(8, innerHeight - r.top + 8) + 'px';
    m.onclick = function (e) { var t = e.target.closest('[data-g]'); if (!t) return; var k = t.dataset.g;
      if (k === 'x') { m.hidden = true; return; }
      if (k === 'pingb') linePing('boat'); else if (k === 'pingp') linePing('pin'); else if (k === 'ss') { m.hidden = true; window.__fsStartScreen(); return; } else if (k === 'setline') { m.hidden = true; window.__fsLineSet(); return; }
      else if (k === 'round') mkRound(); else if (k === 'back') mkBack(); else if (k === 'end') { if (!(LIVE.endArm && Date.now() - LIVE.endArm < 5000)) { LIVE.endArm = Date.now(); gpsMenu(true); return; } LIVE.endArm = null; m.hidden = true; endRace(); return; }
      else if (k === 're') { m.hidden = true; liveReroute(); return; } else if (k === 'big') { m.hidden = true; LIVE.big = true; liveShow(); return; }
      else if (k === 'file') { if (window.FSTracks) { var ok = FSTracks.file(LIVE.trail.slice(), (meta && meta.course && meta.course.name) || ''); if (ok) { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); } } }
      else if (k === 'clr') { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); }
      else if (k === 'drstop') { if ($('drOn')) { $('drOn').checked = false; $('drOn').onchange(); } liveShow(); draw(); }
      else if (k === 'info') LIVE.info = !LIVE.info;
      else if (k === 'stop') { m.hidden = true; liveStop(); return; }
      gpsMenu(true); };
  }
  window.__fsGpsMenu = function () { gpsMenu(); };   /* for the automatic tests */
  function liveShow0() {
    var c = LIVE.calc, f = LIVE.fix; if (!f) return;
    var n1 = function (x) { return x < 10 ? x.toFixed(1) : String(Math.round(x)); }, p3 = function (x) { return ('00' + Math.round((x + 360) % 360) % 360).slice(-3) + '°T'; }, mm = function (m) { var a = Math.abs(Math.round(m)); return a >= 60 ? Math.floor(a / 60) + 'h ' + ('0' + a % 60).slice(-2) : a + ' min'; };
    if (f.acc > 150) {   /* not a GPS fix: a computer (or a phone indoors) placing itself by Wi-Fi or the network. Do not race on it. */
      $('liveBox').classList.remove('alarm'); $('liveBig').hidden = true; LIVE.big = false;
      $('liveBox').innerHTML = '<div class="lvl lvwarn"><b>Not a GPS position.</b> This device puts itself within about ' + (f.acc >= 1852 ? n1(f.acc / 1852) + ' nm' : Math.round(f.acc) + ' m') + ', which is how a computer without GPS, or a phone indoors, finds itself from Wi-Fi or the mobile network. Too rough to compare with the plan, so Route shows only the rough position. On the boat use a phone or tablet with GPS, out in the open.</div><div class="lvx"><button class="btn" id="lvStop">Stop GPS</button></div>';
      $('lvStop').onclick = function () { liveStop(); }; return; }
    if (!c) return;
    var sog = f.sog != null ? n1(f.sog) + ' kn' : '--', cog = f.cog != null && f.sog > 0.5 ? p3(f.cog) : '--';
    if (c.pre) {
      var pr = c.pre, ln = pr.line || {}, mmss = function (t) { var a = Math.abs(Math.round(t)); return (t < 0 ? '−' : '') + Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2); }, sc = Math.max(0, Math.round(pr.secs)), gun = sc <= 600 ? Math.floor(sc / 60) + ':' + ('0' + sc % 60).slice(-2) : sc < 86400 ? Math.floor(sc / 3600) + 'h ' + ('0' + Math.floor(sc % 3600 / 60)).slice(-2) : Math.floor(sc / 86400) + 'd ' + Math.floor(sc % 86400 / 3600) + 'h', ts2 = ln.d != null ? (ln.over && sc <= 300 ? 'OVER ' : '') + (ln.d < 0.1 ? Math.round(ln.d * 1852) + ' m' : n1(ln.d) + ' nm') + ' to line'   /* 17 Nov (Stuart's photo, OVER 13 hours before the gun): OVER only in the last five minutes */ : p3(pr.to.brg) + ' ' + n1(pr.to.nm) + ' nm';
      var lineTxt = ln.d != null ? '<div class="lvl"><b' + (ln.over ? ' class="lvwarn"' : '') + '>' + (ln.over ? 'On the course side: ' : 'To the line: ') + (ln.d < 0.1 ? Math.round(ln.d * 1852) + ' m' : n1(ln.d) + ' nm') + '</b>' + (ln.ttl != null ? ' · ' + (ln.ttlBy === 'good' ? 'at your good speed (' + ln.ttlV.toFixed(1) + ' kn)' : 'at this speed') + ' <b>' + mmss(ln.ttl) + '</b> to the line · time to burn <b' + (ln.burn < 0 ? ' class="lvwarn"' : '') + '>' + mmss(ln.burn) + '</b>' : ' · not closing the line') + (ln.fav ? ' · <b>' + (ln.fav === 'pin' ? 'Pin' : 'Boat') + ' end favoured by ' + Math.round(ln.favM) + ' m</b> (' + Math.round(ln.favDeg) + '°, ' + (ln.windSrc === 'race' ? 'race wind ' : 'forecast wind ') + p3(ln.wind[1]).replace('°T', '°') + ')' : '') + ' · line ' + Math.round(ln.len * 1852) + ' m</div>' : '<div class="lvl">' + (ln.boat && !ln.pin ? 'Boat end set. Ping the pin end' : ln.pin && !ln.boat ? 'Pin end set. Ping the boat end' : 'Ping each end of the line as you pass it') + ' for distance to the line, time to burn and the favoured end.</div>';
      LIVE.alarm = false; $('liveBox').classList.remove('alarm'); $('liveBox').classList.toggle('mini', !!LIVE.mini && !LIVE.big);
      if (LIVE.mini && !LIVE.big) { $('liveBox').innerHTML = '<button class="lvmini" id="lvOpen" aria-label="Open the GPS window"><span class="lvdot"></span><span class="lvlab">GPS live</span><b>' + ts2 + '</b><b>' + gun + '</b><span class="lvup">Open</span></button>'; $('lvOpen').onclick = function () { LIVE.mini = false; store('fs-livemini', '0'); liveShow(); followBoat(); draw(); }; $('liveBig').hidden = true; return; }
      $('liveBox').innerHTML = '<div class="lvg"><div><small>SOG</small><b>' + sog + '</b></div><div><small>COG</small><b>' + cog + '</b></div><div style="grid-column:span 2"><small>' + (ln.d != null ? (ln.over ? 'Over the line' : 'To the line') : 'To the start') + '</small><b' + (ln.over ? ' class="lvwarn"' : '') + '>' + ts2.replace(' to line', '') + '</b></div></div>' +
        '<div class="lvl">Gun in <b>' + gun + '</b> · ' + wizEsc(pr.name) + (ln.d != null ? '' : ': course and distance to the start position in the course') + '.</div>' + lineTxt +
        '<div class="lvx"><button class="btn" id="lnBoat">' + (lineGet().transit ? 'Ping inshore' : 'Ping boat') + (ln.boat ? ' ✓' : '') + '</button><button class="btn" id="lnPin">' + (lineGet().transit ? 'Ping outer mark' : 'Ping pin') + (ln.pin ? ' ✓' : '') + '</button>' + (window.FSSolent && FSSolent.kit ? '<button class="btn" id="lnSet" title="Set the start line: typed, bearing and length, the chart, or the RYS line">Set line</button>' : '') + (window.FSSolent && FSSolent.kit ? '<button class="btn" id="lnSS" title="The start screen: countdown, line, time to burn, bias">Start screen</button>' : '') + '' + (ln.boat || ln.pin ? '<button class="btn" id="lnClr">Clear line</button>' : '') + (ln.boat && ln.pin && meta && meta.course && meta.course.start ? '<button class="btn" id="lnUse" title="Move the course start to the middle of the pinged line and route again">Start from the line</button>' : '') + '</div>' + (LIVE.info ? liveInfo() : '') +
        '<div class="lvx"><button class="btn lvmin" id="lvMin" aria-label="Hide: shrink to a small pill" title="Hide: shrink to a small pill">' + (window.FS_HIDE || 'Hide') + '</button><button class="btn primary" id="lvBig">Big</button><button class="btn" id="lvStop">Stop</button><button class="btn" id="lvFile" title="Keep this track in Tracks, offer it as GPX and start a fresh one">File track</button><button class="btn" id="lvClr">Clear track</button><button class="btn lvi" id="lvInfo" aria-label="What these mean" title="What these mean">i</button><span class="lvl" style="align-self:center;margin-left:auto">' + (f.dr ? '<b class="lvwarn">DR ±' + (f.rad < 0.1 ? Math.round(f.rad * 1852) + ' m' : f.rad.toFixed(2) + ' nm') + '</b>' : 'GPS ±' + Math.round(f.acc || 0) + ' m') + '</span></div>';
      $('lvMin').onclick = function () { LIVE.mini = true; LIVE.info = false; store('fs-livemini', '1'); liveShow(); followBoat(); draw(); }; $('lvInfo').onclick = function () { LIVE.info = !LIVE.info; liveShow(); }; if ($('lvInfoX')) $('lvInfoX').onclick = function () { LIVE.info = false; liveShow(); };
      $('lvStop').onclick = function () { liveStop(); }; $('lvClr').onclick = function () { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); }; if ($('lvFile')) $('lvFile').onclick = function () { if (!window.FSTracks) return; var ok = FSTracks.file(LIVE.trail.slice(), (meta && meta.course && meta.course.name) || ''); if (ok) { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); } }; $('lvBig').onclick = function () { LIVE.big = true; liveShow(); };
      $('lnBoat').onclick = function () { linePing('boat'); }; if ($('lnSet')) $('lnSet').onclick = function () { if (window.__fsLineSet) window.__fsLineSet(); }; if ($('lnSS')) $('lnSS').onclick = function () { if (window.__fsStartScreen) window.__fsStartScreen(); }; $('lnPin').onclick = function () { linePing('pin'); }; if ($('lnClr')) $('lnClr').onclick = function () { store(lineKey(), ''); if (S.inshore) store('fs-line-solent', ''); LIVE.calc = liveCalc(LIVE.fix); liveShow(); draw(); }; if ($('lnUse')) $('lnUse').onclick = function () { var l = lineGet(); if (!l.boat || !l.pin || !meta.course || !meta.course.start) return; meta.course.start = Object.assign({}, meta.course.start, { lat: +((l.boat[0] + l.pin[0]) / 2).toFixed(6), lon: +((l.boat[1] + l.pin[1]) / 2).toFixed(6), fromLine: true }); busy('Start moved to the middle of the pinged line: routing again…'); S.from = null; run(); };   /* J3: pinging each end updates the start position */
      $('liveBig').hidden = !LIVE.big; $('liveBig').classList.remove('alarm');
      if (LIVE.big) { var cl = function (k, v, sub) { return '<div><small>' + k + '</small><b>' + v + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; };
        $('liveBig').innerHTML = '<div class="lbg">' + cl('SOG', sog) + cl('COG', cog) + (ln.d != null ? cl(ln.over ? 'Over: course side' : 'To the line', ln.d < 0.1 ? Math.round(ln.d * 1852) + ' m' : n1(ln.d) + ' nm', ln.fav ? (ln.fav === 'pin' ? 'Pin' : 'Boat') + ' end favoured by ' + Math.round(ln.favM) + ' m' : '') + cl('Time to burn', ln.burn != null ? mmss(ln.burn) : '--', ln.ttl != null ? mmss(ln.ttl) + ' to the line at this speed' : 'not closing the line') : cl('To the start', p3(pr.to.brg), n1(pr.to.nm) + ' nm to ' + wizEsc(pr.name))) + cl('Gun in', gun, 'class start ' + clockAbs(+$('startSel').value).slice(-5) + ' ' + tzS1()) + '</div><div class="lvx"><button class="btn primary" id="lbChart">Chart</button><button class="btn" id="lbStop">Stop GPS</button></div>';
        $('lbChart').onclick = function () { LIVE.big = false; liveShow(); }; $('lbStop').onclick = function () { liveStop(); }; }
      return;
    }
    var xl = +$('xteLim').value || 0, bl = +$('behLim').value || 0, xte = c.xte, offX = xte && xl > 0 && xte.d > xl, offB = c.xte && bl > 0 && c.ahead < -bl, alarm = offX || offB;
    if (alarm && !LIVE.alarm) liveBeep(); LIVE.alarm = alarm;
    var xt = xte ? n1(xte.d) + ' nm ' + (xte.d < 0.02 ? '' : xte.side === 'L' ? 'left' : 'right') : '--', ab = xte ? (Math.abs(c.ahead) < 1 ? 'On plan' : mm(c.ahead) + (c.ahead > 0 ? ' ahead' : ' behind')) : '--';
    var tp = c.toPlan ? p3(c.toPlan.brg) + ' ' + n1(c.toPlan.nm) + ' nm' : (S.sel && c.nowH < tsOf(S.sel.r.path)[0] ? 'before the start' : '--');
    var rj = c.rejoin, rjt = rj ? 'Steer ' + p3(rj.steer) + (rj.tack ? ' (best VMG, beat or run)' : '') + ' to make good ' + p3(rj.brg) + ' at ' + n1(rj.sog) + ' kn: ' + n1(rj.nm) + ' nm, ' + mm(rj.nm / rj.sog * 60) + (rj.kind === 'catch' ? ', level with the plan by ' + clockAbs(T0 + rj.ta * 3600).slice(-5) + ' ' + tzS1() : ', back on the planned track ' + clockAbs(T0 + rj.ta * 3600).slice(-5) + ' ' + tzS1() + ', ' + mm(rj.lost * 60) + ' behind the plan') : (S.sel ? (c.xte && c.xte.d <= 0.1 && c.ahead >= -1 ? 'On plan.' : 'No straight way back found: re-route from here.') : '');
    var nor = !S.sel ? '<div class="lvl">No route chosen yet: route the race to compare the boat with the plan.</div>' : '';
    $('liveBox').classList.toggle('alarm', alarm);
    var xs0 = xte ? (xte.d < 0.05 ? '0.0' : n1(xte.d) + ' ' + xte.side) : '--', as0 = xte ? (Math.abs(c.ahead) < 1 ? '0 min' : (c.ahead > 0 ? '+' : '−') + mm(c.ahead)) : '--';
    $('liveBox').classList.toggle('mini', !!LIVE.mini && !LIVE.big);
    if (LIVE.mini && !LIVE.big) {   /* minimised (Stuart 12 Nov): the colour, off track and the minutes; tap to open */
      $('liveBox').innerHTML = '<button class="lvmini' + (alarm ? ' bad' : '') + '" id="lvOpen" aria-label="Open the GPS window"><span class="lvdot"></span><span class="lvlab">GPS live</span>' + (S.sel && xte ? '<b>' + xs0 + '</b><b>' + as0 + '</b>' : '<b>' + sog + '</b>') + '<span class="lvup">Open</span></button>';
      $('lvOpen').onclick = function () { LIVE.mini = false; store('fs-livemini', '0'); liveShow(); followBoat(); draw(); }; $('liveBig').hidden = true; return; }
    var xs = xte ? (xte.d < 0.05 ? '0.0' : n1(xte.d) + ' ' + xte.side) : '--', as = xte ? (Math.abs(c.ahead) < 1 ? '0 min' : (c.ahead > 0 ? '+' : '−') + mm(c.ahead)) : '--';
    var rjs = rj ? (rj.kind === 'catch' ? 'Catch plan: ' : 'Back on track: ') + '<b>' + p3(rj.steer) + '</b> · ' + n1(rj.sog) + ' kn · ' + n1(rj.nm) + ' nm · ' + mm(rj.nm / rj.sog * 60) + (rj.kind === 'catch' ? '' : ' · ' + mm(rj.lost * 60) + ' behind') + (rj.tack ? ' · beat/run' : '') : (S.sel && xte && xte.d <= 0.1 && c.ahead >= -1 ? 'On plan' : S.sel ? 'No straight way back: re-route' : 'Route the race to compare with a plan');
    $('liveBox').innerHTML = '<div class="lvg"><div><small>SOG</small><b>' + sog + '</b></div><div><small>COG</small><b>' + cog + '</b></div><div><small>Off track</small><b' + (offX ? ' class="lvwarn"' : '') + '>' + xs + '</b></div><div><small>Plan</small><b' + (offB ? ' class="lvwarn"' : '') + '>' + as + '</b></div></div>' +
      '<div class="lvl">To plan now: <b>' + tp + '</b> · ' + rjs + '</div>' + (LIVE.cmp ? '<div class="lvl">' + LIVE.cmp + '</div>' : '') +
      (LIVE.info ? liveInfo() : '') + '<div class="lvx"><button class="btn lvmin" id="lvMin" aria-label="Hide: shrink to a small pill" title="Hide: shrink to a small pill">' + (window.FS_HIDE || 'Hide') + '</button><button class="btn primary" id="lvBig">Big</button>' + (S.sel ? '<button class="btn" id="lvRe">Re-route</button>' : '') + '<button class="btn" id="lvStop">Stop</button><button class="btn" id="lvFile" title="Keep this track in Tracks, offer it as GPX and start a fresh one">File track</button><button class="btn" id="lvClr">Clear track</button><button class="btn lvi" id="lvInfo" aria-label="What these mean" title="What these mean">i</button><span class="lvl" style="align-self:center;margin-left:auto">' + (f.dr ? '<b class="lvwarn">DR ±' + (f.rad < 0.1 ? Math.round(f.rad * 1852) + ' m' : f.rad.toFixed(2) + ' nm') + '</b>' : 'GPS ±' + Math.round(f.acc || 0) + ' m') + '</span></div>';
    $('lvBig').onclick = function () { LIVE.big = true; liveShow(); }; $('lvMin').onclick = function () { LIVE.mini = true; LIVE.info = false; store('fs-livemini', '1'); liveShow(); followBoat(); draw(); }; $('lvInfo').onclick = function () { LIVE.info = !LIVE.info; liveShow(); }; if ($('lvInfoX')) $('lvInfoX').onclick = function () { LIVE.info = false; liveShow(); }; $('lvStop').onclick = function () { liveStop(); }; $('lvClr').onclick = function () { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); }; if ($('lvFile')) $('lvFile').onclick = function () { if (!window.FSTracks) return; var ok = FSTracks.file(LIVE.trail.slice(), (meta && meta.course && meta.course.name) || ''); if (ok) { LIVE.trail = []; store('fs-livetrail', '[]'); draw(); } }; if ($('lvRe')) $('lvRe').onclick = liveReroute;
    $('liveBig').hidden = !LIVE.big; $('liveBig').classList.toggle('alarm', alarm);
    if (LIVE.big) {
      var cell = function (k, v, sub, cls) { return '<div class="' + (cls || '') + '"><small>' + k + '</small><b>' + v + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; };
      $('liveBig').innerHTML = '<div class="lbg">' + cell('SOG', sog) + cell('COG', cog) + cell('Off track', xs, xte ? (xte.d < 0.05 ? 'on the planned route' : xte.side === 'L' ? 'left of the planned route' : 'right of the planned route') : '', offX ? 'warnc' : '') + cell('Plan', as, xte ? (Math.abs(c.ahead) < 1 ? 'on plan' : c.ahead > 0 ? 'ahead of the plan' : 'behind the plan') : '', offB ? 'warnc' : '') +
        cell('To plan position', c.toPlan ? p3(c.toPlan.brg) : '--', c.toPlan ? n1(c.toPlan.nm) + ' nm' : tp) + cell(rj && rj.kind === 'catch' ? 'Catch the plan: steer' : 'Back on track: steer', rj ? p3(rj.steer) : '--', rj ? rjt : (S.sel ? 'On plan' : '')) + '</div>' +
        (LIVE.info ? liveInfo().replace('id="lvInfoX"', 'id="lbInfoX"') : '') + '<div class="lvx"><button class="btn primary" id="lbChart">Chart</button>' + (S.sel ? '<button class="btn" id="lbRe">Re-route from here</button>' : '') + '<button class="btn" id="lbStop">Stop GPS</button><button class="btn lvi" id="lbInfo" aria-label="What these mean" title="What these mean">i</button></div>';
      $('lbChart').onclick = function () { LIVE.big = false; liveShow(); }; $('lbInfo').onclick = function () { LIVE.info = !LIVE.info; liveShow(); }; if ($('lbInfoX')) $('lbInfoX').onclick = function () { LIVE.info = false; liveShow(); }; $('lbStop').onclick = function () { liveStop(); }; if ($('lbRe')) $('lbRe').onclick = function () { LIVE.big = false; liveReroute(); };
    }
  }
  function liveReroute() {
    var f = LIVE.fix; if (!f) return; if (S.running) { LIVE.queue = true; LIVE.cmp = 'Route is still working on the last routes: it will route from the boat as soon as they finish.'; liveShow(); return; } var nowH = (Date.now() / 1000 - T0) / 3600;
    if (nowH > HMAX() - 1 || !inData({ lat: f.la, lon: f.lo })) { $('runNote').textContent = 'Cannot re-route: the boat or now is outside the forecasts.'; return; }
    LIVE.planFin = S.sel && S.sel.r ? S.sel.r.finish : null; LIVE.cmp = 'Routing from the boat…';
    S.from = { lat: f.la, lon: f.lo, t: nowH, gps: true }; run(); liveShow();
  }
  function liveAfterRoute() {   /* a fresh route from the boat: its finish against the plan it replaces */
    if (LIVE.queue && !S.running) { LIVE.queue = false; setTimeout(liveReroute, 50); return; }
    if (!LIVE.on || LIVE.planFin == null || !S.sel || !S.sel.r) return; var d = (S.sel.r.finish - LIVE.planFin) * 60;
    LIVE.cmp = 'Fresh route from the boat: finish ' + clockAbs(T0 + S.sel.r.finish * 3600) + ' ' + tzS1() + ', ' + (Math.abs(d) < 1 ? 'the same as the plan' : Math.abs(Math.round(d)) + ' min ' + (d < 0 ? 'earlier' : 'later') + ' than the plan') + '. It is now the plan.';
    LIVE.planFin = null; if (LIVE.fix) { try { LIVE.calc = liveCalc(LIVE.fix); } catch (e) {} liveShow(); }
  }
  window.__fsTrail = function () { return LIVE.trail; };
  /* tide gate (Stuart 15 Nov 11:26 to 11:39): the chosen tide model at a place and time, the AIS boats, our TCC */
  /* Stuart 19 Nov 17:33: the tide timing slider moves the time the tidal stream applies (minutes, + = later); the same shift as the routes (adjust, ttime) */
  function tideShiftH() { var el = $('adjTtime'); if (!el || ($('adjWhere') && $('adjWhere').value === 'box')) return 0; return (+el.value || 0) / 60; }
  window.__fsTideShift = function () { return Math.round(tideShiftH() * 60); };
  window.__fsTideAt = function (la, lo, ep) { try { var ts = $('tideSel') && $('tideSel').value; if (!ts || !P.tide[ts]) return null; var td = FSRouter.tideSampler(P, ts)(la, lo, ((ep || Date.now() / 1000) - T0) / 3600 - tideShiftH()); return td && td[0] === td[0] ? td : null; } catch (e) { return null; } };
  window.__fsAisList = function () { try { return AIS.tg.list(); } catch (e) { return []; } };
  /* FirstShift Mark's own screen (Stuart 16 Nov 22:25, rebuilt from the brief): what it reads from and sets in the shared engine */
  window.__fsCalc = function () { return LIVE.on ? LIVE.calc : null; };
  window.__fsLineCalc = function (gun) { var f = LIVE.fix; return f ? lineCalc(f, gun || (+$('startSel').value || Date.now() / 1000 + 600)) : lineGet(); };
  window.__fsGunAt = function () { var v = +(($('startSel') || {}).value || 0); return v > 0 && S.startChosen ? v : null; };   /* F44: the class gun for the start kit, only once the crew has chosen their class start (the default start is a planning guess) */
  window.__fsSpeed = function () { try { return speedFn(opts(S.sel ? S.sel.models : cardModels())); } catch (e) { return null; } };   /* F45: the boat's polar, for pointing at slow speed on the start screen */
  (function () { var mq = window.matchMedia ? matchMedia('(max-width:899px) and (orientation:portrait), (max-width:899px) and (min-height:501px)') : null;   /* man overboard: the left end of the button row on a wide screen, the left of the time slider on a phone */
    function mobPlace() { var m = $('mobBtn'), t = $('trow'), g = document.querySelector('#bar .pgrp'); if (!m || !t || !g) return; if (mq && mq.matches) { if (m.parentNode !== t) t.insertBefore(m, t.firstChild); } else if (m.parentNode !== g) g.insertBefore(m, g.firstChild); }
    mobPlace(); if (mq) { if (mq.addEventListener) mq.addEventListener('change', mobPlace); else if (mq.addListener) mq.addListener(mobPlace); } })();
  function wzLineMark() { var st = document.querySelector('#wiz .wzst'), b = $('wzLine'); if (!st || !b) return; var l = lineGet(), on = !!(l && l.boat && l.pin); st.textContent = on ? '✓ set' : 'optional'; st.classList.toggle('ok', on); b.textContent = on ? 'Change start line' : 'Set start line'; var nt = $('wzLnNote'); if (nt) nt.textContent = on ? 'Both ends are set. Change it here.' : 'The RYS or JOG line, or your own. Without it, Route starts from the course start and the start screen has no time to burn.'; }   /* the Start step shows the line as soon as it is set */
  window.__fsStartStep = function () { cardStep(3); };   /* B (Stuart 20 Nov 13:58): Start screen with no start time opens the Start step */
  window.__fsGun = function (ep) { if (!(ep > 0)) return; try { setStart(ep, true); startChosen(true); } catch (e) {} };
  (function () { var o = window.__fsFix, f = function (x) { if (x) { Object.assign(FIX, x); store('fs-fix', JSON.stringify(FIX)); } return Object.assign({}, FIX); }; if (o) Object.keys(o).forEach(function (k) { f[k] = o[k]; }); window.__fsFix = f; })();   /* callable, and keeps html, bind, set and state for the Solent step box (17 Nov: the second definition had dropped them) */
  window.__fsRouteNow = function () { if (S.running) return false; S.key = null; S.cleared = false; run(); return true; };
  window.__fsTcc = function () { var v = +($('tcc') || {}).value; return v > 0 ? v : 1; };
  window.__fsAstroCtx = function () { var st = meta && meta.course && meta.course.start, f = LIVE.on && LIVE.fix; return { at: (typeof T0 === 'number' ? (T0 + S.t * 3600) * 1000 : Date.now()), lat: f ? f.la : st ? st.lat : null, lon: f ? f.lo : st ? st.lon : null, where: f ? 'the boat' : st ? 'the start' : '' }; };   /* Astro (Stuart 15 Nov 11:45) */   /* N: tracks.js reads the trail to file it */
  window.__fsShowTracks = function () { return S.show.tracks !== false; };
  function liveDraw() {
    var f = LIVE.fix, c = LIVE.calc || {};
    if (!LIVE.on && LIVE.trail.length < 2 && !store(lineKey())) return;
    ctx.save();
    var nNight = document.documentElement.hasAttribute('data-night');   /* the boat's track and mark dimmed at night (Stuart 13 Nov) */
    var trk = S.show.tracks !== false;   /* N (Stuart 15 Nov): Hide all tracks, in Layers */
    if (trk && LIVE.trail.length > 1) { ctx.strokeStyle = nNight ? '#6A1410' : '#4CC38A'; ctx.globalAlpha = nNight ? 0.6 : 0.8; ctx.lineWidth = nNight ? 1.5 : 2; ctx.beginPath(); LIVE.trail.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!LIVE.on || !f) { ctx.restore(); return; }
    if (f.dr) {   /* the reckoned track dashed, the boat hollow, and the circle of doubt */
      var dt0 = LIVE.drTrack || []; if (trk && dt0.length > 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = nNight ? '#8A2A20' : '#F2B233'; ctx.lineWidth = 2; ctx.beginPath(); dt0.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.stroke(); ctx.restore(); }
      var rpx = Math.max(10, f.rad / 60 * view.s); ctx.save(); ctx.beginPath(); ctx.arc(X(f.lo), Y(f.la), rpx, 0, 2 * Math.PI); ctx.fillStyle = nNight ? 'rgba(138,42,32,.12)' : 'rgba(242,178,51,.14)'; ctx.fill(); ctx.setLineDash([4, 4]); ctx.strokeStyle = nNight ? '#8A2A20' : '#F2B233'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    var x = X(f.lo), y = Y(f.la);
    var shc = c.shift; if (shc && !shc.off && shc.kind !== 'steady') { ctx.save(); var col = shc.kind === 'lift' ? '#3DDC84' : '#E5484D', tx = x + 18, ty = y - 26, lab = (shc.kind === 'lift' ? '▲ LIFT ' : '▼ HEADER ') + shc.deg + '°'; ctx.font = '700 13px Inter, sans-serif'; var tw = ctx.measureText(lab).width, dyh = lbFit(tx - 4, ty - 13, tw + 8, 19, 4); ty += dyh || 0; ctx.fillStyle = 'rgba(10,20,30,.8)'; ctx.fillRect(tx - 4, ty - 13, tw + 8, 19); ctx.fillStyle = col; ctx.textBaseline = 'alphabetic'; ctx.fillText(lab, tx, ty + 1); ctx.restore(); }   /* header or lift beside the boat (18:40) */
    var lnd = lineGet(); if (!window.FS_MARK && (lnd.boat || lnd.pin)) { ctx.save(); ctx.font = '700 10px Inter, sans-serif'; ctx.fillStyle = '#4CC38A'; ['boat', 'pin'].forEach(function (k) { var q = lnd[k]; if (!q) return; ctx.beginPath(); ctx.arc(X(q[1]), Y(q[0]), 5, 0, 7); ctx.fill(); ctx.fillText(k === 'boat' ? 'BOAT' : 'PIN', X(q[1]) + 8, Y(q[0]) - 6); });
      if (lnd.boat && lnd.pin) { ctx.strokeStyle = '#4CC38A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(lnd.boat[1]), Y(lnd.boat[0])); ctx.lineTo(X(lnd.pin[1]), Y(lnd.pin[0])); ctx.stroke(); var lf = c.pre && c.pre.line && c.pre.line.fav; if (lf) { var q2 = lnd[lf]; ctx.fillText('FAVOURED', X(q2[1]) + 8, Y(q2[0]) + 8); } } ctx.restore(); }
    if (c.pre && !(lnd.boat && lnd.pin) && meta.course && meta.course.start) { var sx = X(meta.course.start.lon), sy = Y(meta.course.start.lat); ctx.strokeStyle = '#4CC38A'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]); }   /* before the gun: the way to the start */
    if (c.plan) { ctx.strokeStyle = css['--ink']; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X(c.plan.lo), Y(c.plan.la)); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(X(c.plan.lo), Y(c.plan.la), 7, 0, 7); ctx.stroke(); ctx.fillStyle = css['--ink']; ctx.font = '600 10px Inter, sans-serif'; ctx.fillText('PLAN NOW', X(c.plan.lo) + 10, Y(c.plan.la) + 4); }
    if (c.rejoin) { ctx.strokeStyle = css['--warn']; ctx.setLineDash([7, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X(c.rejoin.lo), Y(c.rejoin.la)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = css['--warn']; ctx.beginPath(); ctx.arc(X(c.rejoin.lo), Y(c.rejoin.la), 4.5, 0, 7); ctx.fill(); }
    if (f.acc && f.acc > 30) { ctx.globalAlpha = 0.15; ctx.fillStyle = '#4CC38A'; ctx.beginPath(); ctx.arc(x, y, Math.max(6, f.acc / 1852 / 60 * view.s), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    if (f.dr) ctx.setLineDash([3, 3]);   /* the reckoned boat: amber and dashed, not the green GPS boat */
    triMark(x, y, f.cog != null && f.sog > 0.5 ? f.cog : 0, 12, css['--panel'], f.dr ? (nNight ? '#8A2A20' : '#F2B233') : nNight ? '#9A2A1A' : '#4CC38A', nNight ? 2 : 3); ctx.setLineDash([]);
    ctx.restore();
  }
  /* ---------- server pre-routes: the forecast job routes each race for the standard settings, so most users see routes at once ---------- */
  function loadPre() {
    S.pre = null;
    if (window.FS_MARK) return Promise.resolve();   /* Mark: no offshore pre-made routes */ return fetch('pre/routes.json?b=' + encodeURIComponent(meta.built || meta.t0)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.built === (meta.built || meta.t0)) S.pre = j; }).catch(function () {});
  }
  function startPt() { return S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 }; }
  function liteKey(base, st) { return JSON.stringify([base.polKey, Math.round(st.t * 100), st.lat.toFixed(4), st.lon.toFixed(4), meta.course.raceId || '', meta.course.marks.map(function (m) { return (m.side || '') + m.lat.toFixed(3) + m.lon.toFixed(3); }), meta.course.finish.lat.toFixed(3) + meta.course.finish.lon.toFixed(3), base.tackS, base.gybeS, base.safety, base.margin, base.sea.up, base.sea.reach, base.sea.surf, base.adj].concat(base.tideWind === false ? ['ground wind'] : [], base.polZ !== 10 ? ['z' + base.polZ + (base.stab ? 's' : '')] : [])); }
  function fullKey(base, st) { return JSON.stringify([liteKey(base, st), base.models.slice().sort(), base.tide, base.wave, base.nogo.length]); }
  function preEntry(full) {
    if (!S.pre || S.from) return null;
    var base = opts(full ? selectedModels() : []), st = startPt(), e = null;
    var R = S.pre.r || S.pre.files || {}, get = function (k) { return S.pre.r ? S.pre.r[k] : S.pre.files[k] ? { file: S.pre.files[k] } : null; };   /* one file per start time (20 Nov), or the older single file */
    if (full) e = R[fullKey(base, st)] ? get(fullKey(base, st)) : null;
    else { var lk = liteKey(base, st); Object.keys(R).some(function (k) { if (JSON.parse(k)[0] === lk) { e = get(k); return true; } return false; }); }
    return e ? { e: e, base: base, st: st } : null;
  }
  function usePre(h, early) {
    if (h.e.file) { var f = h.e.file; return fetch('pre/' + f + '?b=' + encodeURIComponent(meta.built || meta.t0)).then(function (r) { if (!r.ok) throw new Error('pre-route file ' + f); return r.json(); }).then(function (j) { h.e = j; return usePre(h, early); }); }
    S.routes = h.e.routes; S.matrix = h.e.matrix; S.cur = h.e.cur && h.e.cur.length ? h.e.cur : null; S.sel = S.routes.filter(function (s) { return s.best; })[0] || S.routes[0];
    S.base = Object.assign({}, h.base, { models: S.sel.models }); S.legs = legsFor(null); S.start = h.st; S.ghosts = [];
    $('runNote').textContent = 'Routed on the server ' + clockAbs(S.pre.at) + (early ? '; forecasts still loading for the replay.' : '. Change any setting and Route works it out on your device.') + (S.cur ? ' The faint line is the standard route.' : '');
    return (early ? Promise.resolve() : ghosts()).then(show);
  }
  function earlyPre() { if (startGate() || S.wizHold || courseIssue(meta.course)) return; var h = preEntry(false); if (h && !S.routes.length) { try { usePre(h, true).catch(function () {}); } catch (e) {} } }
  function show() {
    setTimeout(function () { if (window.__navAfterRoutes) try { window.__navAfterRoutes(); } catch (e) {} }, 0);   /* Deck view keeps only the chosen route after new routes */
    busy(''); matrix(); plan(); fleetTable(); if (!$('layers').hidden) layersPop();
    var maxT = Math.max.apply(null, S.routes.map(function (s) { return s.r.finish; }));
    S.tmin = Math.min(S.start.t, (starts[0] - T0) / 3600); S.tmax = Math.min(HMAX(), maxT + 1);
    try { setTime(S.from ? S.from.t : S.start.t); } catch (e) { draw(); }
  }
  window.__fsDump = function () { return S.key ? { key: S.key, routes: S.routes.map(function (s) { return { id: s.id, name: s.name, models: s.models, combined: !!s.combined, best: !!s.best, mean: s.mean, worst: s.worst, r: s.r }; }), matrix: S.matrix, cur: (S.cur || []).map(function (s) { return { id: s.id, r: { finish: s.r.finish, path: s.r.path.map(function (q) { return { t: q.t, la: q.la, lo: q.lo }; }) } }; }) } : null; };
  /* Stuart 22 Nov 07:18 (Cervantes, "No action when tapped"): a tap on Route or Route again is the crew asking for routes, so it never
     does nothing in silence. A course put away by an inshore race, a set-up hold left behind by a closed window, or a run with no progress
     for two minutes no longer swallow the tap; anything else that stops it says why. */
  function userRun() {
    if (S.edit) return run();   /* run() explains the edit */
    S.cleared = false;
    if (S.wizHold && $('wiz').hidden && !S.card) S.wizHold = false;
    if (S.running) { var still = Date.now() - Math.max(S.runSince || 0, S.progAt || 0); if (still < 120000) { busy('Routing is already under way: the routes come up when it finishes.'); setTimeout(function () { busy(''); }, 3500); return; } S.gen = (S.gen || 0) + 1; S.running = false; }
    if (S.wizHold) { busy('Finish the set-up window first, then Route.'); setTimeout(function () { busy(''); }, 3500); return; }
    run();
  }
  function run() {
    if (S.cleared) return;   /* inshore with no Solent race yet (Stuart 16 Nov 08:00): nothing routes until one is chosen */
    try { adjPill(); } catch (e) {}   /* the chart note follows the race's own tide by leg too */
    if (S.edit && $('races').hidden) { $('editBar').hidden = false; editPrompt(); draw(); busy('The course is still being edited: tap Done, then Save and route. Or Cancel.'); setTimeout(function () { busy(''); }, 4000); }   /* a hidden edit would block routing with no sign why */
    if (S.running || S.wizHold || S.edit || QS0.get('new') && !S.newDone) return;   /* drawing a new course: nothing routes until it is saved */
    if (startGate()) { busy(''); if (S.card || ($('sheet') && !$('sheet').hidden) || !$('wiz').hidden) return; showCard(); return; }   /* never jump to the card while the boat, forecasts or start are being edited */   /* start not chosen: the set-up card says so */
    if (!$('startSel').value && $('startSel').options.length) $('startSel').selectedIndex = 0;   /* never route from 1 January 1970 */
    var fu = futureGet(); if (fu) { if (!beyond(fu.ep)) { futureDrop(); setStart(fu.ep); } else { S.routes = []; S.sel = null; busy(''); prog(''); openTab('decision'); $('runNote').textContent = 'Start ' + clockAbs(fu.ep) + ' ' + tzS1() + ' is beyond the forecasts, which reach ' + clockAbs(startRange()[1]) + ' ' + tzS1() + '. Route will work out the routes once the forecasts reach the start, about ten days before. Choose an earlier start to route now.'; if ($('finBox')) $('finBox').innerHTML = ''; draw(); return; } }
    S.ens = null; if ($('ensOut')) $('ensOut').innerHTML = '';   /* an ensemble belongs to the routes it was run with */
    if (!S.from) S.to = null;   /* routing to a tapped point lasts until the next ordinary route */
    var sp = S.inshore && meta.course && meta.course.race && meta.course.race.solPlan;
    if (sp && !sp.route && !S.from && !S.to) {   /* a Solent race without routing (Stuart 16 Nov 18:30): the course and a list of bearings and distances, no forecasts */
      S.gen = (S.gen || 0) + 1; S.routes = []; S.sel = null; S.ghosts = []; S.legs = legsFor(null); S.running = false; busy(''); prog(''); if ($('finBox')) $('finBox').innerHTML = '';
      if ($('runNote')) $('runNote').textContent = 'Not routed: the course list shows the bearing and distance of each leg.'; try { if (window.FSSolent && FSSolent.showList) FSSolent.showList(true); } catch (e) {} draw(); return; }
    var ms = selectedModels(); if (sp && sp.route) { var pick = (sp.models && sp.models.length ? sp.models : sp.model ? [sp.model] : []).filter(function (m) { return ms.indexOf(m) >= 0; }); if (pick.length) ms = pick; }   /* FirstShift Mark routes on the models chosen, 1 to 6, plus Fixed wind (Stuart 16 Nov 19:35) */
    if (!ms.length) { openTab('decision'); $('runNote').textContent = 'Tick at least one downloaded wind model in Settings, Forecasts.'; return; }
    if (!P.depth) { openTab('data'); $('dlNote').textContent = 'Download the seabed depth first: the router needs it to keep off the land.'; return; }
    var issue = courseIssue(meta.course); if (issue) { openTab('decision'); $('runNote').textContent = issue; busy(issue); setTimeout(function () { busy(''); }, 4000); return; }
    if (!S.from && !S.resumeTried) { S.resumeTried = true; var own = (!S.resume || S.resume.rk !== raceKey()) && sessFor(raceKey()); if (own) { S.resume = own; if (+own.startVal > 0 && !(S.keptGun && S.keptGun !== +own.startVal)) setStart(+own.startVal, true); S.startChosen = true; } }   /* first routing after opening: this race's own kept routes */
    if (S.resume && !S.from) { var rs = S.resume; S.resume = null; if (rs.rk === raceKey() && +rs.startVal > 0 && rs.startVal !== $('startSel').value && !(S.keptGun && S.keptGun !== +rs.startVal)) { setStart(+rs.startVal, true); S.startChosen = true; }   /* the same race: its start as it was, even an exact or past one the start list no longer holds */
      if (rs.rk !== raceKey() || rs.startVal !== $('startSel').value) { if (!(S.keptGun && S.keptGun === +$('startSel').value)) { S.startChosen = false; if (startGate()) return run(); } } else {   /* F93: a start kept for the countdown stays chosen; the routes are worked out again for it */
       S.running = true; chipStart(); sessRestore(rs).then(function () { S.running = false; sessAsk(); }, function () { S.running = false; S.routes = []; run(); }); return; } }
    var hit = !S.preBad && preEntry(true); if (hit) { S.running = true; usePre(hit, false).then(function () { S.running = false; setTimeout(sessSave, 0); }, function (e) { S.running = false; S.preBad = true; console.warn('pre-route failed, routing fresh', e && e.message); run(); }); return; }
    var sp0 = S.from ? { lat: S.from.lat, lon: S.from.lon, from: true } : (meta && meta.course ? meta.course.start : null);   /* where this route leaves from, for F6's advice */
    S.running = true; S.runSince = Date.now(); S.progAt = 0; S.progF = null; busy(''); S.key = null; var gen = S.gen = (S.gen || 0) + 1;   /* a newer run, or a new course, abandons this one */
    var tq = Date.now(), estQ = +(store('fs-estQ-' + raceKey()) || 0), estF = +(store('fs-estF-' + raceKey()) || 0);
    var RD = rdSec();   /* Routing detail (Stuart 20 Nov 12:44, 12:50): 0 for Quick, else the finer pass's sectors */
    /* the routing checklist (Stuart 20 Nov 15:18, "a tick box list as routing works"): each stage ticks as it finishes, with its time */
    S.ck = [{ k: 'fc', t: ms.length + ' forecast' + (ms.length > 1 ? 's' : '') + ' in', s: 'done' }, { k: 'q', t: 'First routes', s: 'wait' }, { k: 'std', t: 'Standard (360)', s: 'wait' }].concat(RD ? [{ k: 'fin', t: 'Finer (' + RD + ')', s: 'wait' }] : []).concat([{ k: 'chk', t: 'Checked in every forecast', s: 'wait' }]);
    S.cur = null; S.stdS = S.finS = null; pass(0).then(function () { try { var q = sessSave(true); if (q) store(sessKey(), JSON.stringify(q)); } catch (e) {} return pass(1); })   /* keep the quick routes too, in case Route is closed while it refines */
      .then(function () { if (gen !== S.gen) throw { abandoned: true }; S.stdS = ((Date.now() - tq) / 1000).toFixed(1); if (!RD) return; S.cur = S.routes.slice(); return pass(2, RD); })   /* the finer pass: the standard routes stay on the chart meanwhile, then faint under the finer ones */
      .then(function () { if (gen !== S.gen) return; S.running = false; setTimeout(sessSave, 0); prog(''); busy(''); store('fs-estF-' + raceKey(), String(Math.round((Date.now() - tq) / 1000 - (+S.quickS || 0)))); var tot = ((Date.now() - tq) / 1000).toFixed(1); if (RD) S.finS = tot; store(rdKey(rdGet()), String(Math.round(+tot))); rdNote(); ckSet('chk', 'done');
        $('runNote').textContent += (RD ? ' Times: first routes ' + S.quickS + ' s, standard ' + S.stdS + ' s, finer ' + S.finS + ' s. The faint line is the standard route.' : '') + ' First answer in ' + S.quickS + ' s.' + shallowStartNote(); draw(); })
    .catch(function (e) { if (e && e.abandoned || gen !== S.gen) return; S.running = false; busy(''); prog(''); openTab('decision'); var fromFail = !!S.from; S.from = null; $('runNote').textContent = (fromFail ? 'Could not route from that point: ' : '') + e.message + (fromFail ? ' Route again goes back to the start.' : ''); errShow('Route could not finish: ' + e.message); try { depthOffer(e, sp0); } catch (x) {} draw(); });
    function pass(mode, rsec) { var quick = mode === 0, finer = mode === 2;
    var start = S.from ? { lat: S.from.lat, lon: S.from.lon, t: S.from.t } : { lat: meta.course.start.lat, lon: meta.course.start.lon, t: (+$('startSel').value - T0) / 3600 };
      var legs = legsFor(S.from), base = opts(ms), t0 = Date.now(); if (!quick) S.lastReq = { base: base, start: start, legs: legs };
      if (!quick) { try { var e7 = JSON.parse(store('fs-e7full') || 'null'); if (e7 && typeof e7 === 'object') Object.assign(base, e7); } catch (e) {} }   /* E7 full-search check: finer steps for the refined pass, set only by the automatic tests */
      if (finer) Object.assign(base, { sectors: rsec, secCap: 2 * rsec });   /* the finer pass (Routing detail) */
      if (quick) Object.assign(base, { dt: 1200, hstep: 10, sectors: 180, fine: false });   /* quick first pass: about a sixth of the work; the sectors stay coarse near marks too (fine: false, speed plan 1, Stuart 20 Nov 06:45): the first route is always replaced by the refined one, which keeps E2's full search */
      var sets = ms.map(function (m) { return { id: m, name: layer(m).name, models: [m] }; });
      if (ms.length > 1) sets.push({ id: 'all', name: 'Combined (' + ms.length + ' models)', models: ms, combined: true });
      var FINE = ['ukv', 'arome', 'icon', 'arpege', 'ecmwf', 'mog', 'om', 'gfs', 'aifs'], chain = FINE.filter(function (m) { return ms.indexOf(m) >= 0; });   /* finest first: each model where it is sharpest, handing over as it ends */
      if (chain.length > 1) sets.push({ id: 'chain', name: 'Finest first (' + chain.map(short).join(', ') + ')', models: ['chain'].concat(chain) });
      if (fixOn() && !S.to) sets.push({ id: 'fixed', name: 'Fixed wind ' + FIX.tws + ' kn from ' + ('00' + Math.round(FIX.twd)).slice(-3) + '°', models: [ms[0]], fixed: true, adj: fixAdj(base.adj) });
      var jobs = sets.length + ms.length, done = 0, title = quick ? 'Step 1 of ' + (RD ? 3 : 2) + ': first routes' : finer ? 'Step 3 of 3: finer routes' : 'Step 2 of ' + (RD ? 3 : 2) + ': refining the routes';
      var ckK = quick ? 'q' : finer ? 'fin' : 'std', ck0 = Date.now(); ckSet(ckK, 'run', 0);
      var tick = function () { if (gen !== S.gen) return; done++; ckSet(ckK, 'run', done / jobs); prog(title, done / jobs, done <= sets.length ? (quick ? Math.min(done, sets.length) + ' of ' + sets.length + ' first routes on the chart, more coming' : 'Routing ' + Math.min(done, sets.length) + ' of ' + sets.length + ' models') : 'Checking each route in every model', quick ? estQ : estF); };
      if (quick) S.prov = [];   /* speed plan 2 (Stuart 20 Nov 06:45): each first route goes on the chart as it is found, while the others are worked out */
      prog(title, 0.02, 'Routing 0 of ' + sets.length + ' models' + (quick ? '' : '. You can use the first routes meanwhile.'), quick ? estQ : estF);
      return Promise.all(sets.map(function (s) { return pool({ type: 'route', o: Object.assign({}, base, { models: s.models, start: start, legs: legs }, s.adj ? { adj: s.adj } : {}) }).then(function (r) { tick(); s.r = r; if (quick && gen === S.gen && S.prov && r && r.path) { S.prov.push(s); draw(); } return s; }, function (e) { tick(); s.err = e.message; return s; }); })).then(function (res) {
        if (gen !== S.gen) throw { abandoned: true };
        S.routes = res.filter(function (s) { return s.r; }); S.prov = null; S.cleared = false;   /* F103 (Stuart 21 Nov 07:35): routes on the chart mean the course is in use; the plotter and tide gate said No course loaded */
        var errs = res.filter(function (s) { return s.err; });
        if (!S.routes.length) throw new Error(errs.length ? errs[0].err : 'No route found.');
        /* E1 (19 Nov 2026): the re-timing now sails by the route's own rules, so a route re-timed in its own forecast takes its own time. The old
           patch, re-timing every route in its own forecast and scaling its row to match, is removed: one job per route less, and no scaling. */
        return Promise.all(ms.map(function (m) { return pool({ type: 'sail', o: Object.assign({}, base, { models: [m] }), paths: S.routes.map(function (s) { return s.r.path; }) }).then(function (x) { tick(); return x; }); })).then(function (allr) { if (gen !== S.gen) throw { abandoned: true };
          var cols = allr.slice(0, ms.length);
          S.matrix = { models: ms, cols: cols, start: start.t };
          S.routes.forEach(function (s, i) { var v = cols.map(function (c) { return c[i]; }); s.mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length; s.worst = Math.max.apply(null, v); });
          var rank = function (x) { return (x.fixed ? 2e6 : 0) + (x.r.partial ? 1e6 + x.r.partial.togo : x.mean); };   /* the Fixed wind route is shown, never picked as best */   /* a route cut short by the end of the forecasts ranks by distance still to sail */
          var best = S.routes.slice().sort(function (a, b) { return rank(a) - rank(b); })[0];
          S.routes.forEach(function (s) { s.best = s === best; });
          S.sel = best; S.base = base; S.legs = legs; S.start = start;
          var part = S.routes.filter(function (x) { return x.r.partial; });
          $('runNote').textContent = (quick ? 'Quick route in ' : finer ? 'Finer routes in ' : 'Routed in ') + ((Date.now() - t0) / 1000).toFixed(1) + ' s' + (quick ? '. Refining…' : !finer && RD ? '. Finer routes coming…' : '') + (errs.length ? '. ' + errs.map(function (e) { return e.name + ': ' + e.err; }).join(' ') : '.') + (part.length ? ' The forecasts end before the finish on ' + (part.length === S.routes.length ? 'every route' : part.length + ' routes') + ': they show as far as the forecasts reach, with the distance still to sail. Choose an earlier start for a full route.' : '') + (S.to ? ' These routes go from the boat to the point you tapped. Route again goes back to the course.' : '');
          /* E7 / F75 (20 Nov): the optimiser can be beaten. Each route is sailed in every forecast (the matrix); where another route's track is
             quicker in a model's own forecast than that model's own route, say so: the best known route in that forecast is that track */
          S.beaten = []; ms.forEach(function (m, j) { var i = -1; S.routes.forEach(function (x, k) { if (x.id === m) i = k; }); if (i < 0) return; var c = cols[j], bi = i; c.forEach(function (v, k) { if (v < c[bi]) bi = k; }); var d = (c[i] - c[bi]) * 60; if (bi !== i && d >= 0.5) S.beaten.push({ model: m, name: S.routes[i].name, by: S.routes[bi].name, min: d }); });
          if (S.beaten.length) $('runNote').textContent += ' Best known: ' + S.beaten.map(function (q) { return 'in ' + q.name + '\u2019s forecast the ' + q.by + ' track is ' + q.min.toFixed(1) + ' min quicker than its own route'; }).join('; ') + '.';
          var edge = edgeHit(); if (edge) $('runNote').textContent += ' ' + edge;   /* shown in the checks list, not as an error */
          return ghosts();
        });
      }).then(function () {
        show(); ckSet(ckK, 'done', null, ((Date.now() - ck0) / 1000).toFixed(1)); if (!quick && !S.from) S.key = fullKey(Object.assign({}, base, { models: ms }), start);
      }).then(function () { if (quick) { S.quickS = ((Date.now() - tq) / 1000).toFixed(1); store('fs-estQ-' + raceKey(), String(Math.round(+S.quickS))); } });
    }
  }
  var TS = typeof WeakMap === 'function' ? new WeakMap() : null;
  /* a one-model route whose forecast stops before the finish (UKV, AROME): when it hands over to the other models (model spread test, 13 Nov) */
  function handOver(s) { if (!s || s.combined || !s.models || s.models.length !== 1 || !s.r || s.r.partial) return null; var f = P.wind[s.models[0]]; if (!f || !f.hours || f.hours.length < 2) return null; var e = f.hours[f.hours.length - 1]; return e < s.r.finish ? e : null; }
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
    $('startChip').onclick = function (e) { e.stopPropagation(); cardStep(3); };
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
    return poolShort({ type: 'times', o: Object.assign({}, S.base, { models: S.sel.models }), path: S.sel.r.path, tccMe: +$('tcc').value || 1, boats: boats.map(function (b) { return { tcc: b.tcc, start: b.start }; }) }).then(function (ts) {
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
      h += '<tr class="click' + (s === S.sel ? ' sel' : '') + '" data-i="' + i + '"><td style="font-family:var(--f-body)">' + swatch(s) + (s.combined ? 'Combined' : short(s.id)) + (s.best ? ' <span class="pill">best</span>' : '') + '</td><td style="white-space:nowrap">' + (s.r.partial ? '<b>' + s.r.partial.togo + ' nm</b><br><span style="color:var(--muted)">to go: forecast ends ' + clockH(s.r.finish).slice(0, 3) + ' ' + clockH(s.r.finish).slice(-5) + '</span>' : '<b>' + clockH(s.r.finish).slice(0, 3) + ' ' + clockH(s.r.finish).slice(-5) + '</b><br><span style="color:var(--muted)">' + fmtH(s.r.finish - M.start) + '</span>' + (handOver(s) != null ? '<br><span style="color:var(--muted);font-size:11px" title="This model\'s forecast ends before the finish; the route carries on with the other models">' + short(s.id) + ' to ' + clockH(handOver(s)).slice(0, 3) + ' ' + clockH(handOver(s)).slice(-5) + ', then others</span>' : '')) + '</td>' +
        M.models.map(function (m, j) { return '<td class="' + (Math.abs(M.cols[j][i] - mins[j]) < 1e-6 ? 'best' : '') + '">' + fmtH(M.cols[j][i] - M.start) + '</td>'; }).join('') +
        '<td class="' + (s.best ? 'best' : '') + '">' + fmtH(s.mean - M.start) + '</td><td>' + fmtH(s.worst - M.start) + '</td></tr>';
    });
    $('matrix').innerHTML = h; compareTable();
    [].forEach.call($('matrix').querySelectorAll('tr.click'), function (tr) { tr.onclick = function () { S.sel = S.routes[+tr.dataset.i]; ghosts().then(function () { matrix(); plan(); fleetTable(); update(); }); }; });
    var best = S.routes.find(function (s) { return s.best; }), fins = S.routes.map(function (s) { return s.r.finish; }), spread = Math.max.apply(null, fins) - Math.min.apply(null, fins);
    var comb = S.routes.find(function (s) { return s.combined; });
    var fastT = Math.min.apply(null, S.routes.filter(function (s) { return !s.r.partial; }).map(function (s) { return s.r.finish; }).concat([Infinity]));
    $('finBox').innerHTML = S.routes.map(function (s) { var fast = !s.r.partial && s.r.finish === fastT; return '<div class="fin' + (s.combined ? ' comb' : '') + (fast ? ' fast' : '') + '" data-id="' + s.id + '"' + (fast ? ' title="Fastest model"' : '') + '>' + (fast ? '<i class="fastTag">❯❯ Fastest</i>' : '') + swatch(s) + '<span>' + (s.combined ? 'Combined (all models)' : short(s.id)) + '</span>' + (s.r.partial ? '<b>' + s.r.partial.togo + ' nm to go</b><em>forecast ends ' + clockH(s.r.finish).slice(4) + (fastT < Infinity ? '; other models carry on to the finish' : '') + '</em>' : '<b>' + clockH(s.r.finish).slice(4) + '</b><em>' + fmtH(s.r.finish - M.start) + (handOver(s) != null ? ' · ' + short(s.id) + ' to ' + clockH(handOver(s)).slice(0, 3) + ' ' + clockH(handOver(s)).slice(-5) + ', then the other models' : '') + '</em>') + '</div>'; }).join('');
    try { checksRender(); setupRender(); } catch (e) {}
    try { liveAfterRoute(); if (LIVE.on && LIVE.fix) { LIVE.calc = liveCalc(LIVE.fix); liveShow(); } } catch (e) {}
    /* K3 (Mark review, 19 Nov 2026): with one forecast there is nothing to compare, so no claim that a route "loses least on average" and no spread */
    var nM = S.matrix && S.matrix.models ? S.matrix.models.length : 0;
    $('decNote').innerHTML = nM < 2 ? 'One forecast only (' + (S.matrix && S.matrix.models && S.matrix.models[0] ? short(S.matrix.models[0]) : (best ? short(best.id) : 'one model')) + '): this route is that forecast’s best, with nothing to compare it against. Route with more forecasts ticked to see how it holds up if the forecast is wrong.'
      : 'Each row is a route; each column times it in one model’s wind, from ' + (S.from ? 'the chosen point' : 'your start') + '. The <b>' + (!best ? 'chosen' : best.combined ? 'combined' : short(best.id)) + '</b> route loses least on average across these ' + nM + ' forecasts if the forecast is wrong. The models’ own best times differ by ' + fmtH(spread) + (spread > 2 ? ': low confidence.' : '.') + ' Tap a row to show it.';
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
      if (r.leg !== leg) { leg = r.leg; h += '<tr><td colspan="8" style="font-family:var(--f-body);color:var(--muted)">To ' + (S.legs && S.legs.length ? S.legs[Math.min(leg, S.legs.length - 1)].name : 'the next mark') + '</td></tr>'; }
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
    ['Real charts', 'Layers, then Charts, adds buoys, beacons and lights from OpenSeaMap (OpenStreetMap contributors, licensed CC BY-SA). They load from the internet as you pan and zoom, so they need a signal, and show once you zoom in to a few miles across. This is not an official chart and is not for navigation: use your official paper or electronic charts for that. Signing in to your own GeoGarage (UKHO) or C-MAP account is being looked into for the phone app.'],
    ['Waypoints on the course', 'A course line never crosses land. Where a leg would, Route adds waypoints (small diamonds) that keep the line about 1 nm off the land where it can, closer in narrows such as Hurst, so each leg shows a course and distance a boat could sail. They are not rounding marks and the routes do not have to go through them. To change one, tap the pencil: waypoints appear with the marks, and you can drag them, delete them, add your own, or set any point to Mark (port or starboard), Waypoint: course line only, or Waypoint: routes must pass. Routes then go within 0.3 nm of a must-pass waypoint, for example to keep outside a tidal race. In Layers, Just the course shows only the course line, waypoints, courses and distances, with the traffic separation schemes.'],
    ['Chart orientation', 'The round compass above the edit button turns the chart. Tap it for North up (the normal chart), Course up (the GPS course over the ground is up, like a car satnav: needs Live GPS on and the boat moving over 1.5 knots, otherwise the chart stays north up and the compass dims) and Route up (the course to the next mark is up; steady through tacks, and it works without GPS). The red tip of the compass always points north. Text stays upright; the scale bar stays square to the screen.'],
    ['Live GPS while racing', 'Tap GPS by the timeline. Route shows the boat from this phone\'s own GPS, no boat wifi needed, with a long track behind it: tap the track for the time, SOG and COG there. It compares the boat with the chosen route: off track left or right, ahead or behind the plan, and the course and distance to where the plan says you should be now. Catch the plan gives the course to steer, speed and time to be level with the plan again, using the wind, tide and your polar now; if you cannot catch it, Back on the track gives the soonest way back onto the planned track. Re-route works out a fresh route from the boat and says how its finish compares. Big shows large numbers for the cockpit; Chart comes back. Hide shrinks the window to a small GPS live pill, green within your alert limits and orange past one, with off track and the minutes; tap the pill to open the window again. The round i on the window explains every figure and button. Set the alerts and the battery mode in Settings, Course, While racing. Keep the screen on: a web page cannot follow the GPS in the background. Heading is the GPS course over the ground. Not for navigation.'],
    ['Setting up a race', 'The first time, Route takes you through five steps: your boat, the race, the start, the boats you are racing, then a check card before it routes. After that, tap the race name at the top to set up the next race the same way. A new course drawn outside this page\'s forecasts moves to the area page that covers it. Until your boat is set up, an orange note says Route is using a generic boat.'],
    ['Routing while racing', 'Press From here: Route finds the boat by the phone or tablet GPS and routes from there, from now. If there is no GPS, tap the chart where the boat is. To keep the route fresh, Settings, Course, While racing: choose Every 10, 20 or 30 minutes and Route routes again from the new position on that timer while the screen is on.'],
    ['Route to any point', 'Tap the water anywhere on the chart (click on a computer). The boat is here: route the rest of the race takes that spot as the boat\'s position now (or at the slider time when you are looking ahead) and routes the rest of the race from it, in every model, with all the figures. Route to here (what if) works out the routes from where the boat is at the slider time to that point: useful for a waypoint, a tidal gate or a what-if. Route again goes back to the course.'],
    ['Family and friends', 'Settings, My set-up, Share with family and friends: tick Let family and friends follow the boat, then Send the follow link. While Route is open on a crew phone with a boat code, it sends the boat\'s GPS position every 15 minutes and the chosen route. With no signal the positions are kept on the phone and sent when the signal returns. The link carries the boat\'s own follow code, not the crew\'s boat code, so family can watch but cannot change anything. It opens a simple map with the track so far, the planned route and the finish time, in the viewer\'s own time.'],
    ['Isochrones', 'Layers, Isochrones of the chosen route. Each line is how far the boat could have got by that hour, sailing its fastest in every direction from the start or the last mark. The line nearest the slider time is drawn brighter, and every sixth hour is labelled. Where the lines bunch up, the boat is slow; where they bulge, the wind or tide is helping.'],
    ['Follow the boat', 'The button with the boat in a frame, beside the replay speed. When it is lit, moving the time slider or playing the race keeps the boat in the middle of the chart. Drag the chart to look elsewhere and it switches off; tap it to follow again.'],
    ['Your sails and reefs', 'Settings, Sails. Copy each sail from your sail log: the true wind angles and true wind speeds you use it in. Rows are checked from the top and the first that fits wins. Tick Show when to reef and enter the wind speed for each reef, upwind and downwind. The crossover chart colours each sail, marks the reefs and puts this route\'s winds on it as dots, so you can see any wind with no sail set. You can paste a chart grid from Expedition, PredictWind or SailGrib under Edit as text.'],
    ['Your boat', 'Settings, Boat. Pick a boat type, enter your TCC, or load your own polar. The three sliders tune the polar upwind, reaching and downwind: 95 percent means you expect to sail at 95 percent of the polar.'],
    ['If you think the forecast is wrong', 'Settings, Forecasts, at the foot. Shift the wind direction, change its strength, or make a front arrive earlier or later. You can do the same for the tide if you know the area better than the model. To change only part of the race, set Where to an area, tap Draw the area and tap two opposite corners on the chart: the change applies inside it and fades out over 3 nm. Close Settings and Route works it out again; Back to the forecast undoes it.'],
    ['Route from where you are', 'The target button reroutes from the boat\'s position now. On a phone or tablet it uses the GPS; otherwise tap the chart where the boat is.'],
    ['New forecasts', 'Route checks for new forecasts every few minutes. When one arrives, a button appears: New data, update routing. The Data tab shows each model\'s run time, when the server got it and how old it is.'],
    ['Forecast models and resolution', 'Resolution is the size of the grid a model works on: the finer it is, the more of the coast it sees. UKV and AROME, at 2 to 2.5 km, see headlands, the Solent and sea breezes, but run only about two days ahead. ICON-EU at 7 km and ARPEGE at 11 km reach three to four days. The global models, ECMWF, AIFS and GFS, come at a quarter of a degree, about 28 km by 18 km here: they cannot see local effects, but they are the best guide to the big picture beyond two days. How often a model gives a value matters too: AIFS gives one only every 6 hours, so it smooths out shifts. When the models disagree, check how old each run is, trust the fine models near the coast and in the first day, and treat light winds with care, because a knot either way changes the time a lot. The list below gives the grid and time step for each source.'],
    ['Move a window', 'Drag the small dots on any window over the chart (the plotter bar or the Layers box) to move it; let go and it stays. It never covers a button: it slides to the nearest gap. Drag it off the left or right side, or flick it there, and it tucks away to a light blue tab on that edge, clearing the screen for the chart; tap the tab to bring it back. Settings, Display, Window positions: Lock layout, the dots on the left, in the middle or on the right, and Reset to FirstShift layout. Positions are kept for each screen size and orientation.'],
    ['How old is each forecast', 'Under each finish time, and beside each model in Settings, Forecasts, is the time of the model run and how old it is. Runs of different ages can disagree for that reason alone. Leave out model runs older than, in Settings, Forecasts, drops stale runs from the routing; the newest runs always stay in, and ticking a model again keeps it. What the age means. Each run is named by its maker after the hour it starts from, in UTC: a 12Z run starts from the weather at 12:00 UTC. The age counts from that run time, set by the maker, not from when the forecast was downloaded. The Data tab shows those separately on the same row: server is when the FirstShift server received it, device is when this phone or computer downloaded it. The makers take several hours to publish each run, so a forecast that has just arrived is already some hours old; 9 to 12 hours is normal. Why the models often show the same age. The makers run on different timetables: UKV and MOGREPS every hour, AROME and ICON-EU every 3 hours, ECMWF, AIFS, GFS and ARPEGE every 6 hours. The server takes each model\u2019s newest 00Z, 06Z, 12Z or 18Z run, the hours every model shares, so the models usually come from the same run and are compared from the same starting weather. If a model\u2019s newest run is not ready, its previous run is kept and marked older run. For long races ECMWF\u2019s 00Z or 12Z run is used, as its 06Z and 18Z runs reach only 90 hours. A model more than 18 hours old on the server is fetched fresh on your device from Open-Meteo.'],
    ['Ask Route', 'In the Plan tab, Ask Route answers set questions from the chosen route at the replay time: the next mark, the next tack or gybe, the next sail change, the biggest wind shift in the next 12 hours, and what the tide is doing. Read it out speaks the answer.'],
    ['Send to the crew', 'Plan tab, Send to crew. On a phone choose WhatsApp, Messages or email. The message carries the finish times, the first legs and a link that opens the same course and start in Route on their phones.'],
    ['AIS', 'Settings, Display, AIS (in Route+ and Mark+: Settings, Instruments, beside the alarms). Test fleet shows emulated race boats and ships to try the screens; Live online shows real AIS from shore stations when you have signal. The Fleet tab lists every target with range, bearing, CPA and time to CPA; a target inside the CPA alarm flashes red and beeps.'],
    ['Man overboard', 'The red man overboard button (a stick man with his arms up) sits at the left end of the time bar at the bottom: on a phone, at the left of the time slider. It stays on the start screen and the deck screen. Press and hold it for one second. Route marks the position from the phone GPS, starts the clock and shows the bearing and distance back to where they went in, and to where the tide has probably carried them. Show on chart shrinks the panel so you can see both. Hold End MOB to finish. Route is no substitute for the boat\'s own MOB drill, the VHF DSC button and the Coastguard.'],
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
  /* Ask Claude (Stuart 17 Nov 07:33): "a Claude link on the help on all products that allow a user to ask questions about the tools which will
     produce very focused results due to an in built prompt". The link opens Claude (claude.ai/new?q=, the documented prefill) with a prompt
     that names the product, its version, what it does, where the user is in it and how to answer; the user adds the question and sends it. */
  function askClaudeUrl() {
    var plus = !!window.NAV_VERSION, P = window.FS_MARK ? (plus ? 'Mark+' : 'Mark') : (plus ? 'Route+' : 'Route'), ver = (/v([0-9.]+)/.exec(window.NAV_VERSION || VERSION) || [])[1] || '';
    var what = { 'Route': 'Route is a free web app for offshore race routing: several forecast models, tidal streams, depth, boat speed from a boat type or IRC TCC, routes to compare, a plan and crew brief, live GPS with a start-line tool and a basic plotter.',
      'Route+': 'Route+ is the Android app version of Route that also connects to the boat\'s instruments, learns and improves the boat\'s polars, and adds deck and helm views, a logbook, laylines with the tide and offline forecasts.',
      'Mark': 'Mark is FirstShift\'s inshore racing tool for the Solent, built on Route: round the cans and windward-leeward courses from the JOG / SCRA Solent mark list, start line tools (tap the ends, square to the wind, lat and long, ping) with the line bias, a start sequence timer, a racing window, laylines from the typed wind, crew sync by boat code and quick routing.',
      'Mark+': 'Mark+ is the Android app version of Mark that also connects to the boat\'s instruments for the live wind, depth and boat speed, and improves the boat\'s polars as Route+ does.' }[P];
    var tab = (document.querySelector('#panel .tabs .tab[aria-selected="true"]') || {}).textContent || '', race = ($('raceTitle') || {}).textContent || '', here = [];
    if (race) here.push('race: ' + race.trim().slice(0, 60)); if (tab) here.push('panel open: ' + tab.trim()); if (typeof LIVE !== 'undefined' && LIVE.on) here.push('Live GPS on'); if (document.body.classList.contains('navclear')) here.push('clear screen');
    var q = 'I am using FirstShift ' + P + (ver ? ' v' + ver : '') + ', a sailing tool from FirstShift: Yacht Racing Intelligence (firstshiftsailing.com). ' + what + ' Help pages: ' + location.origin + '/help/.' + (here.length ? ' Where I am in it now: ' + here.join('; ') + '.' : '') +
      ' Please answer my question about using ' + P + ': be brief and practical, name the exact buttons and menus as they appear in ' + P + ', give the steps in order, use British English, and say plainly if you are not sure rather than guessing. ' + P + ' is a planning aid, not for navigation.\n\nMy question: ';
    return { url: 'https://claude.ai/new?q=' + encodeURIComponent(q), name: P };
  }
  window.__fsAskClaude = askClaudeUrl;
  function helpInit() {
    (function () { var hb = document.querySelector('#help .sbody'); if (!hb || $('askClaude')) return; var d = document.createElement('div'); d.className = 'askcl'; d.innerHTML = (window.FS_MARK ? '' : '<button class="btn" id="demoGo" type="button">Watch the demo sail</button> ') + '<a class="btn" id="askClaude" target="_blank" rel="noopener" href="https://claude.ai/new">Ask Claude about this tool</a><p class="note">Opens Claude in a new window with a ready-made start: which tool, its version and where you are in it. Add your question and send. Needs a signal and a Claude account.</p>'; hb.insertBefore(d, hb.firstChild); if ($('demoGo')) $('demoGo').onclick = function () { $('help').hidden = true; if (window.FSDemo && !FSDemo.start()) {} }; var a = $('askClaude'), set = function () { var o = askClaudeUrl(); a.href = o.url; a.textContent = 'Ask Claude about ' + o.name; }; set(); a.addEventListener('pointerdown', set); a.addEventListener('focus', set); a.addEventListener('click', function (e) { set(); if (window.NativeLink && window.NativeLink.open) { e.preventDefault(); try { window.NativeLink.open(a.href); } catch (x) { location.href = a.href; } } }); })();   /* F11 / M23 */
    var PIC = { 'What Route does': 'overview', 'Routes': 'decision', 'Play the race': 'bar', 'Plan': 'plan', 'Setting up a race': 'setup', 'Your sails and reefs': 'sails', 'Your boat': 'boat', 'Routing while racing': 'course', 'Fleet': 'fleet' };
    $('helpList').innerHTML = HELP.map(function (h, i) { return '<div class="htopic"><h3>' + h[0] + '<button class="btn say" data-say="' + i + '">Listen</button></h3><p>' + h[1] + '</p>' + (PIC[h[0]] ? '<img class="hpic" loading="lazy" alt="Screen picture: ' + h[0] + '" src="../help/' + PIC[h[0]] + '.webp">' : '') + '</div>'; }).join('');
    [].forEach.call(document.querySelectorAll('[data-say]'), function (b) { b.onclick = function () { say([+b.dataset.say]); }; });
    $('sayAll').onclick = function () { say(HELP.map(function (h, i) { return i; })); };
    $('sayStop').onclick = sayStop;
    $('helpBtn').onclick = function () { $('help').hidden = false; };
    /* Stuart 19 Nov 18:30: Reload, "refresh, keep my place": the newest app and forecasts, the race, course, chart view and GPS kept, and no
       landing page or start-up question on the way back. The update bar uses the same reload. */
    window.__fsReload = function () { try { sessSave(); } catch (e) {} try { if (window.__navResume) window.__navResume.save(); } catch (e) {} try { sessionStorage.setItem('fs-keep', '1'); } catch (e) {} location.reload(); };
    if ($('setReload')) $('setReload').onclick = function () { window.__fsReload(); };
    if ($('updBar')) { $('updBar').onclick = function () { window.__fsReload(); }; setTimeout(updCheck, 8000); setInterval(updCheck, 5 * 60000); document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(updCheck, 1500); }); }
    if ($('editFab')) $('editFab').onclick = function () { startEdit(courseCopy()); };   /* drag the marks straight on the chart; Done re-routes */
    var suT = 0; document.addEventListener('change', function () { clearTimeout(suT); suT = setTimeout(function () { try { setupRender(); } catch (e) {} }, 300); }, true);   /* the set-up card follows every change */
    /* Help is a round ? on the chart, bottom right, the same on every screen (Stuart 12 Nov) */
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
      if (!navigator.share) { $('xNote').textContent = 'This browser cannot hand files to other apps: use Save GPX.'; return; }
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
  var cv = $('map'), ctx = cv.getContext('2d'), FT0 = ctx.fillText, CTX0 = ctx;
  CTX0.fillText = function (t, x, y, mw) { if (!ORI.ang || !ORI.turned) return mw == null ? FT0.call(CTX0, t, x, y) : FT0.call(CTX0, t, x, y, mw); CTX0.save(); CTX0.translate(x, y); CTX0.rotate(ORI.ang * R); if (mw == null) FT0.call(CTX0, t, 0, 0); else FT0.call(CTX0, t, 0, 0, mw); CTX0.restore(); };   /* text stays upright on a turned chart */
  var _unused0 = 0, W = 0, H = 0, dpr = 1, K = Math.cos(50.1 * R), view = { lo: -0.8, la: 50.15, s: 300 }, fitted = false;
  function resize() { var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); if (!fitted && W) { fit(); fitted = true; } }
  function resizeDraw() { resize(); draw(); }
  /* frame the whole course: start, marks, finish and the forecast band */
  function fit() {
    var top = 70, c = meta && (meta.course || {}), pts = [];
    if (c && c.start) pts = [c.start].concat(c.marks || []).concat([c.finish]).map(function (p) { return [p.lat, p.lon]; });
    ((c && c.band) || []).forEach(function (b) { pts.push([b[0], b[1]], [b[2], b[3]]); });
    if (!pts.length) { view.s = Math.min(W / (2.25 * K), (H - top) / 1.4); view.lo = -0.8; view.la = 50.15 + top / 2 / view.s; return; }
    var s = 90, n = -90, w = 180, e = -180; pts.forEach(function (p) { s = Math.min(s, p[0]); n = Math.max(n, p[0]); w = Math.min(w, p[1]); e = Math.max(e, p[1]); });
    var pad = 0.08; s -= (n - s) * pad; n += (n - s) * pad; w -= (e - w) * pad; e += (e - w) * (pad + 0.14);   /* more room east: mark names sit to the right of each mark */
    view.s = Math.max(20, Math.min(W / ((e - w) * K), (H - top - 90) / (n - s)));   /* a long course (the Fastnet) fits whole on a phone (Stuart 12 Nov) */ view.lo = (w + e) / 2; view.la = (s + n) / 2 + top / 2 / view.s;
  }
  function X(lo) { return (lo - view.lo) * K * view.s + W / 2; }
  function Y(la) { return (view.la - la) * view.s + H / 2; }
  /* chart orientation (Stuart 12 Nov): North up, Course up (GPS course over the ground) or Route up (the course to the next mark). The world is turned about cx, cy; text stays upright; touches are turned back */
  var ORI = { mode: (function () { var m = store('fs-orient'); return m === 'course' || m === 'route' ? m : 'north'; })(), ang: 0, cx: 0, cy: 0, pad: 0, sm: null };
  function oriTarget() {
    if (ORI.mode === 'course') { var f = LIVE.on && LIVE.fix; return f && f.cog != null && f.sog > 1.5 ? f.cog : null; }
    if (ORI.mode === 'route') { var la, lo, leg = 0;
      if (LIVE.on && LIVE.fix) { la = LIVE.fix.la; lo = LIVE.fix.lo; var c0 = LIVE.calc; leg = c0 && c0.xte && S.sel ? (S.sel.r.path[c0.xte.i + 1] || {}).leg || 0 : 0; }
      else if (S.sel && S.sel.r) { var pp = S.sel.r.path, ps = posAt(tsOf(pp), pp, S.t); if (!ps) ps = { la: pp[0].la, lo: pp[0].lo, i: 0 }; la = ps.la; lo = ps.lo; leg = (pp[Math.min(pp.length - 1, (ps.i || 0) + 1)] || {}).leg || 0; }
      if (la == null || !S.legs || !S.legs.length) return null; var lg = S.legs[Math.min(leg, S.legs.length - 1)], tg = lg.point || (lg.gate && lg.gate.a); if (!tg) return null;
      return rhumb({ lat: la, lon: lo }, { lat: tg[0], lon: tg[1] }).brg; }
    return null;
  }
  function oriUpdate() {
    var t = ORI.mode === 'north' || window.__fsNorthHold ? null : oriTarget();   /* the see-through start screen holds the chart north up (Stuart 18 Nov 19:44) */
    if (t == null) { ORI.ang = 0; ORI.sm = null; } else { if (ORI.sm == null) ORI.sm = t; else { var d = ((t - ORI.sm + 540) % 360) - 180; ORI.sm = (ORI.sm + d * 0.35 + 360) % 360; } ORI.ang = ORI.sm; }
    var bp = LIVE.on && LIVE.fix ? { la: LIVE.fix.la, lo: LIVE.fix.lo } : (S.sel && S.sel.r ? posAt(tsOf(S.sel.r.path), S.sel.r.path, S.t) : null);
    if (ORI.ang && follow && bp) { ORI.cx = X(bp.lo); ORI.cy = Y(bp.la); } else { ORI.cx = W / 2; ORI.cy = H / 2; }
    ORI.pad = ORI.ang ? Math.ceil(Math.hypot(W, H) / 2) : 0;
    var rb = $('oriBtn'); if (rb) { rb.querySelector('svg').style.transform = 'rotate(' + (-ORI.ang) + 'deg)'; rb.querySelector('.orl').textContent = ORI.mode === 'north' ? 'N UP' : ORI.mode === 'course' ? 'CRS UP' : 'RTE UP'; rb.classList.toggle('on', ORI.mode !== 'north'); rb.classList.toggle('idle', ORI.mode !== 'north' && !ORI.ang); }
  }
  function upright(x, y, fn) { if (!ORI.turned) return fn(x, y); ctx.save(); ctx.translate(x, y); ctx.rotate(ORI.ang * R); ORI.turned = false; try { fn(0, 0); } finally { ORI.turned = true; ctx.restore(); } }   /* draw a label square to the screen on a turned chart */
  function unrot(x, y) { if (!ORI.ang) return [x, y]; var a = ORI.ang * R, dx = x - ORI.cx, dy = y - ORI.cy; return [ORI.cx + dx * Math.cos(a) - dy * Math.sin(a), ORI.cy + dx * Math.sin(a) + dy * Math.cos(a)]; }   /* a point on the screen to where it is in the north-up chart */
  function evx(e) { return unrot(e.offsetX, e.offsetY)[0]; }
  function evy(e) { return unrot(e.offsetX, e.offsetY)[1]; }
  function LO(x) { return (x - W / 2) / (K * view.s) + view.lo; }
  function LA(y) { return view.la - (y - H / 2) / view.s; }
  var depthImg = null;
  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(c); if (!m) return [128, 128, 128]; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  /* the margin in metres for the depth squares loaded (Full about 230 by 150 m, Lite twice that) */
  function marginNote() { var el = $('marginV'); if (!el) return; var m = +($('margin') ? $('margin').value : 1), L = P.depth && P.depth.L; if (!m) { el.textContent = ''; return; } if (!L) { el.textContent = ''; return; } var ns = Math.round(m * Math.abs(L.dlat) * 111120 / 10) * 10, ew = Math.round(m * Math.abs(L.dlon) * 111120 * Math.cos((L.lat0 + L.ny * L.dlat / 2) * Math.PI / 180) / 10) * 10; el.textContent = 'about ' + ew + ' to ' + ns + ' m'; }
  /* the no-go (safety) depth has three sliders, Course tab, Chart tab and Layers panel, kept in step (Stuart 15 Nov 08:13) */
  function depthSet(v, quiet) { v = Math.max(0, Math.min(20, +v || 0)); var t = v.toFixed(1) + ' m'; [['depth', 'depthV'], ['depth2', 'depth2V'], ['lDepth', 'lDepthV']].forEach(function (p) { var el = $(p[0]); if (el && +el.value !== v) el.value = v; if ($(p[1])) $(p[1]).textContent = t; }); if (!quiet) { buildDepth(); draw(); } }
  function depthSquares() { return !!($('depthView') && $('depthView').value === 'squares'); }
  function depthChunks(F, L, nx, ny) {
    var job = depthChunks.job; if (job && job.F === F && job.coast === coastBits) return;
    job = depthChunks.job = { F: F, coast: coastBits, Z: new Float32Array(nx * ny), y: 0 };
    (function step() {
      if (depthChunks.job !== job) return; var t0 = Date.now();
      while (job.y < ny && Date.now() - t0 < 25) { var yy = job.y++; for (var xx = 0; xx < nx; xx++) { var q = F.cellAt('z', 0, yy, xx); job.Z[yy * nx + xx] = q === q ? q : (coastLand(L.lat0 + yy * L.dlat, L.lon0 + xx * L.dlon) ? 2 : 999); } }
      if (job.y < ny) { setTimeout(step, 0); return; }
      buildDepth.z = job.Z; buildDepth.zOf = F; buildDepth.zCoast = job.coast; depthChunks.job = null; buildDepth(); draw();
    })();
  }
  function buildDepth() {
    marginNote();
    if (!P.depth) { depthImg = null; return; }
    var L = P.depth.L, F = P.depth, nx = L.nx, ny = L.ny, safety = +$('depth').value, out = hex(css['--out'] || css['--sea']);
    var c = document.createElement('canvas'); c.width = nx; c.height = ny;
    var g = c.getContext('2d'), im = g.createImageData(nx, ny), d = im.data;
    var land = hex(css['--land']), sea = hex(css['--sea']), sea2 = hex(css['--sea2']), sh = hex(css['--shoal']), she = hex(css['--shoaledge']), le = hex(css['--landedge']);
    /* F11 (15 Nov 2026, Stuart: "Yes, in this release"): the depths of every square are worked out once per depth grid and kept; a change of
       screen mode or safety depth only recolours them. Before, every mode change rebuilt them (2 to 4.6 s at phone speed). */
    var Z = buildDepth.z && buildDepth.zOf === F && buildDepth.zCoast === coastBits ? buildDepth.z : null;   /* and again when the coastline arrives */
    /* 18 Nov 04:40 (Stuart's tablet: "Mark+ isn't responding" on opening, offline): the depths of every square took one 2.5 s block on a
       slowed processor, longer on the tablet, past Android's 5 s. Now worked out a few rows at a time with a break between, and the
       chart shows at once without depth shading until they are ready (half a second or so) */
    if (!Z) { depthChunks(F, L, nx, ny); return; }
    function z(y, x) { var v = Z[y * nx + x]; return v === 999 ? -99 : v; }
    /* squares view: mark the margin squares, each within the margin of a square that is land, shallower than the safety depth or without data, as the router does */
    var MG = null, mgn = +($('margin') ? $('margin').value : 1) || 0;
    if (depthSquares() && mgn > 0) { var bad = new Uint8Array(nx * ny); for (var by = 0; by < ny; by++) for (var bx = 0; bx < nx; bx++) { var bv = Z[by * nx + bx]; bad[by * nx + bx] = (bv === 999 || bv === 2 || bv > 0 || -bv < safety) ? 1 : 0; }
      MG = new Uint8Array(nx * ny); for (var my2 = 0; my2 < ny; my2++) for (var mx2 = 0; mx2 < nx; mx2++) { if (bad[my2 * nx + mx2]) continue; for (var ay = -mgn; ay <= mgn && !MG[my2 * nx + mx2]; ay++) for (var ax = -mgn; ax <= mgn; ax++) { var yy2 = my2 + ay, xx2 = mx2 + ax; if (yy2 < 0 || xx2 < 0 || yy2 >= ny || xx2 >= nx || bad[yy2 * nx + xx2]) { MG[my2 * nx + mx2] = 1; break; } } } }
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
      var v = Z[y * nx + x], o = ((ny - 1 - y) * nx + x) * 4, col;
      if (v === 999) col = out;
      else if (v === 2) col = land;
      else if (v > 0) col = land;   /* edges are drawn as clean lines on top (depthLines), not as pixels */
      else if (-v < safety) col = sh;
      else if (MG && MG[y * nx + x]) col = [(sh[0] + sea2[0]) / 2, (sh[1] + sea2[1]) / 2, (sh[2] + sea2[2]) / 2];   /* the margin the routes keep clear of (squares view) */
      else { var f = Math.min(1, -v / 60); col = [sea2[0] + (sea[0] - sea2[0]) * f, sea2[1] + (sea[1] - sea2[1]) * f, sea2[2] + (sea[2] - sea2[2]) * f]; }
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); depthImg = c;
    /* the coastline and the safety-depth line as vector segments (marching squares), so they stay sharp at any zoom (Stuart 12 Nov) */
    function contour(level, y0, y1, out2) {
      out2 = out2 || []; var la0 = L.lat0, lo0 = L.lon0, dla = L.dlat, dlo = L.dlon; y0 = y0 || 0; y1 = Math.min(y1 == null ? ny - 1 : y1, ny - 1);
      function val(y, x) { var v = Z[y * nx + x]; return v === 999 ? -99 : v; }
      for (var y = y0; y < y1; y++) for (var x = 0; x < nx - 1; x++) {
        var a = val(y, x), b = val(y, x + 1), c2 = val(y + 1, x + 1), d2 = val(y + 1, x), k = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c2 > level ? 2 : 0) | (d2 > level ? 1 : 0);
        if (k === 0 || k === 15) continue;
        var e = function (p, q, py, px, qy, qx) { var f = (level - p) / (q - p); return [lo0 + (px + (qx - px) * f) * dlo, la0 + (py + (qy - py) * f) * dla]; };
        var T = e(a, b, y, x, y, x + 1), R2 = e(b, c2, y, x + 1, y + 1, x + 1), B = e(d2, c2, y + 1, x, y + 1, x + 1), Lf = e(a, d2, y, x, y + 1, x), segs;
        switch (k) { case 1: case 14: segs = [Lf, B]; break; case 2: case 13: segs = [B, R2]; break; case 3: case 12: segs = [Lf, R2]; break; case 4: case 11: segs = [T, R2]; break;
          case 5: segs = [Lf, T, B, R2]; break; case 6: case 9: segs = [T, B]; break; case 7: case 8: segs = [Lf, T]; break; case 10: segs = [Lf, B, T, R2]; break; }
        for (var i = 0; i < segs.length; i += 2) out2.push(segs[i][0], segs[i][1], segs[i + 1][0], segs[i + 1][1]);
      }
      return y0 === 0 && y1 === ny - 1 ? new Float32Array(out2) : out2;
    }
    /* a line a few rows at a time, with a break between (18 Nov 04:50) */
    function contourSlow(level, ck, done) { var acc = [], y = 0; (function st() { if (buildDepth.lpend !== ck) return; var t0 = Date.now(); while (y < ny - 1 && Date.now() - t0 < 25) { contour(level, y, y + 8, acc); y += 8; } if (y < ny - 1) setTimeout(st, 0); else done(new Float32Array(acc)); })(); }
    /* F11: the coast and safety-depth lines depend only on the depths and the safety depth, not the colours: kept between mode changes */
    var ck = safety + '|' + (Z === buildDepth.lz ? 1 : 0);
    if (!(buildDepth.lines && buildDepth.lk === ck)) {   /* the two lines in two later steps (18 Nov 04:40), so opening never blocks in one go */
      if (buildDepth.lpend !== ck) { buildDepth.lpend = ck; contourSlow(0.5, ck, function (co) { var fin = function (sf) { if (buildDepth.lpend !== ck) return; buildDepth.lines = { coast: co, safe: sf }; buildDepth.lk = safety + '|1'; buildDepth.lz = Z; buildDepth.lpend = null; depthLines = buildDepth.lines; draw(); }; if (safety > 0) contourSlow(-safety, ck, fin); else fin(null); }); }
      if (buildDepth.lz !== Z) buildDepth.lines = null;
    }
    depthLines = buildDepth.lines;
  }
  var depthLines = null;
  /* Real chart layers (Stuart 12 Nov): free tiles now, licensed GeoGarage or C-MAP tiles slot into CHARTS later.
     Tiles are web Mercator; this chart is equirectangular, so each tile is stretched between its own edge latitudes, which is exact at the corners and well under a pixel off inside a tile at the zooms used. */
  var CHARTS = {
    cmarks: { name: 'Buoys, beacons and lights (OpenSeaMap)', url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', zmin: 9, zmax: 18, alpha: 1, credit: 'Seamarks © OpenSeaMap' }
  };
  var TILES = {}, tileN = 0, tileRaf = 0, chartLog = { asked: 0, loaded: 0, failed: 0 };
  (function () { try { var c = JSON.parse(localStorage.getItem('fs-charts') || '{}'); S.show.cmarks = 'cmarks' in c ? !!c.cmarks : !!window.FS_MARK; } catch (e) {} })();   /* Mark (Stuart 17 Nov 05:15): buoys, beacons and lights on unless turned off */
  window.__fsChartOn = function (k) { return !!S.show[k]; };   /* Mark: the Solent labels step aside when the OpenSeaMap buoys are on */
  function chartSave() { try { localStorage.setItem('fs-charts', JSON.stringify({ cmarks: !!S.show.cmarks })); } catch (e) {} }
  function tileZoom(c) { var z = Math.round(Math.log(360 * K * view.s * Math.min(dpr || 1, 2) / 256) / Math.LN2); return Math.max(c.zmin, Math.min(c.zmax, z)); }
  function tLon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
  function tLat(y, z) { var n = Math.PI * (1 - 2 * y / Math.pow(2, z)); return Math.atan(Math.sinh(n)) * 180 / Math.PI; }
  function mkImg(t, plain) { var im = new Image(); im.decoding = 'async'; if (!plain) im.crossOrigin = 'anonymous'; im.onload = function () { t.ok = true; chartLog.loaded++; if (!tileRaf) tileRaf = requestAnimationFrame(function () { tileRaf = 0; draw(); }); }; im.onerror = function () { t.bad = true; chartLog.failed++; }; return im; }
  function tileGet(id, c, z, x, y) {
    var k = id + '/' + z + '/' + x + '/' + y, t = TILES[k];
    if (t) { t.used = ++tileN; return t; }
    t = TILES[k] = { img: new Image(), ok: false, bad: false, used: ++tileN };
    t.img.decoding = 'async';
    t.img.onload = function () { t.ok = true; chartLog.loaded++; if (!tileRaf) tileRaf = requestAnimationFrame(function () { tileRaf = 0; draw(); }); };
    var src = c.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    if (c.noCors) { t.img = mkImg(t, true); t.retry = 1; t.img.src = src; chartLog.asked++; return t; }
    t.img.crossOrigin = 'anonymous';   /* keeps the chart canvas readable; a server without CORS gets one plain retry */
    t.img.onerror = function () { if (t.img.crossOrigin && !c.noCors) { c.noCors = true; } if (!t.retry) { t.retry = 1; t.img = mkImg(t, c.noCors); t.img.src = src; return; } t.bad = true; chartLog.failed++; };
    chartLog.asked++; t.img.src = src;
    var ks = Object.keys(TILES); if (ks.length > 600) { ks.sort(function (a, b) { return TILES[a].used - TILES[b].used; }); ks.slice(0, 200).forEach(function (q) { var o = TILES[q]; o.img.onload = o.img.onerror = null; o.img.src = ''; delete TILES[q]; }); }   /* keep memory bounded on phones */
    return t;
  }
  function chartDraw(id) {
    var c = CHARTS[id]; if (!c || !S.show[id]) return;
    var b = viewBox(), z = tileZoom(c), n = Math.pow(2, z);
    var x0 = Math.floor((b.w + 180) / 360 * n), x1 = Math.floor((b.e + 180) / 360 * n);
    var my = function (la) { la = Math.max(-85, Math.min(85, la)) * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n); };
    var y0 = my(b.n), y1 = my(b.s);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 120) return;   /* too far out for this layer: nothing sensible to show */
    ctx.save(); ctx.globalAlpha = c.alpha; ctx.imageSmoothingEnabled = true;
    /* Stuart 17 Nov 13:39: OpenSeaMap's black buoy names could not be read on the dark chart: a white halo round them.
       18 Nov 05:00 (Stuart: Mark+ "incredibly slow", online): the halo filter on every tile at every redraw was the cost on Android,
       so each tile gets its halo once, when it first shows, and is redrawn from that copy with no filter; at most 4 new tiles a redraw; the halo is drawn without a blur filter */
    var bakes = 0, halo = id === 'cmarks';
    var pic = function (t) { if (!halo) return t.img; if (t.cv) return t.cv; if (t.cv === false || bakes >= 4) return t.img; bakes++;
      try {   /* the halo without a blur filter (far too slow on tablets): the tile's shape in white, drawn a pixel or two off each way, then the tile on top */
        var wh = document.createElement('canvas'); wh.width = wh.height = 256; var w2 = wh.getContext('2d'); w2.drawImage(t.img, 0, 0, 256, 256); w2.globalCompositeOperation = 'source-in'; w2.fillStyle = '#fff'; w2.fillRect(0, 0, 256, 256);
        var cv = document.createElement('canvas'); cv.width = cv.height = 256; var g = cv.getContext('2d');
        g.globalAlpha = 0.55; [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(function (o) { g.drawImage(wh, o[0], o[1]); });
        g.globalAlpha = 0.95; [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(function (o) { g.drawImage(wh, o[0], o[1]); });
        g.globalAlpha = 1; g.drawImage(t.img, 0, 0, 256, 256); t.cv = cv; } catch (e) { t.cv = false; return t.img; }
      if (bakes >= 4 && !tileRaf) tileRaf = requestAnimationFrame(function () { tileRaf = 0; draw(); });
      return t.cv; };
    function paint(g, MX, MY, X0, X1, Y0, Y1) {
      for (var x = X0; x <= X1; x++) for (var y = Y0; y <= Y1; y++) {
        var lw = tLon(x, z), le = tLon(x + 1, z), ln = tLat(y, z), ls = tLat(y + 1, z), px = MX(lw), py = MY(ln), pw = MX(le) - px, ph = MY(ls) - py;
        var t = tileGet(id, c, z, ((x % n) + n) % n, y);
        if (t.ok) { g.drawImage(pic(t), px, py, pw + 0.5, ph + 0.5); continue; }
        for (var u = 1; u <= 3 && z - u >= c.zmin; u++) {   /* while a tile loads, stretch its parent so the chart never flashes empty */
          var pz = z - u, f = Math.pow(2, u), pt = TILES[id + '/' + pz + '/' + Math.floor(x / f) + '/' + Math.floor(y / f)];
          if (pt && pt.ok) { var sx = (x % f) * 256 / f, sy = (y % f) * 256 / f; g.drawImage(pic(pt), sx, sy, 256 / f, 256 / f, px, py, pw + 0.5, ph + 0.5); break; }
        }
      }
    }
    /* 18 Nov 05:10 (Stuart: Mark+ "incredibly slow" on the tablet, online): painting some 45 separate buoy tiles on every frame of a
       pan or pinch was the cost (17.6 s of 22 s on a slowed tablet). While a finger is moving the buoy layer is left out; it comes
       back about a third of a second after the chart stops (a ready-made picture of the tiles was tried and measured slower) */
    var live = (ptrs && ptrs.size > 0) || (SV && Date.now() - SV.touch < 300);
    if (live) { ctx.restore(); settle(); return; }
    paint(ctx, X, Y, x0, x1, y0, y1);
    ctx.restore();
  }
  function chartCredit() {
    var on = Object.keys(CHARTS).filter(function (k) { return S.show[k]; }); var el = $('chartCredit'); if (!el) return;
    el.hidden = !on.length; if (on.length) el.textContent = on.map(function (k) { return CHARTS[k].credit; }).join(' · ') + ' · Not for navigation';
  }
  chartCredit();
  window.__fsTimes = function () { return { quick: +S.quickS || null, std: +S.stdS || null, fin: +S.finS || null, cur: S.cur ? S.cur.length : 0, detail: rdGet(), sec: rdSec() }; };
  /* Routing detail (Stuart 20 Nov 12:44, 12:50): Auto (default: 2000 sectors on a computer, 1000 on a phone or tablet), Quick (no finer pass), Fine (2000), Finest (4000).
     Each choice shows the wait it took for this race on this device last time. The server's ready-made routes use 2000 (PRE_FINESEC). */
  var RDS = { auto: null, quick: 0, fine: 2000, finest: 4000 };
  function rdGet() { var v = store('fs-rdetail'); return RDS.hasOwnProperty(v) ? v : 'auto'; }
  function rdSec(k) { k = k || rdGet(); var o = +(store('fs-finesec') || 0); if (o > 0 && k === 'auto') return o; return k === 'auto' ? (MOBILE ? 1000 : 2000) : RDS[k]; }
  function rdKey(k) { return 'fs-rdwait-' + (meta && meta.course ? raceKey() : HERE) + '-' + k + (MOBILE ? '-m' : '-d'); }
  function rdNote() { var sel = $('rDetail'), n = $('rDetailNote'); if (!sel || !n) return; sel.value = rdGet();
    var w = function (k) { var v = +(store(rdKey(k)) || 0); return v ? (v >= 90 ? 'about ' + Math.floor(v / 60) + ' min ' + ('0' + (v % 60)).slice(-2) + ' s' : 'about ' + v + ' s') : 'not timed yet'; };
    [].forEach.call(sel.options, function (o) { o.textContent = { auto: 'Auto: ' + (MOBILE ? '1000' : '2000') + ' sectors', quick: 'Quick: 360 sectors only', fine: 'Fine: 2000 sectors', finest: 'Finest: 4000 sectors' }[o.value] + ' (' + w(o.value) + ')'; });
    n.textContent = 'The wait is for this race on this ' + (MOBILE ? 'phone or tablet' : 'computer') + ', from its last run. First routes still come in seconds; the finer routes replace them when ready.'; }
  (function () { var t = $('timeMode'); if (t) { t.value = tzLocal() ? 'local' : 'utc'; t.onchange = function () { tzSet(t.value); }; } })();
  (function () { var sel = $('rDetail'); if (!sel) return; sel.onchange = function () { store('fs-rdetail', sel.value); rdNote(); }; rdNote(); })();
  window.__fsProvN = function () { return S.prov ? S.prov.length : -1; };   /* first routes drawn so far (speed plan 2), for the automatic tests */
  window.__fsView = function () { return { s: view.s, lo: view.lo, la: view.la, fingers: ptrs.size }; };   /* for the automatic tests */
  window.__fsCharts = function () { return { log: chartLog, tiles: Object.keys(TILES).length, z: Object.keys(CHARTS).map(function (k) { return k + ':' + tileZoom(CHARTS[k]); }) }; };
  function drawDepthLines() {
    if (!depthLines) return; var lo0 = LO(0), lo1 = LO(W), la1 = LA(0), la0 = LA(H), kx = K * view.s, ox = W / 2 - view.lo * kx, sy = view.s, oy = H / 2 + view.la * sy;
    function strokeSegs(a, colour, w) { if (!a) return; ctx.beginPath(); for (var i = 0; i < a.length; i += 4) { var x1 = a[i], y1 = a[i + 1], x2 = a[i + 2], y2 = a[i + 3]; if ((x1 < lo0 && x2 < lo0) || (x1 > lo1 && x2 > lo1) || (y1 < la0 && y2 < la0) || (y1 > la1 && y2 > la1)) continue; ctx.moveTo(x1 * kx + ox, oy - y1 * sy); ctx.lineTo(x2 * kx + ox, oy - y2 * sy); } ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.stroke(); }
    ctx.save(); ctx.lineCap = 'round';
    if (!depthSquares()) strokeSegs(depthLines.safe, css['--shoaledge'], 1.1);   /* in the squares view the squares themselves are the edge */
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
  /* 17 Nov 23:00: tried gathering redraws into one per screen frame; measured slower on a slowed tablet (12 s of work in 15 s against 5.5 s), so the chart is drawn at once as before */
  /* F31 (Stuart 17 Nov 23:43: "a battery save mode or an older processor mode ... under the relevant setting section"; Settings,
     Display, Battery saver): while nobody is touching the screen, the chart is redrawn at most twice a second; a finger on the
     screen always gets an immediate redraw */
  var SV = { last: 0, t: 0, touch: 0 };
  ['pointerdown', 'pointermove', 'wheel'].forEach(function (n) { window.addEventListener(n, function (e) { if (n !== 'pointermove' || e.buttons || e.pointerType === 'touch') SV.touch = Date.now(); }, { passive: true, capture: true }); });
  /* Stuart 22 Nov 07:50 (decided 08:05): a race put away (Stop race, or the course cleared) leaves an empty race panel: one card, No race open,
     with Choose a race and Draw a course; its route cards, checks, banner, start chip and the PLAN strip go. Route and Route+ only (Mark has its own card) */
  function noRaceSync() { var on = !!(S.cleared && !S.inshore && !window.FS_MARK && !(S.routes && S.routes.length) && !S.edit); if (document.body.classList.contains('norace') !== on) document.body.classList.toggle('norace', on); }
  (function () { var st = document.createElement('style'); st.textContent = '#noRace{display:none;padding:14px 4px}#noRace b{font-size:18px}body.norace #noRace{display:block}body.norace #noRace~*,body.norace #cbanner,body.norace #startChip,body.norace .bar .now{display:none!important}'; document.head.appendChild(st);
    var pk = $('nrPick'), dr = $('nrDraw'); if (pk) pk.onclick = function (e) { e.stopPropagation(); var rb = $('raceBtn'); if (rb && rb.onclick) rb.onclick(e); }; if (dr) dr.onclick = function (e) { e.stopPropagation(); newCourse(); }; })();   /* the tap stops here, or the page's tap-away closes the menu it opened */
  function draw() {
    try { noRaceSync(); } catch (e) {}
    if (!window.__fsSaver || Date.now() - SV.touch < 1500) { SV.last = Date.now(); drawNow(); return; }
    var wait = 500 - (Date.now() - SV.last); if (wait <= 0) { clearTimeout(SV.t); SV.t = 0; SV.last = Date.now(); drawNow(); return; }
    if (!SV.t) SV.t = setTimeout(function () { SV.t = 0; SV.last = Date.now(); drawNow(); }, wait);
  }
  function settle() { clearTimeout(settle.t); settle.t = setTimeout(function () { settle.t = 0; draw(); }, 350); }   /* 18 Nov: one full-quality redraw once a finger stops */
  /* A14 (screen audit, 19 Nov): one list of the labels drawn in each frame, so labels give way to each other. The first drawn keeps its place; a later one moves a step down or up, or is left out. Every chart label uses it: course marks, legs, the shift, the line's bias and wind, laylines, buoy codes and the plotter. */
  var LB = [];
  function lbFit(x, y, w, h, steps, up) { var st = h + 3, n = steps == null ? 3 : steps; for (var k = 0; k <= 2 * n; k++) { var dy = k === 0 ? 0 : (k % 2 ? 1 : -1) * (up ? -1 : 1) * Math.ceil(k / 2) * st, yy = y + dy; if (!LB.some(function (t) { return x < t[0] + t[2] && x + w > t[0] && yy < t[1] + t[3] && yy + h > t[1]; })) { LB.push([x, yy, w, h]); return dy; } } return null; }
  window.__fsLabelFit = lbFit; window.__fsLabelTake = function (x, y, w, h) { LB.push([x, y, w, h]); };
  function drawNow() {
    if (!W || !meta) return;
    LB.length = 0;
    if ((ptrs && ptrs.size > 0) || (SV && Date.now() - SV.touch < 300)) settle();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.big) { drawBig(); return; }
    ctx.fillStyle = css['--sea']; ctx.fillRect(0, 0, W, H);
    oriUpdate(); ORI.turned = !!ORI.ang; if (ORI.ang) { ctx.translate(ORI.cx, ORI.cy); ctx.rotate(-ORI.ang * R); ctx.translate(-ORI.cx, -ORI.cy); }
    baseLand();
    if (depthImg) { var L = P.depth.L; var sq = depthSquares(); ctx.imageSmoothingEnabled = !sq; ctx.imageSmoothingQuality = (ptrs && ptrs.size > 0) || (SV && Date.now() - SV.touch < 300) ? 'low' : 'high';   /* 18 Nov: the quicker smoothing while a finger moves (about 4 s of 12 s on a slowed tablet); full quality once it stops */   /* smooth the coast and shoal edges when zoomed in, instead of square cells */ ctx.drawImage(depthImg, X(L.lon0 - L.dlon / 2), Y(L.lat0 + (L.ny - 0.5) * L.dlat), (L.nx * L.dlon) * K * view.s, L.ny * L.dlat * view.s); }
    try { drawDepthLines(); } catch (e) {}
    grid();
    if (S.show.band) bandEdge();
    if (S.show.tide) { ctx.save(); ctx.globalAlpha = (+$('tideDim').value || 0) / 100; arrows('tide'); ctx.restore(); }
    if (S.show.wind && $('windShow').value) { ctx.save(); ctx.globalAlpha = (+$('windDim').value || 0) / 100; arrows('wind'); ctx.restore(); }
    (window.__fsLabelFirst || []).forEach(function (fn) { try { fn(ctx, X, Y); } catch (e) {} });   /* A14: the labels that matter most here (the line's bias on the start screen) take their places first */
    try { chartDraw('cmarks'); } catch (e) {}
    zonesDraw(); lightsDraw();
    document.body.classList.toggle('editing', !!S.edit);
    var building = window.FSSolent && FSSolent.stepState && FSSolent.stepState().on;   /* a Solent course being built step by step: the last course is not drawn under it (16 Nov) */
    if (!S.edit && !S.cleared && !building) marks();   /* editing: the points being edited replace the course marks */   /* drawing a new course: the old course's marks are not shown */
    /* the chosen route is a wide band underneath, so routes that run within a mile of it still show on top */
    var selOn = S.sel && !S.sel.hidden;
    if (S.prov && S.prov.length && !S.routes.length) S.prov.forEach(function (s) { line(s, 2.2, 0.75); });
    if (S.cur && S.sel && S.routes.length && S.cur.indexOf(S.sel) < 0) S.cur.forEach(function (s) { if (s.id === S.sel.id) line({ id: S.sel.id, combined: S.sel.combined, r: s.r }, 1.6, 0.35); });   /* drawn in the chosen route's own colour */   /* the standard route, faint, under the finer one (Stuart 20 Nov 11:22) */   /* first routes as they arrive (speed plan 2) */
    if (selOn) line(S.sel, 9, 0.35);
    S.routes.forEach(function (s) { if (!s.hidden && s !== S.sel) line(s, 2.2, 1); });
    if (selOn) line(S.sel, 2.2, 1);
    if (S.edit) { myMarksDraw(); editDraw(); }
    if (S.mob) mobDraw();
    if (!S.edit && !S.cleared && !building && S.show.legs && meta.course) { var lc = meta.course; legsDraw(courseFull(lc), false, 'label'); }
    liveDraw();
    if (window.__fsOverlay && !S.edit) try { ctx.save(); window.__fsOverlay(ctx, X, Y); ctx.restore(); } catch (e) { ctx.restore(); }
    (window.__fsOverlays || []).forEach(function (fn) { try { ctx.save(); fn(ctx, X, Y, !!S.edit); ctx.restore(); } catch (e) { ctx.restore(); } });   /* more layers: the Solent race marks */   /* the basic plotter (fsplot.js) draws its bearing and COG lines here */
    if (S.edit) { ctx.save(); ctx.strokeStyle = css['--brand'] || '#6FA9E0'; ctx.fillStyle = ctx.strokeStyle; ctx.font = '600 11px Inter, sans-serif'; ctx.setLineDash([6, 5]);   /* every area a drawn course can route in, each named */
      REGIONS.forEach(function (g) { if (!READY[g.id]) return; var rb = g.region; ctx.globalAlpha = g.id === HERE ? 1 : 0.6; ctx.lineWidth = g.id === HERE ? 1.8 : 1.2; ctx.strokeRect(X(rb.w), Y(rb.n), X(rb.e) - X(rb.w), Y(rb.s) - Y(rb.n)); ctx.fillText(g.name, X(rb.w) + 5, Y(rb.n) + 13); });
      ctx.restore(); }   /* the area a new course must stay inside */
    try { drawMetCached(); } catch (e) {}
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
    if (rhumbOn()) { var rb = rhumbAt(S.t); if (rb && !rb.done) triMark(X(rb.lo), Y(rb.la), rb.brg || 0, 13, css['--panel'], css['--brand'] || '#3574BA', 3); }   /* M93: the rhumb-line boat */
    if (S.from) { ctx.strokeStyle = css['--ink']; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(S.from.lon), Y(S.from.lat), 10, 0, 7); ctx.stroke(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ORI.turned = false;   /* the scale bar stays square to the screen */
    scale();
  }
  /* ---------- traffic separation schemes, keep-out areas, lighthouses and buoys (not for navigation) ---------- */
  var ZONES = [], LIGHTS = [], hatchPat = null;
  function loadChartExtras() {
    fetch('../zones/tss.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { ZONES = j.zones || []; draw(); } }).catch(function () {});
    fetch('../zones/marks.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { LIGHTS = j.marks || []; draw(); } }).catch(function () {});
  }
  function viewBox() { if (!ORI.ang) return { s: LA(H), n: LA(0), w: LO(0), e: LO(W) }; var c = [[0, 0], [W, 0], [0, H], [W, H]].map(function (q) { return unrot(q[0], q[1]); }), xs = c.map(function (q) { return q[0]; }), ys = c.map(function (q) { return q[1]; }); return { s: LA(Math.max.apply(null, ys)), n: LA(Math.min.apply(null, ys)), w: LO(Math.min.apply(null, xs)), e: LO(Math.max.apply(null, xs)) }; }
  function ringOn(ring, vb) { for (var i = 0; i < ring.length; i++) { var q = ring[i]; if (q[0] >= vb.s && q[0] <= vb.n && q[1] >= vb.w && q[1] <= vb.e) return true; } var la = 0, lo = 0; ring.forEach(function (q) { la += q[0]; lo += q[1]; }); la /= ring.length; lo /= ring.length; return la > vb.s - 2 && la < vb.n + 2 && lo > vb.w - 3 && lo < vb.e + 3; }
  function hatch(colr) {
    var c = document.createElement('canvas'); c.width = c.height = 10; var g = c.getContext('2d'); g.strokeStyle = colr; g.globalAlpha = 0.55; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 10); g.lineTo(10, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke(); return ctx.createPattern(c, 'repeat');
  }
  function polyPath(ring) { ctx.beginPath(); ring.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.closePath(); }
  function zonesDraw() {
    var vb = viewBox(), obs = (meta.course && meta.course.race && meta.course.race.obstructions) || [], pat = hatch(css['--shoaledge'] || '#B0302A');
    if (S.show.tss && ZONES.length) {
      ZONES.forEach(function (z) {
        if (!ringOn(z.poly, vb)) return;
        if (z.kind === 'edge') { ctx.beginPath(); z.poly.forEach(function (q, i) { if (i) ctx.lineTo(X(q[1]), Y(q[0])); else ctx.moveTo(X(q[1]), Y(q[0])); }); ctx.strokeStyle = css['--shoaledge']; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1; return; }
        polyPath(z.poly);
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
    var gb = viewBox(), gy0 = Y(gb.n), gy1 = Y(gb.s), gx0 = X(gb.w), gx1 = X(gb.e);
    for (var lo = Math.ceil(gb.w / step) * step; lo < gb.e; lo += step) { ctx.moveTo(X(lo), gy0); ctx.lineTo(X(lo), gy1); }
    for (var la = Math.ceil(gb.s / step) * step; la < gb.n; la += step) { ctx.moveTo(gx0, Y(la)); ctx.lineTo(gx1, Y(la)); }
    ctx.stroke(); ctx.globalAlpha = 1; if (ORI.ang) return;   /* edge labels only when north is up */
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
    for (var y = 80 + off - ORI.pad; y < H + ORI.pad; y += sp) for (var x = sp / 2 + off - ORI.pad; x < W + ORI.pad; x += sp) {
      var la = LA(y), lo = LO(x);
      if (kind === 'tide') { if (!P.depth || !(P.depth.nearest('z', la, lo) < 0)) continue; }
      else if (coastLand(la, lo)) continue;   /* wind symbols only over the sea */
      var tq = kind === 'tide' ? S.t - tideShiftH() : S.t, u = f.sample('u', la, lo, tq), v = f.sample('v', la, lo, tq); if (!(u === u) || !(v === v)) continue;
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
  /* which way round: a red PORT or green STBD tag under each mark's name (Stuart 12 Nov); "?" where the side is assumed, not from the sailing instructions */
  function sideTag(m, x, y) {
    if (!m.side) return; if (ORI.turned) return upright(x, y, function (a, b) { ORI.turned = false; sideTag(m, a, b); });
    var pt = m.side !== 'starboard', night = document.documentElement.hasAttribute('data-night'), t = (pt ? '◀ PORT' : 'STBD ▶') + (m.sideAssumed ? ' ?' : '');
    ctx.save(); ctx.font = '700 9.5px Inter, sans-serif'; var w = ctx.measureText(t).width + 10, colr = night ? css['--ink'] : pt ? '#E5484D' : '#30A46C';
    ctx.fillStyle = colr; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, 15, 7.5); else ctx.rect(x, y, w, 15); ctx.fill();
    ctx.fillStyle = night ? css['--panel'] : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 5, y + 8); ctx.restore();
  }
  function marks() {
    var c = meta.course; ctx.font = '600 11px Inter, sans-serif';
    var full = courseFull(c); if (S.show.legs) full.forEach(function (m) { if (m.via) viaMark(X(m.lon), Y(m.lat), m.must); });
    var pm = [c.start].concat(realMarks(c)).concat([c.finish]), same = function (p, q) { return p && q && Math.abs(p.lat - q.lat) < 1e-5 && Math.abs(p.lon - q.lon) < 1e-5; };
    pm.forEach(function (m) { var mx = X(m.lon), my = Y(m.lat); ctx.beginPath(); ctx.arc(mx, my, 7.5, 0, 7); ctx.fillStyle = css['--panel']; ctx.fill(); ctx.strokeStyle = css['--ink']; ctx.lineWidth = 1.5; ctx.stroke(); triMark(mx, my + 0.8, 0, 4.6, css['--ink']); lbFit(mx - 8, my - 8, 16, 16, 0); });
    pm.forEach(function (m, i, a) { var last = i === a.length - 1; if (last && i > 0 && same(m, a[0])) return;   /* A14: a start and finish on one line get one name, not two on top of each other */
      var nm = i === 0 && a.length > 1 && same(m, a[a.length - 1]) ? (/^Start, /.test(m.name) ? m.name.replace(/^Start, /, 'Start and finish, ') : 'Start and finish, ' + m.name) : m.name, mx = X(m.lon), my = Y(m.lat), tag = i > 0 && !last && !!m.side;
      ctx.font = '600 11px Inter, sans-serif'; var dy = lbFit(mx + 11, my - 19, Math.max(ctx.measureText(nm).width, tag ? 64 : 0), tag ? 32 : 14); if (dy == null) return; ctx.fillStyle = css['--ink']; ctx.fillText(nm, mx + 11, my - 8 + dy); if (tag) sideTag(m, mx + 11, my - 2 + dy); });
    if (S.show.legs) legsDraw(full, false, 'line');
    if (S.legs && S.legs[0].gate) { var g = S.legs[0].gate; ctx.strokeStyle = css['--ink']; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(g.a[1]), Y(g.a[0])); ctx.lineTo(X(g.b[1]), Y(g.b[0])); ctx.stroke(); ctx.setLineDash([]); }
  }
  /* FirstShift triangle markers: open for your boat, solid for the fleet, triangle in a circle for marks */
  /* M93 (Stuart 21 Nov 09:45, Mark): "if you could run the boat along the rhumb line, you can actually see what the wind might be at different
     parts of the rhumb line, what the tide might be". With no route on Mark, the time slider moves a boat along the course's rhumb lines
     (round any land by the course's own automatic waypoints), timed by the boat's polar in the forecast wind and tide from the gun (the
     worker's 'times' job, the same sums the fleet times use, holding the line on a beat or run), and the strip, tagged RHUMB, shows the
     leg, the wind, the true wind angle and the tide where the boat is. */
  var RH = { key: null, path: null, ts: null, busy: false };
  function rhumbOn() { return !!window.FS_MARK && !S.sel && !!(meta && meta.course && meta.course.start && meta.course.finish) && !S.cleared && !S.edit && !LIVE.on; }
  function rhumbBuild() {
    if (!rhumbOn() || RH.busy) return; var pts = courseFull(meta.course), g = +$('startSel').value || Math.round(Date.now() / 1000), k = JSON.stringify([pts.map(function (q) { return [q.lat, q.lon]; }), g, cardModels(), $('tideSel').value, $('tcc').value]);
    if (RH.key === k) return; RH.key = k; RH.ts = null; RH.busy = true; var path = [];
    pts.forEach(function (q, i) { if (!i) { path.push({ la: q.lat, lo: q.lon, leg: 0 }); return; } var a = pts[i - 1], n = Math.max(1, Math.ceil(FSRouter.dist(a.lat, a.lon, q.lat, q.lon) / 0.2)); for (var j = 1; j <= n; j++) path.push({ la: a.lat + (q.lat - a.lat) * j / n, lo: a.lon + (q.lon - a.lon) * j / n, leg: i - 1 }); });
    poolShort({ type: 'times', o: Object.assign({}, opts(cardModels()), { polZ: polZ() }), path: path, boats: [{ tcc: +$('tcc').value || 1, start: (g - T0) / 3600 }] })
      .then(function (r) { RH.busy = false; if (RH.key !== k) return; RH.path = path; RH.ts = r[0]; update(); }, function () { RH.busy = false; RH.key = null; });
  }
  function rhumbAt(t) { var ts = RH.ts, p = RH.path; if (!ts || !p || !(t >= ts[0])) return null;
    for (var i = 1; i < ts.length; i++) { if (!(ts[i] === ts[i]) || !isFinite(ts[i])) return { stuck: true, la: p[i - 1].la, lo: p[i - 1].lo, leg: p[i].leg }; if (ts[i] >= t) { var f = (t - ts[i - 1]) / ((ts[i] - ts[i - 1]) || 1); return { la: p[i - 1].la + (p[i].la - p[i - 1].la) * f, lo: p[i - 1].lo + (p[i].lo - p[i - 1].lo) * f, leg: p[i].leg, brg: FSRouter.brg(p[i - 1].la, p[i - 1].lo, p[i].la, p[i].lo) }; } }
    return { done: true, la: p[p.length - 1].la, lo: p[p.length - 1].lo, leg: p[p.length - 1].leg, at: ts[ts.length - 1] }; }
  function rhumbStrip() {
    rhumbBuild(); var rp = rhumbAt(S.t), legs = courseFull(meta.course).length - 1;
    if (!RH.ts) return kv('Rhumb', RH.busy ? 'timing…' : '-');
    if (!rp) return kv('Rhumb', 'before the gun') + kv('Gun', clockH(RH.ts[0]).slice(-5));
    if (rp.done) return kv('Finished', clockH(rp.at).slice(-5)) + kv('Elapsed', fmtH(rp.at - RH.ts[0]));
    if (rp.stuck) return kv('Leg', (rp.leg + 1) + '/' + legs) + kv('Wind', 'none to sail');
    var h = kv('Leg', (rp.leg + 1) + '/' + legs), W = null, T = null;
    try { W = FSRouter.windSampler(P, cardModels())(rp.la, rp.lo, S.t); } catch (e) {}
    try { if ($('tideSel').value && P.tide[$('tideSel').value]) T = FSRouter.tideSampler(P, $('tideSel').value)(rp.la, rp.lo, S.t); } catch (e) {}
    if (W && W[0] === W[0]) { var twa = ((rp.brg - W[1] + 540) % 360) - 180; h += kv('TWS', W[0].toFixed(1)) + kv('TWD', pad((W[1] + 360) % 360) + '°') + kv('TWA', Math.abs(Math.round(twa)) + '°<i class="nside ' + (twa < 0 ? 's" data-s="S">STBD' : 'p" data-s="P">PORT') + '</i>'); }
    if (T && T[0] === T[0]) { var ts = Math.hypot(T[0], T[1]), td = (Math.atan2(T[0], T[1]) / R + 360) % 360; h += kv('Tide', ts.toFixed(1) + '<i class="unit"> kn</i> ' + pad(td) + '°'); }
    return h + kv('Elapsed', fmtH(S.t - RH.ts[0]));
  }
  function triMark(x, y, hdg, size, fill, stroke, lw) {
    var r = hdg * R, dx = Math.sin(r), dy = -Math.cos(r);
    ctx.beginPath(); ctx.moveTo(x + dx * size, y + dy * size); ctx.lineTo(x - dx * size * 0.7 - dy * size * 0.62, y - dy * size * 0.7 + dx * size * 0.62); ctx.lineTo(x - dx * size * 0.7 + dy * size * 0.62, y - dy * size * 0.7 - dx * size * 0.62); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function hdgAt(path, k) { var i = Math.max(0, Math.min(path.length - 2, Math.floor(k))), a = path[i], b = path[i + 1]; return (Math.atan2((b.lo - a.lo) * K, b.la - a.la) / R + 360) % 360; }
  function dot(la, lo, r, fill, stroke) { ctx.beginPath(); ctx.arc(X(lo), Y(la), r, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
  function line(s, w, a) {
    ctx.globalAlpha = a * (S.edit && S.edit.changed ? 0.3 : 1);   /* course changed: the routes are out of date */ ctx.strokeStyle = col(s); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.setLineDash(s.combined || s === S.sel ? [] : STYLE[s.id][1]);
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
      if (pos && !pos.done && pos.i != null && S.legs && S.legs.length) {
        var q = p[pos.i + 1] || p[pos.i], lg = S.legs[Math.min(q.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a;
        /* the plan over the ground, tide included, as the route is sailed (Stuart 14 Nov: BSP and SOG, VMC over the ground) */
        var gx = q.bsp * Math.sin(q.hdg * R) + (q.cu || 0), gy = q.bsp * Math.cos(q.hdg * R) + (q.cv || 0), sog = Math.hypot(gx, gy), cog = Math.atan2(gx, gy) / R;
        var vmc = sog * Math.cos((cog - FSRouter.brg(pos.la, pos.lo, tg[0], tg[1])) * R);
        h = kv('SOG', sog.toFixed(1)) + kv('COG', pad((cog + 360) % 360) + '°') + kv('BSP', q.bsp.toFixed(1)) + kv('TWA', Math.abs(Math.round(q.twa)) + '°<i class="nside ' + (q.twa < 0 ? 's" data-s="S">STBD' : 'p" data-s="P">PORT') + '</i>') + kv('TWS', q.tws.toFixed(1)) + kv('Hdg', pad(q.hdg) + '°') +   /* Stuart 22 Nov 09:16: one column order for PLAN, LIVE and BOAT */ kv('VMC', vmc.toFixed(1)) + kv('Sail', rig(q)) + kv('Sea', q.hs ? q.hs.toFixed(1) + '<i class="unit"> m</i>' : '-');
      } else if (pos && pos.done) h = kv(s.r.partial ? 'Forecast end' : 'Finished', clockH(s.r.finish).slice(-5)) + ['BSP', 'SOG', 'COG', 'TWA', 'TWS', 'VMC', 'Sail', 'Sea'].map(function (k) { return kv(k, '-'); }).join('');   /* same seven boxes, so the time slider beside them never changes width under your finger */
      else h = ['Hdg', 'BSP', 'SOG', 'COG', 'TWA', 'TWS', 'VMC', 'Sail', 'Sea'].map(function (k) { return kv(k, '-'); }).join('');
    } else if (rhumbOn()) h = rhumbStrip();
    $('now').classList.toggle('rhumb', !s && rhumbOn() && !!RH.ts);
    /* Stuart 22 Nov 09:40 (yes 09:43, "slightly dimmer"): with LIVE or BOAT figures on top, a second line under them keeps the plan at the
       slider time, from the forecast and the polars: an estimate, so it is dimmer than the measured line */
    var liveTop = (stripOn() || (typeof boatData === 'function' && boatData())) && !peeking(), n2 = $('now2');
    if (liveTop) { stripShow(); if (n2) { n2.innerHTML = h; n2.hidden = !h; } } else { $('now').classList.remove('live', 'alarm', 'boatd'); $('now').classList.toggle('peek', peeking()); $('now').innerHTML = h; if (n2) n2.hidden = true; } followBoat(); draw(); if (S.ghosts && !$('t-fleet').hidden) fleetTable();
  }
  /* Follow the boat: with it on, moving the time slider or playing keeps the chosen route's boat in the middle of the open chart.
     Dragging the chart turns it off; the button turns it back on. */
  var follow = store('fs-follow') !== '0';
  function followSet(on) { follow = on; store('fs-follow', on ? '1' : '0'); $('followBtn').setAttribute('aria-pressed', on); $('followBtn').title = on ? 'Following the boat: tap to stop' : 'Follow the boat: keeps it in the middle as the time moves'; if (on) { followBoat(); draw(); } }
  function followBoat() {
    if (!follow || !W || S.edit) return;   /* editing a course: the chart stays where it is */
    var pos; if (LIVE.on && LIVE.fix) pos = { la: LIVE.fix.la, lo: LIVE.fix.lo };   /* live GPS: follow the real boat */
    else { if (!S.sel) return; var p = S.sel.r.path; pos = posAt(tsOf(p), p, S.t); if (!pos) pos = { la: p[0].la, lo: p[0].lo }; }
    var top = (window.__navTop && window.__navTop()) || 70, bot = H, bar = document.querySelector('.bar'), pn = $('panel'), cr = cv.getBoundingClientRect();
    [bar, !wide() && pn && !pn.hidden && !pn.classList.contains('collapsed') ? pn : null, LIVE.on && !$('liveBox').hidden ? $('liveBox') : null].forEach(function (el) { if (!el) return; var r = el.getBoundingClientRect(); if (r.height && r.top > cr.top + top && r.left < cr.left + W / 2 && r.right > cr.left + W / 2) bot = Math.min(bot, r.top - cr.top); });
    var left = 0, right = W; if (wide() && pn && !pn.hidden) { var r2 = pn.getBoundingClientRect(); if (r2.left - cr.left > W / 2) right = r2.left - cr.left; else if (r2.right - cr.left < W / 2) left = r2.right - cr.left; }
    var cx = (left + right) / 2, cy = (top + bot) / 2;
    var fa = null; try { fa = window.__navFollowAdj ? window.__navFollowAdj(pos, right - left, bot - top, view.s) : null; } catch (e) {} if (fa && fa.s > 0) view.s = Math.max(20, Math.min(ZMAX(), fa.s));   /* look ahead and auto zoom */
    view.lo = pos.lo - (cx - W / 2) / (K * view.s); view.la = pos.la + (cy - H / 2) / view.s;
    if (fa && fa.ahead) { view.la += fa.ahead[0] / view.s; view.lo += fa.ahead[1] / (K * view.s); }
  }
  var KVT = { Hdg: 'Plan: heading to steer', BSP: 'Plan: boat speed through the water, from the polar', SOG: 'Plan: speed over the ground, tide included', COG: 'Plan: course over the ground, tide included', TWA: 'Plan: true wind angle, from the forecast', TWS: 'Plan: true wind speed, from the forecast', VMC: 'Plan: velocity made good on course: speed over the ground towards the next mark, tide included, in knots (VMG is speed towards the wind)', Sail: 'Plan: sail', Sea: 'Plan: significant wave height, from the forecast' };
  function kv(k, v) { return '<div' + (KVT[k] ? ' title="' + KVT[k] + '"' : '') + '><span>' + k + '</span><b>' + v + '</b></div>'; }
  function pad(x) { return String(Math.round(((x % 360) + 360) % 360)).padStart(3, '0'); }
  var playing = false, lastTs = 0;
  function togglePlay() { playing = !playing; $('playIcon').innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M7 5v14l12-7z"/>'; $('play').setAttribute('aria-label', playing ? 'Pause' : 'Play'); if (playing) { lastTs = 0; if (+$('time').value >= 1000) setTime(S.tmin || 5); requestAnimationFrame(tick); } }
  function tick(ts) { if (!playing) return; if (lastTs) { var t = S.t + Math.min(ts - lastTs, 50) / 1000 * (+$('speed').value || 1);   /* a slow frame slows the replay a moment instead of jumping it */ if (t >= (S.tmax || 30)) { t = S.tmax || 30; togglePlay(); } setTime(t); } lastTs = ts; if (playing) requestAnimationFrame(tick); }

  /* ---------- pointer ---------- */
  var ptrs = new Map(), pinch = 0, pmid = null, moved = 0;
  cv.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(evx(e), evy(e), e.deltaY > 0 ? 1 / 1.15 : 1.15); }, { passive: false });
  function ZMAX() { var k = +($('zoomMax') ? $('zoomMax').value : 1) || 1; return 20000 * Math.max(1, Math.min(6, k)); }   /* closest zoom, screen points per degree of latitude: 20,000 is about 1.2 nm across a phone */
  function zoomAt(x, y, f) { var lo = LO(x), la = LA(y); view.s = Math.max(20, Math.min(ZMAX(), view.s * f)); view.lo = lo - (x - W / 2) / (K * view.s); view.la = la + (y - H / 2) / view.s; draw(); }
  cv.addEventListener('dblclick', function () { if (window.FSSolent && (FSSolent.isOn() || S.inshore)) return; fit(); draw(); });   /* Stuart 16 Nov 13:33: in Solent racing a quick second click on a buoy zoomed the whole chart out; a double click no longer re-frames the chart there */
  cv.addEventListener('pointerdown', function (e) { if (e.isPrimary) { ptrs.clear(); pmid = null; S.drag = null; }   /* the first finger down starts a new gesture: a finger whose lift was never reported (Stuart 14 Nov 20:42, Android tablet: pinch stopped working) must not leave the chart thinking three fingers are down */ try { cv.setPointerCapture(e.pointerId); } catch (er) {} ptrs.set(e.pointerId, [evx(e), evy(e)]); moved = 0; if (ptrs.size === 2) pmid = pairNow(); else pmid = null; S.drag = (S.edit && !$('editBar').hidden && ptrs.size === 1) ? editHit(evx(e), evy(e)) : -1; if (S.drag < 0) S.drag = null; else { S.dragFrom = Object.assign({}, S.edit.pts[S.drag]); editSnap(); } closeLayers(); if (!wide() && !$('panel').classList.contains('collapsed')) closePanel(); });
  /* two fingers move the chart as well as zoom it, like a map app (Stuart 12 Nov): read both fingers together once a frame */
  var pairRaf = 0;
  function pairNow() { var v = Array.from(ptrs.values()); return { x: (v[0][0] + v[1][0]) / 2, y: (v[0][1] + v[1][1]) / 2, d: Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]) }; }
  function pairApply() {
    pairRaf = 0; if (ptrs.size !== 2 || !pmid) return; var q = pairNow();
    if (follow) followSet(false);
    view.lo -= (q.x - pmid.x) / (K * view.s); view.la += (q.y - pmid.y) / view.s;
    if (iosG) gMid = [q.x, q.y];
    if (!iosG && pmid.d > 0 && q.d > 0) zoomAt(q.x, q.y, q.d / pmid.d); else draw();
    pmid = q;
  }
  cv.addEventListener('pointermove', function (e) {
    if (tp) return;
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse' && ($('tip').hidden || !$('tip').classList.contains('docked'))) hover(evx(e), evy(e), false); return; }   /* a tip pinned by a click stays until closed */
    var prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [evx(e), evy(e)]);
    if (S.drag != null && ptrs.size === 1) { var dq = S.edit.pts[S.drag]; dq.lat = +LA(evy(e)).toFixed(5); dq.lon = +LO(evx(e)).toFixed(5); moved = 99; draw(); return; }
    if (ptrs.size === 1) { var dx = evx(e) - prev[0], dy = evy(e) - prev[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { if (follow) followSet(false); view.lo -= dx / (K * view.s); view.la += dy / view.s; draw(); if (e.pointerType === 'mouse') $('tip').hidden = true; } return; }
    moved = 99; if (!pmid) { pmid = pairNow(); return; } if (!pairRaf) pairRaf = requestAnimationFrame(pairApply);   /* both fingers together, once a frame */
  });
  /* two fingers anywhere over the chart pinch it, even when one lands on a label, the GPS bar or a button lying over the chart
     (Stuart 14 Nov 21:16: "Pinch fails a lot on Route on Android"); panels, lists and sheets keep their own scrolling */
  var tp = null;
  function overChart(t) { var el = t.target; if (!el || !el.closest || el.closest('.sheet, #panel, input, select, textarea, #fsTour, #fs-film-modal, #fsFilm')) return false; var r = cv.getBoundingClientRect(); return t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom; }
  function pairT(ts) { var r = cv.getBoundingClientRect(), a = ts[0], b2 = ts[1]; return { x: (a.clientX + b2.clientX) / 2 - r.left, y: (a.clientY + b2.clientY) / 2 - r.top, d: Math.hypot(a.clientX - b2.clientX, a.clientY - b2.clientY) }; }
  document.addEventListener('touchstart', function (e) {
    tp = null; if (e.touches.length !== 2) return;
    var t0 = e.touches[0], t1 = e.touches[1]; if (t0.target === cv && t1.target === cv) return;   /* both on the chart: the pointer code has it */
    if (!overChart(t0) || !overChart(t1)) return;
    tp = pairT(e.touches); ptrs.clear(); pmid = null; S.drag = null; moved = 99;
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', function (e) {
    if (!tp || e.touches.length !== 2) return; if (e.cancelable) e.preventDefault();
    var q = pairT(e.touches); if (follow) followSet(false);
    view.lo -= (q.x - tp.x) / (K * view.s); view.la += (q.y - tp.y) / view.s;
    if (tp.d > 0 && q.d > 0) zoomAt(q.x, q.y, q.d / tp.d); else draw(); tp = q;
  }, { passive: false, capture: true });
  document.addEventListener('touchend', function (e) { if (e.touches.length < 2) tp = null; }, { capture: true });
  document.addEventListener('touchcancel', function () { tp = null; }, { capture: true });
  /* 17 Nov 21:16 (Stuart's iPhone photo, a second time: a finger somewhere left the page zoomed and slid sideways): stop the
     double tap zooming the page (touch-action, and a second tap within 300 ms outside the chart and the text boxes is held back),
     and if the page still ends up zoomed with no text box in use, set the viewport again so Safari returns to the normal size */
  (function () { try { var st0 = document.createElement('style'); st0.textContent = 'html,body{touch-action:manipulation}'; document.head.appendChild(st0); } catch (e) {}
    var lastT = 0; document.addEventListener('touchend', function (e) { var tg = e.target, t = Date.now(); if (e.touches.length || (tg && tg.closest && tg.closest('canvas,input,textarea,select,button,a,label,[role=button],[contenteditable]'))) { lastT = t; return; } if (t - lastT < 300) e.preventDefault(); lastT = t; }, { passive: false });
    var vv = window.visualViewport, mv = document.querySelector('meta[name=viewport]'), rz = 0; if (!vv || !mv) return; var base = mv.getAttribute('content');
    vv.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { var a = document.activeElement; if (vv.scale > 1.02 && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { mv.setAttribute('content', base.replace(/maximum-scale=[^,]*/, 'maximum-scale=1.0001')); setTimeout(function () { mv.setAttribute('content', base); window.scrollTo(0, 0); }, 60); } }, 400); });
    document.addEventListener('focusout', function () { setTimeout(function () { if (vv.scale > 1.02) vv.dispatchEvent(new Event('resize')); }, 300); }); })();
  /* iPhone and iPad Safari: take the pinch from its own gesture events and stop it zooming the whole page */
  var iosG = 'ongesturestart' in window, gScale = 1, gMid = null, pmid = null;
  cv.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  if (iosG) {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
    cv.addEventListener('gesturestart', function (e) { gScale = 1; var r = cv.getBoundingClientRect(); gMid = [e.clientX - r.left, e.clientY - r.top]; moved = 99; });
    cv.addEventListener('gesturechange', function (e) { if (!gMid || !(e.scale > 0)) return; zoomAt(gMid[0], gMid[1], e.scale / gScale); gScale = e.scale; });
    cv.addEventListener('gestureend', function () { gMid = null; });
  }
  cv.addEventListener('pointerup', function (e) {
    if (S.drag != null && moved < 6) { var ti = S.drag; S.drag = null; S.edit.hist.pop(); ptrs.delete(e.pointerId); pinch = 0, pmid = null; markCard(ti); draw(); return; }   /* a tap on a mark, not a drag: open its card */
    if (S.drag != null) { var dq = S.edit.pts[S.drag]; if (!editOk(dq.lat, dq.lon)) { Object.assign(dq, S.dragFrom); S.edit.hist.pop(); } S.drag = null; editPrompt(); ptrs.delete(e.pointerId); pinch = 0, pmid = null; draw(); return; } if (ptrs.has(e.pointerId) && moved < 6 && ptrs.size === 1) tap(evx(e), evy(e), e.pointerType !== 'mouse'); ptrs.delete(e.pointerId); pinch = 0, pmid = null; });
  cv.addEventListener('pointercancel', function (e) { ptrs.delete(e.pointerId); pinch = 0, pmid = null; });
  cv.addEventListener('lostpointercapture', function (e) { ptrs.delete(e.pointerId); pmid = null; });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs.size && !$('tip').classList.contains('docked')) $('tip').hidden = true; });
  function tap(x, y, touch) {
    if (window.__fsTapHook) try { if (window.__fsTapHook(LA(y), LO(x), x, y, !!S.edit)) return; } catch (e) {}   /* the Solent marks and race builder (solent.js) take taps first */
    if (S.edit) { editTap(x, y); return; }
    if (!S.adjDraw && !S.mobTap && meta && meta.course && $('fromHere').getAttribute('aria-pressed') !== 'true') { var pm = null; realMarks(meta.course).forEach(function (m) { if (!m.side) return; var mx = X(m.lon) + 11, my = Y(m.lat) - 2; if (x >= mx - 6 && x <= mx + 66 && y >= my - 8 && y <= my + 22) pm = m; }); if (pm) { startEdit(courseCopy()); var ix = -1; S.edit.pts.forEach(function (q, i) { if (ix < 0 && Math.abs(q.lat - pm.lat) < 1e-6 && Math.abs(q.lon - pm.lon) < 1e-6) ix = i; }); if (ix > 0) { markCard(ix); busy('Choose which side to leave ' + (pm.name || 'the mark') + ', then Done, then Save and route.'); setTimeout(function () { busy(''); }, 6000); } return; } }   /* tap the PORT or STBD tag to change the rounding side */
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
    if (S.edit) { $('tip').hidden = true; return; }   /* editing a course: no info boxes over the marks */
    if (LIVE.trail.length) { var bt = null, bd = 12; LIVE.trail.forEach(function (q) { var d = Math.hypot(X(q[1]) - x, Y(q[0]) - y); if (d < bd) { bd = d; bt = q; } });   /* the boat's own track: time, SOG, COG at that point (Stuart 12 Nov) */
      if (bt) { var tq = new Date(tzMs(bt[2])); $('tipBody').innerHTML = '<b>Your boat, ' + ('0' + tq.getUTCHours()).slice(-2) + ':' + ('0' + tq.getUTCMinutes()).slice(-2) + ':' + ('0' + tq.getUTCSeconds()).slice(-2) + ' ' + tzS1() + '</b>' + r2('Position', dm(bt[0], 'NS') + ' ' + dm(bt[1], 'EW')) + r2('SOG', bt[3] != null ? bt[3].toFixed(1) + ' kn' : '--') + r2('COG', bt[4] != null && bt[3] > 0.5 ? ('00' + bt[4]).slice(-3) + '°T' : '--') + r2('Heading', 'GPS gives course over the ground, not heading');
        $('tip').hidden = false; $('tip').classList.toggle('docked', !!docked); if (!docked) { $('tip').style.left = Math.min(W - 230, x + 14) + 'px'; $('tip').style.top = Math.max(64, y + 14) + 'px'; } return; } }
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
    if (best && S.legs && S.legs.length) {
      var lg = S.legs[Math.min(best.leg, S.legs.length - 1)], tg = lg.point || lg.gate.a, o = opts(bs.models), spd = speedFn(o);
      var tgt = spd(best.tws, best.twa), sf = FSRouter.seaFactor(best.hs, best.wd, best.hdg, o.sea);
      var bu = FSRouter.bestVmg(spd, best.tws, true), bdn = FSRouter.bestVmg(spd, best.tws, false);
      var rStart = rows.length; rows.push('<b style="color:' + col(bs) + '">' + clockH(best.t).slice(4) + ' ' + tzS1() + ' · ' + (bs.combined ? 'Combined' : bs.name || short(bs.id)) + '</b>');   /* on a route the box starts with the time and the model */
      rows.push(r2('Heading', pad(best.hdg) + '\u00b0 · TWA ' + Math.abs(Math.round(best.twa)) + '\u00b0 ' + (best.twa < 0 ? 'stbd' : 'port')));
      var lw = steerOff(best); if (lw) rows.push(r2('Steer', pad((best.hdg + lw + 360) % 360) + '\u00b0 (leeway ' + Math.abs(lw).toFixed(1) + '\u00b0)'));
      rows.push(r2('Boat speed', best.bsp.toFixed(1) + ' kn' + (sf < 0.995 || sf > 1.005 ? ' (sea ' + (sf >= 1 ? '+' : '') + Math.round((sf - 1) * 100) + '%)' : '')));
      var gx = best.bsp * Math.sin(best.hdg * R) + (best.cu || 0), gy = best.bsp * Math.cos(best.hdg * R) + (best.cv || 0);   /* over the ground: boat speed through the water plus the tide */
      rows.push(r2('VMC to mark', (Math.hypot(gx, gy) * Math.cos((Math.atan2(gx, gy) / R - FSRouter.brg(best.la, best.lo, tg[0], tg[1])) * R)).toFixed(1) + ' kn over the ground'));   /* 20 Nov VMG/VMC review: this is VMC (speed over the ground towards the mark, SOG x cos(COG - bearing)), not VMG; it was labelled VMG and used boat speed and heading, so it left the tide out and disagreed with the VMC in the strip */
      rows.push(r2('Over the ground', 'SOG ' + Math.hypot(gx, gy).toFixed(1) + ' kn · COG ' + pad((Math.atan2(gx, gy) / R + 360) % 360) + '\u00b0'));
      if (best.cu != null && Math.hypot(best.cu, best.cv) >= 0.1) rows.push(r2('Tide on the route', Math.hypot(best.cu, best.cv).toFixed(1) + ' kn to ' + pad((Math.atan2(best.cu, best.cv) / R + 360) % 360) + '\u00b0'));
      rows.push(r2('True wind', best.tws.toFixed(1) + ' kn from ' + pad(best.twd) + '\u00b0'));
      rows.push(r2(Math.abs(best.twa) < 90 ? 'Upwind target' : 'Downwind target', Math.abs(best.twa) < 90 ? bu[0] + '\u00b0 · ' + bu[1].toFixed(1) + ' kn · VMG ' + bu[2].toFixed(1) + ' towards the wind' : bdn[0] + '\u00b0 · ' + bdn[1].toFixed(1) + ' kn · VMG ' + bdn[2].toFixed(1) + ' away from the wind'));
      var sl = FSRouter.sailFor(best, sailsList()), rf = reefOf(best); if (sl || rf) rows.push(r2('Sail', (sl || '-') + (rf ? ', ' + rf.toLowerCase() : '')));
      if (best.tack) rows.push(r2('Manoeuvre', Math.abs(best.twa) > 90 ? 'gybe' : 'tack'));
      rows = rows.splice(rStart).concat(rows);
    }
    cv.style.cursor = best ? 'default' : '';
    var near = null, nd = docked ? 16 : 10;
    ((S.show.ghosts && S.ghostXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ' if on your route (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    ((S.show.real && S.realXY) || []).forEach(function (g) { var d = Math.hypot(g[0] - x, g[1] - y); if (d < nd) { nd = d; near = g[2].name + ', real position (TCC ' + g[2].tcc.toFixed(3) + ')'; } });
    if (near) rows.push('<b>' + near + '</b>');
    var wetHere = !(P.depth && !(P.depth.nearest('z', la, lo) <= -(+$('depth').value)));
    if (tapped && S.sel && wetHere && inData({ lat: la, lon: lo })) rows.splice(rows.length ? 1 : 0, 0, '<div class="xrow" style="margin:6px 0"><button class="btn primary" id="tipBoatHere">The boat is here: route the rest of the race</button><button class="btn" id="tipRoute">Route to here (what if)</button></div>');
    $('tipBody').innerHTML = rows.join(''); tip.hidden = false; tip.classList.toggle('docked', !!docked);
    if (tapped && window.__fsTipExtra) try { window.__fsTipExtra($('tipBody'), la, lo); } catch (e) {}   /* waypoints.js: Save as waypoint, Measure from here */
    if ($('tipRoute')) $('tipRoute').onclick = function (e) { e.stopPropagation(); routeHere(la, lo); };
    if ($('tipBoatHere')) $('tipBoatHere').onclick = function (e) { e.stopPropagation(); var tn = (Date.now() / 1000 - T0) / 3600, tt = LIVE.on || (tn > 0 && tn < HMAX() - 1 && Math.abs(S.t - tn) < 0.25) ? tn : S.t; S.from = { lat: la, lon: lo, t: tt }; S.to = null; $('tip').hidden = true; busy('Routing the rest of the race from here…'); run(); };   /* the boat is now here; route the rest of the race from it */
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
  function boatChanged() { try { if (document.activeElement && /^(tcc|boatType|boatName)$/.test(document.activeElement.id) || boatChanged.user) store('fs-boatset', '1'); boatChanged.user = false; boatWarn(); } catch (e) {} spCache = {}; ['Up', 'Reach', 'Run'].forEach(function (n) { $('tu' + n + 'V').textContent = $('tu' + n).value + '%'; }); clearTimeout(spTimer); spTimer = setTimeout(plotPolar, 60); }
  function boats() { try { return JSON.parse(store('fsBoats') || '{}') || {}; } catch (e) { return {}; } }
  function listBoats(sel) { var b = boats(); $('myBoat').innerHTML = '<option value="">' + (Object.keys(b).length ? 'Choose a saved boat…' : 'Not saved yet') + '</option>' + Object.keys(b).sort().map(function (n) { return '<option>' + n.replace(/</g, '&lt;') + '</option>'; }).join(''); $('myBoat').value = sel || ''; $('boatDel').hidden = !sel; }
  function initBoat() {
    $('boatType').innerHTML = FSBoat.TYPES.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join('');
    $('boatType').value = 'perf';
    var eg = function () { var t = FSBoat.TYPES.filter(function (x) { return x.id === $('boatType').value; })[0]; $('typeEg').textContent = (t ? t.eg.charAt(0).toUpperCase() + t.eg.slice(1) + '. ' : '') + 'A FirstShift generic shape for the type, not a class polar; the TCC sets the overall speed.'; };
    eg(); $('boatType').onchange = function () { eg(); boatChanged(); };
    [].forEach.call($('srcSeg').querySelectorAll('button'), function (b) { b.onclick = function () { setSrc(b.dataset.src); if (b.dataset.src === 'polar') readOwn(true); boatChanged.user = true; boatChanged(); }; });
    $('tcc').addEventListener('input', boatChanged);
    ['tuUp', 'tuReach', 'tuRun'].forEach(function (id) { $(id).oninput = boatChanged; });
    $('tuReset').onclick = function () { ['tuUp', 'tuReach', 'tuRun'].forEach(function (id) { $(id).value = 100; }); boatChanged(); };
    $('polarTxt').oninput = function () { readOwn(true); boatChanged(); };
    $('polarFile').onchange = function () { var f = $('polarFile').files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { $('polarTxt').value = String(rd.result); readOwn(true); boatChanged(); }; rd.readAsText(f); };
    $('polarFromType').onclick = function () { $('polarTxt').value = FSBoat.toGrid(FSBoat.typedPolar($('boatType').value, +$('tcc').value || 1)); readOwn(true); boatChanged(); };
    $('polarGrid').addEventListener('change', function (e) { var t = e.target; if (!gridPol || !t.dataset) return; var v = parseFloat(t.value); gridPol.v[+t.dataset.i][+t.dataset.j] = isFinite(v) ? v : null; $('polarTxt').value = FSBoat.toGrid(gridPol); readOwn(false); boatChanged(); });
    $('polZ').onchange = function () { $('mastRow').hidden = $('polZ').value !== 'mast'; boatChanged(); };
    $('mastZ').oninput = $('stabOn').onchange = function () { boatChanged(); };
    $('mastRow').hidden = $('polZ').value !== 'mast';
    $('boatSave').onclick = function () { var n = $('boatName').value.trim() || 'My boat', b = boats(); $('boatName').value = n; b[n] = { spec: boatSpec(), tackS: +$('tackS').value, gybeS: +$('gybeS').value, bowOff: +(($('bowOff') || {}).value || 0), sails: $('sails').value, mains: $('mains').value, polZ: $('polZ').value, mastZ: $('mastZ').value }; store('fsBoats', JSON.stringify(b)); store('fs-boat-cur', n); listBoats(n); store('fs-boatset', '1'); boatWarn(); busy('Saved ' + n + ' on this device'); setTimeout(function () { busy(''); }, 1600); };   /* F3 (15 Nov): the boat warning is redone at once, so it no longer stays after the name is saved */
    $('boatName').addEventListener('input', function () { try { boatWarn(); } catch (e) {} });
    $('boatDel').onclick = function () { var n = $('myBoat').value, b = boats(); if (!n) return; delete b[n]; store('fsBoats', JSON.stringify(b)); listBoats(''); };
    $('myBoat').onchange = function () { var n = $('myBoat').value, b = boats()[n]; $('boatDel').hidden = !n; if (!b) return; store('fs-boat-cur', n); var s = b.spec; $('boatName').value = n; $('tcc').value = (+s.tcc).toFixed(3); $('boatType').value = s.type || 'perf'; eg(); $('polarTxt').value = s.text || ''; $('tuUp').value = s.tune.up; $('tuReach').value = s.tune.reach; $('tuRun').value = s.tune.run; if (b.tackS) $('tackS').value = b.tackS; if (b.polZ) { $('polZ').value = b.polZ; $('mastZ').value = b.mastZ || ''; $('polZ').dispatchEvent(new Event('change')); } if (b.gybeS) $('gybeS').value = b.gybeS; if (b.bowOff != null && $('bowOff')) $('bowOff').value = b.bowOff; ['sails', 'mains'].forEach(function (id) { if (b[id]) { $(id).value = b[id]; $(id).dispatchEvent(new Event('input')); } }); setSrc(s.src); readOwn(true); boatChanged(); };
    listBoats(''); setSrc('type'); boatChanged();
    /* the boat you last used comes back on this device every time: no typing it in twice */
    var cur = store('fs-boat-cur') || (Object.keys(boats()).length === 1 ? Object.keys(boats())[0] : ''); if (cur && boats()[cur]) { listBoats(cur); $('myBoat').value = cur; $('myBoat').dispatchEvent(new Event('change')); }
  }
  var spCache = {};
  function speedFn(o) { var key = o.polKey || 't' + o.tcc; if (!spCache[key]) spCache[key] = FSRouter.polarTable(o.polar && o.polar.v ? o.polar : FSPolar.startFromTcc(o.tcc)); return spCache[key]; }
})();
/* Phone: the round chart buttons hide while a window or bar is open, and come back when it closes (Stuart 16 Nov 07:39 "be sure phone
   tools don't obscure tool windows"; 07:48 Decided "Hide while open"). Man overboard stays. */
(function () {
  var WINS = ['.sheet', '#tip', '#fsMeas', '#solChain', '#solSide', '#solList', '#solPick', '#solCard', '#solPop', '#tgPop', '#astroPop', '#trkCard', '#fsFilm', '#solStep', '#navPanel', '.navpanel', '#navLog', '#layers', '#solLegs'];
  var phone = window.matchMedia ? window.matchMedia('(max-width: 600px), (max-height: 500px)') : { matches: false };
  function open() { for (var i = 0; i < WINS.length; i++) { var l = document.querySelectorAll(WINS[i]); for (var j = 0; j < l.length; j++) { var e = l[j]; if (!e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden') return true; } } return false; }
  /* Screen rules (UI review step 1, 16 Nov): on any screen, a round button that an open window would cover steps out of the way
     until the window closes (Layers, the GPS window, a card) */
  var COVER = ['#layers', '.livebox:not(.mini)', '#liveBig', '.sheet', '#tip', '#sessBox', '#errBox', '#solCard', '#trkCard', '#solLegs', '#solStep', '#fsPlot', '#astroLine', '.livebox.mini', '#navStrip'];
  function vis(e) { if (e.hidden || !e.getClientRects().length) return false; var c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden'; }
  function winRects() { var wins = []; COVER.forEach(function (q) { [].forEach.call(document.querySelectorAll(q), function (e) { if (vis(e)) wins.push(e.getBoundingClientRect()); }); }); return wins; }
  function covers() { var wins = winRects();
    [].forEach.call(document.querySelectorAll('.fabhelp'), function (f) { var was = f.classList.contains('fabcov'); if (was) f.classList.remove('fabcov'); var r = f.getBoundingClientRect(), hit = r.width > 0 && wins.some(function (w) { return Math.min(r.right, w.right) - Math.max(r.left, w.left) > 2 && Math.min(r.bottom, w.bottom) - Math.max(r.top, w.top) > 2; }); if (hit) f.classList.add('fabcov'); }); }
  /* Screen rules (UI review step 1): on a phone held sideways the chart is about 220 points high, too short for the column of round
     buttons (one sat above the screen, one under the top bar), so they line up along the foot of the chart, right to left, in a second
     row if the first is full. A button the user has dragged somewhere keeps its place. Windows stay below the top bar and the
     instrument strip, and the GPS window keeps to the space between them and the foot of the chart. */
  var short = window.matchMedia ? window.matchMedia('(orientation: landscape) and (max-height: 500px)') : { matches: false };
  var ORDER = ['helpBtn', 'editFab', 'oriBtn', 'navClearBtn', 'fsRulerBtn', 'fromHere', 'navCentreBtn'];
  var FROW = { want: null, since: 0, low: false };
  var ROWM = false;   /* round buttons in a row along the foot: the small GPS pill then sits under the top bar */
  function fabRow() { var fabs = [].slice.call(document.querySelectorAll('.fabhelp')).filter(function (f) { return !f.style.translate; });
    fabs.sort(function (a, b) { var i = ORDER.indexOf(a.id), j = ORDER.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    var vf = fabs.filter(function (f) { return f.offsetParent; }), host = vf[0] && vf[0].offsetParent;
    if (!host) return;   /* F77: no button showing (a window over them all): keep the last decision, so the hold below is not restarted */
    var room = host ? host.clientHeight - Math.max(0, underTop() - host.getBoundingClientRect().top) : 999;
    if (!ROWM && host) { var hb0 = host.getBoundingClientRect().bottom, mt = 1e9; vf.forEach(function (f) { if (f.dataset.fr) return; var r0 = f.getBoundingClientRect(); if (r0.height) mt = Math.min(mt, r0.top); }); if (mt < 1e9) { FROW.need = Math.round(hb0 - mt + 8); FROW.over = mt < underTop() + 4; } }   /* Stuart 20 Nov 16:22: with the plotter bar open the column ran up under it and its buttons were hidden: the column must start below everything under the top bar */   /* F77: the height the column needs (Route+ has more buttons than Route) */
    var low0 = !!host && (room < Math.max(ROWM ? 340 : 300, (FROW.need || 0) + (ROWM ? 40 : 0)) || (!ROWM && !!FROW.over) || colCovered(host));   /* a short chart (small phone, iPhone SE): the column of buttons would reach the top bar, so they go in a row */
    /* Stuart 17 Nov 12:31 (iPhone, Fastnet, panel open): "The gps orange pill is jumping around". The chart's height changes as the panel
       and the strips under the top bar come and go, and the pill flipped between the foot and the top each time. Now the change needs a
       margin (in below 300 px, out above 340) and has to hold for a second and a half before anything moves */
    var now0 = Date.now(); if (low0 !== FROW.want) { FROW.want = low0; FROW.since = now0; } var low = (now0 - FROW.since >= 1500 || FROW.since === 0) ? low0 : FROW.low; FROW.low = low; if (FROW.since === 0) FROW.since = 1;
    ROWM = !!(short.matches || low); if (!short.matches && !low) { fabs.forEach(function (f) { if (f.dataset.fr === '1') { f.style.removeProperty('bottom'); f.style.removeProperty('right'); delete f.dataset.fr; } }); return; }
    if (!host) return; var W = host.clientWidth, n = 0;
    var perRow = Math.max(1, Math.floor((W - 60 - 12) / 52));   /* clear of man overboard on the left */
    var bar = document.getElementById('bar'), base = document.body.classList.contains('navclear') && bar && bar.getClientRects().length ? Math.round(bar.getBoundingClientRect().height) : 0;
    if (!base && host) { var hb = innerHeight - host.getBoundingClientRect().bottom; base = Math.max(0, Math.round(insets().b - hb)); }   /* a chart that runs to the foot of the screen (Mark held sideways): keep clear of the home bar */   /* Clear screen: the play bar floats at the foot, so the row sits above it */
    fabs.forEach(function (f) { if (getComputedStyle(f).display === 'none') return; var row = Math.floor(n / perRow), col = n % perRow; n++;
      f.dataset.fr = '1'; f.style.setProperty('bottom', (8 + base + row * 52) + 'px', 'important'); f.style.setProperty('right', (12 + col * 52) + 'px', 'important'); }); }
  /* Stuart 20 Nov 16:22: after the start the GPS window opened over the column of round buttons and they all vanished. A window over the column
     now sends the buttons to the row along the foot of the chart, where they stay usable; only if the row is covered too do they hide */
  function colCovered(host) { if (!host) return false; var hr = host.getBoundingClientRect(), x0 = hr.right - 72; return winRects().some(function (w) { return w.right > x0 && w.left < hr.right && w.bottom > hr.top && w.top < hr.bottom - 120; }); }
  function underTop() { var y = insets().t; ['.top', '#mkTop', '#fsBadge', '#editBar', '#navStrip', '#fsPlot', '#navPlot', '#solSeq', '#fsDemo', '#astroLine', '#errBox'].forEach(function (q) { var e = document.querySelector(q); if (e && vis(e)) y = Math.max(y, e.getBoundingClientRect().bottom); }); return y; }   /* F87 (Stuart 20 Nov 23:36): Route+'s Plotter bar (#navPlot) was missing, so on Mark+ and Route+ the small GPS pill was placed under it and hidden (navplot npcover), flashing up for a moment */
  /* screen rules F77 (19 Nov full check): on a phone held sideways the chart is about 250 px high. With the plotter bar open, the GPS pill
     (whose figures the plotter shows) and the sun line step aside, and come back when the plotter closes */
  function plotShort() { var pl = ['fsPlot', 'navPlot'].map(function (i) { return document.getElementById(i); }).filter(function (e) { return e && !e.hidden && e.getClientRects().length; })[0], on = !!(short.matches && pl && !pl.classList.contains('mini')); if (document.body.classList.contains('plotshort') !== on) document.body.classList.toggle('plotshort', on); }
  var LF = {};   /* the boat strip's last measured foot, kept while the strip is put aside */
  function liveFit() { plotShort(); var lbv = function (e) { return !!e && !e.hidden && !!e.getClientRects().length && getComputedStyle(e).display !== 'none'; }; /* F87: a pill made invisible by the Plotter (npcover) is still placed, so it can move below the bar and show again */ var lb = document.getElementById('liveBox'), big = !!(lb && lbv(lb) && !lb.classList.contains('mini') && short.matches);
    if (!big && lb && lbv(lb) && short.matches && lb.offsetParent) { var ns = document.getElementById('navStrip'), nsv = ns && vis(ns), nsb = nsv ? ns.getBoundingClientRect().bottom : (ns && document.body.classList.contains('gpsbigshort') ? (LF.nsb || 0) : 0), lpr = lb.offsetParent.getBoundingClientRect(); if (nsv) LF.nsb = nsb; if (nsb && nsb + 6 + (lb.offsetHeight || 48) > lpr.bottom - 8) big = true; }   /* F77 (19 Nov full check): held sideways, if the GPS pill cannot sit under the boat strip, the strip steps aside as it does for the big GPS window */
    if (document.body.classList.contains('gpsbigshort') !== big) document.body.classList.toggle('gpsbigshort', big); if (!lb || !lbv(lb)) return; var ut = underTop(), par = lb.offsetParent; if (!par) return; var pr = par.getBoundingClientRect();
    if (lb.style.translate) return; if (lb.classList.contains('mini')) { var tt = Math.round(ut - pr.top + 6), fits = tt + (lb.offsetHeight || 48) <= par.clientHeight - 8, upright = innerWidth < 600 && innerHeight > innerWidth; if ((short.matches || ROWM || upright) && fits) {   /* Stuart 17 Nov 12:31 "the gps orange pill is jumping around", found again 19 Nov: on a phone held upright the pill has one place, under the strips, so the boat's figures arriving in the bottom bar cannot move it */ if (Math.abs((parseFloat(lb.style.top) || -99) - tt) > 3) lb.style.top = tt + 'px'; lb.style.bottom = 'auto'; }   /* no room under the strips (the panel open on a phone): the pill stays at the foot of the chart rather than off it */ else if (lb.style.bottom === 'auto') { lb.style.top = ''; lb.style.bottom = ''; } lb.style.maxHeight = ''; return; }
    if (lb.style.bottom === 'auto') { lb.style.top = ''; lb.style.bottom = ''; }
    var r = lb.getBoundingClientRect(); lb.style.maxHeight = Math.max(120, Math.round(r.bottom - ut - 6)) + 'px'; }
  /* Screen rules (Stuart 16 Nov 21:31, iPhone photo: the Plotter bar on top of the sun and moon line): the strips that hang under the
     top bar (instrument strip, Plotter bar, sun and moon line) stack one under another instead of sharing a place. A strip the user
     has dragged keeps its place. */
  var insP = null; function insets() { if (!insP) { insP = document.createElement('div'); insP.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(insP); } var c = getComputedStyle(insP); return { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 }; }   /* the phone's own bars (notch, home bar), Stuart 22:29 */
  window.__fsInsets = insets;
  window.__fsTopStack = true;   /* the strips under the top bar have one keeper only (17 Nov: Route+'s own strip placer and this one disagreed, and the strip flashed) */
  function topStack() { var tb = document.querySelector('.top'), y = insets().t; if (tb && vis(tb)) y = Math.max(y, tb.getBoundingClientRect().bottom); var bdg = document.getElementById('fsBadge'), bR = bdg && vis(bdg) ? bdg.getBoundingClientRect() : null;   /* clear screen: a strip that would sit beside the logo (M20) goes under it, one clear of it stays at the top */
    ['#editBar', '#navStrip', '#fsPlot', '#navPlot', '#solSeq', '#fsDemo', '#astroLine', '#updBar', '#solTestBar', '#errBox']   /* F7 (Stuart's photo 06:16): an error box goes under the strips, not over the plotter */.forEach(function (q) {   /* 17 Nov (Stuart's tablet photo): the Course changed box, the plotter and the GPS pill stack, not overlap */ var e = document.querySelector(q); if (!e || !vis(e) || e.style.translate) return; var par = e.offsetParent, fx = !par && getComputedStyle(e).position === 'fixed'; if (!par && !fx) return; var pt = par ? par.getBoundingClientRect().top : 0, er = e.getBoundingClientRect(), ot = par ? e.offsetTop : er.top; if (bR && er.left < bR.right + 4 && er.top - (ot - (Math.max(y + 6, 8) - pt)) < bR.bottom + 4) y = Math.max(y, bR.bottom); var want = Math.round(Math.max(y + 6, 8) - pt); if (Math.abs(ot - want) > 1) e.style.top = want + 'px';   /* fixed boxes (the start sequence, test mode) stack too */ y = e.getBoundingClientRect().bottom; }); }
  function tick() { try { fabRow(); liveFit(); topStack(); } catch (e) {} var sb = document.getElementById('solStep'), on = (phone.matches && open()) || !!(sb && !sb.hidden);   /* the Solent step box on any screen */ if (document.body && document.body.classList.contains('fabsoff') !== on) document.body.classList.toggle('fabsoff', on); try { covers(); } catch (e) {} }
  function css() { if (document.getElementById('fabsOffCss')) return; var s = document.createElement('style'); s.id = 'fabsOffCss'; s.textContent = 'body.fabsoff .fabhelp,.fabhelp.fabcov{display:none!important}body.gpsbigshort #navStrip{display:none!important}';   /* a phone held sideways has no room for the instrument strip and the GPS window together; the GPS window shows SOG and COG */ document.head.appendChild(s); }
  /* F102 (Stuart 21 Nov 14:15, A): the layout check ran every 0.3 s whether or not anything had changed, most of the work of an idle page.
     It now runs when something on screen changes (an element shown or hidden, moved, restyled, added or removed, the window resized),
     once per frame at most, with a check every 3 s as a safety net. Its own changes do not wake it again. */
  var due = false, mo = null;
  function soon() { if (due) return; try { if (window.NavDrag && NavDrag.on()) return; } catch (e) {}   /* not while a window is being moved: its own movement would wake the check every frame and pull it back (windows-slideoff, 21 Nov) */
    due = true; requestAnimationFrame(function () { due = false; tick(); if (mo) mo.takeRecords(); }); }
  function start() { css(); tick();
    if (window.MutationObserver) { mo = new MutationObserver(function (rs) { for (var i = 0; i < rs.length; i++) { var t = rs[i].target; if (t && t.nodeType !== 1) t = t.parentNode; if (t && t.closest && t.closest('#now,#clock,#dataChip,#pgP,#pgT,.rpgrid,.rprest,.npbody,.navtoast,#tip,#tzRow')) continue; if (rs[i].type === 'attributes' && rs[i].target.getAttribute && rs[i].target.getAttribute(rs[i].attributeName) === rs[i].oldValue) continue; soon(); return; } });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['hidden', 'class', 'style'] }); }
    window.addEventListener('resize', soon); window.addEventListener('orientationchange', soon); document.addEventListener('scroll', soon, true);
    setInterval(function () { if (!document.hidden) tick(); }, window.__fsSaver ? 6000 : 3000); }
  window.__fsFabsTick = tick;
  /* The phone's own keyboard (Stuart 16 Nov 22:29: the device's menus must not overlay ours): while a field in a window placed over the
     chart has the keyboard, the window lifts so the field and the window's top stay in view above the keyboard and its bar; it goes
     back when the keyboard closes. The Solent step box has its own (solent.js kbFit). */
  function kbBox(f) { var e = f && f.parentElement, box = null; while (e && e !== document.body) { var c = getComputedStyle(e).position; if (c === 'fixed' || c === 'absolute') box = e; e = e.parentElement; } return box; }
  /* the keyboard is up when the visible part of the page is well short of its height with no field in use (17 Nov, Stuart's iPhone
     photo: on his Safari the page height shrank with the keyboard, so comparing with it missed the keyboard and the box stayed under it) */
  var VVH = 0; function typingNow() { var f = document.activeElement; return !!(f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName) && !/^(checkbox|radio|range|button|file|color)$/.test(f.type || '')); }
  function vvNote() { var vv = window.visualViewport; if (vv && !typingNow()) VVH = vv.height; }
  window.__fsKbUp = function () { var vv = window.visualViewport; if (!vv || !typingNow()) return false; if (!VVH) VVH = Math.max(vv.height, innerHeight); return innerHeight - vv.height > 120 || VVH - vv.height > 120; };
  if (window.visualViewport) { vvNote(); visualViewport.addEventListener('resize', function () { setTimeout(vvNote, 0); }); window.addEventListener('orientationchange', function () { VVH = 0; setTimeout(vvNote, 600); }); }
  function kbLift() { var vv = window.visualViewport; if (!vv) return; var f = document.activeElement, typing = typingNow(), kb = window.__fsKbUp();
    var box = typing && kb ? kbBox(f) : null; if (box && box.id === 'solStep') box = null;
    [].forEach.call(document.querySelectorAll('[data-kbpad]'), function (e) { if (!(typing && kb && e.contains(f))) { e.style.paddingBottom = e.dataset.kbpad === '-' ? '' : e.dataset.kbpad; delete e.dataset.kbpad; } });
    if (typing && kb && !box) { var bot0 = vv.offsetTop + vv.height - 8, r0 = f.getBoundingClientRect(); if (r0.bottom > bot0) { var sc = f.parentElement; while (sc && sc !== document.body) { var oy = getComputedStyle(sc).overflowY; if ((oy === 'auto' || oy === 'scroll') && sc.clientHeight > 40) break; sc = sc.parentElement; }
        if (sc && sc !== document.body) { if (sc.dataset.kbpad == null) { sc.dataset.kbpad = sc.style.paddingBottom || '-'; sc.style.paddingBottom = Math.round(innerHeight - vv.height + 40) + 'px'; } sc.scrollTop += Math.ceil(r0.bottom - bot0 + 8); } else try { f.scrollIntoView({ block: 'center' }); } catch (e) {} } return; }   /* a field in a panel: the panel scrolls it above the keyboard */
    [].forEach.call(document.querySelectorAll('[data-kblift]'), function (e) { if (e !== box) { e.style.transform = e.dataset.kblift === '-' ? '' : e.dataset.kblift; e.style.maxHeight = e.dataset.kbmh === '-' ? '' : e.dataset.kbmh; e.style.overflowY = e.dataset.kbov === '-' ? '' : e.dataset.kbov; delete e.dataset.kblift; delete e.dataset.kbmh; delete e.dataset.kbov; } });
    if (!box) return; if (box.dataset.kblift == null) { box.dataset.kblift = box.style.transform || '-'; box.dataset.kbmh = box.style.maxHeight || '-'; box.dataset.kbov = box.style.overflowY || '-'; }
    box.style.transform = box.dataset.kblift === '-' ? '' : box.dataset.kblift; var top = vv.offsetTop + 8, bot = vv.offsetTop + vv.height - 8, br = box.getBoundingClientRect();
    if (br.height > bot - top || box.scrollHeight > bot - top) { box.style.maxHeight = Math.round(bot - top) + 'px'; box.style.overflowY = 'auto'; br = box.getBoundingClientRect(); }
    var r = f.getBoundingClientRect(), dy = 0; if (r.bottom > bot) dy = r.bottom - bot; if (br.top - dy < top) dy = Math.max(0, br.top - top); if (dy > 0) box.style.transform = 'translateY(' + (-Math.round(dy)) + 'px)';
    r = f.getBoundingClientRect(); if (r.bottom > bot) box.scrollTop += Math.ceil(r.bottom - bot + 8); else if (r.top < top) box.scrollTop -= Math.ceil(top - r.top + 8); r = f.getBoundingClientRect(); if (r.bottom > bot || r.top < top) try { f.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  if (window.visualViewport) { visualViewport.addEventListener('resize', function () { setTimeout(kbLift, 50); }); visualViewport.addEventListener('scroll', function () { setTimeout(kbLift, 50); }); }
  document.addEventListener('focusin', function () { setTimeout(kbLift, 300); }); document.addEventListener('focusout', function () { setTimeout(kbLift, 300); });
  window.__fsKbLift = kbLift;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
