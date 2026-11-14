const R = require('../../site/cervantes/router.js'), F = require('../../site/cervantes/engine.js');
const pol = F.startFromTcc(1.0), sp = R.polarTable(pol, pol.twa[0]);
const fs = require('fs');
/* polar file for weatherrouting, sampled from the same table */
let L = ['TWA\\TWS ' + [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30].join(' ')];
for (let a = 0; a <= 180; a += 5) L.push(a + ' ' + [0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30].map(w => sp(w, a).toFixed(3)).join(' '));
fs.writeFileSync('polar.pol', L.join('\n') + '\n');
const S = JSON.parse(fs.readFileSync('scen.json'));
const out = {};
for (const sc of S) {
  const wind = (la, lo, t) => { const h = t - 0; const f = Math.max(0, Math.min(1, h / sc.hrs)); return [sc.w0 + (sc.w1 - sc.w0) * f, (sc.d0 + (((sc.d1 - sc.d0 + 540) % 360) - 180) * f + 360) % 360]; };
  const res = {};
  for (const dt of [600, 180]) {
    const r = R.route({ start: { lat: 50, lon: -2, t: 0 }, legs: [{ name: 'F', point: sc.to, r: 0.1 }], wind, tide: () => [0, 0], speed: sp, depth: null, tackS: 0, gybeS: 0, dt, hstep: 5, sectors: 360, maxHours: 30 });
    res['ours_' + dt] = r.finish;
  }
  const b = sc.analytic; if (b) { const up = R.bestVmg(sp, sc.w0, true), dn = R.bestVmg(sp, sc.w0, false); res.analytic = b === 'up' ? sc.nm / up[2] : b === 'down' ? sc.nm / dn[2] : sc.nm / sp(sc.w0, 90); }
  out[sc.name] = res;
}
console.log(JSON.stringify(out));
