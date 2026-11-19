/* A practice race as a committee would lay it (screen audit A2, A17, A22, A26; Stuart 19 Nov 03:37, 03:55).
   Run: node tests/test-mode-real.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const page = async (b, type) => { const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  if (type) await p.evaluate(t => FSSolent.set({ type: t }), type);
  await p.click('#solCardT'); await p.waitForTimeout(3000); return p; };
(async () => { const b = await chromium.launch();
  /* round the cans, no course of the crew's own */
  let p = await page(b, null);
  const r = await p.evaluate(() => { const s = FSSolent.state(), c = window.__navCourse(), pts = [c.start].concat(c.marks || [], c.finish ? [c.finish] : []); let nm = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], q = pts[i], k = Math.cos(a.lat * Math.PI / 180); nm += Math.hypot((q.lat - a.lat) * 60, (q.lon - a.lon) * 60 * k); }
    const t = document.getElementById('solStartScr'), bias = t && t.innerText.replace(/\s+/g, ' ').match(/(\d+)° off square/); return { type: s.type, marks: (c.marks || []).length, nm: +nm.toFixed(2), off: bias ? +bias[1] : (t && /0° off square|square/i.test(t.innerText) ? 0 : null) }; });
  const lc = await p.evaluate(() => !/pin is to starboard of the committee boat/i.test(document.getElementById('solStartScr').innerText)); ok(lc, 'The practice line has the committee boat at the starboard end looking upwind (no line-check warning)');
  ok(r.off != null && r.off <= 8, 'The practice line is laid nearly square to the wind (a few degrees of bias)', r.off);
  ok(r.type === 'marks' && r.marks >= 2 && r.nm > 2 && r.nm < 5, 'Round the cans practice course: short (2 to 5 nm), at least two marks', r);
  const legs = await p.evaluate(() => { const s = document.body.innerText; return /beat/i.test(s); }); ok(legs, 'The first leg is a beat');
  /* A12 and B2: before the gun the boat is lined up on the favoured end; on the beat it sails the polar's best angle, not a fixed 42 */
  const p1 = await p.evaluate(() => ({ la: FSSolent.em().p.lat, lo: FSSolent.em().p.lon })); await p.waitForTimeout(2500);
  const fav = await p.evaluate((p1) => { const l = window.__fsLine(), e = FSSolent.em(), t = document.getElementById('solStartScr'), m = t && t.innerText.match(/BIAS\s*(Pin|Committee boat|Boat)/i), k = Math.cos(l.boat[0] * Math.PI / 180);
    const xy = (la, lo) => [(lo - l.boat[1]) * 60 * k, (la - l.boat[0]) * 60], P = xy(l.pin[0], l.pin[1]), B = xy(e.p.lat, e.p.lon), A = xy(p1.la, p1.lo), dv = [B[0] - A[0], B[1] - A[1]];
    const den = dv[0] * P[1] - dv[1] * P[0], u = den ? (dv[0] * B[1] - dv[1] * B[0]) / den : null;   /* where along the line (0 the committee boat end, 1 the pin) the track crosses */
    return { end: m && m[1], cross: u == null ? null : +u.toFixed(2), nearer: u == null ? null : u > 0.5 ? 'pin' : 'boat' }; }, p1);
  ok(fav.end && fav.cross != null && fav.cross >= -0.02 && fav.cross <= 1.02 && ((/pin/i.test(fav.end) && fav.cross > 0.8) || (!/pin/i.test(fav.end) && fav.cross < 0.2)), 'Before the gun the test boat\'s course crosses the line at the favoured end the screen shows', fav);
  const cov = await p.evaluate(() => [...document.querySelectorAll('#solTestBar button, .soltest button')].filter(x => x.getClientRects().length).map(x => { const r = x.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return x.contains(t) ? null : x.textContent.trim(); }).filter(Boolean));
  ok(cov.length === 0, 'No test bar button is covered (man overboard sits clear of it, audit A1)', cov);
  /* audit A8 (Stuart 12:38 "Fix the orange bar"): on a phone the bar is one line, the chart band stays open, man overboard sits in it, More opens the rest */
  const bar = await p.evaluate(() => { const b = document.getElementById('solTestBar'), r = b.getBoundingClientRect(), st = parseFloat(getComputedStyle(document.body).getPropertyValue('--sst')), sb = parseFloat(getComputedStyle(document.body).getPropertyValue('--ssb'));
    const m = document.getElementById('mobBtn').getBoundingClientRect(), n = document.querySelector('#solStartScr .ssnum').getBoundingClientRect();
    return { h: Math.round(r.height), band: Math.round(sb - st), mobClear: m.bottom <= n.top + 1 && m.top >= st - 1, shown: [...b.querySelectorAll('button')].filter(x => x.getClientRects().length).map(x => x.textContent.trim()) }; });
  ok(bar.h <= 44 && bar.shown.length <= 2, 'Phone: the test bar is one line (speed and More)', bar);
  ok(bar.band >= 100, 'Phone: a band of chart at least 100 px tall stays open above the boxes', bar.band);
  ok(bar.mobClear, 'Phone: man overboard sits in the chart band, clear of the boxes and the bars');
  await p.evaluate(() => document.querySelector('#solTestBar [data-em=more]').click()); await p.waitForTimeout(500);
  const open = await p.evaluate(() => [...document.querySelectorAll('#solTestBar button')].filter(x => x.getClientRects().length).map(x => x.textContent.trim()));
  ok(open.some(t => /Stop/.test(t)) && open.some(t => /Wind \+10/.test(t)) && open.some(t => /Less/.test(t)), 'More opens the wind shifts, course change, early start and Stop', open);
  await p.evaluate(() => document.querySelector('#solTestBar [data-em=more]').click()); await p.waitForTimeout(400);
  /* x20: the race clock keeps up with the boat */
  await p.evaluate(() => { const g = Math.round(Date.now() / 1000 + 3); window.__fsGun(g); FSSolent.set({ startAt: g }); }); await p.waitForTimeout(5000);
  await p.evaluate(() => { FSSolent.em().x = 20; }); await p.waitForTimeout(30000);
  const k = await p.evaluate(() => ({ sim: FSSolent.em().t, race: Date.now() / 1000 - FSSolent.state().startAt }));
  ok(Math.abs(k.race - k.sim) < Math.max(30, 0.1 * k.sim), 'At x20 the race clock matches the boat\'s sailing time', { sim: Math.round(k.sim), race: Math.round(k.race) });
  const ang = await p.evaluate(() => { const sp = window.__fsSpeed && window.__fsSpeed(), w = FSSolent.windRef(), best = sp ? FSRouter.bestVmg(sp, w.tws || 12, true)[0] : 42, L = FSSolent.em().log.filter(q => q[0] === 'p').slice(-40);
    const tw = L.map(q => Math.abs(((q[4] - w.twd + 540) % 360) - 180)).filter(a => a < 90); return { best: best, sailed: tw.length ? Math.round(tw.reduce((a, b) => a + b, 0) / tw.length) : null, mode: FSSolent.em().mode }; });
  ok(ang.sailed != null && Math.abs(ang.sailed - ang.best) <= 5, 'On the beat the test boat sails the polar\'s best upwind angle', ang);
  ok(p.errs.length === 0, 'No script errors (round the cans)', p.errs.slice(0, 2)); await p.context().close();
  /* windward-leeward chosen, no line and no course: a windward-leeward is sailed */
  p = await page(b, 'wl');
  const w = await p.evaluate(() => { const s = FSSolent.state(), c = window.__navCourse(); return { type: s.type, first: c && c.marks && c.marks[0] && c.marks[0].name }; });
  ok(w.type === 'wl' && /windward/i.test(w.first || ''), 'Windward-leeward chosen: the practice race is a windward-leeward', w);
  ok(p.errs.length === 0, 'No script errors (windward-leeward)', p.errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
