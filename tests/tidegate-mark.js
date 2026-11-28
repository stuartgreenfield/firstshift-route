/* Stuart 25 Nov 08:04: "when you creates new tide gate position a mark should appear on the chart showing where it was placed with its name
   no name it defaults to gate2 etc, when you go back to it and tap it it gives the information and the ability to clear it or reroute from
   the point". Phone upright, real taps: make two gates (one named, one not), both drawn on the chart with their names; a tap on one opens its
   card (name, tide on arrival, Route from here, Tide gates, Clear gate); Route from here routes from the gate at the route's time there;
   Clear gate asks once more, then the gate goes from the chart and the list. Run: node tests/tidegate-mark.js [base] */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); return c; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const routed = () => p.waitForFunction(() => { const F = window.__navFc && window.__navFc(); const n = (document.getElementById('runNote') || {}).textContent || ''; return F && F.sel && F.sel.path && !F.running && !/Refining|Finer routes coming/.test(n); }, null, { timeout: 600000 });
  await p.goto(BASE + '/channel-area/'); await routed(); await p.waitForTimeout(1000);
  const hide = () => p.evaluate(() => document.querySelectorAll('.sheet, .pop, #tgPop').forEach(e => { e.hidden = true; }));
  await hide();
  const spots = await p.evaluate((spot) => eval(spot)(14), "(n) => { const F = window.__navFc(), R = window.__fsRoutePaths(), cv = document.getElementById('map').getBoundingClientRect();\n  const pts = []; (R.routes || []).forEach(r => r.path.forEach(w => pts.push(window.__fsXY(w.la, w.lo)))); (R.marks || []).forEach(m => pts.push(window.__fsXY(m.lat, m.lon)));\n  const pp = F.sel.path, sel = pp.slice(Math.floor(pp.length * 0.3), Math.floor(pp.length * 0.8)).map(w => window.__fsXY(w.la, w.lo)), all = pp.map(w => window.__fsXY(w.la, w.lo)), out = [];\n  for (let y = Math.max(cv.top + 200, 200); y < Math.min(cv.bottom - 60, innerHeight * 0.7); y += 20) for (let x = cv.left + 50; x < cv.right - 50; x += 20) {\n    if (pts.some(a => Math.hypot(a[0] - x, a[1] - y) < 32)) continue; const dSel = Math.min(...sel.map(a => Math.hypot(a[0] - x, a[1] - y))); if (dSel > 150 || Math.min(...all.map(a => Math.hypot(a[0] - x, a[1] - y))) < dSel - 1) continue;\n    const e = document.elementFromPoint(x, y); if (!e || e.id !== 'map') continue;\n    const q = window.__fsLL(x, y), ll = [q.la, q.lo]; const z = F.P.depth ? F.P.depth.nearest('z', ll[0], ll[1]) : -100; if (!(z < -8)) continue;\n    if (out.some(o => Math.hypot(o.xy[0] - x, o.xy[1] - y) < 50)) continue; out.push({ la: ll[0], lo: ll[1], xy: [x, y], d: dSel }); if (out.length >= n) return out; }\n  return out; }");
  if (!ok(spots.length >= 2, 'open-water spots beside the route', spots.length)) { await b.close(); process.exit(1); }
  const make = async (s, name) => { await p.touchscreen.tap(s.xy[0], s.xy[1]); await p.waitForTimeout(800); await p.evaluate(() => { const d = document.getElementById('tipDots'), a = document.getElementById('tipAct'); if (d && a && a.hidden) d.click(); }); await p.waitForTimeout(250);   /* 28 Nov: the card's actions are in its list (three dots), Stuart's A1 */  const ed = await p.evaluate(() => { const b = document.getElementById('editBar'); if (b && !b.hidden && b.getClientRects().length && window.__fsEditPts() !== null) { document.getElementById('edCancel').click(); return true; } return false; }); const btn = await p.$('#tgPtAdd'); if (ed || !btn || !(await btn.isVisible())) {   /* a tap on the course line starts editing the course: not a gate spot */
      await p.evaluate(() => { document.getElementById('tip').hidden = true; }); return false; } if (name) await p.fill('#tgPtName', name); const bb = await btn.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(800); await hide(); return true; };
  let made = 0, tried = []; for (const sp of spots) { const r = await make(sp, made ? '' : 'Lizard'); tried.push(r); if (r) made++; if (made === 2) break; } console.log('TRIED', JSON.stringify(tried), JSON.stringify(await p.evaluate(() => [window.__fsTgPts(), !!window.__fsTgData(), localStorage.getItem('fs-tidegate') && localStorage.getItem('fs-tidegate').slice(0, 300), Object.keys(localStorage).filter(k => /tg|gate/i.test(k))])));
  const pts = await p.evaluate(() => window.__fsTgPts()); ok(pts.length === 2 && pts[0].name === 'Lizard' && /^GATE \d+$/.test(pts[1].name), 'a named gate keeps its name; one with no name is GATE n', pts.map(q => q.name));
  /* drawn on the chart: the canvas has the gate's teal ring at its spot */
  const drawn = await p.evaluate((pts) => { const cv = document.getElementById('map'), x = cv.getContext('2d'), r = cv.getBoundingClientRect(), k = cv.width / r.width; return pts.map(q => { const a = window.__fsXY(q.lat, q.lon); let hit = 0; for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) { const d = x.getImageData(Math.round((a[0] - r.left + dx) * k), Math.round((a[1] - r.top + dy) * k), 1, 1).data; if (d[0] < 60 && d[1] > 150 && d[2] > 130) hit++; } return hit; }); }, pts);
  ok(drawn.every(n => n > 3), 'both gates are drawn on the chart (teal ring) at their spots', drawn);
  /* tap a gate: its card */
  const g0 = await p.evaluate(() => { const q = window.__fsTgPts()[0]; return window.__fsXY(q.lat, q.lon); });
  await p.touchscreen.tap(g0[0], g0[1]); await p.waitForTimeout(800);
  const card = await p.evaluate(() => { const t = document.getElementById('tip'); return { open: !t.hidden, text: t.innerText.slice(0, 400), route: !!document.getElementById('gcRoute'), del: !!document.getElementById('gcDel'), routeOn: document.getElementById('gcRoute') && !document.getElementById('gcRoute').disabled }; });
  ok(card.open && /Lizard/.test(card.text) && /Arrive|passed|Route first/.test(card.text) && card.route && card.del, 'a tap on the gate opens its card: name, tide on arrival, Route from here, Clear gate', card);
  /* Route from here */
  if (card.routeOn) { await p.tap('#gcRoute'); await p.waitForTimeout(1500); await routed(); await p.waitForTimeout(500);
    const st = await p.evaluate(() => { const F = window.__navFc(), q = F.sel.path[0], g = window.__fsTgPts()[0]; return { d: Math.hypot(q.la - g.lat, (q.lo - g.lon) * Math.cos(g.lat * Math.PI / 180)) * 60 }; });
    ok(st.d < 0.2, 'Route from here: the new route starts at the gate', st); }
  else ok(false, 'Route from here is offered (the route reaches the gate within the forecast)', card);
  /* Clear gate: first tap asks, second clears */
  await hide(); const g1 = await p.evaluate(() => { const q = window.__fsTgPts()[0]; return window.__fsXY(q.lat, q.lon); });
  await p.touchscreen.tap(g1[0], g1[1]); await p.waitForTimeout(800); await p.tap('#gcDel'); await p.waitForTimeout(300);
  const ask = await p.evaluate(() => ({ txt: document.getElementById('gcDel').textContent, n: window.__fsTgPts().length })); ok(/Clear Lizard\?/.test(ask.txt) && ask.n === 2, 'Clear gate asks once more first', ask);
  await p.tap('#gcDel'); await p.waitForTimeout(500);
  const left = await p.evaluate(() => ({ n: window.__fsTgPts().length, names: window.__fsTgPts().map(q => q.name), open: !document.getElementById('tip').hidden })); ok(left.n === 1 && !left.names.includes('Lizard') && !left.open, 'the second tap clears it from the list (and so the chart)', left);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/abeaea36-9130-5b0e-8b05-be1641b6b08c/scratchpad/gate-mark.png' });
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
