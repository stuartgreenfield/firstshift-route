/* The routing test suite (ROUTING-ENGINE-PLAN E6; Stuart 19 Nov 04:33 "absolutely perfect"). Runs in Node on FSRouter alone, no browser.
   Run before every release, as tools/speed_check.js: node tools/route_check.js   (exit 1 on any failure) */
const R = require('../site/cervantes/router.js'), F = require('../site/cervantes/engine.js');
const pol = F.startFromTcc(1.0), sp = R.polarTable(pol, pol.twa[0]), RAD = Math.PI / 180;
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
const to = (la, lo, brg, nm) => [la + nm * Math.cos(brg * RAD) / 60, lo + nm * Math.sin(brg * RAD) / (60 * Math.cos(la * RAD))];
const run = (o) => R.route(Object.assign({ start: { lat: 50, lon: -2, t: 0 }, speed: sp, depth: null, tackS: 0, gybeS: 0, dt: 600, hstep: 5, sectors: 360, maxHours: 40 }, o));
const up = R.bestVmg(sp, 12, true), dn = R.bestVmg(sp, 12, false), r01 = 0.1;
/* 1. Analytic open water, steady 12 kn from 000: beat, run, reach, at 10 and 3 minute steps. The finish radius is 0.1 nm, so the best time is (d - 0.1) / speed. */
[['Beat', 0, 20, (20 - r01) / up[2]], ['Run', 180, 20, (20 - r01) / dn[2]], ['Reach', 90, 20, (20 - r01) / sp(12, 90)]].forEach(([n, b, d, best]) => [600, 180].forEach(dt => {
  const r = run({ legs: [{ name: 'F', point: to(50, -2, b, d), r: r01 }], wind: () => [12, 0], tide: () => [0, 0], dt });
  const e = 100 * (r.finish - best) / best; ok(e > -0.3 && e < 0.5, n + ' ' + d + ' nm, steady 12 kn, ' + dt + ' s: within 0.5% of the best possible', r.finish.toFixed(4) + ' h against ' + best.toFixed(4) + ' (' + e.toFixed(2) + '%)'); }));
/* 2. Tide, with a known answer: a 10 nm reach (wind 000, course 090) with 1.5 kn of fair, foul and cross tide.
   Fair or foul along the course: the boat holds 090 and the ground speed is V +/- 1.5. Cross tide from the south (set 000): the boat crabs to hold the line. */
const V90 = sp(12, 90), d10 = 10 - r01;
[['fair', [1.5, 0], d10 / (V90 + 1.5)], ['foul', [-1.5, 0], d10 / (V90 - 1.5)]].forEach(([n, C, best]) => {
  const r = run({ legs: [{ name: 'F', point: to(50, -2, 90, 10), r: r01 }], wind: () => [12, 0], tide: () => C, dt: 300 });
  const e = 100 * (r.finish - best) / best; ok(Math.abs(e) < 0.6, 'Reach 10 nm, 1.5 kn ' + n + ' tide: within 0.6% of the hand-worked time', r.finish.toFixed(4) + ' h against ' + best.toFixed(4) + ' (' + e.toFixed(2) + '%)'); });
{ const r = run({ legs: [{ name: 'F', point: to(50, -2, 90, 10), r: r01 }], wind: () => [12, 0], tide: () => [0, 1.5], dt: 300 });
  let best = 1e9; for (let h = 60; h <= 120; h += 0.05) { const s = sp(12, h), ve = s * Math.sin(h * RAD), vn = s * Math.cos(h * RAD) + 1.5; if (Math.abs(vn) < 0.01 && ve > 0) best = Math.min(best, d10 / ve); }
  const e = 100 * (r.finish - best) / best; ok(Math.abs(e) < 0.6, 'Reach 10 nm, 1.5 kn cross tide: within 0.6% of the hand-worked crab', r.finish.toFixed(4) + ' h against ' + best.toFixed(4) + ' (' + e.toFixed(2) + '%)'); }
/* 3. Tack loss: a 10 nm beat with 60 s per tack costs the tacks it makes, no more. */
{ const a = run({ legs: [{ name: 'F', point: to(50, -2, 0, 10), r: r01 }], wind: () => [12, 0], tide: () => [0, 0], dt: 300 });
  const b = run({ legs: [{ name: 'F', point: to(50, -2, 0, 10), r: r01 }], wind: () => [12, 0], tide: () => [0, 0], dt: 300, tackS: 60 });
  const n = b.path.filter(p => p.tack).length, extra = (b.finish - a.finish) * 3600;
  ok(n >= 1 && extra > n * 60 - 30 && extra < n * 60 + 300, 'Beat with 60 s tacks: the time lost is about the tacks made', n + ' tacks, ' + extra.toFixed(0) + ' s more'); }
