/* Route course editor and automatic waypoints (Stuart 14 Nov 18:17: "The bug when editing the course is still there and
   it also loses the courses and won't save or route when used"). Route's own automatic waypoints round the land must
   never become part of a course: moving a mark reports only that mark, Re-route routes, the saved course keeps its own
   marks, and a course saved earlier with stray unnamed waypoints can drop them in one tap.
   Run: node tests/editauto.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const routed = () => p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 300000 });
  const pts = () => p.evaluate(() => window.__fsEditPts());
  const txt = () => p.evaluate(() => document.getElementById('edTxt').textContent);
  await p.goto(BASE + '/channel-area/?race=jog-st-peter-port'); await routed(); await p.waitForTimeout(1500);
  const full = await p.evaluate(() => window.__fsCourseFull().pts);
  ok(full.filter(q => q[2] === 'auto').length >= 2, 'the course needs automatic waypoints round the land', full.length + ' points');
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  let e = await pts(); ok(e.length === 3, 'the editor shows only the course\'s own points', e.map(q => q[2]).join(' / '));
  const q = e.find(x => /Casquets/.test(x[2]));
  await p.mouse.move(q[0], q[1]); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(q[0] - i * 3, q[1] + i * 2); await p.waitForTimeout(30); } await p.mouse.up(); await p.waitForTimeout(800);
  // taps on an existing course: water adds nothing; a leg asks first
  const before = (await pts()).length; const mid = await p.evaluate(() => { const e = window.__fsEditPts(); return [(e[0][0] + e[1][0]) / 2, (e[0][1] + e[1][1]) / 2]; });
  await p.mouse.click(mid[0] + 140, mid[1] - 120); await p.waitForTimeout(600);
  ok((await pts()).length === before, 'a tap on open water adds no mark', (await pts()).length + ' points');
  const pp = await pts(); const lg = [(pp[1][0] + pp[2][0]) / 2, (pp[1][1] + pp[2][1]) / 2];
  await p.mouse.click(lg[0], lg[1]); await p.waitForTimeout(500);
  const ask = await p.evaluate(() => { const b = document.getElementById('addPop'); return b && !b.hidden; });
  ok(ask && (await pts()).length === before, 'a tap on a leg asks first: Add a mark here', String(ask));
  await p.click('#addPop'); await p.waitForTimeout(500);
  ok((await pts()).length === before + 1, 'Add a mark here adds one mark on that leg', (await pts()).length + ' points');
  await p.evaluate(() => document.getElementById('edUndo').click()); await p.waitForTimeout(400);
  ok((await pts()).length === before, 'Undo takes it off again');
  let t = await txt(); ok(/^Course changed\. Casquets moved [\d.]+ nm \w+\. /.test(t), 'moving one mark reports only that mark', t);
  await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  let r = await p.evaluate(() => JSON.parse(localStorage.getItem('fs-myraces') || '[]').map(x => x.course.marks.length));
  ok(r.length === 1 && r[0] === 1, 'Re-route routes and saves the course with its one mark', JSON.stringify(r));
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  e = await pts(); t = await txt(); ok(e.length === 3 && !/Course changed/.test(t), 'editing again shows no false changes', e.length + ' points; ' + t.slice(0, 40));
  await p.evaluate(() => document.getElementById('edCancel').click());
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('fs-myraces')); const x = JSON.parse(JSON.stringify(a[0])); x.course.marks = [{ name: '', lat: 50.727, lon: -1.5048, via: true, must: false }, { name: '', lat: 50.6605, lon: -1.5958, via: true, must: false }].concat(x.course.marks); x.id = 'old1'; a.push(x); localStorage.setItem('fs-myraces', JSON.stringify(a)); });
  await p.goto(BASE + '/channel-area/?my=old1'); await p.waitForTimeout(6000);
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  t = await txt(); ok(/Remove 2 unnamed waypoints/.test(t), 'an old course with stray waypoints offers to remove them', t.slice(-40));
  await p.click('#edStray'); await p.waitForTimeout(500); e = await pts(); t = await txt();
  ok(e.length === 3 && /Waypoint 1 removed; Waypoint 2 removed/.test(t), 'one tap removes them', t.slice(0, 60));
  await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  r = await p.evaluate(() => JSON.parse(localStorage.getItem('fs-myraces')).map(x => x.id + ':' + x.course.marks.length));
  ok(r.length === 2 && r.includes('old1:1'), 'both saved courses kept, the old one now with its one mark', r.join(', '));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
