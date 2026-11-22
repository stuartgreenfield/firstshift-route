/* Stuart 22 Nov 07:18 (Cervantes: "No action when tapped"): Route and Route again never do nothing in silence. With the course put away
   (as an inshore race does) the tap routes; while a route is under way the tap says so. Run: node tests/route-tap.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cervantes';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  const st = () => p.evaluate(() => ({ note: (document.getElementById('runNote') || {}).textContent.slice(0, 120), fins: document.querySelectorAll('#finBox .fin').length, busy: (document.getElementById('busy') || {}).textContent || '', prog: !document.getElementById('prog').hidden }));
  const waitRoutes = async () => { for (let i = 0; i < 120; i++) { await p.waitForTimeout(2000); const s = await st(); if (s.fins && !s.prog) return s; } return st(); };
  await p.waitForFunction(() => window.__navFc && window.__navFc().P && document.getElementById('run'), null, { timeout: 300000 });
  let s = await waitRoutes(); ok(s.fins > 0, 'Cervantes routes when it opens', s);
  await p.evaluate(() => { window.__fsClearCourse(); }); await p.waitForTimeout(800);
  s = await st(); ok(s.fins === 0, 'Course put away (as an inshore race does): no routes on the chart', s);
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(1500);
  s = await st(); ok(s.prog || /Quick route|Routing|Refining/.test(s.note + s.busy) || s.fins > 0, 'Route again after that: routing starts, not silence', s);
  s = await waitRoutes(); ok(s.fins > 0, 'and the routes come back', s);
  await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(400); await p.evaluate(() => document.getElementById('run').click()); await p.waitForTimeout(400);
  s = await st(); ok(/already under way/.test(s.busy) || s.prog, 'A second tap while routing says it is under way', s);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
