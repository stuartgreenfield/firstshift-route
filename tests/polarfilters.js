/* Polar learning checks (review findings 4, 5, 14, 24; 14 Nov 2026). Run: node tests/polarfilters.js */
const F = require('../site/cervantes/engine.js');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const run = (gen, n) => { const st = F.newStore(), L = new F.Logger(st); let a = 0; for (let i = 0; i < n; i++) { const s = gen(i); if (s && L.add(s) === 'accepted') a++; } return { a, st }; };
/* 4: 1 Hz data with 18 s missing in every 40 s is left out as gaps */
const g = run(i => (i % 40) < 22 ? { t: 1e9 + i, bsp: 6, tws: 12, twa: 60, hdg: 200 } : null, 2000);
ok(g.a === 0 && g.st.rejected.gaps > 0, 'data with long gaps is left out', g.a + ' accepted, ' + (g.st.rejected.gaps || 0) + ' rejected for gaps');
const full = run(i => ({ t: 1e9 + i, bsp: 6, tws: 12, twa: 60, hdg: 200 }), 600);
ok(full.a > 40, 'steady data without gaps is still learned', full.a);
/* 14: fast sailing at 12 kn with a 0.5 kn spread (4%) is kept; at 3 kn the same spread (17%) is not */
const fast = run(i => ({ t: 1e9 + i, bsp: 12 + (i % 2 ? 0.5 : -0.5), tws: 20, twa: 150, hdg: 30 }), 600);
const slow = run(i => ({ t: 1e9 + i, bsp: 3 + (i % 2 ? 0.5 : -0.5), tws: 8, twa: 150, hdg: 30 }), 600);
ok(fast.a > 40 && slow.a === 0, 'speed steadiness is judged against the speed', 'fast ' + fast.a + ', slow ' + slow.a);
/* 5: slow outliers no longer pull the low percentiles down: 70% of spells at 6.0 kn, 30% at 4.4 kn in one cell */
const st = F.newStore(), L = new F.Logger(st); let t = 1e9;
for (let k = 0; k < 20; k++) { const v = k % 10 < 7 ? 6.0 : 4.4; for (let i = 0; i < 120; i++) L.add({ t: t++, bsp: v, tws: 12, twa: 60, hdg: 200 }); t += 300; }
const p20 = F.polar(st, { percentile: 20 }), i12 = p20.tws.indexOf(12), j60 = p20.twa.indexOf(60), v20 = p20.v[i12][j60];
ok(v20 > 5.5, 'a cell\'s low percentile ignores readings below 0.8 of its median', v20 && v20.toFixed(2) + ' kn');
/* 24: a gybe on a deep run (TWA 172 to -172, heading turns 16 deg) starts the settle time */
let gy = 0; const st2 = F.newStore(), L2 = new F.Logger(st2);
for (let i = 0; i < 400; i++) { const after = i >= 200, r = L2.add({ t: 1e9 + i, bsp: 7, tws: 15, twa: after ? -172 : 172, hdg: after ? 46 + Math.min(16, i - 200) * 0 : 30 }); if (after && i < 260 && r === 'accepted') gy++; }
ok(gy === 0 && (st2.rejected.manoeuvre || 0) > 0, 'nothing is learned in the minute after a deep gybe', gy + ' accepted, ' + (st2.rejected.manoeuvre || 0) + ' left out as manoeuvre');
/* H: heel in each cell, overpowered and rolling left out (14 Nov 2026) */
const hOk = run(i => ({ t: 1e9 + i, bsp: 7, tws: 16, twa: 50, hdg: 200, heel: 22 + (i % 2 ? 0.5 : -0.5) }), 600);
const hOver = run(i => ({ t: 1e9 + i, bsp: 7, tws: 16, twa: 50, hdg: 200, heel: 34 }), 600);
const hRoll = run(i => ({ t: 1e9 + i, bsp: 7, tws: 16, twa: 50, hdg: 200, heel: 20 + ((i % 8) < 4 ? 8 : -8) }), 600);
ok(hOk.a > 40 && hOver.a === 0 && hRoll.a === 0, 'overpowered (34 deg) and rolling (+-8 deg) sailing is left out; steady 22 deg is kept', [hOk.a, hOver.a + ' ' + JSON.stringify(hOver.st.rejected), hRoll.a].join(', '));
const ph = F.polar(hOk.st, { percentile: 90 }), hh = ph.heel[ph.tws.indexOf(16)][ph.twa.indexOf(50)];
ok(Math.abs(hh - 22) < 0.3, 'each cell keeps the heel the boat carried', hh + ' deg');
const noH = F.polar(full.st, { percentile: 90 });
ok(noH.heel.every(r => r.every(x => x == null)), 'without heel data the cells simply have none');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
