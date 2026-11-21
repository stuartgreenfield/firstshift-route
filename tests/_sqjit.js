/* Probe (Stuart 20 Nov 23:26, photos: the countdown bar's number moves about). Records the bar's top row every 0.3 s for 10 s on a phone. */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2];
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 800) }); });
  await p.waitForTimeout(4000); const rows = [];
  for (let i = 0; i < 34; i++) { rows.push(await p.evaluate(() => { const h = document.querySelector('#solSeq .sqhd'); if (!h) return 'none'; return [...h.children].map(e => { const r = e.getBoundingClientRect(); return e.className + '@' + Math.round(r.x); }).join(' '); })); await p.waitForTimeout(300); }
  const n = new Set(rows); console.log('layouts seen', n.size, 'changes', rows.filter((r, i) => i && r !== rows[i - 1]).length); console.log([...n].join('\n')); await b.close();
})();
