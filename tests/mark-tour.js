/* Mark's guided tour: every level listed, every step of level 1 points at something. Run: node tests/mark-tour.js [base] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSTour && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  const lv = await p.evaluate(() => FSTour.levels().map(l => l.n + ' ' + l.name + ' (' + l.steps.length + ')')); ok(lv.length > 0, 'The tour has levels', lv);
  await p.evaluate(() => FSTour.level(1)); await p.waitForTimeout(1200); const out = [];
  for (let i = 0; i < 12; i++) { const s = await p.evaluate(() => { const h = document.querySelector('.fst-hole'), t = document.querySelector('.fst-card h4,.fst .fst-t,.fst h3'); const r = h && h.getBoundingClientRect(); return { t: t && t.textContent.slice(0, 30), hole: r ? [Math.round(r.width), Math.round(r.height)] : null, nothing: /Nothing to point at/.test(document.querySelector('.fst') ? document.querySelector('.fst').innerText : '') }; }); out.push(s);
    if (i === 3) { require('fs').mkdirSync('/tmp/claude-0/ui', { recursive: true }); await p.screenshot({ path: '/tmp/claude-0/ui/tour.png' }); }
    const nx = await p.$('[data-fst="next"]'); if (!nx) break; const last = await nx.textContent(); await nx.click(); await p.waitForTimeout(900); if (/Finish/.test(last)) break; }
  ok(out.length > 1, 'Level 1 has steps to go through', out.length); ok(out.every(s => s.t), 'Every step has a title', out.filter(s => !s.t).length + ' without'); const lost = out.filter(s => s.nothing).map(s => s.t); ok(!lost.length, 'Every step points at something on screen', lost); ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
