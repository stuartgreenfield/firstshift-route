/* Mark's first-race checklist on the course card: shown fresh, ticks off when test mode runs. Run: node tests/mark-first.js [base] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3500);
  const st = () => p.evaluate(() => { const b = document.querySelector('#solCard .mkfirst'); return b ? b.querySelector('span').textContent + ' ' + [...b.querySelectorAll('li.done')].length : 'none'; });
  const f0 = await st(); ok(f0 !== 'none', 'A fresh Mark shows the first-race checklist', f0); require('fs').mkdirSync('/tmp/claude-0/ui', { recursive: true }); await p.screenshot({ path: '/tmp/claude-0/ui/first.png' });
  await p.click('#solCardT'); await p.waitForTimeout(3000); await p.evaluate(() => FSSolent.start()); await p.waitForTimeout(1500);
  const f1 = await st(), kept = await p.evaluate(() => localStorage.getItem('fs-mark-first')); ok(f1 === 'none' || +f1.split(' ').pop() > +f0.split(' ').pop(), 'Test mode ticks the checklist on', f0 + ' -> ' + f1); ok(!!kept, 'Progress is kept', kept); ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
