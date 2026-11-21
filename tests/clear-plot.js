/* Stuart 21 Nov 2026 07:19, items 1 to 4:
   1. With "Hide the menus again after" Off, the × by the Data tab on a folded panel only folds, never clears; only CLEAR clears.
   2. A long press on CLEAR opens the same "Hide the menus again after" choice.
   3. On Mark the default is "Off: leave them up"; Route keeps 1 minute.
   4. Plotter: full-height ‹ › arrows about 56 px wide, swipe left or right for the next or previous mark, and the panel's buttons
      are not rebuilt every second.
   Run: node tests/clear-plot.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const c = await b.newContext({ viewport: { width: 400, height: 860 }, hasTouch: false, serviceWorkers: 'block' });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); }
      document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
      window.__fake = { la: 50.78, lo: -1.30, sog: 6, cog: 200 };
      const fx = () => ({ coords: { latitude: window.__fake.la, longitude: window.__fake.lo, accuracy: 5, speed: window.__fake.sog * 0.514444, heading: window.__fake.cog, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
      const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) };
      Object.defineProperty(navigator, 'geolocation', { get: () => g }); });
    return c; };
  const errs = [];
  const open = async (c, path) => { const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(9000);
    await p.evaluate(() => { ['spTourNo', 'wizX', 'sheetX'].forEach(id => { const n = document.getElementById(id); if (n && n.offsetParent) n.click(); }); }); await p.waitForTimeout(500); return p; };
  const cleared = p => p.evaluate(() => document.body.classList.contains('navclear'));

  /* ---- Route ---- */
  const c1 = await mk(), p = await open(c1, '/channel-area/');
  ok(await p.evaluate(() => window.__navHide()) === 1, 'Route: the default is still 1 minute');
  const fold = async () => { await p.evaluate(() => { const pn = document.getElementById('panel'); if (pn && !pn.classList.contains('collapsed')) document.getElementById('panelX').click(); }); await p.waitForTimeout(500); };
  await p.evaluate(() => window.__navHide(0)); await fold();
  const folded = await p.evaluate(() => document.getElementById('panel').classList.contains('collapsed'));
  await p.evaluate(() => document.getElementById('panelX').click()); await p.waitForTimeout(500);
  ok(folded && !(await cleared(p)), '1. Off: × on the folded panel does not clear the screen', 'folded ' + folded);
  await p.evaluate(() => window.__navHide(1)); await fold(); await p.evaluate(() => document.getElementById('panelX').click()); await p.waitForTimeout(500);
  ok(await cleared(p), '1. With 1 minute chosen, × on the folded panel still clears, as before');
  await p.evaluate(() => window.NavClear.set(false)); await p.waitForTimeout(400);
  /* 2. long press on CLEAR */
  const cb = await p.$('#navClearBtn'); const r = await cb.boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(400);
  const card = await p.evaluate(() => { const o = document.getElementById('navHideCard'); return o ? { val: o.querySelector('select').value, opts: [...o.querySelectorAll('option')].map(x => x.textContent), r: o.getBoundingClientRect().toJSON() } : null; });
  ok(!!card && !(await cleared(p)), '2. A long press on CLEAR opens the choice and does not clear', card && card.opts.join(' / '));
  ok(card && card.val === '1' && card.opts[0] === 'Off: leave them up', '2. The choice shows the setting now in force, with the same options as Settings', card && card.val);
  ok(card && card.r.left >= 0 && card.r.right <= 400 && card.r.top >= 0 && card.r.bottom <= 860, '2. The choice is on the screen', card && JSON.stringify(card.r));
  await p.selectOption('#navHideSel', '3'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__navHide()) === 3, '2. Choosing there changes the setting itself');
  await p.click('#navHideOk'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('navHideCard') && !document.querySelector('.navmove-on')), '2. Done closes it, and the long press did not start moving the button');
  const cbr = await (await p.$('#navClearBtn')).boundingBox(), hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) + '' : null; }, [cbr.x + cbr.width / 2, cbr.y + cbr.height / 2]);
  await p.waitForTimeout(600); await p.evaluate(() => { window.__lg = []; const b = document.getElementById('navClearBtn'); ['pointerdown','pointerup','click'].forEach(k => b.addEventListener(k, () => window.__lg.push(k + ':' + document.body.classList.contains('navclear')))); new MutationObserver(() => window.__lg.push('cls:' + document.body.classList.contains('navclear') + ':' + (new Error().stack||'').split('\n').slice(2,4).join('|'))).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }); const before = await cleared(p); await p.mouse.click(cbr.x + cbr.width / 2, cbr.y + cbr.height / 2); await p.waitForTimeout(400);
  ok(await cleared(p), '2. A short tap on CLEAR still clears', 'n=' + (await p.evaluate(() => document.querySelectorAll('#navClearBtn').length)) + ' before ' + before + ', ' + (await p.evaluate(() => window.__lg.join(' ; '))) + ', ' + 'at the button: ' + hit + ', lp ' + await p.evaluate(() => document.getElementById('navClearBtn')._lp));
  await p.evaluate(() => window.NavClear.set(false)); await p.waitForTimeout(400);
  { const r1 = await (await p.$('#navClearBtn')).boundingBox(); await p.mouse.move(r1.x + 22, r1.y + 22); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up(); await p.waitForTimeout(300);
    await p.click('#navHideMove'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const b = document.getElementById('navClearBtn'); return b.classList.contains('navmove-on'); }), '2. Move this button in the choice still lets CLEAR be moved');
    await p.evaluate(() => { if (window.NavDrag) NavDrag.lock(); }); await p.waitForTimeout(400); }

  /* 4. plotter */
  await p.evaluate(() => { const P = window.__fsPlot || window.__navPlot; if (P.reset) P.reset(); if (P.C) { P.C.mode = 'mark'; P.C.mini = false; } P.toggle(true); }); await p.waitForTimeout(3000);
  const geo = await p.evaluate(() => { const bar = (document.getElementById('fsPlot') || document.getElementById('navPlot')), a = [...bar.querySelectorAll('.rparrow')].map(x => x.getBoundingClientRect()), br = bar.getBoundingClientRect(); return { n: a.length, w: a.map(x => Math.round(x.width)), h: a.map(x => Math.round(x.height)), bh: Math.round(br.height), ok: (window.__fsPlot || window.__navPlot).calc().ok }; });
  ok(geo.n === 2 && geo.w.every(w => w >= 50 && w <= 60), '4. Two arrows about 56 px wide', geo.w.join(', '));
  ok(geo.n === 2 && geo.h.every(h => h >= geo.bh - 20), '4. The arrows run the full height of the panel', geo.h.join(', ') + ' of ' + geo.bh);
  const same = await p.evaluate(async () => { const q = () => [...document.querySelectorAll('#fsPlot button, #navPlot button')]; const a = q(); await new Promise(r => setTimeout(r, 3500)); const z = q(); return a.length === z.length && a.every((x, i) => x === z[i] && x.isConnected); });
  ok(same, '4. The buttons are the same buttons after 3.5 s of ticks (no rebuild each second)');
  const idx = () => p.evaluate(() => (window.__fsPlot || window.__navPlot).calc().i);
  const i0 = await idx(); await p.click('.rparrow[data-k="next"]'); await p.waitForTimeout(400); const i1 = await idx();
  await p.click('.rparrow[data-k="prev"]'); await p.waitForTimeout(400); const i2 = await idx();
  ok(i1 !== i0 && i2 === i0, '4. › and ‹ change the mark', i0 + ' > ' + i1 + ' > ' + i2);
  const swipe = async dx => { const br = await (await p.$('.rpbody, .npbody')).boundingBox(), y = br.y + br.height / 2, x = br.x + br.width / 2; await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y + 3); await p.mouse.move(x + dx, y + 5); await p.mouse.up(); await p.waitForTimeout(500); };
  await swipe(-140); const i3 = await idx(); await swipe(140); const i4 = await idx();
  ok(i3 === i1 && i4 === i0, '4. Swipe left for the next mark, right for the previous one', i0 + ' > ' + i3 + ' > ' + i4);
  const mini0 = await p.evaluate(() => (window.__fsPlot || window.__navPlot).C.mini); await swipe(-140);
  ok(await p.evaluate(() => (window.__fsPlot || window.__navPlot).C.mini) === mini0, '4. A swipe that ends on the name does not also count as a tap');
  await c1.close();

  /* ---- Mark: 3 ---- */
  const c2 = await mk(), q = await open(c2, '/mark/');
  ok(await q.evaluate(() => window.__navHide()) === 0, '3. Mark: the default is Off: leave them up');
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
