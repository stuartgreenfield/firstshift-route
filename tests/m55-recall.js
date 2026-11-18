/* M55 (Stuart 17 Nov 13:46): General recall resets the countdown. After the gun, Recall starts a new sequence of the chosen length
   (5-4-1-0: gun 5 minutes on), in Mark and in Route (where the class start follows it). Run: node tests/m55-recall.js <base> <path> */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cowes-dinard';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + PATH); await p.waitForFunction(() => window.__fsGun && window.FSSolent && FSSolent.state, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const g = Math.round(Date.now() / 1000) - 20; if (window.FS_MARK) { const s = FSSolent.state(); s.startAt = g; s.shown = s.shown || 1; const sc = document.getElementById('solCard'); if (sc) sc.hidden = true; } else window.__fsGun(g); }); await p.waitForTimeout(2500);
  const btn = await p.evaluate(() => { const b = document.querySelector('#solSeq [data-q="recall"]'); return !!b; });
  ok(btn, '20 s after the gun: Recall on the sequence bar');
  if (btn) { await p.evaluate(() => document.querySelector('#solSeq [data-q="recall"]').click()); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ rem: FSSolent.state().startAt - Date.now() / 1000, route: window.FS_MARK ? null : window.__fsGunAt() - Date.now() / 1000 }));
    ok(Math.abs(r.rem - 300) < 5, 'Recall: a new 5-4-1-0 sequence, gun 5 minutes on', r);
    if (r.route != null) ok(Math.abs(r.route - 300) < 5, 'Route\'s class start follows the recall', r); }
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 2)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); })();
