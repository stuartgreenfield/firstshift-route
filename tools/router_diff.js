/* Side-by-side check for the untangled routing engine (Stuart 22 Nov 19:46, "go next to do on untangling").
   tools/router_old.js is route() as it was live at 0.12.105, frozen. This sails the same races through the old and the new engine
   and compares every number of every result: the path, the arrivals, the finish, the isochrones, partial routes, and the errors.
   Races are made at random from a fixed seed: beats, runs, reaches, marks to port and starboard, turn-back and offshore marks,
   inshore buoys, tide, waves, tack and gybe losses, no-go zones, shallow water with safety depths and margins, forecasts that end.
   Run: node tools/router_diff.js [count]   (exit 1 on any difference) */
const OLD = require('./router_old.js'), NEW = require('../site/cervantes/router.js'), F = require('../site/cervantes/engine.js');
const N = +process.argv[2] || 300, RAD = Math.PI / 180;
let seed = 22112026; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];
const to = (la, lo, b, nm) => [la + nm * Math.cos(b * RAD) / 60, lo + nm * Math.sin(b * RAD) / (60 * Math.cos(la * RAD))];
function depthOf(Rt, spec) {   /* a depth field: open water with banks and an island, in 0.1 m units */
  const ny = 120, nx = 160, L = { ny, nx, lat0: 49.8, dlat: 0.006, lon0: -2.4, dlon: 0.009, z: { off: 0, n: ny * nx, scale: 0.1 } };
  const a = new Int16Array(ny * nx);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let z = -spec.deep; spec.banks.forEach(b => { const d = Math.hypot(y - b[0], x - b[1]); if (d < b[2]) z = Math.max(z, -b[3] - (spec.deep - b[3]) * d / b[2]); });
    if (spec.isle && Math.hypot(y - spec.isle[0], x - spec.isle[1]) < spec.isle[2]) z = 5;
    a[y * nx + x] = Math.round(z * 10);
  }
  return Rt.Field(L, a.buffer);
}
function race(i) {
  const pol = F.startFromTcc(pick([0.95, 1.0, 1.08])), la0 = 50 + rnd() * 0.2, lo0 = -2 + rnd() * 0.3;
  const wdir = rnd() * 360, wsp = 4 + rnd() * 18, veer = (rnd() - 0.5) * 60, build = (rnd() - 0.5) * 8, ends = rnd() < 0.12 ? 1 + rnd() * 3 : 0;
  const tset = rnd() * 360, tdr = rnd() < 0.3 ? 0 : rnd() * 2.5, turnT = rnd() * 6, wave = rnd() < 0.3;
  const S = { pol, twa0: pol.twa[0], la0, lo0, wdir, wsp, veer, build, ends, tset, tdr, turnT, wave };
  const legs = [], nLegs = 1 + Math.floor(rnd() * 3); let prev = { lat: la0, lon: lo0 };
  const marks = []; for (let k = 0; k < nLegs; k++) { const p = to(prev.lat, prev.lon, rnd() * 360, 2 + rnd() * pick([6, 14, 30])); marks.push({ lat: p[0], lon: p[1], name: 'M' + k }); prev = marks[k]; }
  marks.forEach((m, k) => {
    const last = k === marks.length - 1, kind = last ? pick(['point', 'point', 'gate']) : pick(['gate', 'gate', 'point']);
    if (kind === 'point') legs.push({ name: m.name, point: [m.lat, m.lon], r: pick([0.05, 0.1, 0.5, undefined]), dt: rnd() < 0.15 ? 300 : undefined });
    else { const p0 = k ? marks[k - 1] : { lat: la0, lon: lo0 }, nx = last ? (rnd() < 0.5 ? p0 : { lat: m.lat + 0.05, lon: m.lon }) : marks[k + 1];
      const g = OLD.markGate(m, p0, nx, pick(['port', 'starboard']), pick([1.2, 1.5, 30, 0.15]), pick([0, 0, 0.1])); if (rnd() < 0.15) delete g.side; legs.push({ name: m.name, gate: g, at: rnd() < 0.3 ? [m.lat, m.lon] : undefined }); }
  });
  if (legs[legs.length - 1].gate) legs.push({ name: 'F', point: to(marks[marks.length - 1].lat, marks[marks.length - 1].lon, rnd() * 360, 2), r: 0.2 });
  const o = { start: { lat: la0, lon: lo0, t: rnd() * 10 }, legs, dt: pick([600, 600, 300, 180, 900]), hstep: pick([5, 5, 10, 3]), sectors: pick([360, 180, 90]),
    maxHours: pick([40, 40, 12, 3]), tackS: pick([0, 30, 60]), gybeS: pick([0, 20, 45]), safety: pick([0, 2, 3, 5]), margin: pick([0, 0, 1, 2, 3]),
    iso: rnd() < 0.4, fine: rnd() < 0.15 ? false : undefined, secCap: rnd() < 0.1 ? 400 : undefined, partial: rnd() < 0.5 };
  if (rnd() < 0.3) { const c = to(la0, lo0, rnd() * 360, 2 + rnd() * 4); o.nogo = [[[c[0] - 0.02, c[1] - 0.04], [c[0] + 0.02, c[1] - 0.04], [c[0] + 0.02, c[1] + 0.04], [c[0] - 0.02, c[1] + 0.04]]]; }
  const dsp = rnd() < 0.45 ? { deep: 8 + rnd() * 30, banks: [0, 1, 2, 3].map(() => [rnd() * 120, rnd() * 160, 3 + rnd() * 15, rnd() * 4 - 1]), isle: rnd() < 0.5 ? [rnd() * 120, rnd() * 160, 3 + rnd() * 6] : null } : null;
  return { S, o, dsp };
}
function build(Rt, X) {
  const S = X.S, sp = Rt.polarTable(S.pol, S.twa0);
  const o = Object.assign({}, X.o, { speed: sp, depth: X.dsp ? depthOf(Rt, X.dsp) : null,
    wind: (la, lo, t) => { const tt = t - X.o.start.t; if (S.ends && tt > S.ends) return [0, 0]; return [Math.max(0, S.wsp + S.build * Math.min(1, tt / 8) + 2 * Math.sin(la * 40 + lo * 30)), (S.wdir + S.veer * Math.min(1, tt / 10) + 10 * Math.cos(lo * 50) + 360) % 360]; },
    tide: (la, lo, t) => { const m = S.tdr * Math.cos((t - S.turnT) * Math.PI / 6.2); return [m * Math.sin(S.tset * RAD), m * Math.cos(S.tset * RAD)]; } });
  if (S.wave) o.wave = (la, lo, t) => [1 + 2 * Math.abs(Math.sin(t)), (S.wdir + 10) % 360];
  return o;
}
function sail(Rt, X) { try { return JSON.stringify(Rt.route(build(Rt, X))); } catch (e) { return 'ERR ' + e.message + ' ' + JSON.stringify({ at: e.at, fe: e.forecastEnd, togo: e.togo }); } }
const edges = [];
/* fixed edge cases the random races rarely reach: a finish circle the boat starts inside, a leg that begins inside the next one's
   circle, a mark with no side, a calm from the start, a start in shallow water */
