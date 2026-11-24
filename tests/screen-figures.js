/* Screen figures, a release check (Stuart 24 Nov 2026 18:03: "the information we display on screen is perfect and doesn't cause
   inaccuracy in communications ... when you roll over the routes, we know what the information is and where it's repeated on screen").
   Puts the pointer on points along the chosen route and checks every figure on the route card against what it should be made from
   (docs/SCREEN-FIGURES.md): the route point's own figures, and every forecast row on the same card at the SAME time, place and model
   as the route point. Until fix C1 is built (Stuart's go), the forecast rows are read at the slider time, so those checks are expected
   to fail and are reported as KNOWN. Run: node tests/screen-figures.js [base] [path] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0, known = 0; const ok = (c, m, d, isKnown) => { if (c) pass++; else if (isKnown) known++; else fail++; console.log((c ? 'PASS ' : isKnown ? 'KNOWN ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); return c; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + PATH); await p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); return F && F.sel && F.sel.path && F.sel.path.length > 10 && !F.running; }, null, { timeout: 600000 });
  await p.evaluate(() => document.querySelectorAll('.sheet, .pop').forEach(e => { e.hidden = true; }));
  const N = await p.evaluate(() => window.__navFc().sel.path.length);
  for (const frac of [0.25, 0.5, 0.75]) {
    const i = Math.floor(N * frac);
    const pt = await p.evaluate(i => { const F = window.__navFc(), q = F.sel.path[i]; const xy = window.__fsXY(q.la, q.lo); return { q: { t: q.t, la: q.la, lo: q.lo, hdg: q.hdg, twa: q.twa, tws: q.tws, twd: q.twd, bsp: q.bsp, cu: q.cu, cv: q.cv }, xy, model: F.sel.models[0], T0: F.T0 }; }, i);
    await p.mouse.move(pt.xy[0], pt.xy[1]); await p.waitForTimeout(400);
    const card = await p.evaluate(() => { const t = document.getElementById('tip'); if (!t || t.hidden) return null; const rows = {}; t.querySelectorAll('#tipBody .r').forEach(r => { const s = r.querySelectorAll('span'); if (s.length >= 2) rows[s[0].textContent.trim()] = s[1].textContent.trim(); }); const head = (t.querySelector('#tipBody b') || {}).textContent || ''; return { rows, head }; });
    const tag = 'point ' + (frac * 100) + '%';
    if (!ok(card && card.rows.Heading, tag + ': the route card opens on the route', card && card.head)) continue;
    const q = pt.q, R = card.rows, num = s => parseFloat(String(s).replace(/[^\d.-]+/g, ' ').trim().split(' ')[0]);
    ok(Math.abs(num(R['Boat speed']) - q.bsp) < 0.051, tag + ': Boat speed = the route point', R['Boat speed'] + ' vs ' + q.bsp.toFixed(2));
    ok(R.Heading.indexOf(String(Math.round(q.hdg) % 360).padStart(3, '0')) === 0 || R.Heading.indexOf(String(Math.round(q.hdg)).padStart(3, '0')) === 0, tag + ': Heading = the route point', R.Heading + ' vs ' + q.hdg.toFixed(1));
    ok(new RegExp('TWA ' + Math.abs(Math.round(q.twa)) + '°').test(R.Heading), tag + ': TWA = the route point', R.Heading + ' vs ' + q.twa.toFixed(1));
    ok(Math.abs(num(R['True wind']) - q.tws) < 0.051, tag + ': True wind speed = the route point', R['True wind'] + ' vs ' + q.tws.toFixed(2));
    /* the forecast rows on the same card: same time, place and model as the route point (C1) */
    const exp = await p.evaluate(([q, model]) => { const P = window.__navFc().P, f = P.wind[model], KN = 1852 / 3600; if (!f) return null; const u = f.sample('u', q.la, q.lo, q.t), v = f.sample('v', q.la, q.lo, q.t); return { tws: Math.hypot(u, v) / KN, twd: (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360 }; }, [q, pt.model]);
    const windKey = Object.keys(R).find(k => /^Wind /.test(k));
    if (exp && windKey) { const got = num(R[windKey]); ok(Math.abs(got - exp.tws) < 0.6, tag + ': the card\'s "' + windKey + '" row is the route\'s model at the route point\'s time and place', R[windKey] + ' vs ' + exp.tws.toFixed(1) + ' kn from ' + Math.round(exp.twd) + '° (' + pt.model + ')', true); }
  }
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed, ' + known + ' known (waiting for fix C1)'); await b.close(); process.exit(fail ? 1 : 0); })();
