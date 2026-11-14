/* D, 14 Nov 2026: wind with height over the sea, against NOAA's COARE 3.5 and Hoffman's published neutral factors.
   Run: node tests/windheight.js */
const F = require('../site/cervantes/engine.js');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const ref = require('./data/coare35-ratios.json');
let worst = 0, n = 0, capped = 0;
ref.forEach(x => {
  const r = F.windRatio(x.kn, x.z, 12, 12 - x.dT, 80), d = Math.abs(r - x.r) / x.r;
  const isCapped = x.kn < 8 && x.dT > 0; if (isCapped) { capped++; if (r <= 1.1 + 1e-9) return; }
  worst = Math.max(worst, d); n++;
});
ok(worst < 0.006, 'within 0.6% of COARE 3.5 at 15 and 18 m, 6 to 25 kn, air 4 C colder to 4 C warmer than the sea', n + ' cases, worst ' + (worst * 100).toFixed(2) + '%');
ok(capped === 4, 'light stable air (under 8 kn, air warmer than sea) is held at 10% or less on purpose', capped + ' cases capped where COARE gives up to 19%');
[[5.4, 0.947], [12.6, 0.937], [28.2, 0.922]].forEach(([ms, f]) => { const r = F.windRatio(ms / 0.514444, 19.5); ok(Math.abs(r - 1 / f) < 0.004, 'neutral 19.5 m factor at ' + ms + ' m/s matches Hoffman (arXiv 1107.1416, Table 1)', r.toFixed(3) + ' vs ' + (1 / f).toFixed(3)); });
ok(F.windRatio(15, 10, 12, 10) === 1, 'no change at 10 m');
const back = F.windTo10(F.windAt(12, 18, 14, 11), 18, 14, 11); ok(Math.abs(back - 12) < 0.01, 'masthead to 10 m is the exact reverse', back.toFixed(3));
const st = F.newStore(), L = new F.Logger(st, { sensorHeight: 18 }); L.setTags({ tair: 12, tsea: 12 });
for (let i = 0; i < 900; i++) L.add({ t: 1e9 + i, bsp: 6, tws: 13, twa: 60, hdg: 200 });
const P = F.polar(st, { percentile: 50 });
ok(st.ref === 10 && P.tws.indexOf(12) >= 0 && P.tws.indexOf(14) < 0, 'the logger stores a masthead 13 kn at 18 m as about 12.4 kn at 10 m', 'cells at ' + P.tws.join(', ') + ' kn');
/* the router raises the 10 m forecast wind to a masthead polar's height, warmer air over a colder sea raising it more */
const R = require('../site/cervantes/router.js'), wind = () => [12, 225];
const met = (ta, ts) => ({ met: { ecmet: { A: { temp: 1, sst: 1 }, sample: k => (k === 'temp' ? ta : ts) } } });
const w10 = R.heightWind(wind, met(12, 12), 10, F.windRatio)(50, -2, 0)[0], wn = R.heightWind(wind, met(12, 12), 18, F.windRatio)(50, -2, 0)[0];
const ws = R.heightWind(wind, met(15, 11), 18, F.windRatio)(50, -2, 0)[0], woff = R.heightWind(wind, met(15, 11), 18, F.windRatio, false)(50, -2, 0)[0];
ok(w10 === 12 && wn > 12.4 && wn < 12.7 && ws > 13.2 && Math.abs(woff - 12 * F.windRatio(12, 18)) < 1e-9, 'router: 10 m polar unchanged; 18 m polar 12 kn becomes ' + wn.toFixed(2) + ' kn, ' + ws.toFixed(2) + ' kn with air 4 C warmer than the sea; switched off, neutral ' + woff.toFixed(2));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
