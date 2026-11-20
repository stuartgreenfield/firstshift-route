/* Windows over the chart float and move (Stuart 17 Nov 05:30 to 05:33), on Route and on Mark:
   a round button: a short tap still works it; a long touch starts the move (outline flashes), drag, a long press locks it;
   dropped on the top bar it slides to the nearest gap; Undo puts it back; the GPS window has a small grip all the time and moves
   the same way; Reset to FirstShift layout clears every position.
   Run: node tests/move-windows.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); };
const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, tr: e.style.translate, on: e.classList.contains('navmove-on') }; }, sel);
async function hold(p, x, y, ms) { await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(ms || 750); }
(async () => { const b = await chromium.launch();
  for (const [name, url, ready] of [['Route', '/channel-area/', () => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }], ['Mark', '/mark/', () => window.FSMark && window.__navFc && window.__navFc().P]]) {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: 50.70, longitude: -1.20, accuracy: 5 }, permissions: ['geolocation'] }); await c.addInitScript(init);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + url); await p.waitForFunction(ready, null, { timeout: 600000 }).catch(() => {}); await p.waitForTimeout(2500);
    /* Mark opens with the Start new race card (19 Nov, one card at start-up): close it, as a person would, so the chart buttons show */
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.getClientRects().length) x.click(); }); await p.waitForTimeout(600);
    /* a short tap still works the button */
    const o0 = await p.evaluate(() => document.querySelector('#oriBtn .orl') && document.querySelector('#oriBtn .orl').textContent);
    await p.click('#oriBtn'); await p.waitForTimeout(400);
    const o1 = await p.evaluate(() => document.querySelector('#oriBtn .orl') && document.querySelector('#oriBtn .orl').textContent);
    ok(o0 !== o1, name + ': a short tap on North up still works it', o0 + ' -> ' + o1);
    await p.click('#oriBtn'); await p.click('#oriBtn'); await p.waitForTimeout(300);   /* back to North up */
    /* long touch: moving, outline flashes, Undo shows */
    let a = await box(p, '#oriBtn'); await hold(p, a.x, a.y);
    let m = await box(p, '#oriBtn'); const ub = await p.evaluate(() => { const u = document.getElementById('navUndo'); return u && !u.hidden && /Undo/.test(u.textContent); });
    ok(m.on && ub, name + ': a long touch starts the move: the outline flashes and Undo shows');
    await p.mouse.move(a.x - 220, a.y - 60, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    const tap1 = await p.evaluate(() => document.querySelector('#oriBtn .orl').textContent);
    a = await box(p, '#oriBtn'); await hold(p, a.x, a.y); await p.mouse.up(); await p.waitForTimeout(500);
    m = await box(p, '#oriBtn'); const saved = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('nav-pos') || '{}')));
    ok(!m.on && /oriBtn/.test(saved) && m.tr, name + ': a long press locks it there and it is kept', m.tr + ' ' + saved.slice(0, 80));
    ok(tap1 === 'N UP' && (await p.evaluate(() => document.querySelector('#oriBtn .orl').textContent)) === 'N UP', name + ': moving it did not also press it');
    /* dropped on the top bar: slides to the nearest gap */
    a = await box(p, '#oriBtn'); const tb = await p.evaluate(() => { const e = document.querySelector(window.FS_MARK ? '#setBtn' : '#setBtn'); const r = e.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    await hold(p, a.x, a.y); await p.mouse.move(tb.x, tb.y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(200); a = await box(p, '#oriBtn'); await hold(p, a.x, a.y); await p.mouse.up(); await p.waitForTimeout(500);
    m = await box(p, '#oriBtn'); const over = m.l < tb.r && m.r > tb.l && m.t < tb.b && m.b > tb.t;
    ok(!over && m.t >= 0, name + ': dropped on the Settings button, it slides to the nearest gap', JSON.stringify({ btn: [m.l, m.t, m.r, m.b].map(Math.round), set: [tb.l, tb.t, tb.r, tb.b].map(Math.round) }));
    /* Save new position (Stuart 19 Nov 14:43): the box says it, and it locks the move without a second long press */
    await p.evaluate(() => { if (window.NavDrag && NavDrag.on && NavDrag.on() && NavDrag.lock) NavDrag.lock(); }); await p.waitForTimeout(1600);   /* 20 Nov: start this step with nothing being moved (the drop before may leave the button in its move, waiting for Save; a long press would then lock it) */
    a = await box(p, '#oriBtn'); await hold(p, a.x, a.y); await p.mouse.move(a.x - 120, a.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    const sv1 = await p.evaluate(() => { const u = document.getElementById('navUndo'); return u && !u.hidden && /Save new position/.test(u.textContent) && /Undo/.test(u.textContent); });
    await p.waitForTimeout(800); await p.click('#navSaveB'); await p.waitForTimeout(400); m = await box(p, '#oriBtn');
    const sv2 = await p.evaluate(() => { const u = document.getElementById('navUndo'); return u && !u.hidden && /New position saved/.test(u.textContent); });
    ok(sv1 && sv2 && !m.on && /oriBtn/.test(await p.evaluate(() => localStorage.getItem('nav-pos'))), name + ': the box says Save new position; tapping it locks the move and says New position saved', JSON.stringify({ sv1, sv2, on: m.on }));
    /* Undo */
    await p.waitForTimeout(800);   /* Undo ignores a tap in its first 0.7 s (the lifting finger) */
    const before = m.tr; await p.click('#navUndoB'); await p.waitForTimeout(400); m = await box(p, '#oriBtn');
    ok(m.tr !== before, name + ': Undo puts it back where it was', before + ' -> ' + (m.tr || 'home'));
    /* the GPS window: a small grip, all the time (Route) */
    if (name === 'Route') {
      await p.click('#liveBtn').catch(() => {}); await p.waitForTimeout(3000);
      const g = await box(p, '#grip-liveBox'); const lb = await box(p, '#liveBox');
      ok(g && g.r - g.l >= 44 && g.b - g.t >= 28 && g.r - g.l <= 48, 'Route: the GPS window has a grip a finger can use (44 by 28, Stuart 19 Nov 14:43)', g && JSON.stringify([g.r - g.l, g.b - g.t]));
      await hold(p, g.x, g.y); await p.mouse.move(g.x - 300, g.y - 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200); const lb1 = await box(p, '#liveBox'); await hold(p, lb1.x, lb1.y); await p.mouse.up(); await p.waitForTimeout(500);
      const lb2 = await box(p, '#liveBox'); ok(Math.abs(lb2.l - lb.l) > 50 && !lb2.on, 'Route: the GPS window moves by its grip and locks', JSON.stringify([Math.round(lb.l), Math.round(lb2.l)]));
    }
    /* Reset to FirstShift layout */
    await p.evaluate(() => NavDrag.resetAll()); await p.waitForTimeout(600); m = await box(p, '#oriBtn');
    ok(!m.tr && (await p.evaluate(() => localStorage.getItem('nav-pos'))) === '{}', name + ': Reset to FirstShift layout puts everything back');
    ok(!errs.length, name + ': no page errors', errs.join(' | ') || null); await c.close();
  }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
