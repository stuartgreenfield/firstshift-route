/* M80 (Stuart 18 Nov 22:25 photo, "a bit untidy is it a bug or a new layout?"; 22:27 "Yes" to the fix). With the start screen open in
   Route on a phone: no other window over the chart shows (chart buttons, routing progress, course banner), Route's panel folds away,
   the boxes sit on one solid backing, man overboard stays on top and can be tapped, and Wind reads "--" when the forecast has no wind.
   Run: node tests/m80-startscreen.js http://localhost:8779 [/channel-area/?race=morgan] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=morgan';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', geolocation: { latitude: 50.775, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsGun && window.FSSolent, null, { timeout: 90000 }); await p.waitForTimeout(8000);
  await p.evaluate(() => { const q = document.getElementById('panel'), t = q && q.querySelector('.tabs .tab'); if (q && (q.hidden || q.classList.contains('collapsed')) && t) t.click(); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const q = document.getElementById('panel'); return !!q && !q.hidden && !q.classList.contains('collapsed'); }), 'Route\'s panel is open before the start screen');
  await p.evaluate(() => window.__fsGun(Math.round(Date.now() / 1000) + 12 * 60)); await p.waitForTimeout(1500);
  await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l && l.getAttribute('aria-pressed') !== 'true') l.click(); }); await p.waitForTimeout(1500);
  const fabs = () => p.evaluate(() => [...document.querySelectorAll('.fabhelp')].map(e => e.id + ':' + getComputedStyle(e).display).join(' '));
  const before = await fabs();
  await p.evaluate(() => document.getElementById('lnSS').click()); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => { const s = document.getElementById('solStartScr'); return !!s && !s.hidden; }), 'the start screen is open');
  ok(await p.evaluate(() => document.getElementById('panel').classList.contains('collapsed')), 'Route\'s panel folds away');
  const shown = await p.evaluate(() => ['.fabhelp', '#prog', '#cbanner', '#liveBox', '#navStrip'].filter(q => [...document.querySelectorAll(q)].some(e => e.getClientRects().length && getComputedStyle(e).display !== 'none')));
  ok(shown.length === 0, 'chart buttons, routing progress, course banner and GPS window step aside', shown);
  const back = await p.evaluate(() => ['.ssnum', '.sqrow'].map(q => { let e = document.querySelector('#solStartScr ' + q); while (e && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(e).backgroundColor) && e.id !== 'solStartScr') e = e.parentElement; return getComputedStyle(e).backgroundColor; }));   /* 24 Nov: on the picture (now first) the start screen itself is the solid backing */
  ok(back.every(c => !/rgba\(0, 0, 0, 0\)|transparent/.test(c)), 'the boxes sit on a solid backing', back);
  const mob = await p.evaluate(() => { const m = document.getElementById('mobBtn'), r = m.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), n = document.querySelector('#solStartScr .ssnum').getBoundingClientRect(); return { top: m.contains(t), above: r.bottom <= n.top + 1 }; });
  ok(mob.top && mob.above, 'man overboard is on top, can be tapped, and sits on the chart above the boxes', mob);
  await p.evaluate(() => { window.__fsWindAt = () => ({ twd: 0, tws: 0 }); }); await p.waitForTimeout(3000);
  const w = await p.evaluate(() => { const c = [...document.querySelectorAll('#solStartScr .ssnum > *')].find(x => /^\s*wind/i.test(x.innerText)); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
  ok(w && /--/.test(w) && !/000°/.test(w), 'no wind in the forecast: Wind does not read 000°', w);
  await p.evaluate(() => { document.querySelector('#solStartScr [data-q=small]').click(); }); await p.waitForTimeout(1500);
  const after = await fabs(); ok(await p.evaluate(() => !document.body.classList.contains('fsss')) && after === before, 'closing the start screen puts the chart buttons back as they were', [before, after]);
  ok(errs.length === 0, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
