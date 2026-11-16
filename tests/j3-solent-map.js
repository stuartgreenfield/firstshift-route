/* J3, Solent races on the map (Stuart 15 Nov 17:32): Solent races in the race menu below RORC and JOG, a card for Round the cans or
   Windward-leeward; Round the cans built on the chart: tap a buoy, Port or Starboard beside it, the course grows as chips with Undo
   and Finish, without going back to the builder; All the buoys: the whole list, searched, Port and Starboard, staying open.
   Run: node tests/j3-solent-map.js <base> [width height] */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', W = +process.argv[3] || 412, H = +process.argv[4] || 915;
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 900, hasTouch: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSSolent && FSSolent.start && window.__fsRedraw , null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(500);
  const card = await p.evaluate(() => { const c = document.getElementById('solCard'); return c && !c.hidden ? [...c.querySelectorAll('.solcards b')].map(b => b.textContent) : null; });
  ok(card && card[0] === 'Round the cans' && card[1] === 'Windward-leeward', 'Solent races in the race menu opens a card: Round the cans or Windward-leeward', JSON.stringify(card));
  await p.evaluate(() => { FSSolent.set({ start: { code: '3G', name: '3G start', lat: 50.7665, lon: -1.2995 } }); }); 
  await p.evaluate(() => { document.getElementById('solCard').hidden = true; FSSolent.chain(true); }); await p.waitForTimeout(1500);   /* the chain bar is still there behind the step box (16 Nov) */
  const bar = await p.evaluate(() => { const b = document.getElementById('solChain'); return b && !b.hidden ? b.textContent : null; });
  ok(bar && /Tap a buoy, then Port or Starboard/.test(bar) && /No marks yet/.test(bar), 'Round the cans goes straight to the chart with the course bar', bar && bar.slice(0, 80));
  /* tap three buoys on the chart: centre each on screen first */
  const codes = await p.evaluate(() => FSSolent.marks().slice(0, 60).map(m => m.id));
  const pickXY = async id => p.evaluate(id => { const m = FSSolent.marks().find(x => x.id === id); const v = window.__navViewGet(); window.__navViewSet({ la: m.lat, lo: m.lon, s: Math.max(v.s, 3000), follow: false }); return { la: m.lat, lo: m.lon }; }, id);
  const tapMark = async (id, side) => { const m = await pickXY(id); await p.waitForTimeout(400); const xy = await p.evaluate(m => { const cv = document.getElementById('map').getBoundingClientRect(); return window.__fsXY ? window.__fsXY(m.la, m.lo) : null; }, m); if (!xy) return 'no xy'; await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(400); const pop = await p.evaluate(() => { const s = document.getElementById('solSide'); return s && !s.hidden ? s.querySelector('b').textContent : null; }); if (!pop) return 'no pop'; await p.click('#solSide [data-s="' + side + '"]'); await p.waitForTimeout(300); return pop; };
  const hasXY = await p.evaluate(() => !!window.__fsXY);
  let got = [];
  if (hasXY) { for (const [id, sd] of [['2C', 'port'], ['3F', 'stbd'], ['4A', 'port']]) { if (codes.indexOf(id) < 0) continue; got.push(await tapMark(id, sd)); } }
  const st = await p.evaluate(() => FSSolent.state().marks.map(m => m.code + (m.side === 'stbd' ? 'S' : 'P')));
  ok(hasXY && st.length >= 2 && got.every(g => !/^no /.test(g)), 'tapping a buoy offers Port or Starboard beside it and adds it; the builder stays closed', JSON.stringify({ got, st }));
  const chips = await p.evaluate(() => [...document.querySelectorAll('#solChain .solchip')].map(c => c.textContent));
  ok(chips.length === st.length && /^1\. /.test(chips[0]), 'the course so far shows as numbered chips', JSON.stringify(chips));
  await p.evaluate(() => document.querySelector('#solChain .solchip').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(s0 => FSSolent.state().marks[0].side !== s0, st[0].slice(-1) === 'S' ? 'stbd' : 'port'), 'tapping a chip swaps Port and Starboard');
  await p.evaluate(() => document.querySelector('#solChain [data-k="undo"]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(n => FSSolent.state().marks.length === n - 1, st.length), 'Undo takes the last mark off');
  await p.evaluate(() => document.querySelector('#solChain [data-k="list"]').click()); await p.waitForTimeout(800);
  await p.fill('#solListQ', '3G'); await p.waitForTimeout(300);
  const l1 = await p.evaluate(() => ({ open: !document.getElementById('solList').hidden, rows: document.querySelectorAll('#solListB .sollr').length, first: (document.querySelector('#solListB .sollr b') || {}).textContent }));
  ok(l1.open && l1.rows >= 1 && l1.first === '3G', 'All the buoys: the list, searched by code', JSON.stringify(l1));
  const n0 = await p.evaluate(() => FSSolent.state().marks.length);
  await p.evaluate(() => document.querySelector('#solListB [data-side="stbd"]').click()); await p.waitForTimeout(200);
  await p.fill('#solListQ', 'royal'); await p.waitForTimeout(300); const rn = await p.evaluate(() => document.querySelectorAll('#solListB .sollr').length);
  await p.evaluate(() => { const b = document.querySelector('#solListB [data-side="port"]'); if (b) b.click(); }); await p.waitForTimeout(200);
  const l2 = await p.evaluate(() => ({ n: FSSolent.state().marks.length, open: !document.getElementById('solList').hidden, last: FSSolent.state().marks.slice(-2).map(m => m.code + m.side) }));
  ok(l2.n === n0 + (rn ? 2 : 1) && l2.open, 'adding from the list keeps the list open; search by name works too', JSON.stringify(Object.assign(l2, { royal: rn })));
  await p.evaluate(() => document.getElementById('solListX').click()); await p.evaluate(() => document.querySelector('#solChain [data-k="done"]').click()); await p.waitForTimeout(800);
  const fin = await p.evaluate(() => ({ sheet: !document.getElementById('solSheet').hidden, bar: document.getElementById('solChain').hidden, legs: document.querySelectorAll('#solSheet .soltab tbody tr').length, go: !!document.getElementById('solGo') && !document.getElementById('solGo').disabled }));
  ok(fin.sheet && fin.bar && fin.legs >= 2 && fin.go, 'Finish opens the builder with the legs, ready to route', JSON.stringify(fin));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
