/* FirstShift Route: the basic plotter (Stuart 13 Nov 2026, decided at 13:21: "a basic plotter (BTW, DTW, ETA, VMC, XTE;
   laylines and time to layline stay in Navigate)"; built 14 Nov). From the phone's own GPS (Live GPS), no boat connection.
   The next mark: bearing (BTW), distance (DTW), speed made good towards it (VMC), ETA at that VMC, and cross-track error (XTE)
   from the leg, the rhumb line from the last mark (or the start) to this one. Within the arrival distance the next mark becomes
   active. Bearings are true: a phone's GPS gives no variation. On the chart: the bearing line, a ring on the next mark and a
   10-minute COG line. Not for navigation. */
(function () {
  'use strict';
  var R = Math.PI / 180, KEY = 'fs-plot', MK = 'fs-plot-mk';
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var C = Object.assign({ on: false, mini: innerWidth < 600, radius: 0.1 }, ld(KEY, {}));
  var MKS = ld(MK, {});   /* the active mark for each race */
  function saveC() { sv(KEY, C); }
  function n360(a) { a %= 360; return a < 0 ? a + 360 : a; }
  function bear(dx, dy) { return n360(Math.atan2(dx, dy) / R); }
  function course() { try { return window.__navCourse ? window.__navCourse() : null; } catch (e) { return null; } }
  function fix() { try { var f = window.__fsLiveFix ? window.__fsLiveFix() : null; return f && Date.now() - f.at < 30000 && f.acc <= 150 ? f : null; } catch (e) { return null; } }
  function points(c) { return c ? c.marks.concat([Object.assign({ finish: true }, c.finish)]) : []; }
  function prevOf(c, i) { return i > 0 ? c.marks[i - 1] : c.start; }
  /* flat frame in nautical miles about the boat: x east, y north */
  function fxy(o) { var k = Math.cos(o.la * R) * 60; return { to: function (la, lo) { return { x: (lo - o.lo) * k, y: (la - o.la) * 60 }; }, back: function (x, y) { return { la: o.la + y / 60, lo: o.lo + x / k }; } }; }
  /* first use on a race: the leg the boat is nearest, or the first mark before the gun */
  function guess(c, f) {
    if (c.gun && Date.now() / 1000 < c.gun) return 0;
    var pts = points(c), F = fxy(f), best = 0, bd = 1e9;
    for (var i = 0; i < pts.length; i++) {
      var a = prevOf(c, i), A = F.to(a.lat, a.lon), B = F.to(pts[i].lat, pts[i].lon), dx = B.x - A.x, dy = B.y - A.y, L = dx * dx + dy * dy || 1e-9, u = Math.max(0, Math.min(1, -(A.x * dx + A.y * dy) / L)), d = Math.hypot(A.x + u * dx, A.y + u * dy);
      if (d <= bd + 0.01) { bd = d; best = i; }
    }
    return best;
  }
  function markIdx(c, f) { var n = points(c).length, i = MKS[c.key]; if (i == null || i >= n) { i = f ? guess(c, f) : 0; MKS[c.key] = i; sv(MK, MKS); } return i; }
  function setMark(i) { var c = course(); if (!c) return; var n = points(c).length; MKS[c.key] = (i + n) % n; sv(MK, MKS); arrived = null; tick(true); }

  var arrived = null, msg = null;
  function calc() {
    var c = course(), f = fix(), o = { ok: false };
    if (!c) { o.why = 'No course loaded.'; return o; }
    if (!f) { o.why = 'Waiting for this phone’s GPS (Live GPS).'; o.c = c; return o; }
    var p = { la: f.la, lo: f.lo }, pts = points(c), i = markIdx(c, p), m = pts[i], F = fxy(p), M = F.to(m.lat, m.lon), A0 = prevOf(c, i), A = F.to(A0.lat, A0.lon);
    o.ok = true; o.c = c; o.f = p; o.i = i; o.n = pts.length; o.m = m; o.sog = f.sog; o.cog = f.cog;
    o.btw = bear(M.x, M.y); o.dtw = Math.hypot(M.x, M.y);
    o.vmc = f.sog != null && f.cog != null ? f.sog * Math.cos((f.cog - o.btw) * R) : null;
    if (o.vmc != null && o.vmc > 0.3) o.eta = Date.now() + o.dtw / o.vmc * 3600e3;
    /* cross-track error: the boat at the origin, positive cross product means left of the leg looking along it */
    var dx = M.x - A.x, dy = M.y - A.y, L = Math.hypot(dx, dy);
    if (L > 0.01) { var cr = (dx * (-A.y) - dy * (-A.x)) / L; o.xte = { d: Math.abs(cr), side: cr > 0 ? 'L' : 'R', leg: bear(dx, dy) }; }
    if (o.dtw < C.radius && i < pts.length - 1 && arrived !== c.key + i) { arrived = c.key + i; MKS[c.key] = i + 1; sv(MK, MKS); msg = { t: 'Next mark: ' + (pts[i + 1].name || 'Finish'), until: Date.now() + 8000 }; }
    return o;
  }

  /* ---- the bar ---- */
  var bar, last = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function brg(t) { return ('00' + Math.round(n360(t)) % 360).slice(-3) + '°T'; }
  function n1(x) { return x < 10 ? x.toFixed(1) : String(Math.round(x)); }
  function dist(d) { return d < 0.1 ? Math.round(d * 1852) + ' m' : n1(d) + ' nm'; }
  function dur(h) { var m = Math.round(h * 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + ('0' + m % 60).slice(-2) : m + ' min'; }
  function clk(ms) { var d = new Date(ms); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); }
  function cell(k, v, sub, cls) { return '<div class="rpl' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><b>' + v + '</b><i>' + (sub || '&nbsp;') + '</i></div>'; }
  function render(o) {
    if (!bar) return; bar.hidden = !C.on; document.body.classList.toggle('rplot', !!C.on); if (!C.on) return;
    var nav = function (k, t, l) { return '<button class="rpnav" data-k="' + k + '" aria-label="' + l + '">' + t + '</button>'; };
    var name = !o.ok ? '<b>Plotter</b><small>' + esc(o.why) + '</small>' : '<b>' + esc(o.m.name || (o.m.finish ? 'Finish' : 'Mark')) + '</b><small>' + (o.m.finish ? 'Finish' : 'Mark ' + (o.i + 1) + ' of ' + (o.n - 1)) + (o.m.side && !o.m.finish ? ', leave to ' + o.m.side : '') + '</small>';
    var x = o.xte;
    if (C.mini && o.ok) {
      bar.classList.add('mini');
      bar.innerHTML = '<div class="rphead">' + nav('prev', '‹', 'Previous mark') + '<button class="rpname" data-k="mini" aria-label="Show all the figures"><b>' + esc(o.m.name || 'Mark') + ' <em>▾ more</em></b><span class="rpline">' + brg(o.btw) + ' · ' + dist(o.dtw) + (x ? ' · XTE ' + (x.d < 0.01 ? '0.00' : x.d.toFixed(2) + ' ' + x.side) : '') + '</span></button>' + nav('next', '›', 'Next mark') + '</div>';
      return;
    }
    bar.classList.remove('mini');
    var h = '<div class="rphead">' + nav('prev', '‹', 'Previous mark') + '<button class="rpname" data-k="mini" aria-label="Show one line">' + name + '</button>' + nav('next', '›', 'Next mark') + '<button class="rpnav rpmin" data-k="mini" aria-label="Minimise to one line">MIN</button></div>';
    if (o.ok) {
      h += '<div class="rpgrid">' +
        cell('BTW', brg(o.btw), 'true bearing') +
        cell('DTW', dist(o.dtw), '') +
        cell('ETA', o.eta ? clk(o.eta) : '--', o.eta ? 'UTC, in ' + dur((o.eta - Date.now()) / 3600e3) : 'not closing') +
        cell('VMC', o.vmc != null ? o.vmc.toFixed(1) : '--', o.vmc != null ? 'kn towards it' : 'needs the boat moving', o.vmc != null && o.vmc < 0 ? 'bad' : '') +
        cell('XTE', x ? (x.d < 0.01 ? '0.00' : x.d.toFixed(2) + ' ' + x.side) : '--', x ? (x.d < 0.01 ? 'on the leg' : 'nm ' + (x.side === 'L' ? 'left' : 'right') + ' of the leg') : '') +
        cell('SOG · COG', o.sog != null ? n1(o.sog) + ' · ' + (o.cog != null ? ('00' + Math.round(o.cog) % 360).slice(-3) + '°' : '--') : '--', 'this phone’s GPS') + '</div>';
      h += '<p class="rpfoot">' + (msg && msg.until > Date.now() ? '<b>' + esc(msg.t) + '</b> · ' : '') + 'Next mark when within ' + C.radius + ' nm · bearings true · not for navigation</p>';
    }
    bar.innerHTML = h;
  }
  function onClick(e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.k === 'prev' || t.dataset.k === 'next') { var c = course(); if (!c) return; setMark((MKS[c.key] || 0) + (t.dataset.k === 'next' ? 1 : -1)); return; }
    if (t.dataset.k === 'mini') { C.mini = !C.mini; saveC(); tick(true); }
  }
  function toggle(on) {
    C.on = on == null ? !C.on : !!on; saveC();
    var b = document.getElementById('fsPlotBtn'); if (b) b.setAttribute('aria-pressed', String(C.on));
    if (C.on) { try { if (window.__navLiveOn) window.__navLiveOn(true); if (window.__navPanelMin) window.__navPanelMin(); setTimeout(function () { var o0 = calc(); if (o0.ok && window.__navScale) window.__navScale(Math.max(0.5, Math.min(20, o0.dtw * 1.3))); }, 300); } catch (e) {} }
    tick(true);
  }

  /* ---- on the chart ---- */
  function label(ctx, x, y, txt, col) { var fn = function (x0, y0) { ctx.font = '700 11px Inter, sans-serif'; var w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(8,20,36,.72)'; ctx.fillRect(x0 + 6, y0 - 13, w + 8, 16); ctx.fillStyle = col; ctx.fillText(txt, x0 + 10, y0); }; if (window.__navUp) window.__navUp(x, y, fn); else fn(x, y); }
  function night() { return document.documentElement.hasAttribute('data-night'); }
  window.__fsOverlay = function (ctx, X, Y) {
    if (!C.on) return; var o = last; if (!o || !o.ok) return;
    var f = o.f, F = fxy(f), m = { la: o.m.lat, lo: o.m.lon }, bx = X(f.lo), by = Y(f.la), px = Math.abs(X(f.lo + 1 / 60 / Math.cos(f.la * R)) - bx), blue = night() ? '#7A1A14' : '#8FC2F5', green = night() ? '#8A1E18' : '#4CC38A';
    ctx.lineCap = 'round'; ctx.strokeStyle = blue; ctx.fillStyle = blue; ctx.lineWidth = 1.6; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(X(m.lo), Y(m.la)); ctx.stroke(); ctx.setLineDash([]);
    var mx = X(m.lo), my = Y(m.la); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(mx, my, 12, 0, 7); ctx.stroke();
    var rr = C.radius * px; if (rr > 14) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(mx, my, rr, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    label(ctx, mx + 8, my + 4, 'NEXT ' + (o.m.name || ''), blue);
    if (o.cog != null && o.sog > 0.3) {
      var len = o.sog * 10 / 60, c2 = F.back(Math.sin(o.cog * R) * len, Math.cos(o.cog * R) * len), ex = X(c2.lo), ey = Y(c2.la), a = Math.atan2(ey - by, ex - bx);
      ctx.strokeStyle = green; ctx.fillStyle = green; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 9 * Math.cos(a - 0.4), ey - 9 * Math.sin(a - 0.4)); ctx.lineTo(ex - 9 * Math.cos(a + 0.4), ey - 9 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
      label(ctx, ex, ey, '10 min', green);
    }
  };

  var lastDraw = 0;
  function tick(force) {
    try { last = calc(); } catch (e) { last = { ok: false, why: 'Plotter error: ' + e.message }; }
    render(last);
    if (C.on && (force || Date.now() - lastDraw > 2000) && window.__fsRedraw) { lastDraw = Date.now(); try { window.__fsRedraw(); } catch (e) {} }
  }
  function build() {
    var chart = document.querySelector('.chart'); if (!chart) return;
    bar = document.createElement('div'); bar.className = 'rplotbar'; bar.id = 'fsPlot'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Plotter: next mark');
    chart.appendChild(bar); bar.addEventListener('click', onClick);
    var grp = document.getElementById('liveBtn'); grp = grp && grp.parentNode;
    if (grp) { var pb = document.createElement('button'); pb.className = 'spd rplotb'; pb.id = 'fsPlotBtn'; pb.type = 'button'; pb.textContent = 'PLOT'; pb.title = 'Plotter: the next mark from this phone’s GPS'; pb.setAttribute('aria-label', 'Plotter'); pb.setAttribute('aria-pressed', String(!!C.on)); pb.onclick = function () { toggle(); }; grp.appendChild(pb); }
    setInterval(tick, 1000); if (C.on) setTimeout(function () { toggle(true); }, 1500); else tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.__fsPlot = { C: C, calc: function () { last = calc(); render(last); return last; }, toggle: toggle, setMark: setMark, reset: function () { MKS = {}; sv(MK, MKS); arrived = null; } };   /* for the automatic tests */
})();
