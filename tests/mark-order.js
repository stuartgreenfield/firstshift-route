/* Stuart 18 Nov 21:37 and 21:45: the base is 0.12.60; offer both orders ("We could offer both options without any issues"); and the speed:
   the builder closes in on the chart so buoys can be tapped, and the chart holds still. iPhone screen, processor slowed 4 times.
   Run: node tests/mark-order.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', OUT = '/tmp/claude-0/f46/ord/';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1');
  window.__tap = { t0: 0, lat: [] }; addEventListener('pointerdown', () => { window.__tap.t0 = performance.now(); }, true);
  document.addEventListener('DOMContentLoaded', () => { new MutationObserver(() => { const t = window.__tap; if (t.t0) { const t0 = t.t0; t.t0 = 0; requestAnimationFrame(() => t.lat.push(Math.round(performance.now() - t0))); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); }); };
(async () => { require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' ')));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && window.FSSolent.marks && window.FSSolent.marks(), null, { timeout: 90000 }); await p.waitForTimeout(4000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let n = 0; const shot = async t => { n++; await p.screenshot({ path: OUT + String(n).padStart(2, '0') + '-' + t + '.png' }); };
  const key = () => p.evaluate(() => window.FSSolent.stepState().key); const B = () => p.evaluate(() => window.FSSolent.state());
  const MK = await p.evaluate(() => window.FSSolent.marks().map(m => ({ id: m.id, lat: m.lat, lon: m.lon }))); const m = id => MK.find(q => q.id === id);
  const next = () => p.evaluate(() => { const x = [...document.querySelectorAll('#solStep button')].find(b => /^Next$/.test(b.textContent.trim())); if (!x || x.disabled) return false; x.click(); return true; });
  const tapLL = async (la, lo) => { const xy = await p.evaluate(([a, o]) => window.__fsXY(a, o), [la, lo]); await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(600); };
  await p.evaluate(() => { window.__fsSetLine('boat'); window.__fsSetLine('pin'); window.FSSolent.set({ marks: [], order: null, type: 'marks', startAt: null, shown: null }); window.FSSolent.start(); }); await p.waitForTimeout(800);
  await p.click('#solCardM'); await p.waitForTimeout(1000); ok(await key() === 'plan', 'Round the cans opens the builder on its first step');
  ok(await p.evaluate(() => /Set first/.test(document.getElementById('solStep').textContent) && !!document.querySelector('#solStep [data-k="order"][data-v="course"]')), 'The first step offers: Set first, The course or The start line');
  ok(await p.evaluate(() => document.querySelector('#solStep [data-k="order"][data-v="line"]').getAttribute('aria-pressed') === 'true'), 'Round the cans keeps its old order unless changed: the start line first');
  await p.click('#solStep [data-k="order"][data-v="course"]'); await p.waitForTimeout(400); await shot('order');
  await next(); await p.waitForTimeout(800); ok(await key() === 'marks', 'Course first: the next step is the buoys', await key());
  ok(await p.evaluate(() => !(window.__navFollow && window.__navFollow())), 'The chart holds still (not following the boat) while building');
  const px = await p.evaluate(() => { const a = window.__fsXY(50.78, -1.30), c = window.__fsXY(50.78, -1.30 + 0.0142); return Math.round(c[0] - a[0]); });
  ok(px >= 70, 'The chart closes in: 1 km is ' + px + ' px, so buoys stand apart', px); await shot('marks-open');
  // the crew pans to the buoys of the course, then taps each, choosing Port in the little card
  await p.evaluate(([a, c, d]) => { const la = [a.lat, c.lat, d.lat], lo = [a.lon, c.lon, d.lon]; const sb = document.getElementById('solStep').getBoundingClientRect().top; window.__fsFitBox(Math.min(...la) - 0.004, Math.max(...la) + 0.004, Math.min(...lo) - 0.006, Math.max(...lo) + 0.006, { t: 60, b: sb - 4 }); }, [m('4M'), m('4V'), m('40')]); await p.waitForTimeout(400);
  for (const id of ['4M', '4V', '40']) { const q = m(id); await tapLL(q.lat, q.lon); const side = await p.$('#solSide:not([hidden]) [data-s="port"]'); if (side) { await side.click(); await p.waitForTimeout(400); } }
  let bb = await B(); ok(JSON.stringify((bb.marks || []).map(x => x.code)) === '["4M","4V","40"]', 'Tapping 4M, 4V, 40 builds the course in order', (bb.marks || []).map(x => x.code)); await shot('marks-3');
  const blue = await p.evaluate(([a, c]) => { const A = window.__fsXY(a.lat, a.lon), C = window.__fsXY(c.lat, c.lon), cv = document.getElementById('map'), r = cv.getBoundingClientRect(), k = cv.width / r.width, ctx = cv.getContext('2d'); let hits = 0; for (let t = 0.3; t <= 0.7; t += 0.1) { const x = (A[0] + (C[0] - A[0]) * t - r.left) * k, y = (A[1] + (C[1] - A[1]) * t - r.top) * k; const d = ctx.getImageData(Math.round(x) - 3, Math.round(y) - 3, 7, 7).data; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 120 && d[i + 1] > 100 && d[i + 1] < 170) { hits++; break; } } return hits; }, [m('4V'), m('40')]);
  ok(blue >= 3, 'While building, a blue line joins 4V to 40', blue);
  await next(); await p.waitForTimeout(600); ok(await key() === 'fin', 'Then the finish', await key()); await next(); await p.waitForTimeout(600); ok(await key() === 'start', 'Then the start line, last', await key());
  ok(await p.evaluate(() => !(window.__navFollow && window.__navFollow())), 'Still holding still on the start line step');
  // back to line first: the order follows
  await p.evaluate(() => window.FSSolent.step(1)); await p.waitForTimeout(500); await p.click('#solStep [data-k="order"][data-v="line"]'); await p.waitForTimeout(300); await next(); await p.waitForTimeout(600);
  ok(await key() === 'start', 'Line first: the next step is the start line', await key());
  await p.evaluate(() => { const x = [...document.querySelectorAll('#solStep button')].find(b => b.dataset.k === 'x'); if (x) x.click(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.getElementById('solStep') || document.getElementById('solStep').hidden), 'Closing the builder puts it away');
  const lat = await p.evaluate(() => window.__tap.lat); const so = lat.slice().sort((a, c) => a - c); console.log('tap to screen change (ms, processor 4x slower):', JSON.stringify(lat), 'median', so[Math.floor(so.length / 2)]);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
