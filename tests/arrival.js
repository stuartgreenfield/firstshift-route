/* Mark arrival timing (review finding 1, 13 Nov 2026). Constant 6 kn boat, no tide, steady wind, so the exact times are known.
   Run: node tests/arrival.js */
const RT = require('../site/cervantes/router.js');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const wind = () => [12, 0], tide = () => [0, 0], speed = (tws, twa) => (Math.abs(twa) >= 40 ? 6 : 0);
const base = { start: { lat: 50, lon: -2, t: 0 }, wind, tide, speed, dt: 600, hstep: 5, sectors: 360, maxHours: 30 };
/* 1. a reach: finish 8.05 nm due east, a point finish of 0.05 nm radius: exact time 8.0 nm / 6 kn = 1.33 h */
const k = Math.cos(50 * Math.PI / 180), east = (nm) => -2 + nm / 60 / k;
let r = RT.route(Object.assign({}, base, { legs: [{ name: 'Finish', point: [50, east(7.55)], r: 0.05 }] }));
ok(Math.abs(r.finish - 7.5 / 6) < 0.02, 'reach of 7.5 nm to the finish circle at 6 kn takes 1.25 h', r.finish.toFixed(3) + ' h');
/* 2. a mark: the rounding is timed where the track crosses the gate line, so the arrival point lies on the line and the time is
   part-way through a step; the boat's speed into that point matches the boat (6 kn, no tide) */
const mk = { lat: 50, lon: east(5.1) }, st = { lat: 50, lon: -2 }, fin = { lat: 50 - 5 / 60, lon: east(5.1) };
const gate = RT.markGate(mk, st, fin, 'starboard', 1.2);
const run2 = RT.route(Object.assign({}, base, { wind: () => [12, 270], legs: [{ name: 'Mark', gate: gate }, { name: 'Finish', point: [fin.lat, fin.lon], r: 0.05 }] }));
const tA = run2.arrivals[0].t, iA = run2.path.findIndex(p => Math.abs(p.t - tA) < 1e-9), pA = run2.path[iA], pB = run2.path[iA - 1];
const kk = Math.cos(gate.a[0] * Math.PI / 180), gx = (gate.b[1] - gate.a[1]) * kk, gy = gate.b[0] - gate.a[0], qx = (pA.lo - gate.a[1]) * kk, qy = pA.la - gate.a[0];
const off = Math.abs(gx * qy - gy * qx) / Math.hypot(gx, gy) * 60;
ok(off < 0.01, 'the rounding point lies on the gate line', off.toFixed(4) + ' nm off the line');
const frac = (tA * 6) % 1;
ok(frac > 0.01 && frac < 0.99, 'the rounding time falls part-way through a 10-minute step', (tA * 60).toFixed(1) + ' min');
const v = RT.dist(pB.la, pB.lo, pA.la, pA.lo) / (pA.t - pB.t);
ok(Math.abs(v - 6) < 0.05, 'speed into the rounding point is the boat speed (no jump)', v.toFixed(2) + ' kn');
const old = Math.ceil(tA * 6 - 1e-9) / 6;
ok(run2.finish < old + 5 / 6 + 0.17, 'the finish follows on from the rounding time', run2.finish.toFixed(3) + ' h');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
