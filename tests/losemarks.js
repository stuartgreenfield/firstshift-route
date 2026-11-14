/* Stuart 14 Nov 20:27: an edited course "came back with no marks". Edit the Cowes Dinard St Malo course (one mark,
   Needles Fairway) in each way the editor allows, then reopen it each way Route reopens a saved course, and count marks.
   Run: node tests/losemarks.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const routed = () => p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 300000 }).catch(() => null);
  const pts = () => p.evaluate(() => window.__fsEditPts());
  const shown = () => p.evaluate(() => { const f = window.__fsCourseFull(); return f.pts.filter(q => q[2] !== 'auto').map(q => q[2]).join(' / '); });
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('fs-myraces') || '[]').map(x => x.id + ':' + x.name + ':' + x.course.marks.map(m => m.name || '(unnamed)').join('+')));
  const drag = async (q, dx, dy) => { await p.mouse.move(q[0], q[1]); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(q[0] + i * dx / 10, q[1] + i * dy / 10); await p.waitForTimeout(30); } await p.mouse.up(); await p.waitForTimeout(800); };

  // 1. drag Needles Fairway, Re-route
  await p.goto(BASE + '/channel-area/?race=dinard'); await routed(); await p.waitForTimeout(1500);
  console.log('opened:', await shown());
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  let e = await pts(); console.log('editor:', e.map(q => q[2]).join(' / '));
  const nf = e.find(x => /Needles/.test(x[2])); await drag(nf, -60, 40); console.log("after drag:", await p.evaluate(() => document.getElementById("edTxt").textContent.slice(0, 80)));
  await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  console.log('after Re-route shown:', await shown()); console.log('saved:', JSON.stringify(await saved()));
  ok(/Needles/.test(await shown()), '1 after Re-route the chart shows Needles Fairway');
  // reload with no address: reopens the last course
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(8000);
  console.log('reload shown:', await shown()); ok(/Needles/.test(await shown()), '1 reload reopens it with its mark');
  // reopen from My races
  const id = (await saved())[0].split(':')[0];
  await p.goto(BASE + '/channel-area/?my=' + id); await p.waitForTimeout(8000);
  console.log('?my shown:', await shown()); ok(/Needles/.test(await shown()), '1 My races reopens it with its mark');
  // from another area page
  await p.goto(BASE + '/cervantes/?my=' + id); await p.waitForTimeout(9000);
  console.log('from cervantes:', p.url(), await shown()); ok(/Needles/.test(await shown()), '1 opened from another page, it keeps its mark');

  // 2. edit again from the reopened course, Course list, Save and route
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  e = await pts(); console.log('editor 2:', e.map(q => q[2]).join(' / ')); ok(e.length === 3, '2 editing the saved course shows its mark', e.length);
  await drag(e[1], 15, 10); await p.click('#edDone'); await p.waitForTimeout(800); await p.click('#edSave'); await p.waitForTimeout(3000); await routed();
  console.log('saved 2:', JSON.stringify(await saved())); ok(/Needles/.test(await shown()), '2 Save and route keeps it', await shown());
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(8000); ok(/Needles/.test(await shown()), '2 reload keeps it', await shown());

  // 3. with the saved course open, draw a new course: the saved one must stay
  await p.goto(BASE + '/channel-area/?my=' + id); await p.waitForTimeout(8000);
  await p.evaluate(() => document.getElementById('rmNew').click()); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('nDraw').click()); await p.waitForTimeout(1500);
  const cv = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  for (const [dx, dy] of [[-120, -40], [0, 60], [140, 120]]) { await p.mouse.click(cv[0] + dx, cv[1] + dy); await p.waitForTimeout(400); }
  console.log('new course points:', JSON.stringify(await pts()));
  await p.click('#edDone'); await p.waitForTimeout(800); await p.fill('#edName', 'Test new course'); await p.click('#edSave'); await p.waitForTimeout(3000); await routed();
  let now = await saved(); console.log('saved 3:', JSON.stringify(now));
  ok(now.length === 2 && now.some(x => x.startsWith(id + ':') && /Needles/.test(x)), '3 a new course is saved beside the Dinard course, not over it', now.length);

  // 4. with a saved course open, pick a RORC race from the race picker, edit and Re-route: the saved courses must stay
  await p.goto(BASE + '/channel-area/?my=' + id); await p.waitForTimeout(8000);
  await p.evaluate(() => { const s = document.getElementById('raceSel'); s.value = 'dinard'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(3000); await routed();
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800); e = await pts();
  await drag(e[1], -30, 20); await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  now = await saved(); console.log('saved 4:', JSON.stringify(now));
  ok(now.length === 3 && now.some(x => x.startsWith(id + ':')), '4 editing a RORC race opened from the picker saves a new course, keeping the others', now.length);

  // 5. Stuart's own steps (20:41): race list, Edit, add marks on the legs, Re-route; then reopen it every way
  await p.goto(BASE + '/channel-area/?race=dinard'); await routed(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  for (let k = 0; k < 2; k++) { const pp = await pts(); const L = pp.length - 2; const lg = [(pp[L][0] * 0.4 + pp[L + 1][0] * 0.6), (pp[L][1] * 0.4 + pp[L + 1][1] * 0.6)]; await p.mouse.click(lg[0], lg[1]); await p.waitForTimeout(500); await p.click('#addPop'); await p.waitForTimeout(500); }
  console.log('5 editor:', (await pts()).map(q => q[2] || 'new').join(' / '));
  await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  now = await saved(); const id5 = now[0].split(':')[0]; console.log('saved 5:', now[0]);
  ok(now[0].split(':')[2].split('+').length === 3, '5 Re-route saves the course with Needles Fairway and the two added marks', now[0]);
  const marks5 = async () => p.evaluate(() => window.__fsCourseFull().pts.filter(q => q[2] !== 'auto').length - 2);
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(8000); ok(await marks5() === 3, '5 reload: three marks', await marks5());
  await p.goto(BASE + '/cervantes/?my=' + id5); await p.waitForTimeout(10000); ok(await marks5() === 3, '5 opened from another page: three marks', p.url() + ' ' + await marks5());
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800); e = await pts(); ok(e.length === 5, '5 editing again shows all five points', e.length);
  await drag(e[2], -40, 25); await p.click('#edGo'); await p.waitForTimeout(3000); await routed();
  ok((await saved()).filter(x => x.startsWith(id5 + ':')).length === 1 && (await saved()).length === now.length, '5 Re-route again updates the same saved course', (await saved()).length);

  ok(!errs.length, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
