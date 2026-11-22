/* Stuart 22 Nov 08:01 (decided 08:05): CLEAR leaves the chart; MENU brings the menus and windows back. With the phone's GPS, or ashore,
   the menus stay up until CLEAR; only while a boat connection sends instrument data do they hide again after the time set (1, 5, 10 min).
   Run: node tests/menus-hide.js http://localhost:8779 (Route) and http://localhost:8778 (Route+, with boat data) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 50.70, longitude: -1.45 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date() }); await p.goto(BASE + '/channel-area/?race=cervantes');
  for (let i = 0; i < 120 && !(await p.evaluate(() => !!(window.NavClear && document.getElementById('navClearBtn') && document.querySelectorAll('#finBox .fin').length)).catch(() => false)); i++) await p.clock.runFor(3000);
  const plus = await p.evaluate(() => !!window.__navFeed);
  const cleared = () => p.evaluate(() => document.body.classList.contains('navclear'));
  const feed = () => p.evaluate(() => { const t = Date.now() / 1000, cs = s => { let x = 0; for (const ch of s) x ^= ch.charCodeAt(0); return '$' + s + '*' + x.toString(16).toUpperCase().padStart(2, '0'); }; window.__navFeed([t.toFixed(3) + '\t' + cs('IIVHW,,T,,M,6.5,N,12.0,K'), t.toFixed(3) + '\t' + cs('IIMWV,45.0,R,12.0,N,A')]); });
  await p.evaluate(() => window.__navHide(1));
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.clock.runFor(2000);
  await p.evaluate(() => window.NavClear.set(true)); ok(await cleared(p), (plus ? 'Route+' : 'Route') + ': CLEAR clears the screen');
  await p.evaluate(() => document.getElementById('navMenuBtn').click()); await p.clock.runFor(1000);
  ok(!(await cleared(p)), 'MENU brings the menus back');
  for (let i = 0; i < 30; i++) await p.clock.runFor(5000);
  ok(!(await cleared(p)), 'Phone GPS on, no boat connection, hide set to 1 min: after 2.5 min the menus are still up');
  if (plus) {
    await p.evaluate(() => window.NavClear.set(true)); await p.evaluate(() => document.getElementById('navMenuBtn').click()); await p.clock.runFor(1000);
    for (let i = 0; i < 16; i++) { await feed(); await p.clock.runFor(5000); }
    ok(await cleared(p), 'Route+ with boat data arriving, hide set to 1 min: the menus hide again after the minute');
    await p.evaluate(() => document.getElementById('navMenuBtn').click()); await p.clock.runFor(1000); await p.evaluate(() => window.__navHide(0));
    for (let i = 0; i < 20; i++) { await feed(); await p.clock.runFor(5000); }
    ok(!(await cleared(p)), 'Boat data, hide set to Off: the menus stay up');
  }
  const opts = await p.evaluate(() => { const s = document.getElementById('npHide'); return s ? [...s.options].map(o => o.value).join(',') : null; });
  ok(opts === '0,1,5,10', 'Settings offer Off, 1, 5 and 10 minutes', opts);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
