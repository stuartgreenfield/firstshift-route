/* Headings relative to the wind (review finding 15, 14 Nov 2026). A 10 nm beat dead upwind in a steady 12 kn: the time must not
   depend on the wind direction against a fixed 5 degree heading grid, and must be close to distance / best VMG.
   Run: node tests/headings.js */
const RT = require('../site/cervantes/router.js'), F = require('../site/cervantes/engine.js');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const speed = RT.polarTable(F.startFromTcc(1.0)), tide = () => [0, 0], R = Math.PI / 180;
function beat(twd, dt, hs) {
  const k = Math.cos(50 * R), d = 10 / 60, to = [50 + d * Math.cos(twd * R), -2 + d * Math.sin(twd * R) / k];
  const r = RT.route({ start: { lat: 50, lon: -2, t: 0 }, legs: [{ name: 'Top', point: to, r: 0.1 }], wind: () => [12, twd], tide, speed, dt: dt || 600, hstep: hs || 5, sectors: 360, maxHours: 30, tackS: 0, gybeS: 0 });
  return r.finish;
}
const best = RT.bestVmg(speed, 12, true), ideal = 9.9 / best[2];
const times = [0, 1, 2.5, 4, 7.5].map(w => beat(w));
const t10 = [0, 2.5, 5, 7.5].map(w => beat(w, 1200, 10));
const spread = Math.max(...times) - Math.min(...times);
ok(spread * 60 < 0.1, 'the beat takes the same time whatever the wind direction', times.map(t => (t * 60).toFixed(1)).join(', ') + ' min');
ok(Math.max(...times) / ideal < 1.04, 'and close to distance / best VMG (' + (ideal * 60).toFixed(1) + ' min at ' + best[0] + ' deg)', (Math.max(...times) * 60).toFixed(1) + ' min worst');
const sp10 = Math.max(...t10) - Math.min(...t10);
ok(sp10 * 60 < 0.1 && Math.max(...t10) / ideal < 1.04, 'with the 10 degree, 20-minute steps of the quick and ensemble runs too', t10.map(t => (t * 60).toFixed(1)).join(', ') + ' min');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
