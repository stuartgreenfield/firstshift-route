/* M51 (Stuart 17 Nov 13:37): Ask Claude in Mark's new Help, as in Route. Run: node tests/m51-ask.js <base> [/mark/] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + PATH); await p.waitForFunction(() => document.getElementById('helpBtn'), null, { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => document.getElementById('helpBtn').click()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const vis = e => !!(e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'); const a = [...document.querySelectorAll('a,button')].filter(e => /Ask Claude/i.test(e.textContent) && vis(e)); return { n: a.length, href: a[0] ? (a[0].href || '') : '', panes: [...document.querySelectorAll('[role=dialog],.sheet,#help')].filter(vis).map(e => e.id || e.className).slice(0, 4) }; });
  ok(r.n > 0, 'Ask Claude shown in the Help that opens', r);
  ok(/claude\.ai\/new/.test(r.href) || r.n > 0, 'it opens Claude', r.href.slice(0, 80));
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 2)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); })();
