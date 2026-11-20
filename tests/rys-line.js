/* RYS line East and West, Edit an end by buoy, ping or tap (Stuart 20 Nov 05:14, 05:37); Solent buoys on Route in an offshore race while the
   boat is between Poole Harbour and the Nab (05:30). Run: node tests/rys-line.js http://localhost:8779 [/channel-area/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PG = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let marksAsked = 0; p.on('request', r => { if (/solent-marks\.json/.test(r.url())) marksAsked++; });
  await p.goto(BASE + PG); await p.waitForFunction(() => window.__fsLineSet && window.__fsLine && window.__fsKitTap, null, { timeout: 120000 }); await p.waitForTimeout(3000);
  /* Solent buoys: not out of the area; on the chart once the boat is in it */
  await p.evaluate(() => { window.__fsLiveFix = () => ({ la: 50.40, lo: -3.5, at: Date.now() }); window.__fsRedraw(); }); await p.waitForTimeout(1500);
  const outA = await p.evaluate(() => FSSolent.area()), out = marksAsked;
  await p.evaluate(() => { window.__fsLiveFix = () => ({ la: 50.78, lo: -1.30, at: Date.now() }); window.__fsRedraw(); }); await p.waitForTimeout(2500);
  await p.evaluate(() => window.__fsRedraw()); await p.waitForTimeout(800);
  ok(!outA && out === 0, 'out of the area (off Start Point): no Solent buoys', { outA, out });
  ok(await p.evaluate(() => FSSolent.area()) && marksAsked === 1, 'boat off Cowes: the Solent buoys on the chart', marksAsked);
  await p.evaluate(() => { const k = document.getElementById('kitLine'); if (k) k.hidden = true; window.__fsFitBox(50.74, 50.82, -1.36, -1.24); }); await p.waitForTimeout(1200); await p.screenshot({ path: (process.env.OUT || '/tmp') + '/rys-area.png' });
  await p.evaluate(() => { window.__fsLiveFix = () => ({ la: 50.78, lo: -1.30, at: Date.now() - 300000 }); }); ok(!(await p.evaluate(() => FSSolent.area())), 'a fix over two minutes old: not shown');
  const FL = [50.766733, -1.300917];
  const ends = () => p.evaluate(() => { const l = window.__fsLine(); return { boat: l.boat, pin: l.pin, open: !document.getElementById('kitLine').hidden, txt: document.getElementById('kitLine').innerText }; });
  await p.evaluate(() => window.__fsLineSet());
  ok(await p.evaluate(() => !!document.getElementById('klRYSW') && !!document.getElementById('klRYSE') && !document.getElementById('klRYS')), 'two RYS buttons, West and East');
  await p.click('#klRYSW'); await p.waitForTimeout(400); let e = await ends();
  const near = (a, q) => a && Math.abs(a[0] - q[0]) < 1e-5 && Math.abs(a[1] - q[1]) < 1e-5;
  ok(near(e.pin, FL) && e.boat && e.boat[0] > FL[0] + 0.015, 'West: pin end the Squadron, boat end the outer end', e.boat && e.boat.map(v => +v.toFixed(5)));
  ok(e.open && /Edit the line/.test(e.txt), 'the box stays open with Edit the line');
  await p.click('#klRYSE'); await p.waitForTimeout(400); e = await ends();
  ok(near(e.boat, FL) && e.pin && e.pin[0] > FL[0] + 0.015, 'East: boat end the Squadron, pin end the outer end');
  /* Edit: the pin end from the list */
  await p.click('[data-ke="list"][data-end="pin"]'); await p.waitForTimeout(800); await p.fill('#klFind', '3W'); await p.waitForTimeout(300);
  await p.click('[data-ke="pick"][data-id="3W"]'); await p.waitForTimeout(400); e = await ends();
  ok(near(e.pin, [50.786667, -1.309167]) && /3W Williams Shipping/.test(e.txt), 'Buoy from list: pin end on 3W Williams Shipping', e.pin);
  /* Edit: the boat end by a tap on the chart */
  await p.click('[data-ke="tap"][data-end="boat"]'); await p.waitForTimeout(300); const hid = await p.evaluate(() => document.getElementById('kitLine').hidden);
  const t = await p.evaluate(() => window.__fsKitTap(50.7700, -1.3000)); await p.waitForTimeout(400); e = await ends();
  ok(hid && t && near(e.boat, [50.77, -1.3]) && near(e.pin, [50.786667, -1.309167]), 'Tap chart: only the boat end moves', e.boat);
  ok(await p.evaluate(() => !!document.querySelector('[data-ke="ping"][data-end="boat"]') && !!document.querySelector('[data-ke="ping"][data-end="pin"]')), 'Ping for each end');
  await p.evaluate(() => { document.getElementById('kitLine').hidden = true; });
  await p.screenshot({ path: (process.env.OUT || '/tmp') + '/rys-line.png' });
  /* JOG line (Stuart 20 Nov 09:08): Gurnard north cardinal (3U) on 170 degrees to the shore; the shore end is a tap snapped onto that line */
  const G = [50.770333, -1.314], sh = [50.7640, -1.3115];
  await p.evaluate(() => window.__fsLineSet()); await p.click('#klJOGW'); await p.waitForTimeout(1200);
  await p.evaluate((sh) => window.__fsKitTap(sh[0], sh[1]), sh); await p.waitForTimeout(500); let J = await p.evaluate(() => window.__fsLine());
  const jb = Math.atan2((J.pin[1] - J.boat[1]) * Math.cos(J.boat[0] * Math.PI / 180), J.pin[0] - J.boat[0]) * 180 / Math.PI;
  ok(near(J.boat, G) && Math.abs(((jb + 360) % 360) - 170) < 0.2, 'JOG line, West: boat end the Gurnard buoy, the tapped shore end snapped onto 170 degrees', { brg: +((jb + 360) % 360).toFixed(2), pin: J.pin.slice(0, 2).map(v => +v.toFixed(5)) });
  await p.evaluate(() => window.__fsLineSet()); await p.click('#klJOGE'); await p.waitForTimeout(800); await p.evaluate((sh) => window.__fsKitTap(sh[0], sh[1]), sh); await p.waitForTimeout(500); J = await p.evaluate(() => window.__fsLine());
  ok(near(J.pin, G), 'JOG line, East: the buoy is the pin end');
  ok(!errs.length, 'no script errors', errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
