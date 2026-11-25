/* Screens check, a release check (Stuart 23 Nov 2026 09:51: "the tools need to be tested across all screens that might run it can you do
   this before each go live point please"; 09:56 "Quick, then full nightly"; portrait first, 09:19). Every tool on phones upright and on
   their side, tablets both ways round, laptops and desktops (100% and Chrome at 125%), each at the size the page really gets, through every
   race state: no button, card or box off the screen, and no button covered by something not meant to lie over it (an open panel, sheet or
   window over the chart is meant to). Pictures of every state.
   node tests/screens-check.js [quick|full] [route|routeplus|mark|markplus ...]   (Route and Mark on 8779, Route+ and Mark+ on 8778) */
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/screens'; fs.mkdirSync(OUT, { recursive: true });
/* [name, width, height, touch]: the size the page gets (the screen less the browser's bars). Chrome at 125% on a 13-inch MacBook gives the page 1152 by 608. */
const ALL = [['iPhone SE upright, Safari', 375, 553, 1], ['iPhone 13 upright, Safari', 390, 664, 1], ['iPhone 14 Plus upright, Safari', 428, 746, 1], ['Galaxy S8 upright, Chrome', 360, 640, 1], ['Pixel 7 upright, Chrome', 412, 839, 1], ['Android app upright', 412, 891, 1],
  ['iPhone SE on its side, Safari', 667, 323, 1], ['iPhone 13 on its side, Safari', 844, 340, 1], ['iPhone 14 Plus on its side, Safari', 926, 376, 1], ['Pixel 7 on its side, Chrome', 915, 356, 1], ['Android app on its side', 915, 388, 1],
  ['iPad mini upright', 744, 1069, 1], ['iPad mini on its side', 1133, 680, 1], ['iPad upright', 820, 1106, 1], ['iPad on its side', 1180, 746, 1], ['iPad Pro 12.9 on its side', 1366, 950, 1], ['Android tablet upright', 800, 1216, 1], ['Android tablet on its side', 1280, 736, 1],
  ['MacBook 13, Chrome', 1440, 760, 0], ['MacBook 13, Chrome at 125%', 1152, 608, 0], ['MacBook 13, Safari', 1440, 790, 0], ['Laptop 1366, Chrome', 1366, 625, 0], ['Desktop 1920, Chrome', 1920, 960, 0], ['Desktop 2560, Chrome', 2560, 1300, 0]];
