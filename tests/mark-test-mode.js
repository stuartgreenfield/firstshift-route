/* Mark test mode (Stuart 17 Nov 05:13), the racing window at the gun (05:30) and the course lock after it (05:41).
   Run: node tests/mark-test-mode.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.click('#solCardT'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => FSSolent.testing() && !!document.getElementById('solTestBar')), 'Test mode starts with its bar showing');
  ok(await p.evaluate(() => window.__navCourse() && window.__navCourse().marks.length >= 2), 'a sample course is on the chart', await p.evaluate(() => window.__navCourse().marks.map(m => m.name.split(' ')[0]).join(',')));
  await p.evaluate(() => { const s = FSSolent.state(); s.startAt = Math.round(Date.now() / 1000 + 4); window.__fsGun(s.startAt); }); await p.waitForTimeout(9000);
  ok(await p.evaluate(() => { const PL = window.__fsPlot || window.__navPlot; return !!(PL && PL.C.on); }), 'at the gun the racing window opens by itself');
  const f1 = await p.evaluate(() => { const f = window.__fsLiveFix && window.__fsLiveFix(); return f && [f.la, f.lo]; }); await p.waitForTimeout(4000); const f2 = await p.evaluate(() => { const f = window.__fsLiveFix && window.__fsLiveFix(); return f && [f.la, f.lo]; });
  ok(f1 && f2 && (f1[0] !== f2[0] || f1[1] !== f2[1]), 'the practice boat sails', JSON.stringify([f1, f2]));
  const pt = await p.evaluate(() => { const e = document.getElementById('fsPlot') || document.getElementById('navPlot'); return e && e.innerText.replace(/\s+/g, ' '); }); ok(/BTW|°T/.test(pt || ''), 'the racing window steers to the next mark', (pt || '').slice(0, 100));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/test-mode.png' });
  /* the course is locked after the gun */
  await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(500);
  const card = await p.evaluate(() => document.getElementById('solCard').innerText.replace(/\s+/g, ' ')); ok(/Race under way/.test(card) && /Edit course/.test(card), 'after the gun the race button says the course is locked, with Edit course', card.slice(0, 120));
  await p.evaluate(() => document.getElementById('solCardX').click());
  const before = await p.evaluate(() => FSSolent.state().marks.length); const m = await p.evaluate(() => { const q = FSSolent.marks().find(x => x.id === '2B'); return window.__fsXY(q.lat, q.lon); }); await p.mouse.click(m[0], m[1]); await p.waitForTimeout(500);
  ok(await p.evaluate(() => FSSolent.state().marks.length) === before, 'a tap on a buoy during the race does not change the course');
  await p.click('#solTestX'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !FSSolent.testing() && !document.getElementById('solTestBar')), 'Stop test mode ends it');
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
