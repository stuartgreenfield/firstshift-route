/* F44 cures (Stuart 18 Nov, iPhone): Route's time to burn was blank. A ping with no GPS fix said nothing; two ends in one place were
   accepted; stopped near the line there was no time to burn. Run: node tests/f44-cures.js http://localhost:8779 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch(); const la0 = 50.78, lo0 = -1.30;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: la0, longitude: lo0, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=cowes-dinard', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsLiveFix && document.getElementById('liveBtn'), null, { timeout: 60000 }); await p.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(p); let la = la0, lo = lo0;
  const put = (sog, cog) => cdp.send('Emulation.setGeolocationOverride', { latitude: la, longitude: lo, accuracy: 5, speed: sog * 1852 / 3600, heading: cog });
  await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l.getAttribute('aria-pressed') !== 'true') l.click(); }); await put(0, 0); await p.waitForTimeout(2500);
  await p.evaluate(() => { const c = document.getElementById('lnClr'); if (c) c.click(); });
  await p.click('#lnBoat'); await p.waitForTimeout(400);
  ok(!!(await p.evaluate(() => window.__fsLine().boat)), 'ping boat end saved');
  lo = lo0 + 0.0001; await put(0, 0); await p.waitForTimeout(1500); await p.click('#lnPin'); await p.waitForTimeout(400);
  let s = await p.evaluate(() => ({ pin: !!window.__fsLine().pin, busy: document.getElementById('busy').textContent }));
  ok(!s.pin && /m from the other end: the pin end was not saved/.test(s.busy), 'pin 7 m from the boat end refused, with a message', s);
  /* sail 6 kn west for 40 s, then ping the pin 300 m on */
  for (let i = 0; i < 40; i++) { lo -= 6 / 3600 / 60 / Math.cos(la * Math.PI / 180); await put(6, 270); await p.waitForTimeout(250); }
  lo = lo0 - 0.0045; await put(6, 270); await p.waitForTimeout(1200); await p.click('#lnPin'); await p.waitForTimeout(400);
  ok(!!(await p.evaluate(() => window.__fsLine().pin)), 'pin 320 m away saved');
  /* stop 200 m on the pre-start side (north: the course goes south) */
  la = la0 + 0.0018; lo = lo0 - 0.002; for (let i = 0; i < 4; i++) { await put(0, 0); await p.waitForTimeout(1000); }
  const txt = await p.evaluate(() => document.getElementById('liveBox').textContent);
  ok(/at your good speed \(\d+\.\d kn\)/.test(txt) && /time to burn/.test(txt), 'stopped near the line: time to burn shown at your good speed', txt.slice(0, 260));
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 2)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
