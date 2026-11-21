/* M53 (Stuart 21 Nov 21:48 to 22:13): time from stopped to full speed comes from his Time to Full Speed table, by boat size and true wind
   speed (4 to 25 kn); full speed is the polar's upwind target at that wind; real speed-ups blend in and take over after five at that wind;
   tack and gybe seconds from the table until typed or learnt. Run: node tests/full-speed.js http://localhost:8779 [mark path] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + PATH); await p.waitForFunction(() => window.FSSolent && FSSolent.accInfo && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  const I = o => p.evaluate(o => { if (o) FSSolent.accSet(o); return FSSolent.accInfo(); }, o);
  /* a 35 ft boat by length, typed wind 12 kn */
  let r = await I({ loa: 10.7, accSize: null, accMode: null, wsrc: 'hand', wind: { twd: 225, tws: 12, src: 'hand' }, accL: [], accLW: {}, tackS: null, gybeS: null, tackLearn: null, gybeLearn: null });
  ok(r.size === '35 ft keelboat' && r.acc && r.acc.s === 7.0, 'A 10.7 m boat takes the 35 ft row; at 12 kn: 7.0 s, as in the sheet', JSON.stringify(r.acc));
  ok(r.polar > 3 && r.V === r.polar, 'Full speed is the polar upwind target at 12 kn', r.polar && r.polar.toFixed(2) + ' kn');
  ok(r.tack && r.tack.s === 7 && r.gybe && r.gybe.s === 3, 'Tack 7 s and gybe 3 s from the sheet for a 35 ft boat', JSON.stringify([r.tack, r.gybe]));
  r = await I({ wind: { twd: 225, tws: 18, src: 'hand' } });
  ok(r.acc.s === 8.2, 'Between columns, 18 kn: halfway between 7.4 (16 kn) and 9.0 (20 kn) = 8.2 s', r.acc.s);
  r = await I({ accSize: 'Sportsboat', wind: { twd: 225, tws: 9, src: 'hand' } });
  ok(r.size === 'Sportsboat' && r.acc.s === 6.0, 'A chosen size wins over the length; Sportsboat at 9 kn = 6.0 s (5.5 to 6.5)', r.acc.s);
  /* learning at 10 kn: blends, then takes over at five */
  r = await I({ wind: { twd: 225, tws: 10, src: 'hand' }, accLW: { 10: [9.0] }, accL: [9.0] });
  ok(Math.abs(r.acc.s - 7.0) < 0.05 && /blended with 1 of 5/.test(r.acc.src), 'One speed-up of 9.0 s at 10 kn moves 6.5 a fifth of the way: 7.0 s', JSON.stringify(r.acc));
  r = await I({ accLW: { 10: [9.0, 8.8, 9.2, 9.0, 9.1] } });
  ok(r.acc.s === 9.0 && /learnt from 5/.test(r.acc.src), 'After five at 10 kn the boat\'s own figure (median 9.0 s) is used', JSON.stringify(r.acc));
  r = await I({ wind: { twd: 225, tws: 20, src: 'hand' } });
  ok(r.acc.s === 10.0 && !/learnt|blended/.test(r.acc.src), 'Learning at 10 kn leaves 20 kn on the sheet\'s figure', JSON.stringify(r.acc));
  /* an own table typed before (8, 12, 16 and 20 kn) keeps its places */
  r = await p.evaluate(() => { FSSolent.accSet({ accMode: 'wind', accW: [5, 6, 7, 8], accW9: null, accLW: {}, accL: [], wind: { twd: 225, tws: 12, src: 'hand' } }); return FSSolent.accInfo(); });
  ok(r.acc.s === 6 && /your table at 12/.test(r.acc.src), 'An own table typed for 8, 12, 16, 20 kn still gives 6 s at 12 kn', JSON.stringify(r.acc));
  r = await I({ accMode: null, accSize: '35 ft keelboat', exL: [], wind: { twd: 225, tws: 12, src: 'hand' } });
  ok(r.exit.e === 0.67 && r.tackBack === 2.3 && r.tackLoss === 0.38, 'Out of a tack at 67% of target: 2.3 s back up to target, 0.38 s lost against sailing at target (35 ft, 12 kn)', JSON.stringify([r.exit, r.tackBack, r.tackLoss]));
  r = await I({ exL: [0.5, 0.52, 0.48, 0.5, 0.51] });
  ok(r.exit.e === 0.5 && /learnt from 5/.test(r.exit.src), 'After five tacks the boat\'s own exit speed (50%) is used', JSON.stringify(r.exit));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
