/* Speed plan (Stuart 20 Nov 06:45, "no short cuts"): each first route is on the chart as soon as it is found, with a line saying more are coming;
   a boat added to the fleet while the routes are still refining shows within a few seconds. Run: node tests/first-routes.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 860 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    window.__seen = []; const t = setInterval(() => { try { const n = window.__fsProvN ? window.__fsProvN() : -1, txt = (document.getElementById('progTxt') || document.getElementById('prog') || {}).textContent || ''; const l = window.__seen[window.__seen.length - 1]; const k = n + '|' + (/more coming/.test(document.body.innerText) ? 'more' : ''); if (!l || l[1] !== k) window.__seen.push([Math.round(performance.now()), k, document.querySelectorAll('#finBox .fin').length]); } catch (e) {} }, 200); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=myth');
  await p.waitForFunction(() => /Refining|Routed in/.test((document.getElementById('runNote') || {}).textContent || ''), null, { timeout: 300000 });
  const seen = await p.evaluate(() => window.__seen); const early = seen.filter(x => +x[1].split('|')[0] > 0 && x[2] === 0);
  ok(early.length > 0, 'a first route is on the chart before the first pass has finished', seen.slice(0, 8));
  ok(seen.some(x => /more/.test(x[1])), 'the progress line says more routes are coming');
  await p.evaluate(() => { document.querySelector('.tab[data-tab="fleet"]').click(); document.getElementById('mfName').value = 'Test Boat'; document.getElementById('mfTcc').value = '1.010'; document.getElementById('mfAdd').click(); });
  const t0 = Date.now(); await p.waitForFunction(() => /Test Boat/.test(document.getElementById('fleet').innerText), null, { timeout: 30000 }).catch(() => {}); const secs = (Date.now() - t0) / 1000;
  const refining = await p.evaluate(() => /Refining/.test(document.getElementById('runNote').textContent));
  ok(secs < 10 && await p.evaluate(() => /Test Boat/.test(document.getElementById('fleet').innerText)), 'a boat added while refining shows in the fleet within 10 s', { secs, stillRefining: refining });
  ok(!errs.length, 'no script errors', errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
