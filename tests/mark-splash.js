/* Stuart 17 Nov 14:40: "when loading a new page the landing page starts with another then jumps to the correct one". Mark's landing page
   and logo must never show Route's words or logo, even for a moment. Run: node tests/mark-splash.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { window.__seen = []; const look = () => { const h = document.querySelector('#splash .sp-txt h1'), lb = document.querySelector('.logobox svg'); if (h && getComputedStyle(h).visibility === 'visible' && h.getClientRects().length) window.__seen.push('h1:' + h.textContent.trim()); if (lb && getComputedStyle(lb).visibility === 'visible' && lb.getClientRects().length) window.__seen.push('logo:' + (lb.closest('.logobox').innerHTML.indexOf('M4 93V67') >= 0 ? 'Route' : 'other')); }; new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true }); const t = setInterval(look, 30); setTimeout(() => clearInterval(t), 8000); });
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForTimeout(6000);
  const seen = await p.evaluate(() => [...new Set(window.__seen)]);
  ok(seen.length && !seen.some(x => /h1:Route/.test(x)), 'the landing page never shows "Route" on Mark', JSON.stringify(seen));
  ok(!seen.includes('logo:Route'), "Route's logo never shows on Mark", JSON.stringify(seen));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
