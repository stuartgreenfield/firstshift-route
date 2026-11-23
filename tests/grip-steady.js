/* The six-dot handles stay steady (Stuart 23 Nov 07:38, Android tablet: "The handle (six dots) is appearing on and off on screen").
   Something lies over the top of the Layers box and comes and goes every half second, as the Routing card did as its per cent changed:
   the handle must not flicker with it. Closing the box still takes the handle away at once. node tests/grip-steady.js [base] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL ' + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); } };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 800, height: 1200 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-finesec', '0'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/fastnet/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  await p.evaluate(() => document.querySelectorAll('.pop, .sheet, #setupCard').forEach(e => { if (e.id !== 'layers') e.hidden = true; }));
  await p.click('#layersBtn'); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => { const g = document.getElementById('grip-layers'); return !!g && !g.hidden; }), 'the Layers box has its handle');
  await p.evaluate(() => { const L = document.getElementById('layers').getBoundingClientRect(), d = document.createElement('div'); d.id = 'cover'; d.style.cssText = 'position:fixed;z-index:9999;background:#345;left:' + (L.left + L.width / 2 - 40) + 'px;top:' + L.top + 'px;width:80px;height:20px';
    document.body.appendChild(d); let on = true; window.__ct = setInterval(() => { on = !on; d.style.display = on ? 'block' : 'none'; }, 500);
    window.__gf = 0; let last = !document.getElementById('grip-layers').hidden; window.__gt = setInterval(() => { const v = !document.getElementById('grip-layers').hidden; if (v !== last) window.__gf++; last = v; }, 100); });
  await p.waitForTimeout(12000);
  const flips = await p.evaluate(() => window.__gf);
  ok(flips <= 2, 'with something coming and going over it every half second for 12 s, the handle switches at most twice (was every second or so)', flips);
  await p.evaluate(() => { clearInterval(window.__ct); document.getElementById('cover').remove(); }); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !document.getElementById('grip-layers').hidden), 'once nothing covers it, the handle is back within 3 s');
  await p.click('#layersBtn'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById('layers').hidden && document.getElementById('grip-layers').hidden), 'closing the box takes its handle away at once (0.7 s)');
  ok(!errs.length, 'no script errors', errs);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
