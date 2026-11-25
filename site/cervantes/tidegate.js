/* FirstShift Route and Route+: the tide gate, "beat the tide to the mark" (Stuart 15 Nov 11:26 to 11:39; research and his answers
   in docs/TIDE-GATE-RESEARCH-2026-11-15.md). Built overnight 15 to 16 Nov, first version.
   For the next mark and the leg after it:
   - the tide along the leg (knots, and as a share of boat speed: the tide factor), from the chosen tide model along the boat's own
     progress, minute by minute;
   - the turn: the next time the tide along the leg changes sign at the mark (slack under 0.3 kn);
   - will we make it: ETA at the present speed made good, against the turn; minutes in hand or short;
   - if not: the speed needed to make it, and what a late arrival costs (the leg 30 minutes later);
   - (24 Nov) the window itself now works from the followed route, every mark of the course, with the Fleet boats: see render();
   - an alarm 15 minutes before the gate closes while we would miss it (on or off);
   - a strip on the deck screen, a bar along the leg and a clock ring.
   Speed made good: Route+'s VMC from the instruments, else the GPS speed towards the mark, else 5 kn, which the crew can override. */
(function () {
  'use strict';
  var KEY = 'fs-tidegate', R = Math.PI / 180, SLACK = 0.3;
  var C = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })(); C.rivals = C.rivals || []; C.ais = C.ais || {}; C.pts = C.pts || {}; if (C.alarm == null) C.alarm = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function dist(a, b) { var dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return Math.hypot(dx, dy); }
  function brg(a, b) { var dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return (Math.atan2(dx, dy) / R + 360) % 360; }
  function along(td, b) { return td ? td[0] * Math.sin(b * R) + td[1] * Math.cos(b * R) : 0; }   /* [east, north] knots onto the leg */
  function hm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function mins(m) { m = Math.round(m); var a = Math.abs(m); return (a >= 60 ? Math.floor(a / 60) + ' h ' + ('0' + a % 60).slice(-2) : a) + ' min'; }
  function tideAt(la, lo, t) { return window.__fsTideAt ? window.__fsTideAt(la, lo, t / 1000) : null; }
  /* sail a leg from A towards B at speed s (kn through the water along the leg) starting at t0 (ms): minute steps, the tide along the leg added */
  function sail(A, B, s, t0) {
    var D = dist(A, B), b = brg(A, B), done = 0, t = t0, sumA = 0, n = 0, cap = t0 + 96 * 3600000, gotTide = false;
    while (done < D && t < cap) { var f = done / D, la = A.lat + (B.lat - A.lat) * f, lo = A.lon + (B.lon - A.lon) * f, td = tideAt(la, lo, t); if (td) gotTide = true; var a = along(td, b); sumA += a; n++; done += Math.max(0.5, s + a) / 60; t += 60000; }
    return { eta: t, mins: (t - t0) / 60000, factor: n ? sumA / n : 0, pct: n && s > 0 ? 100 * (sumA / n) / s : 0, nm: D, brg: b, tide: gotTide };
  }
  /* the next time the tide along the leg changes sign at the mark, within 12 h: [time, 'fair'|'foul' after it] */
  function turn(M, b, t0) {
    var a0 = along(tideAt(M.lat, M.lon, t0), b), sign = Math.abs(a0) < SLACK ? 0 : a0 > 0 ? 1 : -1;
    for (var t = t0 + 300000; t < t0 + 12 * 3600000; t += 300000) { var a = along(tideAt(M.lat, M.lon, t), b), s2 = Math.abs(a) < SLACK ? 0 : a > 0 ? 1 : -1; if (s2 !== sign && s2 !== 0) { if (sign === 0 && s2 === 1 && a0 >= 0) { sign = 1; continue; } return { t: t, to: s2 > 0 ? 'fair' : 'foul', now: sign > 0 ? 'fair' : sign < 0 ? 'foul' : 'slack', a0: a0 }; } if (s2 === 0 && sign !== 0) return { t: t, to: 'slack', now: sign > 0 ? 'fair' : 'foul', a0: a0 }; }
    return { t: null, now: sign > 0 ? 'fair' : sign < 0 ? 'foul' : 'slack', a0: a0 };
  }
  function need(A, B, T, t0) { var lo = 0.5, hi = 25; if (sail(A, B, hi, t0).eta > T) return null; for (var i = 0; i < 18; i++) { var m = (lo + hi) / 2; if (sail(A, B, m, t0).eta <= T) hi = m; else lo = m; } return hi; }
  function calcNow() { try { return (window.__navPlot && window.__navPlot.calc()) || (window.__fsPlot && window.__fsPlot.calc()) || null; } catch (e) { return null; } }
  function speed(o) { if (C.spd > 0) return { s: C.spd, src: 'set by hand' }; if (o && o.vmc > 0.5) return { s: o.vmc, src: 'VMC' }; if (o && o.sog > 0.5) return { s: o.sog, src: 'SOG' }; return { s: 5, src: 'assumed' }; }
  function pts(o) { var c = o.c, P = c ? c.marks.concat([c.finish]) : []; return { m1: P[o.i] || o.m, m2: P[o.i + 1] || null }; }
  /* everything for the panel */
  function work() {
    var o = calcNow(); if (!o || !o.ok || !o.f) return { why: (o && o.why) || 'Needs a position and a course: Live GPS (Route) or the boat link (Route+), and a race.' };
    var here = { lat: o.f.la != null ? o.f.la : o.f.lat, lon: o.f.lo != null ? o.f.lo : o.f.lon }, now = Date.now(), sp = speed(o), P = pts(o);
    if (!P.m1) return { why: 'No next mark.' };
    var L1 = sail(here, P.m1, sp.s, now); if (!L1.tide) return { why: 'No tide model here: choose one in Settings, Forecasts (Tide).' };
    var T1 = turn(P.m1, L1.brg, now), r = { here: here, sp: sp, m1: P.m1, m2: P.m2, L1: L1, T1: T1, now: now };
    if (T1.t) { r.margin = (T1.t - L1.eta) / 60000; if (T1.now === 'fair' && r.margin < 0) r.need = need(here, P.m1, T1.t, now); }
    var late = sail(here, P.m1, sp.s, now + 30 * 60000); r.late = late.mins - L1.mins;
    /* the course to steer to hold the line to the mark across the tide here and now (research step 7): the boat's water track
       plus the tide must lie along the leg, so sin(H - B) = -cross / s, the cross-tide positive to starboard of the line */
    var tdN = tideAt(here.lat, here.lon, now); if (tdN) { var bb = L1.brg * R, cross = tdN[0] * Math.cos(bb) - tdN[1] * Math.sin(bb); if (Math.abs(cross) < sp.s * 0.95) r.cts = { h: (L1.brg - Math.asin(cross / sp.s) / R + 360) % 360, cross: cross }; }
    if (P.m2) { r.L2 = sail(P.m1, P.m2, sp.s, L1.eta); r.T2 = turn(P.m2, r.L2.brg, L1.eta); }
    return r;
  }
  /* ---- drawing ---- */
  function atEta(r) { return !r.T1.t || r.L1.eta <= r.T1.t ? r.T1.now : r.T1.to; }   /* the tide at the mark when we get there */
  function verdict(r) {
    if (!r.T1.t) return 'Tide along the leg ' + r.T1.now + ', no turn in the next 12 hours.';
    var foulNow = r.T1.now === 'foul';
    if (foulNow) return 'Foul now; it turns fair at ' + hm(r.T1.t) + ' (in ' + mins((r.T1.t - r.now) / 60000) + '). ETA ' + hm(r.L1.eta) + ': ' + (r.margin < 0 ? 'the tide will have turned before you arrive.' : 'still foul when you arrive.');
    return r.margin >= 0 ? 'Gate: the tide at the mark turns ' + r.T1.to + ' at ' + hm(r.T1.t) + '. ETA ' + hm(r.L1.eta) + ': ' + mins(r.margin) + ' in hand.' : 'Gate: the tide at the mark turns ' + r.T1.to + ' at ' + hm(r.T1.t) + '. ETA ' + hm(r.L1.eta) + ': ' + mins(-r.margin) + ' short.';
  }
  /* ---- the tide gates window (Stuart 24 Nov 11:38 to 12:14; mock-ups 3 and 4 in docs/) ----
     Times come from the followed route: the time the boat rounds each mark sailing at its polars in the forecast wind and tide.
     At each mark: the tide along the leg in and along the leg out, fair (with you, 0.3 kn or more), foul (against) or slack (under
     0.3 kn), from 3 h before our ETA to 3 h after. Rivals: the Fleet boats, each sailed along our route on our polar x its TCC from its
     own start (the app's fleet ghosts); the nearest five on corrected time at the mark. With no route, it asks for one. */
  var OPEN = {}, HW = 3;
  function dayHm(ms) { var d = new Date(ms), n = new Date(); return (d.toDateString() === n.toDateString() ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ') + hm(ms); }
  function state(a) { return a >= SLACK ? 'fair' : a <= -SLACK ? 'foul' : 'slack'; }
  function legsPlan(d) {
    var p = d.path, ts = d.ts, n = p.length, nowH = (Date.now() / 1000 - d.T0) / 3600, k = 0;
    while (k < n - 1 && ts[k + 1] <= nowH) k++;
    var cur = p[k].leg || 0, round = [];   /* round[L]: the path index where leg L ends (the mark is rounded) */
    for (var i = 1; i < n; i++) { var lg = p[i].leg || 0, lp = p[i - 1].leg || 0; if (lg > lp) for (var L = lp; L < lg; L++) round[L] = i; }
    round[d.legs.length - 1] = n - 1;
    var origin = d.from || d.start, out = [];
    for (var L2 = 0; L2 < d.legs.length; L2++) {
      var m = d.legs[L2], prev = L2 ? d.legs[L2 - 1] : origin, next = d.legs[L2 + 1] || null, ri = round[L2];
      if (ri == null || L2 < cur) continue;
      out.push({ L: L2, m: m, ri: ri, eta: d.T0 * 1000 + ts[ri] * 3600000, bIn: prev ? brg(prev, m) : null, bOut: next ? brg(m, next) : null, next: next, nextRi: next ? round[L2 + 1] : null });
    }
    return { legs: out, nowH: nowH, k: k };
  }
  /* ---- tide gates at any point (Stuart 24 Nov 14:25 and 14:40: "click on the chart ... give you the tide situation at that point as if it
     was a tide gate"; "tide at the exact spot; not on land, TSS or shallow area; saved list, before the start as long as the start time
     has been set; in course order; can type a name otherwise GATE 1 / 2"; go 15:24). A point is saved with the race (keyed by its
     marks), timed from the route's nearest point to it, so it moves with every reroute; the tide is taken at the point itself, along the
     route's own heading into and out of that spot; the Fleet boats are compared there exactly as at a mark. */
  function raceKey(d) { if (d.key) return d.key; return d.legs.map(function (m) { return m.lat.toFixed(3) + ',' + m.lon.toFixed(3); }).join(';'); }
  function ptList(d) { var k = raceKey(d); return C.pts[k] || (C.pts[k] = []); }
  function ptsPlan(d, P) {
    var p = d.path, ts = d.ts, n = p.length, round = []; for (var i = 1; i < n; i++) { var lg = p[i].leg || 0, lp = p[i - 1].leg || 0; if (lg > lp) for (var L = lp; L < lg; L++) round[L] = i; } round[d.legs.length - 1] = n - 1;
    return ptList(d).map(function (q, j) {
      var bi = 0, bd = 1e9; for (var i2 = 0; i2 < n; i2++) { var dd = dist({ lat: p[i2].la, lon: p[i2].lo }, q); if (dd < bd) { bd = dd; bi = i2; } }
      if (bi <= P.k) return null;   /* already passed */
      var a = p[Math.max(0, bi - 3)], b = p[Math.min(n - 1, bi + 3)], here = { lat: p[bi].la, lon: p[bi].lo }, L3 = p[bi].leg || 0, nextRi = null;
      for (var L4 = L3; L4 < d.legs.length; L4++) if (round[L4] != null && round[L4] > bi) { nextRi = round[L4]; break; }
      return { L: 'p' + j, pt: j, m: { name: q.name, lat: q.lat, lon: q.lon }, ri: bi, off: bd, eta: d.T0 * 1000 + ts[bi] * 3600000,
        bIn: bi > 0 ? brg({ lat: a.la, lon: a.lo }, here) : null, bOut: bi < n - 1 ? brg(here, { lat: b.la, lon: b.lo }) : null, next: nextRi != null ? d.legs[p[nextRi].leg || 0] : null, nextRi: nextRi };
    }).filter(Boolean);
  }
  /* the gates on the chart (Stuart 25 Nov 08:04: "a mark should appear on the chart showing where it was placed with its name ... when you
     go back to it and tap it it gives the information and the ability to clear it or reroute from the point") */
  window.__fsTgPts = function () { var d = window.__fsTgData ? window.__fsTgData() : null; if (!d || !d.legs.length) return []; return ptList(d).map(function (q, j) { return { i: j, name: q.name, lat: q.lat, lon: q.lon }; }); };
  window.__fsTgPtInfo = function (j) { var d = window.__fsTgData ? window.__fsTgData() : null; if (!d || !d.legs.length) return null; var P = legsPlan(d), g = ptsPlan(d, P).filter(function (x) { return x.pt === j; })[0];
    if (!g) return { passed: true }; g.bandsIn = bandsAt(g.m, g.bIn, g.eta - HW * 3600000, g.eta + HW * 3600000); g.bandsOut = bandsAt(g.m, g.bOut, g.eta - HW * 3600000, g.eta + HW * 3600000); return { line: gateLine(g), eta: g.eta, off: g.off }; };
  window.__fsTgPtDel = function (j) { var d = window.__fsTgData ? window.__fsTgData() : null; if (!d) return; ptList(d).splice(j, 1); save(); if (window.__fsRedraw) window.__fsRedraw(); var p = $('tgPop'); if (p && !p.hidden) render(); };
  window.__fsTgShow = function (j) { OPEN['p' + j] = 1; open(true); var p = $('tgPop'), e = p && p.querySelector('.tgmk[data-l="p' + j + '"]'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); };
  function inPoly(poly, la, lo) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[0] > la) !== (b[0] > la) && lo < (b[1] - a[1]) * (la - a[0]) / (b[0] - a[0]) + a[1]) c = !c; } return c; }
  /* the tap box on the chart: a 'Tide gate here' button and a name, or why not here */
  window.__fsTipGate = function (body, la, lo, o) {
    var d = window.__fsTgData ? window.__fsTgData() : null, box = document.createElement('div'); box.className = 'tgtap';
    if (!d || !d.legs.length) { box.innerHTML = '<p class="tgn">Tide gate here: set the start time and route the race first.</p>'; body.appendChild(box); return; }
    var why = o && o.z > 0 ? 'on land' : o && o.z === o.z && o.z > -o.nogo ? 'shallower than your no-go depth (' + o.nogo + ' m)' : null, zs = window.__fsZones ? window.__fsZones() : [];
    if (!why && zs.some(function (z) { return (z.kind === 'lane' || z.kind === 'zone') && inPoly(z.poly, la, lo); })) why = 'inside a traffic separation scheme';
    if (why) { box.innerHTML = '<p class="tgno">Not a tide gate here: ' + why + '.</p>'; body.appendChild(box); return; }
    var L = ptList(d), nm = 'GATE ' + (L.reduce(function (m, q) { var k = /^GATE (\d+)$/.exec(q.name); return k ? Math.max(m, +k[1]) : m; }, 0) + 1);
    box.innerHTML = '<button class="btn tgadd1" type="button" id="tgPtAdd">◎ Tide gate here</button><label class="tgname">Name <input id="tgPtName" type="text" maxlength="24" placeholder="' + nm + '"></label>';
    /* at the top of the box, under 'Route to here' (Stuart 24 Nov 23:20, mock-up): at the foot of a long card on a phone it was out of sight */
    var top = body.querySelector('.xrow'); if (top) top.insertAdjacentElement('afterend', box); else { var h = body.querySelector('b'); if (h && h.parentNode === body) h.insertAdjacentElement('afterend', box); else body.insertBefore(box, body.firstChild); }
    $('tgPtAdd').onclick = function (e) { e.stopPropagation(); var v = ($('tgPtName').value || '').trim() || nm; L.push({ name: v.slice(0, 24), lat: la, lon: lo }); save(); if (window.__fsRedraw) window.__fsRedraw();   /* the new gate shows on the chart at once */ var t = $('tip'); if (t) t.hidden = true; open(true); var c = document.querySelector('#tgPop .tgmk[data-l="p' + (L.length - 1) + '"]'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); };
    $('tgPtName').onclick = function (e) { e.stopPropagation(); };
  };
  function bandsAt(m, b, t0, t1) { var a = [], st = null, s0 = t0; if (b == null) return a; for (var t = t0; t <= t1 + 1; t += 300000) { var v = state(along(tideAt(m.lat, m.lon, Math.min(t, t1)), b)); if (st !== v) { if (st) a.push([s0, t, st]); st = v; s0 = t; } } if (st) a.push([s0, t1, st]); return a; }
  function stAt(B, t) { for (var i = 0; i < B.length; i++) if (t >= B[i][0] && t <= B[i][1]) return B[i]; return null; }
  function gateLine(g) {
    var B = g.bandsIn, at = stAt(B, g.eta), s1 = at ? at[2] : 'slack', h = 'Arrive ' + dayHm(g.eta) + ': ' + s1 + (g.pt != null ? ' along your course here' : ' on the leg in');
    if (at && at[1] < g.eta + HW * 3600000 - 1) { var nx = stAt(B, at[1] + 1); if (nx) h += '; it turns ' + nx[2] + ' at ' + hm(at[1]) + ', ' + mins((at[1] - g.eta) / 60000) + ' after you'; }
    if (g.bOut != null) { var o = stAt(g.bandsOut, g.eta); if (o) h += '. ' + o[2].charAt(0).toUpperCase() + o[2].slice(1) + (g.pt != null ? ' on the course after it' : ' on the leg out') + (o[1] < g.eta + HW * 3600000 - 1 ? ' until ' + hm(o[1]) : ''); }
    return { text: h + '.', cls: s1 === 'foul' ? 'bad' : s1 === 'fair' ? 'ok' : '' };
  }
  var BOAT = function (x, y, f, k) { return '<path transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k + ')" d="M0 -9 C5 -4 5 4 3 8 L-3 8 C-5 4 -5 -4 0 -9z" fill="' + f + '" stroke="#0b1626" stroke-width="1.2"/>'; };
  function chart(g, rv, big) {
    var W = 340, L0 = 34, t0 = g.eta - HW * 3600000, t1 = g.eta + HW * 3600000, X = function (t) { return L0 + (t - t0) / (t1 - t0) * (W - L0 - 6); };
    var top = big ? 40 : 22, hh = big ? 16 : 12, gap = 3, H = top + 2 * hh + gap + 22, s = '<svg class="tgsv" viewBox="0 0 ' + W + ' ' + (H + 12) + '" data-t0="' + t0 + '" data-t1="' + t1 + '" data-l0="' + L0 + '">';
    s += '<defs><pattern id="tgH' + g.L + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-opacity=".35" stroke-width="2"/></pattern></defs>';
    var band = function (B, y) { B.forEach(function (q) { var x1 = X(q[0]), w = Math.max(1, X(q[1]) - x1 - 1), c = q[2] === 'fair' ? '#16a34a' : q[2] === 'foul' ? '#dc2626' : '#64748b'; s += '<rect x="' + x1.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + hh + '" rx="2" fill="' + c + '"/>'; if (q[2] === 'foul') s += '<rect x="' + x1.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + hh + '" rx="2" fill="url(#tgH' + g.L + ')"/>'; if (w > 40 && q[2] !== 'slack') s += '<text x="' + (x1 + w / 2).toFixed(1) + '" y="' + (y + hh / 2 + 4) + '" fill="#fff" font-size="10.5" font-weight="700" text-anchor="middle">' + (q[2] === 'fair' ? 'FAIR ›' : '‹ FOUL') + '</text>'; }); };
    s += '<text x="0" y="' + (top + hh - 4) + '" fill="currentColor" font-size="10.5" font-weight="700">IN</text>'; band(g.bandsIn, top);
    if (g.bOut != null) { s += '<text x="0" y="' + (top + 2 * hh + gap - 4) + '" fill="currentColor" font-size="10.5" font-weight="700">OUT</text>'; band(g.bandsOut, top + hh + gap); }
    /* boats within 12 px of each other share one boat and one label ('A B C'), so letters never sit on top of each other */
    var cl = []; rv.filter(function (r) { return r.at != null && r.tm >= t0 && r.tm <= t1; }).sort(function (a, b) { return a.tm - b.tm; }).forEach(function (r) { var x = X(r.tm), g0 = cl[cl.length - 1]; if (g0 && x - g0.x1 < 12) { g0.ids.push(r.id); g0.x1 = x; } else cl.push({ x: x, x1: x, ids: [r.id] }); });
    cl.forEach(function (g0, k) { var x = (g0.x + g0.x1) / 2, ly = big ? top - 4 - (k % 2) * 13 : top - 6; s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (ly + 2) + '" y2="' + (top + 2 * hh + gap) + '" stroke="currentColor" stroke-width="1" opacity=".55"/>' + BOAT(x, ly - 4, '#cbd5e1', big ? 0.75 : 0.6); if (big) s += '<text x="' + (x + 6).toFixed(1) + '" y="' + (ly - 2) + '" fill="currentColor" font-size="10" font-weight="700">' + g0.ids.join(' ') + '</text>'; });
    var x = X(g.eta), yb = top + 2 * hh + gap + 11; s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (top - 2) + '" y2="' + (yb - 6) + '" stroke="#facc15" stroke-width="2"/>' + BOAT(x, yb, '#facc15', big ? 1 : 0.8) + '<text x="' + (x + 8).toFixed(1) + '" y="' + (yb + 4) + '" fill="#ca8a04" font-size="10.5" font-weight="700">YOU</text>';
    var stp = HW <= 0.5 ? 600000 : HW <= 1 ? 1200000 : 3600000; for (var hr = Math.ceil(t0 / stp) * stp; hr <= t1; hr += stp) { if (Math.abs(X(hr) - x) < 14) continue; if (((hr / 3600000) % 2) && HW >= 3) continue; s += '<text x="' + X(hr).toFixed(1) + '" y="' + (H + 10) + '" fill="currentColor" opacity=".7" font-size="10" text-anchor="middle">' + hm(hr) + '</text>'; }
    if (big) s += '<line class="tgcur" x1="-9" x2="-9" y1="' + (top - 34) + '" y2="' + (top + 2 * hh + gap + 4) + '" stroke="#60a5fa" stroke-width="2" stroke-dasharray="3 2"/>';
    return s + '</svg>';
  }
  function overview(gs) {
    if (gs.length < 2) return ''; var W = 340, a = Date.now(), b = gs[gs.length - 1].eta, Lm = 14, Y = 40, X = function (t) { return Lm + (t - a) / (b - a || 1) * (W - 30); };
    var s = '<div class="tgovt">The race from here</div><svg class="tgov" viewBox="0 0 ' + W + ' 84"><defs><pattern id="tgHo" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#000" stroke-opacity=".35" stroke-width="2"/></pattern></defs><line x1="' + X(a) + '" x2="' + X(b) + '" y1="' + Y + '" y2="' + Y + '" stroke="currentColor" opacity=".25" stroke-width="6" stroke-linecap="round"/>';
    var EU = -99, ED = 30;   /* the right edge of the last label above and below the line (NOW sits below at the left) */
    gs.forEach(function (g, i) { var at = stAt(g.bandsIn, g.eta), c = at ? at[2] : 'slack', col = c === 'fair' ? '#16a34a' : c === 'foul' ? '#dc2626' : '#64748b', x = X(g.eta), up = i % 2 === 0, last = i === gs.length - 1, an = last ? 'end' : 'middle', tx = last ? x + 11 : x;
      s += '<g class="tgovm" data-l="' + g.L + '" style="cursor:pointer"><circle cx="' + x.toFixed(1) + '" cy="' + Y + '" r="11" fill="' + col + '" stroke="#e6edf6" stroke-width="1.5"/>' + (c === 'foul' ? '<circle cx="' + x.toFixed(1) + '" cy="' + Y + '" r="11" fill="url(#tgHo)"/>' : '') + '<text x="' + x.toFixed(1) + '" y="' + (Y + 4) + '" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">' + (c === 'fair' ? '›' : c === 'foul' ? '‹' : '–') + '</text>';
      var nm = short(g.m.name), tl = dayHm(g.eta) + ' \u00b7 ' + c, wd = Math.max(nm.length * 6, tl.length * 5.2), lo = last ? x + 11 - wd : x - wd / 2, hi = lo + wd, side = null;
      [up, !up].some(function (u) { if (lo > (u ? EU : ED) + 4) { side = u; return true; } return false; });
      if (side === null) { side = up; tl = ''; } if (side) EU = hi; else ED = hi;
      s += '<text x="' + tx.toFixed(1) + '" y="' + (side ? 12 : Y + 28) + '" fill="currentColor" font-size="10.5" font-weight="700" text-anchor="' + an + '">' + esc(nm) + '</text>' + (tl ? '<text x="' + tx.toFixed(1) + '" y="' + (side ? 24 : Y + 40) + '" fill="currentColor" opacity=".7" font-size="10" text-anchor="' + an + '">' + tl + '</text>' : '') + '</g>'; });
    s += BOAT(X(a), Y, '#facc15', 1).replace('scale(1)', 'scale(1) rotate(90)') + '<text x="' + (X(a) - 8) + '" y="' + (Y + 28) + '" fill="#ca8a04" font-size="10" font-weight="700">NOW</text></svg>';
    return s + '<p class="tgn">Each mark shows the tide on the leg in when you get there. Tap a mark for its chart.</p>';
  }
  function short(n) { n = String(n || 'Mark'); if (/^Finish/.test(n)) return 'Finish'; n = n.split(',')[0].replace(/\s+(buoy|mark)$/i, ''); return n.length > 13 ? n.slice(0, 12) + '\u2026' : n; }
  function rivalsAt(d, g) {
    var ts = d.ts, me0 = d.start ? d.start.t : ts[0], tcc = d.tcc, cor = function (t, s0, k) { return (t - s0) * k * 60; };
    var meAt = cor(ts[g.ri], me0, tcc), meNx = g.nextRi != null ? cor(ts[g.nextRi], me0, tcc) : null;
    return d.ghosts.map(function (b) { var s0 = b.ts[0], at = cor(b.ts[g.ri], s0, b.tcc) - meAt, nx = meNx != null ? cor(b.ts[g.nextRi], s0, b.tcc) - meNx : null; return { name: b.name, tcc: b.tcc, tm: d.T0 * 1000 + b.ts[g.ri] * 3600000, at: at, nx: nx, gain: nx != null ? nx - at : null }; })
      .filter(function (r) { return isFinite(r.at); }).sort(function (a, b) { return Math.abs(a.at) - Math.abs(b.at); });
  }
  function sgn(v) { v = Math.round(v); return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v); }
  /* inshore the gaps are seconds (Solent race test 24 Nov: every boat read '0 min'): under 10 min they show as m:ss */
  function gap(v, unit) { if (HW >= 3 || Math.abs(v) >= 10) return sgn(v) + (unit ? ' min' : ''); var sec = Math.round(v * 60), a = Math.abs(sec); return (sec > 0 ? '+' : sec < 0 ? '−' : '') + (a >= 60 ? Math.floor(a / 60) + ':' + ('0' + a % 60).slice(-2) : a + ' s'); }
  function render() {
    var p = $('tgPop'); if (!p || p.hidden) return; var bx = p.querySelector('.tgb'), d = window.__fsTgData ? window.__fsTgData() : null;
    if (!d || !d.legs.length) { bx.innerHTML = '<p>The tide gates use your route: the time you reach each mark, sailing at your polars in the forecast wind and tide.</p><p><button class="btn tgroute" type="button" id="tgRoute">Route now</button></p>'; var rb = $('tgRoute'); if (rb) rb.onclick = function () { if (window.__fsRouteNow) window.__fsRouteNow(); }; return; }
    if (!window.__fsTideAt || !window.__fsTideAt(d.legs[0].lat, d.legs[0].lon, Date.now() / 1000)) { bx.innerHTML = '<p>No tide model here: choose one in Settings, Forecasts (Tide).</p>'; return; }
    var P = legsPlan(d); if (!P.legs.length) { bx.innerHTML = '<p>The route has no marks left to reach.</p>'; return; }
    /* Stuart 24 Nov 13:05 (his screenshot: 'Next: Finish', ETA Mon 23:16, 27 h behind): the start was yesterday, so every time on the
       route is past. Say so, and offer the two ways on, instead of a gate in the past */
    if (P.legs[P.legs.length - 1].eta < Date.now()) { bx.innerHTML = '<p class="tgv bad">This route finished ' + dayHm(P.legs[P.legs.length - 1].eta) + ': its start, ' + dayHm(d.T0 * 1000 + d.ts[0] * 3600000) + ', has passed, so it has no tide gates ahead.</p><p>Choose a later start in Race set-up, or reroute from where the boat is now.</p><p><button class="btn" type="button" id="tgRe">Reroute from here</button></p>'; wire(p, d, P); return; }
    /* Stuart 24 Nov 12:52, "yes shrink for solent races": on an inshore course (under 40 nm, the app's own rule) each chart runs a third of
       the race left either side of the ETA, between 15 min and 1 h; offshore it stays 3 h */
    var o0 = d.from || d.start, cn = 0; [o0].concat(d.legs).forEach(function (q, k, a) { if (k && a[k - 1]) cn += dist(a[k - 1], q); });
    var left = (P.legs[P.legs.length - 1].eta - Date.now()) / 3600000; HW = cn < 40 ? Math.max(0.25, Math.min(1, (left > 0 ? left : (P.legs[P.legs.length - 1].eta - P.legs[0].eta) / 3600000 + 0.5) / 3)) : 3;
    var marksLeft = P.legs.length; P.legs = P.legs.concat(ptsPlan(d, P)).sort(function (a, b) { return a.ri - b.ri || (a.pt == null ? -1 : 1); });   /* points in course order among the marks */
    P.legs.forEach(function (g) { g.bandsIn = bandsAt(g.m, g.bIn, g.eta - HW * 3600000, g.eta + HW * 3600000); g.bandsOut = bandsAt(g.m, g.bOut, g.eta - HW * 3600000, g.eta + HW * 3600000); });
    var h = '<p class="tgn">Following: ' + esc(d.name || 'your route') + '</p>';
    if (d.live && (d.live.d >= 0.2 || Math.abs(d.live.ahead) >= 5)) h += '<div class="tgoff"><div><b>Off the plan:</b> ' + d.live.d.toFixed(1) + ' nm ' + esc(d.live.side || '') + ' of the route, ' + mins(Math.abs(d.live.ahead)) + (d.live.ahead < 0 ? ' behind' : ' ahead of') + ' it. The times below are from the route.</div><button class="btn" type="button" id="tgRe">Reroute from here</button></div>';
    h += overview(P.legs);
    P.legs.forEach(function (g, i) {
      var open = i < 2 || OPEN[g.L], rv = rivalsAt(d, g).slice(0, 5); rv.forEach(function (r, k) { r.id = 'ABCDE'.charAt(k); });
      if (!open) { var at = stAt(g.bandsIn, g.eta); h += '<button type="button" class="tgfold" data-l="' + g.L + '"><span>' + (g.pt != null ? '◎ ' : '') + esc(g.m.name) + ' · ' + (at ? at[2] : 'slack') + ' in</span><span>ETA ' + dayHm(g.eta) + ' ›</span></button>'; return; }
      var v = gateLine(g); h += '<div class="tgmk' + (i ? '' : ' next') + (g.pt != null ? ' tgpt' : '') + '" data-l="' + g.L + '"><div class="tgt1"><b>' + (i ? 'Then ' : 'Next: ') + (g.pt != null && !/^GATE \d+$/.test(g.m.name) ? '<span class="tgtag">◎ GATE</span>' : g.pt != null ? '<span class="tgtag">◎</span>' : '') + esc(g.m.name) + '</b><span>ETA ' + dayHm(g.eta) + '</span></div>' + (g.pt != null ? '<p class="tgn">Your point: tide at this spot; your route passes ' + (g.off < 0.05 ? 'over it' : g.off.toFixed(1) + ' nm off') + '. <button type="button" class="tglink tgren" data-p="' + g.pt + '">Rename</button> · <button type="button" class="tglink tgdel" data-p="' + g.pt + '">Remove</button></p>' : '') + '<p class="tgv ' + v.cls + '">' + v.text + '</p>' + chart(g, rv, !i);
      if (!i) h += '<div class="tgtip" id="tgTip">Put a finger or the mouse on the chart for the time, the distance to the mark and the tide.</div><p class="tgn"><b>IN</b>: the tide along your leg to this mark. <b>OUT</b>: along the next leg, after you round. <b>FAIR</b> with you, <b>FOUL</b> against (hatched), grey <b>slack</b>: under 0.3 kn along the leg, about to turn. Lettered boats are in the table. The chart runs ' + (HW >= 1 ? HW + ' hour' + (HW > 1 ? 's' : '') : Math.round(HW * 60) + ' minutes') + ' either side of your ETA.</p>';
      if (!i) { if (rv.length) { h += '<div class="tgtw"><table class="tgt"><tr><th>Boat</th><th>ETA</th><th class="r">' + (g.pt != null ? 'At gate' : 'At mark') + '</th>' + (g.bOut != null ? '<th class="r">After next leg</th><th class="r">You gain</th>' : '') + '</tr>' + rv.map(function (r) { return '<tr><td><span class="tgbd">' + r.id + '</span>' + esc(r.name) + '<small>TCC ' + r.tcc.toFixed(3) + '</small></td><td>' + dayHm(r.tm) + '</td><td class="r">' + gap(r.at, 1) + '</td>' + (g.bOut != null ? '<td class="r">' + (r.nx != null ? gap(r.nx, 1) : '--') + '</td><td class="r ' + (r.gain > (HW < 3 ? 0.05 : 0.5) ? 'ok' : r.gain < -(HW < 3 ? 0.05 : 0.5) ? 'bad' : '') + '">' + (r.gain != null ? gap(r.gain) : '--') + '</td>' : '') + '</tr>'; }).join('') + '</table></div>';
          var more = d.ghosts.length - rv.length; h += (more > 0 ? '<button type="button" class="tglink" id="tgFleet">' + more + ' more boat' + (more > 1 ? 's' : '') + ' on the Fleet page ›</button>' : '') + '<p class="tgn">Corrected time against you: − ahead of you, + behind. At mark: when each rounds. After next leg: once both have sailed the leg out, each in the tide it meets. You gain: the change between the two, + you gain on that boat, − you lose; mostly the tide, and the forecast wind at their different times. Each boat sails your route on your polar × its TCC from its own start.</p>'; }
        else h += '<p class="tgn">No boats to compare: add the boats you are racing on the Fleet page. <button type="button" class="tglink" id="tgFleet">Fleet ›</button></p>'; }
      h += '</div>';
    });
    h += '<p class="tgn">To add a tide gate anywhere on the course, a headland or a lighthouse, tap the chart there and choose <b>Tide gate here</b>.</p>';
    h += '<div class="tgset"><label><input type="checkbox" id="tgAlarm"' + (C.alarm ? ' checked' : '') + '> Alarm 15 minutes before the gate closes while we would miss it</label></div>';
    bx.innerHTML = h; wire(p, d, P);
  }
  function wire(p, d, P) {
    var re = $('tgRe'); if (re) re.onclick = function () { if (window.__fsLiveReroute && !window.__fsLiveReroute()) alarm('Reroute needs the boat position: Live GPS or the boat link.'); };
    var fl = $('tgFleet'); if (fl) fl.onclick = function () { var wideScreen = window.__fsFleetOpen ? window.__fsFleetOpen() : false; if (!wideScreen) open(false); };   /* on a phone the Fleet tab takes the screen, so the tide gates close; beside the panel they stay */
    [].forEach.call(p.querySelectorAll('.tgfold,.tgovm'), function (b) { b.onclick = function () { OPEN[b.getAttribute('data-l')] = 1; render(); var e = p.querySelector('.tgmk[data-l="' + b.getAttribute('data-l') + '"]'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); }; });
    var PL = ptList(d);
    [].forEach.call(p.querySelectorAll('.tgdel'), function (b) { b.onclick = function () { PL.splice(+b.dataset.p, 1); save(); render(); if (window.__fsRedraw) window.__fsRedraw(); }; });
    [].forEach.call(p.querySelectorAll('.tgren'), function (b) { b.onclick = function () { var j = +b.dataset.p, card = b.closest('.tgmk'), t1 = card.querySelector('.tgt1 b'); t1.innerHTML = '<input class="tgrin" type="text" maxlength="24" value="' + esc(PL[j].name) + '"> <button type="button" class="btn tgrok">OK</button>'; var inp = t1.querySelector('input'); inp.focus(); var ok = function () { var v = inp.value.trim(); if (v) { PL[j].name = v.slice(0, 24); save(); } render(); }; t1.querySelector('.tgrok').onclick = ok; inp.onkeydown = function (e) { if (e.key === 'Enter') ok(); }; }; });
    var al = $('tgAlarm'); if (al) al.onchange = function () { C.alarm = al.checked; save(); };
    var sv = p.querySelector('.tgmk.next .tgsv'), tip = $('tgTip'); if (!sv || !tip) return; var g = P.legs[0];
    var move = function (e) { var r = sv.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e, vb = sv.viewBox.baseVal, xv = (pt.clientX - r.left) / r.width * vb.width, l0 = +sv.dataset.l0, t0 = +sv.dataset.t0, t1 = +sv.dataset.t1;
      if (xv < l0) return; var t = t0 + (xv - l0) / (vb.width - l0 - 6) * (t1 - t0), c = sv.querySelector('.tgcur'); if (c) { c.setAttribute('x1', xv); c.setAttribute('x2', xv); }
      var th = (t / 1000 - d.T0) / 3600, ts = d.ts, i = 0; while (i < ts.length - 2 && ts[i + 1] < th) i++; var f = Math.max(0, Math.min(1, (th - ts[i]) / ((ts[i + 1] - ts[i]) || 1))), q = d.path[i], q2 = d.path[i + 1] || q, pos = { lat: q.la + (q2.la - q.la) * f, lon: q.lo + (q2.lo - q.lo) * f };
      var ti = along(tideAt(g.m.lat, g.m.lon, t), g.bIn), to = g.bOut != null ? along(tideAt(g.m.lat, g.m.lon, t), g.bOut) : null, left = (g.eta - t) / 60000;
      tip.innerHTML = '<b>' + dayHm(t) + '</b> · ' + (left > 0 ? '<b>DTW ' + dist(pos, g.m).toFixed(1) + ' nm</b> · ' + mins(left) + ' to the mark' : 'past the mark by ' + mins(-left)) + ' · at the mark: IN ' + state(ti) + ' ' + Math.abs(ti).toFixed(1) + ' kn' + (to != null ? ' · OUT ' + state(to) + ' ' + Math.abs(to).toFixed(1) + ' kn' : ''); };
    sv.addEventListener('mousemove', move); sv.addEventListener('touchstart', move, { passive: true }); sv.addEventListener('touchmove', move, { passive: true }); sv.addEventListener('click', move);
  }
  /* a pasted entry list: each line with a TCC (0.800 to 1.800); the name is the rest of the line, sail numbers and classes kept as written */
  function parseList(t) { var out = []; String(t || '').split(/\r?\n/).forEach(function (l) { var m = l.match(/(^|[\s,;\t])([01]\.\d{3})(?=$|[\s,;\t])/); if (!m) return; var v = +m[2]; if (!(v >= 0.8 && v <= 1.8)) return; var n = (l.slice(0, m.index) + ' ' + l.slice(m.index + m[0].length)).replace(/[\t,;]+/g, ' ').replace(/\s+/g, ' ').trim(); if (n) out.push({ name: n.slice(0, 40), tcc: v }); }); return out; }
  function css() { if ($('tgCss')) return; var s = document.createElement('style'); s.id = 'tgCss';
    s.textContent = '.tgpop{position:fixed;left:max(8px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 58px);z-index:30;width:min(calc(100vw - 16px),440px);max-height:calc(100vh - 140px);max-height:calc(100dvh - 140px);overscroll-behavior:contain;overflow:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:13px}.tgpop[hidden]{display:none}.tgpop h3{margin:0 0 6px;font-size:16px}.tgpop h4{margin:10px 0 4px;font-size:13px}.tgpop .close{position:absolute;right:8px;top:6px}' +
      '.tgtop{display:flex;gap:12px;align-items:center}.tgtop div{display:flex;flex-direction:column;gap:2px}.tgtop span{font-size:12px;color:var(--muted)}.tgv{margin:8px 0 4px;font-weight:600}.tgv.ok{color:#16a34a}.tgv.bad{color:#dc2626}.tgn{margin:4px 0;font-size:12px;color:var(--muted)}' +
      '.tgtw{overflow-x:auto}.tgt{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}.tgt th{text-align:left;color:var(--muted);font-weight:600;padding:2px 6px 2px 0}.tgt td{padding:3px 6px 3px 0;border-top:1px solid var(--line);vertical-align:top}.tgt small{display:block;color:var(--muted);font-size:10px}' +
      '.tgadd{display:flex;gap:6px;align-items:center;margin:4px 0}.tgadd input{min-height:36px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);padding:0 8px;min-width:0}.tgadd input:first-child{flex:1}.tgadd span{flex:1}.tgset{display:flex;flex-direction:column;gap:6px;margin-top:8px;font-size:12px}' +
      '.tgsv,.tgov{width:100%;display:block;margin:4px 0;touch-action:pan-y}.tgovt{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-top:8px}.tgoff{display:flex;gap:8px;align-items:center;border:1px solid #dc2626;border-radius:10px;padding:8px;margin:6px 0;font-size:12px}.tgoff b{color:#dc2626}.tgmk{border-top:1px solid var(--line);padding:8px 0 4px}.tgt1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.tgt1 b{font-size:14px}.tgmk.next .tgt1 b{font-size:16px}.tgt1 span{color:var(--muted);font-size:12px;white-space:nowrap}.tgtip{border:1px solid #60a5fa;border-radius:10px;padding:6px 8px;font-size:12px;margin:2px 0 6px}.tgbd{display:inline-block;width:16px;height:16px;border-radius:50%;background:#cbd5e1;color:#0b1626;font:700 11px system-ui,sans-serif;text-align:center;line-height:16px;margin-right:5px}.tgt td.r,.tgt th.r{text-align:right}.tgt td.ok{color:#16a34a}.tgt td.bad{color:#dc2626}.tgfold{display:flex;justify-content:space-between;gap:8px;width:100%;background:none;border:0;border-top:1px solid var(--line);color:var(--muted);font:inherit;font-size:12px;padding:8px 0;text-align:left;cursor:pointer;min-height:40px}.tglink{background:none;border:0;color:#3b82f6;font:inherit;font-size:13px;padding:6px 0;cursor:pointer;min-height:36px}' +
      '.tgtag{display:inline-block;background:#14b8a6;color:#0b1626;font-size:10px;font-weight:700;border-radius:6px;padding:1px 5px;margin-right:6px;vertical-align:2px}.tgmk.tgpt{border-left:3px solid #14b8a6;padding-left:8px}.tgtap{margin-top:8px;display:flex;flex-direction:column;gap:6px}.tgadd1{background:#0f766e;border-color:#14b8a6;color:#fff}.tgname{display:flex;gap:6px;align-items:center;font-size:12px}.tgname input,.tgrin{flex:1;min-width:0;min-height:34px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);padding:0 8px;font:inherit}.tgno{margin:6px 0 0;color:#dc2626;font-weight:600;font-size:12px}.tgstrip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 70px);z-index:6;background:var(--glass,var(--panel));color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:4px 12px;font:700 12px var(--f-data);white-space:nowrap;cursor:pointer}.tgstrip[hidden]{display:none}.tgstrip.bad{border-color:#dc2626;color:#dc2626}.tgstrip.ok{border-color:#16a34a}';
    document.head.appendChild(s); }
  function open(show) {
    css(); var p = $('tgPop'); if (!p) { p = document.createElement('div'); p.id = 'tgPop'; p.className = 'tgpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Tide gates'); p.innerHTML = '<button class="close" type="button" aria-label="Close the tide gates">×</button><h3>Tide gates</h3><div class="tgb"></div>'; (document.querySelector('.app>.chart') || document.body).appendChild(p); p.querySelector('.close').onclick = function () { open(false); }; p.hidden = true; }
    var on = show == null ? p.hidden : !!show; p.hidden = !on; var b = $('tgBtn'); if (b) b.setAttribute('aria-pressed', String(on)); var b2 = $('tgBtnData'); if (b2) b2.setAttribute('aria-pressed', String(on)); if (on) render();
  }
  /* the strip on the deck screen, and the alarm */
  var beeped = 0;
  /* the strip on the deck screen and the alarm, from the same route as the window (Stuart 24 Nov 13:22: "what does ETA refer to?" on
     'TIDE SLACK · turns 13:46 · ETA 04:35 · -3769 min': the old strip timed the leg at the speed made good, here 0.2 kn at home, so
     the ETA was a day away and the margin meaningless). Now: the tide on the leg to the next mark now, when it next turns, the ETA
     at the mark from the route, and the tide there on arrival */
  function stripData() {
    var d = window.__fsTgData ? window.__fsTgData() : null; if (!d || !d.legs.length) return null; var P = legsPlan(d); if (!P.legs.length) return null;
    var g = P.legs[0], now = Date.now(); if (g.eta < now || !(window.__fsTideAt && window.__fsTideAt(g.m.lat, g.m.lon, now / 1000))) return null;
    var B = bandsAt(g.m, g.bIn, now, Math.max(g.eta, now) + 6 * 3600000), cur = stAt(B, now), arr = stAt(B, g.eta), nx = cur && cur[1] < now + 6 * 3600000 ? stAt(B, cur[1] + 1) : null;
    return { g: g, cur: cur ? cur[2] : 'slack', turnAt: nx ? cur[1] : null, turnTo: nx ? nx[2] : null, arr: arr ? arr[2] : 'slack' };
  }
  function tick() {
    var deck = document.body.classList.contains('fsdeck'), st = $('tgStrip'); render();
    if (!deck && !C.alarm) { if (st) st.hidden = true; return; }
    var x = stripData(); if (!x) { if (st) st.hidden = true; return; }
    if (deck) { css(); if (!st) { st = document.createElement('div'); st.id = 'tgStrip'; st.className = 'tgstrip'; st.onclick = function () { open(true); }; (document.querySelector('.app>.chart') || document.body).appendChild(st); }
      st.hidden = false; st.className = 'tgstrip ' + (x.arr === 'foul' ? 'bad' : 'ok');
      st.textContent = 'TIDE ' + x.cur.toUpperCase() + (x.turnAt ? ' \u00b7 turns ' + x.turnTo + ' ' + hm(x.turnAt) : '') + ' \u00b7 ' + String(x.g.m.name).split(',')[0].toUpperCase() + ' ETA ' + dayHm(x.g.eta) + ' \u00b7 ' + x.arr.toUpperCase() + ' THERE';
      st.title = 'Tide along the leg to ' + x.g.m.name + ': ' + x.cur + ' now' + (x.turnAt ? ', turns ' + x.turnTo + ' at ' + hm(x.turnAt) : '') + '. You reach the mark at ' + dayHm(x.g.eta) + ' on your route; the tide there is ' + x.arr + '. Tap for the tide gates.';
      clearProg(); }
    else if (st) st.hidden = true;
    var closesIn = x.turnAt ? (x.turnAt - Date.now()) / 60000 : null;   /* the gate closes: fair now, foul by the time we arrive */
    if (C.alarm && x.cur === 'fair' && x.arr === 'foul' && closesIn != null && closesIn <= 15 && closesIn > 0 && Date.now() - beeped > 600000) { beeped = Date.now(); alarm('Tide gate closes in ' + Math.round(closesIn) + ' min: the tide to ' + x.g.m.name + ' turns before you get there (ETA ' + dayHm(x.g.eta) + ').'); }
  }
  function alarm(t) {
    try { if (window.NavToast) window.NavToast(t); else { var b = $('busy'); if (b) { b.textContent = t; b.hidden = false; setTimeout(function () { if (b.textContent === t) { b.textContent = ''; b.hidden = true; } }, 8000); } } } catch (e) {}
    try { var A = window.AudioContext || window.webkitAudioContext; if (A) { var ac = new A(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.value = 0.2; o.start(); setTimeout(function () { o.stop(); ac.close(); }, 600); } } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
  }
  function button() {
    if ($('tgBtn')) return true; var plotB = $('fsPlotBtn') || [].filter.call(document.querySelectorAll('button'), function (b) { return b.textContent.trim() === 'PLOT' && !b.closest('#deckNums'); })[0]; if (!plotB) return false;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tgBtn'; b.className = plotB.className.replace(/\brplotb\b/, '') + ' tgb'; b.textContent = 'TIDE'; b.title = 'Tide gate: will we beat the tide to the mark?'; b.setAttribute('aria-pressed', 'false'); b.onclick = function () { open(); };
    var after = $('fsDeckBtn') || plotB; after.parentNode.insertBefore(b, after.nextSibling); dataButton(); return true;
  }
  /* narrow phones (Stuart 23 Nov 07:00, "Fold TIDE into Data"): under 395 px wide the seven 44 px buttons leave no room for the plan
     clock, so TIDE moves to the top of the Data tab there; CSS shows one or the other */
  function dataButton() {
    var d = $('t-data'); if (!d || $('tgBtnData')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tgBtnData'; b.className = 'btn tgdata'; b.innerHTML = '<b>TIDE</b> Tide gate: will we beat the tide to the mark?'; b.setAttribute('aria-pressed', 'false'); b.onclick = function () { open(); };
    d.insertBefore(b, d.firstChild);
  }
  function clearProg() { var st = $('tgStrip'); if (!st || st.hidden) return; st.style.bottom = ''; var pg = $('prog'); if (pg && !pg.hidden && pg.getClientRects().length) { var a = pg.getBoundingClientRect(), b = st.getBoundingClientRect(); if (a.width && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) st.style.bottom = Math.round((parseFloat(getComputedStyle(st).bottom) || 0) + b.bottom - a.top + 6) + 'px'; } }   /* raised by the overlap, in the strip's own frame */
  /* the tide gate's own boat list (before 24 Nov) moves into the Fleet page once: one list of boats (Stuart 24 Nov 11:38) */
  function migrate() { if (!C.rivals.length || !window.__fsFleetAdd) return; C.rivals.forEach(function (q) { try { window.__fsFleetAdd(q.name, q.tcc); } catch (e) {} }); C.rivals = []; save(); }
  function init() { if (!button()) return setTimeout(init, 1000); setTimeout(migrate, 3000); FSBeat.set(tick, 30000); FSBeat.set(clearProg, 2000); }
  window.FSTideGate = { parseList: parseList, open: open, work: work, sail: sail, turn: turn, need: need, C: C, tick: tick, along: along };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 500);
})();
