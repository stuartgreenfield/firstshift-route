/* Stuart 14 Nov 20:42 to 20:45, Android tablet: one-finger drag worked, pinch did not, until a restart. A finger lift that
   Android never reports left the chart counting an extra finger. Run: node tests/pinch.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', hasTouch: true }); const p = await c.newPage();
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(8000);
  const fire = (type, id, x, y, primary) => p.evaluate(([type, id, x, y, primary]) => { const cv = document.getElementById('map'); const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: primary, clientX: r.left + x, clientY: r.top + y, bubbles: true })); }, [type, id, x, y, primary]);
  const pinchOut = async (a, bb) => { await fire('pointerdown', a, 500, 400, true); await fire('pointerdown', bb, 600, 400, false); for (let i = 1; i <= 8; i++) { await fire('pointermove', a, 500 - i * 15, 400, true); await fire('pointermove', bb, 600 + i * 15, 400, false); await p.waitForTimeout(40); } await fire('pointerup', a, 380, 400, true); await fire('pointerup', bb, 720, 400, false); await p.waitForTimeout(200); };
  let v0 = await p.evaluate(() => window.__fsView()); await pinchOut(1, 2); let v1 = await p.evaluate(() => window.__fsView());
  ok(v1.s > v0.s * 1.5, 'pinch zooms in', v0.s.toFixed(1) + ' to ' + v1.s.toFixed(1));
  // a finger whose lift is never reported
  await fire('pointerdown', 7, 300, 300, true); await p.waitForTimeout(100);
  v0 = await p.evaluate(() => window.__fsView()); await pinchOut(8, 9); v1 = await p.evaluate(() => window.__fsView());
  ok(v1.s > v0.s * 1.5, 'pinch still zooms after a lost finger', v0.s.toFixed(1) + ' to ' + v1.s.toFixed(1) + ', fingers left ' + v1.fingers);
  ok(v1.fingers === 0, 'no fingers left counted');
  // real touches through the browser: one finger on a button lying over the chart, one on the chart
  const cdp = await c.newCDPSession(p);
  const over = await p.evaluate(() => { const cv = document.getElementById('map').getBoundingClientRect(); const els = [...document.querySelectorAll('button, .pill, #now, [class*=fab]')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('.sheet, #panel')) return false; const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return x > cv.left && x < cv.right && y > cv.top && y < cv.bottom && h && (h === e || e.contains(h)); }); const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, what: e.id || e.className }; });
  console.log('finger on:', JSON.stringify(over));
  const touch = (type, pts2) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts2.map((q, i) => ({ x: q[0], y: q[1], id: i + 1 })) });
  if (over) {
    v0 = await p.evaluate(() => window.__fsView());
    const other = [640, 400];
    await touch('touchStart', [[over.x, over.y], other]);
    for (let i = 1; i <= 8; i++) { const dx = (other[0] - over.x) * 0.06 * i, dy = (other[1] - over.y) * 0.06 * i; await touch('touchMove', [[over.x - dx, over.y - dy], [other[0] + dx, other[1] + dy]]); await p.waitForTimeout(40); }
    await touch('touchEnd', []); await p.waitForTimeout(300);
    v1 = await p.evaluate(() => window.__fsView());
    ok(v1.s > v0.s * 1.3, 'pinch zooms with one finger on ' + over.what, v0.s.toFixed(1) + ' to ' + v1.s.toFixed(1));
    ok(v1.fingers === 0, 'no fingers left counted after it', v1.fingers);
    v0 = v1; await touch('touchStart', [[560, 420], [700, 420]]); for (let i = 1; i <= 8; i++) { await touch('touchMove', [[560 - i * 12, 420], [700 + i * 12, 420]]); await p.waitForTimeout(40); } await touch('touchEnd', []); await p.waitForTimeout(300);
    v1 = await p.evaluate(() => window.__fsView()); ok(v1.s > v0.s * 1.3, 'pinch with both fingers on the chart', v0.s.toFixed(1) + ' to ' + v1.s.toFixed(1));
  } else ok(false, 'found a button over the chart to put a finger on');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
