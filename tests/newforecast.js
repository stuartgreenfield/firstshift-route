/* Found 13 Nov 2026 (Stuart's phone): after loading another course, the app jumped back to the area's default race when a new
   forecast arrived. Check: open a different RORC race and also an own course, let a new forecast arrive, and the course stays.
   Run: node tests/newforecast.js http://localhost:8769 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch();
  for (const kind of ['race', 'own']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { localStorage.setItem('fs-terms', '2026-11-13'); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    let bump = false;
    await ctx.route('**/channel-area/pack/pack.json*', async (route) => { const r = await route.fetch(); const j = await r.json(); if (bump) { j.built = (j.built || j.t0) + 3600; } await route.fulfill({ response: r, json: j }); });
    const p = await ctx.newPage(); await p.clock.install();
    await p.goto(BASE + '/channel-area/?race=morgan');
    await p.clock.runFor(1000);
    await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 240000 });
    if (kind === 'race') await p.evaluate(() => { const sel = document.getElementById('raceSel'); const other = [...sel.options].map(o => o.value).find(v => v !== sel.value); sel.value = other; sel.onchange(); });
    else {
      /* an own course, saved on this device and opened: the Morgan course moved 2 nm south, named Test own course */
      const id = await p.evaluate(() => { const c = window.__navCourse(); const mv = q => Object.assign({}, q, { lat: q.lat - 0.033 }); const course = { name: 'Test own course', start: mv(c.start), marks: c.marks.map(mv), finish: Object.assign(mv(c.finish), { radius_nm: 0.4 }) };
        const a = JSON.parse(localStorage.getItem('fs-myraces') || '[]'); a.unshift({ id: 'rtest', name: course.name, page: 'channel-area', course: course, settings: {}, savedAt: Date.now() }); localStorage.setItem('fs-myraces', JSON.stringify(a)); return 'rtest'; });
      await p.goto(BASE + '/channel-area/?my=' + id); await p.clock.runFor(1000);
      await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.P && !f.running; }, null, { timeout: 240000 });
      await p.evaluate(() => { const r = document.getElementById('races'); if (r) r.hidden = true; });
    }
    await p.waitForTimeout(1500); await p.clock.runFor(2000);
    const before = await p.evaluate(() => { const c = window.__navCourse(); return c.name + ' ' + c.start.lat.toFixed(3); });
    bump = true; await p.clock.runFor(5 * 60 * 1000 + 2000); await p.waitForTimeout(1500);
    const shown = await p.evaluate(() => !document.getElementById('newData').hidden);
    await p.evaluate(() => document.getElementById('newDataBtn').click()); await p.clock.runFor(3000); await p.waitForTimeout(3000);
    const after = await p.evaluate(() => { const c = window.__navCourse(); return c.name + ' ' + c.start.lat.toFixed(3); });
    ok(shown, kind + ': the new forecast is offered');
    ok(before === after, kind + ': the course stays after the new forecast', before + ' -> ' + after);
    await ctx.close();
    if (kind === 'own') break;
  }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
