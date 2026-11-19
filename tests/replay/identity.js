/* Routing core check (peer review 19 Nov, P0 item 3): a route replayed in the forecast it was optimised in must take the same time.
   Optimiser: FSRouter.route. Replay (the comparison matrix): FSRouter.sailTrack. Synthetic open water, generic polar at TCC 1.0.
   Run: node tests/replay/identity.js */
const R = require('../../site/cervantes/router.js'), F = require('../../site/cervantes/engine.js');
const pol = F.startFromTcc(1.0), sp = R.polarTable(pol, pol.twa[0]);
const nmTo = (la, lo, brg, nm) => [la + nm * Math.cos(brg * Math.PI / 180) / 60, lo + nm * Math.sin(brg * Math.PI / 180) / (60 * Math.cos(la * Math.PI / 180))];
const cases = [
  { name: 'Beat 10 nm, 12 kn, no tide, no tack loss', brg: 0, nm: 10, tide: [0, 0], tackS: 0 },
  { name: 'Beat 10 nm, 12 kn, no tide, tack loss 30 s', brg: 0, nm: 10, tide: [0, 0], tackS: 30 },
  { name: 'Reach 10 nm, 12 kn, 1.5 kn cross tide', brg: 90, nm: 10, tide: [0, 1.5], tackS: 0 },
  { name: 'Reach 10 nm, 12 kn, 2.5 kn cross tide', brg: 90, nm: 10, tide: [0, 2.5], tackS: 0 },
  { name: 'Beat 10 nm, 12 kn, 1 kn foul tide', brg: 0, nm: 10, tide: [0, -1], tackS: 0 },
  { name: 'Beat 10 nm, 12 kn, 1.5 kn cross tide, tack loss 30 s', brg: 0, nm: 10, tide: [1.5, 0], tackS: 30 },
];
let worst = 0;
for (const c of cases) {
  const s = [50, -2], to = nmTo(50, -2, c.brg, c.nm);
  const o = { wind: () => [12, 0], tide: () => c.tide, speed: sp, wave: null, sea: null, tackS: c.tackS, gybeS: 0 };
  const r = R.route({ start: { lat: s[0], lon: s[1], t: 0 }, legs: [{ name: 'F', point: to, r: 0.05 }], wind: o.wind, tide: o.tide, speed: sp, depth: null, tackS: c.tackS, gybeS: 0, dt: 300, hstep: 5, sectors: 360, maxHours: 20 });
  const rep = R.sailTrack(r.path, o);
  const turns = r.path.reduce((n, p, i, a) => n + (i > 1 && Math.sign(((a[i].hdg || 0) - 0)) !== Math.sign(((a[i - 1].hdg || 0) - 0)) ? 0 : 0), 0);
  const d = (rep - r.finish) * 60, pct = 100 * (rep - r.finish) / r.finish; worst = Math.max(worst, Math.abs(pct));
  console.log((Math.abs(pct) < 0.5 ? 'PASS ' : 'FAIL ') + c.name + ' | optimised ' + r.finish.toFixed(3) + ' h, replayed ' + rep.toFixed(3) + ' h, ' + (d >= 0 ? '+' : '') + d.toFixed(1) + ' min (' + pct.toFixed(1) + '%)');
}
console.log('worst gap ' + worst.toFixed(1) + '%');
