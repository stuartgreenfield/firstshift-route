const { chromium } = require('playwright'); const BASE = process.argv[2];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); localStorage.setItem('fs-terms', '9999-12-31'); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => window.__fsLineSet && window.__fsLineSet()); await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(() => { const s = document.querySelector('.solwsrc'); return s ? [...s.options].map(o => o.value) : 'none'; }))); await b.close(); })();
