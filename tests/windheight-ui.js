/* D, 14 Nov 2026: Route's Boat tab wind height setting reaches the router. Run: node tests/windheight-ui.js http://localhost:8769 outdir */
const { chromium } = require('playwright');
const NOTOUR = () => document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });   /* Show me round? (14 Nov): the tests answer No */
const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(NOTOUR); await p.addInitScript(() => { try { localStorage.setItem('fs-terms', '9999-12-31'); localStorage.setItem('fs-autostart', '1'); } catch (e) {} });
  await p.goto(BASE + '/channel-area/');
  const done = () => p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.finish && !f.running && (window.__fsDump && window.__fsDump()); }, null, { timeout: 300000 });
  await done();
  const fin = () => p.evaluate(() => { const d = window.__fsDump(); return d.routes.map(r => [r.id, r.r && r.r.finish]); });
  const before = await fin();
  const ui = await p.evaluate(() => { const z = document.getElementById('polZ'), m = document.getElementById('mastZ'), row = document.getElementById('mastRow'); const h0 = row.hidden; z.value = 'mast'; z.onchange(); m.value = '18'; m.oninput(); return { h0, h1: row.hidden }; });
  ok(ui.h0 && !ui.h1, 'the sensor height box appears only for a masthead polar');
  await p.evaluate(() => { window.__fsDump.mark = 1; document.getElementById('run').click(); });
  await p.waitForTimeout(1500); await done();
  const after = await fin();
  const pairs = before.map(([id, f]) => [id, f, (after.find(a => a[0] === id) || [])[1]]).filter(x => x[2] != null);
  const faster = pairs.filter(x => x[2] <= x[1]).length;
  ok(pairs.length > 0 && faster === pairs.length && pairs.some(x => x[2] < x[1]), 'with the polar at an 18 m masthead the same boat is routed on more wind, so no route is slower', pairs.map(x => x[0] + ' ' + (x[1] - x[2]).toFixed(2) + ' h sooner').join(', '));
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
