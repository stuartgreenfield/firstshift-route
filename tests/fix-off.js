/* F17 (Stuart 17 Nov 09:01): "Fixed wind on route products should turn off at the start of new courses and races so it doesn't create odd routes".
   Reopening the same race keeps it. Run: node tests/fix-off.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 300000 }); await p.waitForTimeout(800);
  await p.evaluate(() => window.__fsFix.set({ on: true, tws: 15, twd: 200 })); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__fsFix().on), 'Fixed wind on for this race');
  await p.reload(); await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel; }, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__fsFix().on), 'reopening the same race keeps it');
  const other = await p.evaluate(() => { const s = document.getElementById('raceSel'); const o = [...s.options].find(x => x.value && x.value !== s.value && !/wider/.test(x.textContent)); return o && o.value; });
  await p.evaluate(v => { const s = document.getElementById('raceSel'); s.value = v; s.dispatchEvent(new Event('change')); }, other); await p.waitForTimeout(3000);
  const st = await p.evaluate(() => ({ on: window.__fsFix().on, page: location.pathname }));
  ok(!st.on, 'a different race turns Fixed wind off', other + ' ' + JSON.stringify(st));
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
