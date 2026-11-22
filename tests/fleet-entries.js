/* Stuart 22 Nov 15:17: an entry list (pasted or uploaded, as in Corrected) is matched to AIS automatically and the matched boats show
   their corrected gap in the AIS table and in the Fleet table. Run: node tests/fleet-entries.js <url> [path] */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || '/channel-area/?race=cervantes';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PAGE);
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent), null, { timeout: 600000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('aisSrc'); s.value = 'test'; s.dispatchEvent(new Event('change')); const t = document.getElementById('time'); t.value = 300; t.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(2500);
  const free = await p.evaluate(() => [...document.querySelectorAll('#aisTable [data-rb]')].map(b => ({ m: b.dataset.rb, n: b.closest('td').firstChild.textContent.trim() })));
  ok(free.length >= 3, 'At least 3 test AIS boats not yet on the list', free.map(f => f.n));
  const lng = free.filter(f => f.n.replace(/[^A-Z0-9]/g, '').length >= 6), a = lng[0], z = lng[1], q = free.find(f => f !== a && f !== z);   /* a close name needs 6 letters or more */ const title = s => s.toLowerCase().replace(/\b\w/g, x => x.toUpperCase());
  const close = z.n.slice(0, -1) + (z.n.slice(-1) === 'X' ? 'Y' : 'X');   /* one letter wrong */
  const list = 'Sail No,Boat,Class,IRC TCC,MMSI\nGBR 11,' + title(a.n).replace(' ', '-') + ',IRC 2,1.021,\nGBR 12,' + title(close) + ',IRC 3,"0,995",\nGBR 13,Quite Another Name,IRC 1,1.050,' + q.m + '\n';
  await p.evaluate(() => { document.querySelectorAll('details').forEach(d => d.open = true); });
  await p.setInputFiles('#mfFile', { name: 'entries.csv', mimeType: 'text/csv', buffer: Buffer.from(list) }); await p.waitForTimeout(1500);
  const msg = await p.textContent('#mfMsg'); ok(/^3 boats read/.test(msg), 'An uploaded CSV entry list is read', msg);
  const mf = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /^fs-fleet-(?!no)/.test(k))) || '[]'));
  ok(mf.length === 3 && mf[0].sail === 'GBR 11' && mf[1].tcc === 0.995 && mf[2].mmsi === +q.m, 'Sail number, comma TCC and MMSI are kept', mf);
  await p.evaluate(() => { const t = document.getElementById('time'); t.value = 302; t.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(3500);
  const row = m => p.evaluate(m => { const r = document.querySelector('#aisTable tr[data-mmsi="' + m + '"]'); return r ? { rb: !!r.querySelector('[data-rb]'), txt: r.cells[0].textContent, no: !!r.querySelector('[data-no]') } : null; }, m);
  let ra = await row(a.m), rz = await row(z.m), rq = await row(q.m);
  ok(ra && !ra.rb && /At this point/.test(ra.txt), 'Name with other capitals and a hyphen is matched and shows its corrected gap', ra);
  ok(rz && !rz.rb && rz.no && /close name/.test(rz.txt), 'A one-letter-wrong name is matched as a close name with "Not this boat"', rz);
  ok(rq && !rq.rb && /On your list as Quite Another Name/.test(rq.txt), 'A boat with a different AIS name is matched by MMSI', rq);
  const learnt = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /^fs-fleet-(?!no)/.test(k))) || '[]'));
  ok(learnt[0].mmsi === +a.m && !learnt[1].mmsi, 'A name match keeps the MMSI; a close match does not', learnt.map(f => f.mmsi));
  const ft = await p.evaluate(() => [...document.querySelectorAll('#fleet tr')].slice(1).map(r => [...r.cells].map(c => c.textContent))); ok(ft.filter(r => /min|level/.test(r[2] || '')).length >= 2 && ft.some(r => /You/.test(r[1])), 'Fleet table shows the live AIS corrected gap (At this point column)', ft.slice(0, 4));
  await p.evaluate(m => { document.querySelector('#aisTable tr[data-mmsi="' + m + '"] [data-no]').click(); }, z.m); await p.waitForTimeout(2500);
  rz = await row(z.m); ok(rz && rz.rb, '"Not this boat" removes the match and brings back Race boat', rz);
  await p.setInputFiles('#mfFile', path.join(__dirname, 'data-entries.xlsx')); await p.waitForTimeout(1500);
  const m2 = await p.textContent('#mfMsg'); ok(/^2 boats read.*now has 5/.test(m2), 'An .xlsx entry list is read and added', m2);
  await p.evaluate(() => { document.getElementById('mfPaste').value = 'Pasted Boat 1.012\nIRC | IRC 1 | Total: 1\nSection Boat\t1.100\nORC | ORC A | Total: 1\nOrc Boat\t1.100'; document.getElementById('mfPasteGo').click(); }); await p.waitForTimeout(800);
  const m3 = await p.textContent('#mfMsg'); ok(/^2 boats read, 1 non-IRC left out/.test(m3), 'Pasted lines and IRC sections read, non-IRC left out', m3);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
