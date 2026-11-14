/* C, 14 Nov 2026: how sure a learned figure is better, from the scatter within and between outings and the trend over time.
   Run: node tests/evidence.js   (reference values from numpy and scipy are in tests/data/evidence-ref.json, made by tests/evidence_ref.py) */
const F = require('../site/cervantes/engine.js');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const DAY = 86400;
/* sail outings in one cell (12 kn, 60 deg): each outing 20 minutes of steady 1 Hz data at the given speed, with a small wobble */
function sail(speeds, gapDays) {
  const st = F.newStore(), L = new F.Logger(st); let t0 = 1.7e9;
  speeds.forEach((v, k) => { const t1 = t0 + k * gapDays * DAY; for (let i = 0; i < 1200; i++) L.add({ t: t1 + i, bsp: v + 0.08 * Math.sin(i / 7), tws: 12, twa: 60, hdg: 200 }); });
  const P = F.polar(st, { percentile: 50, smooth: false }), i = P.tws.indexOf(12), j = P.twa.indexOf(60);
  return { P, i, j };
}
const ev = (s, old) => F.evidence(s.P, s.i, s.j, old, 50);
ok(Math.abs(F.phi(1.96) - 0.975) < 1e-4 && Math.abs(F.phi(-1) - 0.1587) < 1e-4, 'normal distribution matches published values', F.phi(1.96).toFixed(4));
const same = ev(sail([6.0, 6.02, 5.98], 3), 6.0);
ok(same.p < 0.7, 'figure already right: not sure the new one is better', (same.p * 100).toFixed(0) + '%');
const faster = ev(sail([6.35, 6.38, 6.33], 3), 6.0);
ok(faster.p > 0.95 && Math.abs(faster.v - 6.35) < 0.06, 'consistently 6% faster over three outings: sure, new figure', (faster.p * 100).toFixed(0) + '%, ' + faster.v.toFixed(2));
const mixed = ev(sail([6.0, 6.7, 6.0, 6.7], 3), 6.0);
ok(mixed.p < faster.p && mixed.se > faster.se * 2, 'outings that disagree make it less sure', (mixed.p * 100).toFixed(0) + '%, se ' + mixed.se.toFixed(3));
const trend = ev(sail([6.0, 6.2, 6.4, 6.6], 7), 6.0);
ok(/getting faster/.test(trend.trend) && trend.v > 6.5, 'a steady rise over four weeks: the figure follows the trend to the latest outing', trend.trend + ', ' + trend.v.toFixed(2));
const one = ev(sail([6.4], 1), 6.0);
ok(one.outings <= 1 && one.se > 0, 'one outing: scatter between outings unknown, so taken wider', 'se ' + one.se.toFixed(3));
/* against numpy's weighted least squares and scipy's normal distribution, on the same outing means */
const ref = require('./data/evidence-ref.json'), S = ref.sessions.map(x => ({ t: x[0], n: x[1], m: x[2], sd: 0 }));
const L2 = { v: [[ref.est]], sd: [[ref.sd]], neff: [[ref.neff]], smean: [[S]] }, e2 = F.evidence(L2, 0, 0, ref.old, 50);
ok(Math.abs(e2.slope - ref.slope) < 1e-9 * Math.max(1, Math.abs(ref.slope)) + 1e-12, 'trend slope matches numpy weighted fit', e2.slope.toExponential(4) + ' vs ' + ref.slope.toExponential(4));
ok(Math.abs(e2.p - ref.p) < 1e-4, 'probability matches scipy', e2.p.toFixed(5) + ' vs ' + ref.p.toFixed(5));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
