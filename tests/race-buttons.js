/* M71 (Stuart 18 Nov 05:58): STOP RACE and START SEQUENCE buttons in Mark and Mark+, by the logic tree in docs/MARK-RACE-BUTTONS.md */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
(async () => { const b = await chromium.launch(); let pass = 0, fail = 0; const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' | ' + JSON.stringify(x) : '')); c ? pass++ : fail++; };
  for (const base of [BASE, 'http://localhost:8778']) {
  const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(base + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  const btns = () => p.evaluate(() => { const e = document.getElementById('solRaceBtns'); if (!e || e.hidden) return []; return [...e.querySelectorAll('button')].map(x => x.textContent); });
  ok((await btns()).length === 0, base + ' no race: no buttons', await btns());
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() } }); FSSolent.test(true); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 20 * 60) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
  await p.waitForTimeout(2500);
  ok(JSON.stringify(await btns()) === '["START SEQUENCE","STOP RACE"]', base + ' gun in 20 min: both buttons', await btns());
  await p.screenshot({ path: '/tmp/claude-0/ui/race-buttons-pre.png' });
  const ov = await p.evaluate(() => { const r = document.getElementById("solRaceBtns").getBoundingClientRect(); return [...document.querySelectorAll(".bar,#solSeq,#panel,.livestrip,#navMob,#mobBtn")].filter(e => !e.hidden && e.getClientRects().length).some(e => { const q = e.getBoundingClientRect(); return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }); });
  ok(!ov, base + ' buttons clear of the top bar and the start box');
  await p.click('[data-rb="seq"]'); await p.waitForTimeout(1800);
  const ss = await p.evaluate(() => { const e = document.getElementById('solStartScr'); return !!(e && !e.hidden); });
  ok(ss && (await btns()).length === 0, base + ' START SEQUENCE opens the start screen, buttons step aside', { ss, b: await btns() });
  await p.screenshot({ path: '/tmp/claude-0/ui/race-buttons-ss.png' });
  await p.evaluate(() => { const s = document.querySelector('#solStartScr [data-q="small"]') || document.querySelector('[data-q="small"]'); if (s) s.click(); }); await p.waitForTimeout(1800);
  ok((await btns()).length === 2, base + ' start screen made small: buttons back', await btns());
  await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 - 120) }); }); await p.waitForTimeout(1800);
  await p.evaluate(() => { ['solStartScr', 'solCard'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; }); }); await p.waitForTimeout(1500);
  ok(JSON.stringify(await btns()) === '["STOP RACE"]', base + ' race under way: STOP RACE only', await btns());
  await p.click('[data-rb="stop"]'); await p.waitForTimeout(500);
  ok(JSON.stringify(await btns()) === '["TAP AGAIN TO STOP"]', base + ' first tap asks again', await btns());
  await p.screenshot({ path: '/tmp/claude-0/ui/race-buttons-armed.png' });
  await p.waitForTimeout(4600);
  ok(JSON.stringify(await btns()) === '["STOP RACE"]', base + ' no second tap: goes back, race still on', await btns());
  await p.click('[data-rb="stop"]'); await p.waitForTimeout(400); await p.click('[data-rb="stop"]'); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const s = FSSolent.state(); return { ended: !!(s.ended && s.ended > s.startAt * 1000) }; });
  ok(st.ended && (await btns()).length === 0, base + ' second tap stops the race, buttons go', { st, b: await btns() });
  ok(errs.length === 0, base + ' no page errors', errs);
  await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