const QUICK = ['iPhone 13 upright, Safari', 'iPhone 13 on its side, Safari', 'iPad on its side', 'MacBook 13, Chrome'];
const MODE = process.argv.includes('full') ? 'full' : 'quick';
const PHONES = MODE === 'full' ? ALL : ALL.filter(d => QUICK.includes(d[0]));
const TOOLS = { route: ['http://localhost:8779', '/fastnet/'], routeplus: ['http://localhost:8778', '/fastnet/'], mark: ['http://localhost:8779', '/mark/'], markplus: ['http://localhost:8778', '/mark/'] };
const want = process.argv.slice(2).filter(a => TOOLS[a]); const tools = want.length ? want : Object.keys(TOOLS);
let pass = 0, fail = 0; const probs = [];
const ok = (c, m, d) => { if (c) pass++; else { fail++; probs.push(m + (d ? ' | ' + d : '')); console.log('FAIL ' + m + (d ? ' | ' + d : '')); } };
const scan = () => { const W = innerWidth, H = innerHeight, vis = e => { if (!e.getClientRects().length) return false; for (let f = e; f; f = f.parentElement) { const cs = getComputedStyle(f); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const scroller = e => { for (let f = e.parentElement; f && f !== document.body; f = f.parentElement) { const cs = getComputedStyle(f); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (f.scrollHeight > f.clientHeight + 1 || f.scrollWidth > f.clientWidth + 1)) return f; } return null; };
  const name = e => (e.id ? '#' + e.id : '') || (e.getAttribute('aria-label') || e.textContent || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 24);
  const els = [...document.querySelectorAll('button, select, input:not([type=hidden]), [role=button], .ssc')].filter(e => vis(e) && !e.closest('#map, .navgrip2, .fswtab, [aria-hidden=true]'));
  const off = [], cov = [];
  els.forEach(e => { const R = e.getBoundingClientRect(); if (R.width < 2 || R.height < 2) return; const sc = scroller(e);
    if (R.right > W + 1 || R.bottom > H + 1 || R.left < -1 || R.top < -1) { if (!sc) off.push(name(e) + ' ' + Math.round(R.left) + ',' + Math.round(R.top) + '-' + Math.round(R.right) + ',' + Math.round(R.bottom)); return; }
    if (e.classList.contains('ssc') || e.tagName === 'INPUT' && e.type === 'range') return;
    if (sc) { const Q = sc.getBoundingClientRect(); if (R.top < Q.top - 1 || R.bottom > Q.bottom + 1) return; }   /* 25 Nov: a button scrolled out of its own scrolling list (a route card below the fold of Routes) is reached by scrolling, not covered */
    const x = (R.left + R.right) / 2, y = (R.top + R.bottom) / 2, h = document.elementFromPoint(x, y);
    const LAYER = '.sheet, .pop, #panel, [role=dialog], .solss, #help, #fsTour, #liveBig, #navHelm, #fhHelm, .solpop, #races, #solList, #layers, .fstpop, #tgPop, #fsHelm, #deckNums, #dkView';   /* 24 Nov 20:40: the Tide gates window, Route's HELM view and the 20/20 deck are windows the user opens over the chart (item 21) */
    const lay = h && h.closest && h.closest(LAYER);   /* an open panel, sheet or window lying over the chart is meant to cover what is under it */
    if (lay && !lay.contains(e) && !(e.closest(LAYER) && e.closest(LAYER).contains(lay)) && !(e.closest(LAYER) && getComputedStyle(lay).zIndex !== 'auto' && getComputedStyle(e.closest(LAYER)).zIndex !== 'auto' && +getComputedStyle(lay).zIndex > +getComputedStyle(e.closest(LAYER)).zIndex && !e.closest('#layers'))) return;
    if (h && !(h === e || e.contains(h) || h.contains(e)) && getComputedStyle(h).pointerEvents !== 'none' && !h.closest('#map')) cov.push(name(e) + ' under ' + name(h.closest('button,[role=button],.sheet,.pop,section,div') || h)); });
  return { W, H, off, cov }; };
async function look(p, label, file) { await p.waitForTimeout(700); const r = await p.evaluate(scan); ok(!r.off.length, label + ': nothing off the screen', r.off.slice(0, 6).join('; ')); ok(!r.cov.length, label + ': no button covered', r.cov.slice(0, 6).join('; ')); await p.screenshot({ path: OUT + '/' + file + '.jpg', type: 'jpeg', quality: 70 }); }
const hideSheets = p => p.evaluate(() => { document.querySelectorAll('.sheet, .pop').forEach(e => { if (!e.hidden && !/^(layers)$/.test(e.id)) e.hidden = true; }); const sp = document.getElementById('splash'); if (sp) sp.hidden = true; });
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
(async () => { const b = await chromium.launch();
  for (const tool of tools) for (const [ph, w, h, touch] of PHONES) {
    const [base, path] = TOOLS[tool], tag = tool + '-' + w + 'x' + h, L = (s) => tool + ' · ' + ph + ' ' + w + 'x' + h + ' · ' + s;
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: !!touch && w < 1000, hasTouch: !!touch, deviceScaleFactor: touch ? 2 : 1, serviceWorkers: 'block', geolocation: { latitude: 50.7745, longitude: -1.2990, accuracy: 5 }, permissions: ['geolocation'] });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (tool.startsWith('mark')) {
      await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(800);
      await look(p, L('first card'), tag + '-1card');
      await p.click('#solCardT'); await p.waitForTimeout(3500); await look(p, L('test mode, start screen'), tag + '-2startscreen');
      await p.evaluate(() => { const s = document.getElementById('solStartScr'); if (s) s.hidden = true; }); await p.waitForTimeout(300); await look(p, L('test mode, before the gun, chart'), tag + '-3pregun');
      await p.evaluate(() => { const s = FSSolent.state(); s.startAt = Math.round(Date.now() / 1000 + 2); window.__fsGun(s.startAt); }); await p.waitForTimeout(6000); await hideSheets(p);
      await look(p, L('racing, slider folded'), tag + '-4racing');
      if (await click(p, '#mkTimeBtn')) { await look(p, L('racing, slider shown'), tag + '-5time'); await click(p, '#mkTimeBtn'); }
      if (await click(p, '#fsPlotBtn')) { await look(p, L('racing, plotter'), tag + '-6plot'); }
      if (await click(p, '#fsDeckBtn')) { await look(p, L('racing, 20/20'), tag + '-7twenty'); await click(p, '#fsDeckBtn'); }
      await p.evaluate(() => { const t = document.querySelector('.tab[data-tab="fleet"]'); if (t) t.click(); }); await p.waitForTimeout(500); await click(p, '#mfDemo'); await look(p, L('Fleet, test fleet'), tag + '-8fleet');
      await click(p, '#layersBtn'); await look(p, L('Layers'), tag + '-9layers'); await click(p, '#layersBtn');
      await p.evaluate(() => { FSSolent.test(false); const s = document.getElementById('solCard'); if (s) s.hidden = true; FSSolent.chain(true); }); await p.waitForTimeout(1200);
      if (await click(p, '#solChain [data-k="list"]')) { await p.waitForTimeout(1200); await look(p, L('All the buoys'), tag + '-10list'); }
    } else {
      await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(800); await hideSheets(p);
      await look(p, L('routes ready'), tag + '-1ready');
      await click(p, '#liveBtn'); await p.waitForTimeout(2500); await click(p, '#fsPlotBtn') || await click(p, '#navPlotBtn'); await p.waitForTimeout(800); await hideSheets(p); await look(p, L('GPS and plotter'), tag + '-2plot');
      if (await click(p, '#fsDeckBtn')) { await look(p, L('20/20'), tag + '-3twenty'); await click(p, '#fsDeckBtn'); }
      if (await p.evaluate(() => { if (window.FSHelm) { window.FSHelm.open(); return true; } const n = document.querySelector('.navhelmb'); if (n) { n.click(); return true; } return false; })) { await look(p, L('HELM'), tag + '-4helm'); await p.evaluate(() => { if (window.FSHelm) window.FSHelm.close(); const x = document.getElementById('nhX'); if (x && x.offsetParent) x.click(); }); }
      if (await click(p, '#tgBtn')) { await look(p, L('TIDE'), tag + '-5tide'); await click(p, '#tgBtn'); }
      await p.evaluate(() => { const t = document.querySelector('.tab[data-tab="fleet"]'); if (t) t.click(); }); await p.waitForTimeout(500); await click(p, '#mfDemo'); await look(p, L('Fleet, test fleet'), tag + '-6fleet');
      await click(p, '#layersBtn'); await look(p, L('Layers'), tag + '-7layers'); await click(p, '#layersBtn');
      await click(p, '#setBtn'); await look(p, L('Settings'), tag + '-8settings');
    }
    ok(!errs.length, L('no script errors'), errs.slice(0, 2).join('; ')); await c.close(); }
  fs.writeFileSync(OUT + '/report.txt', probs.join('\n') + '\n' + pass + ' passed, ' + fail + ' failed\n');
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
