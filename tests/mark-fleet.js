/* Stuart 22 Nov 18:37: Mark and Mark+ have the fleet upgrade too: the test fleet, AIS boats matched, gaps in the AIS list and the fleet
   table. Run: node tests/mark-fleet.js http://localhost:8779 (Mark) or :8778 (Mark+) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x) x.click(); FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S, 3L P').marks, plan: 'route' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); FSSolent.go(); const s = FSSolent.state(); s.startAt = Math.round(Date.now() / 1000 + 600); FSSolent.set({ startAt: s.startAt }); });
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden, null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(2000);
  await p.evaluate(() => { const q = document.querySelector('#solStartScr [data-q=small]'); if (q && !document.getElementById('solStartScr').hidden) q.click(); });
  console.log('DBG', JSON.stringify(await p.evaluate(() => ({ fin: document.querySelectorAll('#finBox .fin').length, prog: document.getElementById('prog').hidden, note: (document.getElementById('runNote') || {}).textContent, plan: !!(window.__fsPlanNow && window.__fsPlanNow()), start: document.getElementById('startSel').value }))));
  const has = await p.evaluate(() => !!document.getElementById('mfDemo')); ok(has, 'Fleet tab has the test fleet on Mark', has);
  await p.evaluate(() => document.getElementById('mfDemo').click()); await p.waitForTimeout(5000);
  for (let i = 0; i < 12; i++) { const n = await p.evaluate(() => document.querySelectorAll('#aisTable .fgap').length); if (n >= 3) break; await p.evaluate(() => { const s = document.getElementById('time'); s.value = +s.value + 1; s.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(2500); }
  const r = await p.evaluate(() => ({ src: document.getElementById('aisSrc').value, boats: document.querySelectorAll('#mfList .mfrow').length, gaps: document.querySelectorAll('#aisTable .fgap').length, head: (document.querySelector('#fleet tr') || {}).textContent, rows: [...document.querySelectorAll('#fleet tr')].slice(1).map(r => [...r.cells].map(c => c.textContent).join(' | ')).slice(0, 4), msg: (document.getElementById('mfMsg') || {}).textContent }));
  ok(r.src === 'test' && r.boats >= 4, 'Test fleet added on Mark', r);
  ok(r.gaps >= 3, 'AIS rows show the corrected gaps on Mark', r.gaps);
  ok(/Now/.test(r.head || '') && r.rows.some(x => /min|level/.test(x.split(' | ')[2] || '')), 'Fleet table shows At this point on Mark', r.rows);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
