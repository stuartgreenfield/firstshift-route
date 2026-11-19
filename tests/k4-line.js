/* K4 (Mark review, 19 Nov 2026): the start-line calculation in hand-worked cases. A line 400 m long running due east from 50.770 N 1.300 W,
   the course side north. Fixes are given by the simulator. Run: node tests/k4-line.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.__fsLineCalc && window.__fsSetLine && window.__fsSim && window.FSSolent, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  const k = Math.cos(50.77 * Math.PI / 180), pinLo = -1.30 + 400 / 1852 / 60 / k, mLat = m => m / 1852 / 60, mLon = m => m / 1852 / 60 / k;
  await p.evaluate(([pl]) => { window.__fsSetLine('boat', 50.77, -1.30); window.__fsSetLine('pin', 50.77, pl); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.77, lon: (-1.30 + pl) / 2, line: true }, marks: [{ code: null, name: 'N', lat: 50.80, lon: -1.29, side: 'port' }], fin: 'start', finish: null, plan: 'list' }); FSSolent.go(); window.__fsSim(true); }, [pinLo]);
  const at = async (la, lo, kn, cog) => { await p.evaluate(([a, o, s, g]) => window.__fsSimFix(a, o, s, g), [la, lo, kn, cog]); await p.waitForTimeout(400); return p.evaluate(() => { const r = window.__fsLineCalc(Date.now() / 1000 + 300); return { d: r.d != null ? Math.round(r.d * 1852) : null, ttl: r.ttl != null ? Math.round(r.ttl) : null, miss: !!r.miss, stale: !!r.stale, over: !!r.over }; }); };
  /* 1. 200 m below the middle, heading straight at it (000) at 6 kn: 200 m at 3.087 m/s = 65 s */
  let r = await at(50.77 - mLat(200), -1.30 + mLon(200), 6, 0); ok(Math.abs(r.d - 200) <= 3 && Math.abs(r.ttl - 65) <= 2, 'Square approach: 200 m, 65 s at 6 kn', r);
  /* 2. the same place, heading 045: crosses 200 m along, at 400 m: inside, just: d 200 m, speed square to the line 6 cos 45 */
  r = await at(50.77 - mLat(200), -1.30 + mLon(150), 6, 45); ok(!r.miss && Math.abs(r.ttl - 92) <= 3, 'At 45°, crossing inside the ends: 200 m / (6 kn x cos 45) = 92 s', r);
  /* 3. heading 080 from 100 m below the boat end's east side: the track crosses the line's extension beyond the pin: misses, no countdown */
  r = await at(50.77 - mLat(100), -1.30 + mLon(300), 6, 80); ok(r.miss && r.ttl == null, 'Track that crosses beyond the pin: "misses the line", no countdown', r);
  /* 4. 300 m west of the boat end on the line's extension, heading east at 6 kn straight at the end: distance to the end 300 m, 97 s */
  r = await at(50.77, -1.30 - mLon(300), 6, 90); ok(Math.abs(r.d - 300) <= 3 && Math.abs(r.ttl - 97) <= 3, 'Outside the ends, heading at the end: distance and time to that end (300 m, 97 s)', r);
  /* 5. a fix more than 5 s old: no countdown */
  await p.waitForTimeout(6500); r = await p.evaluate(() => { const r = window.__fsLineCalc(Date.now() / 1000 + 300); return { stale: !!r.stale, ttl: r.ttl }; }); ok(r.stale && r.ttl == null, 'A GPS fix more than 5 s old: no countdown', r);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
