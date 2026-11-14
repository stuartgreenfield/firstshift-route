/* Route catch-up checks (13 Nov 2026): the features brought over from Navigate, with no boat parts.
   Run: node tests/catchup.js http://localhost:8769 outdir */
const { chromium } = require('playwright');
const NOTOUR = () => document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });   /* Show me round? (14 Nov): the tests answer No */
const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3] || '.';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const init = () => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); await ctx.addInitScript(NOTOUR); await ctx.addInitScript(init);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=morgan');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running && f.routes.length > 2; }, null, { timeout: 240000 }); await p.waitForTimeout(2000);
  const g = await p.evaluate(() => ({ boat: !!document.getElementById('navBoatBtn') || !!document.getElementById('navStrip') || !!window.__navBoat || !!window.NativeLink, ver: document.title, inst: !!document.querySelector('.stabs .tab[data-s="inst"]') }));
  ok(!g.boat && !g.inst, 'no boat link, strip or Instruments tab in Route', JSON.stringify(g));
  await p.waitForFunction(() => [...document.querySelectorAll('#finBox .fin[data-id] .navage')].length >= 2, null, { timeout: 20000 }).catch(() => null);
  ok(await p.evaluate(() => [...document.querySelectorAll('#finBox .fin[data-id] .navage')].filter(e => /\d\dZ run, .* old/.test(e.textContent)).length >= 2), 'finish times show each model run and its age');
  /* settings: tabs, plain-English lines, find */
  await p.click('#setBtn'); await p.waitForTimeout(800);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#sheet .stabs .tab')].map(t => t.textContent.trim()));
  ok(tabs.includes('My set-up') && !tabs.includes('Instruments'), 'Settings tabs include My set-up', tabs.join(', '));
  ok(await p.evaluate(() => document.querySelectorAll('#sheet .tabsum').length >= 5), 'each tab has a plain-English line');
  await p.fill('#setFind', 'tide'); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => [...document.querySelectorAll('#setFindRes button')].map(b => b.textContent));
  ok(fr.length > 0, 'Find a setting finds tide', fr.slice(0, 3).join(' / '));
  await p.click('#setFindRes button'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!document.querySelector('.sethit')), 'choosing a result highlights the setting');
  await p.click('#sheet .stabs .tab[data-s="mine"]'); await p.waitForTimeout(1500);
  const mine = await p.evaluate(() => ({ prefs: !!document.getElementById('navPrefs'), off: !!document.getElementById('navOff'), move: !!document.getElementById('navMoveBtn') }));
  ok(mine.prefs && mine.off && mine.move, 'My set-up holds My defaults, Ready for offline and Move panels', JSON.stringify(mine));
  await p.screenshot({ path: OUT + '/rc-mine.png' });
  ok(await p.evaluate(() => { const s = window.__navPrefs.snap(); return Object.keys(s.data).length > 3 && !Object.keys(s.data).some(k => /mymarks|fs-race$|fs-mob/.test(k)); }), 'a set-up holds settings, never the race, marks or MOB');
  await p.click('#sheet .stabs .tab[data-s="fc"]'); await p.waitForTimeout(1500);
  const fc = await p.evaluate(() => ({ wind: !!document.getElementById('fsWind'), blend: !!document.getElementById('navBlendSel'), ages: !!document.getElementById('navAgeRow') }));
  ok(fc.wind && fc.blend && fc.ages, 'Settings has wind by hand (Boat), Combine the models and run ages (Forecasts)', JSON.stringify(fc));
  await p.screenshot({ path: OUT + '/rc-fc.png' });
  /* wind by hand routes again */
  const before = await p.evaluate(() => JSON.stringify(window.__navFc().adj));
  const r = await p.evaluate(() => { const v = window.__navViewGet(), f = window.__navFc(), w = FSRouter.windSampler(f.P, f.sel.models)(v.la, v.lo, (Date.now() / 1000 - f.T0) / 3600); return window.FSWind.manual((w[1] + 20) % 360, w[0] * 1.2, 6); });
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => window.__navFc().adj);
  ok(r && after && after.wdir === 20 && after.until > 0, 'wind by hand shifts the forecast 20° for 6 hours and routes again', before + ' -> ' + JSON.stringify(after));
  await p.waitForFunction(() => !window.__navFc().running, null, { timeout: 240000 });
  await p.evaluate(() => document.getElementById('adjReset').click());
  /* close settings, clear screen */
  await p.evaluate(() => { document.getElementById('sheet').hidden = true; });
  await p.evaluate(() => window.NavClear.set(true)); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.body.classList.contains('navclear') && getComputedStyle(document.querySelector('.top')).display === 'none' && !!document.getElementById('navMenuBtn')), 'Clear screen leaves the chart, MOB and MENU');
  await p.screenshot({ path: OUT + '/rc-clear.png' });
  await p.evaluate(() => document.getElementById('navMenuBtn').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.body.classList.contains('navclear')), 'MENU brings the menus back');
  await p.evaluate(() => window.NavClear.set(false));
  /* tap the water: The boat is here */
  const xy = await p.evaluate(() => window.__navXY(50.45, -2.0)); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !!document.getElementById('tipBoatHere')), 'tapping the water offers The boat is here');
  await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  /* help */
  await p.click('#helpBtn'); await p.waitForTimeout(2500);
  const hp = await p.evaluate(() => ({ topics: document.querySelectorAll('#navHelp .navht').length, pics: [...document.querySelectorAll('#navHelp img[data-pic]')].filter(i => i.src && !i.hidden).length, boat: /instrument strip|BOAT in the top bar|Practice/.test((document.getElementById('navHelp') || {}).textContent || ''), models: !!document.querySelector('.navmodels') }));
  ok(hp.topics >= 6 && !hp.boat, 'Help has the new Route topics and no boat topics', JSON.stringify(hp));
  ok(hp.pics >= 6, 'each new Help topic has its picture', hp.pics);
  ok(hp.models, 'Help has the forecast models guide');
  /* reopen where it left off */
  await p.evaluate(() => { document.getElementById('help') && (document.getElementById('help').hidden = true); window.__navViewSet({ la: 50.2, lo: -1.5, s: window.__navViewGet().s * 2, follow: false }); });
  await p.waitForTimeout(2600);
  await p.reload(); await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 240000 }); await p.waitForTimeout(4000);
  const v = await p.evaluate(() => window.__navViewGet());
  ok(Math.abs(v.la - 50.2) < 0.05 && Math.abs(v.lo + 1.5) < 0.05, 'reopening puts the chart back where it was', v.la.toFixed(3) + ', ' + v.lo.toFixed(3));
  ok(!errs.length, 'no script errors', errs.slice(0, 3).join(' / '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
