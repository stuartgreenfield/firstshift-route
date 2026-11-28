/* Stuart 28 Nov 18:30 (photo IMG_0155, Route on the test copy, phone upright, gun in 30 minutes): START SCREEN and END RACE lay over the row of
   round buttons (CLEAR and the edit button behind them). 18:32: "Fix as well". This test: on a phone upright and a small phone, Route, Mark,
   Route+ and Mark+, gun in 30 minutes, with the panel as it comes and closed: the two race buttons show and lie over no round button.
   Run through tools/probe/with78.sh: node tests/race-buttons-clear.js http://localhost:8779 route  (mark; http://localhost:8778 routeplus, markplus) */
const { chromium } = require('playwright');
const BASE = process.argv[2], TOOL = process.argv[3] || 'route', PATH = /mark/.test(TOOL) ? '/mark/' : '/fastnet/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const [name, w, h] of [['phone', 390, 844], ['small-phone', 360, 740]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
    await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const T = TOOL + ' ' + name;
    try {
      await p.goto(BASE + PATH); await p.waitForFunction(() => window.FSSolent && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
      await p.evaluate(() => { const n = document.getElementById('spTourNo'); if (n && n.getClientRects().length) n.click(); });
      for (let i = 0; i < 60; i++) { if (!(await p.evaluate(() => !!window.__navFc().running))) break; await p.waitForTimeout(2000); }
      await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); const g = Math.round(Date.now() / 1000 + 30 * 60); if (FSSolent.set) { FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() } }); FSSolent.set({ startAt: g }); } if (window.__fsGun) window.__fsGun(g); });
      await p.waitForTimeout(2500);
      await p.evaluate(() => { const r = document.querySelector('.fsmode [data-m="race"]'); if (r && r.getClientRects().length) r.click(); }); await p.waitForTimeout(3500);
      await p.evaluate(() => { ['solStartScr', 'solCard'].forEach(id => { const x = document.getElementById(id === 'solCard' ? 'solCardX' : id); }); const s = document.querySelector('#solStartScr [data-q="small"]'); if (s && s.getClientRects().length) s.click(); const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
      const check = async (state) => { await p.waitForTimeout(4000);
        const r = await p.evaluate(() => { const e = document.getElementById('solRaceBtns'); if (!e || e.hidden || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return null; const out = [];
          [...e.querySelectorAll('button')].forEach(bn => { const q = bn.getBoundingClientRect(); [...document.querySelectorAll('.fabhelp')].forEach(f => { if (f.hidden || !f.getClientRects().length) return; const cs = getComputedStyle(f); if (cs.display === 'none' || cs.visibility === 'hidden') return; const z = f.getBoundingClientRect(); if (z.width < 2) return; if (Math.min(q.right, z.right) - Math.max(q.left, z.left) > 0 && Math.min(q.bottom, z.bottom) - Math.max(q.top, z.top) > 0) out.push(bn.textContent + ' on ' + f.id); }); });
          return { btns: [...e.querySelectorAll('button')].map(x => x.textContent).join(','), on: out, top: Math.round(e.getBoundingClientRect().top), off: e.getBoundingClientRect().top < 0 }; });
        if (!r) { console.log('NOTE ' + T + ' | ' + state + ' | race buttons not showing'); return; }
        ok(!r.on.length && !r.off, T + ' | ' + state + ' | ' + r.btns + ' over no round button', r.on.join('; ') + ' top ' + r.top);
        await p.screenshot({ path: '/tmp/claude-0/probe/rbclear-' + TOOL + '-' + name + '-' + state.replace(/\s+/g, '-') + '.png' }); };
      await check('panel as it comes');
      await p.evaluate(() => { const x = document.getElementById('panelX'); if (x && x.getClientRects().length) x.click(); }); await check('panel closed');
      ok(!errs.length, T + ' | no script errors', errs.join(' ; ').slice(0, 200));
    } catch (e) { fail++; console.log('FAIL ' + T + ' | STOPPED ' + e.message.slice(0, 200)); }
    await c.close(); }
  console.log('race-buttons-clear ' + TOOL + ': ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
