/* F15: a window slid off the left edge, or flicked right, goes to a tab; the tab brings it back; Lock layout stops moves */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14 Plus'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.NavDrag && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const pl = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PLOT'); if (pl && !(document.getElementById('navPlot') || document.getElementById('fsPlot'))?.offsetParent) pl.click(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#solStartScr button')].find(x => x.textContent.trim() === 'Chart'); if (b) b.click(); }); await p.waitForTimeout(800);
  const PID = await p.evaluate(() => { const n = document.getElementById('navPlot'); return n && n.offsetParent ? 'navPlot' : 'fsPlot'; }); console.log('plotter', PID);
  let pass = 0, fail = 0; const ok = (n, v, d) => { console.log((v ? 'PASS ' : 'FAIL ') + n + (d ? ' | ' + d : '')); v ? pass++ : fail++; };
  const box = () => p.evaluate((PID) => { const e = document.getElementById(PID); const r = e && e.getBoundingClientRect(); return e ? { vis: !!e.offsetParent && r.width > 2, l: r.left, t: r.top, w: r.width, h: r.height, cls: e.className } : null; }, PID);
  let r = await box(); ok('plotter bar showing', r && r.vis, JSON.stringify(r));
  async function drag(dx, fast) { r = await box(); await p.evaluate((PID) => NavDrag.begin(PID), PID); const x = r.l + r.w / 2, y = r.t + r.h / 2; await p.mouse.move(x, y); await p.mouse.down(); if (fast) { await p.mouse.move(x + dx / 2, y, { steps: 2 }); await p.mouse.move(x + dx, y, { steps: 2 }); } else { await p.mouse.move(x + dx, y, { steps: 20 }); await p.waitForTimeout(200); } await p.mouse.up(); await p.waitForTimeout(800); }
  await drag(-r.w * 0.8, false);
  r = await box(); const tab = await p.evaluate(() => { const t = document.querySelector('.fswtab:not([hidden])'); return t ? t.textContent + ' ' + t.className + ' left ' + Math.round(t.getBoundingClientRect().left) : null; });
  ok('slid off the left: put away', r && !r.vis, r && r.cls); ok('tab on the left edge', tab && /PLOT/.test(tab) && / l/.test(tab), tab);
  await p.screenshot({ path: '/tmp/claude-0/ui/slideoff.png' });
  await p.click('.fswtab:not([hidden])'); await p.waitForTimeout(800); r = await box(); ok('tab brings it back', r && r.vis, JSON.stringify(r));
  await drag(160, true); r = await box(); const tab2 = await p.evaluate(() => { const t = document.querySelector('.fswtab:not([hidden])'); return t ? t.className : null; });
  ok('flick right: put away to the right', r && !r.vis && tab2 && / r/.test(tab2), tab2);
  await p.click('.fswtab:not([hidden])'); await p.waitForTimeout(800);
  /* drag the dots directly (no long press), as on the iPhone; the test mode bar is put out of the way so there is room to move */
  await p.evaluate(() => { ['solTestBar', 'mkTestBar', 'solSeq'].forEach(id => { const t = document.getElementById(id); if (t) t.style.display = 'none'; }); window.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(1500);   /* 20 Nov: on Mark+ the start sequence box sat right under the plotter bar, the top bar right over it: no free place for the dots (they never sit on a button); put away so there is room, as the test bar is */
  r = await box(); const gp = await p.evaluate((PID) => { const g = document.getElementById('grip-' + PID); if (!g || g.hidden) return null; const q = g.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, PID);
  ok('dots showing', !!gp, JSON.stringify(gp) + ' bar ' + JSON.stringify(r) + ' ' + JSON.stringify(await p.evaluate(() => { const t = document.getElementById('solTestBar'); return t && t.getBoundingClientRect(); })));
  if (gp) { await p.mouse.move(gp[0], gp[1]); await p.mouse.down(); await p.mouse.move(gp[0], gp[1] + 250, { steps: 15 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(800);
    const r2 = await box(); ok('drag the dots: the window moves and stays', r2.vis && Math.abs(r2.t - r.t) > 100 && await p.evaluate(() => !NavDrag.on()), Math.round(r.t) + ' to ' + Math.round(r2.t));
    const g2 = await p.evaluate((PID) => { const g = document.getElementById('grip-' + PID); const q = g.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, PID);
    await p.mouse.move(g2[0], g2[1]); await p.mouse.down(); await p.mouse.move(g2[0] - 320, g2[1], { steps: 15 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(800);
    ok('drag the dots off the left: put away', !(await box()).vis);
    await p.click('.fswtab:not([hidden])'); await p.waitForTimeout(800); }
  await p.evaluate(() => localStorage.setItem('fs-win-lock', '1')); const before = await box();
  await p.mouse.move(before.l + 20, before.t + 10); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.move(before.l - 100, before.t + 10, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(500);
  ok('lock layout: a long press does not start a move', await p.evaluate(() => !NavDrag.on()) && (await box()).vis);
  ok('no page errors', !errs.length, errs.join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
