/* FirstShift Polar engine. No dependencies, runs in a browser, a phone app shell or Node.
   Turns a stream of instrument samples into a season-long polar.
   Sample: { t: seconds, bsp, twa (signed, port negative), tws, awa?, aws?, hdg?, rpm?, sog? } */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FSPolar = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEF = {
    windowSec: 30,        // each accepted point is the average of this many seconds
    stepSec: 10,          // at most one accepted point every this many seconds
    settleSec: 60,        // ignore this long after a tack or gybe
    minCoverage: 0.7,     // share of the window that must hold samples
    maxTwaSd: 7,          // degrees, steadiness limits over the window
    maxTwsSd: 1.6,        // knots
    maxBspSd: 0.35,       // knots
    maxHdgSd: 8,          // degrees
    minTwa: 28,           // nothing sails closer; catches motoring head to wind
    minBsp: 0.8,
    minPoints: 12,        // accepted points before a cell counts as measured (2 minutes)
    binTws: 2, binTwa: 5, binBsp: 0.05,
    maxGapCells: 2,
    maxOverMedian: 1.25,  // readings further above the cell median are ignored (unflagged motoring, surfing bursts)
    minUnderMedian: 0.8,  // and further below it (a wrapped kite, a sail change, a hole): review finding 5, 14 Nov 2026
    maxGapSec: 5,         // no gap longer than this inside a window (review finding 4: the coverage test could never reject)
    maxBspCv: 0.05,       // boat speed steadiness also allowed up to 5% of the speed, so fast downwind sailing is not all thrown out (finding 14)
    gybeHdg: 10           // on a deep run (TWA 165 or more) a change of side with a heading change of more than this in 10 s is a gybe (finding 24)
  };
  var SEAS = ['flat', 'chop', 'moderate', 'big'];

  function opts(o) { var r = {}, k; for (k in DEF) r[k] = DEF[k]; for (k in (o || {})) r[k] = o[k]; return r; }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function norm180(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; }

  /* True wind from apparent wind and boat speed, ignoring leeway. AWA signed, port negative. */
  function trueWind(bsp, awa, aws) {
    var x = aws * Math.cos(rad(awa)) - bsp, y = aws * Math.sin(rad(awa));
    return { tws: Math.sqrt(x * x + y * y), twa: deg(Math.atan2(y, x)) };
  }

  /* ------------------------------------------------ store */
  function newStore() { return { v: 1, cells: {}, accepted: 0, seen: 0, rejected: {} }; }
  function cellKey(cond, sea, tws, twa) { return cond + '|' + sea + '|' + tws + '|' + twa; }
  function addTo(c, bspBin, tack, bsp) {
    c.n++; c.h[bspBin] = (c.h[bspBin] || 0) + 1;
    if (tack < 0) { c.pn++; c.ps += bsp; } else { c.sn++; c.ss += bsp; }
  }
  function mergeStores(a, b) {
    var k, out = JSON.parse(JSON.stringify(a));
    for (k in b.cells) {
      var src = b.cells[k], c = out.cells[k];
      if (!c) { out.cells[k] = JSON.parse(JSON.stringify(src)); continue; }
      c.n += src.n; c.pn += src.pn; c.sn += src.sn; c.ps += src.ps; c.ss += src.ss;
      for (var h in src.h) c.h[h] = (c.h[h] || 0) + src.h[h];
      if (src.d) { c.d = c.d || {}; for (var dd in src.d) c.d[dd] = (c.d[dd] || 0) + src.d[dd]; }
      if (src.f) c.f = c.f ? Math.min(c.f, src.f) : src.f; if (src.l) c.l = Math.max(c.l || 0, src.l);
    }
    out.accepted += b.accepted; out.seen += b.seen;
    for (k in b.rejected) out.rejected[k] = (out.rejected[k] || 0) + b.rejected[k];
    return out;
  }

  /* ------------------------------------------------ steady-state logger */
  function Logger(store, options) {
    this.o = opts(options); this.store = store || newStore();
    this.buf = []; this.lastTack = 0; this.lastSign = 0; this.lastAccept = -1e12;
    this.sea = 'flat'; this.cond = 'normal'; this.paused = false;
  }
  Logger.prototype.setTags = function (t) { if (t.sea) this.sea = t.sea; if (t.cond) this.cond = t.cond; if ('paused' in t) this.paused = t.paused; };
  Logger.prototype.reject = function (w) { this.store.rejected[w] = (this.store.rejected[w] || 0) + 1; return w; };
  Logger.prototype.add = function (s) {
    var o = this.o, S = this.store, i;
    if (!isNum(s.t) || !isNum(s.bsp)) return null;
    if ((!isNum(s.twa) || !isNum(s.tws)) && isNum(s.awa) && isNum(s.aws)) { var tw = trueWind(s.bsp, s.awa, s.aws); s.twa = tw.twa; s.tws = tw.tws; }
    if (!isNum(s.twa) || !isNum(s.tws)) return null;
    S.seen++;
    /* A sign change away from the dead run is a tack or gybe. */
    var sign = s.twa < 0 ? -1 : 1, a = Math.abs(s.twa);
    var dh = 0;
    if (isNum(s.hdg)) { var hb = this.hdgHist || (this.hdgHist = []); hb.push([s.t, s.hdg]); while (hb.length && hb[0][0] < s.t - 10) hb.shift(); dh = Math.abs(((s.hdg - hb[0][1]) % 360 + 540) % 360 - 180); }
    if (this.lastSign && sign !== this.lastSign && (a < 165 || dh > o.gybeHdg)) this.lastTack = s.t;
    if (a < 165 || !this.lastSign || dh > o.gybeHdg) this.lastSign = sign;
    this.buf.push(s);
    while (this.buf.length && this.buf[0].t < s.t - o.windowSec) this.buf.shift();
    if (s.t - this.lastAccept < o.stepSec) return null;
    var B = this.buf, n = B.length;
    if (n < 2 || B[n - 1].t - B[0].t < o.windowSec * 0.9) return null;
    this.lastAccept = s.t;
    if (this.paused) return this.reject('paused');
    for (i = 1; i < n; i++) if (B[i].t - B[i - 1].t > o.maxGapSec) return this.reject('gaps');
    if (s.t - this.lastTack < o.settleSec) return this.reject('manoeuvre');
    for (i = 0; i < n; i++) if (B[i].rpm > 300) return this.reject('engine');
    var sb = 0, sw = 0, sa = 0, qb = 0, qw = 0, qa = 0, hs = 0, hc = 0, hn = 0;
    for (i = 0; i < n; i++) {
      var A = Math.abs(B[i].twa);
      sb += B[i].bsp; sw += B[i].tws; sa += A; qb += B[i].bsp * B[i].bsp; qw += B[i].tws * B[i].tws; qa += A * A;
      if (isNum(B[i].hdg)) { hs += Math.sin(rad(B[i].hdg)); hc += Math.cos(rad(B[i].hdg)); hn++; }
    }
    var mb = sb / n, mw = sw / n, ma = sa / n;
    var sdb = Math.sqrt(Math.max(0, qb / n - mb * mb)), sdw = Math.sqrt(Math.max(0, qw / n - mw * mw)), sda = Math.sqrt(Math.max(0, qa / n - ma * ma));
    if (ma < o.minTwa) return this.reject('too close');
    if (mb < o.minBsp) return this.reject('too slow');
    if (sda > o.maxTwaSd) return this.reject('angle unsteady');
    if (sdw > o.maxTwsSd) return this.reject('wind unsteady');
    if (sdb > Math.max(o.maxBspSd, o.maxBspCv * mb)) return this.reject('speed unsteady');
    if (hn > 1) { var R = Math.min(1, Math.sqrt(hs * hs + hc * hc) / hn), sdh = deg(Math.sqrt(Math.max(0, -2 * Math.log(R || 1e-9)))); if (sdh > o.maxHdgSd) return this.reject('heading unsteady'); }
    var tb = Math.round(mw / o.binTws) * o.binTws, ab = Math.round(ma / o.binTwa) * o.binTwa, bb = Math.round(mb / o.binBsp);
    var key = cellKey(this.cond, this.sea, tb, ab), c = S.cells[key];
    if (!c) c = S.cells[key] = { n: 0, h: {}, pn: 0, ps: 0, sn: 0, ss: 0 };
    addTo(c, bb, sign, mb);
    if (!c.d) c.d = {}; var dy = new Date(s.t * 1000).toISOString().slice(0, 10); c.d[dy] = (c.d[dy] || 0) + 1;
    c.f = c.f ? Math.min(c.f, s.t) : s.t; c.l = Math.max(c.l || 0, s.t);
    S.accepted++;
    return 'accepted';
  };

  /* A log row that is already an average, such as a 30 second export. */
  Logger.prototype.addPoint = function (s, skip) {
    var o = this.o, S = this.store;
    if (!isNum(s.bsp) || !isNum(s.twa) || !isNum(s.tws)) return null;
    S.seen++;
    var a = Math.abs(s.twa);
    if (skip) return this.reject('marked in log');
    if (s.rpm > 300) return this.reject('engine');
    if (a < o.minTwa) return this.reject('too close');
    if (s.bsp < o.minBsp) return this.reject('too slow');
    var key = cellKey(this.cond, this.sea, Math.round(s.tws / o.binTws) * o.binTws, Math.round(a / o.binTwa) * o.binTwa), c = S.cells[key];
    if (!c) c = S.cells[key] = { n: 0, h: {}, pn: 0, ps: 0, sn: 0, ss: 0 };
    addTo(c, Math.round(s.bsp / o.binBsp), s.twa < 0 ? -1 : 1, s.bsp);
    S.accepted++;
    return 'accepted';
  };

  /* ------------------------------------------------ polar */
  function pct(h, n, p, binBsp, cap, floor) {
    var keys = Object.keys(h).map(Number).sort(function (a, b) { return a - b; }), run = 0, i2;
    if (cap) {
      var half = n / 2, med = keys[keys.length - 1];
      for (i2 = 0; i2 < keys.length; i2++) { run += h[keys[i2]]; if (run >= half) { med = keys[i2]; break; } }
      var lim = med * cap, low = med * (floor || 0), nk = keys.filter(function (b) { return b <= lim && b >= low; }), nn = 0;
      nk.forEach(function (b) { nn += h[b]; });
      keys = nk; n = nn; run = 0;
    }
    var target = p / 100 * n;
    for (var i = 0; i < keys.length; i++) {
      var c = h[keys[i]];
      if (run + c >= target) return (keys[i] - 0.5 + (c ? (target - run) / c : 0)) * binBsp;
      run += c;
    }
    return keys.length ? keys[keys.length - 1] * binBsp : null;
  }

  /* q: { sea:'all'|name or array, cond:'all'|name or array, percentile:90, options } */
  function polar(store, q) {
    q = q || {}; var o = opts(q.options), P = isNum(q.percentile) ? q.percentile : 90, merged = {}, k;
    function pick(v, sel) { return !sel || sel === 'all' || sel === v || (Array.isArray(sel) && sel.indexOf(v) >= 0); }
    for (k in store.cells) {
      var p = k.split('|');
      if (!pick(p[0], q.cond) || !pick(p[1], q.sea)) continue;
      var id = p[2] + '|' + p[3], m = merged[id], c = store.cells[k];
      if (!m) m = merged[id] = { n: 0, h: {}, d: {}, f: 0, l: 0 };
      m.n += c.n; for (var b in c.h) m.h[b] = (m.h[b] || 0) + c.h[b];
      for (var dd in (c.d || {})) m.d[dd] = 1; if (c.f) m.f = m.f ? Math.min(m.f, c.f) : c.f; if (c.l) m.l = Math.max(m.l, c.l);
    }
    var twsSet = {}, twaSet = {};
    Object.keys(merged).forEach(function (id) { var a = id.split('|'); twsSet[a[0]] = 1; twaSet[a[1]] = 1; });
    var tws = Object.keys(twsSet).map(Number).sort(function (a, b) { return a - b; });
    if (!tws.length) return { tws: [], twa: [], v: [], flag: [], mins: [], percentile: P };
    var twaMax = 180, twaMin = Math.min.apply(null, Object.keys(twaSet).map(Number)), twa = [], x;
    for (x = twaMin; x <= twaMax; x += o.binTwa) twa.push(x);
    var tmin = tws[0], tmax = tws[tws.length - 1]; tws = [];
    for (x = tmin; x <= tmax; x += o.binTws) tws.push(x);
    var v = [], flag = [], mins = [], days = [], span = [];
    tws.forEach(function (w) {
      var rv = [], rf = [], rm = [], rd = [], rs = [];
      twa.forEach(function (a) {
        var m = merged[w + '|' + a], ok = m && m.n >= o.minPoints;
        rv.push(ok ? pct(m.h, m.n, P, o.binBsp, o.maxOverMedian, o.minUnderMedian) : null);
        rf.push(ok ? 'm' : '');
        rm.push(m ? m.n * o.stepSec / 60 : 0);
        rd.push(m ? Object.keys(m.d).length : 0); rs.push(m && m.f ? (m.l - m.f) / 3600 : 0);
      });
      v.push(rv); flag.push(rf); mins.push(rm); days.push(rd); span.push(rs);
    });
    fillGaps(v, flag, o.maxGapCells);
    if (q.smooth !== false) v = v.map(function (r) { return r.map(function (x, j) { return x != null && j > 0 && j < r.length - 1 && r[j - 1] != null && r[j + 1] != null ? (r[j - 1] + 2 * x + r[j + 1]) / 4 : x; }); });
    return { tws: tws, twa: twa, v: v, flag: flag, mins: mins, days: days, span: span, percentile: P };
  }

  /* Fill only between measured neighbours, never beyond them. */
  function fillGaps(v, flag, maxGap) {
    var i, j, R = v.length, C = R ? v[0].length : 0;
    function span(get, set, len) {
      var last = -1, q;
      for (q = 0; q < len; q++) {
        if (get(q) == null) continue;
        if (last >= 0 && q - last > 1 && q - last - 1 <= maxGap) {
          for (var z = last + 1; z < q; z++) set(z, get(last) + (get(q) - get(last)) * (z - last) / (q - last));
        }
        last = q;
      }
    }
    for (i = 0; i < R; i++) (function (r) { span(function (q) { return v[r][q]; }, function (q, val) { v[r][q] = val; flag[r][q] = 'f'; }, C); })(i);
    for (j = 0; j < C; j++) (function (c) { span(function (q) { return v[q][c]; }, function (q, val) { v[q][c] = val; flag[q][c] = 'f'; }, R); })(j);
  }

  function interp(xs, ys, x) {
    var pts = [], i;
    for (i = 0; i < xs.length; i++) if (ys[i] != null) pts.push([xs[i], ys[i]]);
    if (!pts.length || x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
    for (i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) { var a = pts[i], b = pts[i + 1]; return b[0] === a[0] ? a[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return pts[pts.length - 1][1];
  }

  /* Interpolate onto another grid. Anything outside measured data stays blank. */
  function resample(pol, outTws, outTwa) {
    return outTws.map(function (w) {
      return outTwa.map(function (a) { return interp(pol.tws, pol.v.map(function (r) { return interp(pol.twa, r, a); }), w); });
    });
  }

  function rowAt(pol, w) { return pol.twa.map(function (a) { return interp(pol.tws, pol.v.map(function (r) { return interp(pol.twa, r, a); }), w); }); }
  function bestVmg(twa, speeds, upwind) {
    var lo = upwind ? 28 : 90, hi = upwind ? 90 : 180, best = -1e9, res = null;
    var known = twa.filter(function (x, i) { return speeds[i] != null; });
    if (!known.length || (upwind ? known[0] > 50 : known[known.length - 1] < 155)) return null; /* the best angle lies outside the data */
    for (var a = lo; a <= hi; a += 1) {
      var s = interp(twa, speeds, a);
      if (s == null) continue;
      var vm = s * Math.cos(rad(a)); if (!upwind) vm = -vm;
      if (vm > best) { best = vm; res = { angle: a, bsp: s, vmg: vm }; }
    }
    return res;
  }

  /* Compare a polar with a reference. Scale is applied to the reference, for example your TCC over its TCC. */
  function compare(pol, ref, scale) {
    scale = isNum(scale) && scale > 0 ? scale : 1;
    var rv = resample(ref, pol.tws, pol.twa).map(function (r) { return r.map(function (x) { return x == null ? null : x * scale; }); }), d = [], pct = [], sum = 0, n = 0, best = null, worst = null;
    pol.tws.forEach(function (w, i) {
      var dr = [], pr = [];
      pol.twa.forEach(function (a, j) {
        var m = pol.v[i][j], x = rv[i][j];
        if (m == null || x == null || x <= 0) { dr.push(null); pr.push(null); return; }
        var de = m - x, pe = 100 * de / x; dr.push(de); pr.push(pe);
        if (pol.flag[i][j] === 'm' && w >= 4) { sum += pe; n++; if (!best || pe > best.pct) best = { tws: w, twa: a, pct: pe }; if (!worst || pe < worst.pct) worst = { tws: w, twa: a, pct: pe }; }
      });
      d.push(dr); pct.push(pr);
    });
    return { ref: rv, diff: d, pct: pct, meanPct: n ? sum / n : null, cells: n, best: best, worst: worst, scale: scale };
  }

  /* A rough starting polar from an IRC rating: FirstShift's generic shape, scaled in proportion to TCC.
     Time on time means a boat rated r is expected to be r times as fast as a boat rated 1.000. */
  function genericShape(w, a) {
    var C = [[30, 0], [35, .62], [40, .74], [45, .82], [52, .88], [60, .93], [75, .985], [90, 1], [110, 1.02], [120, 1], [135, .95], [150, .87], [165, .79], [180, .75]], s = 0, i;
    for (i = 0; i < C.length - 1; i++) if (a <= C[i + 1][0]) { s = C[i][1] + (C[i + 1][1] - C[i][1]) * (a - C[i][0]) / (C[i + 1][0] - C[i][0]); break; }
    var d = w < 10 ? (10 - w) / 10 : 0, li = a >= 150 ? 1 - .22 * d : a <= 45 ? 1 - .12 * d : 1 - .04 * d;
    return 8.6 * (1 - Math.exp(-w / 9.5)) * s * li;
  }
  function startFromTcc(tcc) {
    var tws = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], twa = [];
    for (var a = 35; a <= 180; a += 5) twa.push(a);
    return { name: 'FirstShift generic polar for TCC ' + tcc.toFixed(3), tws: tws, twa: twa, v: tws.map(function (w) { return twa.map(function (x) { return genericShape(w, x) * 1.2 * tcc; }); }) };
  }

  /* Combine a starting polar with logged data. Each cell moves from the start to the measured value as steady minutes build.
     The start is first scaled to the level this boat has shown. Flags: m measured, f filled, b blended, s start. */
  function blend(pol, start, q) {
    q = q || {};
    var full = q.fullMins || 20, tws = pol.tws.slice(), twa = pol.twa.slice(), add = function (arr, list) { list.forEach(function (x) { if (arr.indexOf(x) < 0) arr.push(x); }); arr.sort(function (a, b) { return a - b; }); };
    add(tws, start.tws.filter(function (w) { return w % 2 === 0 && w >= 4 && w <= 40; })); add(twa, start.twa.filter(function (a) { return a >= 35 && a % 5 === 0; }));
    if (!tws.length || !twa.length) return pol;
    var measured = function (w, a) { var i = pol.tws.indexOf(w), j = pol.twa.indexOf(a); return i < 0 || j < 0 ? null : { v: pol.v[i][j], f: pol.flag[i][j], m: pol.mins[i][j] }; };
    var S = resample(start, tws, twa), ratios = [];
    tws.forEach(function (w, i) { twa.forEach(function (a, j) { var c = measured(w, a); if (c && c.v != null && c.f === 'm' && c.m >= 5 && S[i][j] > 0) ratios.push(c.v / S[i][j]); }); });
    var level = ratios.length >= 8 ? Math.max(0.8, Math.min(1.2, median(ratios))) : 1, v = [], flag = [], mins = [], st = { m: 0, b: 0, s: 0, f: 0 };
    tws.forEach(function (w, i) {
      var rv = [], rf = [], rm = [];
      twa.forEach(function (a, j) {
        var c = measured(w, a), s0 = S[i][j] != null ? S[i][j] * level : null, has = c && c.v != null, x = null, fl = '', mi = c ? c.m : 0;
        if (has && s0 != null) { var wgt = c.f === 'f' ? 0.5 : Math.min(1, c.m / full); x = wgt * c.v + (1 - wgt) * s0; fl = wgt >= 1 ? 'm' : 'b'; }
        else if (has) { x = c.v; fl = c.f; }
        else if (s0 != null) { x = s0; fl = 's'; }
        if (fl) st[fl]++;
        rv.push(x); rf.push(fl); rm.push(mi);
      });
      v.push(rv); flag.push(rf); mins.push(rm);
    });
    return { tws: tws, twa: twa, v: v, flag: flag, mins: mins, percentile: pol.percentile, level: level, counts: st, startName: start.name };
  }

  /* Live targets at the present wind. */
  function targets(pol, tws, twa) {
    var row = rowAt(pol, tws), A = Math.abs(twa), out = { upwind: bestVmg(pol.twa, row, true), downwind: bestVmg(pol.twa, row, false), targetBsp: null };
    out.targetBsp = isNum(twa) ? interp(pol.twa, row, A) : null;
    return out;
  }
  function pctOfPolar(pol, tws, twa, bsp) { var t = targets(pol, tws, twa).targetBsp; return t ? 100 * bsp / t : null; }

  /* Vane offset estimate: the shift in angle that best aligns port and starboard speed curves. */
  function calibration(store, options) {
    var o = opts(options), by = {}, k;
    for (k in store.cells) {
      var p = k.split('|'), c = store.cells[k], w = +p[2], a = +p[3];
      if (a > 75) continue;
      if (!by[w]) by[w] = { port: {}, stbd: {} };
      if (c.pn >= 6) by[w].port[a] = c.ps / c.pn; if (c.sn >= 6) by[w].stbd[a] = c.ss / c.sn;
    }
    var best = null;
    for (var d = -8; d <= 8.001; d += 0.5) {
      var err = 0, n = 0;
      for (var W in by) {
        var P = by[W].port, S = by[W].stbd, ax = Object.keys(P).map(Number).sort(function (x, y) { return x - y; }), sx = Object.keys(S).map(Number).sort(function (x, y) { return x - y; });
        if (ax.length < 3 || sx.length < 3) continue;
        for (var a0 = 35; a0 <= 70; a0 += 5) {
          var pv = interp(ax, ax.map(function (q) { return P[q]; }), a0 - d), sv = interp(sx, sx.map(function (q) { return S[q]; }), a0 + d);
          if (pv != null && sv != null) { err += (pv - sv) * (pv - sv); n++; }
        }
      }
      if (n >= 6 && (!best || err / n < best.err)) best = { err: err / n, offset: d, n: n };
    }
    if (!best) return { offsetDeg: null, note: 'Not enough upwind sailing on both tacks yet.' };
    return { offsetDeg: best.offset, comparisons: best.n, warn: Math.abs(best.offset) >= 1.5,
      note: Math.abs(best.offset) >= 1.5 ? 'Port and starboard do not match. Check wind vane alignment.' : 'Port and starboard agree.' };
  }

  /* Start-up check on the last few seconds or minutes of samples. */
  function startupCheck(samples) {
    var need = { bsp: 'Boat speed through water', awaOrTwa: 'Wind angle', awsOrTws: 'Wind speed', hdg: 'Heading' }, seen = {}, res = [], i;
    samples.forEach(function (s) {
      if (isNum(s.bsp)) seen.bsp = (seen.bsp || []).concat(s.bsp);
      if (isNum(s.awa) || isNum(s.twa)) seen.awaOrTwa = (seen.awaOrTwa || []).concat(isNum(s.awa) ? s.awa : s.twa);
      if (isNum(s.aws) || isNum(s.tws)) seen.awsOrTws = (seen.awsOrTws || []).concat(isNum(s.aws) ? s.aws : s.tws);
      if (isNum(s.hdg)) seen.hdg = (seen.hdg || []).concat(s.hdg);
    });
    Object.keys(need).forEach(function (k) {
      var a = seen[k];
      if (!a) { res.push({ item: need[k], status: k === 'hdg' ? 'warn' : 'fail', note: 'No data received.' }); return; }
      var distinct = {}; a.forEach(function (x) { distinct[x] = 1; });
      if (Object.keys(distinct).length < 2 && a.length > 5) res.push({ item: need[k], status: 'warn', note: 'Value is not changing.' });
      else res.push({ item: need[k], status: 'ok', note: a.length + ' readings.' });
    });
    var gapBoth = samples.filter(function (s) { return isNum(s.tws) && isNum(s.aws) && isNum(s.bsp) && isNum(s.awa); });
    if (gapBoth.length) {
      var e = 0; for (i = 0; i < gapBoth.length; i++) e += Math.abs(trueWind(gapBoth[i].bsp, gapBoth[i].awa, gapBoth[i].aws).tws - gapBoth[i].tws);
      e /= gapBoth.length;
      res.push({ item: 'True wind agrees with apparent', status: e > 2 ? 'warn' : 'ok', note: 'Average difference ' + e.toFixed(1) + ' knots.' });
    }
    return { ok: !res.some(function (r) { return r.status === 'fail'; }), items: res };
  }

  /* ------------------------------------------------ NMEA 0183 */
  function NmeaReader() { this.st = {}; this.base = null; }
  function checksumOk(line) {
    var i = line.indexOf('*'); if (i < 0) return true;
    var x = 0; for (var j = 1; j < i; j++) x ^= line.charCodeAt(j);
    return x === parseInt(line.slice(i + 1, i + 3), 16);
  }
  /* Feed one sentence; returns a full sample when a boat speed or wind update completes one. tOverride in seconds. */
  NmeaReader.prototype.line = function (line, tOverride) {
    line = String(line).trim();
    if (line[0] !== '$' || !checksumOk(line)) return null;
    var f = line.replace(/\*.*$/, '').split(','), id = f[0].slice(3), st = this.st, num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : null; };
    if (id === 'VHW') { var kn = num(f[5]); if (kn != null) st.bsp = kn; }
    else if (id === 'MWV' && f[5] === 'A') {
      var ang = num(f[1]), spd = num(f[3]); if (ang == null || spd == null) return null;
      if (f[4] === 'M') spd *= 1.94384; if (f[4] === 'K') spd *= 0.539957;
      ang = norm180(ang);
      if (f[2] === 'R') { st.awa = ang; st.aws = spd; } else if (f[2] === 'T') { st.twa = ang; st.tws = spd; }
    }
    else if (id === 'HDT' || id === 'HDG' || id === 'HDM') { var h = num(f[1]); if (h != null) st.hdg = h; }
    else if (id === 'RMC') { var so = num(f[7]); if (so != null) st.sog = so; }
    else if (id === 'RPM') { var r = num(f[3]); if (r != null) st.rpm = r; }
    else return null;
    if (id !== 'MWV') return null;
    if (!isNum(st.bsp)) return null;
    var hasT = isNum(st.twa) && isNum(st.tws), hasA = isNum(st.awa) && isNum(st.aws);
    if (!hasT && !hasA) return null;
    var t = tOverride != null ? tOverride : Date.now() / 1000;
    if (this.lastT === t) return null;
    this.lastT = t;
    return { t: t, bsp: st.bsp, twa: st.twa, tws: st.tws, awa: st.awa, aws: st.aws, hdg: st.hdg, rpm: st.rpm, sog: st.sog };
  };

  /* ------------------------------------------------ log files */
  var COLS = { bsp: /^(bsp|boatspeed|boatspd|stw|speedthroughwater|speedwater|speed)$/, twa: /^twa/, tws: /^tws/, awa: /^awa/, aws: /^aws/, hdg: /^(hdg|heading|hdt|hdm)/, rpm: /rpm/, sog: /^sog/,
    time: /^(timestamp|datetime|utc|time|date)/, racing: /^racing/, man: /^manoeuvre|^maneuver/ };
  function splitRow(l, d) { return l.split(d).map(function (x) { return x.replace(/^"|"$/g, '').trim(); }); }
  function parseTime(v) { if (v === '' || v == null) return null; var n = Number(v); if (isFinite(n)) return n > 20000 && n < 80000 ? n * 86400 : n; var d = Date.parse(String(v).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? '' : 'Z')); return isFinite(d) ? d / 1000 : null; }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }

  /* Reads NMEA 0183 text or a CSV instrument log into a Logger. */
  function readLog(text, logger, onFirst) {
    var lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/), out = { format: null, samples: 0, hours: 0, warnings: [] }, first = [], i, tMin = null, tMax = null;
    function seen(s) { if (first.length < 400) first.push(Object.assign({}, s)); if (tMin == null || s.t < tMin) tMin = s.t; if (tMax == null || s.t > tMax) tMax = s.t; out.samples++; }
    var nmea = 0; for (i = 0; i < Math.min(lines.length, 200); i++) if (lines[i].indexOf('$') >= 0 && /\$[A-Z]{5},/.test(lines[i])) nmea++;
    if (nmea >= 3) {
      out.format = 'NMEA 0183';
      var R = new NmeaReader(), rmcT = null, cnt = 0, hadRmc = false;
      for (i = 0; i < lines.length; i++) {
        var at = lines[i].indexOf('$'); if (at < 0) continue;
        var ln = lines[i].slice(at).trim();
        if (/^\$..RMC,/.test(ln) && checksumOk(ln)) {
          var f = ln.split(','), h = f[1], dd = f[9];
          if (h && h.length >= 6 && dd && dd.length === 6) { rmcT = Date.UTC(2000 + (+dd.slice(4, 6)), +dd.slice(2, 4) - 1, +dd.slice(0, 2), +h.slice(0, 2), +h.slice(2, 4), +h.slice(4)) / 1000; hadRmc = true; }
        }
        var isWind = /^\$..MWV,/.test(ln);
        if (isWind) cnt++;
        var s = R.line(ln, hadRmc ? rmcT : cnt);
        if (s) { seen(s); logger.add(s); }
      }
      if (!hadRmc) out.warnings.push('No GPS times in this log, so one wind reading per second was assumed.');
    } else {
      var hi = -1, map = null, delim = ',';
      for (i = 0; i < Math.min(lines.length, 30) && hi < 0; i++) {
        var d = lines[i].indexOf('\t') >= 0 ? '\t' : lines[i].indexOf(';') >= 0 ? ';' : ',', cells = splitRow(lines[i], d).map(function (x) { return x.toLowerCase().replace(/^!/, '').replace(/[^a-z0-9]/g, ''); }), m = {};
        for (var k in COLS) m[k] = cells.findIndex(function (c) { return COLS[k].test(c); });
        if (m.bsp >= 0 && (m.twa >= 0 || m.awa >= 0)) { hi = i; map = m; delim = d; }
      }
      if (hi < 0) { out.error = 'This file has no boat speed and wind columns that could be recognised.'; return out; }
      out.format = 'CSV log';
      var rows = [], last = {};
      for (i = hi + 1; i < lines.length; i++) {
        if (!lines[i].trim() || lines[i][0] === '!') continue;
        var c = splitRow(lines[i], delim), val = function (key) { if (map[key] < 0) return undefined; var v = parseFloat(String(c[map[key]]).replace(',', '.')); if (isFinite(v)) last[key] = v; return last[key]; };
        var row = { t: map.time >= 0 ? parseTime(c[map.time]) : i - hi, bsp: val('bsp'), twa: val('twa'), tws: val('tws'), awa: val('awa'), aws: val('aws'), hdg: val('hdg'), rpm: val('rpm'), sog: val('sog') };
        if (isNum(row.twa)) row.twa = norm180(row.twa); if (isNum(row.awa)) row.awa = norm180(row.awa);
        if ((!isNum(row.twa) || !isNum(row.tws)) && isNum(row.awa) && isNum(row.aws) && isNum(row.bsp)) { var tw2 = trueWind(row.bsp, row.awa, row.aws); row.twa = tw2.twa; row.tws = tw2.tws; }
        if (!isNum(row.t) || !isNum(row.bsp) || !isNum(row.twa) || !isNum(row.tws)) continue;
        row._skip = (map.racing >= 0 && /^f/i.test(c[map.racing])) || (map.man >= 0 && /^t/i.test(c[map.man]));
        rows.push(row);
      }
      if (!rows.length) { out.error = 'No usable rows found in this file.'; return out; }
      var gaps = []; for (i = 1; i < Math.min(rows.length, 2000); i++) gaps.push(rows[i].t - rows[i - 1].t);
      var coarse = gaps.length && median(gaps) >= 8;
      if (coarse) out.warnings.push('Each row is ' + Math.round(median(gaps)) + ' seconds apart, so steadiness could not be checked. Treat this polar with care.');
      rows.forEach(function (r) { seen(r); if (coarse) logger.addPoint(r, r._skip); else if (!r._skip) logger.add(r); });
    }
    out.hours = tMax != null ? (tMax - tMin) / 3600 : 0;
    out.check = startupCheck(first);
    return out;
  }

  /* Reads a starting polar: Expedition style lines, or a grid with wind speeds along the top or down the side. */
  function parsePolar(text) {
    var L = String(text).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x[0] !== '!' && !/^pol/i.test(x); });
    if (!L.length) return null;
    var d = L[0].indexOf('\t') >= 0 ? '\t' : L[0].indexOf(';') >= 0 ? ';' : L[0].indexOf(',') >= 0 ? ',' : /\s+/;
    var rows = L.map(function (l) { return l.split(d).map(function (x) { return x.trim(); }); }), angles = {}, curves = {};
    var isExp = !isNaN(parseFloat(rows[0][0])) && rows[0].length % 2 === 1 && rows.every(function (r) { return r.length >= 7 && r.length % 2 === 1; });
    if (isExp) rows.forEach(function (r) { var w = +r[0]; curves[w] = {}; for (var i = 1; i < r.length; i += 2) { curves[w][+r[i]] = +r[i + 1]; angles[+r[i]] = 1; } });
    else {
      var h = rows[0].slice(1).map(function (x) { return parseFloat(x); }).filter(isFinite), big = Math.max.apply(null, h) > 60;
      rows.slice(1).forEach(function (r) {
        var key = parseFloat(r[0]); if (!isFinite(key)) return;
        h.forEach(function (x, i) { var v = parseFloat(r[i + 1]); if (!isFinite(v)) return; var w = big ? key : x, a = big ? x : key; (curves[w] = curves[w] || {})[a] = v; angles[a] = 1; });
      });
    }
    var tws = Object.keys(curves).map(Number).sort(function (a, b) { return a - b; }), twa = Object.keys(angles).map(Number).filter(function (a) { return a > 0; }).sort(function (a, b) { return a - b; });
    if (tws.length < 2 || twa.length < 3) return null;
    return { tws: tws, twa: twa, v: tws.map(function (w) { return twa.map(function (a) { return curves[w][a] != null ? curves[w][a] : null; }); }) };
  }

  /* ------------------------------------------------ exports */
  var H5000_TWA = []; for (var q5 = 20; q5 <= 180; q5 += 10) H5000_TWA.push(q5);
  var H5000_TWS = [4, 6, 8, 10, 12, 14, 16, 20, 25, 30];
  function f2(x) { return x.toFixed(2); }
  function g(x) { return String(+x.toFixed(1)); }

  function toExpedition(pol, name) {
    var L = ['!' + (name || 'FirstShift polar')], warn = [];
    pol.tws.forEach(function (w, i) {
      var sp = pol.v[i], m = {}, up = bestVmg(pol.twa, sp, true), dn = bestVmg(pol.twa, sp, false), count = 0;
      pol.twa.forEach(function (a, j) { if (sp[j] != null) { m[a] = sp[j]; count++; } });
      if (count < 3) { warn.push('Wind speed ' + w + ' skipped: too few angles.'); return; }
      if (up) m[up.angle] = up.bsp; if (dn) m[dn.angle] = dn.bsp;
      m[0] = 0;
      var cells = [w.toFixed(1)];
      Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).forEach(function (a) { cells.push(g(a), f2(m[a])); });
      L.push(cells.join('\t'));
    });
    return { text: L.join('\n') + '\n', warnings: warn, ext: 'pol' };
  }

  function toH5000(pol, seed) {
    var grid = resample(pol, H5000_TWS, H5000_TWA), head = ['TWS'].concat(H5000_TWA.map(String), ['Upwind VMG', 'Upwind Angle', 'Downwind VMG', 'Downwind Angle']), L = [head.join(',')], warn = [], blanks = 0, total = 0;
    var seedGrid = seed ? resample(seed, H5000_TWS, H5000_TWA) : null;
    H5000_TWS.forEach(function (w, i) {
      var row = grid[i].map(function (v, j) { total++; if (v != null) return v; if (H5000_TWA[j] <= 30) return 0; blanks++; return seedGrid && seedGrid[i][j] != null ? seedGrid[i][j] : null; });
      var up = bestVmg(H5000_TWA, row, true), dn = bestVmg(H5000_TWA, row, false);
      L.push([w].concat(row.map(function (v) { return f2(v == null ? 0 : v); }), [up ? f2(up.vmg) : '0.00', up ? up.angle : 0, dn ? f2(dn.vmg) : '0.00', dn ? dn.angle : 0]).join(','));
    });
    if (blanks) warn.push(blanks + ' of ' + total + ' cells have no measured data' + (seed ? ' and use the starting polar where it has a value.' : ' and are written as zero. Add a starting polar, or do not load this file yet.'));
    warn.push('Check the grid against your own H5000 manual before loading.');
    return { text: L.join('\n') + '\n', warnings: warn, ext: 'csv' };
  }

  /* Wind speeds along the top, angles down the side. */
  function toGrid(pol, sep, corner) {
    var keep = pol.tws.map(function (w, i) { return pol.v[i].some(function (x) { return x != null; }) ? i : -1; }).filter(function (i) { return i >= 0; });
    var L = [[corner].concat(keep.map(function (i) { return pol.tws[i]; })).join(sep)];
    pol.twa.forEach(function (a, j) { if (!keep.some(function (i) { return pol.v[i][j] != null; })) return; L.push([a].concat(keep.map(function (i) { var v = pol.v[i][j]; return v == null ? '' : f2(v); })).join(sep)); });
    return L.join('\n') + '\n';
  }

  function usedRows(p) { var keep = p.tws.map(function (w, i) { return p.v[i].some(function (x) { return x != null; }) ? i : -1; }).filter(function (i) { return i >= 0; }); return { keep: keep, ang: p.twa.map(function (a, j) { return keep.some(function (i) { return p.v[i][j] != null; }) ? j : -1; }).filter(function (j) { return j >= 0; }) }; }
  function blanks(p) { var u = usedRows(p), n = 0; u.keep.forEach(function (i) { u.ang.forEach(function (j) { if (p.v[i][j] == null) n++; }); }); return n ? [n + ' cells are empty. Add a starting polar or more logs for a complete file.'] : []; }
  /* Tab separated, angles down the side, wind along the top, with 0 degree and 0 knot lines. */
  function tabGrid(p) {
    var u = usedRows(p), L = [['TWA\\TWS', 0].concat(u.keep.map(function (i) { return p.tws[i]; })).join('\t'), [0, 0].concat(u.keep.map(function () { return 0; })).join('\t')];
    u.ang.forEach(function (j) { L.push([p.twa[j], 0].concat(u.keep.map(function (i) { var v = p.v[i][j]; return v == null ? '' : f2(v); })).join('\t')); });
    return L.join('\n') + '\n';
  }
  /* PredictWind .pol needs a blank first cell, spaces, and a value in every cell, so incomplete lines are removed. */
  function toPredictWind(p) {
    var u = usedRows(p), R = u.keep.slice(), A = u.ang.slice(), removed = 0, miss = function (i, j) { return p.v[i][j] == null; };
    for (;;) {
      var worst = 0, kind = null, at = -1;
      R.forEach(function (i, x) { var n = A.filter(function (j) { return miss(i, j); }).length / Math.max(1, A.length); if (n > worst) { worst = n; kind = 'r'; at = x; } });
      A.forEach(function (j, x) { var n = R.filter(function (i) { return miss(i, j); }).length / Math.max(1, R.length); if (n > worst) { worst = n; kind = 'a'; at = x; } });
      if (!kind) break;
      if (kind === 'r') R.splice(at, 1); else A.splice(at, 1);
      removed++;
    }
    if (R.length < 2 || A.length < 3) return { text: '', warnings: ['Not enough complete data for PredictWind, which needs a value in every cell. Add a starting polar.'], ext: 'pol' };
    var L = [[''].concat(R.map(function (i) { return p.tws[i]; })).join(' ')];
    A.forEach(function (j) { L.push([p.twa[j]].concat(R.map(function (i) { return f2(p.v[i][j]); })).join(' ')); });
    return { text: L.join('\n') + '\n', warnings: removed ? [removed + ' incomplete wind speeds or angles were left out, because PredictWind needs a value in every cell.'] : [], ext: 'pol' };
  }

  return {
    defaults: DEF, seaStates: SEAS, newStore: newStore, mergeStores: mergeStores, Logger: Logger, polar: polar, resample: resample,
    targets: targets, pctOfPolar: pctOfPolar, calibration: calibration, startupCheck: startupCheck, trueWind: trueWind, NmeaReader: NmeaReader,
    readLog: readLog, parsePolar: parsePolar, compare: compare, startFromTcc: startFromTcc, blend: blend,
    toExpedition: toExpedition, toH5000: toH5000,
    toQtVlm: function (p) { return { text: toGrid(p, ';', 'TWA\\TWS'), warnings: blanks(p), ext: 'csv' }; },
    toOpenCPN: function (p) { return { text: toGrid(p, ';', 'twa/tws'), warnings: blanks(p), ext: 'pol' }; },
    toAdrena: function (p) { return { text: tabGrid(p), warnings: blanks(p).concat(['Layout from published descriptions of the shared .pol format. Test with a real Adrena import.']), ext: 'pol' }; },
    toSailGrib: function (p) { return { text: tabGrid(p), warnings: blanks(p), ext: 'pol' }; },
    toPredictWind: toPredictWind
  };
});
