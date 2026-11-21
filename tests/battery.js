/* F102 (Stuart 21 Nov 14:15, "Ok a"): the screen is held on only while the GPS is on (the default); the page says when it must keep
   working in the background (GPS on, boat data, a gun within 20 minutes); on low battery with the GPS on, Save battery is offered and
   only switched by the skipper. Run: node tests/battery.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    const fx = () => ({ coords: { latitude: 50.70, longitude: -1.45, accuracy: 6, speed: 3, heading: 240, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) }; Object.defineProperty(navigator, 'geolocation', { get: () => g });
    window.__wl = 0; const WL = { request: () => { window.__wl++; return Promise.resolve({ release: () => { window.__wl--; return Promise.resolve(); }, addEventListener() {} }); } }; Object.defineProperty(navigator, 'wakeLock', { get: () => WL, configurable: true });
    window.__batt = { charging: false, level: 0.15, addEventListener() {} }; navigator.getBattery = () => Promise.resolve(window.__batt); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/', { timeout: 120000 }); await p.waitForTimeout(9000); await p.mouse.click(200, 300); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById('keepOn').value) === 'gps', 'Keep the screen on is While the GPS is on by default');
  ok(await p.evaluate(() => window.__wl) === 0, 'GPS off: the screen is not held on');
  ok(await p.evaluate(() => window.__fsBusyBg()) === false, 'GPS off, no gun near: free to pause in the background');
  await p.click('#liveBtn'); await p.waitForTimeout(3000);
  const wl1 = await p.evaluate(() => window.__wl); ok(wl1 === 1, 'GPS on: the screen is held on (one wake lock)', wl1);
  ok(await p.evaluate(() => window.__fsBusyBg()) === true, 'GPS on: keeps working in the background');
  /* low battery, not charging, GPS on: the offer (checked every minute; nudged here) */
  await p.evaluate(() => { window.__batt.level = 0.15; }); await p.waitForTimeout(62000);
  const n = await p.evaluate(() => { const e = document.getElementById('battNote'); return e && !e.hidden ? e.textContent : null; });
  ok(!!n && /Battery 15%/.test(n), 'Low battery with the GPS on: Save battery is offered', n && n.slice(0, 90));
  ok(await p.evaluate(() => document.getElementById('gpsMode').value) === 'screen', 'Nothing is switched until the skipper chooses');
  await p.click('#battYes'); await p.waitForTimeout(2500);
  const st = await p.evaluate(() => ({ gm: document.getElementById('gpsMode').value, keep: localStorage.getItem('fs-keepon'), saver: !!window.__fsSaver, wl: window.__wl, on: document.getElementById('liveBtn').getAttribute('aria-pressed') }));
  ok(st.gm === 'battery' && st.keep === 'off' && st.saver && st.wl === 0 && st.on === 'true', 'Save battery: GPS every 20 s, the screen sleeps, the Battery saver on, the GPS still running', JSON.stringify(st));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
