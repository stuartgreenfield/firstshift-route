/* Stuart 22 Nov 07:23 ("Bug": the window dots floated over How sure is the forecast?): no window's dots may lie over another panel.
   Opens the plotter and GPS, then the race panel on each tab, and checks what lies under every grip shown. Run: node tests/grips-clear.js <url> [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cervantes';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch();
  for (const [dn, dev] of [['iPhone 13', devices['iPhone 13']], ['Tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true }]]) {
  const c = await b.newContext({ ...dev, serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 50.70, longitude: -1.45 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('fsPlotBtn'), null, { timeout: 400000 }); await p.waitForTimeout(2000);
  const bad = () => p.evaluate(() => [...document.querySelectorAll('.navgrip2')].filter(g => !g.hidden && g.getClientRects().length).map(g => { const r = g.getBoundingClientRect(), win = document.getElementById(g.id.replace(/^grip-/, '')), mp = document.getElementById('map');
    const u = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).filter(e => e !== g && !g.contains(e))[0];
    const okk = !u || u === document.body || u === document.documentElement || (win && (u === win || win.contains(u))) || (mp && (u === mp || u.contains(mp)));
    return okk ? null : g.id + ' over ' + (u.id || u.className || u.tagName); }).filter(Boolean));
  await p.evaluate(() => { document.getElementById('fsPlotBtn').click(); document.getElementById('liveBtn').click(); }); await p.waitForTimeout(2500);
  let r = await bad(); ok(!r.length, dn + ': plotter and GPS open: no dots on top of anything else', r);
  for (const t of ['decision', 'plan', 'fleet', 'data']) {
    await p.evaluate(t => { const pb = document.getElementById('panelBtn'); const tb = document.querySelector('[data-tab="' + t + '"]'); if (tb && tb.offsetParent) tb.click(); else if (pb) { pb.click(); setTimeout(() => { const x = document.querySelector('[data-tab="' + t + '"]'); x && x.click(); }, 400); } }, t);
    for (const wait of [1500, 4500]) { await p.waitForTimeout(wait); r = await bad(); if (r.length) break; }
    ok(!r.length, dn + ': panel open on ' + t + ': no dots on top of it (1.5 s and 6 s after it opens)', r); }
  ok(!errs.length, dn + ': no script errors', errs.slice(0, 2)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
