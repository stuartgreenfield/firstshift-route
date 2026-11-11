/* FirstShift Route v0.4: the routing engine. Runs in the browser (Web Worker) and in Node for testing.
   Isochrone routing over a forecast pack: any wind model (or the mean of several), hourly tides,
   sea-state speed factor, depth safety, gates for marks, tack and gybe penalties. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.FSRouter = factory(); })(this, function () {
  'use strict';
  var R = Math.PI / 180, KN = 1852 / 3600;

  /* ---------- fields ---------- */
  function Field(L, bin) {
    var self = { L: L, ny: L.ny, nx: L.nx, hours: L.hours || [0] };
    function arr(d) { return d ? { a: new Int16Array(bin, d.off * 1, d.n), s: d.scale } : null; }
    var keys = ['u', 'v', 'hs', 'dir', 'tp', 'z'], A = {};
    keys.forEach(function (k) { if (L[k]) A[k] = arr(L[k]); });
    self.A = A;
    var plane = L.ny * L.nx;
    function cell(k, ti, y, x) {
      var o = A[k], q;
      if (L.druns) {            // depth outlines: typed runs per row (0 values, 1 land, 2 deep)
        var rr = L.druns[y]; if (!rr) return NaN;
        for (var i = 0; i < rr.length; i++) { var r = rr[i]; if (x >= r[0] && x <= r[1]) { if (r[3] === 1) return 1; if (r[3] === 2) return -99; q = o.a[r[2] + x - r[0]]; return q === -32768 ? NaN : q * o.s; } }
        return NaN;
      }
      if (L.rows) {             // course band: one run of cells per row
        var b = L.rows[y]; if (!b || x < b[0] || x > b[1]) return NaN;
        q = o.a[ti * L.plane + b[2] + x - b[0]]; return q === -32768 ? NaN : q * o.s;
      }
      q = o.a[ti * plane + y * L.nx + x]; return q === -32768 ? NaN : q * o.s;
    }
    self.idx = function (la, lo) {
      var fy = (la - L.lat0) / L.dlat, fx = (lo - L.lon0) / L.dlon;
      if (fy < 0 || fx < 0 || fy > L.ny - 1 || fx > L.nx - 1) return null;
      var y0 = Math.min(L.ny - 2, Math.floor(fy)), x0 = Math.min(L.nx - 2, Math.floor(fx));
      return [y0, x0, fy - y0, fx - x0];
    };
    self.tidx = function (t) {
      var h = self.hours, n = h.length;
      if (n === 1 || t <= h[0]) return [0, 0, 0];
      if (t >= h[n - 1]) return [n - 1, n - 1, 0];
      var lo = 0, hi = n - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (h[m] <= t) lo = m; else hi = m; }
      return [lo, hi, (t - h[lo]) / (h[hi] - h[lo])];
    };
    /* bilinear in space, linear in time; NaN corners are skipped (coastal cells) */
    self.sample = function (k, la, lo, t) {
      var I = self.idx(la, lo); if (!I) return NaN;
      var T = self.tidx(t), out = 0, wt = 0;
      for (var q = 0; q < 2; q++) {
        var ti = q ? T[1] : T[0], tw = q ? T[2] : 1 - T[2]; if (tw === 0) continue;
        var c = [[0, 0, (1 - I[2]) * (1 - I[3])], [0, 1, (1 - I[2]) * I[3]], [1, 0, I[2] * (1 - I[3])], [1, 1, I[2] * I[3]]];
        for (var j = 0; j < 4; j++) { var w = c[j][2] * tw; if (w <= 0) continue; var val = cell(k, ti, I[0] + c[j][0], I[1] + c[j][1]); if (val === val) { out += val * w; wt += w; } }
      }
      return wt > 0 ? out / wt : NaN;
    };
    /* directions must be averaged as vectors */
    self.sampleDir = function (la, lo, t) {
      var I = self.idx(la, lo); if (!I) return NaN;
      var T = self.tidx(t), sx = 0, sy = 0;
      for (var q = 0; q < 2; q++) {
        var ti = q ? T[1] : T[0], tw = q ? T[2] : 1 - T[2]; if (tw === 0) continue;
        [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (c) {
          var w = (c[0] ? I[2] : 1 - I[2]) * (c[1] ? I[3] : 1 - I[3]) * tw, d = cell('dir', ti, I[0] + c[0], I[1] + c[1]);
          if (w > 0 && d === d) { sx += Math.sin(d * R) * w; sy += Math.cos(d * R) * w; }
        });
      }
      return sx === 0 && sy === 0 ? NaN : (Math.atan2(sx, sy) / R + 360) % 360;
    };
    self.cellAt = cell;
    self.nearest = function (k, la, lo) { var I = self.idx(la, lo); if (!I) return NaN; return cell(k, 0, I[0] + (I[2] > 0.5 ? 1 : 0), I[1] + (I[3] > 0.5 ? 1 : 0)); };
    return self;
  }

  function addLayer(P, L, buf) { var f = Field(L, buf); if (L.kind === 'depth') P.depth = f; else P[L.kind][L.id] = f; return f; }
  function emptyPack() { return { wind: {}, tide: {}, wave: {}, depth: null }; }
  function loadPack(meta, bin) {
    var P = { meta: meta, wind: {}, tide: {}, wave: {}, depth: null };
    meta.layers.forEach(function (L) { var f = Field(L, bin); if (L.kind === 'depth') P.depth = f; else P[L.kind][L.id] = f; });
    return P;
  }

  /* wind sampler for one model or the mean of several; returns [tws kn, twd deg from] */
  function windSampler(P, ids) {
    var fs = ids.map(function (i) { return P.wind[i]; }).filter(Boolean), all = Object.keys(P.wind).map(function (k) { return P.wind[k]; });
    function live(f, t) { var h = f.hours; return !h || h.length < 2 || t <= h[h.length - 1] + 1; }
    return function (la, lo, t) {
      var u = 0, v = 0, n = 0, use = fs.filter(function (f) { return live(f, t); });
      if (!use.length) use = all.filter(function (f) { return live(f, t); });   /* hand-over: past a model's last hour, the other models carry on */
      for (var i = 0; i < use.length; i++) { var a = use[i].sample('u', la, lo, t), b = use[i].sample('v', la, lo, t); if (a === a && b === b) { u += a; v += b; n++; } }
      if (!n) {   /* outside this model's area (UKV, AROME): the other models carry on there too */
        for (var j = 0; j < all.length; j++) { if (!live(all[j], t)) continue; var a2 = all[j].sample('u', la, lo, t), b2 = all[j].sample('v', la, lo, t); if (a2 === a2 && b2 === b2) { u += a2; v += b2; n++; } }
      }
      if (!n) return [0, 0];
      u /= n; v /= n;
      return [Math.sqrt(u * u + v * v) / KN, (Math.atan2(-u, -v) / R + 360) % 360];
    };
  }
  /* user overrides when the forecast looks wrong: wind veer (deg, + = clockwise), strength (%), timing (h, + = later); tide strength (%), timing (h) */
  function adjust(smp, a) {
    if (!a) return smp;
    var w = smp.wind, c = smp.tide, d = a.wdir || 0, k = 1 + (a.wspd || 0) / 100, tw = a.wtime || 0, kc = 1 + (a.tspd || 0) / 100, tc = a.ttime || 0;
    if (d || k !== 1 || tw) smp.wind = function (la, lo, t) { var W = w(la, lo, t - tw); return [W[0] * k, (W[1] + d + 360) % 360]; };
    if (kc !== 1 || tc) smp.tide = function (la, lo, t) { var C = c(la, lo, t - tc); return [C[0] * kc, C[1] * kc]; };
    return smp;
  }
  function tideSampler(P, id) {
    var f = id && P.tide[id];
    return function (la, lo, t) { if (!f) return [0, 0]; var u = f.sample('u', la, lo, t), v = f.sample('v', la, lo, t); return [u === u ? u / KN : 0, v === v ? v / KN : 0]; };
  }
  function waveSampler(P, id) {
    var f = id && P.wave[id];
    return function (la, lo, t) { if (!f) return [0, NaN, NaN]; var h = f.sample('hs', la, lo, t); return [h === h ? h : 0, f.sampleDir(la, lo, t), f.sample('tp', la, lo, t)]; };
  }

  /* ---------- polar ---------- */
  function polarTable(pol, minTwa) {
    /* speeds at TWS 0..40 kn every 0.5 and TWA 0..180 every 1 degree */
    var T = new Float32Array(81 * 181), tws = pol.tws, twa = pol.twa, v = pol.v, a0 = minTwa || twa[0];
    function interp1(xs, x) { if (x <= xs[0]) return [0, 0]; if (x >= xs[xs.length - 1]) return [xs.length - 2, 1]; for (var i = 0; i < xs.length - 1; i++) if (x < xs[i + 1]) return [i, (x - xs[i]) / (xs[i + 1] - xs[i])]; }
    for (var wi = 0; wi <= 80; wi++) {
      var w = wi / 2, W = interp1(tws, Math.max(w, tws[0])), fade = w < tws[0] ? w / tws[0] : 1;
      for (var a = 0; a <= 180; a++) {
        if (a < a0) { T[wi * 181 + a] = 0; continue; }
        var A = interp1(twa, a), i = W[0], fi = W[1], j = A[0], fj = A[1];
        var g = function (ii, jj) { var x = v[ii] && v[ii][jj]; return x == null ? 0 : x; };
        T[wi * 181 + a] = fade * ((g(i, j) * (1 - fj) + g(i, j + 1) * fj) * (1 - fi) + (g(i + 1, j) * (1 - fj) + g(i + 1, j + 1) * fj) * fi);
      }
    }
    return function (tws, twa) {
      var a = Math.abs(twa); if (a > 180) a = 360 - a;
      var w = Math.min(80, Math.max(0, tws * 2)), wi = Math.min(79, Math.floor(w)), fw = w - wi, ai = Math.min(179, Math.floor(a)), fa = a - ai;
      var b = wi * 181 + ai;
      return (T[b] * (1 - fa) + T[b + 1] * fa) * (1 - fw) + (T[b + 181] * (1 - fa) + T[b + 182] * fa) * fw;
    };
  }
  function bestVmg(speed, tws, up) {
    var best = [0, 0, 0];
    for (var a = up ? 30 : 90; up ? a <= 90 : a <= 180; a++) { var s = speed(tws, a), m = s * Math.cos(a * R) * (up ? 1 : -1); if (m > best[2]) best = [a, s, m]; }
    return best; // [twa, bsp, vmg]
  }

  /* ---------- sea state ---------- */
  var SEA = { up: 4, reach: 1.5, surf: 3, from: 0.5, surfFrom: 1.5 };
  function seaFactor(hs, waveFrom, hdg, p) {
    p = p || SEA; if (!(hs > p.from) || waveFrom !== waveFrom) return 1;
    var rel = Math.abs(((hdg - waveFrom) % 360 + 540) % 360 - 180); // 0 = heading straight into the waves
    var ex = hs - p.from, f;
    if (rel <= 60) f = 1 - p.up / 100 * ex;
    else if (rel <= 90) { var k = (rel - 60) / 30; f = 1 - (p.up * (1 - k) + p.reach * k) / 100 * ex; }
    else if (rel <= 140) { var k2 = (rel - 90) / 50; f = 1 - p.reach * (1 - k2) / 100 * ex; }
    else { var k3 = Math.min(1, (rel - 140) / 30); f = 1 + k3 * p.surf / 100 * Math.min(1, Math.max(0, hs - p.surfFrom)); }
    return Math.max(0.5, Math.min(1.1, f));
  }

  /* ---------- geometry ---------- */
  function crosses(a1, a2, b1, b2) {
    function o(p, q, r) { return (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]); }
    var d1 = o(b1, b2, a1), d2 = o(b1, b2, a2), d3 = o(a1, a2, b1), d4 = o(a1, a2, b2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  function dist(la1, lo1, la2, lo2) { var k = Math.cos((la1 + la2) / 2 * R), dy = (la2 - la1) * 60, dx = (lo2 - lo1) * 60 * k; return Math.sqrt(dx * dx + dy * dy); }
  function brg(la1, lo1, la2, lo2) { var k = Math.cos((la1 + la2) / 2 * R); return (Math.atan2((lo2 - lo1) * k, la2 - la1) / R + 360) % 360; }

  /* mark as a gate: a short ray from the buoy on the side the boat must NOT pass.
     For a mark where the course turns, rounding to port means the ray points to the starboard (outside) of the turn. */
  function markGate(mark, prev, next, side, lenNm) {
    var bin = brg(prev.lat, prev.lon, mark.lat, mark.lon), bout = brg(mark.lat, mark.lon, next.lat, next.lon);
    var turn = ((bout - bin + 540) % 360) - 180;                // negative = turning to port (left)
    var inside = (bin + 180 + (((bout - (bin + 180)) % 360 + 360) % 360) / 2) % 360; // bisector of the two legs at the mark, pointing inside the turn
    if (Math.abs(turn) < 20) inside = (bin + (side === 'port' ? -90 : 90) + 360) % 360;
    // mark to port: boat keeps the buoy on its left, so the ray (no-go side) points to the boat's right of the mark... the inside of a left turn
    var leftTurn = turn < 0, ray;
    if (side === 'port') ray = leftTurn ? (inside + 180) % 360 : inside; else ray = leftTurn ? inside : (inside + 180) % 360;
    var L = (lenNm || 1.5) / 60, k = Math.cos(mark.lat * R);
    return { a: [mark.lat, mark.lon], b: [mark.lat + L * Math.cos(ray * R), mark.lon + L * Math.sin(ray * R) / k], ray: ray };
  }

  /* ---------- isochrone router ---------- */
  function route(o) {
    /* o: { start:{lat,lon,t}, legs:[{name, gate:{a,b}} | {name, point:[la,lo], r}], wind, tide, wave, speed, depth, safety (m),
            dt (s), hstep (deg), sectors, maxHours, tackS, gybeS, sea } */
    var dt0 = o.dt || 600, dt = dt0, hstep = o.hstep || 5, sectors = o.sectors || 360, maxSteps = Math.ceil((o.maxHours || 60) * 3600 / dt);
    var nh = Math.round(360 / hstep), H = [], sinH = [], cosH = [];
    for (var i = 0; i < nh; i++) { H.push(i * hstep); sinH.push(Math.sin(i * hstep * R)); cosH.push(Math.cos(i * hstep * R)); }
    var safety = o.safety || 0, depth = o.depth;
    /* no-go zones: traffic separation schemes and the sailing instructions' keep-out areas, each a ring of [lat, lon] */
    var nogo = (o.nogo || []).map(function (ring) { var b = [90, -90, 180, -180]; ring.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.max(b[1], q[0]); b[2] = Math.min(b[2], q[1]); b[3] = Math.max(b[3], q[1]); }); return { r: ring, b: b }; });
    function inside(ring, la, lo) { var c = false; for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) { var a = ring[i], q = ring[j]; if ((a[0] > la) !== (q[0] > la) && lo < (q[1] - a[1]) * (la - a[0]) / (q[0] - a[0]) + a[1]) c = !c; } return c; }
    function blocked(la, lo) { for (var i = 0; i < nogo.length; i++) { var b = nogo[i].b; if (la >= b[0] && la <= b[1] && lo >= b[2] && lo <= b[3] && inside(nogo[i].r, la, lo)) return true; } return false; }
    function wet(la, lo) { if (nogo.length && blocked(la, lo)) return false; if (!depth) return true; var z = depth.nearest('z', la, lo); return z === z && z <= -safety; }
    var pts = [{ la: o.start.lat, lo: o.start.lon, side: 0, par: -1 }], t = o.start.t, hist = [], arrivals = [];
    for (var li = 0; li < o.legs.length; li++) {
      var leg = o.legs[li]; dt = leg.dt || dt0; maxSteps = Math.ceil((o.maxHours || 60) * 3600 / dt); var far = leg.gate && dist(leg.gate.a[0], leg.gate.a[1], leg.gate.b[0], leg.gate.b[1]) > 2;   /* offshore rounding mark: aim at the mark itself */
      var tgt = leg.point || (far ? leg.gate.a : [(leg.gate.a[0] + leg.gate.b[0]) / 2, (leg.gate.a[1] + leg.gate.b[1]) / 2]);
      var oLa = 0, oLo = 0; pts.forEach(function (p) { oLa += p.la; oLo += p.lo; }); oLa /= pts.length; oLo /= pts.length;
      var kO = Math.cos(oLa * R), done = false;
      for (var step = 0; step < maxSteps; step++) {
        var cand = [], hit = [];
        for (var pi = 0; pi < pts.length; pi++) {
          var p = pts[pi], W = o.wind(p.la, p.lo, t), C = o.tide(p.la, p.lo, t), V = o.wave ? o.wave(p.la, p.lo, t) : [0, NaN];
          var tws = W[0], twd = W[1], kp = Math.cos(p.la * R);
          for (var hi = 0; hi < nh; hi++) {
            var twa = ((H[hi] - twd + 540) % 360) - 180, s = o.speed(tws, twa);
            if (s <= 0.05) continue;
            s *= seaFactor(V[0], V[1], H[hi], o.sea);
            var side = twa < 0 ? -1 : 1, lost = 0;
            if (p.side && side !== p.side) lost = Math.abs(twa) > 90 ? (o.gybeS || 0) : (o.tackS || 0);
            var run = Math.max(0, dt - lost) / 3600;
            var dn = (s * cosH[hi] * run + C[1] * dt / 3600), de = (s * sinH[hi] * run + C[0] * dt / 3600);
            var nla = p.la + dn / 60, nlo = p.lo + de / (60 * kp);
            if (!wet(nla, nlo) || !wet(p.la + dn / 120, p.lo + de / (120 * kp)) || !wet(p.la + dn / 240, p.lo + de / (240 * kp)) || !wet(p.la + 3 * dn / 240, p.lo + 3 * de / (240 * kp))) continue;
            var c = { la: nla, lo: nlo, par: pi, hdg: H[hi], tws: tws, twd: twd, twa: twa, bsp: s, cu: C[0], cv: C[1], hs: V[0], wd: V[1], side: side, tack: lost > 0 };
            var arrived = false;
            if (leg.gate) arrived = crosses([p.la, p.lo], [nla, nlo], leg.gate.a, leg.gate.b);
            else {
              var k = Math.cos(tgt[0] * R), ax = (p.lo - tgt[1]) * 60 * k, ay = (p.la - tgt[0]) * 60, bx = (nlo - tgt[1]) * 60 * k, by = (nla - tgt[0]) * 60;
              var dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy + 1e-12)));
              arrived = Math.hypot(ax + u * dx, ay + u * dy) <= (leg.r || 0.5);
            }
            if (arrived) hit.push(c); else cand.push(c);
          }
        }
        t += dt / 3600;
        if (hit.length) {
          hist.push({ pts: hit, t: t, leg: li }); arrivals.push({ name: leg.name, t: t });
          pts = hit.map(function (c, i) { return { la: c.la, lo: c.lo, side: c.side, par: i }; });
          done = true; break;
        }
        if (!cand.length) { var mla = 0, mlo = 0; pts.forEach(function (q) { mla += q.la; mlo += q.lo; }); var e = new Error('No way through on the leg to ' + leg.name + ' near ' + (mla / pts.length).toFixed(2) + ' N ' + (-mlo / pts.length).toFixed(2) + ' W after ' + Math.round(t - o.start.t) + ' h. Try a smaller safety depth.'); e.at = [mla / pts.length, mlo / pts.length, pts.length, step]; throw e; }
        // prune: best point in each bearing sector from the leg origin
        var best = new Array(sectors);
        for (var ci = 0; ci < cand.length; ci++) {
          var c2 = cand[ci], bx2 = (c2.lo - oLo) * kO, by2 = c2.la - oLa, b = (Math.atan2(bx2, by2) / R + 360) % 360;
          var sec = Math.min(sectors - 1, Math.floor(b / (360 / sectors)));
          var dtg = dist(c2.la, c2.lo, tgt[0], tgt[1]), dfo = Math.hypot(bx2, by2) * 60;
          var score = dfo - (far ? 0.6 : 0.15) * dtg - (c2.tack ? 0.01 : 0); score += leg.point || far ? 2 * Math.max(0, 25 - dtg) : 2 * Math.max(0, 8 - dtg);   // near the mark, reward closeness so the front is not pruned away from it
          c2.score = score;
          if (!best[sec] || score > best[sec].score) best[sec] = c2;
        }
        var keep = best.filter(Boolean);
        hist.push({ pts: keep, t: t, leg: li });
        pts = keep.map(function (c, i) { return { la: c.la, lo: c.lo, side: c.side, par: i }; });
      }
      if (!done) throw new Error('Did not reach ' + leg.name + ' within ' + (o.maxHours || 60) + ' hours.');
    }
    // backtrack from the arrival closest to the finish
    var path = [], k2 = 0, last = hist[hist.length - 1].pts;
    if (o.legs[o.legs.length - 1].point) { var f = o.legs[o.legs.length - 1].point, bd = 1e9; last.forEach(function (c, i) { var d = dist(c.la, c.lo, f[0], f[1]); if (d < bd) { bd = d; k2 = i; } }); }
    for (var hI = hist.length - 1; hI >= 0; hI--) {
      var c3 = hist[hI].pts[k2];
      path.push({ t: hist[hI].t, la: c3.la, lo: c3.lo, hdg: c3.hdg, tws: c3.tws, twd: c3.twd, twa: c3.twa, bsp: c3.bsp, cu: c3.cu, cv: c3.cv, hs: c3.hs, wd: c3.wd, leg: hist[hI].leg, tack: c3.tack });
      // parent index refers to the previous step's kept list
      k2 = c3.par;
    }
    path.reverse();
    path.unshift({ t: o.start.t, la: o.start.lat, lo: o.start.lon, leg: 0 });
    return { arrivals: arrivals, path: path, finish: arrivals.length ? arrivals[arrivals.length - 1].t : null };
  }

  /* Sail a fixed track through a different forecast: time on each piece from the best speed made good along it. */
  function sailTrack(path, o) {
    var t = path[0].t;
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], d = dist(a.la, a.lo, b.la, b.lo); if (d < 1e-4) continue;
      var bb = brg(a.la, a.lo, b.la, b.lo), W = o.wind(a.la, a.lo, t), C = o.tide(a.la, a.lo, t), V = o.wave ? o.wave(a.la, a.lo, t) : [0, NaN];
      var best = 0;
      for (var h = 0; h < 360; h += 5) {
        var twa = ((h - W[1] + 540) % 360) - 180, s = o.speed(W[0], twa) * seaFactor(V[0], V[1], h, o.sea), m = s * Math.cos((h - bb) * R);
        if (m > best) best = m;
      }
      var cur = C[0] * Math.sin(bb * R) + C[1] * Math.cos(bb * R), v = Math.max(0.3, best + cur);
      t += d / v;
    }
    return t;
  }

  function sailFor(row, crossover) {
    if (!crossover || row.twa == null) return '';
    var a = Math.abs(row.twa), w = row.tws;
    for (var i = 0; i < crossover.length; i++) { var c = crossover[i]; if (a >= c.a0 && a < c.a1 && w >= c.w0 && w < c.w1) return c.sail; }
    return '';
  }
  function parseCrossover(text) {
    var out = [];
    (text || '').split(/\r?\n/).forEach(function (l) {
      l = l.replace(/#.*/, '').trim(); if (!l) return;
      var p = l.split(/[,;\t]/).map(function (s) { return s.trim(); }); if (p.length < 5 || isNaN(+p[1])) return;
      out.push({ sail: p[0], a0: +p[1], a1: +p[2], w0: +p[3], w1: +p[4] });
    });
    return out;
  }

  return { Field: Field, loadPack: loadPack, addLayer: addLayer, emptyPack: emptyPack, windSampler: windSampler, tideSampler: tideSampler, adjust: adjust, waveSampler: waveSampler, polarTable: polarTable, bestVmg: bestVmg,
    seaFactor: seaFactor, SEA: SEA, route: route, sailTrack: sailTrack, markGate: markGate, dist: dist, brg: brg, sailFor: sailFor, parseCrossover: parseCrossover };
});
