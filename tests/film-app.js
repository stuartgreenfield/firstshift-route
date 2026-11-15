/* The how-to film (Stuart 15 Nov 22:27 and 22:40): in the Navigate app a tap plays it in Android's own player inside the app, with
   End and Go to the tool; Go to the tool skips the landing page. In a browser the page's own player opens as before.
   Run: node tests/film-app.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8768';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  for (const app of [true, false]) {
    const c = await b.newContext({ viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c.addInitScript(a => { try { if (a) { window.__films = []; window.NativeLink = { playFilm: (u, t) => window.__films.push([u, t]) }; } if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } catch (e) {} }, app);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/channel-area/'); await p.waitForTimeout(5000);
    await p.tap('#spFilm'); await p.waitForTimeout(900);
    if (app) {
      const r = await p.evaluate(() => ({ calls: window.__films, page: !!document.getElementById('fsFilm') && !document.getElementById('fsFilm').hidden, url: location.href }));
      ok(r.calls.length === 1 && /navigate-how-to\.mp4/.test(r.calls[0][0]) && r.calls[0][0].split('|').length >= 2 && /How to use Navigate/.test(r.calls[0][1]), 'in the app a tap plays the film once in the app\'s own player, with both film addresses', JSON.stringify(r.calls));
      ok(!r.page && /channel-area/.test(r.url), 'the page stays where it is, ready to come back to', r.url);
      const g = await p.evaluate(() => { const sp = document.getElementById('splash'); const before = sp && !sp.hidden; FSFilm.go(); return { before, after: sp && !sp.hidden }; }); await p.waitForTimeout(2500);
      ok(g.before && !(await p.evaluate(() => { const sp = document.getElementById('splash'); return sp && !sp.hidden; })), 'Go to the tool leaves the landing page for the tool', JSON.stringify(g));
    } else { ok(await p.evaluate(() => { const f = document.getElementById('fsFilm'); return !!f && !f.hidden; }), 'in a browser the page\'s own player opens'); }
    ok(errs.length === 0, (app ? 'app' : 'browser') + ': no page errors', errs.join(' | ')); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
