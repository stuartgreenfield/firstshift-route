/* Stuart 22 Nov 07:55 (decided 08:05): a finish box shows how old its forecast is (amber over 12 h, red over 18 h, older run), and Get newest
   fetches that model's newest run to the device (Open-Meteo, answered here by the test) and routes again; the box then says it is a fresh copy.
   Run: node tests/get-newest.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); let allow = false; const asked = [];
  await c.route(/googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.route(/api\.open-meteo\.com/, r => { if (!allow) return r.fulfill({ status: 503, body: 'busy' }); const u = new URL(r.request().url()); asked.push(u.searchParams.get('models')); const n = u.searchParams.get('latitude').split(',').length;
    const t0 = Math.floor(Date.now() / 3600e3) * 3600 - 2 * 3600, time = [], ws = [], wd = []; for (let i = 0; i < 168; i++) { time.push(t0 + i * 3600); ws.push(7); wd.push(200); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.from({ length: n }, () => ({ hourly: { time, wind_speed_10m: ws, wind_direction_10m: wd } }))) }); });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin .navage').length && document.getElementById('prog').hidden, null, { timeout: 400000 }); await p.waitForTimeout(2500);
  const cards = () => p.evaluate(() => [...document.querySelectorAll('#finBox .fin[data-id]')].filter(d => d.querySelector('.navage')).map(d => ({ id: d.dataset.id, age: (d.querySelector('.navage') || {}).textContent, cls: (d.querySelector('.navage') || {}).className, btn: !!d.querySelector('.navgn') })));
  let cs = await cards(); const ec = cs.find(x => x.id === 'ecmwf') || cs[0];
  ok(cs.length && cs.every(x => /red|amber/.test(x.cls) && x.btn), 'Old forecasts: every box coloured by age, with Get newest', cs.slice(0, 3));
  allow = true; await p.evaluate(id => document.querySelector('#finBox .fin[data-id="' + id + '"] .navgn').click(), ec.id);
  await p.waitForFunction(id => { const d = document.querySelector('#finBox .fin[data-id="' + id + '"] .navage'); return d && /Fresh copy/.test(d.textContent); }, ec.id, { timeout: 400000 }).catch(() => {});
  await p.waitForFunction(() => document.getElementById('prog').hidden && document.querySelectorAll('#finBox .fin').length, null, { timeout: 400000 }).catch(() => {}); await p.waitForTimeout(2000);
  cs = await cards(); const after = cs.find(x => x.id === ec.id);
  ok(asked.length === 1 && after && /Fresh copy on this device/.test(after.age) && /fresh/.test(after.cls) && !after.btn, 'Get newest on ' + ec.id + ': one fetch for that model, box now says fresh copy, button gone', { asked, after });
  ok(cs.filter(x => x.id !== ec.id).every(x => /red|amber/.test(x.cls)), 'The other models still show their own age', cs.filter(x => x.id !== ec.id).slice(0, 2));
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
