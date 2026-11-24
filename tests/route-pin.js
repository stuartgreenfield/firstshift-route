/* C2 (Stuart 24 Nov 23:08, "Build C1 and C2"): tap a route and the card stays, the boat goes there (the time slider moves to the point's
   time), 1 h back and forward step along the route, Next mark jumps to the next rounding. Phone upright, real taps.
   Run: node tests/route-pin.js [base] [path] */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + PATH); await p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && F.sel.path && !F.running && !/Refining|Finer routes coming/.test(n); }, null, { timeout: 600000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => document.querySelectorAll('.sheet, .pop').forEach(e => { e.hidden = true; }));
  const pt = await p.evaluate(() => { const F = window.__navFc(), path = F.sel.path, mk = (F.marks || []), far = q => { const a = window.__fsXY(q.la, q.lo); return a[1] > 260 && a[1] < innerHeight * 0.55 && a[0] > 40 && a[0] < innerWidth - 40 && [...document.querySelectorAll('.never')].length === 0; }; let q = null; for (const f of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7]) { const c = path[Math.floor(path.length * f)]; if (c.bsp != null && far(c)) { q = c; break; } } q = q || path[Math.floor(path.length * 0.5)]; return { t: q.t, leg: q.leg || 0, xy: window.__fsXY(q.la, q.lo), id: F.sel.id }; });
  await p.touchscreen.tap(pt.xy[0], pt.xy[1]); await p.waitForTimeout(1200);
  const card = () => p.evaluate(() => { const t = document.getElementById('tip'), h = t && t.querySelector('#tipBody b'); const clk = (document.querySelector('#clock .ckt') || {}).textContent || ''; return { open: !!t && !t.hidden, head: h ? h.textContent : '', clock: clk, steps: !!document.getElementById('tipFwd'), secs: [...document.querySelectorAll('#tip .tipsec')].map(e => e.textContent) }; });
  let k = await card();
  ok(k.open && k.steps, 'a tap on a route opens the card with 1 h back, 1 h forward and Next mark', k);
  const hm = s => (/(\d\d):(\d\d)/.exec(s) || []).slice(1).map(Number), mins = a => a[0] * 60 + a[1];
  ok(hm(k.head).length && mins(hm(k.head)) === mins(hm(k.clock)), 'the boat goes there: the time slider shows the point\'s time', [k.head, k.clock]);
  ok(k.secs.length === 2 && k.secs.every(s => s.indexOf(hm(k.head).map(n => String(n).padStart(2, '0')).join(':')) >= 0), 'the card\'s sections say the same time as the point (C1)', k.secs);
  await p.waitForTimeout(1500); k = await card(); ok(k.open, 'the card stays open', k.open);
  const t0 = mins(hm(k.head));
  await p.tap('#tipFwd'); await p.waitForTimeout(1000); k = await card(); let d = (mins(hm(k.head)) - t0 + 1440) % 1440;
  ok(k.open && d >= 50 && d <= 70, '1 h forward moves the card and the boat on about an hour', [k.head, k.clock, d]);
  ok(mins(hm(k.head)) === mins(hm(k.clock)), 'and the slider follows', [k.head, k.clock]);
  await p.tap('#tipBack'); await p.waitForTimeout(1000); k = await card(); d = (mins(hm(k.head)) - t0 + 1440) % 1440;
  ok(k.open && (d <= 10 || d >= 1430), '1 h back returns', [k.head, d]);
  await p.tap('#tipNext'); await p.waitForTimeout(1000); k = await card();
  const leg = await p.evaluate(() => { const F = window.__navFc(), h = (document.querySelector('#tipBody b') || {}).textContent || ''; return F.sel.path.length; });
  ok(k.open && mins(hm(k.head)) !== t0, 'Next mark jumps along the route to the next rounding', k.head);
  await p.tap('#tipX'); await p.waitForTimeout(500); k = await card(); ok(!k.open, '✕ closes the card', k.open);
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
