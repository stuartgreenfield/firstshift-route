/* Stuart 15 Nov 2026 (B, C, D): safety margin on by default; shallow water shown smooth or as the router's squares; closest zoom slider.
   Run: node tests/depthview.js http://localhost:8769 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P.depth, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => ({ v: document.getElementById('margin').value, t: document.getElementById('marginV').textContent, dv: document.getElementById('depthView').value, dvb: [...document.querySelectorAll('#depthViewSeg button')].map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(' '), z: document.getElementById('zoomMax').value, zt: document.getElementById('zoomMaxV').textContent }));
  ok(m.v === '1', 'margin is one depth square by default', m.v + ' ' + m.t);
  ok(/about \d+ to \d+ m/.test(m.t), 'the margin is given in metres', m.t);
  ok(m.dv === 'smooth' && m.dvb === 'smooth:true squares:false', 'shallow water is shown smooth by default (two buttons, not a drop-down)', m.dvb);
  ok(m.z === '1' && /^Standard, about [0-9.]+ nm across$/.test(m.zt), 'closest zoom is the standard one by default', m.zt);
  const zoomIn = () => p.evaluate(() => { const cv = document.getElementById('map'), r = cv.getBoundingClientRect(); for (let i = 0; i < 120; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true })); return window.__fsView ? window.__fsView().s : null; });
  let s1 = await zoomIn(); ok(Math.abs(s1 - 20000) < 1, 'standard: zoom stops at 20,000 points a degree', s1);
  await p.evaluate(() => { const z = document.getElementById('zoomMax'); z.value = '6'; z.dispatchEvent(new Event('input')); });
  let s2 = await zoomIn(); ok(Math.abs(s2 - 120000) < 1, 'slider at 6: zoom goes six times closer', s2 + ' ' + await p.evaluate(() => document.getElementById('zoomMaxV').textContent));
  await p.evaluate(() => { const z = document.getElementById('zoomMax'); z.value = '1'; z.dispatchEvent(new Event('input')); });
  ok(Math.abs(await p.evaluate(() => window.__fsView().s) - 20000) < 1, 'slider back: the view comes back out to the limit');
  await p.evaluate(() => document.getElementById('setBtn').click()); await p.waitForTimeout(400);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#sheet .tab, #sheet [data-tab], #sheet button')].find(x => /^\s*charts?\s*$/i.test(x.textContent)); if (t) t.click(); }); await p.waitForTimeout(400);
  await p.tap('#depthViewSeg button[data-v="squares"]').catch(async () => p.click('#depthViewSeg button[data-v="squares"]')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('depthView').value + ' ' + document.querySelector('#depthViewSeg [data-v="squares"]').getAttribute('aria-pressed')) === 'squares true', 'tapping Squares selects it');
  ok(await p.evaluate(() => localStorage.getItem('fs-depthView')) === 'squares', 'squares view is remembered');
  await p.screenshot({ path: '/tmp/claude-0/sh/squares.png' });
  await p.reload(); await p.waitForFunction(() => window.__navFc && window.__navFc().P.depth, null, { timeout: 120000 }); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => document.getElementById('depthView').value) === 'squares', 'and kept after a reload');
  // the no-go depth: three sliders kept in step
  await p.evaluate(() => { const d = document.getElementById('depth2'); d.value = '4.5'; d.dispatchEvent(new Event('input')); });
  let v = await p.evaluate(() => [document.getElementById('depth').value, document.getElementById('depthV').textContent, document.getElementById('depth2V').textContent]);
  ok(v[0] === '4.5' && v[1] === '4.5 m' && v[2] === '4.5 m', 'Chart tab slider moves the Course tab one', v.join(' '));
  await p.evaluate(() => { document.getElementById('sheetX').click(); }); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('layersBtn').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('lDepth') && document.getElementById('lDepth').value === '4.5' && document.getElementById('lDepthV').textContent === '4.5 m'), 'Layers panel slider shows the same depth');
  await p.evaluate(() => { const d = document.getElementById('lDepth'); d.value = '2'; d.dispatchEvent(new Event('input')); });
  v = await p.evaluate(() => [document.getElementById('depth').value, document.getElementById('depth2').value]);
  ok(v[0] === '2' && v[1] === '2', 'Layers slider moves the other two', v.join(' '));
  await p.evaluate(() => document.getElementById('layersX').click()); await p.waitForTimeout(1500);
    const t0 = Date.now(); let ran = false; while (Date.now() - t0 < 300000) { const st = await p.evaluate(() => ({ r: window.__navFc().running })); if (st.r) ran = true; if (ran && !st.r) break; await p.waitForTimeout(1000); }
  ok(ran, 'closing the Layers panel after a depth change routes again (after any route already running)', ran);
  await p.evaluate(() => document.getElementById('layersBtn').click()); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('layersX').click()); await p.waitForTimeout(300);
  ok(!errs.length, 'no page errors', errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
