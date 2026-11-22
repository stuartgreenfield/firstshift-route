/* 22 Nov navigator review: finding 1, the routing note in plain words (no 'Best known', no 'track'); finding 2, Route's 20/20 fourth box is VMC,
   not '% of polar', and a saved '% of polar' moves to VMC. Run: node tests/review-fixes.js <url> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 50.62, longitude: -1.6 } });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/?race=cervantes');
  await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent), null, { timeout: 600000 }); await p.waitForTimeout(1500);
  const note = await p.evaluate(() => document.getElementById('runNote').textContent); const beaten = await p.evaluate(() => (window.__fsMatrix && window.__fsMatrix() || {}).beaten || []);
  ok(!/Best known|track is/.test(note), 'Routing note has no "Best known" or "track"', note.slice(0, 300));
  ok(!beaten.length || /Also worth knowing: in \S+ wind, the .+ route is [\d.]+ min faster than .+’s own route/.test(note), 'When a route is beaten the note says so in plain words', { beaten: beaten.length, note: note.slice(0, 300) });
  ok(!/Finest first \(/.test(note), 'No long model lists in brackets in the note');
  await p.evaluate(() => { const b = document.getElementById('fsDeckBtn'); if (b) b.click(); }); await p.waitForTimeout(1500);
  const boxes = await p.evaluate(() => window.FSDeck ? window.FSDeck.boxes() : null);
  ok(boxes && boxes.indexOf('perf') < 0 && boxes.indexOf('vmc') >= 0, '20/20 in Route: VMC, not "% of polar"', boxes);
  await p.evaluate(() => { localStorage.setItem('fs-deck', JSON.stringify({ boxes: ['spd', 'hdg', 'dtw', 'perf'], view: 'chart' })); }); await p.reload(); await p.waitForFunction(() => window.FSDeck, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const b = document.getElementById('fsDeckBtn'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }); await p.waitForTimeout(1500);
  const b2 = await p.evaluate(() => window.FSDeck.boxes()); ok(b2.indexOf('perf') < 0 && b2[3] === 'vmc', 'A saved "% of polar" box moves to VMC in Route', b2);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
