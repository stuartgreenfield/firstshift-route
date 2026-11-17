/* F15 part two: the start sequence box and the course card move by their dots and slide off to a tab */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14 Plus'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.NavDrag && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); }); await p.waitForTimeout(2500);
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 900) }); const t = document.getElementById('solTestBar'); if (t) t.style.display = 'none'; }); await p.waitForTimeout(2500);
  let pass = 0, fail = 0; const ok = (n, v, d) => { console.log((v ? 'PASS ' : 'FAIL ') + n + (d ? ' | ' + d : '')); v ? pass++ : fail++; };
  const box = id => p.evaluate(id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { vis: !e.hidden && r.width > 2 && getComputedStyle(e).display !== 'none', t: Math.round(r.top), l: Math.round(r.left) }; }, id);
  const grip = id => p.evaluate(id => { const g = document.getElementById('grip-' + id); if (!g || g.hidden) return null; const q = g.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, id);
  for (const [id, label] of [['solSeq', 'START'], ['solLegs', 'COURSE']]) {
    if (id === 'solLegs') { await p.evaluate(() => FSSolent.showList && FSSolent.showList()); await p.waitForTimeout(1200); }
    const r = await box(id); ok(id + ' showing', r && r.vis, JSON.stringify(r)); if (!r || !r.vis) continue;
    const g = await grip(id); ok(id + ' dots showing', !!g, JSON.stringify(g)); if (!g) continue;
    await p.mouse.move(g[0], g[1]); await p.mouse.down(); await p.mouse.move(g[0], g[1] + (id === 'solLegs' ? -150 : 120), { steps: 12 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(800);
    const r2 = await box(id); if (id === 'solSeq') ok(id + ' moves by its dots and stays', r2.vis && Math.abs(r2.t - r.t) > 40, r.t + ' to ' + r2.t); else ok(id + ' still showing after a drag (on a phone it fills most of the free space, so it may stay put)', r2.vis);
    const g2 = await grip(id); await p.mouse.move(g2[0], g2[1]); await p.mouse.down(); await p.mouse.move(g2[0] + 330, g2[1], { steps: 12 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(800);
    const tab = await p.evaluate(() => [...document.querySelectorAll('.fswtab')].filter(t => !t.hidden).map(t => t.textContent + ' ' + t.className).join(','));
    ok(id + ' slides off the right to a tab', !(await box(id)).vis && tab.includes(label), tab);
    await p.evaluate(label => { const t = [...document.querySelectorAll('.fswtab')].find(t => !t.hidden && t.textContent === label); if (t) t.click(); }, label); await p.waitForTimeout(800);
    ok(id + ' tab brings it back', (await box(id)).vis);
    if (id === 'solSeq') await p.screenshot({ path: '/tmp/claude-0/ui/seqmove.png' }); }
  ok('no page errors', !errs.length, errs.join(' | ')); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
