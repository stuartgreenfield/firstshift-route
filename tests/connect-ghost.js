/* Stuart 22 Nov 16:36: on Android, CONNECT BOAT ended on Polars: the phone's delayed copy of the tap hit the Polars button under the finger.
   A Polars tap within 0.7 s of the boat link opening is ignored; a later one opens Polars. Run: node tests/connect-ghost.js <url> [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778', PATHS = process.argv[3] ? [process.argv[3]] : ['/channel-area/?race=cervantes', '/mark/'];
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch();
  for (const P of PATHS) { const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + P); await p.waitForTimeout(12000);
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x) x.click(); }); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const s = document.querySelector('#navStrip .navconnect'); s.click(); const b = document.getElementById('navPolBtn'); if (b) b.click(); const pol = document.getElementById('navPol'); return { panel: !document.getElementById('navPanel').hidden, pol: !!(pol && !pol.hidden) }; });
    ok(r.panel && !r.pol, P + ': CONNECT BOAT, then the same tap again on Polars: the boat link stays', r);
    await p.waitForTimeout(900); const r2 = await p.evaluate(() => { document.getElementById('navPolBtn').click(); const pol = document.getElementById('navPol'); return !!(pol && !pol.hidden); });
    ok(r2, P + ': a deliberate Polars tap a second later opens Polars', r2);
    ok(!errs.length, P + ': no script errors', errs.slice(0, 2)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
