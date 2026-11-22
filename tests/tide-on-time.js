/* Stuart 22 Nov 06:42: Tide on time puts the tide timing slider back on 0 at a tap. Run: node tests/tide-on-time.js http://localhost:8779 [path] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.getElementById('adjTon') && document.getElementById('adjTtime'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => ({ v: +document.getElementById('adjTtime').value, on: document.getElementById('adjTon').checked, label: document.getElementById('adjTtimeV').textContent, pill: !!(document.getElementById('adjPill') && !document.getElementById('adjPill').hidden) }));
  let r = await st(); ok(r.v === 0 && r.on, 'Opens on time, box ticked', r);
  await p.evaluate(() => { const e = document.getElementById('adjTtime'); e.value = 25; e.dispatchEvent(new Event('input', { bubbles: true })); }); r = await st();
  ok(r.v === 25 && !r.on && /\+25 min later/.test(r.label), 'Slider moved to +25: box clears', r);
  await p.evaluate(() => { const b = document.getElementById('setBtn'); b && b.click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('adjTon').click()); r = await st();
  ok(r.v === 0 && r.on && r.label === '0 min', 'Tick Tide on time: back to 0 min', r);
  await p.evaluate(() => document.getElementById('adjTon').click()); r = await st(); ok(r.v === 0 && r.on, 'Unticking on 0 stays on time (move the slider to change it)', r);
  ok(!errs.length, 'No script errors', errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
