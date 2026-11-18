/* F55 (Stuart 18 Nov 15:49): boat length and "Ping from" fill the phone-to-ping-point distance; a ping called at the bow with the phone at
   the stern lands on the line, not a boat length short. Run: node tests/f55-ping.js http://localhost:8779 [/mark/] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cowes-dinard';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch(); const la = 50.78; let lo = -1.30;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: la, longitude: lo, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsLoa && document.getElementById('liveBtn'), null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const set = (id, v) => p.evaluate(([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('change')); }, [id, v]);
  await set('boatLoa', '10'); await set('pingFrom', 'bow');
  ok(await p.evaluate(() => +document.getElementById('bowOff').value) === 10, 'boat length 10 m, ping from the bow: 10 m from the phone fills in');
  await set('pingFrom', 'stern'); ok(await p.evaluate(() => +document.getElementById('bowOff').value) === 0, 'ping from the stern: 0');
  await set('pingFrom', 'phone'); ok(await p.evaluate(() => +document.getElementById('bowOff').value) === 0, 'where the phone is: 0');
  await set('pingFrom', 'bow');
  const cdp = await ctx.newCDPSession(p); const put = () => cdp.send('Emulation.setGeolocationOverride', { latitude: la, longitude: lo, accuracy: 5, speed: 5 * 1852 / 3600, heading: 90 });
  await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l.getAttribute('aria-pressed') !== 'true') l.click(); }); for (let i = 0; i < 4; i++) { lo += 5 / 3600 / 60 / Math.cos(la * Math.PI / 180); await put(); await p.waitForTimeout(1000); }
  await p.evaluate(() => { const c = document.getElementById('lnClr'); if (c) c.click(); }); await p.evaluate(() => document.getElementById('lnBoat').click()); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ f: window.__fsLiveFix(), l: window.__fsLine() }));
  const dE = (r.l.boat[1] - r.f.lo) * 60 * 1852 * Math.cos(la * Math.PI / 180), dN = (r.l.boat[0] - r.f.la) * 60 * 1852;
  ok(Math.abs(dE - 10) < 0.6 && Math.abs(dN) < 0.6, 'heading east: the ping is 10 m ahead of the phone, where the bow is', { east: dE.toFixed(2), north: dN.toFixed(2) });
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 2)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