/* 4. Roundings: a mark left to port is gone round anticlockwise, to starboard clockwise (the angle the track sweeps round the mark). */
['port', 'starboard'].forEach(side => { const m = { lat: 50 + 5 / 60, lon: -2, name: 'M' }, fin = to(50, -2, 90, 3), k = Math.cos(50 * RAD);
  const legs = [{ name: 'M', gate: R.markGate(m, { lat: 50, lon: -2 }, { lat: fin[0], lon: fin[1] }, side, 1.2, 0) }, { name: 'F', point: fin, r: r01 }];
  const r = run({ legs, wind: () => [12, 200], tide: () => [0, 0], dt: 300 });
  let sw = 0; for (let i = 1; i < r.path.length; i++) { const a = r.path[i - 1], b = r.path[i]; const a1 = Math.atan2(a.la - m.lat, (a.lo - m.lon) * k), a2 = Math.atan2(b.la - m.lat, (b.lo - m.lon) * k); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; sw += d; }
  const deg = sw / RAD; ok(side === 'port' ? deg > 90 : deg < -90, 'Mark left to ' + side + ': the track goes round it ' + (side === 'port' ? 'anticlockwise' : 'clockwise'), 'swept ' + deg.toFixed(0) + '°'); });
/* 5. No-go zone (a traffic separation scheme as a wall today): the route never enters it. */
{ const ring = [[50 + 3 / 60, -2.1], [50 + 3 / 60, -1.9], [50 + 4 / 60, -1.9], [50 + 4 / 60, -2.1]];
  const r = run({ legs: [{ name: 'F', point: to(50, -2, 0, 8), r: r01 }], wind: () => [12, 90], tide: () => [0, 0], dt: 300, nogo: [ring] });
  const inside = r.path.some(p => p.la > ring[0][0] && p.la < ring[2][0] && p.lo > -2.1 && p.lo < -1.9); ok(!inside, 'No-go zone across the course: the route goes round it'); }
/* 5b. A thin exclusion zone (Stuart 26 Nov 2026 12:46, exclusion zones drawn by the crew): a wall 0.02 nm thick across the course. Checked at 8 points a
   step it slipped between two of them at 10 minute steps; the test is now exact (does the step cross an edge of the zone). */
[600, 300, 180].forEach(dt => { const la0 = 50 + 3 / 60, la1 = 50 + 3.02 / 60, ring = [[la0, -2.1], [la0, -1.9], [la1, -1.9], [la1, -2.1]], mid = (la0 + la1) / 2;
  const r = run({ legs: [{ name: 'F', point: to(50, -2, 0, 8), r: r01 }], wind: () => [12, 90], tide: () => [0, 0], dt, nogo: [ring] });
  let crossed = 0; for (let i = 1; i < r.path.length; i++) { const a = r.path[i - 1], b = r.path[i]; if ((a.la - mid) * (b.la - mid) < 0) { const lo = a.lo + (b.lo - a.lo) * (mid - a.la) / (b.la - a.la); if (lo > -2.1 && lo < -1.9) crossed++; } }
  ok(crossed === 0, 'Thin exclusion zone across the course, ' + dt + ' s steps: no step of the route crosses it', crossed + ' crossings'); });
/* 6. A forecast that ends before the finish: an honest error, or a partial route that says how far is left. */
{ let msg = ''; try { run({ legs: [{ name: 'F', point: to(50, -2, 0, 30), r: r01 }], wind: (la, lo, t) => t < 2 ? [12, 90] : [0, 0], tide: () => [0, 0], dt: 600 }); } catch (e) { msg = e.message; }
  ok(/forecasts end/i.test(msg), 'Forecast ends before the finish: says so', msg.slice(0, 80));
  const p = run({ legs: [{ name: 'F', point: to(50, -2, 0, 30), r: r01 }], wind: (la, lo, t) => t < 2 ? [12, 90] : [0, 0], tide: () => [0, 0], dt: 600, partial: true });
  ok(p.partial && p.partial.togo > 0, 'Partial route: kept as far as the forecast goes, with the distance left', p.partial && p.partial.togo + ' nm left'); }
/* 7. Replay identity (E1): a route re-timed in its own forecast takes the same time. */
[[0, [0, 0], 0], [0, [0, -1], 0], [90, [0, 2.5], 0], [0, [1.5, 0], 30]].forEach(([b, C, tk]) => {
  const r = run({ legs: [{ name: 'F', point: to(50, -2, b, 10), r: 0.05 }], wind: () => [12, 0], tide: () => C, dt: 300, tackS: tk });
  const rep = R.sailTrack(r.path, { wind: () => [12, 0], tide: () => C, speed: sp, tackS: tk, gybeS: 0 }), e = 100 * (rep - r.finish) / r.finish;
  ok(Math.abs(e) < 0.5, 'Replay identity, course ' + b + '°, tide ' + C + ', tack ' + tk + ' s', e.toFixed(2) + '%'); });
/* 8. Step size (E2): 10 and 3 minute steps agree within 0.6% in a veering and a building wind. */
[['veering beat', (t) => [12, (340 + Math.min(1, t / 6) * 40) % 360], 0], ['building reach', (t) => [8 + 8 * Math.min(1, t / 6), 0], 90]].forEach(([n, w, b]) => {
  const f = dt => run({ legs: [{ name: 'F', point: to(50, -2, b, 30), r: r01 }], wind: (la, lo, t) => w(t), tide: () => [0, 0], dt }).finish;
  const a = f(600), c = f(180), e = 100 * (a - c) / c; ok(Math.abs(e) < 0.6, 'Step size, ' + n + ': 600 s and 180 s agree within 0.6%', a.toFixed(4) + ' and ' + c.toFixed(4) + ' (' + e.toFixed(2) + '%)'); });
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
