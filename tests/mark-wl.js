/* Mark (Stuart 17 Nov 05:49, 06:14, 06:30): Mark is Route with the Solent races. Windward-leeward in his order: tap a buoy (or choose it
   from the list of buoys), tap a point anywhere for the leeward mark, then the start line: tap the ends, square to the wind with a length
   in metres, lat and long, or ping. The bias shows at once without GPS; tap it and the chart zooms into the line and draws the bias.
   Symbols: committee boat and a yellow buoy with a flag for the line, a target for a point, a halo on a picked buoy.
   Offshore parts are off: no RORC or JOG race list, no entry list.
   Run: node tests/mark-wl.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardW'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  /* offshore off */
  const off = await p.evaluate(() => { const r = document.getElementById('raceSel'); return { raceRowShown: !!(r && r.closest('.row').getClientRects().length), fleet: (window.__navFc() && 1) }; });
  ok(!off.raceRowShown, 'Offshore off: no RORC or JOG race list in Mark');
  const step = () => p.evaluate(() => { const b = document.getElementById('solStep'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : ''; });
  await p.click('#solCardW'); await p.waitForTimeout(500);
  /* step 1: route or not, and the wind */
  await p.fill('#solTwd', '230'); await p.dispatchEvent('#solTwd', 'change'); await p.waitForTimeout(300);
  await p.click('#solStep [data-k=next]'); await p.waitForTimeout(400);
  let t = await step(); ok(/Tap the windward buoy/.test(t), 'Step 2 asks for the windward buoy first (his order)', t.slice(0, 90));
  /* the list of buoys: choose 3F */
  await p.click('#solStep [data-k=list]'); await p.waitForTimeout(400); await p.fill('#solListQ', '3F'); await p.waitForTimeout(300);
  const lst = await p.evaluate(() => document.getElementById('solListN').textContent); ok(/Choose one for: the windward mark/.test(lst), 'The list of buoys offers Choose for the step in hand', lst);
  await p.click('#solListB [data-one="3F"]'); await p.waitForTimeout(400);
  t = await step(); ok(/Windward: 3F/.test(t), 'Choose sets the windward buoy and closes the list', t.slice(0, 120));
  await p.click('#solStep [data-k=next]'); await p.waitForTimeout(300);
  /* leeward: a point anywhere */
  t = await step(); ok(/leeward mark/i.test(t) && /A point/.test(t), 'Step 3: the leeward mark, a point anywhere by default', t.slice(0, 120));
  let xy = await p.evaluate(() => { const mk = FSSolent.marks(); for (let la = 50.70; la < 50.84; la += 0.002) for (let lo = -1.45; lo < -1.10; lo += 0.003) { const q = window.__fsXY(la, lo); if (q[1] < 90 || q[1] > 620 || q[0] < 10 || q[0] > 380) continue; const el = document.elementFromPoint(q[0], q[1]); if (!el || el.id !== "map" && el.tagName !== "CANVAS") continue; if (window.__fsOnLand(la, lo)) continue; if (mk.every(m => { const r = window.__fsXY(m.lat, m.lon); return Math.hypot(r[0] - q[0], r[1] - q[1]) > 30; })) return q; } return null; }); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(400);
  t = await step(); ok(/Leeward: Leeward mark/.test(t), 'a tap on the chart sets the leeward point', t.slice(0, 120));
  await p.click('#solStep [data-k=next]'); await p.waitForTimeout(300);
  /* start line: square to the wind */
  t = await step(); ok(/Boat, direction, length/.test(t) && /Lat and long/.test(t) && /Ping/.test(t) && /Tap the ends/.test(t), 'Step 4: the start line, with Tap the ends, Boat, direction, length, Lat and long, Ping', t.slice(0, 160));
  await p.click('#solStep [data-k=lm][data-v=square]'); await p.waitForTimeout(300); await p.fill('#solLen', '400'); await p.dispatchEvent('#solLen', 'change'); await p.waitForTimeout(300);
  xy = await p.evaluate(() => { for (let k = 0; k < 400; k++) { const la = 50.7605 + (k % 20 - 10) * 0.001, lo = -1.2925 + (Math.floor(k / 20) - 10) * 0.0015, q = window.__fsXY(la, lo), el = document.elementFromPoint(q[0], q[1]); if (el && el.id === 'map') return q; } return window.__fsXY(50.7605, -1.2925); }); await p.mouse.click(xy[0], xy[1]);   /* a free spot on the chart near the course: since 18 Nov the builder closes in on the chart */ await p.waitForTimeout(500);
  const L2 = await p.evaluate(() => { const R = Math.PI / 180, l = window.__fsLine(), k = Math.cos(l.boat[0] * R), dx = (l.pin[1] - l.boat[1]) * k * 60, dy = (l.pin[0] - l.boat[0]) * 60; return { m: Math.round(Math.hypot(dx, dy) * 1852), brg: Math.round((Math.atan2(dx, dy) / R + 360) % 360) }; });
  ok(Math.abs(L2.m - 400) <= 3 && Math.abs(L2.brg - 140) <= 1, 'Boat, direction, length: the pin 400 m to port, at 140° from wind 230°', JSON.stringify(L2));
  t = await step(); ok(/Bias · tap to see it/i.test(t) && /(favoured by \d+ m|no bias)/.test(t), 'The bias shows at once, with no GPS', t.slice(t.indexOf('Bias'), t.indexOf('Bias') + 90));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/wl-line.png' });
  const v0 = await p.evaluate(() => window.__fsView().s); await p.click('#solStep [data-k=bias]'); await p.waitForTimeout(900); const v1 = await p.evaluate(() => window.__fsView().s);
  ok(v1 > v0 * 1.5, 'Tap the bias: the chart zooms into the line and draws the bias', Math.round(v0) + ' -> ' + Math.round(v1));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/wl-bias.png' });
  /* lat and long */
  await p.mouse.click(30, 300); await p.waitForTimeout(300);
  await p.click('#solStep [data-k=lm][data-v=ll]'); await p.waitForTimeout(300); await p.fill('#solLLb', '50 46.20N 1 17.70W'); await p.fill('#solLLp', '50.7700, -1.2900'); await p.click('#solStep [data-k=llset]'); await p.waitForTimeout(400);
  const L1 = await p.evaluate(() => window.__fsLine());
  ok(Math.abs(L1.boat[0] - 50.77) < 1e-4 && Math.abs(L1.boat[1] + 1.295) < 1e-4 && Math.abs(L1.pin[1] + 1.29) < 1e-4, 'Lat and long: degrees and minutes, or decimal degrees', JSON.stringify([L1.boat.slice(0, 2), L1.pin.slice(0, 2)]));
  /* a tapped buoy: the name drops down beside it with a halo */
  await p.click('#solStep [data-k=x]'); await p.waitForTimeout(300); await p.evaluate(() => window.__fsFitBox(50.74, 50.80, -1.36, -1.24)); await p.waitForTimeout(500);
  const b3 = await p.evaluate(() => { const m = FSSolent.marks().find(q => q.id === '3F'); return window.__fsXY(m.lat, m.lon); });
  await p.mouse.click(b3[0], b3[1]); await p.waitForTimeout(400);
  const pop = await p.evaluate(() => { const e = document.getElementById('solPop'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { t: e.innerText.replace(/\s+/g, ' '), x: r.left + r.width / 2, y: r.top }; });
  ok(pop && /3F/.test(pop.t) && Math.abs(pop.x - b3[0]) < 160 && Math.abs(pop.y - b3[1]) < 140, 'A tapped buoy: its name drops down beside it', pop && JSON.stringify({ t: pop.t.slice(0, 40), dx: Math.round(pop.x - b3[0]), dy: Math.round(pop.y - b3[1]) }));
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/wl-pop.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
