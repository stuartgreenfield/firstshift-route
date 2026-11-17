/* Stuart 17 Nov 09:06 (iPhone photo): "Apple window over input window": typing the wind in Mark's step box, the keyboard covered the
   box. On his Safari the page height shrank with the keyboard. Here the keyboard is stood in for by shrinking the screen while the
   field has the cursor: the box must sit in the part still visible. Run: node tests/kb-shrink.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && document.getElementById('solCardM'), null, { timeout: 300000 }); await p.waitForTimeout(800);
  await p.click('#solCardM'); await p.waitForTimeout(500); await p.focus('#solTwd'); await p.waitForTimeout(200);
  await p.setViewportSize({ width: 390, height: 664 - 330 }); await p.waitForTimeout(900);
  const r = await p.evaluate(() => { const i = document.getElementById('solTwd').getBoundingClientRect(), vv = visualViewport, bx = document.getElementById('solStep').getBoundingClientRect(); return { boxTop: Math.round(bx.top), field: [Math.round(i.top), Math.round(i.bottom)], vis: [Math.round(vv.offsetTop), Math.round(vv.offsetTop + vv.height)], kb: window.__fsKbUp() }; });
  ok(r.boxTop < 120 && r.field[0] >= r.vis[0] && r.field[1] <= r.vis[1], 'with the cursor in the wind field the box sits at the top, the field in sight', JSON.stringify(r));
  await p.evaluate(() => document.activeElement.blur()); await p.setViewportSize({ width: 390, height: 664 }); await p.waitForTimeout(900);
  const back = await p.evaluate(() => { const s = document.getElementById('solStep').getBoundingClientRect(); return Math.round(s.bottom); });
  ok(back > 500, 'with the keyboard gone the box goes back to the foot', back);
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
