/* Stuart 22 Nov 10:32: the GPS menu's big numbers button says 20/20 and opens the 20/20 screen. Run: node tests/gps-menu-2020.js <url> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 50.62, longitude: -1.6 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.getElementById('liveBtn') && document.getElementById('fsDeckBtn'), null, { timeout: 400000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(2500); await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(800);
  const lbl = await p.evaluate(() => { const x = document.querySelector('#gpsMenu [data-g="big"]'); return x ? x.textContent : null; }); ok(lbl === '20/20', 'GPS menu button says 20/20', lbl);
  await p.evaluate(() => document.querySelector('#gpsMenu [data-g="big"]').click()); await p.waitForTimeout(1500);
  const on = await p.evaluate(() => ({ deck: document.getElementById('fsDeckBtn').getAttribute('aria-pressed'), boxes: [...document.querySelectorAll('.dkbox')].filter(x => x.offsetParent).length }));
  ok(on.deck === 'true' && on.boxes === 4, 'It opens the 20/20 screen (four big numbers)', on);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
