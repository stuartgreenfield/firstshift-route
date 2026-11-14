/* 14 Nov 2026 (Stuart): turn a mark into a waypoint on the chart, tap Re-route: it must route, not go back to the set-up card.
   The boat is left unset, as on a phone where the set-up card shows 3 of 4 ready: the old code went back to that card and did
   not route. Run: node tests/reroute.js http://localhost:8769 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.0\.2\.2)/.test(u) || /^(data|blob):/.test(u)) return r.continue(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear(); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-autostart', '1'); });
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }));   /* Show me round? (14 Nov): answer No */
  const p = await ctx.newPage(); await p.goto(BASE + '/channel-area/');
  const ready = () => p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 300000 });
  await ready(); await p.waitForTimeout(3000);
  await p.evaluate(() => { const n = document.getElementById('sessNo'); if (n && n.getBoundingClientRect().width) n.click(); });
  const key0 = await p.evaluate(() => window.__fsDump() && window.__fsDump().key), real0 = await p.evaluate(() => window.__navCourse().marks.length);
  await p.evaluate(() => document.getElementById('editFab').click()); await p.waitForTimeout(800);
  const pts = await p.evaluate(() => window.__fsEditPts());
  ok(pts && pts.length >= 3, 'course opens for editing on the chart', pts && pts.length + ' points');
  const mid = pts.findIndex((q, i) => i > 0 && i < pts.length - 1 && q[2]);
  await p.mouse.click(pts[mid][0], pts[mid][1]); await p.waitForTimeout(500);
  const hasSel = await p.evaluate(() => !!document.getElementById('mpS') && !document.getElementById('markPop').hidden);
  ok(hasSel, 'tapping a mark opens its card with the rounding choice');
  await p.selectOption('#mpS', 'via'); await p.click('#mpOk'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.getElementById('edGo').hidden), 'Re-route appears once the mark is a waypoint');
  await p.click('#edGo'); await p.waitForTimeout(1500);
  const wizShown = await p.evaluate(() => !document.getElementById('wiz').hidden);
  await ready(); await p.waitForTimeout(1000);
  const after = await p.evaluate(() => ({ key: window.__fsDump() && window.__fsDump().key, real: window.__navCourse().marks.length }));
  ok(!wizShown && after.key !== key0 && after.real === real0 - 1, 'Re-route routes the changed course at once, without going back to the set-up card', 'set-up card shown: ' + wizShown + ', rounding marks ' + real0 + ' to ' + after.real + ', routes ' + (after.key !== key0 ? 'new' : 'unchanged'));
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
