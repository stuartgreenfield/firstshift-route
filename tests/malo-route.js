/* F101 (21 Nov): the corrected Cowes Dinard St Malo course routes, leaving the Casquets, the whole of Guernsey and the Minquiers to port
   (so west of each). Run: node tests/malo-route.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-finesec', '0'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=dinard', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); const t = (document.getElementById('runNote') || {}).textContent || ''; return (f && f.sel && f.sel.path && !f.running) || /No route|Cannot|No way/.test(t); }, null, { timeout: 600000 });
  const r = await p.evaluate(() => { const f = window.__navFc(), path = f.sel && f.sel.path || [], at = la => { let best = null; path.forEach(q => { if (!best || Math.abs(q.la - la) < Math.abs(best.la - la)) best = q; }); return best; };
    return { name: window.__navCourse().name, note: document.getElementById('runNote').textContent.slice(0, 160), n: path.length, end: path.length && path[path.length - 1], cas: at(49.722), near: path.map(q => [q.la.toFixed(3), q.lo.toFixed(3)]).filter(q => Math.abs(q[0] - 49.722) < 0.12), marks: window.__navCourse().marks.map(m => m.name + ' ' + m.side), han: at(49.435), min: at(48.905), routes: (f.routes || []).length }; });
  ok(r.n > 10 && /St Malo/.test(r.name), 'St Malo routes', r.routes + ' routes, ' + r.note);
  ok(r.cas && r.cas.lo < -2.37694, 'West of the Casquets (left to port)', r.cas && r.cas.lo.toFixed(3) + ' near: ' + JSON.stringify(r.near) + ' ' + r.marks.join(', '));
  ok(r.han && r.han.lo < -2.70233, 'West of Les Hanois: the whole of Guernsey to port', r.han && r.han.lo.toFixed(3));
  ok(r.min && r.min.lo < -2.31833, 'West of the W Minquiers buoy: the Minquiers to port', r.min && r.min.lo.toFixed(3));
  ok(r.end && Math.abs(r.end.la - 48.672) < 0.05 && Math.abs(r.end.lo + 2.081) < 0.08, 'Finishes off St Malo', r.end && r.end.la.toFixed(3) + ' ' + r.end.lo.toFixed(3));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
