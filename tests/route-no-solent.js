/* Route and Route+ without Solent (Stuart 16 Nov 22:16): a Solent race saved before Mark had its own page opens in Route as an
   ordinary race: routed as normal, no Solent list, card or step box, and no Mark wording.
   Run: node tests/route-no-solent.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1');
    const course = { name: 'Solent race', solent: true, solPlan: { route: false, models: [] }, start: { name: 'Start', lat: 50.7700, lon: -1.2950 }, marks: [{ name: '3F', lat: 50.7860, lon: -1.2400, side: 'port' }, { name: '2C', lat: 50.7600, lon: -1.2000, side: 'stbd' }], finish: { name: 'Finish', lat: 50.7690, lon: -1.2900 } };
    localStorage.setItem('fs-myraces', JSON.stringify([{ id: 'rsol', name: 'Solent race', page: 'cervantes', course: course, settings: {}, savedAt: Date.now(), summary: '' }]));
    localStorage.setItem('fs-last-cervantes', JSON.stringify({ my: 'rsol', start: null, chosen: false })); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/cervantes/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 });
  await p.waitForTimeout(3000); await p.evaluate(() => { const s = document.getElementById('startSel'); s.selectedIndex = Math.min(2, s.options.length - 1); s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(1500); await p.evaluate(() => { const c = document.querySelector('#suRoute:not([disabled])'); if (c) c.click(); else document.getElementById('run').click(); });   /* reopening puts back what was left (16 Nov 16:05), so route it as a user would */
  await p.waitForFunction(() => { const f = window.__navFc(); return f.routes.length > 0 && !f.running; }, null, { timeout: 300000 }).catch(() => {});
  const R = await p.evaluate(() => { const f = window.__navFc(), vis = id => { const e = document.getElementById(id); return !!(e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'); };
    return { title: document.title, name: (document.querySelector('.tname') || {}).textContent, routes: f.routes.length, legs: vis('solLegs'), card: vis('solCard'), step: vis('solStep'), rm: vis('rmSolent'), mark: /\bMark\b/.test((document.querySelector('.top') || {}).innerText || ''), solent: !!window.FS_MARK }; });
  ok(!R.solent && !/Mark/.test(R.title), 'Route is not the Mark page', R.title);
  ok(R.routes > 0, 'a Solent race saved earlier is routed as normal in Route', R.routes);
  ok(!R.legs && !R.card && !R.step && !R.rm, 'no Solent list, card, step box or menu item', JSON.stringify(R));
  ok(!R.mark, 'no Mark wording in the top bar');
  ok(errs.length === 0, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
