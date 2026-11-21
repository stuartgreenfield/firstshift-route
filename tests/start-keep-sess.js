/* F93 (21 Nov 2026, found by start-keep): on reopening, the page's saved routing session put back its own start even when it was
   another race's (both Channel races share one page), so the start the crew had just chosen was replaced, 60 s out in the test.
   Here the page's session is a different race's, with an older start; the start chosen last must be the one kept.
   Run: node tests/start-keep-sess.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' }); await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async () => { await p.goto(BASE + '/channel-area/', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(9000); await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.offsetParent) n.click(); }); };
  await open();
  /* the crew chooses a start 40 min ahead in the start window, as in start-keep */
  await p.click('#startChip'); await p.waitForTimeout(800); const t = new Date(Date.now() + 40 * 60000); t.setUTCSeconds(0, 0); const chosen = t.getTime() / 1000, other = chosen - 60;
  await p.fill('#wzTime', String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0')); await p.click('#wizNext'); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => window.__fsGunAt()) === chosen, 'The start is chosen', chosen);
  /* the page's session, as another race on the same page leaves it, with a start a minute earlier */
  await p.evaluate((other) => { const o = JSON.parse(localStorage.getItem('fs-sess-channel-area') || '{}'); Object.assign(o, { v: 1, rk: 'Another race', until: Date.now() + 3600e3, startVal: String(other) }); localStorage.setItem('fs-sess-channel-area', JSON.stringify(o)); }, other);
  await open(); await p.waitForTimeout(3000);
  const g = await p.evaluate(() => window.__fsGunAt());
  ok(g === chosen, 'The start chosen last is kept, not the other race\'s session start', chosen + ' / ' + g + (g === other ? ' (the session\'s)' : ''));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
