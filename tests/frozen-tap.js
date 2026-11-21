/* F116 (Stuart 21 Nov 17:02, the plane test): a tap made while the page is frozen is dropped when it comes back; the old GPS pill never
   shows while the GPS starts. Run: node tests/frozen-tap.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    const fx = () => ({ coords: { latitude: 50.70, longitude: -1.45, accuracy: 6, speed: 3, heading: 240, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setTimeout(() => ok(fx()), 1500) && setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) }; Object.defineProperty(navigator, 'geolocation', { get: () => g, configurable: true });
    window.__pillSeen = 0; setInterval(() => { const e = document.getElementById('liveBox'); if (e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none') window.__pillSeen++; }, 50); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/', { timeout: 120000 }); await p.waitForTimeout(9000); await p.mouse.click(200, 300); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.body.classList.contains('gpsstrip')), 'The strip is the GPS display from the start');
  await p.click('#liveBtn'); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => window.__pillSeen) === 0, 'Starting the GPS never shows the old pill', await p.evaluate(() => window.__pillSeen));
  const box = await p.locator('#setBtn').boundingBox(); const sheetOpen = () => p.evaluate(() => { const s = document.getElementById('sheet'); return !!(s && !s.hidden); });
  const was = await sheetOpen();
  /* freeze the page for 2.5 s and tap Settings during it */
  await p.evaluate(() => setTimeout(() => { const t = Date.now(); while (Date.now() - t < 3200) {} }, 50)); await p.waitForTimeout(300);
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(4200);
  ok(await sheetOpen() === was, 'A tap made during a 3 s freeze is dropped', 'settings open before/after: ' + was + '/' + (await sheetOpen()));
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(1000);
  ok(await sheetOpen() !== was, 'A normal tap works');
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
