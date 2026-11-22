/* Stuart 22 Nov 09:25 (Mark+): CONNECT BOAT took him to the Polars page. A tap on CONNECT BOAT must open the boat connection, POLARS the
   polars, HELM the helm view. Run: node tests/connect-boat.js http://localhost:8778 [/mark/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778', PATH = process.argv[3] || '/mark/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch();
  for (const [dn, dev] of [['Galaxy Tab', { viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true }], ['Pixel 7', devices['Pixel 7']]]) {
  const c = await b.newContext({ ...dev, serviceWorkers: 'block' }); await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.querySelector('.navstrip .navconnect'), null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { const c = document.getElementById('solCard'); if (c) c.hidden = true; });
  const openNow = () => p.evaluate(() => { const vis = e => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'; const out = []; document.querySelectorAll('h2,h3,b,.navpanel,[role=dialog]').forEach(e => { if (vis(e) && /^(Polars|Boat link|Connect to the boat|Boat connection)/i.test(e.textContent.trim())) out.push(e.textContent.trim().slice(0, 30)); }); return out; });
  const before = await openNow();
  const r = await p.evaluate(() => { const e = document.querySelector('.navstrip .navconnect').getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; });
  await p.mouse.click(r[0], r[1]); await p.waitForTimeout(1000);
  const after = await openNow();
  ok(!after.some(t => /^Polars/i.test(t)) && after.length > before.length, dn + ': CONNECT BOAT opens the boat connection, not Polars', { before, after });
  ok(!errs.length, dn + ': no script errors', errs.slice(0, 2)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
