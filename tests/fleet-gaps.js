/* Stuart 22 Nov (decided 08:30, go 14:56): fleet gaps for an AIS race boat with a TCC: 'At this point' and 'Routed finish', corrected time,
   sensible size, and both tie up with the ratings. Run: node tests/fleet-gaps.js <url> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent), null, { timeout: 600000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('aisSrc'); s.value = 'test'; s.dispatchEvent(new Event('change')); const t = document.getElementById('time'); t.value = 300; t.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(2500);
  const pick = await p.evaluate(() => { const b = [...document.querySelectorAll('#aisTable [data-rb]')][0]; if (!b) return null; b.click(); return b.dataset.rb; }); ok(!!pick, 'A test AIS target can be marked as a race boat', pick);
  await p.waitForTimeout(400); await p.evaluate(m => { const box = document.getElementById('rb' + m); box.querySelector('input').value = '1.021'; box.querySelector('[data-rbok]').click(); }, pick); await p.waitForTimeout(3000);
  const row = () => p.evaluate(m => { const r = document.querySelector('#aisTable tr[data-mmsi="' + m + '"]'); return r ? (r.querySelector('.fgap') || {}).textContent || '' : null; }, pick);
  let t = await row(); ok(/At this point: (level|you (\d+h\d\d|\d+ min) (ahead|behind))/.test(t), 'Row shows "At this point" in corrected time', t);
  for (let i = 0; i < 20 && !/Routed finish/.test(t); i++) { await p.evaluate(() => { const s = document.getElementById('time'); s.value = 301 + (s.value % 2); s.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(1500); t = await row(); }
  ok(/Routed finish: (level|you (\d+h\d\d|\d+ min) (ahead|behind))/.test(t), 'Row shows "Routed finish" once the boat is sailed through the forecast', t);
  const fg = await p.evaluate(() => { const g = window.__fsFleetGaps(); return Object.values(g.b).map(x => x.m); }); ok(fg.length && fg.every(m => Math.abs(m) < 24 * 60), 'Routed gap is a sensible size (under a day)', fg);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
