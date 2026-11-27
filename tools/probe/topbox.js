const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const w of [600, 700, 800, 899, 960]) { const c = await b.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await c.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); });
    const p = await c.newPage(); await p.goto('http://127.0.0.1:8778/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n) n.click(); }); await p.waitForTimeout(3500); await p.evaluate(() => { const s = document.getElementById('solStep'); const x = s && !s.hidden && s.querySelector('.close,[data-k=x]'); if (x) x.click(); }); await p.waitForTimeout(800);
    console.log(w, await p.evaluate(() => { const t = document.querySelector('.top .lead') || document.querySelector('.top'); return [...t.querySelectorAll('*')].filter(e => e.children.length === 0 || e.id).filter(e => e.id).map(e => { const r = e.getBoundingClientRect(), v = e.getClientRects().length > 0; return e.id + (v ? '[' + Math.round(r.left) + '-' + Math.round(r.right) + ' w' + Math.round(r.width) + '] "' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 44) + '"' : '(hidden)'); }).join(' | '); }));
    await p.screenshot({ path: '/tmp/claude-0/probe/topbox-' + w + '.png', clip: { x: 0, y: 0, width: w, height: 70 } }); await c.close(); }
  await b.close(); })();
