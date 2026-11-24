/* Stuart 24 Nov 22:51 ("the way a new gate is created doesn't seem to work") and 23:20 ("Yes go ... move the whole card with a dash
   line at top"). With real taps on a phone upright, a tablet and a laptop: tap open water off the route, 'Tide gate here' is in sight
   at the top of the box and is what a finger hits there; tapping it makes the gate. The card moves by the dash line at its top and keeps
   that place when it opens again. Run: node tests/tidegate-tap.js [base] */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch();
  for (const [name, dev] of [['phone', devices['iPhone 13']], ['tablet', devices['Galaxy Tab S4']], ['laptop', { viewport: { width: 1440, height: 860 } }]]) {
    const c = await b.newContext({ ...dev, serviceWorkers: 'block' }); const touch = !!dev.hasTouch;
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && F.sel.path && !F.running && !/Refining|Finer routes coming/.test(n); }, null, { timeout: 600000 }); await p.waitForTimeout(1000);
    await p.evaluate(() => document.querySelectorAll('.sheet, .pop').forEach(e => { e.hidden = true; }));
    const tap = (x, y) => touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
    const xy = await p.evaluate(() => { const F = window.__navFc(), path = F.sel.path; for (const f of [0.5, 0.55, 0.45, 0.6, 0.4]) { const q = path[Math.floor(path.length * f)]; for (const dl of [-0.02, 0.02, -0.04]) { const a = window.__fsXY(q.la + dl, q.lo); const z = F.P.depth ? F.P.depth.nearest('z', q.la + dl, q.lo) : -100; if (z < -10 && a[1] > 280 && a[1] < innerHeight * 0.6 && a[0] > 40 && a[0] < innerWidth - 40) return a; } } return null; });
    if (!ok(!!xy, name + ': found open water off the route to tap')) { await c.close(); continue; }
    const hit0 = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.id || e.className); }, xy); await tap(xy[0], xy[1]); await p.waitForTimeout(900);
    const vis = await p.evaluate(() => { const bt = document.getElementById('tgPtAdd'), tp = document.getElementById('tip'); if (!bt || tp.hidden) return null; const r = bt.getBoundingClientRect(), t = tp.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { inCard: r.top >= t.top && r.bottom <= t.bottom, onScreen: r.bottom <= innerHeight, hit: e === bt, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    ok(vis && vis.inCard && vis.onScreen && vis.hit, name + ': Tide gate here is in sight at the top of the box and a finger there hits it', vis || { tappedOn: hit0, xy });
    if (vis && vis.hit) { await tap(vis.x, vis.y); await p.waitForTimeout(1000); const made = await p.evaluate(() => [...document.querySelectorAll('#tgPop .tgmk')].map(e => e.textContent.slice(0, 40))); ok(made.some(t => /GATE 1/.test(t)), name + ': tapping it makes GATE 1 and opens the Tide gates window', made); }
    /* the card moves by its dash line */
    await p.evaluate(() => { const w = document.getElementById('tgPop'); if (w) w.hidden = true; });
    await tap(xy[0] + 40, xy[1] + 10); await p.waitForTimeout(800);
    const g = await p.evaluate(() => { const e = document.getElementById('tipGrip'), r = e.getBoundingClientRect(), t = document.getElementById('tip').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: r.height > 10, top: t.top }; });
    ok(g.shown, name + ': the card has a dash line at its top', g);
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 5, g.y + 60, { steps: 5 }); await p.mouse.move(g.x + 10, g.y + 120, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
    const t1 = await p.evaluate(() => document.getElementById('tip').getBoundingClientRect().top);
    ok(Math.abs(t1 - g.top - 120) < 30 || t1 > g.top + 40, name + ': dragging the dash line moves the card', [g.top, t1]);
    await p.evaluate(() => document.getElementById('tipX').click()); await tap(xy[0] + 40, xy[1] + 10); await p.waitForTimeout(800);
    const t2 = await p.evaluate(() => document.getElementById('tip').getBoundingClientRect().top);
    ok(Math.abs(t2 - t1) < 6, name + ': it opens again where it was left', [t1, t2]);
    ok(!errs.length, name + ': no script errors', errs.slice(0, 3)); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
