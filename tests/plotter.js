/* Route's basic plotter (14 Nov 2026): BTW, DTW, VMC, ETA and XTE from the phone's GPS, checked against sums done here.
   Run: node tests/plotter.js http://localhost:8769 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const R = Math.PI / 180;
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u) || /^(data|blob):/.test(u)) return r.continue(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.clear(); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-boatset', '1'); }
    /* a boat at 50.55 N 1.70 W making 6 kn on 200 deg true */
    window.__fake = { la: 50.55, lo: -1.70, sog: 6, cog: 200 };
    const fx = () => ({ coords: { latitude: window.__fake.la, longitude: window.__fake.lo, accuracy: 5, speed: window.__fake.sog * 0.514444, heading: window.__fake.cog, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) };
    Object.defineProperty(navigator, 'geolocation', { get: () => g });
  });
  const p = await ctx.newPage(); await p.goto(BASE + '/channel-area/');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 300000 });
  ok(await p.evaluate(() => !!document.getElementById('fsPlotBtn')), 'PLOT button beside GPS');
  await p.evaluate(() => { window.__fsPlot.reset(); document.getElementById('fsPlotBtn').click(); });
  await p.waitForTimeout(4000);
  const o = await p.evaluate(() => { const o = window.__fsPlot.calc(); return { ok: o.ok, i: o.i, m: o.m, btw: o.btw, dtw: o.dtw, vmc: o.vmc, eta: o.eta, xte: o.xte, c: window.__navCourse(), bar: !document.getElementById('fsPlot').hidden, live: window.__navLiveState().on }; });
  ok(o.ok && o.bar && o.live, 'PLOT shows the bar and turns on Live GPS');
  /* independent sums in a flat frame about the boat */
  const f = { la: 50.55, lo: -1.70 }, k = Math.cos(f.la * R) * 60, to = (la, lo) => ({ x: (lo - f.lo) * k, y: (la - f.la) * 60 });
  const M = to(o.m.lat, o.m.lon), btw = (Math.atan2(M.x, M.y) / R + 360) % 360, dtw = Math.hypot(M.x, M.y), vmc = 6 * Math.cos((200 - btw) * R);
  ok(Math.abs(o.btw - btw) < 0.01 && Math.abs(o.dtw - dtw) < 0.001, 'bearing and distance to ' + o.m.name, o.btw.toFixed(1) + '° ' + o.dtw.toFixed(2) + ' nm');
  ok(Math.abs(o.vmc - vmc) < 0.01, 'VMC is speed over the ground along the bearing', o.vmc.toFixed(2) + ' kn');
  ok(vmc > 0.3 ? Math.abs((o.eta - Date.now()) / 3600e3 - dtw / vmc) < 0.01 : o.eta == null, 'ETA from distance over VMC', o.eta ? new Date(o.eta).toISOString().slice(11, 16) : 'not closing');
  const pts = o.c.marks.concat([o.c.finish]), A0 = o.i > 0 ? o.c.marks[o.i - 1] : o.c.start, A = to(A0.lat, A0.lon), dx = M.x - A.x, dy = M.y - A.y, cr = (dx * -A.y - dy * -A.x) / Math.hypot(dx, dy);
  ok(o.xte && Math.abs(o.xte.d - Math.abs(cr)) < 0.001 && o.xte.side === (cr > 0 ? 'L' : 'R'), 'XTE from the leg, with the side', o.xte && o.xte.d.toFixed(2) + ' nm ' + o.xte.side);
  /* move the boat to within 0.05 nm of the mark: the next mark comes up */
  const i0 = o.i; await p.evaluate(m => { window.__fake.la = m.lat + 0.0005; window.__fake.lo = m.lon; }, o.m); await p.waitForTimeout(3500);
  const i1 = await p.evaluate(() => window.__fsPlot.calc().i);
  ok(i1 === i0 + 1 || (i0 === pts.length - 1), 'within 0.1 nm the next mark becomes active', i0 + ' to ' + i1);
  const m0 = await p.evaluate(() => document.getElementById('fsPlot').classList.contains('mini'));
  await p.evaluate(() => { document.querySelector('#fsPlot [data-k="mini"]').click(); });
  const m1 = await p.evaluate(() => document.getElementById('fsPlot').classList.contains('mini'));
  ok(m0 !== m1, 'MIN and the name switch between one line and all the figures', (m0 ? 'one line' : 'full') + ' to ' + (m1 ? 'one line' : 'full'));
  if (m1) await p.evaluate(() => { document.querySelector('#fsPlot [data-k="mini"]').click(); });
  await p.screenshot({ path: (process.argv[3] || '.') + '/plotter.png' });
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
