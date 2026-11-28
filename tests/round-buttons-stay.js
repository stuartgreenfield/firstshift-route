/* Stuart 28 Nov 17:53 (picture: the ruler alone in the middle of the chart, above the row): "The measure tool is floating about please fix
   as we decided in the last round". Cause, reproduced: a press of half a second on a round button with a slip of 3 px counted as a move,
   the button left the one line of AP and kept its stray place after a reload. Now the round buttons do not move at all, and a move saved
   before is forgotten. This test: (1) a saved stray move of the ruler is gone on load and the ruler is in the row; (2) a long press with a
   slip, and a second long press, leave every round button where it was; (3) the same after a reload.
   Run through tools/probe/with78.sh: node tests/round-buttons-stay.js http://localhost:8779 (Route) or http://localhost:8778 (Route+) */
const { chromium } = require('playwright');
const BASE = process.argv[2], W = 390, H = 844;
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
  await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('rbs')) { sessionStorage.setItem('rbs', 1); localStorage.setItem('nav-pos', JSON.stringify({ P4: { fsRulerBtn: [3, -60], helpBtn: [-40, -40] } })); } const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const load = async () => { await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500); await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); }); for (let i = 0; i < 60; i++) { if (!(await p.evaluate(() => !!window.__navFc().running))) break; await p.waitForTimeout(2000); } await p.waitForTimeout(4000); };
  const rd = () => p.evaluate(() => [...document.querySelectorAll('.fabhelp')].filter(f => f.getClientRects().length && getComputedStyle(f).visibility !== 'hidden' && getComputedStyle(f).display !== 'none').map(f => { const r = f.getBoundingClientRect(); return { id: f.id, l: Math.round(r.left), t: Math.round(r.top), tr: f.style.translate || '' }; }));
  const line = (R) => new Set(R.map(x => x.l)).size === 1 || new Set(R.map(x => x.t)).size === 1;
  const sig = (R) => R.map(x => x.id + '@' + x.l + ',' + x.t).sort().join(' ');
  await p.goto(BASE + '/fastnet/'); await load();
  let R = await rd(); ok(R.every(x => !x.tr) && line(R), 'a saved stray move is forgotten: every round button in one line', sig(R));
  ok(await p.evaluate(() => { const b = (JSON.parse(localStorage.getItem('nav-pos') || '{}') || {}).P4 || {}; return !('fsRulerBtn' in b) && !('helpBtn' in b); }), 'the saved moves of round buttons are gone from storage');
  const before = sig(R);
  const q = await p.evaluate(() => { const r = document.getElementById('fsRulerBtn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.move(q[0], q[1]); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.move(q[0] + 3, q[1] - 2, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(800);
  await p.mouse.move(q[0] + 3, q[1] - 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(4000);
  if (await p.evaluate(() => document.body.classList.contains('fsruler'))) { await p.evaluate(() => window.FSWpt && FSWpt.ruler(false)); await p.waitForTimeout(3000); }
  R = await rd(); ok(sig(R) === before && R.every(x => !x.tr), 'a long press with a slip moves no round button', sig(R));
  await p.reload(); await load(); R = await rd(); ok(sig(R) === before && R.every(x => !x.tr), 'after a reload every round button is in the same line', sig(R));
  ok(!errs.length, 'no script errors', errs.join(' ; ').slice(0, 200));
  console.log('round-buttons-stay: ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
