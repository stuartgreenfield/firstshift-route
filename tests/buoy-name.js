/* Stuart 22 Nov 07:31: a tapped buoy shows its code and name big and clear. Taps 3E on the Mark chart and checks the name is drawn
   in the large bold label (picture saved). Run: node tests/buoy-name.js http://localhost:8779 [path] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/';
const OUT = '/tmp/claude-0/-home-claude/abeaea36-9130-5b0e-8b05-be1641b6b08c/scratchpad/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-coach-mute'].forEach(k => localStorage.setItem(k, '1')); });
  await c.addInitScript(() => { window.__ft = []; [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D].filter(Boolean).forEach(K => { const C = K.prototype, f0 = C.fillText; C.fillText = function (t, x, y) { if (window.__ft.length < 50000) window.__ft.push([String(t), this.font]); return f0.apply(this, arguments); }; }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__fsXY && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const c = document.getElementById('solCard'); if (c) c.hidden = true; });
  const m = await p.evaluate(() => { const m = FSSolent.marks().find(x => x.id === '3E') || FSSolent.marks()[0]; return { id: m.id, name: m.name, lat: m.lat, lon: m.lon }; });
  for (const zoom of [0, 3]) {
    for (let i = 0; i < zoom; i++) { const xy = await p.evaluate(m => window.__fsXY(m.lat, m.lon), m); await p.mouse.move(xy[0], xy[1]); await p.mouse.wheel(0, -300); await p.waitForTimeout(400); }
    const xy = await p.evaluate(m => window.__fsXY(m.lat, m.lon), m);
    await p.evaluate(() => { window.__ft = []; });
    await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(1200);
    const got = await p.evaluate(n => (window.__ft || []).filter(q => q[0].indexOf(n) >= 0).map(q => q[1]), m.name);
    const big = got.find(f => /(700|bold) 1[5-8]px/.test(f));
    ok(!!big, 'Zoom step ' + zoom + ': tapping ' + m.id + ' draws "' + m.id + ' ' + m.name + '" in large bold', got.slice(0, 2));
    await p.screenshot({ path: OUT + 'buoy-' + zoom + '.jpg', type: 'jpeg', quality: 70, clip: { x: Math.max(0, xy[0] - 150), y: Math.max(0, xy[1] - 90), width: 320, height: 180 } });
    await p.evaluate(() => { const C = CanvasRenderingContext2D.prototype; }); }
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