const EDGE = [
  { S: null, o: { legs: [{ name: 'F', point: [50.003, -2], r: 0.5 }] } },
  { S: null, o: { legs: [{ name: 'A', point: [50.1, -2], r: 0.5 }, { name: 'F', point: [50.104, -2.002], r: 0.5 }] } },
  { S: null, o: { legs: [{ name: 'M', gate: { a: [50.1, -2], b: [50.1, -1.97] } }, { name: 'F', point: [50, -2.05], r: 0.1 }] } },
  { S: null, o: { legs: [{ name: 'F', point: [50.2, -2], r: 0.1 }], partial: true }, calm: true },
  { S: null, o: { legs: [{ name: 'F', point: [50.2, -2], r: 0.1 }] }, calm: true },
  { S: null, o: { legs: [{ name: 'F', point: [50.15, -2.1], r: 0.1 }], safety: 3, margin: 2 }, dsp: { deep: 20, banks: [[33, 44, 12, 1]], isle: null } }
];
EDGE.forEach((E, k) => { const X = race(1000 + k); X.o = Object.assign({}, X.o, { start: { lat: 50, lon: -2, t: 0 }, nogo: undefined }, E.o); X.dsp = E.dsp || null; if (E.calm) X.S.ends = 0.01; edges.push(X); });
let same = 0, diff = 0, errs = 0, parts = 0, tOld = 0, tNew = 0;
for (let i = 0; i < N + edges.length; i++) {
  const X = i < N ? race(i) : edges[i - N]; let t0 = Date.now(); const a = sail(OLD, X); tOld += Date.now() - t0; t0 = Date.now(); const b = sail(NEW, X); tNew += Date.now() - t0;
  if (a === b) same++; else { diff++; if (diff <= 3) console.log('DIFFER race ' + i + '\n old ' + a.slice(0, 300) + '\n new ' + b.slice(0, 300)); }
  if (a.startsWith('ERR')) errs++; else if (a.includes('"partial":{')) parts++;
}
console.log(N + ' races and ' + edges.length + ' edge cases, ' + same + ' identical, ' + diff + ' differ (' + errs + ' end in an error, ' + parts + ' partial routes); time old ' + (tOld / 1000).toFixed(1) + ' s, new ' + (tNew / 1000).toFixed(1) + ' s');
process.exit(diff ? 1 : 0);
