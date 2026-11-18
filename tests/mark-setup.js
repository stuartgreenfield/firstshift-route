/* The rebuilt Mark set-up, tap by tap on an iPhone screen with the processor slowed 4x. node setup-test.js [base] [/mark/] [outdir] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/mark/', OUT = process.argv[4] || '/tmp/claude-0/f46/su/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1');
  window.__tap = { t0: 0, lat: [] }; addEventListener('pointerdown', () => { window.__tap.t0 = performance.now(); }, true);
  document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const t = window.__tap; if (t.t0) { const t0 = t.t0; t.t0 = 0; requestAnimationFrame(() => t.lat.push(Math.round(performance.now() - t0))); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); }); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.FSSolent && window.FSSolent.marks && window.FSSolent.marks() && window.FSMarkSetup, null, { timeout: 90000 }); await p.waitForTimeout(4000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let n = 0; const shot = async t => { n++; await p.screenshot({ path: OUT + String(n).padStart(2, '0') + '-' + t + '.png' }); };
  const st = () => p.evaluate(() => window.FSMarkSetup.state());
  const tapLL = async (la, lo) => { const xy = await p.evaluate(([a, o]) => window.__fsXY(a, o), [la, lo]); await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(500); return xy; };
  const click = async sel => { await p.locator(sel).first().click(); await p.waitForTimeout(400); };
  const B = () => p.evaluate(() => window.FSSolent.state());
  // fresh start: clear anything left
  await p.evaluate(() => { window.__fsSetLine('boat'); window.__fsSetLine('pin'); window.FSSolent.set({ su: {}, marks: [], fin: 'start', finish: null, startAt: null, type: 'marks' }); window.FSSolent.start(); }); await p.waitForTimeout(800);
  await shot('card'); await click('#solCardM');
  ok(await p.evaluate(() => { const s = document.getElementById('msu'); return !!(s && !s.hidden); }), 'Round the cans opens the set-up list');
  ok((await st()).open === 'line', 'The start line row opens first');
  ok(await p.evaluate(() => !document.getElementById('solStep') || document.getElementById('solStep').hidden), 'The old step box is not shown');
  const span = await p.evaluate(() => { const a = window.__fsXY(50.76, -1.33), c = window.__fsXY(50.79, -1.27); return [Math.round(c[0] - a[0]), Math.round(a[1] - c[1])]; });
  ok(span[0] > 250, 'The chart is zoomed in enough for the buoys to stand apart (3.8 km across ' + span[0] + ' px)', span);
  await shot('line-open');
  // committee boat and pin by tapping water south of 4M
  const MK = await p.evaluate(() => window.FSSolent.marks().map(m => ({ id: m.id, lat: m.lat, lon: m.lon })));
  const m = id => MK.find(q => q.id === id);
  const cb = [50.785, -1.305], pin = [50.785, -1.297];
  await tapLL(cb[0], cb[1]); let L = await p.evaluate(() => window.__fsLine());
  ok(!!L.boat && !L.pin, 'A tap sets the committee boat end', L.boat);
  ok((await st()).end === 'pin', 'Then it asks for the pin end');
  await tapLL(pin[0], pin[1]); L = await p.evaluate(() => window.__fsLine()); ok(!!(L.boat && L.pin), 'A second tap sets the pin end'); await shot('line-set');
  ok(await p.evaluate(() => /Line \d+ m/.test(document.querySelector('#msu .msu-row.open .msu-rt span').textContent)), 'The row shows the line length');
  await click('#msu [data-a="done"]'); let s = await st();
  ok(s.done.find(x => x[0] === 'line')[1], 'Done ticks the start line'); ok(s.open === 'course', 'and opens the course');
  await shot('course-open');
  // course by tapping buoys
  // as the crew would: zoom the chart to show the buoys of the course (two fingers), then tap each; where two buoys sit close, pick from the chooser
  await p.evaluate(([a, c, d]) => { const la = [a.lat, c.lat, d.lat], lo = [a.lon, c.lon, d.lon]; window.__fsFitBox(Math.min(...la) - 0.004, Math.max(...la) + 0.004, Math.min(...lo) - 0.006, Math.max(...lo) + 0.006, { t: 60, b: 844 * 0.54 }); }, [m('4M'), m('4V'), m('40')]); await p.waitForTimeout(400);
  let chooser = 0;
  for (const id of ['4M', '4V', '40']) { const q = m(id); if (!q) { ok(false, 'buoy ' + id + ' known'); continue; } await tapLL(q.lat, q.lon); const pk = p.locator('#msu [data-a="pick"][data-v="' + id + '"]'); if (await pk.count()) { chooser++; await pk.click(); await p.waitForTimeout(300); } }
  console.log('chooser used', chooser, 'times');
  let bb = await B(); ok(JSON.stringify(bb.marks.map(x => x.code)) === '["4M","4V","40"]', 'Tapping 4M, 4V, 40 builds the course in order', bb.marks.map(x => x.code));
  ok(await p.evaluate(() => document.querySelectorAll('#msu .msu-list li').length) === 3, 'The list shows three buoys');
  await shot('course-3');
  // the blue line: a blue pixel midway between 4M and 4V
  const blue = await p.evaluate(([a, c]) => { const A = window.__fsXY(a.lat, a.lon), C = window.__fsXY(c.lat, c.lon), cv = document.getElementById('map'), r = cv.getBoundingClientRect(), k = cv.width / r.width, ctx = cv.getContext('2d'); let hits = 0; for (let t = 0.3; t <= 0.7; t += 0.1) { const x = (A[0] + (C[0] - A[0]) * t - r.left) * k, y = (A[1] + (C[1] - A[1]) * t - r.top) * k; const d = ctx.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 120 && d[i + 1] > 100 && d[i + 1] < 170) { hits++; break; } } return hits; }, [m('4V'), m('40')]);
  ok(blue >= 3, 'The blue line joins 4V to 40 on the chart', blue);
  await click('#msu [data-a="ps"][data-v="1"]'); bb = await B(); ok(bb.marks[1].side === 'starboard', 'P changes 4V to Starboard');
  await click('#msu [data-a="undo"]'); bb = await B(); ok(bb.marks.length === 2, 'Undo last removes 40');
  await click('#msu [data-a="cm"][data-v="codes"]'); await p.fill('#msuBoard', '40 P, 4Q S'); await click('#msu [data-a="board"][data-v="add"]'); bb = await B();
  ok(JSON.stringify(bb.marks.map(x => x.code + x.side[0])) === '["4Mp","4Vs","40p","4Qs"]', 'Typed codes add to the course', bb.marks.map(x => x.code + x.side[0]));
  await click('#msu [data-a="done"]'); s = await st(); ok(s.done.find(x => x[0] === 'course')[1] && s.open === 'finish', 'Done ticks the course and opens the finish');
  await click('#msu [data-a="done"]'); s = await st(); ok(s.open === 'wind', 'Finish at the start line, ticked; wind next');
  await p.fill('#msuTwd', '230'); await p.fill('#msuTws', '12'); await click('#msu [data-a="wind"]'); bb = await B(); ok(bb.wind && bb.wind.twd === 230, 'Wind typed');
  await click('#msu [data-a="tm"][data-v="hand"]'); await p.fill('#msuTdS', '1.2'); await p.fill('#msuTdD', '248'); await click('#msu [data-a="tide"]'); bb = await B();
  ok(bb.tide && bb.tide.mode === 'hand' && bb.tide.spd === 1.2 && bb.tide.dir === 248, 'Tide by hand: 1.2 kn to 248°T', bb.tide);
  ok(await p.evaluate(() => { const t = window.__fsTideHand && window.__fsTideHand(); return !!(t && t.on && Math.abs(t.spd - 1.2) < 0.01); }), 'The tide by hand reaches Route');
  await click('#msu [data-a="plan"][data-v="route"]'); bb = await B(); ok(bb.plan === 'route', 'Route it chosen');
  const nm = await p.locator('#msu [data-a="model"]').count(); ok(nm > 0, 'The forecast models are offered', nm);
  await click('#msu [data-a="plan"][data-v="list"]'); bb = await B(); ok(bb.plan === 'list', 'No routing chosen again');
  await click('#msu [data-a="done"]'); s = await st(); ok(s.open === 'gun', 'Gun next');
  const gt = await p.evaluate(() => { const d = new Date(Date.now() + 20 * 60000); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); });
  await p.fill('#msuGun', gt); await click('#msu [data-a="gun"]'); await click('#msu [data-a="seq"][data-v="5"]'); await click('#msu [data-a="done"]'); s = await st();
  ok(s.done.every(x => x[1]), 'All five rows ticked', s.done); await shot('all-done');
  ok(await p.evaluate(() => !!document.querySelector('#msu [data-a="race"]')), 'Show the race appears');
  await click('#msu [data-a="race"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !window.FSMarkSetup.on() && !!(window.__navCourse && window.__navCourse())), 'Show the race puts the course on the chart and closes the set-up');
  await shot('race');
  // again: start again, the line from the RYS preset and from typed figures, then windward-leeward by codes
  await p.evaluate(() => window.FSMarkSetup.open()); await p.waitForTimeout(500);
  await click('#msu [data-a="again"]'); await click('#msu [data-a="again"]'); s = await st(); L = await p.evaluate(() => window.__fsLine());
  ok(!L.boat && !L.pin && s.done.every(x => !x[1]) && s.open === 'line', 'Start again (tapped twice) clears everything and opens the line', s.done);
  await click('#msu [data-a="lm"][data-v="rys"]'); await click('#msu [data-a="rys"]'); L = await p.evaluate(() => window.__fsLine());
  ok(L.boat && Math.abs(L.boat[0] - 50.766733) < 1e-5 && L.pin, 'RYS line preset sets both ends', L);
  await click('#msu [data-a="lclear"]'); await click('#msu [data-a="lm"][data-v="ll"]'); await p.fill('#msuLat', '50 46.004 N'); await p.fill('#msuLon', '001 18.055 W'); await click('#msu [data-a="ll"]');
  L = await p.evaluate(() => window.__fsLine()); ok(L.boat && Math.abs(L.boat[0] - (50 + 46.004 / 60)) < 1e-5 && Math.abs(L.boat[1] + (1 + 18.055 / 60)) < 1e-5, 'Typed lat and long set the committee boat end', L.boat);
  await click('#msu [data-a="lm"][data-v="buoy"]'); await p.fill('#msuCode', '4M'); await click('#msu [data-a="lcode"]'); L = await p.evaluate(() => window.__fsLine());
  ok(L.pin && Math.abs(L.pin[0] - m('4M').lat) < 1e-6, 'A buoy code sets the pin end', L.pin);
  await click('#msu [data-a="done"]'); await click('#msu [data-a="type"][data-v="wl"]');
  await p.fill('#msuCode', '4V'); await click('#msu [data-a="wcode"]'); await click('#msu [data-a="lstart"]'); bb = await B();
  ok(bb.type === 'wl' && bb.wl.wkind === 'buoy' && bb.wl.wcode === '4V' && bb.wl.lkind === 'start', 'Windward-leeward: windward 4V by code, leeward the start line', bb.wl);
  await click('#msu [data-a="done"]'); s = await st(); ok(s.done.find(x => x[0] === 'course')[1], 'Windward-leeward course ticked');
  await shot('wl');
  await click('#msu [data-a="close"]'); ok(await p.evaluate(() => !window.FSMarkSetup.on() && !document.body.classList.contains('msu-on')), 'Close puts the set-up away');
  const lat = await p.evaluate(() => window.__tap.lat); const sorted = lat.slice().sort((a, b) => a - b);
  console.log('tap to screen change (ms, processor 4x slower):', JSON.stringify(lat), 'median', sorted[Math.floor(sorted.length / 2)], 'worst', sorted[sorted.length - 1]);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
