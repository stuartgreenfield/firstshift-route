/* Speed check before every release (Stuart 17 Nov 2026 22:20, "Yes, check every release"; 22:12: "if the UI is super cool but slow
   it won't be used"). Opens each tool on a tablet-sized screen with the processor slowed six times (a mid-range Android tablet)
   and measures: start-up to a usable chart, idle work in 10 s, continuous animations, and the size of the published JavaScript.
   Fails if any tool is over its limit. Run: node tools/speed_check.js [route base] [route+ base] (no addresses: compacted copies, see below)
   Limits (from the 17 Nov 22:25 measurements, with headroom): idle work 0.6 s in 10 s (unthrottled), start-up 25 s throttled,
   no animation that redraws on the main processor, JavaScript 1.8 MB compacted per tool.
   F35 (17 Nov 23:10, "Tougher speed check"): also with boat data flowing, where the 17 Nov slowness hid: Mark and Mark+ in test
   mode (the practice boat racing), Route+ with Practice on. Processor slowed six times for 15 s; limits: busy at most 60% of the
   time and no single pause over 700 ms (Android says "isn't responding" after 5 s, and pauses over half a second are felt). */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
/* Compacted by default (21 Nov 2026, after two false failures on 20 Nov: the test servers send the readable files, the live site sends
   them compacted). With no addresses given, it copies Route's and Route+'s app files, compacts them with tools/compact.js as the live
   publish does, serves each copy with tools/testserver.py on ports 8791 and 8792, and measures those. Give addresses to measure a
   server as it is. Folders: FS_ROUTE_WEB (default site/cervantes), FS_PLUS_WEB (default /tmp/claude-0/navnight/web). */
const { spawn, execFileSync } = require('child_process'), os = require('os'), ROOT = path.join(__dirname, '..');
let RB = process.argv[2], PB = process.argv[3]; const kids = [];
function compacted(web, port) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-speed-'));
  for (const f of fs.readdirSync(web)) { const s = path.join(web, f); if (fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(d, f)); }
  execFileSync('node', [path.join(ROOT, 'tools/compact.js'), d], { stdio: 'ignore' });
  kids.push(spawn('python3', [path.join(ROOT, 'tools/testserver.py'), '--web', d, '--media', path.join(ROOT, 'site'), '--port', String(port)], { cwd: ROOT, stdio: 'ignore' }));
  return 'http://localhost:' + port; }
async function up(base) { for (let i = 0; i < 60; i++) { try { const r = await fetch(base + '/mark/'); if (r.ok) return; } catch (e) {} await new Promise(r => setTimeout(r, 500)); } throw new Error('test server did not start: ' + base); }
process.on('exit', () => kids.forEach(k => { try { k.kill(); } catch (e) {} }));
const LIM = { idle: 0.6, start: 25, js: 1.8, busy: 0.6, pause: 700 };
(async () => {
  if (!RB) { RB = compacted(process.env.FS_ROUTE_WEB || path.join(ROOT, 'site/cervantes'), 8791); await up(RB); }
  if (!PB) { PB = compacted(process.env.FS_PLUS_WEB || '/tmp/claude-0/navnight/web', 8792); await up(PB); }
  console.log('Measuring ' + RB + ' and ' + PB + (process.argv[2] ? '' : ' (compacted copies, as the live site serves them)'));
  const b = await chromium.launch(); let bad = 0; const rows = [];
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

  /* with boat data flowing */
  for (const [name, url, how] of [['Mark test mode', RB + '/mark/', 'test'], ['Mark+ test mode', PB + '/mark/', 'test'], ['Route+ Practice', PB + '/channel-area/', 'prac']]) {
    const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
      window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true }); });
    const p = await c.newPage(); const cdp = await c.newCDPSession(p); await p.goto(url); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
    await p.evaluate(how => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click();
      if (how === 'test' && window.FSSolent) { FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 100) }); }
      if (how === 'prac') { const bb = document.getElementById('navBoatBtn'); bb && bb.click(); const cb = document.getElementById('navPrac'); if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); } const cn = [...document.querySelectorAll('#navPanel button')].find(x => /^Connect/i.test(x.textContent.trim())); cn && cn.click(); const pn = document.getElementById('navPanel'); if (pn) pn.hidden = true; } }, how);
    await p.waitForTimeout(4000); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await cdp.send('Performance.enable');
    const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value])); const a = await m(); await p.evaluate(() => { window.__lt = []; }); await p.waitForTimeout(15000); const z = await m();
    const busy = (z.TaskDuration - a.TaskDuration) / 15, lt = await p.evaluate(() => window.__lt), mx = Math.max(0, ...lt);
    const fails = []; if (busy > LIM.busy) fails.push('busy ' + Math.round(busy * 100) + '% > ' + Math.round(LIM.busy * 100) + '%'); if (mx > LIM.pause) fails.push('pause ' + Math.round(mx) + ' ms > ' + LIM.pause);
    rows.push(name.padEnd(16) + ' busy ' + Math.round(busy * 100) + '% of the time (6x slower processor) · pauses over 50 ms: ' + lt.length + ', longest ' + Math.round(mx) + ' ms' + (fails.length ? '  FAIL: ' + fails.join('; ') : '  ok'));
    if (fails.length) bad++; await c.close(); }
  console.log(rows.join('\n')); console.log(bad ? bad + ' tool(s) over the limit: do not release' : 'All four within the limits'); await b.close(); process.exit(bad ? 1 : 0); })();
