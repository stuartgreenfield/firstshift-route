/* Probe (Stuart 20 Nov 23:21, photo: Mark+ step 2 "Tap the committee boat" window cannot be moved, it covers the chart).
   Opens Mark+'s start line step on a phone and drags the window's grip with real touch events. */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const c = [...document.querySelectorAll('#solCard *')].find(x => /^Windward-leeward$/.test((x.textContent || '').trim())); (c && (c.closest('button') || c)).click(); });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { const t = await p.evaluate(() => { const s = document.getElementById('solStep'); return s && !s.hidden ? s.innerText.slice(0, 80) : 'none'; }); console.log('step:', t.replace(/\s+/g, ' ')); if (/start line|committee/i.test(t)) break; await p.evaluate(() => { const n = [...document.querySelectorAll('#solStep button')].find(x => /^Next/.test(x.textContent.trim())); if (n) n.click(); }); await p.waitForTimeout(1000); }
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#solStep button')].find(x => /Boat, direction, length/.test(x.textContent)); if (bt) bt.click(); });
  await p.waitForTimeout(800);
  const st = () => p.evaluate(() => { const s = document.getElementById('solStep'); if (!s || s.hidden) return null; const r = s.getBoundingClientRect(), g = s.querySelector('.solgrip'), gr = g && g.getBoundingClientRect(); const top = gr ? document.elementFromPoint(gr.x + gr.width / 2, gr.y + gr.height / 2) : null;
    return { box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], grip: gr ? [Math.round(gr.x), Math.round(gr.y), Math.round(gr.width), Math.round(gr.height)] : null, gripHit: top ? (top.className || top.tagName) + '' : null, title: (s.querySelector('b') || {}).textContent, cls: s.className, parent: s.parentNode.id || s.parentNode.className }; });
  const a = await st(); console.log('before', JSON.stringify(a)); if (!a || !a.grip) { await p.screenshot({ path: '/tmp/claude-0/assess/wz.png' }); await b.close(); return; }
  const cdp = await c.newCDPSession(p), x0 = a.grip[0] + a.grip[2] / 2, y0 = a.grip[1] + a.grip[3] / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0, y: y0 - i * 30 }] }); await p.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  console.log('after touch drag up 300 px', JSON.stringify(await st()));
  await p.screenshot({ path: '/tmp/claude-0/assess/wz.png' }); await b.close();
})();
