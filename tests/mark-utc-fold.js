/* Stuart 22 Nov 16:51: on Mark and Mark+, with the GPS live the time row folds away and a UTC clock stays beside TIME. Run: node tests/mark-utc-fold.js <url> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block', geolocation: { latitude: 50.78, longitude: -1.30 }, permissions: ['geolocation'] });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/'); await p.waitForTimeout(12000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x) x.click(); document.getElementById('liveBtn').click(); });
  await p.waitForFunction(() => document.body.classList.contains('mkfold'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const u = document.getElementById('mkUtc'), t = document.getElementById('time'); return { fold: document.body.classList.contains('mkfold'), utc: u && !u.hidden ? u.textContent : null, slider: !!(t && t.getClientRects().length) }; });
  const now = new Date().toISOString().slice(11, 16);
  ok(r.fold && !r.slider, 'GPS live: the time row folds away', r); ok(r.utc && r.utc.indexOf('UTC') === 0 && r.utc.slice(3, 8) === now, 'A UTC clock shows beside TIME', [r.utc, now]);
  if (process.argv[3]) await p.screenshot({ path: process.argv[3] });
  await p.evaluate(() => document.getElementById('mkTimeBtn').click()); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => { const u = document.getElementById('mkUtc'), t = document.getElementById('time'); return { utcShown: !!(u && !u.hidden), slider: !!(t && t.getClientRects().length) }; });
  ok(r2.slider && !r2.utcShown, 'TIME brings the slider back and the small clock gives way to it', r2);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
