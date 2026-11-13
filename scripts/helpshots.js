/* Screen pictures for Route's newer Help topics (13 Nov 2026). Run against a Route test server:
   node scripts/helpshots.js http://localhost:8769 outdir, then python3 scripts/helpimg.py outdir site/cervantes/fshelpimg.js */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear(); localStorage.setItem('fs-terms', '2026-11-13'); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await ctx.newPage();
  await p.goto(BASE + '/channel-area/?race=morgan');
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running && f.routes.length > 2; }, null, { timeout: 240000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const e = [...document.querySelectorAll('div')].filter(d => /^Check against the sailing instructions/.test(d.textContent.trim())).pop(); if (e) e.style.display = 'none'; });
  const shot = async (name, clip) => { await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/' + name + '.png', clip }); };
  const rect = (sel, pad) => p.evaluate(a => { const e = document.querySelector(a[0]); if (!e) return null; const r = e.getBoundingClientRect(), d = a[1] || 8; return { x: Math.max(0, r.left - d), y: Math.max(0, r.top - d), width: Math.min(innerWidth - Math.max(0, r.left - d), r.width + 2 * d), height: Math.min(innerHeight - Math.max(0, r.top - d), r.height + 2 * d) }; }, [sel, pad]);
  // tap box
  await p.evaluate(() => { const v = window.__navViewGet(); window.__navViewSet({ la: 50.45, lo: -2.0, s: v.s, follow: false }); }); await p.waitForTimeout(800);
  const t = await p.evaluate(() => window.__navXY(50.45, -2.0)); await p.mouse.click(t[0], t[1]); await p.waitForTimeout(900);
  const tb = await rect('#tip', 10); if (tb) await shot('tap', { x: tb.x, y: tb.y, width: tb.width, height: Math.min(tb.height, 330) });
  await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  // clear screen
  await p.evaluate(() => window.NavClear.set(true)); await shot('clear', { x: 0, y: 0, width: 1280, height: 800 }); await p.evaluate(() => window.NavClear.set(false));
  // settings
  await p.click('#setBtn'); await p.waitForTimeout(600);
  const sh = await rect('#sheet .in', 0);
  await p.evaluate(() => { const t = document.getElementById('navToast'); if (t) t.remove(); });
  await p.click('#sheet .stabs .tab[data-s="boat"]'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const w = document.getElementById('fsWind'), sb = document.getElementById('s-boat'); sb.scrollTop += w.getBoundingClientRect().top - sb.getBoundingClientRect().top - 90; }); await shot('wind', sh);
  await p.click('#sheet .stabs .tab[data-s="fc"]'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('navAgeRow').scrollIntoView({ block: 'center' })); await shot('models', sh);
  await p.click('#sheet .stabs .tab[data-s="mine"]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('s-mine').scrollTop = 0; document.querySelector('#s-mine .tabsum').scrollIntoView({ block: 'start' }); }); await shot('mine', sh);
  await p.evaluate(() => document.getElementById('navMoveBtn').scrollIntoView({ block: 'center' })); await shot('move', sh);
  await p.fill('#setFind', 'tide'); await p.waitForTimeout(500); await shot('find', sh);
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
