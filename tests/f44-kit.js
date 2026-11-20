/* F44 part 2 (Stuart 18 Nov 07:29, 15:25): Mark's start kit in Route. Class gun set in Route: the sequence bar comes 15 minutes before it,
   the Start screen button in the GPS window opens the start screen, START SEQUENCE / STOP RACE buttons as Mark, default 5-4-1-0, no Solent
   cards or marks. Run: node tests/f44-kit.js http://localhost:8779 [/channel-area/] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cowes-dinard', SHOT = process.argv[4] || '';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
const vis = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return !!(e && !e.hidden && e.getClientRects().length); }, id);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: 50.775, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsGun && window.FSSolent, null, { timeout: 60000 }); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !!(window.FSSolent.kit && !window.FSSolent.isOn())), 'Route runs the start kit only (Solent off)');
  await p.evaluate(() => window.__fsGun(Math.round(Date.now() / 1000) + 12 * 60)); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => Math.abs(window.FSSolent.state().startAt - window.__fsGunAt()) < 2), 'the kit gun is Route\'s class start');
  ok(await vis(p, 'solSeq'), 'sequence bar shows 12 minutes before the gun');
  ok(await p.evaluate(() => /5-4-1-0/.test(document.getElementById('solSeq').textContent) || window.FSSolent.state().seq == null), 'default sequence 5-4-1-0');
  await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l.getAttribute('aria-pressed') !== 'true') l.click(); }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => !!document.getElementById('lnSS')), 'Start screen button in the GPS window');
  await p.evaluate(() => document.getElementById('lnSS').click()); await p.waitForTimeout(1500);
  ok(await vis(p, 'solStartScr'), 'Start screen opens from the GPS window');
  /* the RYS line pinged: flagstaff and 300 m out on 346 degrees */
  await p.evaluate(() => { window.__fsSetLine('boat', 50.76673, -1.30092); window.__fsSetLine('pin', 50.76673 + 0.3 / 111.2 * Math.cos(346 * Math.PI / 180), -1.30092 + 0.3 / 111.2 * Math.sin(346 * Math.PI / 180) / Math.cos(50.767 * Math.PI / 180)); }); await p.waitForTimeout(2500);
  const cells = await p.evaluate(() => document.getElementById('solStartScr').textContent);
  ok(/WIND\s*\d{3}°/i.test(cells.replace(/\s+/g, ' ').replace(/Wind/, 'WIND')) || /Wind\d{3}°/.test(cells), 'start screen wind from the forecast', cells.replace(/\s+/g, ' ').slice(0, 300));
  if (SHOT) await p.screenshot({ path: SHOT });
  /* the line dialog: RYS preset, typed, bearing and length, two taps */
  await p.evaluate(() => { const s = document.getElementById('solStartScr'); if (s) s.hidden = true; window.__fsLineSet(); }); await p.waitForTimeout(400);
  ok(await vis(p, 'kitLine'), 'Set line dialog opens');
  if (SHOT) await p.screenshot({ path: SHOT.replace('.png', '-line.png') });
  /* 20 Nov: the RYS line is two buttons, East and West (Stuart 05:14, 05:37); East keeps the flagstaff as the boat end, West swaps the ends */
  await p.click('#klRYSE'); await p.waitForTimeout(300);
  let L = await p.evaluate(() => window.__fsLine());
  const brg = Math.atan2((L.pin[1] - L.boat[1]) * Math.cos(L.boat[0] * Math.PI / 180), L.pin[0] - L.boat[0]) * 180 / Math.PI;
  ok(Math.abs(L.boat[0] - 50.766733) < 1e-5 && Math.abs(((brg + 360) % 360) - 346) < 0.5, 'RYS line, start to the East: flagstaff boat end, 346 degrees', { boat: L.boat, brg: brg.toFixed(1) });
  await p.click('#klRYSW'); await p.waitForTimeout(300); L = await p.evaluate(() => window.__fsLine());
  ok(Math.abs(L.pin[0] - 50.766733) < 1e-5 && L.boat[0] > L.pin[0], 'RYS line, start to the West: flagstaff pin end, outer end the boat end', { boat: L.boat, pin: L.pin });
  await p.evaluate(() => window.__fsLineSet()); await p.fill('#klB', '50 46.00N 001 18.00W'); await p.fill('#klP', ''); await p.fill('#klBr', '0'); await p.fill('#klLen', '500'); await p.click('#klSet'); await p.waitForTimeout(300);
  L = await p.evaluate(() => window.__fsLine());
  ok(Math.abs(L.boat[0] - (50 + 46 / 60)) < 1e-5 && Math.abs((L.pin[0] - L.boat[0]) * 60 * 1852 - 500) < 2, 'typed boat end with bearing and length', L);
  await p.evaluate(() => window.__fsLineSet()); await p.click('#klTap');
  ok(await p.evaluate(() => window.__fsKitTap(50.77, -1.31) && window.__fsKitTap(50.771, -1.305)), 'two taps on the chart set the line');
  L = await p.evaluate(() => window.__fsLine());
  ok(Math.abs(L.boat[0] - 50.77) < 1e-6 && Math.abs(L.pin[1] + 1.305) < 1e-6, 'tapped ends saved', L);
  ok(!(await vis(p, 'solCard')) && !(await p.evaluate(() => window.FSSolent.marks())), 'no Solent card or marks in Route');
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 3));
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
