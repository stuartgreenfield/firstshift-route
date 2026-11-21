/* F94 (Stuart 21 Nov 02:52, iPhone photos): in Mark's test mode after the start, with the sun and moon line on and the Plotter bar
   open, the orange test bar must stay in one place and not cover the strips. Records the strips every 0.25 s for 8 s.
   Run: node tests/test-bar-steady.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  await c.addInitScript(K => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-rdetail', 'quick'); localStorage.setItem(K, '1'); }, 'fs-astro-line');
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 50, tws: 18, src: 'typed', at: Date.now() } }); FSSolent.test(true); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 20) }); });
  await p.waitForTimeout(26000);   /* past the gun */
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^PLOT$/i.test(x.textContent.trim())); if (b && !document.getElementById('fsPlot')) b.click(); }); await p.waitForTimeout(1500);
  const rows = []; for (let i = 0; i < 32; i++) { rows.push(await p.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e || e.hidden || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; }; return { tb: r('solTestBar'), as: r('astroLine'), pl: r('fsPlot') }; })); await p.waitForTimeout(250); }
  if (process.env.SHOW) rows.forEach(r => console.log(JSON.stringify(r)));
  const tops = new Set(rows.map(r => r.tb && r.tb[0])); ok(rows[0].tb && tops.size === 1, 'the test bar stays in one place after the start', [...tops].join(', '));
  const last = rows[rows.length - 1], over = (a, b) => a && b && a[0] < b[1] - 2 && b[0] < a[1] - 2;
  ok(!over(last.tb, last.as), 'it does not cover the sun and moon line', JSON.stringify(last));
  ok(!over(last.tb, last.pl), 'it does not cover the Plotter bar', JSON.stringify(last));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
