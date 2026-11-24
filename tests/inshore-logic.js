/* Stuart 24 Nov 12:14: "run a test inshore race both windward leeward and round the cans ... on every product to ensure 1. it works
   2. the logic is sound". On Mark (8779/mark/) or Mark+ (8778/mark/): a windward-leeward (3G start, windward 1.2 nm at 250°T, two laps,
   leeward gate 3G and 3E, finish at the leeward gate) and a round-the-cans course from the course board (3G p, 4F s, 2B p, finish on the
   start line), each routed. Checks as tests/races-logic.js: marks in order to the finish, times forwards, believable speed, the tide
   gates window with every mark left, its ETA the route's own, three Fleet boats round our TCC in rating order and the one at our TCC
   level on corrected time. Run: node tests/inshore-logic.js <base> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && window.FSSolent.build && window.__fsUseCourse && window.__navFc && window.__navFc().P, null, { timeout: 400000 }); await p.waitForTimeout(2000);
  const courses = [
    ['Windward-leeward', () => { const M = id => FSSolent.marks().find(x => x.id === id), st = M('3G'); FSSolent.set({ type: 'wl', start: { code: '3G', name: '3G ' + st.name, lat: st.lat, lon: st.lon }, wl: { wkind: 'brg', brg: 250, dist: 1.2, laps: 2, lkind: 'gate', lcode: '3G', lcode2: '3E', side: 'port', fin: 'lee' } }); }],
    ['Round the cans', () => { const M = id => FSSolent.marks().find(x => x.id === id), st = M('3G'), k = (id, side) => { const m = M(id); return { code: m.id, name: m.id + ' ' + m.name, lat: m.lat, lon: m.lon, side }; }; FSSolent.set({ type: 'marks', start: { code: '3G', name: '3G ' + st.name, lat: st.lat, lon: st.lon }, marks: [k('4F', 'port'), k('2B', 'starboard'), k('3E', 'port')], fin: 'start' }); }]
  ];
  for (const [name, set] of courses) {
    const r0 = await p.evaluate(async (src) => { await FSSolent.load(); eval('(' + src + ')')(); const cse = FSSolent.build(); if (cse.err) return { err: cse.err }; document.querySelectorAll('.sheet').forEach(s => s.hidden = true); window.__fsUseCourse(cse); return { marks: cse.marks.length }; }, set.toString());
    ok(!r0.err, name + ': the course builds', r0);
    if (r0.err) continue;
    await p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent) && window.__fsTgData && window.__fsTgData(), null, { timeout: 400000 }).catch(() => {});
    const L = await p.evaluate(() => { const d = window.__fsTgData(); if (!d) return null; const p = d.path, ts = d.ts, n = p.length, legs = d.legs, fin = legs[legs.length - 1];
      let order = true, back = true; for (let i = 1; i < n; i++) { if ((p[i].leg || 0) < (p[i - 1].leg || 0)) order = false; if (ts[i] < ts[i - 1] - 1e-9) back = false; }
      const R = Math.PI / 180, dist = (a, b) => { const dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return Math.hypot(dx, dy); };
      const o = d.from || d.start, pts = [o].concat(legs); let nm = 0; for (let i = 1; i < pts.length; i++) nm += dist(pts[i - 1], pts[i]);
      const hrs = ts[n - 1] - ts[0]; return { legs: legs.length, names: legs.map(l => l.name), lastLeg: p[n - 1].leg || 0, order, back, nm: +nm.toFixed(2), hrs: +hrs.toFixed(2), avg: +(nm / hrs).toFixed(2), endNm: +dist({ lat: p[n - 1].la, lon: p[n - 1].lo }, fin).toFixed(2), tcc: d.tcc }; });
    ok(!!L, name + ': routes', L && L.names);
    if (!L) continue;
    ok(L.order && L.lastLeg === L.legs - 1, name + ': rounds the marks in order and reaches the last leg', { lastLeg: L.lastLeg, legs: L.legs });
    ok(L.back, name + ': times only go forwards');
    ok(L.endNm < 0.3, name + ': ends at the finish (under 0.3 nm)', L.endNm);
    ok(L.avg >= 1 && L.avg <= 15, name + ': average speed over the rhumb-line course is believable (1 to 15 kn)', { nm: L.nm, hours: L.hrs, avg: L.avg });
    await p.evaluate(t => { [['Faster boat', +(t * 1.1).toFixed(3)], ['Same TCC', t], ['Slower boat', +(t * 0.9).toFixed(3)]].forEach(a => window.__fsFleetAdd(a[0], a[1])); }, L.tcc);
    await p.waitForFunction(() => { const d = window.__fsTgData(); return d && d.ghosts.length >= 3; }, null, { timeout: 180000 }).catch(() => {});
    const G = await p.evaluate(() => { window.FSTideGate.open(true); const d = window.__fsTgData(), pop = document.getElementById('tgPop'), txt = pop.innerText, g = n => d.ghosts.find(x => x.name === n);
      let i1 = d.path.length - 1; for (let i = 1; i < d.path.length; i++) if ((d.path[i].leg || 0) > (d.path[i - 1].leg || 0)) { i1 = i; break; }
      const s0 = d.start ? d.start.t : d.ts[0], cor = (b, i) => b ? ((b.ts[i] - b.ts[0]) * b.tcc - (d.ts[i] - s0) * d.tcc) * 60 : null, F = g('Faster boat'), S = g('Same TCC'), W = g('Slower boat');
      const hm = ms => { const x = new Date(ms); return ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2); };
      const now = (Date.now() / 1000 - d.T0) / 3600; let k = 0; while (k < d.path.length - 1 && d.ts[k + 1] <= now) k++; const cur = d.path[k].leg || 0;
      let ri = d.path.length - 1; for (let i = 1; i < d.path.length; i++) if ((d.path[i].leg || 0) > cur && (d.path[i - 1].leg || 0) <= cur) { ri = i; break; }
      return { nan: /NaN|undefined|Infinity/.test(txt), chart: !!pop.querySelector('.tgmk.next .tgsv'), marks: pop.querySelectorAll('.tgmk').length + pop.querySelectorAll('.tgfold').length, left: d.legs.length - cur, etaShown: (pop.querySelector('.tgmk.next .tgt1 span') || {}).textContent || '', etaRoute: hm(d.T0 * 1000 + d.ts[ri] * 3600000),
        ghosts: d.ghosts.length, fT: F && F.ts[i1], sT: S && S.ts[i1], wT: W && W.ts[i1], same: cor(S, i1), rows: pop.querySelectorAll('.tgt tr').length - 1 }; });
    ok(!G.nan && G.chart, name + ': tide gates window opens with a chart and no NaN');
    ok(G.marks === G.left, name + ': tide gates list every mark left', { shown: G.marks, left: G.left });
    ok(G.etaShown.indexOf(G.etaRoute) >= 0, name + ': next mark ETA is the route\'s own time', { shown: G.etaShown, route: G.etaRoute });
    ok(G.ghosts >= 3, name + ': three Fleet boats sailed along the route', G.ghosts);
    if (G.ghosts >= 3) { ok(G.fT <= G.sT + 1e-6 && G.sT <= G.wT + 1e-6, name + ': faster rating reaches the first mark first', { f: G.fT, s: G.sT, w: G.wT }); ok(Math.abs(G.same) <= 1, name + ': a boat at our TCC is level on corrected time at the first mark (within 1 min)', +(+G.same).toFixed(2)); ok(G.rows >= 3, name + ': rivals table lists them', G.rows); }
    const shot = process.env.SHOT; if (shot) { const pop = await p.$('#tgPop'); if (pop) await pop.screenshot({ path: shot + '-' + name.replace(/\W+/g, '') + '.png' }); }
    await p.evaluate(() => window.FSTideGate.open(false));
  }
  ok(!errs.length, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
