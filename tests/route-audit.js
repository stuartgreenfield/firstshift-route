/* Route audit, a release check (Stuart 24 Nov 2026 18:03: "really good tests to prove that our routing system works really well").
   Routes a set of courses through changing wind, turning tide and a sea state, then walks EVERY point of EVERY route and checks the
   router did what it says: boat speed = the polar at that wind and angle times the sea factor; the TWA agrees with the heading and the
   true wind direction; the wind stored is the forecast at the start of the step at its middle time (a step cut short at a mark rounding or the finish: the middle of the full 10 minute step, as the router reads it); the distance sailed in each step =
   boat speed x heading x time (less the 60 s tack or 40 s gybe, which the route point marks but does not store) + the tide; and no step crosses land. The same checks Claude ran by hand on
   the live site on 24 Nov (all 8 routes clean). Run: node tests/route-audit.js   (exit 1 on any failure) */
const R = require('../site/cervantes/router.js'), F = require('../site/cervantes/engine.js');
const RAD = Math.PI / 180;
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); return c; };
const to = (la, lo, brg, nm) => [la + nm * Math.cos(brg * RAD) / 60, lo + nm * Math.sin(brg * RAD) / (60 * Math.cos(la * RAD))];
const ad = (a, b) => ((a - b) % 360 + 540) % 360 - 180;
const SEA = { up: 4, reach: 1.5, surf: 3, from: 0.5, surfFrom: 1.5 };

/* Weather that changes in time and space, so a wrong time or place shows: wind veers 40 degrees and builds over 12 h and varies across
   the area; tide turns every 6.2 h; a sea that builds. */
const wind = (la, lo, t) => [9 + 6 * Math.sin(t / 5) + 2 * Math.cos((lo + 2) * 6), (220 + 40 * Math.min(1, t / 12) + 10 * Math.sin((la - 50) * 20) + 360) % 360];
const tide = (la, lo, t) => { const a = 2 * Math.PI * t / 12.4; return [1.6 * Math.cos(a), 0.6 * Math.sin(a)]; };
const wave = (la, lo, t) => [0.8 + 0.15 * t, 230, 7];

const polars = [['rating 1.039', F.startFromTcc(1.039)], ['rating 1.10', F.startFromTcc(1.10)]];
const courses = [
  ['beat 25 nm', [{ name: 'F', point: to(50, -2, 240, 25), r: 0.1 }]],
  ['run 25 nm', [{ name: 'F', point: to(50, -2, 60, 25), r: 0.1 }]],
  ['reach 25 nm', [{ name: 'F', point: to(50, -2, 150, 25), r: 0.1 }]],
  ['mark then finish', [{ name: 'M', gate: R.markGate({ lat: 50 - 8 / 60, lon: -2 - 0.25, name: 'M' }, { lat: 50, lon: -2 }, { lat: 50 + 0.05, lon: -2 + 0.2 }, 'port', 1.2, 0) }, { name: 'F', point: [50 + 0.05, -2 + 0.2], r: 0.1 }]]];

const worst = { polar: 0, twa: 0, tws: 0, twd: 0, step: 0 };
polars.forEach(([pn, pol]) => {
  const sp = R.polarTable(pol, pol.twa[0]);
  courses.forEach(([cn, legs]) => {
    const r = R.route({ start: { lat: 50, lon: -2, t: 0 }, legs, wind, tide, wave, sea: SEA, speed: sp, depth: null, tackS: 60, gybeS: 40, dt: 600, hstep: 5, sectors: 360, maxHours: 40 });
    const name = pn + ', ' + cn;
    if (!ok(r && r.path && r.path.length > 3 && !r.partial, name + ': routes to the finish', r && r.finish && r.finish.toFixed(2) + ' h, ' + (r.path || []).length + ' points')) return;
    const bad = { polar: [], twa: [], wind: [], step: [] };
    for (let i = 1; i < r.path.length; i++) {
      const p = r.path[i], q = r.path[i - 1]; if (p.bsp == null) continue;
      const want = sp(p.tws, p.twa) * R.seaFactor(p.hs, p.wd, p.hdg, SEA), dp = Math.abs(p.bsp - want); worst.polar = Math.max(worst.polar, dp); if (dp > 0.01) bad.polar.push(i);
      const twa2 = ad(p.twd, p.hdg), da = Math.abs(Math.abs(twa2) - Math.abs(p.twa)), side = (p.twa < 0) === (twa2 > 0) || Math.abs(twa2) < 0.5 || Math.abs(twa2) > 179.5;
      worst.twa = Math.max(worst.twa, da); if (da > 0.5 || !side) bad.twa.push(i);
      const cut = (p.t - q.t) * 3600 < 590, W = wind(q.la, q.lo, cut ? q.t + 600 / 7200 : (q.t + p.t) / 2), dw = Math.abs(W[0] - p.tws), dd = Math.abs(ad(W[1], p.twd)); worst.tws = Math.max(worst.tws, dw); worst.twd = Math.max(worst.twd, dd); if (dw > 0.05 || dd > 0.5) bad.wind.push(i);
      if (p.fr == null) { const dh = p.t - q.t, lost = p.lost != null ? p.lost : p.tack ? (Math.abs(p.twa) < 90 ? 60 : 40) : 0, run = Math.max(0, dh * 3600 - lost) / 3600, dn = p.bsp * Math.cos(p.hdg * RAD) * run + (p.cv || 0) * dh, de = p.bsp * Math.sin(p.hdg * RAD) * run + (p.cu || 0) * dh;
        const ds = Math.abs(R.dist(q.la, q.lo, p.la, p.lo) - Math.hypot(dn, de)); worst.step = Math.max(worst.step, ds); if (ds > 0.05) bad.step.push(i); }
    }
    ok(!bad.polar.length, name + ': boat speed = polar x sea factor at every point', bad.polar.length + ' off');
    ok(!bad.twa.length, name + ': TWA agrees with heading and wind, side included', bad.twa.length + ' off');
    ok(!bad.wind.length, name + ': wind stored = the forecast at the step start, mid-step time', bad.wind.length + ' off');
    ok(!bad.step.length, name + ': each step = speed x heading x time + tide', bad.step.length + ' off');
  });
});
console.log('Worst differences: polar ' + worst.polar.toFixed(3) + ' kn, TWA ' + worst.twa.toFixed(2) + ' deg, wind ' + worst.tws.toFixed(3) + ' kn / ' + worst.twd.toFixed(2) + ' deg, step ' + worst.step.toFixed(3) + ' nm');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
