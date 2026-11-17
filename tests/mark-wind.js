/* Mark: the wind on the water, typed (direction and speed), feeds the bias, the laylines and Route's Fixed wind route; the Wind and
   tide step of a routed race shows Route's wind and tide box (Stuart 16 Nov: "a neat way of adding wind direction speeds and tide on
   the non connected version"). Run: node tests/mark-wind.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardM'), null, { timeout: 300000 }); await p.waitForTimeout(800);
  await p.click('#solCardM'); await p.waitForTimeout(400); await p.click('#solStep [data-k=plan][data-v=route]'); await p.waitForTimeout(300);
  await p.fill('#solTwd', '225'); await p.dispatchEvent('#solTwd', 'change'); await p.fill('#solTws', '14'); await p.dispatchEvent('#solTws', 'change'); await p.waitForTimeout(300);
  const w = await p.evaluate(() => FSSolent.state().wind); ok(w && w.twd === 225 && w.tws === 14, 'wind direction and speed typed', JSON.stringify(w));
  const fx = await p.evaluate(() => window.__fsFix()); ok(fx.on && +fx.tws === 14 && +fx.twd === 225, "they feed Route's Fixed wind route", JSON.stringify({ on: fx.on, tws: fx.tws, twd: fx.twd }));
  await p.evaluate(() => { FSSolent.set({ start: { code: null, name: 'Start', lat: 50.770, lon: -1.2925 }, marks: FSSolent.board('3F P').marks }); const k = FSSolent.stepState(); }); 
  const steps = await p.evaluate(() => { FSSolent.step(5); return FSSolent.stepState().key; }); ok(steps === 'wt', 'a routed race has the Wind and tide step', steps);
  const box = await p.evaluate(() => { const e = document.getElementById('solFix'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 120) : null; }); ok(box && box.length > 10, "and it shows Route's wind and tide box", box);
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
