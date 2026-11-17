const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSTour && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  console.log('levels', await p.evaluate(() => FSTour.levels().map(l => l.n + ' ' + l.name + ' (' + l.steps.length + ')')));
  await p.evaluate(() => FSTour.level(1)); await p.waitForTimeout(1200); const out = [];
  for (let i = 0; i < 12; i++) { const s = await p.evaluate(() => { const h = document.querySelector('.fst-hole'), t = document.querySelector('.fst .fst-t,.fst h3,.fst b'); const r = h && h.getBoundingClientRect(); return { t: t && t.textContent.slice(0, 30), hole: r ? [Math.round(r.width), Math.round(r.height)] : null, nothing: /Nothing to point at/.test(document.querySelector('.fst') ? document.querySelector('.fst').innerText : '') }; }); out.push(s);
    if (i === 3) await p.screenshot({ path: '/tmp/claude-0/ui/tour.png' });
    const nx = await p.$('[data-fst="next"]'); if (!nx) break; const last = await nx.textContent(); await nx.click(); await p.waitForTimeout(900); if (/Finish/.test(last)) break; }
  console.log(JSON.stringify(out)); console.log(errs); await b.close(); })();
