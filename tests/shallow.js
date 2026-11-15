/* Stuart 15 Nov 2026: a route crossed the Shingles in 2.5 m with the safety depth at 3 m. Route the course on the device and check
   every 30 m of the chosen route against the safety depth. Run: node tests/shallow.js http://localhost:8769 local [race] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8770';
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage();
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const AREA = process.argv[5] || 'channel-area'; await p.goto(BASE + '/' + AREA + '/' + (process.argv[4] && process.argv[4] !== '-' ? '?race=' + process.argv[4] : '')); 
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 600000 });
  await p.waitForTimeout(3000);
  if (process.argv[3] === 'local') { await p.evaluate(() => document.getElementById('errRetry').click()); await p.waitForTimeout(2000); await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 500000 }); await p.waitForTimeout(2000); }
  const r = await p.evaluate(() => {
    const F = window.__navFc(), P = F.P, D = P.depth, safe = +document.getElementById('depth').value, out = { safe, dlat: D.L ? D.L.dlat : null, routes: [] };
    const path = F.sel.path, hits = [];
    let minZ = 0, nodeBad = 0;
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i], q = path[i + 1], dkm = Math.hypot((q.la - a.la) * 111, (q.lo - a.lo) * 111 * Math.cos(a.la * Math.PI / 180)), n = Math.max(2, Math.ceil(dkm / 0.03));
      const za = D.nearest('z', a.la, a.lo); if (za > -safe) nodeBad++;
      for (let k = 0; k <= n; k++) { const la = a.la + (q.la - a.la) * k / n, lo = a.lo + (q.lo - a.lo) * k / n, z = D.nearest('z', la, lo); if (z === z && z > -safe) { hits.push([i, +la.toFixed(4), +lo.toFixed(4), +z.toFixed(1), +dkm.toFixed(2)]); } }
    }
    out.n = path.length; out.fin = F.sel.finish; out.err = (document.getElementById('errBox') && !document.getElementById('errBox').hidden) ? document.getElementById('errBox').textContent.slice(0, 200) : ''; var cf = window.__fsCourseFull ? window.__fsCourseFull().pts : null, lp = path[path.length - 1]; out.togo = cf ? +(Math.hypot((cf[cf.length - 1][0] - lp.la) * 60, (cf[cf.length - 1][1] - lp.lo) * 60 * Math.cos(lp.la * Math.PI / 180))).toFixed(1) : null; out.margin = document.getElementById('margin') ? document.getElementById('margin').value : null; out.course = (window.__fsCourseFull && window.__fsCourseFull().name) || ''; out.nodeBad = nodeBad; out.name = F.sel.name; out.hits = hits.slice(0, 60); out.nhits = hits.length;
    
    return out;
  });
  console.log(JSON.stringify({ area: AREA, race: process.argv[4] || '', n: r.n, fin: r.fin, err: r.err, togo: r.togo, margin: r.margin, safe: r.safe, nhits: r.nhits, hits: r.hits.slice(0, 5) }));
  console.log((r.nhits === 0 ? 'PASS' : 'FAIL') + ' no part of the route in water shallower than the safety depth | ' + r.nhits + ' points');
  console.log((r.nhits === 0 ? 1 : 0) + ' passed, ' + (r.nhits ? 1 : 0) + ' failed'); process.exitCode = r.nhits ? 1 : 0;
  const routes = await p.evaluate(() => { const F = window.__navFc(); return F; });
  await b.close();
})();
