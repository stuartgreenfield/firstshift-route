/* F8 (Stuart 15 Nov 16:12, 17:10: "A switch: mark or route", "Next turn on the route"): in ROUTE mode the plotter bar steers to the next
   turn of the route on the chart and follows a new route at once. Run: node tests/plotroute.js http://localhost:8769 */
const { chromium } = require('playwright');
const NOTOUR = () => document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });   /* Show me round? (14 Nov): the tests answer No */
const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const R = Math.PI / 180;
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u) || /^(data|blob):/.test(u)) return r.continue(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await ctx.addInitScript(NOTOUR); await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.clear(); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-boatset', '1'); }
    /* a boat at 50.55 N 1.70 W making 6 kn on 200 deg true */
    window.__fake = { la: 50.55, lo: -1.70, sog: 6, cog: 200 };
    const fx = () => ({ coords: { latitude: window.__fake.la, longitude: window.__fake.lo, accuracy: 5, speed: window.__fake.sog * 0.514444, heading: window.__fake.cog, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) };
    Object.defineProperty(navigator, 'geolocation', { get: () => g });
  });
  const p = await ctx.newPage(); await p.goto(BASE + '/channel-area/');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 300000 });
  const onPath = async (i) => p.evaluate((i) => { const pl = window.__fsPlan(); const a = pl.path[i], b = pl.path[i + 1]; const k = Math.cos(a[0] * Math.PI / 180); return { la: a[0] + (b[0] - a[0]) * 0.5, lo: a[1] + (b[1] - a[1]) * 0.5, cog: (Math.atan2((b[1] - a[1]) * k, b[0] - a[0]) * 180 / Math.PI + 360) % 360 }; }, i);
  const put = async (q) => { await p.evaluate((q) => { window.__fake.la = q.la; window.__fake.lo = q.lo; window.__fake.cog = q.cog; }, q); await p.waitForTimeout(2500); };
  await put(await onPath(4));
  await p.evaluate(() => { window.__fsPlot.reset(); document.getElementById('fsPlotBtn').click(); }); await p.waitForTimeout(3000);
  const m0 = await p.evaluate(() => window.__fsPlot.calc().m.name);
  await p.evaluate(() => { const b = document.querySelector('#fsPlot [data-k="mode"]'); b.click(); }); await p.waitForTimeout(1500);
  const r1 = await p.evaluate(() => { const o = window.__fsPlot.calc(), pl = window.__fsPlan(), t = pl.path[o.i]; return { name: o.m.name, i: o.i, tgt: [o.m.lat, o.m.lon], pathPt: t, dtw: o.dtw, xte: o.xte, bar: document.getElementById('fsPlot').textContent.slice(0, 160), btn: document.querySelector('#fsPlot [data-k="mode"]').textContent, path: JSON.stringify(pl.path.slice(-3)) }; });
  ok(r1.btn === 'ROUTE' && /^Route:/.test(r1.name) && /Route: next turn|Route: finish/.test(r1.bar), 'the switch changes MARK to ROUTE and the bar says so', m0 + ' -> ' + r1.name);
  ok(Math.abs(r1.tgt[0] - r1.pathPt[0]) < 1e-6 && Math.abs(r1.tgt[1] - r1.pathPt[1]) < 1e-6, 'it steers to a point of the route on the chart', JSON.stringify(r1.tgt));
  ok(r1.xte && r1.xte.d < 0.05, 'on the route line, XTE is near 0', JSON.stringify(r1.xte));
  // a new route (a later start): the bar must follow it at once
  const before = r1.path;
  await p.evaluate(() => { const s = document.getElementById('startSel'); s.selectedIndex = Math.min(s.options.length - 1, s.selectedIndex + 3); s.dispatchEvent(new Event('change', { bubbles: true })); const r = document.getElementById('run'); if (r) r.click(); });
  await p.waitForFunction((bf) => { const f = window.__navFc(); return f && f.sel && !f.running && JSON.stringify(window.__fsPlan().path.slice(-3)) !== bf; }, before, { timeout: 300000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const r2 = await p.evaluate(() => { const o = window.__fsPlot.calc(), pl = window.__fsPlan(), t = pl.path[o.i]; return { tgt: [o.m.lat, o.m.lon], pathPt: t, changed: true }; });
  ok(r2.pathPt && Math.abs(r2.tgt[0] - r2.pathPt[0]) < 1e-6 && Math.abs(r2.tgt[1] - r2.pathPt[1]) < 1e-6, 'after a new route the bar steers along the new one', JSON.stringify(r2.tgt));
  await p.evaluate(() => document.querySelector('#fsPlot [data-k="mode"]').click()); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !window.__fsPlot.calc().m.route && document.querySelector('#fsPlot [data-k="mode"]').textContent === 'MARK'), 'and MARK goes back to the next mark');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
