/* Windows over the chart float and move (Stuart 17 Nov 05:30 to 05:33), on Route and on Mark:
   a round button: a short tap still works it; since 28 Nov 17:53 a round button does not move at all; the GPS window has a small grip all the time and moves
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
    /* 28 Nov 17:53 (Stuart: "The measure tool is floating about please fix as we decided in the last round"): the round buttons no longer
       move. A long touch and a drag, and a drop on the top bar, leave the button where it was; nothing is saved for it; no move starts. */
    let a = await box(p, '#oriBtn'); await hold(p, a.x, a.y);
    const ub = await p.evaluate(() => { const u = document.getElementById('navUndo'); return !!(u && !u.hidden && /Undo/.test(u.textContent)); });
    await p.mouse.move(a.x - 220, a.y - 60, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(600);
    let m = await box(p, '#oriBtn'); const saved = await p.evaluate(() => localStorage.getItem('nav-pos') || '{}');
    ok(!ub && !m.on && !m.tr && !/oriBtn/.test(saved), name + ': a long touch and a drag do not move a round button', JSON.stringify({ ub, on: m.on, tr: m.tr, dx: Math.round(m.x - a.x), dy: Math.round(m.y - a.y) }));
    if (m.tr !== undefined) { const o2 = await p.evaluate(() => document.querySelector('#oriBtn .orl').textContent); if (o2 !== 'N UP') { await p.click('#oriBtn'); await p.waitForTimeout(300); } }
    let m0;
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
