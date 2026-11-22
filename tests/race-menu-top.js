/* Stuart 22 Nov 07:03: choosing Rolex Sydney Hobart Yacht Race (or RORC or JOG races) from the race menu must show those races at the
   top of the sheet, not below your own course, My races and Old routes. Run: node tests/race-menu-top.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1'));
    localStorage.setItem('fs-myraces', JSON.stringify([1, 2, 3, 4, 5].map(i => ({ id: 'm' + i, name: 'Test race ' + i, savedAt: Date.now() - i * 1e6, page: 'channel-area', course: null })))); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.getElementById('rmOther') && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  for (const [btn, want] of [['rmOther', /Sydney Hobart/], ['rmRorc', /^RORC races$/], ['rmJog', /^JOG races$/]]) {
    await p.evaluate(id => document.getElementById(id).click(), btn); await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const l = document.getElementById('raceList'); const hs = [...l.querySelectorAll('h3')].map(h => h.textContent); const first = l.querySelector('h3'); return { hs, firstTop: first ? Math.round(first.getBoundingClientRect().top) : null, screen: innerHeight, firstRace: (l.querySelector('h3 ~ .ritem b') || {}).textContent }; });
    ok(want.test(r.hs[0]) && r.firstTop < r.screen * 0.5 && r.hs.includes('My races'), btn + ': its races are first, in the top half of the screen; My races still there below', r);
    await p.evaluate(() => { document.getElementById('races').hidden = true; }); }
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
