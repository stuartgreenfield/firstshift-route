/* Start-up shows one window (Stuart 19 Nov 18:23 photo: the course card slid over Start new race) and Reload keeps your place
   (18:30: "Refresh, keep my place", in the Settings header; "One card: carry on or new" for a race from an earlier day).
   Run: node tests/startup-one.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const WIN = ['solCard', 'solLegs', 'sheet', 'solStartScr', 'wiz', 'races', 'help'];
const open = p => p.evaluate(W => W.filter(id => { const e = document.getElementById(id); return e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'; }).map(id => id + ': ' + (document.getElementById(id).innerText || '').replace(/\s+/g, ' ').slice(0, 160)), WIN);
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n && !sessionStorage.getItem('noauto')) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  const ready = () => p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 });
  await ready(); await p.waitForTimeout(1500);
  /* a course on the chart (the practice course), then its gun put two days back */
  await p.evaluate(() => { const c = document.getElementById('solCard'); if (c) c.hidden = true; const M = FSSolent.marks(), a = M.find(m => m.id === '3Q') || M[0], z = M.find(m => m.id === '33') || M[1];
    FSSolent.set({ type: 'marks', start: { code: null, name: 'Start, Solent race', lat: 50.775, lon: -1.29 }, marks: [{ code: a.id, name: a.id + ' ' + a.name, lat: a.lat, lon: a.lon, side: 'starboard' }, { code: z.id, name: z.id + ' ' + z.name, lat: z.lat, lon: z.lon, side: 'port' }], fin: 'start', finish: null, plan: 'list' }); FSSolent.go(); });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { const g = Math.round(Date.now() / 1000 - 44 * 3600); FSSolent.set({ startAt: g, ended: null }); }); await p.waitForTimeout(800);
  await p.reload(); await ready(); await p.waitForTimeout(25000);
  let w = await open(p); ok(w.length === 1 && /Your last race/.test(w[0]) && /Carry on/.test(w[0]) && /New race/.test(w[0]), 'A race from an earlier day: one card, Carry on or New race, nothing else open', w);
  await p.click('#solOldGo'); await p.waitForTimeout(1000); w = await open(p);
  ok(w.length === 1 && /^solLegs/.test(w[0]), 'Carry on: the course card, and only that', w);
  /* Reload, from the Settings header */
  const v0 = await p.evaluate(() => ({ marks: (FSSolent.state().marks || []).length, view: window.__navViewGet ? JSON.stringify(window.__navViewGet()).slice(0, 60) : '' }));
  await p.evaluate(() => { const l = document.getElementById('solLegs'); if (l) l.hidden = true; document.getElementById('setBtn').click(); }); await p.waitForTimeout(800);
  const rb = await p.evaluate(() => { const r = document.getElementById('setReload'), h = r && r.closest('.shead'); return r && h ? r.textContent + ' in ' + (h.querySelector('h2') || {}).textContent : null; });
  ok(rb && /Reload/.test(rb) && /Settings/.test(rb), 'Settings header has Reload beside Help and Share', rb);
  await p.evaluate(() => sessionStorage.setItem('noauto', '1')); await p.click('#setReload'); await p.waitForLoadState('domcontentloaded'); await p.waitForTimeout(1500);
  const sp = await p.evaluate(() => { const s = document.getElementById('splash'); return !!(s && !s.hidden && getComputedStyle(s).display !== 'none'); });
  ok(!sp, 'After Reload: no landing page and no Show me round question', sp);
  await ready(); await p.waitForTimeout(3000);
  const v1 = await p.evaluate(() => ({ marks: (FSSolent.state().marks || []).length, view: window.__navViewGet ? JSON.stringify(window.__navViewGet()).slice(0, 60) : '' }));
  ok(v1.marks === v0.marks && v1.marks > 0 && v1.view === v0.view, 'After Reload: the same race and the same chart view', { v0, v1 });
  /* New race: the Start new race card */
  await p.evaluate(() => sessionStorage.removeItem('noauto')); await p.reload(); await ready(); await p.waitForTimeout(25000);
  w = await open(p); if (w.length === 1 && /Your last race/.test(w[0])) { await p.click('#solOldNew'); await p.waitForTimeout(800); w = await open(p); }
  ok(w.length === 1 && /Start new race/.test(w[0]), 'New race: the Start new race card, and only that', w);
  /* the next opening: the old race has ended, so Start new race, one window */
  await p.reload(); await ready(); await p.waitForTimeout(25000); w = await open(p);
  ok(w.length === 1 && /Start new race/.test(w[0]), 'Next opening: Start new race only', w);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
