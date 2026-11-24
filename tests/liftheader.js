/* Headers and lifts (Route+ and Mark+, approved 24 Nov 15:50): with the boat's true wind direction steady at 235 for 10 minutes then
   243, on starboard it reads LIFT 8, on port HEADER 8; on a reach it stays away; it folds to just the word and number and opens again;
   in Mark+ it waits until after the start. Run: node tests/liftheader.js http://localhost:8778 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  for (const page of ['/channel-area/', '/mark/']) {
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + page);
    await p.waitForFunction(() => window.FSLift && window.__navBoat, null, { timeout: 300000 }); await p.waitForTimeout(2000);
    const set = (twd, twa) => p.evaluate(([twd, twa]) => { window.__LB = { twd, twa }; window.__navBoat = () => ({ twd: window.__LB.twd, twa: window.__LB.twa, age: { twd: 0, twa: 0 } }); }, [twd, twa]);
    await set(235, -40);
    await p.evaluate(() => { const H = window.FSLift.H(), t = Date.now(); H.length = 0; for (let i = 120; i >= 1; i--) H.push([t - i * 5000, 235]); if (window.FSSolent && window.FSSolent.set) window.FSSolent.set({ startAt: Math.round(Date.now() / 1000) - 60 }); });
    await set(243, -40); await p.evaluate(() => window.FSLift.render()); await p.waitForTimeout(300);
    const read = () => p.evaluate(() => { const e = document.getElementById('lhPop'); return e && !e.hidden ? { w: e.querySelector('.lhtop b').textContent, fold: e.classList.contains('fold'), svg: e.querySelectorAll('svg').length } : null; });
    let r = await read(); ok(r && /^LIFT [78]°$/.test(r.w) && r.svg === 2, page + ' starboard, wind veered 8°: LIFT 8 with the picture and the trace', r);
    await set(243, 40); await p.evaluate(() => window.FSLift.render()); r = await read(); ok(r && /^HEADER [78]°$/.test(r.w), page + ' port, same wind: HEADER 8', r);
    await p.evaluate(() => document.getElementById('lhFold').click()); r = await read(); ok(r && r.fold, page + ' folds to just the word and number', r);
    await p.evaluate(() => document.getElementById('lhFold').click()); r = await read(); ok(r && !r.fold && r.svg === 2, page + ' opens again', r);
    await set(243, 120); await p.evaluate(() => window.FSLift.render()); r = await read(); ok(!r, page + ' on a reach it stays away');
    if (page === '/mark/') { await set(243, -40); await p.evaluate(() => { window.FSSolent.set({ startAt: Math.round(Date.now() / 1000) + 120 }); window.FSLift.render(); }); r = await read(); ok(!r, 'Mark+: not before the start', r); }
    ok(!errs.length, page + ' no script errors', errs.slice(0, 3)); await p.close();
  }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
