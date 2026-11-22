/* Stuart 22 Nov 17:12: a test fleet so users can see how the fleet works. Run: node tests/fleet-demo.js <url> [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', P = process.argv[3] || '/channel-area/?race=cervantes';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + P);
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent), null, { timeout: 600000 }); await p.waitForTimeout(1500);
  const txt0 = await p.evaluate(() => document.getElementById('mfDemo').textContent); ok(txt0 === 'Try it with a test fleet', 'Fleet tab offers the test fleet', txt0);
  await p.evaluate(() => document.getElementById('mfDemo').click()); await p.waitForTimeout(6000);
  for (let i = 0; i < 10; i++) { const n = await p.evaluate(() => document.querySelectorAll('#aisTable .fgap').length); if (n >= 3) break; await p.evaluate(() => { const s = document.getElementById('time'); s.value = +s.value + 1; s.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(2500); }
  const r = await p.evaluate(() => ({ src: document.getElementById('aisSrc').value, gaps: document.querySelectorAll('#aisTable .fgap').length, fleet: [...document.querySelectorAll('#fleet tr')].slice(1).filter(r => r.cells[2] && /min|level/.test(r.cells[2].textContent)).length, head: (document.querySelector('#fleet tr') || {}).textContent, boats: document.querySelectorAll('#mfList .mfrow').length, btn: document.getElementById('mfDemo').textContent, msg: document.getElementById('mfMsg').textContent.slice(0, 40) }));
  ok(r.src === 'test' && r.boats >= 4, 'Test fleet: pretend AIS boats added to the fleet with ratings', r);
  ok(r.gaps >= 3, 'AIS rows show the corrected gaps', r.gaps);
  const t = await p.evaluate(() => [...document.querySelectorAll('#fleet tr')].map(r => [...r.cells].map(c => c.textContent)));
  ok(t[0].join('|') === 'Pos|Boat|Now|Finish|CPA', 'Fleet table columns: Pos, Boat, Now, Finish, CPA', t[0]);
  const you = t.find(r => /^You/.test(r[1] || '')); ok(you && /^\d+$/.test(you[0]), 'You are in the table with your place', you);
  ok(t.slice(1).some(r => /\d nm/.test(r[4] || '')), 'CPA from the AIS feed shows for a closing boat', t.slice(1).map(r => r[4]));
  const yi = t.findIndex(r => /^You/.test(r[1] || '')), above = t.slice(1, yi), below = t.slice(yi + 1).filter(r => r[0] !== '-');
  ok(above.every(r => /ahead|level/.test(r[2])) && below.every(r => /behind|level/.test(r[2])), 'Read down the table: boats above you are ahead of you on corrected time, boats below are behind', { above: above.map(r => r[2]), below: below.map(r => r[2]) });
  const ranks = t.slice(1).filter(r => r[0] !== '-').map(r => +r[0]); ok(ranks.every((v, i) => v === i + 1), 'Places run 1, 2, 3 without gaps', ranks); ok(r.fleet >= 3, 'The fleet table shows the live gaps', r.fleet); ok(r.btn === 'End the test fleet', 'Button now ends it', r.btn);
  if (process.env.SHOT) { await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Fleet'); if (b) b.click(); }); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('fleet').scrollIntoView()); await p.waitForTimeout(500); await p.screenshot({ path: process.env.SHOT }); }
  await p.evaluate(() => document.getElementById('mfDemo').click()); await p.waitForTimeout(2000);
  const e = await p.evaluate(() => ({ src: document.getElementById('aisSrc').value, boats: document.querySelectorAll('#mfList .mfrow').length }));
  ok(e.src !== 'test' && e.boats === 0, 'Ending it removes the test boats and the test AIS', e);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
