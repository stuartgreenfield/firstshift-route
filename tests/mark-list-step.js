/* Stuart 17 Nov 09:25 (tablet photo): the step box sat over All the buoys. While the list is open the step box steps aside and comes
   back when the list closes. Run: node tests/mark-list-step.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 600, height: 960 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500);
  await p.click('#solCardM, [data-type=marks], #solCard .solcards .btn').catch(() => {}); await p.waitForTimeout(800);
  const vis = id => p.evaluate(i => { const e = document.getElementById(i); return !!(e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'); }, id);
  for (let i = 0; i < 4 && !(await p.$('#solStep [data-k=list], #solStep button:has-text("List of buoys")')); i++) { await p.click('#solStep button:has-text("Next")').catch(() => {}); await p.waitForTimeout(400); }
  await p.click('#solStep button:has-text("A buoy or point")').catch(() => {}); await p.waitForTimeout(400);
  console.log("STEP", await p.evaluate(() => { const e = document.getElementById("solStep"); return e ? e.hidden + " " + e.innerText.replace(/\s+/g, " ").slice(0, 200) : "none"; }));
  const step0 = await vis('solStep'); const lb = await p.$('#solStep button:has-text("List of buoys")');
  ok(step0 && lb, 'the step box shows List of buoys');
  if (lb) await lb.click(); await p.waitForTimeout(600);
  ok(await vis('solList') && !(await vis('solStep')), 'with the list open the step box steps aside');
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/list-open.png' });
  await p.click('#solListX'); await p.waitForTimeout(500);
  ok(!(await vis('solList')) && await vis('solStep'), 'closing the list brings the step box back');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
