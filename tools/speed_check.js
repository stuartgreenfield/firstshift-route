/* Speed check before every release (Stuart 17 Nov 2026 22:20, "Yes, check every release"; 22:12: "if the UI is super cool but slow
   it won't be used"). Opens each tool on a tablet-sized screen with the processor slowed six times (a mid-range Android tablet)
   and measures: start-up to a usable chart, idle work in 10 s, continuous animations, and the size of the published JavaScript.
   Fails if any tool is over its limit. Run: node tools/speed_check.js [route base] [route+ base]
   Limits (from the 17 Nov 22:25 measurements, with headroom): idle work 0.6 s in 10 s (unthrottled), start-up 25 s throttled,
   no animation that redraws on the main processor, JavaScript 1.8 MB compacted per tool. */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const RB = process.argv[2] || 'http://localhost:8779', PB = process.argv[3] || 'http://localhost:8778';
const LIM = { idle: 0.6, start: 25, js: 1.8 };
(async () => { const b = await chromium.launch(); let bad = 0; const rows = [];
  for (const [name, url] of [['Route', RB + '/channel-area/'], ['Mark', RB + '/mark/'], ['Route+', PB + '/channel-area/'], ['Mark+', PB + '/mark/']]) {
    const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
    const p = await c.newPage(); const cdp = await c.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); const t0 = Date.now(); let js = 0;
    p.on('response', async r => { try { if (/\.js(\?|$)/.test(r.url())) { const bd = await r.body(); js += bd.length; } } catch (e) {} });
    await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); const start = (Date.now() - t0) / 1000;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.waitForTimeout(5000);
    await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); }); await p.waitForTimeout(1000);
    await cdp.send('Performance.enable'); const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const a = await m(); await p.waitForTimeout(10000); const z = await m(); const idle = z.TaskDuration - a.TaskDuration, styles = z.RecalcStyleCount - a.RecalcStyleCount;
    const anims = await p.evaluate(() => document.getAnimations().filter(x => x.playState === 'running' && x.effect && x.effect.getKeyframes().some(k => Object.keys(k).some(q => /^--/.test(q)))).map(x => x.animationName));
    const fails = []; if (idle > LIM.idle) fails.push('idle ' + idle.toFixed(2) + ' s > ' + LIM.idle); if (start > LIM.start) fails.push('start-up ' + start.toFixed(1) + ' s > ' + LIM.start); if (anims.length) fails.push('main-processor animation: ' + anims.join(',')); if (js / 1048576 > LIM.js) fails.push('JavaScript ' + (js / 1048576).toFixed(2) + ' MB > ' + LIM.js);
    rows.push(name.padEnd(7) + ' start-up ' + start.toFixed(1) + ' s (6x slower processor) · idle work ' + idle.toFixed(2) + ' s in 10 s · style recalcs ' + styles + ' · JavaScript ' + (js / 1048576).toFixed(2) + ' MB' + (fails.length ? '  FAIL: ' + fails.join('; ') : '  ok'));
    if (fails.length) bad++; await c.close(); }
  console.log(rows.join('\n')); console.log(bad ? bad + ' tool(s) over the limit: do not release' : 'All four within the limits'); await b.close(); process.exit(bad ? 1 : 0); })();
