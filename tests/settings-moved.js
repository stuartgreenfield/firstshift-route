/* F32: settings moved to their new tabs still work there (class start in Course, forecast correction in Forecasts, clear screen time in Display) */
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let pass = 0, fail = 0; const ok = (n, v, d) => { console.log((v ? 'PASS ' : 'FAIL ') + n + (d ? ' | ' + d : '')); v ? pass++ : fail++; };
  for (const url of [(process.argv[2] || 'http://localhost:8779') + '/channel-area/', (process.argv[3] || 'http://localhost:8778') + '/mark/']) {
    const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.FSSetOrder, null, { timeout: 300000 }); await p.waitForTimeout(6000);
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); document.getElementById('setBtn').click(); }); await p.waitForTimeout(800);
    const where = await p.evaluate(() => ({ start: !!document.querySelector('#s-course #startSel'), adj: !!document.querySelector('#s-fc #adjBox'), clear: [...document.querySelectorAll('#s-display h4')].some(h => /Clear screen/.test(h.textContent)), saver: !!document.querySelector('#s-display #fsSaver'), done: FSSetOrder.done() }));
    ok(url + ': sections in their new tabs', where.start && where.adj && where.clear && where.saver, JSON.stringify(where));
    const vis = await p.evaluate(() => { document.querySelector('.stabs .tab[data-s="course"]').click(); const s = document.getElementById('startSel'); const r = s.getBoundingClientRect(); return { shown: r.width > 0 && r.height > 0, enabled: !s.disabled, label: s.closest('.row').textContent.trim().slice(0, 20) }; });
    ok(url + ': class start shown and usable on the Course tab', vis.shown && vis.enabled, JSON.stringify(vis));
    ok(url + ': no page errors', !errs.length, errs.slice(0, 2).join(' | ')); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
