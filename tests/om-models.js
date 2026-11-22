/* B (Stuart 20 Nov 16:05, 16:18): models more than 18 h old on the server are fetched by name from Open-Meteo on the device. Open-Meteo is answered here
   by the test (the test machine cannot reach it), with the request checked for the model name. The clock is moved 8 hours on so the server runs are stale.
   Run: node tests/om-models.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' }); const asked = [], grid = [];
  await c.route(/googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.route(/api\.open-meteo\.com/, r => { const u = new URL(r.request().url()); const m = u.searchParams.get('models') || 'best'; asked.push(m); const n = u.searchParams.get('latitude').split(',').length; { const la = u.searchParams.get('latitude').split(',').map(Number), lo = u.searchParams.get('longitude').split(',').map(Number); grid.push({ n: Math.max(...la), s: Math.min(...la), e: Math.max(...lo), w: Math.min(...lo), pts: la.length }); }
    const t0 = Math.floor(Date.now() / 3600e3) * 3600 + 8 * 3600; const H = m === 'ukmo_uk_deterministic_2km' ? 55 : 120; const time = [], ws = [], wd = []; for (let i = 0; i < 168; i++) { time.push(t0 + i * 3600); ws.push(i < H ? 6 : null); wd.push(i < H ? 225 : null); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.from({ length: n }, () => ({ hourly: { time, wind_speed_10m: ws, wind_direction_10m: wd } }))) }); });
  await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const meta = await (await c.request.get(BASE + '/channel-area/pack/pack.json')).json(); const runs = meta.layers.filter(l => l.kind === 'wind' && l.run_t0).map(l => l.run_t0); const newest = Math.max(...runs);
  await p.clock.install({ time: (newest + 20 * 3600) * 1000 }); await p.goto(BASE + '/channel-area/?race=myth', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.clock.runFor(30000);
  for (let i = 0; i < 20 && !(await p.evaluate(() => /forecast|Route/.test((document.getElementById('dataChip') || {}).textContent || '') && !/Loading/.test(document.getElementById('dataChip').textContent))); i++) await p.clock.runFor(3000);
  await p.clock.runFor(5000);
  ok(asked.includes('ukmo_uk_deterministic_2km') && asked.includes('ecmwf_ifs025') && asked.includes('gfs_global'), 'each stale model asked of Open-Meteo by name', asked.join(', '));
  ok(!asked.includes('best'), 'not the one blended wind when the pack loaded');
  const tbl = await p.evaluate(() => (document.getElementById('dataTable') || {}).textContent || ''); const nDev = (tbl.match(/this device/g) || []).length;
  ok(nDev >= 5, 'the Data table names the models fetched on this device', nDev + ' rows');
  const note = await p.evaluate(() => (document.getElementById('dataNote') || {}).textContent + ' ' + (document.getElementById('dataChip') || {}).textContent); console.log('note', note.slice(0, 300));
  for (let i = 0; i < 40 && !/Quick route|Routed|Finer/.test(await p.evaluate(() => document.getElementById('runNote').textContent)); i++) await p.clock.runFor(3000);
  ok(/Quick route|Routed|Finer/.test(await p.evaluate(() => document.getElementById('runNote').textContent)), 'Route routes on the models fetched on this device', (await p.evaluate(() => document.getElementById('runNote').textContent)).slice(0, 120));
  /* 22 Nov: the device grid reaches the edges of the forecast area (it stopped short of Sydney Heads) */
  const box = await p.evaluate(async () => { const m = await fetch('pack/pack.json').then(r => r.json()); const d = m.layers.find(l => l.kind === 'depth'); if (!d) return null; const q = d.full || d; const a = q.lat0 + q.dlat * (q.ny - 1), o = q.lon0 + q.dlon * (q.nx - 1); return { s: Math.min(q.lat0, a), n: Math.max(q.lat0, a), w: Math.min(q.lon0, o), e: Math.max(q.lon0, o) }; }).catch(() => null);
  const g = grid[0]; ok(!!(g && box && g.n >= box.n - 1e-6 && g.e >= box.e - 1e-6 && g.s <= box.s + 1e-6 && g.w <= box.w + 1e-6 && g.pts <= 300), 'Device wind grid covers the whole forecast area, at most 300 points', JSON.stringify({ grid: g, box }));
  ok(!errs.length, 'no script errors', JSON.stringify(errs).slice(0, 300)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
