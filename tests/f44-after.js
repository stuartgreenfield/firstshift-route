/* Stuart 18 Nov 17:55: offshore (Route and Route+), the start sequence, start screen and race buttons go after the start, the buttons
   5 minutes after the gun. Run: node tests/f44-after.js <base> */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch();
  for (const ago of [120, 420]) {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cowes-dinard'); await p.waitForFunction(() => window.__fsGun && window.FSSolent, null, { timeout: 60000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l.getAttribute('aria-pressed') !== 'true') l.click(); window.__fsSetLine('boat', 50.775, -1.297); window.__fsSetLine('pin', 50.775, -1.3027); });
    await p.evaluate(a => window.__fsGun(Math.round(Date.now() / 1000) - a), ago); await p.waitForTimeout(3000);
    const s = await p.evaluate(() => { const v = i => { const e = document.getElementById(i); return !!(e && !e.hidden && e.getClientRects().length); }; return { seq: v('solSeq'), ss: v('solStartScr'), rb: v('solRaceBtns') }; });
    ok(!s.seq && !s.ss, (ago / 60) + ' min after the gun: no sequence bar or start screen', s);
    ok(ago < 300 ? s.rb : !s.rb, (ago / 60) + ' min after the gun: race buttons ' + (ago < 300 ? 'still there' : 'gone'), s);
    ok(!p.errs.length, 'no script errors', p.errs.slice(0, 2)); await c.close(); }
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); })();
