/* FirstShift Mark: the start line and the list of buoys (Stuart 17 Nov 05:36 and 05:49).
   - List of buoys wherever Mark says tap a buoy, with a search by number and name.
   - Start line: by lat and long; by a tapped point laid square to the wind with a length in metres; by tapping the ends; by pinging.
   - The bias at once from the line and the wind, without GPS; tap it: the chart zooms into the line and draws the bias.
   Run: node tests/mark-line.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSMark && window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  const body = () => p.evaluate(() => document.getElementById('mkBody').innerText.replace(/\s+/g, ' '));
  /* list of buoys */
  await p.evaluate(() => FSMark.set({ tab: 'course' })); await p.waitForTimeout(300);
  ok(/Tap a buoy/.test(await body()) && !/Tap a mark/.test(await body()), 'the wording is buoy, not mark');
  await p.click('#mkBody [data-k=list][data-v=marks]'); await p.waitForTimeout(400);
  const n0 = await p.evaluate(() => document.querySelectorAll('#mkList .mkli').length);
  await p.fill('#mkFind', '3F'); await p.waitForTimeout(300);
  const r1 = await p.evaluate(() => [...document.querySelectorAll('#mkList .mkli b')].map(x => x.textContent));
  ok(n0 > 50 && r1.length >= 1 && r1.every(x => x.startsWith('3F')), 'List of buoys: all the Solent buoys, searched by number', n0 + ' buoys; 3F finds ' + r1.join(','));
  const nm = await p.evaluate(() => (FSSolent.marks().find(m => m.id === '3F') || {}).name || '');
  await p.fill('#mkFind', nm.slice(0, 5)); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => [...document.querySelectorAll('#mkList .mkli b')].map(x => x.textContent));
  ok(r2.includes('3F'), 'and searched by name', nm.slice(0, 5) + ' finds ' + r2.slice(0, 6).join(','));
  await p.fill('#mkFind', '3F'); await p.waitForTimeout(200); await p.click('#mkList [data-k=listpick][data-v="3F"][data-s=port]'); await p.waitForTimeout(300);
  await p.fill('#mkFind', '2C'); await p.waitForTimeout(200); await p.click('#mkList [data-k=listpick][data-v="2C"][data-s=starboard]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => FSSolent.state().marks.map(m => m.code + m.side[0]).join()) === '3Fp,2Cs', 'Port and Starboard add buoys to the course, in order');
  await p.click('#mkBody [data-k=listback]'); await p.waitForTimeout(300);
  await p.click('#mkBody [data-k=list][data-v=start]'); await p.fill('#mkFind', '2B'); await p.waitForTimeout(200); await p.click('#mkList [data-k=listpick][data-v="2B"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => FSSolent.state().start && FSSolent.state().start.code === '2B' && FSMark.state().tab === 'course'), 'Choose sets the start buoy and goes back to the course');
  /* start line by lat and long, bias at once without GPS */
  await p.evaluate(() => FSMark.set({ tab: 'start', wind: { twd: 230, tws: 12 }, lmode: 'latlon' })); await p.waitForTimeout(300);
  await p.fill('#mkLLb', '50 46.20N 1 17.70W'); await p.fill('#mkLLp', '50.7700, -1.2900'); await p.click('#mkBody [data-k=llset]'); await p.waitForTimeout(600);
  const L1 = await p.evaluate(() => window.__fsLine());
  ok(L1.boat && Math.abs(L1.boat[0] - 50.77) < 1e-4 && Math.abs(L1.boat[1] + 1.295) < 1e-4 && Math.abs(L1.pin[1] + 1.29) < 1e-4, 'Lat and long: degrees and minutes, or decimal degrees', JSON.stringify([L1.boat.slice(0, 2), L1.pin.slice(0, 2)]));
  await p.waitForTimeout(1300); const sb = await p.evaluate(() => document.getElementById('mkStartBig').innerText.replace(/\s+/g, ' '));
  ok(/BIAS · TAP TO SEE IT (Pin|Boat) \d+ m/i.test(sb), 'the bias shows at once, with no GPS', sb.slice(0, 160));
  const v0 = await p.evaluate(() => window.__fsView().s);
  await p.click('#mkStartBig [data-k=biasview]'); await p.waitForTimeout(1200);
  const v1 = await p.evaluate(() => window.__fsView().s);
  ok(v1 > v0 * 2, 'tap the bias: the chart zooms into the line', Math.round(v0) + ' -> ' + Math.round(v1));
  await p.screenshot({ path: '/tmp/claude-0/ui/mark-bias.png' });
  /* square to the wind, length in metres */
  await p.evaluate(() => FSMark.set({ lmode: 'square' })); await p.waitForTimeout(300); await p.fill('#mkLen', '400'); await p.click('#mkBody [data-k=squarepick]'); await p.waitForTimeout(300);
  const xy = await p.evaluate(() => window.__fsXY(50.77003, -1.2925)); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(800);
  const L2 = await p.evaluate(() => { const l = window.__fsLine(), R = Math.PI / 180, k = Math.cos(l.boat[0] * R), dx = (l.pin[1] - l.boat[1]) * k * 60, dy = (l.pin[0] - l.boat[0]) * 60; return { m: Math.round(Math.hypot(dx, dy) * 1852), brg: Math.round((Math.atan2(dx, dy) / R + 360) % 360) }; });
  ok(Math.abs(L2.m - 400) <= 3 && Math.abs(L2.brg - 140) <= 1, 'Square to the wind: the pin 400 m to port, square to wind 230°', JSON.stringify(L2));
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
