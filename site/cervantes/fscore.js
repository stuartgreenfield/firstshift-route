/* FirstShift Route: screen and offline helpers shared with Route+ (13 Nov 2026).
   Offline store, clear screen, reopen where it left off, notes, and the forecast models guide in Help. No boat code here. */
(function () {
  'use strict';
  var KEY = 'fs-ui', C = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }
  /* ---- offline store (Stuart 13 Nov: the apps must work with no internet once the forecasts have been downloaded once).
     Every forecast, depth, coastline, course and chart-data file the page fetches from the Route server is kept on the device;
     when there is no signal, the kept copy is used and the app says how old it is. Live
     services (AIS online, boat code) still need a signal and simply wait. ---- */
  var OFF = { name: 'fs-offline-v1', used: {}, at: null };
  function offKeep(u) { var p = u.pathname; return /\/(pack|courses|zones)\//.test(p) || /\/status\.json$/.test(p) || /\/pre\/routes\.json$/.test(p); }
  function offKey(u) { return u.origin + u.pathname + (/\/pre\/routes\.json$/.test(u.pathname) ? u.search : ''); }
  /* where the files are kept: the browser's Cache store, or (Stuart 13 Nov, iPhone test) IndexedDB when the page is opened from
     the Mac's Wi-Fi address, because a plain http address on the local network is not a "secure context" and Safari and Chrome
     then hide the Cache store. IndexedDB works there, so the iPhone keeps the forecasts for no signal too. */
  var STORE = (function () {
    if (window.caches && window.isSecureContext !== false) return {
      kind: 'cache',
      get: function (k) { return caches.open(OFF.name).then(function (c) { return c.match(k); }); },
      put: function (k, r) { return caches.open(OFF.name).then(function (c) { return c.put(k, r); }); },
      keys: function () { return caches.open(OFF.name).then(function (c) { return c.keys(); }).then(function (k) { return k.map(function (r) { return r.url; }); }); }
    };
    if (!window.indexedDB) return null;
    var dbp = null; function db() { return dbp || (dbp = new Promise(function (ok, no) { var q = indexedDB.open('fs-offline', 1); q.onupgradeneeded = function () { q.result.createObjectStore('f'); }; q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; })); }
    function tx(mode, fn) { return db().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('f', mode), st = t.objectStore('f'), out = fn(st); t.oncomplete = function () { ok(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { no(t.error); }; }); }); }
    return {
      kind: 'idb',
      get: function (k) { return tx('readonly', function (st) { return st.get(k); }).then(function (v) { return v ? new Response(v.b, { status: 200, headers: { 'Content-Type': v.t || 'application/octet-stream' } }) : undefined; }); },
      put: function (k, r) { return r.arrayBuffer().then(function (buf) { return tx('readwrite', function (st) { st.put({ b: buf, t: r.headers.get('Content-Type') || '', at: Date.now() }, k); }); }); },
      keys: function () { return tx('readonly', function (st) { return st.getAllKeys(); }); }
    };
  })();
  if (window.fetch && STORE) (function () {
    var real = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url; try { url = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (e) { return real(input, init); }
      if (url.origin !== location.origin || (init && init.method && init.method !== 'GET') || !offKeep(url)) return real(input, init);
      var key = offKey(url), big = /\/pack\/(?!pack\.json)/.test(url.pathname);
      var fromStore = function (why) { if (!(why && why.message === 'slow')) OFF.failed = true;   /* A (Stuart 20 Nov 16:18): slow is not lost: the request carries on, the newer copy is kept when it lands, and the New forecast bar offers it; only a real failure waits for the signal and reloads */
      return STORE.get(key).then(function (r) { if (!r) throw why || new Error('offline and not downloaded yet'); OFF.used[url.pathname] = true; offNote(); return r; }); };
      if (navigator.onLine === false) return fromStore();
      var net = real(input, init).then(function (r) { if (!r.ok && r.status >= 400 && r.status < 500) return r; if (!r.ok) throw new Error('server ' + r.status);   /* a missing file is an answer, not lost signal: before, a 404 counted as offline and the page reloaded every 30 s (14 Nov 2026) */ var cp = r.clone(); STORE.put(key, cp).catch(function () {}); if (/pack\/pack\.json$/.test(url.pathname)) { try { localStorage.setItem('fs-offline-at', String(Date.now())); } catch (e) {} } return r; });
      if (big) return net.catch(function (e) { return fromStore(e); });
      var timer = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('slow')); }, 8000); });   /* a weak signal at sea: do not wait forever for the small files */
      return Promise.race([net, timer]).catch(function (e) { return fromStore(e).catch(function () { return net; }); });
    };
  })();
  /* signal back after an offline or failed start (Stuart 13 Nov: it would not route until reloaded): check the server every 30 s,
     and once it answers, reload so the newest forecasts come in; reopen-where-it-left-off keeps the screen as it was. Never during a MOB. */
  var offChk = 0;
  function signalBack() {
    if (!OFF.failed || OFF.reloading) return; if (Date.now() - offChk < 30000) return; offChk = Date.now();
    if (navigator.onLine === false) return;
    var u = new URL('../status.json?nav=' + Date.now(), location.href).href;
    var x = new XMLHttpRequest(); x.open('GET', u, true); x.timeout = 10000;
    x.onload = function () { if (x.status !== 200 || OFF.reloading) return; var mob = document.getElementById('mob'); if (mob && !mob.hidden) return;
      /* never reload by itself around the start (Stuart 20 Nov 12:37): from 15 minutes before the gun to 10 minutes after, offer it instead */
      var gun = null; try { gun = window.__fsGunAt ? window.__fsGunAt() : null; } catch (e) {} var nowS = Date.now() / 1000;
      if (gun && nowS > gun - 900 && nowS < gun + 600) { if (!OFF.offered || Date.now() - OFF.offered > 300000) { OFF.offered = Date.now();   /* offered again every 5 minutes */ var tb = document.getElementById('navToast'); clearToast('Signal back: tap here to fetch the latest forecasts.'); tb = document.getElementById('navToast'); if (tb) { tb.style.pointerEvents = 'auto'; tb.onclick = function () { tb.onclick = null; OFF.reloading = true; try { if (window.__navResume) window.__navResume.save(); } catch (e) {} location.reload(); }; } } return; }
      OFF.reloading = true; try { if (window.__navResume) window.__navResume.save(); } catch (e) {} clearToast('Signal back: fetching the latest forecasts…'); setTimeout(function () { location.reload(); }, 2500); };
    x.send();
  }
  setInterval(signalBack, 5000); window.addEventListener('online', function () { offChk = 0; signalBack(); });
  var offShown = false;
  function offNote() {
    if (offShown) return; offShown = true;
    setTimeout(function () { var at = +(localStorage.getItem('fs-offline-at') || 0), d = at ? new Date(at) : null;
      var t = 'No signal: using the forecasts and chart data kept on this device' + (d ? ', downloaded ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' on ' + d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] : '') + '. Everything else works as normal.';
      try { clearToast(t); } catch (e) { console.log(t); } }, 1500);
  }
  window.__navOffline = { used: function () { return Object.keys(OFF.used); }, kind: STORE ? STORE.kind : 'none', keys: function () { return STORE ? STORE.keys() : Promise.resolve([]); }, has: function (k) { return STORE ? STORE.get(k).then(function (r) { return !!r; }) : Promise.resolve(false); } };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  /* ---- clear screen (Stuart 13 Nov): only the chart, MOB and one MENU button.
     Long press on the chart, or × on a folded phone panel, clears it; MENU brings everything back, and it clears itself
     again after a minute without a tap on the controls. MOB is never hidden. ---- */
  var CL = { peek: false, timer: null, menu: null };
  function busyUi() { return ['wiz', 'sheet', 'races', 'navPanel', 'navLog', 'layers', 'mob', 'editBar', 'shareSheet'].some(function (id) { var e = document.getElementById(id); return e && !e.hidden; }); }
  /* 21 Nov (Stuart 07:19): Mark's default is "Off: leave them up"; Route's stays 1 minute */
  function hideV() { return C.hide == null ? (window.FS_MARK ? 0 : 1) : C.hide; }
  function clearSet(on, why) {
    C.clear = !!on; save(); CL.peek = false; clearTimeout(CL.timer);
    document.body.classList.toggle('navclear', !!on);
    if (on && !C.clearTold) { C.clearTold = true; save(); clearToast('Clear screen. MENU, or a long press on the chart, brings the menus back.'); }
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }
  function clearPeek() { document.body.classList.remove('navclear'); CL.peek = true; C.clear = true; save(); clearArm(); try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  function clearArm() { clearTimeout(CL.timer); if (!CL.peek) return; var after = CL.after || hideV() * 60000; if (!after) return; CL.timer = setTimeout(function () { if (!CL.peek) return; if (busyUi()) { clearArm(); return; } CL.peek = false; document.body.classList.add('navclear'); try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, after); }
  function clearToast(t) { var e = document.getElementById('navToast'); if (!e) { e = el('div', 'navtoast'); e.id = 'navToast'; e.setAttribute('role', 'status'); document.body.appendChild(e); } var keep = !e.hidden && e._lines ? e._lines.filter(function (x) { return x !== t && !(/^Up to date|^Carried on/.test(x) && /^Up to date|^Carried on|^Boat link on|^Carried on\. No/.test(t)); }) : []; e._lines = keep.concat([t]).slice(-3); e.textContent = e._lines.join('\n'); e.hidden = false; clearTimeout(e._t); e._t = setTimeout(function () { e.hidden = true; e._lines = []; }, 8000); }   /* notes stack, so a no-signal note is not hidden by the next one */
  function hideChoice(near) {
    var o = document.getElementById('navHideCard'); if (o) { o.remove(); return; }
    o = el('div', 'navhidecard', '<label>Hide the menus again after <select id="navHideSel" aria-label="Hide the menus again after"><option value="0">Off: leave them up</option><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option></select></label><span class="navhiderow"><button type="button" class="btn" id="navHideMove">Move this button</button><button type="button" class="btn primary" id="navHideOk">Done</button></span>');
    o.id = 'navHideCard'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Clear screen'); document.body.appendChild(o);
    var r = near.getBoundingClientRect(); o.style.right = Math.max(8, innerWidth - r.left + 8) + 'px'; o.style.top = Math.max(8, Math.min(innerHeight - o.offsetHeight - 8, r.top - 10)) + 'px';
    var sel = o.querySelector('select'); sel.value = String(hideV());
    sel.onchange = function () { window.__navHide(+sel.value); clearToast(+sel.value ? 'Menus hide again after ' + sel.value + ' minute' + (+sel.value > 1 ? 's' : '') + ' without a tap.' : 'Menus stay up until you clear the screen.'); };
    o.querySelector('#navHideOk').onclick = function () { o.remove(); };
    o.querySelector('#navHideMove').onclick = function () { o.remove(); if (window.NavDrag) NavDrag.begin(near.id); };   /* a long press on a round button moves it; on CLEAR the long press is this choice, so moving is here */
  }
  function clearBuild() {
    var bar = document.querySelector('.bar'); if (!bar) return;
    var mb = el('button', 'navmenub', 'MENU'); mb.id = 'navMenuBtn'; mb.type = 'button'; mb.setAttribute('aria-label', 'Show the menus'); bar.appendChild(mb);
    var cb = el('button', 'fabhelp navclearb', '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>CLEAR</span>'); cb.id = 'navClearBtn'; cb.type = 'button'; cb.title = 'Clear screen: just the chart'; cb.setAttribute('aria-label', 'Clear screen: just the chart');
    var chart = document.querySelector('.chart'); if (chart) chart.appendChild(cb);
    mb.onclick = function () { clearPeek(); };
    /* 21 Nov (Stuart 07:19): a long press on CLEAR opens the same "Hide the menus again after" choice as Settings, Display, Clear screen */
    var cbl = null;
    cb.addEventListener('pointerdown', function () { clearTimeout(cbl); cb._lp = false; cbl = setTimeout(function () { cb._lp = true; try { if (navigator.vibrate) navigator.vibrate(30); } catch (er) {} hideChoice(cb); }, 600); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (k) { cb.addEventListener(k, function () { clearTimeout(cbl); if (cb._lp) { cb._lp = false; cb._skip = Date.now() + 500; } }); });   /* the click that ends a long press is not a tap */
    cb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cb.onclick = function () { if (Date.now() < (cb._skip || 0)) return; clearSet(true); };
    /* × on the phone panel: when it is already folded, clear the screen instead of doing nothing */
    var px = document.getElementById('panelX');
    /* 21 Nov (Stuart 07:19): with "Off: leave them up" chosen the × only folds the panel, never clears; only CLEAR clears */
    if (px) px.addEventListener('click', function (e) { var pn = document.getElementById('panel'); if (hideV() !== 0 && innerWidth < 900 && pn && pn.classList.contains('collapsed')) { e.stopImmediatePropagation(); e.preventDefault(); clearSet(true); } }, true);
    /* any tap on the controls while peeking keeps the menus up a while longer */
    document.addEventListener('pointerdown', function (e) { if (CL.peek && !(e.target && e.target.id === 'map')) clearArm(); }, true);
    /* long press on the chart: clear, or bring the menus back */
    var cv = document.getElementById('map'), lp = null;
    if (cv) {
      /* 18 Nov 05:39 (Stuart: "the menus continue to disappear even the drop down saying leave them on is on"): a finger resting on
         the chart for a moment before a pan cleared the screen. Now the long press counts only when the finger lifts without having
         moved, with no second finger, and with "Off: leave them up" chosen it never clears the screen (the CLEAR button still does) */
      var fingers = 0;
      cv.addEventListener('pointerdown', function (e) { fingers++; if (lp && fingers > 1) { lp.no = true; return; } lp = { x: e.clientX, y: e.clientY, at: Date.now(), id: e.pointerId, fired: false, no: false }; });
      cv.addEventListener('pointermove', function (e) { if (lp && e.pointerId === lp.id && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) lp.no = true; });
      ['pointerup', 'pointercancel'].forEach(function (k) { cv.addEventListener(k, function (e) { fingers = Math.max(0, fingers - 1); if (!lp || e.pointerId !== lp.id) return; var held = Date.now() - lp.at;
        if (k === 'pointerup' && !lp.no && held >= 700 && held < 4000) { var cl = document.body.classList.contains('navclear');
          if (cl || hideV() !== 0) { lp.fired = true; if (cl) clearPeek(); else clearSet(true); try { if (navigator.vibrate) navigator.vibrate(30); } catch (er) {} e.stopImmediatePropagation(); } }
        if (!lp.fired) lp = null; }, true); });
      cv.addEventListener('click', function (e) { if (lp && lp.fired) { e.stopImmediatePropagation(); e.preventDefault(); lp = null; } }, true);
      cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    /* M20 (Stuart 17 Nov 06:05): "On all 4 tools when full screen mode is on (reduced menus) we need the product logo top left with the rotating line to signify it is working and receiving". The product's own sails mark in a ring that turns while the tool is online and receiving; still and grey when offline. A tap brings the menus back. */
    var lb = document.querySelector('.top .logobox'), bg = el('button', 'fsbadge', ''); bg.id = 'fsBadge'; bg.type = 'button'; bg.setAttribute('aria-label', 'Show the menus');
    var mk = lb && (lb.querySelector('svg.mk-s') || lb.querySelector('svg') || lb.querySelector('img')); if (mk) bg.appendChild(mk.cloneNode(true)); else bg.textContent = 'FS';
    bg.insertAdjacentHTML('afterbegin', '<span class="mkdisc" aria-hidden="true"></span>');   /* the turning line, drawn on the graphics side (17 Nov 22:55) */
    document.body.appendChild(bg); bg.onclick = function () { clearPeek(); };
    var tint = function () { if (!lb) return; var cs = getComputedStyle(lb); ['--mk-navy', '--mk-blue', '--mk-ink', '--mk-dot'].forEach(function (v) { var x = cs.getPropertyValue(v); if (x) bg.style.setProperty(v, x.trim()); }); bg.style.color = cs.color; }; tint(); setInterval(tint, 3000);   /* the logo's own colours, light or dark, as in the top bar */
    /* F49 (Stuart 18 Nov 07:55): the logo's line turns while GPS fixes are arriving, and stands still and grey when none are; the same
       in the top bar and on the clear-screen badge, in all four tools. "Arriving" is a real GPS fix (phone or boat, not dead reckoning)
       in the last 5 seconds, or, on Route+ and Mark+, any data from the boat's instruments (window.__navRx). It used to follow
       whether the phone was online, which said nothing about the GPS. */
    if (lb && !lb.querySelector('.mkdisc')) { lb.classList.add('mkring'); lb.insertAdjacentHTML('afterbegin', '<span class="mkdisc" aria-hidden="true"></span>'); }
    var rxOn = function () { var f = null, boat = false; try { f = window.__fsLiveFix && window.__fsLiveFix(); } catch (e) {} try { boat = !!(window.__navRx && window.__navRx()); } catch (e) {} return !!(f && !f.dr && Date.now() - (f.at || 0) < 5000) || boat; };
    var live = function () { var on = rxOn(); bg.classList.toggle('off', !on); if (lb) { lb.classList.toggle('rx', on); lb.title = on ? 'GPS arriving' : 'No GPS arriving'; } bg.title = (on ? 'GPS arriving' : 'No GPS arriving') + '. Tap for the menus.'; }; live(); setInterval(live, 1000);
    if (window.MutationObserver && lb) new MutationObserver(function () { var n = lb.querySelector('svg.mk-s') || lb.querySelector('svg'); if (n && !bg.querySelector('svg')) { bg.textContent = ''; bg.appendChild(n.cloneNode(true)); } else if (n && bg.firstChild && n.outerHTML !== bg.firstChild.outerHTML) { bg.replaceChild(n.cloneNode(true), bg.firstChild); } }).observe(lb, { childList: true, subtree: true });
    if (C.clear) { C.clear = false; save(); }   /* Stuart 17 Nov 14:19: every tool opens with all its menus showing; clear screen is chosen each time */
    /* the GPS pill steps aside while the chart's information box is open (Stuart 13 Nov) */
    var tip = document.getElementById('tip'); if (tip && window.MutationObserver) (function () {   /* Stuart 13 Nov: the GPS pill kept jumping about on the Mac, and vanished when he moved the mouse to use it.
         The pill never hides for the box that follows the mouse: that box moves up out of the pill's way instead. Only a box
         that was tapped or clicked (docked, on a phone) hides the pill, and only while it really covers it. */
      var busy = false, over = function (a, r) { return a.height > 0 && r.height > 0 && a.left < r.right + 6 && a.right > r.left - 6 && a.top < r.bottom + 6 && a.bottom > r.top - 6; };
      var chk = function () { if (busy) return; var lb = document.getElementById('liveBox'), hide = false;
        if (!tip.hidden && lb && !lb.hidden) { var a = tip.getBoundingClientRect(), r = lb.getBoundingClientRect();
          if (over(a, r)) { if (tip.classList.contains('docked')) hide = true; else { var pr = tip.offsetParent ? tip.offsetParent.getBoundingClientRect() : { top: 0 }; busy = true; tip.style.top = Math.max(4, r.top - pr.top - a.height - 10) + 'px'; busy = false; } } }
        document.body.classList.toggle('navtip', hide); };
      if (window.MutationObserver) new MutationObserver(chk).observe(tip, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] }); setInterval(chk, 500); })();
  }
  var RES = 'fs-resume', resumed = false, resumeAt = 0;
  function resumeSave() {
    if (!resumed) return;
    var o = { at: Date.now() };
    try { if (window.__navViewGet) o.view = window.__navViewGet(); if (window.__navLiveState) o.gps = window.__navLiveState(); } catch (e) {}
    try { localStorage.setItem(RES, JSON.stringify(o)); } catch (e) {}
  }
  function resumeLoad() {
    var o = null; try { o = JSON.parse(localStorage.getItem(RES) || 'null'); } catch (e) {}
    resumed = true; resumeAt = Date.now(); if (!o) return;
    var bits = [];
    try { if (o.view && window.__navViewSet) { window.__navViewSet(o.view); bits.push('chart view'); } } catch (e) {}
    try { if (o.gps && o.gps.on && window.__navLiveRestore) { window.__navLiveRestore(o.gps); bits.push('Live GPS'); } } catch (e) {}
    if (C.clear) bits.push('clear screen');
    if (bits.length) clearToast('Carried on where you left off: ' + bits.join(', ') + '.');
  }
  window.__navQuiet = function () { try { var o = JSON.parse(localStorage.getItem(RES) || 'null'); return !!(o && o.gps && o.gps.on); } catch (e) { return false; } };
  function resumeWhenReady() {
    var n = 0, t = setInterval(function () { n++; var ready = false; try { ready = !!(window.__navCourse && window.__navCourse() && window.__navViewGet); } catch (e) {}
      if (ready || n > 120) { clearInterval(t); setTimeout(resumeLoad, 800); } }, 500);
  }
  setInterval(resumeSave, 2000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) resumeSave(); });
  window.addEventListener('pagehide', resumeSave);
  window.__navResume = { save: resumeSave, load: resumeLoad, state: function () { try { return JSON.parse(localStorage.getItem(RES) || 'null'); } catch (e) { return null; } } };
  /* the instrument strip sits just below the top buttons, however many rows they wrap to, so it never covers Settings (found 13 Nov) */
  window.NavToast = function (t) { clearToast(t); };
  window.__navHide = function (v) { if (v === undefined) return hideV(); C.hide = v; save(); if (CL.peek) clearArm(); };
  window.NavClear = { set: clearSet, peek: clearPeek, on: function () { return document.body.classList.contains('navclear'); }, _after: function (ms) { CL.after = ms; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { clearBuild(); resumeWhenReady(); }); else { clearBuild(); resumeWhenReady(); }

  /* Help: forecast models and resolution guide (Stuart 13 Nov). Grids and steps as downloaded by the FirstShift server (scripts/fetch.py, pack_live.py). */
  var MODELS = [
    ['Wind', 'Met Office UKV', '2 km', 'hourly', 'Coast, headlands, the Solent and sea breezes in the first day or two'],
    ['Wind', 'Météo-France AROME', '2.5 km', 'hourly, to 48 h', 'The Channel and French coast in the first two days'],
    ['Wind', 'DWD ICON-EU', '7 km', 'hourly, to 78 h', 'Days two and three'],
    ['Wind', 'Météo-France ARPEGE', '0.1°, about 11 km', 'hourly, to 102 h', 'Days two to four'],
    ['Wind', 'Met Office Global', '10 km', '3-hourly', 'The big picture'],
    ['Wind', 'ECMWF IFS', '0.25°, about 28 by 18 km here', '3-hourly to 144 h, then 6-hourly', 'The big picture and longer races. The 00Z and 12Z runs reach 10 days; the 06Z and 18Z runs stop at 90 h'],
    ['Wind', 'ECMWF AIFS (AI model)', '0.25°', '6-hourly', 'A second opinion on the big picture; smooths out shifts'],
    ['Wind', 'NOAA GFS', '0.25°', 'hourly for two days, then 3-hourly', 'A third global view'],
    ['Wind', 'ECMWF ensemble', '0.25°', '6-hourly', 'How sure the forecast is: a wide spread means take care'],
    ['Tide', 'Copernicus NW Shelf', '1.5 km', 'hourly', 'UK and the Channel'],
    ['Tide', 'Copernicus Iberia-Biscay-Ireland', '0.027°, about 3 km', 'hourly', 'Biscay and Ireland'],
    ['Tide', 'Ifremer MARS2D', '250 m model, read at 500 m', 'hourly', 'Round the Channel Islands and Cherbourg only'],
    ['Waves', 'Copernicus NW Shelf waves', '1.5 km', 'hourly', 'Height, direction and period near the coast'],
    ['Waves', 'ECMWF waves', '0.25°', '3-hourly', 'Open water and longer races']
  ];
  function helpModels() {
    var list = document.getElementById('helpList'); if (!list || list.querySelector('.navmodels')) return;
    var t = [].filter.call(list.querySelectorAll('.htopic'), function (d) { var h = d.querySelector('h3'); return h && /^Forecast models and resolution/.test(h.textContent); })[0];
    if (!t) return;
    var h = '<div class="navmodels">', last = '';
    MODELS.forEach(function (m) { if (m[0] !== last) { h += (last ? '</dl>' : '') + '<h4>' + m[0] + '</h4><dl>'; last = m[0]; } h += '<div class="nm"><dt>' + m[1] + '</dt><dd class="nmg">' + m[2] + ' · ' + m[3] + '</dd><dd>' + m[4] + '</dd></div>'; });
    h += '</dl></div><p class="note">The Full download keeps each grid as listed; on a very long race a layer may be thinned to fit. Lite keeps every second or third point and every third or sixth hour, to save data. ECMWF runs its own model at 9 km, but the free open data is 0.25°. Grid sizes are north to south; at 50°N a degree of longitude is about two thirds of a degree of latitude.</p>';
    t.insertAdjacentHTML('beforeend', h);
  }
  window.__navHelpModels = helpModels;
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#helpBtn,[data-help]')) setTimeout(helpModels, 50); }, true);
  setTimeout(helpModels, 3000); setTimeout(helpModels, 10000);

})();
