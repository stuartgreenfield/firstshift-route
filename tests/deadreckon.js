/* Stuart 15 Nov 2026 09:13: when the GPS is lost the boat carries on by dead reckoning from the last course and speed, with a
   warning; the switch in Settings turns it off. A fake GPS feeds Route, then stops. Run: node tests/deadreckon.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1');
    const W = {}; let id = 0;
    window.__gps = (la, lo, kn, cog) => Object.values(W).forEach(w => w({ coords: { latitude: la, longitude: lo, accuracy: 5, speed: kn / 1.94384, heading: cog }, timestamp: Date.now() }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => ({ watchPosition: (ok) => { W[++id] = ok; return id; }, clearWatch: (i) => { delete W[i]; }, getCurrentPosition: () => {} }) });
  });
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(8000);
  ok(await p.evaluate(() => document.getElementById('drOn') && document.getElementById('drOn').checked), 'dead reckoning is on by default (Course tab)');
  await p.evaluate(() => window.__navLiveOn()); await p.waitForTimeout(500);
  // sail east at 6 kn for a few fixes, near the Needles channel
  let la = 50.70, lo = -1.60;
  for (let i = 0; i < 4; i++) { await p.evaluate(([a, o]) => window.__gps(a, o, 6, 90), [la, lo]); lo += 6 / 3600 / 60 / Math.cos(la * Math.PI / 180); await p.waitForTimeout(1000); }
  ok(!(await p.evaluate(() => window.__fsDR().active)), 'with GPS arriving there is no reckoning');
  const lastLo = lo - 6 / 3600 / 60 / Math.cos(la * Math.PI / 180);
  await p.waitForTimeout(13000);   // no fixes for 13 s
  let d = await p.evaluate(() => window.__fsDR());
  ok(d.active, 'after 10 s with no fix the boat is dead reckoned', JSON.stringify(d.fix && { cog: Math.round(d.fix.cog), sog: d.fix.sog && d.fix.sog.toFixed(1), src: d.fix.src }));
  ok(d.fix && Math.abs(d.fix.cog - 90) < 2 && Math.abs(d.fix.sog - 6) < 0.3, 'it carries on at the last course and speed (090°, 6 kn)');
  ok(d.fix && d.fix.lo > lastLo + 0.0004 && Math.abs(d.fix.la - la) < 0.0002, 'the reckoned position has moved east from the last fix', (d.fix.lo - lastLo).toFixed(5));
  const box = await p.evaluate(() => (document.querySelector('#liveBox .lvdr') || {}).textContent || '');
  ok(/DEAD RECKONING: no GPS for/.test(box) && /Position good to about/.test(box), 'the warning says dead reckoning, for how long, and how good', box.slice(0, 120));
  await p.screenshot({ path: '/tmp/claude-0/sh/dr.png' });
  // GPS back, 100 m north of the reckoning
  const back = await p.evaluate(() => { const f = window.__fsDR().fix; window.__gps(f.la + 0.0009, f.lo, 6, 90); return window.__fsDR(); });
  ok(!back.active && /GPS back after/.test(back.msg || '') && back.last && Math.abs(back.last.err * 1852 - 100) < 15, 'GPS back: reckoning ends and says how far out it was', back.msg);
  // switched off: no reckoning
  await p.evaluate(() => { const d = document.getElementById('drOn'); d.checked = false; d.onchange(); }); await p.waitForTimeout(12500);
  ok(!(await p.evaluate(() => window.__fsDR().active)), 'switched off, a lost GPS is not reckoned');
  ok(await p.evaluate(() => localStorage.getItem('fs-drOn')) === '0', 'the switch is remembered');
  ok(!errs.length, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
