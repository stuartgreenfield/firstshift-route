/* Stuart 15 Nov 2026 (B, C, D): safety margin on by default; shallow water shown smooth or as the router's squares; closest zoom slider.
   Run: node tests/depthview.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P.depth, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => ({ v: document.getElementById('margin').value, t: document.getElementById('marginV').textContent, dv: document.getElementById('depthView').value, z: document.getElementById('zoomMax').value, zt: document.getElementById('zoomMaxV').textContent }));
  ok(m.v === '1', 'margin is one depth square by default', m.v + ' ' + m.t);
  ok(/about \d+ to \d+ m/.test(m.t), 'the margin is given in metres', m.t);
  ok(m.dv === 'smooth', 'shallow water is shown smooth by default', m.dv);
  ok(m.z === '1' && /^Standard, about [0-9.]+ nm across$/.test(m.zt), 'closest zoom is the standard one by default', m.zt);
  const zoomIn = () => p.evaluate(() => { const cv = document.getElementById('map'), r = cv.getBoundingClientRect(); for (let i = 0; i < 120; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true })); return window.__fsView ? window.__fsView().s : null; });
  let s1 = await zoomIn(); ok(Math.abs(s1 - 20000) < 1, 'standard: zoom stops at 20,000 points a degree', s1);
  await p.evaluate(() => { const z = document.getElementById('zoomMax'); z.value = '6'; z.dispatchEvent(new Event('input')); });
  let s2 = await zoomIn(); ok(Math.abs(s2 - 120000) < 1, 'slider at 6: zoom goes six times closer', s2 + ' ' + await p.evaluate(() => document.getElementById('zoomMaxV').textContent));
  await p.evaluate(() => { const z = document.getElementById('zoomMax'); z.value = '1'; z.dispatchEvent(new Event('input')); });
  ok(Math.abs(await p.evaluate(() => window.__fsView().s) - 20000) < 1, 'slider back: the view comes back out to the limit');
  await p.evaluate(() => { const d = document.getElementById('depthView'); d.value = 'squares'; d.dispatchEvent(new Event('change')); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => localStorage.getItem('fs-depthView')) === 'squares', 'squares view is remembered');
  await p.screenshot({ path: '/tmp/claude-0/sh/squares.png' });
  await p.reload(); await p.waitForFunction(() => window.__navFc && window.__navFc().P.depth, null, { timeout: 120000 }); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => document.getElementById('depthView').value) === 'squares', 'and kept after a reload');
  ok(!errs.length, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
