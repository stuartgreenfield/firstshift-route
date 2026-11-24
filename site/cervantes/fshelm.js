/* FirstShift Route and Mark: HELM, the helmsman's full screen (Stuart 22 Nov 10:33 "we are having helm and nav view on all models yes?",
   go 10:36). Route+ and Mark+ have it from the boat's instruments; here it runs on the phone's GPS alone, so it shows what the GPS
   knows for certain (SOG, COG, the mark) and, dimmer and marked PLAN, what the chosen route expected at this moment (TWA, TWS, sail),
   because without instruments those are the forecast's figures, not the boat's (Stuart 09:43: "the info which is not real should be
   slightly dimmer"). 3, 6 or 9 figures; the start countdown in the last 10 minutes; MOB on a one-second hold; red for night. */
(function () {
  'use strict';
  var KEY = 'fs-helm', C = {}, el = null, R = Math.PI / 180;
  try { C = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }
  function call(n) { try { return window[n] ? window[n]() : null; } catch (e) { return null; } }
  function p3(v) { return ('00' + Math.round((v + 360) % 360)).slice(-3) + '°'; }
  function n1(v) { return v < 10 ? v.toFixed(1) : String(Math.round(v)); }
  function nm(d) { return d < 0.1 ? Math.round(d * 1852) + ' m' : n1(d) + ' nm'; }
  /* each figure: [key, label, value(f, c, p), sub(f, c, p), is it a plan figure] */
  var F = [
    ['sog', 'SOG', function (f) { return f && f.sog != null ? n1(f.sog) : '--'; }, function () { return 'knots, GPS'; }],
    ['cog', 'COG', function (f) { return f && f.cog != null && f.sog > 0.5 ? p3(f.cog) : '--'; }, function () { return 'GPS'; }],
    ['mark', 'MARK', function (f, c) { return c && c.mark ? p3(c.mark.to.brg) : '--'; }, function (f, c) { return c && c.mark ? (c.mark.finish ? 'Finish' : c.mark.name || 'Mark ' + c.mark.n) + ', ' + nm(c.mark.to.nm) : 'No course'; }],
    ['twa', 'TWA', function (f, c, p) { return p ? Math.abs(Math.round(p.twa)) + '°' : '--'; }, function (f, c, p) { return p ? (p.twa < 0 ? 'starboard' : 'port') + ', plan' : 'plan'; }, 1],
    ['tws', 'TWS', function (f, c, p) { return p ? n1(p.tws) : '--'; }, function () { return 'knots, forecast'; }, 1],
    ['sail', 'SAIL', function (f, c, p) { return p ? p.sail.split(',')[0] : '--'; }, function (f, c, p) { var r = p && p.sail.split(', ')[1]; return r ? r + ', plan' : 'plan'; }, 1],
    ['bsp', 'TARGET', function (f, c, p) { return p ? n1(p.bsp) : '--'; }, function () { return 'knots through the water, plan'; }, 1],
    ['off', 'OFF', function (f, c) { return c && c.xte ? (c.xte.d < 0.05 ? '0.0' : n1(c.xte.d)) : '--'; }, function (f, c) { return c && c.xte && c.xte.d >= 0.05 ? 'nm ' + (c.xte.side === 'L' ? 'left' : 'right') + ' of the route' : 'nm off the route'; }],
    ['ahead', 'AHEAD', function (f, c) { if (!c || c.ahead == null) return '--'; var a = Math.round(c.ahead); var m = Math.abs(a); return (a > 0 ? '+' : a < 0 ? '−' : '') + (m >= 60 ? Math.floor(m / 60) + 'h' + ('0' + m % 60).slice(-2) : m + 'm'); }, function () { return 'minutes ahead of the plan'; }]
  ];
  function n() { return [3, 6, 9].indexOf(+C.n) >= 0 ? +C.n : 3; }
  function build() {
    el = document.createElement('div'); el.className = 'fshelm'; el.id = 'fsHelm'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Helm view');
    el.innerHTML = '<div class="fhbar"><div class="fhseg" role="group" aria-label="How many figures"><button data-n="3">3</button><button data-n="6">6</button><button data-n="9">9</button></div>' +
      '<span class="fhutc" id="fhUtc"></span><button class="fhbtn fhmob" id="fhMob" aria-label="Man overboard: press and hold one second">MOB</button><button class="fhbtn" id="fhRed" aria-label="Red night screen">RED</button><button class="fhbtn" id="fhX" aria-label="Close the helm view">✕</button></div>' +
      '<p class="fhwarn" id="fhWarn" hidden></p><div class="fhstart" id="fhStart" hidden></div><div class="fhgrid" id="fhGrid"></div>';
    document.body.appendChild(el);
    el.querySelector('#fhX').onclick = close;
    el.querySelector('#fhRed').onclick = function () { C.red = !C.red; save(); draw(); };
    [].forEach.call(el.querySelectorAll('[data-n]'), function (b) { b.onclick = function () { C.n = +b.dataset.n; save(); draw(); }; });
    var mb = el.querySelector('#fhMob'), t = null, stop = function () { clearTimeout(t); mb.classList.remove('holding'); };
    mb.addEventListener('pointerdown', function () { mb.classList.add('holding'); t = setTimeout(function () { stop(); close(); if (window.__fsMob) window.__fsMob(); }, 1000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) { mb.addEventListener(e, stop); });
  }
  function draw() {
    if (!el || el.hidden) return;
    var f = call('__fsLiveFix'), c = call('__fsLiveCalc'), p = call('__fsPlanNow'), k = n(), d = new Date(), g = el.querySelector('#fhGrid');
    el.classList.toggle('red', !!C.red);
    [].forEach.call(el.querySelectorAll('[data-n]'), function (b) { b.setAttribute('aria-pressed', String(+b.dataset.n === k)); });
    el.querySelector('#fhUtc').textContent = 'UTC ' + d.toISOString().slice(11, 19);
    var w = !f ? 'No GPS fix yet. Turn on Live GPS.' : f.dr ? 'GPS lost: dead reckoning' : f.acc > 150 ? 'GPS rough' : '';
    el.querySelector('#fhWarn').textContent = w; el.querySelector('#fhWarn').hidden = !w;
    var st = el.querySelector('#fhStart'), pr = c && c.pre, show = pr && pr.secs >= 0 && pr.secs <= 600;
    st.hidden = !show; el.classList.toggle('starting', !!show);
    if (show) { var s = Math.round(pr.secs), ln = pr.line || {}; st.innerHTML = '<b>' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + '</b><span>' + (ln.d != null ? (ln.over ? 'OVER ' : 'Line ') + nm(ln.d) + (ln.burn != null ? ', burn ' + Math.round(ln.burn) + ' s' : '') : 'to the gun') + '</span>'; }
    if (g.dataset.k !== String(k)) { g.dataset.k = String(k); g.className = 'fhgrid n' + k; g.innerHTML = F.slice(0, k).map(function (x) { return '<div' + (x[4] ? ' class="plan"' : '') + '><span>' + x[1] + '</span><b data-f="' + x[0] + '">--</b><i></i></div>'; }).join(''); }
    F.slice(0, k).forEach(function (x, i) { var cell = g.children[i]; cell.querySelector('b').textContent = x[2](f, c, p); cell.querySelector('i').textContent = x[3](f, c, p); });
  }
  var tick = null;
  function open() { if (!el) build(); el.hidden = false; draw(); if (!tick) tick = FSBeat.set(draw, 1000); try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {} }
  function close() { if (el) el.hidden = true; FSBeat.clear(tick); tick = null; }
  window.FSHelm = { open: open, close: close, draw: draw };
})();
