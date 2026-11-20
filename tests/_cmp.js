/* Side by side (Stuart 20 Nov 11:22): the same race and forecasts on the current Route and on the duplicate. Server pre-routes blocked unless PRE=1.
   node tests/_cmp.js <base> <page> [label] */
const { chromium } = require('playwright'); const [BASE, PG, LAB] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 860 } });
  if (!process.env.PRE) await c.route(/\/pre\/routes\.json/, r => r.fulfill({ status: 404, body: '' }));   /* a 404, not an aborted request: an aborted one looks like lost signal and Route reloads when it comes back */
  await c.addInitScript((FS) => { if (FS) localStorage.setItem('fs-finesec', FS); if (FS === 'quick') { localStorage.removeItem('fs-finesec'); localStorage.setItem('fs-rdetail', 'quick'); } const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); }, process.env.FINESEC || '');
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); const t0 = Date.now(); await p.goto(BASE + PG);
  await p.waitForFunction(() => /First answer|Routed on the server/.test((document.getElementById('runNote') || {}).textContent || ''), null, { timeout: 5400000 });
  const note = await p.evaluate(() => document.getElementById('runNote').textContent); const T = await p.evaluate(() => window.__fsTimes ? window.__fsTimes() : null);
  const M = await p.evaluate(() => window.__fsMatrix && window.__fsMatrix());
  const own = {}; if (M) M.models.forEach((m, j) => { const i = M.ids.indexOf(m); if (i >= 0) own[m] = +M.cols[j][i].toFixed(3); });
  const best = await p.evaluate(() => { const s = window.__fsDump && window.__fsDump(); if (!s) return null; const r = s.routes.find(x => x.best); return r ? { name: r.name, mean: +r.mean.toFixed(3) } : null; });
  console.log(JSON.stringify({ lab: LAB, page: PG, wall: +((Date.now() - t0) / 1000).toFixed(1), times: T, best, own, errs, note: note.slice(0, 300) }));
  await b.close(); })();
