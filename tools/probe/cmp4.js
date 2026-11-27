const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const [tool, url] of [['route', 'http://127.0.0.1:8779/fastnet/'], ['routeplus', 'http://127.0.0.1:8778/fastnet/'], ['mark', 'http://127.0.0.1:8779/mark/'], ['markplus', 'http://127.0.0.1:8778/mark/']]) for (const [nm, w, h] of [['up', 390, 760], ['side', 844, 390]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await c.addInitScript(() => { const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); });
    const p = await c.newPage(); await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 200000 }); await p.waitForTimeout(3000);
    await p.screenshot({ path: '/tmp/claude-0/probe/c4-' + tool + '-' + nm + '-1landing.png' });
    await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n) n.click(); }); await p.waitForTimeout(5000);
    await p.evaluate(() => { const s = document.getElementById('solStep'); const x = s && !s.hidden && s.querySelector('.close,[data-k=x]'); if (x) x.click(); document.querySelectorAll('.close,[aria-label=Close]').forEach(e => { if (e.getClientRects().length && e.closest('.tourtip,.fstip,[class*=tip]')) e.click(); }); }); await p.waitForTimeout(1200);
    await p.screenshot({ path: '/tmp/claude-0/probe/c4-' + tool + '-' + nm + '-2main.png' });
    console.log(tool, nm, await p.evaluate(() => 'body.class=' + document.body.className + ' | top band: ' + (function () { const t = document.querySelector('.top,#top,header'); if (!t) return 'no .top'; const s = getComputedStyle(t); return (t.id || t.className) + ' bg ' + s.backgroundColor + ' h ' + Math.round(t.getBoundingClientRect().height); })() + ' | splash h1: ' + ((document.querySelector('#splash .sp-txt h1') || {}).textContent || '') + ' | splash kids: ' + [...document.querySelectorAll('#splash .sp-txt > *, #splash .sp-acts > *')].map(e => (e.id || e.className || e.tagName).toString().split(' ')[0]).join(',').slice(0, 200)));
    await c.close(); }
  await b.close(); })();
