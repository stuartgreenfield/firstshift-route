/* The start plan's logic against figures worked by hand (docs/MARK-RACER-LOGIC.md, B3 and B4; Stuart 18 Nov 21:15).
   Line: committee boat end at 50.78 N 1.30 W, pin 400 m due south. Wind from 080°T. Boat length 10 m; speeding up typed 20 s from
   stopped to full speed; start speed typed 6 kn; no polar, so the tacking angle is the default 42°.
   By hand:
   - Bias: the line runs 180°T; the pin end lies 400 x cos(180 - 80) = -69.5 m upwind, so the COMMITTEE BOAT end is favoured by 69 m,
     |90 - |180 - 80|| = 10°.
   - Aim point: one boat length (10 m) in from the committee boat end. Boat 300 m due west of it, so the bearing to it is 090°T, 10° off the
     wind, inside the 42° tacking angle: speed made good towards it = 6 x cos 42 / cos 10 = 4.528 kn = 2.329 m/s; 300 m takes 128.8 s.
   - Stopped: speeding up costs 20 x 6^2 / (2 x 6^2) = 10 s. Time to the aim point 138.8 s. Gun in 240 s: burn 101.2 s.
   - Sailing away at 6 kn on 270°T: a gybe to come back, a quarter of a boat length at 6 kn = 2.5 / 3.087 = 0.8 s; no speeding up.
     Time 129.6 s; burn 110.4 s; turn back in half of it, 55.2 s.
   - Wind from 100°T instead: the pin end is favoured (400 x cos(180 - 100) = +69.5 m).
   Run: node tests/mark-plan.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const near = (a, b, t) => a != null && Math.abs(a - b) <= t;
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && window.FSSolent.plan && window.__fsSim, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const setUp = (twd) => p.evaluate(([twd]) => { const S = window.FSSolent, la = 50.78, lo = -1.30, pinLa = la - 400 / 1852 / 60;
    window.__fsSetLine('boat', la, lo); window.__fsSetLine('pin', pinLa, lo);
    S.set({ wind: { twd: twd, tws: 12, src: 'typed', at: Date.now() }, loa: 10, accMode: 'typed', acc: 20, startV: 6, tackLearn: 0, gybeLearn: 0, tackS: 0, gybeS: 0, startAt: Math.round(Date.now() / 1000) + 240, marks: [], type: 'marks' });
    window.__fsSim(true); }, [twd]);
  const aim = { la: 50.78 - 10 / 1852 / 60, lo: -1.30 };   // 10 m in from the committee boat end, towards the pin
  const west = (m) => [aim.la, aim.lo - m / 1852 / 60 / Math.cos(aim.la * Math.PI / 180)];
  await setUp(80); let q = west(300); await p.evaluate(([a, o]) => window.__fsSimFix(a, o, 0, null), q); await p.waitForTimeout(300);
  let P = await p.evaluate(() => window.FSSolent.plan());
  ok(P.end === 'boat', 'Wind 080: the committee boat end is favoured', P.end);
  ok(P.bias && near(P.bias.m, 69, 1) && near(P.bias.deg, 10, 0), 'Bias 69 m and 10°', P.bias && [P.bias.m, P.bias.deg]);
  ok(near(P.d, 300, 2), 'Distance to the aim point 300 m', P.d);
  const pol = await p.evaluate(() => { const sp = window.__fsSpeed && window.__fsSpeed(); return sp ? FSRouter.bestVmg(sp, 12, true) : null; });
  ok(P.vsrc && (pol ? /polar/.test(P.vsrc) && near(P.V, pol[1] * 0.88, 0.05) : P.V === 6), 'Speed: the polar beat speed less 12% (' + (pol ? (pol[1] * 0.88).toFixed(2) : '6') + ' kn), or the typed 6 kn with no polar', [P.V && +P.V.toFixed(2), P.vsrc]);
  ok(P.beat >= (pol ? pol[0] : 42) && near(P.th, 10, 0.5), 'Tacking angle from the polar, wider when stopped (slow pointing): ' + P.beat + '° against best ' + (pol ? pol[0] : 42) + '°; aim 10° off the wind', [P.beat, P.slow]);
  const kH = Math.cos(P.beat * Math.PI / 180) / Math.cos(10 * Math.PI / 180); ok(near(P.k, kH, 0.003), 'Speed made good factor cos(tacking angle) / cos 10', [+P.k.toFixed(4), +kH.toFixed(4)]);
  ok(near(P.lost, 10, 0.2), 'Stopped: 10 s lost speeding up', P.lost && +P.lost.toFixed(1));
  const ttlH = 300 / (P.V * P.k * 1852 / 3600) + 10; ok(near(P.ttl, ttlH, 1), 'Time to the aim point = 300 m at the speed made good, plus 10 s speeding up (' + ttlH.toFixed(1) + ' s)', +P.ttl.toFixed(1));
  ok(near(P.burn, 240 - ttlH, 2.5), 'Burn = 240 s to the gun less that (' + (240 - ttlH).toFixed(1) + ' s)', +P.burn.toFixed(1));
  ok(!P.away && P.turnIn == null, 'Stopped: no turn-back time');
  await p.evaluate(() => window.FSSolent.set({ startAt: Math.round(Date.now() / 1000) + 240 }));
  await p.evaluate(([a, o]) => window.__fsSimFix(a, o, 6, 270), q); await p.waitForTimeout(300);
  P = await p.evaluate(() => window.FSSolent.plan());
  const gH = 2.5 / (P.V * 1852 / 3600); ok(P.turn === 'gybe' && near(P.ts, gH, 0.1), 'Sailing away on 270: a gybe to come back, a quarter of 10 m at the speed (' + gH.toFixed(2) + ' s)', [P.turn, P.ts]);
  ok(near(P.lost, 0, 0.1), 'Already at speed: nothing lost speeding up', P.lost);
  const t2 = 300 / (P.V * P.k * 1852 / 3600) + P.ts; ok(near(P.burn, 240 - t2, 2.5) && P.away && near(P.turnIn, (240 - t2) / 2, 1.5), 'Heading away: burn = 240 less the sail back and the gybe (' + (240 - t2).toFixed(1) + ' s), turn back in half of it', [+P.burn.toFixed(1), P.turnIn && +P.turnIn.toFixed(1)]);
  await setUp(100); await p.evaluate(([a, o]) => window.__fsSimFix(a, o, 0, null), q); await p.waitForTimeout(300);
  P = await p.evaluate(() => window.FSSolent.plan()); ok(P.end === 'pin' && near(P.bias.m, 69, 1), 'Wind 100: the pin end is favoured by 69 m', [P.end, P.bias && P.bias.m]);
  // on the start screen: the plan box at the top, in words a crew can read at a glance
  await p.evaluate(() => { window.FSMarkSetup.close(); window.FSSolent.set({ startAt: Math.round(Date.now() / 1000) + 240 }); window.FSSolent.showList(); const n = document.querySelector('[data-k="nxnow"]'); if (n) n.click(); }); await p.waitForTimeout(1500);
  console.log('ss', await p.evaluate(() => { const s = document.getElementById('solStartScr'); const pl = document.getElementById('ssPlan'); return [s && getComputedStyle(s).display, pl && getComputedStyle(pl).display, pl && pl.parentNode.id, document.body.className, pl && pl.innerHTML.length]; }));
  const box = await p.evaluate(() => { const e = document.getElementById('ssPlan'); return e && e.getClientRects().length ? e.textContent : null; });
  ok(box && /START AT THE PIN END/.test(box) && /BURN|TURN BACK|GO NOW/.test(box), 'The start screen shows the plan: which end, and burn or turn back', box && box.slice(0, 140));
  await p.screenshot({ path: '/tmp/claude-0/f46/plan.png' });
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
