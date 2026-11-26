/* FirstShift Route and Route+ (one file since 24 Nov 2026; Route+ had its own copy, navoff.js): Ready for offline (Stuart 13 Nov 2026).
   One button keeps everything this race needs on the device: every forecast in the chosen plan, the coast and depth,
   the overview, the course and the chart data, so Route works with no signal at sea. the offline store
   (fscore.js) does the keeping: every file fetched from the Route server goes into it.
   New forecasts when the signal comes back: Route checks every five minutes; when a newer run is on the server and the
   chosen plan is under 20 MB, Route fetches it by itself and routes again. Above 20 MB it asks first, with the size,
   because a phone on mobile data at sea can run up a bill. Never during a MOB, and never while routing. */
(function () {
  'use strict';
  var PLUS = !!window.FS_PLUS, NAME = PLUS ? 'Route+' : 'Route';   /* Route+ keeps its own store name, so nothing already on a phone is lost */
  var STORE = PLUS ? 'nav-offline-v1' : 'fs-offline-v1', AUTO_MB = 20;
  function $(id) { return document.getElementById(id); }
  function mb(b) { return b >= 1e6 ? (b / 1e6).toFixed(b >= 1e7 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB'; }
  function fc() { try { return window.__navFc && window.__navFc(); } catch (e) { return null; } }
  function meta() { return fetch((window.FS_PACK || 'pack/') + 'pack.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('server'); return r.json(); }); }
  function base() { return new URL(window.FS_PACK || 'pack/', location.href).href; }
  /* the files the chosen plan needs, with their download sizes */
  function want(m, choice) {
    var out = [], b = base();
    (m.layers || []).forEach(function (L) { var c = choice && choice[L.id]; if (!c || c === 'off' || !L[c]) return; var v = L[c]; out.push({ url: b + v.file, gz: v.gz || v.bytes || 0, name: L.name }); if (v.runs) out.push({ url: b + v.runs, gz: 2000, name: L.name + ' runs' }); });
    if (m.coast && m.coast.file) out.push({ url: b + m.coast.file, gz: m.coast.gz || 0, name: 'coast' });
    if (m.overview && m.overview.file) out.push({ url: b + m.overview.file, gz: m.overview.gz || m.overview.bytes || 0, name: 'overview' });
    out.push({ url: b + 'pack.json', gz: 20000, name: 'forecast list' });
    return out;
  }
  function have(list) {
    if (!window.__navOffline || !window.__navOffline.has) return Promise.resolve(list.map(function () { return false; }));
    return Promise.all(list.map(function (f) { return window.__navOffline.has(f.url); }));
  }
  var S = { busy: false, last: null, note: '' };
  function status() {
    var f = fc(); if (!f || !f.choice) return Promise.resolve(null);
    if (navigator.onLine === false) { S.last = { offline: true }; return Promise.resolve(S.last); }
    return meta().catch(function () { return null; }).then(function (m) {
      if (!m) { S.last = { offline: true }; return S.last; }
      var list = want(m, f.choice); return have(list).then(function (h) {
        var miss = list.filter(function (x, i) { return !h[i]; }), tot = list.reduce(function (a, x) { return a + x.gz; }, 0), need = miss.reduce(function (a, x) { return a + x.gz; }, 0);
        S.last = { m: m, list: list, miss: miss, tot: tot, need: need, run: m.run, newer: f.built && (m.built || m.t0) !== f.built };
        return S.last;
      });
    });
  }
  function get(list, prog) {
    var i = 0, done = 0, bad = [];
    return new Promise(function (res) {
      (function next() {
        if (i >= list.length) { res(bad); return; }
        var f = list[i++];
        fetch(f.url).then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); }).then(function () { done++; prog(done, list.length); next(); }, function () { bad.push(f.name); done++; prog(done, list.length); next(); });
      })();
    });
  }
  function ready() {
    if (S.busy) return Promise.resolve();
    S.busy = true; S.note = 'Checking…'; paint();
    return status().then(function (st) {
      if (!st) { S.note = 'Route first: ' + NAME + ' needs the race and the forecast plan.'; return; }
      if (st.offline) { S.note = 'No signal now. What is already on the device is used; try again when there is signal.'; return; }
      if (!st.miss.length) { S.note = 'Already ready: everything for this race is on the device.'; return; }
      return get(st.miss, function (d, n) { S.note = 'Downloading ' + d + ' of ' + n + '…'; paint(); }).then(function (bad) {
        S.note = bad.length ? 'Not downloaded: ' + bad.join(', ') + '. Try again with a better signal.' : 'Ready for offline: ' + mb(st.tot) + ' on this device.';
        try { localStorage.setItem(PLUS ? 'nav-offline-at' : 'fs-offline-at', String(Date.now())); } catch (e) {}
      });
    }).then(function () { S.busy = false; return status(); }).then(function (st) { paint(st); try { if (window.__fsOffCheck) window.__fsOffCheck(); } catch (e) {} }, function () { S.busy = false; paint(); });
  }
  function paint() {
    var box = $('navOffBody'); if (!box) return; var st = S.last, h = '';
    if (!st) h += '<p class="note">Route first, then this shows what is on the device.</p>';
    else if (st.offline) h += '<p class="note"><b>No signal.</b> ' + NAME + ' is using what is on the device.</p>';
    else if (!st.miss.length) h += '<p class="nook">✓ Ready for offline. All ' + st.list.length + ' files for this race, ' + mb(st.tot) + ', forecasts from the ' + st.run + ' run.</p>';
    else h += '<p class="note"><b>Not ready.</b> ' + st.miss.length + ' of ' + st.list.length + ' files to download, ' + mb(st.need) + '.</p>';
    h += '<div class="xrow"><button class="btn primary" id="navOffGo" type="button"' + (S.busy ? ' disabled' : '') + '>' + (st && !st.offline && !st.miss.length ? 'Check again' : 'Make ready for offline') + '</button></div>';
    h += '<p class="note" role="status">' + (S.note || '') + '</p>';
    h += '<p class="note">Uses the forecast plan in Settings, Forecasts (Full or Lite for each model). Do this in harbour on Wi-Fi. At sea, new forecasts under ' + AUTO_MB + ' MB come in by themselves when there is signal; bigger ones ask first.</p>';
    box.innerHTML = h; $('navOffGo').onclick = function () { ready(); };
  }
  function build() {
    var pr = $('navPrefs'), link = $(PLUS ? 'navSetLink' : 's-mine'); if (!link || $('navOff')) return !!$('navOff');
    var d = document.createElement('details'); d.className = 'navprefs navoff'; d.id = 'navOff';
    d.innerHTML = '<summary><b>Ready for offline</b><small id="navOffSum">Keep this race’s forecasts and charts on the device</small></summary><div class="npbody" id="navOffBody"></div>';
    if (pr) pr.parentNode.insertBefore(d, pr.nextSibling); else if (PLUS) link.parentNode.insertBefore(d, link.nextSibling); else link.appendChild(d);
    d.addEventListener('toggle', function () { if (d.open) status().then(paint, paint); });
    paint(); return true;
  }
  var tries = 0, bt = FSBeat.set(function () { if (build() || ++tries > 60) FSBeat.clear(bt); }, 500);
  /* the summary line keeps itself up to date */
  FSBeat.set(function () { var s = $('navOffSum'); if (!s || S.busy) return; status().then(function (st) { if (!st) return; s.textContent = st.offline ? 'No signal: using what is on the device' : !st.miss.length ? '✓ Ready: ' + mb(st.tot) + ' on the device, ' + st.run + ' run' : 'Not ready: ' + mb(st.need) + ' to download'; }).catch(function () {}); }, 60000);

  /* ---- new forecasts at sea: automatic under 20 MB, ask above ---- */
  var asked = null;
  function newCheck() {
    var nd = $('newData'), btn = $('newDataBtn'); if (!nd || nd.hidden || !btn) return;
    var f = fc(); if (!f || f.running) return; var mob = $('mob'); if (mob && !mob.hidden) return;
    meta().then(function (m) {
      if (!f.choice || (m.built || m.t0) === f.built) return;
      var size = want(m, f.choice).reduce(function (a, x) { return a + x.gz; }, 0), key = String(m.built || m.t0);
      if (size <= AUTO_MB * 1e6) { if (asked === key + 'auto') return; asked = key + 'auto'; try { if (window.NavToast) window.NavToast('New forecast (' + m.run + ', ' + mb(size) + '): downloading and routing again.'); } catch (e) {} btn.click(); return; }
      if (asked === key) return; asked = key;
      var t = $('newDataTxt'); if (t && !/MB/.test(t.textContent)) t.textContent += ' · ' + mb(size) + ': tap to download';
      try { if (window.NavToast) window.NavToast('New forecast on the server (' + m.run + '), ' + mb(size) + '. Tap New data to download it when you are happy to use the data.'); } catch (e) {}
    }).catch(function () {});
  }
  FSBeat.set(newCheck, 15000);

  /* ---- model run ages (Stuart 13 Nov: big differences between models, partly from runs of different ages) ----
     Each model's run time and age under its finish box and beside it in Settings, Forecasts; an option to leave out
     runs older than a set age, so a stale run does not pull the combined route about. */
  var AGEK = 'nav-age-max', dropped = {};
  (function () { var st = document.createElement('style'); st.textContent = '.fin .navage.amber{color:#E8A33A}.fin .navage.red{color:#E5484D;font-weight:700}.fin .navage.fresh{color:#4CC38A}.fin .navgn{display:block;margin-top:4px;padding:4px 8px;font:600 12px var(--f-body,system-ui);border-radius:10px;border:1px solid #E8A33A;background:transparent;color:#E8A33A;cursor:pointer}.fin .navgn:disabled{opacity:.7}html[data-night] .fin .navage.amber,html[data-night] .fin .navgn{color:#9A2A1A;border-color:#9A2A1A}'; (document.head || document.documentElement).appendChild(st); })();   /* each old run is left out once; ticking it again keeps it */
  function runs() { var f = fc(), o = {}; if (!f || !f.layers) return o; f.layers.forEach(function (L) { if (L.run_t0) o[L.id] = +L.run_t0; }); return o; }
  function ageH(t0) { return (Date.now() / 1000 - t0) / 3600; }
  function zh(t0) { var d = new Date(t0 * 1000); return ('0' + d.getUTCHours()).slice(-2) + 'Z'; }
  function maxAge() { try { return +(localStorage.getItem(AGEK) || 0); } catch (e) { return 0; } }
  function ageTxt(t0) { var h = ageH(t0); return zh(t0) + ' run, ' + (h < 1 ? 'under an hour' : Math.round(h) + ' h') + ' old'; }
  /* Stuart 22 Nov 07:55 (decided 08:05): each finish box says how old the forecast it used is: amber over 12 h, red over 18 h, "older run"
     when the newest was not ready, and Get newest (with a signal) fetches that model's newest run to this device from Open-Meteo and routes
     again. A model already fetched to this device says so, not the server's older run (the Cervantes card said 20 h old after a fetch). */
  function layerOf(id) { var f = fc(); return f && f.layers ? f.layers.filter(function (L) { return L.id === id; })[0] : null; }
  function hm(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function finAges() {
    var R = runs(), lim = maxAge();
    [].forEach.call(document.querySelectorAll('#finBox .fin[data-id]'), function (d) {
      var id = d.dataset.id, t0 = R[id], L = layerOf(id); var e = d.querySelector('.navage'), g = d.querySelector('.navgn'); if (!t0) { if (e) e.remove(); if (g) g.remove(); return; }
      if (!e) { e = document.createElement('small'); e.className = 'navage'; d.appendChild(e); }
      var dev = !!(L && L.device), h = ageH(t0), txt = dev ? (L.devRun ? ageTxt(L.devRun) + ' · from Open-Meteo to this device' : 'Fresh copy on this device, fetched ' + hm(L.devAt || Date.now())) : ageTxt(t0) + (L && L.latest === false ? ' · older run' : '');   /* 24 Nov: the run it fetched, not only when */
      if (e.textContent !== txt) e.textContent = txt; e.classList.toggle('old', !dev && !!lim && h > lim); e.classList.toggle('amber', !dev && h > 12 && h <= 18); e.classList.toggle('red', !dev && h > 18); e.classList.toggle('fresh', dev);
      var nw = window.__fsOmNewer ? window.__fsOmNewer(id) : null, can = (nw === true || (nw === null && !dev && (h > 12 || (L && L.latest === false)))) && !(L && L.sameAt && Date.now() - L.sameAt < 600000) && navigator.onLine && window.__fsCanFetch && window.__fsCanFetch(id);   /* 24 Nov: shown when Open-Meteo has a newer run than the one here (or, before it answers, the old 12 h rule) */
      if (can && !g) { g = document.createElement('button'); g.type = 'button'; g.className = 'navgn'; g.textContent = 'Get newest'; g.title = 'Fetch the newest run of this model to this device and route again';
        g.onclick = function (ev) { ev.stopPropagation(); if (g.disabled) return; g.disabled = true; g.textContent = 'Fetching…'; window.__fsGetNewest(id).then(function (ok) { if (ok === 'same') { if (L) L.sameAt = Date.now(); g.textContent = 'Already the newest'; setTimeout(function () { g.remove(); }, 4000); return; } g.textContent = ok ? 'Fetched: routing' : 'Could not fetch'; if (!ok) setTimeout(function () { g.disabled = false; g.textContent = 'Get newest'; }, 4000); }); };
        d.appendChild(g); }
      else if (!can && g && !g.disabled) g.remove();
    });
  }

  function modelAges() {
    var box = $('models'); if (!box) return; var R = runs(), lim = maxAge(), left = [], newest = 0;
    [].forEach.call(box.querySelectorAll('[data-m]'), function (cb) { var t = R[cb.getAttribute('data-m')]; if (t && !cb.disabled && t > newest) newest = t; });   /* the newest runs are never left out, so something always routes */
    [].forEach.call(box.querySelectorAll('[data-m]'), function (cb) {
      var id = cb.getAttribute('data-m'), t0 = R[id], lab = cb.closest('label'); if (!lab || !t0) return;
      var e = lab.querySelector('.navage'); if (!e) { e = document.createElement('small'); e.className = 'navage'; lab.appendChild(e); }
      var old = !!lim && ageH(t0) > lim && t0 < newest, txt = ageTxt(t0) + (old ? ': left out' : '');
      if (e.textContent !== txt) e.textContent = txt; e.classList.toggle('old', old);
      if (old && cb.checked && !cb.disabled && !dropped[id + t0]) { dropped[id + t0] = 1; cb.click(); var f2 = fc(); left.push(f2 && f2.lname ? f2.lname(id) : id); }
    });
    if (!$('navAgeRow')) {
      var r = document.createElement('label'); r.className = 'nprow navagerow'; r.id = 'navAgeRow';
      r.innerHTML = 'Leave out model runs older than <select id="navAgeSel" aria-label="Leave out model runs older than"><option value="0">Never</option><option value="12">12 hours</option><option value="18">18 hours</option><option value="24">24 hours</option><option value="36">36 hours</option></select>';
      box.parentNode.insertBefore(r, box.nextSibling);
      $('navAgeSel').value = String(lim);
      $('navAgeSel').onchange = function () { dropped = {}; try { localStorage.setItem(AGEK, this.value); } catch (e) {} if (!+this.value) [].forEach.call(box.querySelectorAll('.navage.old'), function (x) { x.classList.remove('old'); }); modelAges(); finAges(); };
    }
    if (!$('navBlendRow') && $('navAgeRow')) {
      var bl = document.createElement('div'); bl.id = 'navBlendRow'; bl.className = 'navblend';
      bl.innerHTML = '<label class="nprow navagerow">Combine the models <select id="navBlendSel" aria-label="How the models are combined"><option value="0">Standard</option><option value="1">Smooth blend</option></select></label>' +
        '<button class="btn navwhy" id="navBlendWhy" type="button" aria-expanded="false">What’s the difference?</button>' +
        '<div class="navnote navwhytxt" id="navBlendTxt" hidden><p><b>Standard</b> is how Route has always worked. The combined route averages the models’ winds as arrows; when a model’s forecast ends, or the route leaves its area, the next model takes over at once.</p>' +
        '<p><b>Smooth blend</b> changes three things. The wind speed is the average of each model’s speed, so when the models disagree on direction the combined wind is not made weaker than any of them. Over the last three hours of a model’s forecast (AROME HD stops at 51 hours, for example) it fades out as the others fade in. And over the last 10 nm inside the edge of a model’s area (UKV, AROME) it fades into the others, instead of a sudden change.</p>' +
        '<p>In light, shifty winds Smooth blend usually gives a faster combined route, and routes near the edges of the fine models change less suddenly. Each single model’s own route is the same either way, except where it hands over at its end or edge. Changing this routes again.</p></div>';
      $('navAgeRow').parentNode.insertBefore(bl, $('navAgeRow').nextSibling);
      var bs = $('navBlendSel'); try { bs.value = localStorage.getItem('nav-blend') === '1' ? '1' : '0'; } catch (e) {}
      bs.onchange = function () { try { localStorage.setItem('nav-blend', this.value); } catch (e) {} var r = $('run'); if (r) r.click(); };
      $('navBlendWhy').onclick = function () { var t = $('navBlendTxt'); t.hidden = !t.hidden; this.setAttribute('aria-expanded', String(!t.hidden)); };
    }
    if (left.length) try { if (window.NavToast) window.NavToast('Left out of the routing, run too old: ' + left.join(', ') + '. Tick ' + (left.length > 1 ? 'them' : 'it') + ' again in Settings, Forecasts to use ' + (left.length > 1 ? 'them' : 'it') + '.'); } catch (e) {}
  }
  FSBeat.set(function () { try { finAges(); modelAges(); } catch (e) {} }, 3000);
  window.__navAges = { runs: runs, fin: finAges, models: modelAges, max: maxAge };

  window.__navOff = { status: status, ready: ready, want: want, newCheck: newCheck, S: S };
})();
