/* Stuart 22 Nov 09:23 ("nav and deck show same tracks and routes"): DECK shows only the route followed, no wind or tide arrows, no other models;
   NAV shows everything. Run: node tests/deck-nav.js http://localhost:8778 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778', PATH = process.argv[3] || '/channel-area/?race=myth';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && window.__navLayers, null, { timeout: 500000 }); await p.waitForTimeout(1500);
  const L = () => p.evaluate(() => { const l = window.__navLayers(); return { wind: l.show.wind, tide: l.show.tide, shown: l.hid.filter(h => !h[1]).length, all: l.hid.length }; });
  await p.evaluate(() => document.getElementById('navPlotBtn').click()); await p.waitForTimeout(1500);
  const view = () => p.evaluate(() => { const b = document.querySelector('.npview .on'); return b ? b.textContent : null; });
  let v = await view(), l = await L(); ok(v === 'DECK' && !l.wind && !l.tide && l.shown === 1, 'PLOT on opens DECK: one route, no wind or tide arrows', { v, l });
  await p.evaluate(() => document.querySelector('.npview').click()); await p.waitForTimeout(1000);
  v = await view(); const n = await L(); ok(v === 'NAV' && n.shown > 1 && (n.wind || n.tide), 'NAV: every route, wind and tide arrows', { v, n });
  await p.evaluate(() => document.querySelector('.npview').click()); await p.waitForTimeout(1000);
  v = await view(); l = await L(); ok(v === 'DECK' && !l.wind && !l.tide && l.shown === 1, 'Back to DECK: one route again, no arrows', { v, l });
  /* switch the wind arrows on in Deck, go to Nav and back: Deck opens clean again, the track still on */
  await p.evaluate(() => { const l = window.__navLayers(); l.show.wind = true; window.__navLayers(l); }); await p.evaluate(() => document.querySelector('.npview').click()); await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('.npview').click()); await p.waitForTimeout(800);
  l = await L(); const tr = await p.evaluate(() => window.__navLayers().show.tracks); ok(!l.wind && !l.tide && l.shown === 1 && tr === true, 'Wind switched on in Deck, then Nav and back: Deck clean again, track on', { l, tr });
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
