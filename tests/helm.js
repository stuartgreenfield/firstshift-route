/* Stuart 22 Nov 10:36: HELM on Route and Mark from the GPS menu: 3, 6 and 9 figures, PLAN figures dimmer, red, close; nothing spills
   off the screen in portrait or landscape. Run: node tests/helm.js <url> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 50.62, longitude: -1.6 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.getElementById('liveBtn') && document.getElementById('fsDeckBtn'), null, { timeout: 400000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(2500); await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('#gpsMenu [data-g="helm"]').click()); await p.waitForTimeout(1500);
  /* the longest real values each figure can show, so the sizes are tested on real widths, not on '--' */
  await p.evaluate(() => { window.__fsLiveFix = () => ({ la: 50.6, lo: -1.6, sog: 12.4, cog: 247, acc: 5, at: Date.now() }); window.__fsLiveCalc = () => ({ mark: { to: { brg: 213, nm: 14.6 }, name: 'East Lepe', n: 3 }, xte: { d: 1.3, side: 'L' }, ahead: -128 }); window.__fsPlanNow = () => ({ twa: -142, tws: 22.4, bsp: 9.8, sail: 'A2, 1 reef' }); window.FSHelm.draw(); }); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => { const h = document.getElementById('fsHelm'); if (!h || h.hidden) return null; const W = innerWidth, H = innerHeight;
    const cells = [...h.querySelectorAll('.fhgrid>div')].map(d => { const b = d.querySelector('b'), r = b.getBoundingClientRect(), cr = d.getBoundingClientRect(); return { l: d.querySelector('span').textContent, v: b.textContent, plan: d.classList.contains('plan'), op: getComputedStyle(d).opacity, fits: b.scrollWidth <= cr.width + 1 && r.bottom <= H + 1 && r.right <= W + 1 }; });
    return { n: cells.length, cells, utc: h.querySelector('#fhUtc').textContent, red: h.classList.contains('red') }; });
  let s = await st(); ok(s && s.n === 3 && s.cells.map(c => c.l).join() === 'SOG,COG,MARK' && s.cells.every(c => c.fits), 'HELM opens with SOG, COG and MARK, all on screen', s && s.cells);
  ok(s && /^UTC \d\d:\d\d:\d\d$/.test(s.utc), 'UTC clock shows', s && s.utc);
  for (const k of [6, 9]) { await p.evaluate(k => document.querySelector('#fsHelm [data-n="' + k + '"]').click(), k); await p.waitForTimeout(1200); s = await st();
    const pl = s.cells.filter(c => c.plan); ok(s.n === k && pl.length >= 3 && pl.every(c => +c.op < 0.8) && s.cells.filter(c => !c.plan).every(c => +c.op === 1), k + ' figures: plan figures (TWA, TWS, SAIL...) dimmer than the GPS ones', s.cells.map(c => c.l + (c.plan ? '*' : '') + '=' + c.v));
    ok(s.cells.every(c => c.fits), k + ' figures: every figure fits its box, portrait', s.cells.filter(c => !c.fits)); }
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(1200); s = await st(); ok(s.cells.every(c => c.fits), '9 figures fit in landscape', s.cells.filter(c => !c.fits));
  await p.evaluate(() => document.getElementById('fhRed').click()); await p.waitForTimeout(500); s = await st(); ok(s.red, 'RED turns the night screen on', s.red);
  await p.evaluate(() => document.getElementById('fhX').click()); await p.waitForTimeout(500); s = await st(); ok(s === null, 'Close returns to the chart');
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
