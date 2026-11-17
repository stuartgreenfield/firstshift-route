/* Stuart 17 Nov 13:27: on Mark and Mark+, with the GPS live the time slider and the time row fold away; TIME brings them back.
   Run: node tests/mark-timefold.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + (process.argv[3] || '/mark/'));
  await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const vis = id => p.evaluate(i => { const e = document.getElementById(i); return !!(e && e.getClientRects().length); }, id);
  ok(await vis('time') && !(await vis('mkTimeBtn')), 'no GPS: the slider shows as before');
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); }); await p.click('#liveBtn').catch(() => {}); await p.evaluate(() => { window.__fsSim(true); window.__fsSimFix(50.77, -1.30, 6, 270); }); await p.waitForTimeout(2500);
  const h1 = await p.evaluate(() => document.getElementById('bar').getBoundingClientRect().height);
  ok(!(await vis('time')) && !(await vis('tzRow')) && await vis('mkTimeBtn'), 'GPS live: the slider and the time row fold away, TIME shows', 'bar ' + Math.round(h1));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/timefold.png' });
  await p.click('#mkTimeBtn'); await p.waitForTimeout(1500); ok(await vis('time') && await vis('tzRow'), 'TIME brings them back');
  await p.click('#mkTimeBtn'); await p.waitForTimeout(1500); ok(!(await vis('time')), 'and folds them again');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
