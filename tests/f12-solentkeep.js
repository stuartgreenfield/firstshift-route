/* F12 (Stuart 15 Nov 17:41: "need to check the Solent race is saved as Ive just lost it on a restart"). Build a Solent race, route it, then
   restart the way a phone does: a new visit to the page with no address extras (home-screen icon), and a reload. The race must still be
   in My races and on screen, and the builder must keep what was entered. Also a restart before Route this race. Run: node tests/f12-solentkeep.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3] || '/tmp/claude-0/sh';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
  });
  const ready = () => p.waitForFunction(() => window.__fsPlan && window.__fsPlan() && window.FSSolent && window.__navViewSet, null, { timeout: 300000 });
  await p.goto(BASE + '/channel-area/'); await ready(); await p.waitForTimeout(1000);
  await p.evaluate(() => { const e = document.getElementById('solentOn'); e.checked = true; e.dispatchEvent(new Event('change')); });
  await p.waitForFunction(() => window.FSSolent.marks(), null, { timeout: 30000 });
  await p.evaluate(() => document.getElementById('solentBuild').click()); await p.waitForTimeout(500);
  await p.fill('#solStartCode', '3X'); await p.press('#solStartCode', 'Tab'); await p.waitForTimeout(200);
  await p.fill('#solBoard', '3G p, 3E s 4F'); await p.click('#solBoardGo'); await p.waitForTimeout(300);
  // restart before routing: the builder keeps the course
  await p.goto(BASE + '/channel-area/'); await ready(); await p.waitForTimeout(1500);
  const kept0 = await p.evaluate(() => ({ st: window.FSSolent.state().start && window.FSSolent.state().start.code, m: window.FSSolent.state().marks.map(x => x.code).join(' ') }));
  ok(kept0.st === '3X' && kept0.m === '3G 3E 4F', 'a restart before routing: the builder still has the start and marks', JSON.stringify(kept0));
  // route it
  await p.evaluate(() => document.getElementById('solentBuild').click()); await p.waitForTimeout(500);
  await p.click('#solGo'); await p.waitForTimeout(1500);
  await p.waitForFunction(() => { const pl = window.__fsPlan(); return pl && window.__navCourse && window.__navCourse().marks.length === 3 && !window.__navFc().running; }, null, { timeout: 300000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const my0 = await p.evaluate(() => ({ url: location.href, title: document.getElementById('raceTitle').textContent, my: JSON.parse(localStorage.getItem('fs-myraces') || '[]').map(r => r.name + ' | ' + r.page) }));
  ok(my0.my.some(x => /Solent race/.test(x)), 'after Route this race, it is saved in My races', JSON.stringify(my0));
  for (const how of ['home-screen icon (no address extras)', 'reload']) {
    if (how === 'reload') await p.reload(); else await p.goto(BASE + '/channel-area/');
    await ready(); await p.waitForTimeout(4000);
    const st = await p.evaluate(() => ({ url: location.href, title: document.getElementById('raceTitle').textContent, marks: window.__navCourse ? window.__navCourse().marks.map(m => m.name).join(' / ') : '', my: JSON.parse(localStorage.getItem('fs-myraces') || '[]').filter(r => /Solent/.test(r.name)).length }));
    ok(st.my >= 1 && /Solent race/.test(st.title) && st.marks.split(' / ').length === 3, 'restart by the ' + how + ': the Solent race is still on screen and in My races', JSON.stringify(st).slice(0, 260));
  }
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
