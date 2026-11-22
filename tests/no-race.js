/* Stuart 22 Nov 07:50 (decided 08:05): a race put away leaves an empty race panel (No race open, Choose a race, Draw a course); its
   route cards, checks, banner, start chip and PLAN strip go; choosing a race brings everything back. Mark keeps its own card.
   Run: node tests/no-race.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden, null, { timeout: 400000 }); await p.waitForTimeout(1500);
  const vis = () => p.evaluate(() => { const v = id => { const e = typeof id === 'string' ? document.querySelector(id) : id; return !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none'); }; return { cls: document.body.classList.contains('norace'), card: v('#noRace'), fin: v('#finBox'), checks: v('#checks'), chip: v('#startChip'), plan: v('.bar .now'), run: v('.rerow') }; });
  await p.evaluate(() => { const pb = document.getElementById('panelBtn'); const t = document.querySelector('[data-tab="decision"]'); if (t && !t.offsetParent && pb) pb.click(); }); await p.waitForTimeout(800); await p.evaluate(() => { const t = document.querySelector('[data-tab="decision"]'); t && t.click(); }); await p.waitForTimeout(500);
  let r = await vis(); ok(!r.cls && !r.card && r.fin && r.chip, 'With a race open: no empty card, the race shows', r);
  await p.evaluate(() => { document.getElementById('panelBtn') && document.querySelector('[data-tab="decision"]').click(); window.__fsEndRace ? window.__fsEndRace() : window.__fsClearCourse(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const pn = document.getElementById('panel'); if (pn.classList.contains('collapsed') || pn.hidden) document.getElementById('panelBtn').click(); }); await p.waitForTimeout(800);   /* the end folds the panel; opening it shows the card */
  r = await vis(); ok(r.cls && r.card && !r.fin && !r.checks && !r.chip && !r.plan && !r.run, 'Race ended: one card, No race open; cards, checks, start chip, PLAN strip and Route again gone', r);
  await p.evaluate(() => document.getElementById('nrPick').click()); await p.waitForTimeout(800);
  const menu = await p.evaluate(() => { const m = document.getElementById('raceMenu'), s = document.getElementById('races'); return !!((m && !m.hidden) || (s && !s.hidden)); });
  ok(menu, 'Choose a race opens the race menu', menu);
  await p.evaluate(() => { const rm = document.getElementById('raceMenu'); if (rm) rm.hidden = true; document.getElementById('rmRorc').click(); document.querySelector('#raceList [data-race="cervantes"]').click(); }); 
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length, null, { timeout: 400000 }).catch(() => {}); await p.waitForTimeout(1500);
  r = await vis(); ok(!r.cls && !r.card && r.fin, 'Choosing Cervantes again: routes back, empty card gone', r);
  ok(!errs.length, 'No script errors', errs.slice(0, 2));
  const m = await c.newPage(); await m.goto(BASE + '/mark/'); await m.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await m.waitForTimeout(2000);
  await m.evaluate(() => { window.__fsEndRace ? window.__fsEndRace() : window.__fsClearCourse && window.__fsClearCourse(); }); await m.waitForTimeout(1000);
  ok(!(await m.evaluate(() => document.body.classList.contains('norace'))), 'Mark: no empty race card (Mark keeps its own Start new race card)');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
