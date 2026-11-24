/* Stuart 24 Nov 12:14: "run a test ... every rorc and jog race on every product to ensure 1. it works 2. the logic is sound".
   Every race in the race menus, opened the way the crew does (menu, Open). Where it routes:
   1. it works: routes, the tide gates window opens with every mark left in the race, no NaN, no script errors;
   2. the logic: the route rounds the marks in order and ends at the finish; times only go forwards; the average speed over the
      rhumb-line course is believable (1 to 20 kn); each mark's ETA in the tide gates is the route's own time there; three Fleet
      boats at our TCC x 1.1, x 1.0 and x 0.9 reach the first mark fastest first, the one at our TCC level with us on corrected time
      (within 2 min), and every gap is finite.
   Where it does not route it must say plainly why (as races-sweep.js). Run: node tests/races-logic.js <base> [page] (ONLY=regex) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || 'channel-area';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const HONEST = /set on the day|beyond the forecasts|outside the forecast|Cannot route|forecasts end before|not published|Choose an earlier start|Route keeps your start/i;
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(p.url().replace(BASE, '') + ': ' + e.message)); await p.goto(BASE + '/' + PAGE + '/');
  const ready = () => p.waitForFunction(() => window.__navFc && window.__navFc().P && document.getElementById('raceMenu'), null, { timeout: 400000 });
  const st = () => p.evaluate(() => ({ url: location.pathname + location.search, name: (window.__fsCourseFull && (window.__fsCourseFull() || {}).name) || '', note: ((document.getElementById('runNote') || {}).textContent || '').slice(0, 160), fins: document.querySelectorAll('#finBox .fin').length, prog: !document.getElementById('prog').hidden, busy: (document.getElementById('busy') || {}).textContent || '' }));
  const settle = async (maxS) => { let s; for (let i = 0; i < maxS / 3; i++) { await p.waitForTimeout(3000); s = await st().catch(() => null); if (!s) continue; if ((s.fins && !s.prog && !/Refining|coming/.test(s.note)) || HONEST.test(s.note + ' ' + s.busy)) return s; } return s; };
  await ready(); await settle(240);
  const races = await p.evaluate(() => { const out = []; ['rmRorc', 'rmJog', 'rmOther'].forEach(id => { const bt = document.getElementById(id); if (!bt) return; bt.click(); [].forEach.call(document.querySelectorAll('#raceList [data-race]'), x => { if (!out.some(o => o.id === x.dataset.race)) out.push({ id: x.dataset.race, menu: id, name: (x.closest('.ritem') && x.closest('.ritem').querySelector('b') || x).textContent.trim().slice(0, 50) }); }); }); return out; });
  console.log('races', races.length, races.map(r => r.name).join(' | '));
  let prevNote = null, routed = 0;
  for (const r of races) {
    if (process.env.ONLY && !new RegExp(process.env.ONLY, 'i').test(r.name)) continue;
    const before = p.url();
    await p.evaluate(r => { document.getElementById(r.menu).click(); const x = document.querySelector('#raceList [data-race="' + r.id + '"]'); x && x.click(); }, r);
    await p.waitForTimeout(2500); if (p.url() !== before) await ready().catch(() => {});
    const s = await settle(420);
    const stale = !!s && s.fins > 0 && prevNote && s.note === prevNote; if (s) prevNote = s.note;
    const routes = !!s && !stale && s.fins > 0 && !s.prog, honest = !!s && HONEST.test(s.note + ' ' + s.busy);
    ok(routes || honest, r.name + ': routes, or says plainly why not', s && { fins: s.fins, note: (s.note || s.busy).slice(0, 100) });
    if (!routes) continue; routed++;
    /* 2. the logic of the route itself */
    const L = await p.evaluate(() => { const d = window.__fsTgData(); if (!d) return null; const p = d.path, ts = d.ts, n = p.length, legs = d.legs, fin = legs[legs.length - 1];
      let order = true, back = true; for (let i = 1; i < n; i++) { if ((p[i].leg || 0) < (p[i - 1].leg || 0)) order = false; if (ts[i] < ts[i - 1] - 1e-9) back = false; }
      const R = Math.PI / 180, dist = (a, b) => { const dy = (b.lat - a.lat) * 60, dx = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * R); return Math.hypot(dx, dy); };
      const o = d.from || d.start, pts = [o].concat(legs); let nm = 0; for (let i = 1; i < pts.length; i++) nm += dist(pts[i - 1], pts[i]);
      const hrs = ts[n - 1] - ts[0], endNm = dist({ lat: p[n - 1].la, lon: p[n - 1].lo }, fin), lastLeg = p[n - 1].leg || 0;
      return { legs: legs.length, lastLeg, order, back, nm: +nm.toFixed(1), hrs: +hrs.toFixed(2), avg: +(nm / hrs).toFixed(2), endNm: +endNm.toFixed(2), tcc: d.tcc };
    });
    if (!L) { ok(false, r.name + ': route data for the tide gates'); continue; }
    ok(L.order && L.lastLeg === L.legs - 1, r.name + ': rounds the marks in order and reaches the last leg', { lastLeg: L.lastLeg, legs: L.legs });
    ok(L.back, r.name + ': times only go forwards along the route');
    ok(L.endNm < 1.5, r.name + ': the route ends at the finish (under 1.5 nm away)', L.endNm);
    ok(L.avg >= 1 && L.avg <= 20, r.name + ': average speed over the rhumb-line course is believable (1 to 20 kn)', { nm: L.nm, hours: L.hrs, avg: L.avg });
    /* three Fleet boats round our TCC */
    await p.evaluate(t => { [['Faster boat', +(t * 1.1).toFixed(3)], ['Same TCC', t], ['Slower boat', +(t * 0.9).toFixed(3)]].forEach(a => window.__fsFleetAdd(a[0], a[1])); }, L.tcc);
    await p.waitForFunction(() => { const d = window.__fsTgData(); return d && d.ghosts.length >= 3; }, null, { timeout: 180000 }).catch(() => {});
    const G = await p.evaluate(() => { window.FSTideGate.open(true); const d = window.__fsTgData(), pop = document.getElementById('tgPop'), txt = pop.innerText;
      const g = n => d.ghosts.find(x => x.name === n); const i1 = (() => { for (let i = 1; i < d.path.length; i++) if ((d.path[i].leg || 0) > (d.path[i - 1].leg || 0)) return i; return d.path.length - 1; })();
      const s0 = d.start ? d.start.t : d.ts[0], cor = (b, i) => b ? ((b.ts[i] - b.ts[0]) * b.tcc - (d.ts[i] - s0) * d.tcc) * 60 : null;
      const F = g('Faster boat'), S = g('Same TCC'), W = g('Slower boat');
      const marks = pop.querySelectorAll('.tgmk').length + pop.querySelectorAll('.tgfold').length;
      const etaShown = (pop.querySelector('.tgmk.next .tgt1 span') || {}).textContent || '';
      const hm = ms => { const x = new Date(ms); return ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2); };
      const now = (Date.now() / 1000 - d.T0) / 3600; let k = 0; while (k < d.path.length - 1 && d.ts[k + 1] <= now) k++; const cur = d.path[k].leg || 0;
      let ri = d.path.length - 1; for (let i = 1; i < d.path.length; i++) if ((d.path[i].leg || 0) > cur && (d.path[i - 1].leg || 0) <= cur) { ri = i; break; }
      return { nan: /NaN|undefined|Infinity/.test(txt), marks, left: d.legs.length - cur, etaShown, etaRoute: hm(d.T0 * 1000 + d.ts[ri] * 3600000), ghosts: d.ghosts.length,
        fT: F && F.ts[i1], sT: S && S.ts[i1], wT: W && W.ts[i1], same: cor(S, i1), fin: [F, S, W].every(b => !b || b.ts.every(isFinite)), rows: pop.querySelectorAll('.tgt tr').length - 1, chart: !!pop.querySelector('.tgmk.next .tgsv') };
    });
    ok(!G.nan && G.chart, r.name + ': tide gates window opens with a chart and no NaN');
    ok(G.marks === G.left, r.name + ': tide gates list every mark left in the race', { shown: G.marks, left: G.left });
    ok(G.etaShown.indexOf(G.etaRoute) >= 0, r.name + ': next mark ETA in the tide gates is the route\'s own time', { shown: G.etaShown, route: G.etaRoute });
    ok(G.ghosts >= 3 && G.fin, r.name + ': three Fleet boats sailed along the route, all times finite', { ghosts: G.ghosts });
    if (G.ghosts >= 3) {
      ok(G.fT <= G.sT + 1e-6 && G.sT <= G.wT + 1e-6, r.name + ': faster rating reaches the first mark first', { faster: G.fT, same: G.sT, slower: G.wT });
      ok(Math.abs(G.same) <= 2, r.name + ': a boat at our TCC is level with us on corrected time at the first mark (within 2 min)', +(+G.same).toFixed(2));
      ok(G.rows >= 3, r.name + ': rivals table lists them', G.rows);
    }
    await p.evaluate(() => window.FSTideGate.open(false));
  }
  ok(routed > 0, 'At least one race routed', routed);
  ok(!errs.length, 'No script errors anywhere', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
