/* Stuart 24 Nov 14:25 to 15:24: tide gate at any point. On the Channel area page with the default race routed:
   1. the tap box offers 'Tide gate here' with a name on water on the route; refuses on land and inside a TSS;
   2. adding a point (no name) saves it as GATE 1, in course order among the marks, ETA the route's own time at its nearest point;
   3. a typed name is kept; the tide is taken at the point; Fleet boats are compared there (same TCC level);
   4. rename and remove work; the list is saved with the race (survives a reload).
   Run: node tests/tidegate-point.js <base> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/channel-area/');
  const ready = () => p.waitForFunction(() => document.querySelectorAll('#finBox .fin').length && document.getElementById('prog').hidden && !/Refining|coming/.test(document.getElementById('runNote').textContent) && window.__fsTgData && window.__fsTgData(), null, { timeout: 600000 });
  await ready();
  /* a point on the route a third of the way along, nudged 0.3 nm sideways */
  const P0 = await p.evaluate(() => { const d = window.__fsTgData(), i = Math.floor(d.path.length / 3), q = d.path[i]; return { lat: q.la + 0.005, lon: q.lo, i, n: d.path.length }; });
  const tap = (la, lo, z) => p.evaluate(([la, lo, z]) => { const body = document.createElement('div'); document.body.appendChild(body); window.__fsTipGate(body, la, lo, { z, nogo: 3 }); const t = body.innerText; return { t, btn: !!body.querySelector('#tgPtAdd') }; }, [la, lo, z]);
  let t = await tap(P0.lat, P0.lon, -40); ok(t.btn, 'Tap box on open water offers Tide gate here', t.t.slice(0, 60));
  await p.evaluate(() => document.querySelectorAll('.tgtap').forEach(x => x.parentNode.remove()));
  t = await tap(P0.lat, P0.lon, 5); ok(!t.btn && /land/.test(t.t), 'On land: refused, says why', t.t);
  await p.evaluate(() => document.querySelectorAll('.tgtap').forEach(x => x.parentNode.remove()));
  t = await tap(P0.lat, P0.lon, -1.5); ok(!t.btn && /shallower/.test(t.t), 'Shallower than the no-go depth: refused', t.t);
  await p.evaluate(() => document.querySelectorAll('.tgtap').forEach(x => x.parentNode.remove()));
  const tss = await p.evaluate(() => { const z = (window.__fsZones ? window.__fsZones() : []).find(q => q.kind === 'lane' || q.kind === 'zone'); if (!z) return null; const la = z.poly.reduce((s, q) => s + q[0], 0) / z.poly.length, lo = z.poly.reduce((s, q) => s + q[1], 0) / z.poly.length; return { la, lo, name: z.name }; });
  if (tss) { t = await tap(tss.la, tss.lo, -60); ok(!t.btn && /traffic separation/.test(t.t), 'Inside a TSS: refused', { zone: tss.name, t: t.t }); await p.evaluate(() => document.querySelectorAll('.tgtap').forEach(x => x.parentNode.remove())); }
  else ok(false, 'TSS zones loaded');
  /* add with no name */
  await tap(P0.lat, P0.lon, -40); await p.click('#tgPtAdd');
  await p.waitForTimeout(500);
  const G = await p.evaluate(() => { const d = window.__fsTgData(), pop = document.getElementById('tgPop'), cards = [...pop.querySelectorAll('.tgmk,.tgfold')].map(e => (e.querySelector('.tgt1 b') || e).innerText.replace(/\s+/g, ' ').trim());
    const pc = pop.querySelector('.tgmk.tgpt'), fold = [...pop.querySelectorAll('.tgfold')].find(f => /◎/.test(f.innerText)); return { cards, open: !pop.hidden, card: pc ? pc.innerText.slice(0, 300) : null, fold: fold ? fold.innerText : null, nan: /NaN|undefined|Infinity/.test(pop.innerText) }; });
  ok(G.open && !G.nan, 'Window opens with the new gate, no NaN');
  ok(G.cards.some(x => /GATE 1/.test(x)), 'No name typed: called GATE 1', G.cards);
  /* course order: the point's ETA lies between the marks either side of it */
  const O = await p.evaluate(() => { const d = window.__fsTgData(); const L = JSON.parse(localStorage.getItem('fs-tidegate')); const k = Object.keys(L.pts)[0]; const q = L.pts[k][0];
    let bi = 0, bd = 1e9; d.path.forEach((r, i) => { const dd = Math.hypot((r.la - q.lat) * 60, (r.lo - q.lon) * 60 * Math.cos(q.lat * Math.PI / 180)); if (dd < bd) { bd = dd; bi = i; } });
    const hm = ms => { const x = new Date(ms); return ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2); };
    return { eta: hm(d.T0 * 1000 + d.ts[bi] * 3600000), leg: d.path[bi].leg || 0, legs: d.legs.map(m => m.name), off: bd }; });
  const all = await p.evaluate(() => [...document.querySelectorAll('#tgPop .tgmk,#tgPop .tgfold')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 80)));
  const gi = all.findIndex(x => /GATE 1/.test(x)), legName = O.legs[O.leg].split(',')[0];
  const mi = all.findIndex(x => x.indexOf(legName) >= 0);
  ok(gi >= 0 && (mi < 0 || gi < mi), 'In course order: before the mark at the end of its leg', { gate: gi, mark: mi, legName });
  ok(all[gi] && all[gi].indexOf(O.eta) >= 0, 'ETA is the route\'s own time at its nearest point', { shown: all[gi], route: O.eta });
  /* a typed name, and Fleet boats */
  const P1 = await p.evaluate(() => { const d = window.__fsTgData(), i = Math.floor(d.path.length * 0.6), q = d.path[i]; return { lat: q.la, lon: q.lo }; });
  await p.evaluate(() => window.FSTideGate.open(false));
  await tap(P1.lat, P1.lon, -40); await p.fill('#tgPtName', 'Portland Bill'); await p.click('#tgPtAdd'); await p.waitForTimeout(400);
  const names = await p.evaluate(() => [...document.querySelectorAll('#tgPop .tgmk,#tgPop .tgfold')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 60)));
  ok(names.some(x => /Portland Bill/.test(x)), 'A typed name is kept', names.filter(x => /◎|GATE|Portland/.test(x)));
  await p.evaluate(() => window.FSTideGate.open(false));
  const tcc = await p.evaluate(() => window.__fsTgData().tcc); await p.evaluate(t => window.__fsFleetAdd('Same TCC', t), tcc);
  await p.waitForFunction(() => window.__fsTgData().ghosts.length >= 1, null, { timeout: 180000 });
  /* make GATE 1 the first card so its rival table shows: open, then read the table of the first point card */
  const R = await p.evaluate(() => { window.FSTideGate.open(true); const pop = document.getElementById('tgPop'), f = [...pop.querySelectorAll('.tgfold')].find(x => /GATE 1/.test(x.innerText)); if (f) f.click(); const c2 = [...pop.querySelectorAll('.tgmk.tgpt')].find(x => /GATE 1/.test(x.innerText)); return { card: !!c2, chart: !!(c2 && c2.querySelector('.tgsv')), lbl: c2 ? (c2.querySelector('.tgsv').textContent.match(/[A-E]( [A-E])*/) || [''])[0] : '' }; });
  ok(R.card && R.chart, 'The point has its own chart of tide bands', R);
  const same = await p.evaluate(() => { const d = window.__fsTgData(), L = JSON.parse(localStorage.getItem('fs-tidegate')), q = L.pts[Object.keys(L.pts)[0]][0]; let bi = 0, bd = 1e9; d.path.forEach((r, i) => { const dd = Math.hypot(r.la - q.lat, r.lo - q.lon); if (dd < bd) { bd = dd; bi = i; } }); const g = d.ghosts[0], s0 = d.start ? d.start.t : d.ts[0]; return ((g.ts[bi] - g.ts[0]) * g.tcc - (d.ts[bi] - s0) * d.tcc) * 60; });
  ok(Math.abs(same) <= 2, 'A Fleet boat at our TCC is level with us at the point on corrected time', +same.toFixed(2));
  /* rename, remove */
  await p.evaluate(() => { const c2 = [...document.querySelectorAll('#tgPop .tgmk.tgpt')].find(x => /GATE 1/.test(x.innerText)); c2.querySelector('.tgren').click(); const i = c2.querySelector('.tgrin'); i.value = 'Anvil Point'; c2.querySelector('.tgrok').click(); });
  let L2 = await p.evaluate(() => { const L = JSON.parse(localStorage.getItem('fs-tidegate')); return L.pts[Object.keys(L.pts)[0]].map(q => q.name); });
  ok(L2.includes('Anvil Point') && !L2.includes('GATE 1'), 'Rename saves', L2);
  await p.reload(); await ready(); await p.waitForTimeout(1500);
  const kept = await p.evaluate(() => { window.FSTideGate.open(true); return [...document.querySelectorAll('#tgPop .tgmk,#tgPop .tgfold')].map(e => e.innerText).join(' | '); });
  ok(/Anvil Point/.test(kept) && /Portland Bill/.test(kept), 'Both gates are still there after a reload (saved with the race)');
  await p.evaluate(() => { const pop = document.getElementById('tgPop'); [...pop.querySelectorAll('.tgfold')].forEach(f => f.click()); const c2 = [...pop.querySelectorAll('.tgmk.tgpt')].find(x => /Portland Bill/.test(x.innerText)); c2.querySelector('.tgdel').click(); });
  L2 = await p.evaluate(() => { const L = JSON.parse(localStorage.getItem('fs-tidegate')); return L.pts[Object.keys(L.pts)[0]].map(q => q.name); });
  ok(L2.length === 1 && L2[0] === 'Anvil Point', 'Remove deletes just that gate', L2);
  if (process.env.SHOT) { await p.evaluate(() => { const pop = document.getElementById('tgPop'); [...pop.querySelectorAll('.tgfold')].forEach(f => f.click()); const c2 = pop.querySelector('.tgmk.tgpt'); if (c2) c2.scrollIntoView(); }); await p.waitForTimeout(300); await (await p.$('#tgPop')).screenshot({ path: process.env.SHOT }); }
  ok(!errs.length, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
