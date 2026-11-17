/* Stuart 17 Nov 14:19: Mark opens with the Start new race card after the landing page; every tool opens with all its menus showing (no
   clear screen left over from last time). Run: node tests/open-menus.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const path of ['/mark/', '/channel-area/']) { const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
    await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-tourdone', '1'); localStorage.setItem('fs-ui', JSON.stringify({ clear: true })); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + path);
    await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1000);
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n) n.click(); const g = document.querySelector('#splash [data-go], #spGo, #splash .btn.primary'); if (g && g.offsetParent) g.click(); }); await p.waitForTimeout(6000);
    const st = await p.evaluate(() => ({ clear: document.body.classList.contains('navclear'), card: !!(document.getElementById('solCard') && !document.getElementById('solCard').hidden), cardT: (document.querySelector('#solCard h2') || {}).textContent, bar: !!(document.getElementById('bar') && document.getElementById('bar').getClientRects().length), splash: !!(document.getElementById('splash') && !document.getElementById('splash').hidden) }));
    ok(!st.clear && st.bar, path + ': opens with the menus showing', JSON.stringify(st));
    if (path === '/mark/') ok(st.card && /Start new race/.test(st.cardT || ''), 'Mark: the Start new race card is in view after the landing page', JSON.stringify(st));
    else ok(!st.card, 'Route: no race card', JSON.stringify(st));
    await p.screenshot({ path: '/tmp/claude-0/ui/m2/open' + path.replace(/\//g, '-') + '.png' }); ok(!errs.length, path + ': no page errors', errs.join(' | ') || null); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
