/* Stuart 17 Nov 07:43 (tablet photo): in Edit course, the Course changed box, the plotter bar and the GPS pill lay on top of each other.
   They stack one under another, on a tablet upright and a phone. Run: node tests/edit-stack.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [name, opt] of [['Tablet upright', { viewport: { width: 800, height: 1280 } }], ['Phone', devices['iPhone 13']]]) {
    const c = await b.newContext({ ...opt, serviceWorkers: 'block', geolocation: { latitude: 50.75, longitude: -1.30, accuracy: 6 }, permissions: ['geolocation'] });
    await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); document.addEventListener('DOMContentLoaded', () => { const x = document.getElementById('spTourNo'); if (x) setTimeout(() => x.click(), 200); }); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/');
    await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 300000 }); await p.waitForTimeout(1500);
    await p.click('#liveBtn'); await p.waitForTimeout(3000);
    await p.evaluate(() => { const lb = document.getElementById('liveBox'); const mn = lb && lb.querySelector('[data-k=mini], #lvMin, .lvmin'); if (mn) mn.click(); if (window.__fsPlot) window.__fsPlot.toggle(true); document.getElementById('editFab').click(); }); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById('editBar').hidden = false; document.getElementById('edTxt').innerHTML = '<b class="chg">Course changed.</b> Needles Fairway moved 0.5 nm S. The faded routes are out of date: Re-route to update.'; }); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => { const g = id => { const e = document.getElementById(id); if (!e || !e.getClientRects().length || e.closest('[hidden]')) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); }; return { edit: g('editBar'), plot: g('fsPlot'), live: g('liveBox') }; });
    const lap = (a, b) => a && b && a[0] < b[2] - 2 && a[2] > b[0] + 2 && a[1] < b[3] - 2 && a[3] > b[1] + 2;
    ok(r.edit && !lap(r.edit, r.plot) && !lap(r.edit, r.live) && !lap(r.plot, r.live), name + ': Course changed box, plotter bar and GPS window do not overlap', JSON.stringify(r));
    await p.screenshot({ path: '/tmp/claude-0/ui/m2/edit-stack-' + name.split(' ')[0] + '.png' });
    ok(!errs.length, name + ': no page errors', errs.join(' | ') || null); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
