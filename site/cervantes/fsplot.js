/* FirstShift Route: the basic plotter (Stuart 13 Nov 2026, decided at 13:21: "a basic plotter (BTW, DTW, ETA, VMC, XTE;
   laylines and time to layline stay in Route+)"; built 14 Nov). From the phone's own GPS (Live GPS), no boat connection.
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
  /* F8 (Stuart 15 Nov 16:12, 17:10: "A switch: mark or route", "Next turn on the route"): in Route mode the bar steers along the route
     on the chart (the one chosen, so a re-route from here is followed at once). The next turn is where the route's heading changes by
     more than 10 degrees; XTE is from the route line the boat is beside. Mark mode is as before. */
  function routeCalc(p, f, F) {
    var pl = null; try { pl = window.__fsPlan ? window.__fsPlan() : null; } catch (e) {}
    if (!pl || !pl.path || pl.path.length < 2) return null;
    var P = pl.path.map(function (q) { return F.to(q[0], q[1]); }), k = 0, bd = 1e9;
    for (var j = 0; j < P.length - 1; j++) { var dx = P[j + 1].x - P[j].x, dy = P[j + 1].y - P[j].y, L = dx * dx + dy * dy || 1e-9, u = Math.max(0, Math.min(1, -(P[j].x * dx + P[j].y * dy) / L)), d = Math.hypot(P[j].x + u * dx, P[j].y + u * dy); if (d < bd - 1e-6) { bd = d; k = j; } }
    var segB = function (j) { return bear(P[j + 1].x - P[j].x, P[j + 1].y - P[j].y); }, dB = function (a, b) { return Math.abs(((a - b + 540) % 360) - 180); };
    var t = k + 1, b0 = segB(k); while (t < P.length - 1 && (Math.hypot(P[t + 1].x - P[t].x, P[t + 1].y - P[t].y) < 0.02 || dB(segB(t), b0) <= 10)) t++;
    if (Math.hypot(P[t].x, P[t].y) < C.radius && t < P.length - 1) { var b1 = segB(t); t++; while (t < P.length - 1 && dB(segB(t), b1) <= 10) t++; }
    var T = P[t], o = {}, back = F.back(T.x, T.y), last = t === P.length - 1;
    o.m = { lat: back.la, lon: back.lo, name: last ? 'Route: finish' : 'Route: next turn', route: true, finish: last }; o.i = t; o.n = P.length;
    o.btw = bear(T.x, T.y); o.dtw = Math.hypot(T.x, T.y);
    o.vmc = f.sog != null && f.cog != null ? f.sog * Math.cos((f.cog - o.btw) * R) : null; o.eta = o.vmc != null && o.vmc > 0.3 ? Date.now() + o.dtw / o.vmc * 3600e3 : null;
    var A = P[k], B = P[k + 1], dx2 = B.x - A.x, dy2 = B.y - A.y, L2 = Math.hypot(dx2, dy2);
    if (L2 > 0.001) { var cr = (dx2 * (-A.y) - dy2 * (-A.x)) / L2; o.xte = { d: Math.abs(cr), side: cr > 0 ? 'L' : 'R', leg: bear(dx2, dy2) }; }
    if (!last) o.after = segB(t);
    return o;
  }
  function calc() {
    var c = course(), f = fix(), o = { ok: false };
    if (!c) { o.why = 'No course loaded.'; return o; }
    if (!f) { o.why = 'Waiting for this phone’s GPS (Live GPS).'; o.c = c; return o; }
    var p = { la: f.la, lo: f.lo }, pts = points(c), i = markIdx(c, p), m = pts[i], F = fxy(p), M = F.to(m.lat, m.lon), A0 = prevOf(c, i), A = F.to(A0.lat, A0.lon);
    o.ok = true; o.c = c; o.f = p; o.i = i; o.n = pts.length; o.m = m; o.sog = f.sog; o.cog = f.cog; o.dr = !!f.dr;   /* dr: reckoned while the GPS is lost (Stuart 15 Nov) */
    o.btw = bear(M.x, M.y); o.dtw = Math.hypot(M.x, M.y);
    o.vmc = f.sog != null && f.cog != null ? f.sog * Math.cos((f.cog - o.btw) * R) : null;
    if (o.vmc != null && o.vmc > 0.3) o.eta = Date.now() + o.dtw / o.vmc * 3600e3;
    /* cross-track error: the boat at the origin, positive cross product means left of the leg looking along it */
    var dx = M.x - A.x, dy = M.y - A.y, L = Math.hypot(dx, dy);
    if (L > 0.01) { var cr = (dx * (-A.y) - dy * (-A.x)) / L; o.xte = { d: Math.abs(cr), side: cr > 0 ? 'L' : 'R', leg: bear(dx, dy) };
      /* back on the line (Stuart 17 Nov 05:27, Mark's racing window): the course to rejoin the rhumb line 0.2 nm ahead (or at the mark), and how long at this speed */
      if (o.xte.d >= 0.01) { var ux = dx / L, uy = dy / L, tt = -(A.x * ux + A.y * uy), fx = A.x + tt * ux, fy = A.y + tt * uy, left = Math.hypot(M.x - fx, M.y - fy), ah = Math.min(0.2, left), bx = fx + ux * ah, by = fy + uy * ah; o.back = { brg: bear(bx, by), d: Math.hypot(bx, by) }; if (f.sog > 0.3) o.back.min = o.back.d / f.sog * 60; } }
    if (C.mode === 'route') { var ro = routeCalc(p, f, F); if (ro) { Object.assign(o, ro); return o; } o.noRoute = true; }
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
  function clk(ms) { var d = new Date(ms + (window.__fsTZ ? window.__fsTZ() : { sh: 0, label: 'UTC' }).sh * 1000); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); }
  /* CPA to the next mark (Stuart 20 Nov 09:15: "both would be good but needs to be explained"): the closest the boat will pass the mark if it
     holds its present course and speed over the ground, and when. Near zero: the boat is laying the mark (a layline check). Opening: the
     closest point is already behind. CPA to other boats is in the AIS window. */
  function cpaCell(o) {
    if (o.dtw == null || o.btw == null || o.sog == null || o.cog == null || o.sog < 0.3) return cell('CPA mark', '--', 'needs the boat moving', '', 'Closest point of approach to the next mark on your present course and speed over the ground');
    var dx = o.dtw * Math.sin(o.btw * R), dy = o.dtw * Math.cos(o.btw * R), vx = o.sog * Math.sin(o.cog * R), vy = o.sog * Math.cos(o.cog * R), t = (dx * vx + dy * vy) / (o.sog * o.sog);
    var tip = 'Closest point of approach to the next mark if you hold this course and speed over the ground. Near zero: you are laying the mark. CPA to other boats is in the AIS window.';
    if (t <= 0) return cell('CPA mark', fmtD(o.dtw), 'opening: past it', 'bad', tip);
    var cx = dx - vx * t, cy = dy - vy * t, c = Math.hypot(cx, cy), side = (vx * dy - vy * dx) > 0 ? 'to port' : 'to stbd', min = t * 60;
    return cell('CPA mark', fmtD(c), (c < 0.02 ? 'laying it' : 'mark ' + side) + ', ' + (min < 1 ? 'under 1 min' : Math.round(min) + ' min'), '', tip);
  }
  function fmtD(nm) { return nm < 0.54 ? Math.round(nm * 1852) + ' m' : nm.toFixed(2) + ' nm'; }
  /* VMG (Stuart 20 Nov 09:25, docs/VMG-VMC-REVIEW.md): speed towards the wind on a beat, away from it on a run, said in words; from the
     boat's instruments through the water when there are any, else over the ground (tide included) along the wind in use, and it says which.
     On a reach it gives way to VMC. The polar's target VMG beside it. */
  function vmgCell(o, W) {
    var bsp = null, twa = null; try { if (window.__navShown) { bsp = window.__navShown('bsp'); twa = window.__navShown('twa'); } } catch (e) {}
    var v = null, up = null, how = '', a = null, tws = W && W.tws != null ? +W.tws : null;
    if (bsp != null && twa != null && bsp === bsp && twa === twa) { a = Math.abs(twa); v = bsp * Math.cos(twa * R); how = ''; }
    else if (W && W.twd != null && o.sog != null && o.cog != null) { var d = ((o.cog - W.twd + 540) % 360) - 180; a = Math.abs(d); v = o.sog * Math.cos(d * R); how = ' (GPS)'; }   /* short on a phone; Help says over the ground along the wind in use */
    if (v == null) return cell('VMG', '--', 'needs a wind');
    if (a > 75 && a < 105) return cell('VMG', '--', 'reaching: see VMC');
    up = a < 90; var tg = null; try { var sp = window.__fsSpeed ? window.__fsSpeed() : null; if (sp && tws > 0 && window.FSRouter && FSRouter.bestVmg) { var b = FSRouter.bestVmg(sp, Math.round(tws * 2) / 2, up); if (b && b[2] > 0) tg = b[2]; } } catch (e) {}
    var m = Math.abs(v);
    return cell('VMG', m.toFixed(1), (how ? 'GPS · ' : '') + (up ? 'to wind' : 'from wind') + (tg ? ' ' + Math.round(m / tg * 100) + '%' : ''), '', (up ? 'Speed towards the wind' : 'Speed away from the wind') + (how ? ', over the ground from the GPS along the wind in use (tide included)' : ', through the water from the boat\u2019s instruments') + (tg ? '; polar target ' + tg.toFixed(1) + ' kn' : ''));   /* fits a phone cell: GPS · to wind 94% */
  }
  function cell(k, v, sub, cls, tip) { return '<div class="rpl' + (cls ? ' ' + cls : '') + '"' + (tip ? ' title="' + String(tip).replace(/"/g, '&quot;') + '"' : '') + '><span>' + k + '</span><b>' + v + '</b><i>' + (sub || '&nbsp;') + '</i></div>'; }
  function modeBtn() { return '<button class="rpnav rpmode" data-k="mode" aria-label="Steer to the next mark or along the route" title="Steer to the next mark or along the route">' + (C.mode === 'route' ? 'ROUTE' : 'MARK') + '</button>'; }
  /* 21 Nov (Stuart 07:19): the ‹ › arrows run the full height of the panel, about 56 px wide, and a swipe left or right on the panel
     changes the mark too. The panel is no longer rebuilt every second (a tap landing during a rebuild was lost): its parts are made
     once and only the figures that changed are written; the buttons stay the same buttons. */
  var parts = null;
  function shell() {
    if (parts) return parts;
    /* layout A (Stuart 25 Nov 20:5x): the mark's name between the two arrows, the controls in one row under it, then the figures */
    bar.innerHTML = '<div class="rpbody"><div class="rptop"><button class="rparrow" data-k="prev" aria-label="Previous mark">‹</button><div class="rphead"></div><button class="rparrow" data-k="next" aria-label="Next mark">›</button></div><div class="rpctl"></div><div class="rprest"></div></div>';
    parts = { head: bar.querySelector('.rphead'), ctl: bar.querySelector('.rpctl'), rest: bar.querySelector('.rprest'), key: null, name: null, restH: null };
    return parts;
  }
  function put(e, h, k) { if (parts[k] !== h) { parts[k] = h; e.innerHTML = h; } }
  function render(o) {
    if (!bar) return; bar.hidden = !C.on; document.body.classList.toggle('rplot', !!C.on); if (!C.on) return;
    var P = shell();
    var name = o.ok && o.m.route ? '<b>' + esc(o.m.name) + '</b><small>' + (o.after != null ? 'then ' + brg(o.after) : 'the end of the route') + '</small>' : !o.ok ? '<b>Plotter</b><small>' + esc(o.why) + '</small>' : '<b>' + esc(o.m.name || (o.m.finish ? 'Finish' : 'Mark')) + '</b><small>' + (o.m.finish ? 'Finish' : 'Mark ' + (o.i + 1) + ' of ' + (o.n - 1)) + (o.m.side && !o.m.finish ? ', leave to ' + o.m.side : '') + '</small>';
    var x = o.xte, mini = !!((C.mini || (window.__fsPanelUp && window.__fsPanelUp())) && o.ok);   /* with the panel open on a phone upright the plotter is short (Stuart 26 Nov 06:58) */
    bar.classList.toggle('mini', mini);
    var key = (mini ? 'mini' : 'full') + '|' + C.mode + '|' + (C.view || 'deck') + '|' + (window.FS_HIDE || 'Hide');
    if (P.key !== key) { P.key = key; P.name = null;
      P.head.innerHTML = '<button class="rpname" data-k="mini" aria-label="' + (mini ? 'Show all the figures' : 'Show one line') + '"></button>';
      P.ctl.innerHTML = mini ? '' : modeBtn() + viewSw() + '<button class="rpnav rpmin" data-k="mini" aria-label="Hide: shrink to one line" title="Hide: shrink to one line">' + (window.FS_HIDE || 'Hide') + '</button>'; }
    var nb = P.head.querySelector('.rpname');
    var nm = mini ? '<b>' + esc(o.m.name || 'Mark') + ' <em>▾ more</em></b><span class="rpline">' + brg(o.btw) + ' · ' + dist(o.dtw) + (x ? ' · XTE ' + (x.d < 0.01 ? '0.00' : x.d.toFixed(2) + ' ' + x.side) : '') + '</span>' : name;
    if (P.name !== nm) { P.name = nm; nb.innerHTML = nm; }
    var h = '';
    if (o.ok && !mini) {
      h += '<div class="rpgrid">' +
        cell('BTW', brg(o.btw), 'true bearing') +
        cell('DTW', dist(o.dtw), '') +
        cell('ETA', o.eta ? clk(o.eta) : '--', o.eta ? (window.__fsTZ ? window.__fsTZ() : { sh: 0, label: 'UTC' }).label + ', in ' + dur((o.eta - Date.now()) / 3600e3) : 'not closing') +
        cell('VMC', o.vmc != null ? o.vmc.toFixed(1) : '--', o.vmc != null ? 'kn to the mark' : 'needs the boat moving', o.vmc != null && o.vmc < 0 ? 'bad' : '') +
        cpaCell(o) +
        vmgCell(o, (function () { try { return window.FSSolent && FSSolent.windRef ? FSSolent.windRef() : null; } catch (e) { return null; } })()) +
        cell('XTE', x ? (x.d < 0.01 ? '0.00' : x.d.toFixed(2) + ' ' + x.side) : '--', x ? (x.d < 0.01 ? (o.m.route ? 'on the route' : 'on the leg') : 'nm ' + (x.side === 'L' ? 'left' : 'right') + ' of the ' + (o.m.route ? 'route' : 'leg')) : '') +
        (o.back && !o.m.route ? cell('BACK ON', brg(o.back.brg), o.back.min != null ? dist(o.back.d) + ', ' + (o.back.min < 1 ? 'under a minute' : Math.round(o.back.min) + ' min') + ' at this speed' : dist(o.back.d) + ' to the line') : '') +
        cell('SOG · COG', o.sog != null ? n1(o.sog) + ' · ' + (o.cog != null ? ('00' + Math.round(o.cog) % 360).slice(-3) + '°' : '--') : '--', 'this phone’s GPS') + '</div>';
      h += '<p class="rpfoot">' + (o.ok && o.dr ? '<b class="npdr">DEAD RECKONING: no GPS</b> · ' : '') + (msg && msg.until > Date.now() ? '<b>' + esc(msg.t) + '</b> · ' : '') + (o.m.route ? 'Steering along the route on the chart' : (o.noRoute ? 'No route on the chart: steering to the mark' : 'Next mark when within ' + C.radius + ' nm')) + ' · bearings true · not for navigation · swipe for the next mark</p>';
    }
    put(P.rest, h, 'restH');
  }
  function step(d) { var c = course(); if (!c) return; setMark((MKS[c.key] || 0) + d); }
  function onClick(e) {
    if (sw && sw.done) { sw = null; return; }
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.k === 'prev' || t.dataset.k === 'next') { var c = course(); if (!c) return; setMark((MKS[c.key] || 0) + (t.dataset.k === 'next' ? 1 : -1)); return; }
    if (t.dataset.k === 'mini') { C.mini = !C.mini; saveC(); tick(true); }
    if (t.dataset.k === 'mode') { C.mode = C.mode === 'route' ? 'mark' : 'route'; saveC(); tick(true); }
    if (t.dataset.k === 'view') { viewSet((C.view || 'deck') === 'deck' ? 'nav' : 'deck'); }
  }
  /* ---- DECK and NAV views (Stuart 22 Nov 08:52: "Add to all four"; Route+ since 13 Nov). DECK: the boat, the plotter, the route
     followed only, AIS, land and depth, the track; no other models, wind or tide arrows; it always opens clean (22 Nov 09:35). NAV: the full
     picture. Turning PLOT off brings back the NAV layers. ---- */
  var VK = 'fs-views', V = ld(VK, {});
  function viewSw() { var v = C.view || 'deck'; return '<button class="rpnav rpview" data-k="view" aria-label="' + (v === 'deck' ? 'Deck view: tap for the Nav view with every route and layer' : 'Nav view: tap for the Deck view') + '" title="DECK: just the boat, the mark and your route. NAV: everything."><span' + (v === 'deck' ? ' class="on"' : '') + '>DECK</span><span' + (v === 'nav' ? ' class="on"' : '') + '>NAV</span></button>'; }
  function layersNow() { try { return window.__navLayers ? window.__navLayers() : null; } catch (e) { return null; } }
  function layersSet(st) { try { if (window.__navLayers && st) window.__navLayers(st); } catch (e) {} }
  function viewApply(v) { if (v === 'deck') { var d = layersNow() || {}; d.show = Object.assign({}, d.show || {}, { wind: false, tide: false, ghosts: false, real: false, band: false, tracks: true }); d.only = true; layersSet(d); } else if (V.nav) layersSet(V.nav); }
  function viewSet(v) { if (C.view === v && C.on) return; if (C.on && (C.view || 'deck') === 'nav') { V.nav = layersNow(); sv(VK, V); } C.view = v; saveC(); if (C.on) viewApply(v); tick(true); }
  window.__navAfterRoutes = window.__navAfterRoutes || function () { if (C.on && (C.view || 'deck') === 'deck') layersSet({ only: true }); };
  function toggle(on) {
    var was = !!C.on;
    C.on = on == null ? !C.on : !!on; saveC();
    if (C.on && !was) { var nst = layersNow(); if (nst) { V.nav = nst; sv(VK, V); } viewApply(C.view || 'deck'); } else if (!C.on && was && (C.view || 'deck') === 'deck' && V.nav) layersSet(V.nav);
    var b = document.getElementById('fsPlotBtn'); if (b) b.setAttribute('aria-pressed', String(C.on));
    if (C.on) { try { if (window.__navLiveOn) window.__navLiveOn(true); if (window.__navPanelMin) window.__navPanelMin(); setTimeout(function () { var o0 = calc(); if (o0.ok && window.__navScale) window.__navScale(Math.max(0.5, Math.min(20, o0.dtw * 1.3))); }, 300); } catch (e) {} }
    tick(true);
  }

  /* ---- on the chart ---- */
  function label(ctx, x, y, txt, col) { ctx.font = '700 11px Inter, sans-serif'; var dy = window.__fsLabelFit ? window.__fsLabelFit(x + 6, y - 13, ctx.measureText(txt).width + 8, 16, 2) : 0; if (dy == null) return; y += dy;   /* A14: labels give way to each other */
    var fn = function (x0, y0) { ctx.font = '700 11px Inter, sans-serif'; var w = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(8,20,36,.72)'; ctx.fillRect(x0 + 6, y0 - 13, w + 8, 16); ctx.fillStyle = col; ctx.fillText(txt, x0 + 10, y0); }; if (window.__navUp) window.__navUp(x, y, fn); else fn(x, y); }
  function night() { return document.documentElement.hasAttribute('data-night'); }
  window.__fsOverlay = function (ctx, X, Y) {
    if (!C.on) return; var o = last; if (!o || !o.ok) return;
    var f = o.f, F = fxy(f), m = { la: o.m.lat, lo: o.m.lon }, bx = X(f.lo), by = Y(f.la), px = Math.abs(X(f.lo + 1 / 60 / Math.cos(f.la * R)) - bx), blue = night() ? '#7A1A14' : '#8FC2F5', green = night() ? '#8A1E18' : '#4CC38A';
    /* F24 (Stuart 17 Nov 13:40): a blue rhumb line from the boat to the next mark, its bearing and distance on it; dotted (14:34: "solid
       lines should be for actual paths") */
    ctx.lineCap = 'round'; ctx.strokeStyle = blue; ctx.fillStyle = blue; ctx.lineWidth = 2.4; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(X(m.lo), Y(m.la)); ctx.stroke(); ctx.setLineDash([]);
    (function () { var k = Math.cos(f.la * R), dx = (m.lo - f.lo) * k * 60, dy = (m.la - f.la) * 60, d = Math.hypot(dx, dy), b = (Math.atan2(dx, dy) / R + 360) % 360, lx = (bx + X(m.lo)) / 2, ly = (by + Y(m.la)) / 2; if (Math.hypot(X(m.lo) - bx, Y(m.la) - by) > 70) label(ctx, lx, ly, ('00' + Math.round(b)).slice(-3) + '°T · ' + (d < 0.1 ? Math.round(d * 1852) + ' m' : d.toFixed(d < 10 ? 2 : 1) + ' nm'), blue); })();
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

  var lastDraw = 0, sw = null;
  function tick(force) {
    try { last = calc(); } catch (e) { last = { ok: false, why: 'Plotter error: ' + e.message }; }
    render(last);
    if (C.on && (force || Date.now() - lastDraw > 2000) && window.__fsRedraw) { lastDraw = Date.now(); try { window.__fsRedraw(); } catch (e) {} }
  }
  function build() {
    var chart = document.querySelector('.chart'); if (!chart) return;
    bar = document.createElement('div'); bar.className = 'rplotbar'; bar.id = 'fsPlot'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Plotter: next mark');
    chart.appendChild(bar); bar.addEventListener('click', onClick);
    /* swipe left for the next mark, right for the previous one */
    bar.addEventListener('pointerdown', function (e) { sw = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false }; });
    bar.addEventListener('pointerup', function (e) { if (!sw || e.pointerId !== sw.id) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) { sw.done = true; step(dx < 0 ? 1 : -1); try { if (navigator.vibrate) navigator.vibrate(20); } catch (er) {} setTimeout(function () { if (sw && sw.done) sw = null; }, 400); } else sw = null; });
    bar.addEventListener('pointercancel', function () { sw = null; });
    var grp = document.getElementById('liveBtn'); grp = grp && grp.parentNode;
    if (grp) { var pb = document.createElement('button'); pb.className = 'spd rplotb'; pb.id = 'fsPlotBtn'; pb.type = 'button'; pb.textContent = 'PLOT'; pb.title = 'Plotter: the next mark from this phone’s GPS'; pb.setAttribute('aria-label', 'Plotter'); pb.setAttribute('aria-pressed', String(!!C.on)); pb.onclick = function () { toggle(); }; grp.appendChild(pb); }
    FSBeat.set(tick, 1000); if (C.on) setTimeout(function () { toggle(true); }, 1500); else tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.__fsPlot = { C: C, calc: function () { last = calc(); render(last); return last; }, toggle: toggle, setMark: setMark, reset: function () { MKS = {}; sv(MK, MKS); arrived = null; } };   /* for the automatic tests */
})();
