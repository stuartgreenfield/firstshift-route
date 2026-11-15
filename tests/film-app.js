/* The how-to film in the Navigate app opens in the phone's video player from a plain link (Stuart 15 Nov 22:27); in a browser the
   page's own player still opens. Run: node tests/film-app.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8768';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const app of [true, false]) {
    const c = await b.newContext({ viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c.addInitScript(a => { try { if (a) window.NativeLink = { open: () => {} }; if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } catch (e) {} }, app);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(5000);
    const r = await p.evaluate(() => { const e = document.getElementById('spFilm'); return e ? { tag: e.tagName, href: e.getAttribute('href'), vis: getComputedStyle(e).display, img: (e.querySelector('img') || {}).src, txt: e.textContent.trim().slice(0, 40) } : null; });
    if (app) { ok(r && r.tag === 'A' && /^https:\/\/route\.firstshiftsailing\.com\/films\/navigate-how-to\.mp4$/.test(r.href) && r.vis !== 'none', 'in the app the film card is a link to the film, for the phone\'s video player', JSON.stringify(r));
      let nav = null; p.on('request', q => { if (/navigate-how-to\.mp4/.test(q.url()) && q.isNavigationRequest()) nav = q.url(); }); await p.tap('#spFilm').catch(() => {}); await p.waitForTimeout(1500); ok(!!nav, 'tapping it goes to the film (the app hands it to the video player)', nav); }
    else { ok(r && r.tag === 'BUTTON', 'in a browser the card stays a button', JSON.stringify(r)); await p.tap('#spFilm'); await p.waitForTimeout(800); ok(await p.evaluate(() => { const f = document.getElementById('fsFilm'); return !!f && !f.hidden; }), 'and opens the page\'s own player'); }
    ok(errs.length === 0, (app ? 'app' : 'browser') + ': no page errors', errs.join(' | ')); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
