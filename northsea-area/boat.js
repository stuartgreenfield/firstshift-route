/* FirstShift Route: the boat. Three ways to set the boat's speed (a generic type scaled by TCC, TCC alone, or the owner's
   own polar or ORC certificate), then three tuning sliders for upwind, reaching and downwind targets.
   Loaded by the page and by the routing workers. Needs engine.js (FSPolar) loaded first. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.FSBoat = factory(root.FSPolar);
})(typeof self !== 'undefined' ? self : this, function (FSPolar) {
  'use strict';

  /* Generic shapes by type. Not class polars: each type bends FirstShift's generic polar where boats of that kind are
     relatively strong or weak, then the whole polar is rescaled so the TCC still sets the overall speed.
     up, reach, run: relative strength; plane: extra speed from 14 kn TWS at 110 to 160 TWA; light: relative speed under 8 kn. */
  var TYPES = [
    { id: 'classic', name: 'Classic and heavy cruiser-racer', eg: 'for example Contessa 32, Nicholson 33, S&S 34', up: 1.04, reach: 0.98, run: 0.92, plane: 0, light: 0.92 },
    { id: 'cruiser', name: 'Cruiser-racer, masthead spinnaker', eg: 'for example Sigma 38, First 40.7, X-332', up: 1.02, reach: 1.0, run: 0.97, plane: 0.01, light: 0.97 },
    { id: 'perf', name: 'Performance cruiser-racer, asymmetric', eg: 'for example J/109, J/122, Dehler 30 OD', up: 1.0, reach: 1.01, run: 1.0, plane: 0.05, light: 1.0 },
    { id: 'shorthanded', name: 'Short-handed offshore racer', eg: 'for example JPK 10.80, Sun Fast 3300, Sun Fast 3600', up: 0.98, reach: 1.03, run: 1.04, plane: 0.10, light: 0.97 },
    { id: 'scow', name: 'Scow bow and wide offshore racer', eg: 'for example Class40, Pogo 12.50', up: 0.94, reach: 1.06, run: 1.07, plane: 0.18, light: 0.93 },
    { id: 'gp', name: 'Grand prix racer, 40 to 52 ft', eg: 'for example Ker 40, Carkeek 47, TP52', up: 1.03, reach: 1.02, run: 1.02, plane: 0.08, light: 1.04 },
    { id: 'maxi', name: 'Maxi and canting keel', eg: 'for example 60 to 100 ft canting keel boats', up: 1.02, reach: 1.06, run: 1.03, plane: 0.12, light: 1.02 }
  ];
  var TWS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], TWA = [];
  for (var a0 = 30; a0 <= 180; a0 += 5) TWA.push(a0);

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  /* weights of the three points of sail at a TWA: upwind to 55, blend to 70, reach 70 to 110, blend to 130, run from 130 */
  function sailWeights(twa) { var r = smooth(55, 70, twa), d = smooth(110, 130, twa); return { up: 1 - r, reach: r - d, run: d }; }

  function typeFactor(t, w, a) {
    var s = sailWeights(a), f = s.up * t.up + s.reach * t.reach + s.run * t.run;
    if (t.plane) f *= 1 + t.plane * smooth(12, 18, w) * smooth(100, 120, a) * (1 - smooth(155, 175, a));
    if (t.light !== 1) f *= 1 + (t.light - 1) * (1 - smooth(6, 10, w));
    return f;
  }
  /* average over a mixed course, 8 to 16 kn, a third each upwind, reaching and running */
  var MIX = []; [8, 10, 12, 14, 16].forEach(function (w) { [42, 90, 150].forEach(function (a) { MIX.push([w, a]); }); });
  function typedPolar(typeId, tcc) {
    var base = FSPolar.startFromTcc(tcc), t = TYPES.filter(function (x) { return x.id === typeId; })[0];
    if (!t) return base;
    var norm = 0; MIX.forEach(function (m) { norm += typeFactor(t, m[0], m[1]); }); norm /= MIX.length;
    return { name: t.name + ' at TCC ' + tcc.toFixed(3), tws: base.tws, twa: base.twa,
      v: base.tws.map(function (w, i) { return base.twa.map(function (a, j) { return base.v[i][j] * typeFactor(t, w, a) / norm; }); }) };
  }

  /* tuning: percentages of target for upwind, reaching and running, blended smoothly between them */
  function tune(pol, k) {
    if (!pol || !k || (k.up === 100 && k.reach === 100 && k.run === 100)) return pol;
    return { name: pol.name, tws: pol.tws, twa: pol.twa, v: pol.v.map(function (row) { return row.map(function (x, j) {
      if (x == null) return x; var s = sailWeights(pol.twa[j]); return x * (s.up * k.up + s.reach * k.reach + s.run * k.run) / 100; }); }) };
  }

  /* ---------- the owner's own ORC data ---------- */
  /* Build a polar grid from ORC style points for each wind speed: beat angle and VMG, boat speeds at fixed angles,
     run VMG and gybe angle. Speeds between the points are interpolated; below the beat angle they fall away. */
  function fromOrcPoints(d) {
    var twa = TWA.slice(), v = d.tws.map(function (w, i) {
      var pts = [];
      if (d.beatA[i] > 0 && d.beatV[i] > 0) pts.push([d.beatA[i], d.beatV[i] / Math.cos(d.beatA[i] * Math.PI / 180)]);
      d.angles.forEach(function (a, j) { var s = d.speeds[j] && d.speeds[j][i]; if (s > 0 && (!d.beatA[i] || a > d.beatA[i] + 1)) pts.push([a, s]); });
      if (d.gybeA[i] > 0 && d.runV[i] > 0) { var g = d.gybeA[i]; pts.push([g, d.runV[i] / Math.cos((180 - g) * Math.PI / 180)]); if (g < 179) pts.push([180, d.runV[i] * 0.94]); }
      pts.sort(function (p, q) { return p[0] - q[0]; });
      if (pts.length < 3) return twa.map(function () { return null; });
      return twa.map(function (a) {
        if (a < pts[0][0]) { var lo = pts[0][0] - 12; return a <= lo ? 0 : pts[0][1] * (a - lo) / 12; }
        if (a >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
        for (var k = 0; k < pts.length - 1; k++) if (a < pts[k + 1][0]) return pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (a - pts[k][0]) / (pts[k + 1][0] - pts[k][0]);
        return null;
      });
    });
    return { tws: d.tws.slice(), twa: twa, v: v };
  }
  /* ORC rating data in JSON, as ORC's own downloads give it: Allowances in seconds per mile */
  function fromOrcJson(obj) {
    var b = Array.isArray(obj) ? obj[0] : obj && obj.rms ? obj.rms[0] : obj;
    if (b && !b.Allowances && b.data) b = b.data[0];
    var A = b && b.Allowances; if (!A || !A.WindSpeeds) return null;
    var sp = function (secs) { return secs > 0 ? 3600 / secs : null; }, angles = [], speeds = [];
    Object.keys(A).forEach(function (k) { var m = /^R(\d+)$/.exec(k); if (m) { angles.push(+m[1]); speeds.push(A[k].map(sp)); } });
    var pol = fromOrcPoints({ tws: A.WindSpeeds, beatA: A.BeatAngle || [], beatV: (A.Beat || []).map(sp), angles: angles, speeds: speeds, runV: (A.Run || []).map(sp), gybeA: A.GybeAngle || [] });
    pol.name = 'ORC ' + (b.YachtName || '') + (b.SailNo ? ' ' + b.SailNo : '');
    return pol;
  }
  /* ORC certificate polar table copied as text: a wind row in knots, then Beat Angles, Beat VMG, angle rows, Run VMG, Gybe Angles */
  function fromOrcText(text) {
    var L = String(text).split(/\r?\n/), nums = function (s) { return (s.match(/-?\d+(\.\d+)?/g) || []).map(Number); };
    var tws = null, beatA = [], beatV = [], runV = [], gybeA = [], angles = [], speeds = [];
    L.forEach(function (raw) {
      var l = raw.trim(), lw = l.toLowerCase(); if (!l) return;
      if (!tws && /wind/.test(lw) && /kt|kn/.test(lw)) { var n = nums(l); if (n.length >= 4) tws = n; return; }
      if (!tws) return;
      if (/beat\s*ang/.test(lw)) beatA = nums(l);
      else if (/beat\s*vmg/.test(lw)) beatV = nums(l);
      else if (/run\s*vmg/.test(lw)) runV = nums(l);
      else if (/gybe\s*ang|jibe\s*ang/.test(lw)) gybeA = nums(l);
      else { var m = /^(\d{2,3})\s*(°|deg|º)?\s+(.*)$/.exec(l); if (m && +m[1] >= 40 && +m[1] <= 180) { var s = nums(m[3]); if (s.length === tws.length) { angles.push(+m[1]); speeds.push(s); } } }
    });
    if (!tws || angles.length < 3) return null;
    var pol = fromOrcPoints({ tws: tws, beatA: beatA, beatV: beatV, angles: angles, speeds: speeds, runV: runV, gybeA: gybeA });
    pol.name = 'ORC certificate polar'; return pol;
  }
  /* any of: ORC JSON, ORC certificate text, Expedition, B&G, OpenCPN, qtVlm or a plain grid */
  function readPolar(text) {
    var t = String(text || '').trim(); if (!t) return null;
    if (t[0] === '{' || t[0] === '[') { try { var p = fromOrcJson(JSON.parse(t)); if (p) return { pol: p, kind: 'ORC rating data' }; } catch (e) { /* not JSON */ } }
    if (/beat\s*(ang|vmg)/i.test(t)) { var o = fromOrcText(t); if (o) return { pol: o, kind: 'ORC certificate table' }; }
    var g = FSPolar.parsePolar(t); return g ? { pol: g, kind: 'Polar table' } : null;
  }
  /* back to plain text: TWA down, TWS across, tab separated (opens in any spreadsheet and in Expedition as a grid) */
  function toGrid(pol) {
    var h = 'TWA\\TWS\t' + pol.tws.join('\t') + '\n';
    return h + pol.twa.map(function (a, j) { return a + '\t' + pol.tws.map(function (w, i) { var x = pol.v[i][j]; return x == null ? '' : (+x).toFixed(2); }).join('\t'); }).join('\n');
  }

  /* spec: { src: 'type' | 'tcc' | 'polar', type, tcc, text, tune: {up, reach, run} } */
  function resolve(spec) {
    var tcc = +spec.tcc || 1, pol = null, kind = '';
    if (spec.src === 'polar') { var r = readPolar(spec.text); if (r) { pol = r.pol; kind = r.kind; } }
    if (!pol && spec.src === 'type') { pol = typedPolar(spec.type, tcc); kind = 'Generic type'; }
    if (!pol) { pol = FSPolar.startFromTcc(tcc); kind = spec.src === 'polar' ? 'TCC (polar not read)' : 'TCC'; }
    return { pol: tune(pol, spec.tune), base: pol, kind: kind };
  }

  return { TYPES: TYPES, typedPolar: typedPolar, tune: tune, readPolar: readPolar, fromOrcJson: fromOrcJson, fromOrcText: fromOrcText, toGrid: toGrid, resolve: resolve, sailWeights: sailWeights };
});
