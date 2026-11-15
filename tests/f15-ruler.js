/* F15 (Stuart 15 Nov 21:06 to 21:16): the × on the measure box ends measuring; no chart button hides another (BOAT sat on the ruler in
   Clear screen); MENU on the right in Clear screen. Run: node tests/f15-ruler.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8768';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [w, h, name] of [[412, 915, 'phone'], [360, 700, 'small phone'], [800, 1280, 'tablet upright'], [1280, 800, 'tablet']]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSWpt && document.getElementById('fsRulerBtn'), null, { timeout: 300000 }); await p.waitForTimeout(2500);
    const clash = () => p.evaluate(() => { const ids = ['fsRulerBtn', 'helpBtn', 'oriBtn', 'editFab', 'fromHere', 'navClearBtn', 'navMenuBtn', 'navCentreBtn', 'mobBtn']; const bx = [...new Set(ids.map(i => document.getElementById(i)).concat([...document.querySelectorAll('.fabhelp,.mobbtn,.navmenub')]))].filter(e => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden').map(e => [e.id || e.className, e.getBoundingClientRect()]);
      const out = []; for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const a = bx[i][1], q = bx[j][1]; const ox = Math.min(a.right, q.right) - Math.max(a.left, q.left), oy = Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top); if (ox > 4 && oy > 4) out.push(bx[i][0] + ' on ' + bx[j][0]); } return { n: bx.length, out }; });
    let r = await clash(); ok(r.out.length === 0, name + ': no chart button sits on another', r.n + ' buttons ' + r.out.join(', '));
    const rul = await p.evaluate(() => { FSWpt.ruler(true); const m = FSWpt.measure({ la: 50.7, lo: -1.3 }, { la: 50.65, lo: -1.2 }); const bx = document.getElementById('fsMeas'); bx.querySelector('.close').click(); return { on: FSWpt.state().ruler, hidden: bx.hidden, pressed: document.getElementById('fsRulerBtn').getAttribute('aria-pressed') }; });
    ok(!rul.on && rul.hidden && rul.pressed === 'false', name + ': the × closes the box and turns the ruler off', JSON.stringify(rul));
    await p.evaluate(() => { const x = document.getElementById('navClearBtn'); if (x) x.click(); }); await p.waitForTimeout(800);
    r = await clash(); ok(r.out.length === 0, name + ': in Clear screen no button sits on another, the ruler button shows', r.n + ' buttons ' + r.out.join(', '));
    const vis = await p.evaluate(() => { const e = document.getElementById('fsRulerBtn'), q = e.getBoundingClientRect(), t = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); const m = document.getElementById('navMenuBtn').getBoundingClientRect(); return { top: !!(t && e.contains(t)), menuRight: m.right > innerWidth * 0.75 }; });
    ok(vis.top, name + ': the ruler button is on top and can be pressed in Clear screen');
    ok(vis.menuRight, name + ': MENU on the right in Clear screen');
    ok(errs.length === 0, name + ': no page errors', errs.slice(0, 2).join(' | '));
    await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
