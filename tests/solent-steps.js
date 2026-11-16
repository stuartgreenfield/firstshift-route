/* Stuart 16 Nov 07:48 and 08:00: inshore Solent racing on a clean chart, and the course built one prompt at a time in a small box that can
   be dragged clear; the offshore race and its routes kept and brought back by a toggle; round buttons hidden while the box is open.
   Phone sized, with touch. Run: node tests/solent-steps.js <base> */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.FSSolent && window.__fsInshore && window.__fsXY, null, { timeout: 300000 });
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && !f.running; }, null, { timeout: 600000 }).catch(() => {});
  const off = await p.evaluate(() => ({ short: document.getElementById('raceShort').textContent, routes: window.__navFc().routes.length }));
  ok(off.routes > 0, 'an offshore race routed on screen first', JSON.stringify(off));
  const menu = async id => { await p.evaluate(id => document.getElementById(id).click(), id); await p.waitForTimeout(700); };
  await menu('rmSolent');
  let st = await p.evaluate(() => ({ short: document.getElementById('raceShort').textContent, cleared: window.__fsCleared(), course: window.__navCourse(), routes: (window.__navFc() || {}).routes ? window.__navFc().routes.length : 0, kept: JSON.parse(localStorage.getItem('fs-oldroutes') || '[]').length, card: !document.getElementById('solCard').hidden, back: document.getElementById('rmOffshore').hidden ? null : document.getElementById('rmOffshore').textContent, buoys: FSSolent.isOn() }));
  ok(st.short === 'Solent race' && st.cleared && !st.course && !st.routes && st.kept >= 1 && st.card && st.back && /Back to/.test(st.back) && st.buoys, 'Solent races: top left reads Solent race, the offshore routes saved away, a clear chart with the buoys, Back to the offshore race in the menu', JSON.stringify(st));
  /* windward-leeward, step by step */
  await p.click('#solCardW'); await p.waitForTimeout(600);
  const box = () => p.evaluate(() => { const b = document.getElementById('solStep'); const r = b.getBoundingClientRect(); return { on: !b.hidden, step: b.querySelector('.solstepn').textContent, ask: b.querySelector('.solhd b').textContent, next: (b.querySelector('[data-k="next"]') || b.querySelector('[data-k="go"]')).disabled, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], fabs: [...document.querySelectorAll('.fabhelp')].filter(e => e.getClientRects().length).length, ih: innerHeight, iw: innerWidth }; });
  st = await box(); ok(st.on && /Step 1 of 5/.test(st.step) && /Tap the start/.test(st.ask) && st.next && st.fabs === 0 && st.r[3] <= st.ih && st.r[2] <= st.iw, 'Windward-leeward: step 1 of 5 "Tap the start", Next waits, round buttons hidden, box on screen', JSON.stringify(st));
  /* drag the box by its grip */
  const g = await p.evaluate(() => { const r = document.querySelector('#solStep .solgrip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.move(g[0], g[1]); await p.mouse.down(); await p.mouse.move(g[0], 300, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
  st = await box(); const saved = await p.evaluate(() => localStorage.getItem('fs-solstep-pos'));
  ok(st.r[1] > 250 && st.r[1] < 330 && saved, 'the box drags by its grip, and remembers where', JSON.stringify({ r: st.r, saved }));
  const tap = async id => { const m = await p.evaluate(id => { const m = FSSolent.marks().find(x => x.id === id); const v = window.__navViewGet(); window.__navViewSet({ la: m.lat, lo: m.lon, s: Math.max(v.s, 4000), follow: false }); return { la: m.lat, lo: m.lon }; }, id); await p.waitForTimeout(400); const xy = await p.evaluate(m => window.__fsXY(m.la, m.lo), m); await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(400); };
  const click = async sel => { await p.evaluate(s => document.querySelector(s).click(), sel); await p.waitForTimeout(300); };
  await tap('3G'); st = await box(); const sg = await p.evaluate(() => document.querySelector('#solStep .solgot').textContent);
  ok(!st.next && /3G/.test(sg), 'tap a buoy: it becomes the start, Next is ready', sg);
  await click('#solStep [data-k="next"]'); await click('#solStep [data-k="wk"][data-v="buoy"]'); st = await box();
  ok(/Step 2 of 5/.test(st.step) && /Tap the windward buoy/.test(st.ask), 'step 2: Tap the windward buoy', st.ask);
  await tap('3F'); await click('#solStep [data-k="next"]'); await click('#solStep [data-k="lk"][data-v="gate"]'); await tap('3E'); st = await box();
  ok(/Step 3 of 5/.test(st.step) && /second gate buoy/.test(st.ask) && st.next, 'step 3: a gate, first buoy tapped, asks for the second', st.ask);
  await tap('3D'); st = await box(); ok(!st.next, 'second gate buoy tapped: Next ready');
  await click('#solStep [data-k="next"]'); await click('#solStep [data-k="lap"][data-v="1"]'); st = await box();
  ok(/Step 4 of 5/.test(st.step) && await p.evaluate(() => FSSolent.state().wl.laps === 3), 'step 4: laps and finish (laps now 3)');
  await click('#solStep [data-k="back"]'); st = await box(); ok(/Step 3 of 5/.test(st.step), 'Back goes to the step before'); await click('#solStep [data-k="next"]');
  await click('#solStep [data-k="next"]'); st = await box(); const sum = await p.evaluate(() => document.querySelector('#solStep .solgot').textContent);
  ok(/Step 5 of 5/.test(st.step) && /Check the course/.test(st.ask) && !st.next && /marks, about/.test(sum), 'step 5: check the course, Route this race ready', sum);
  await click('#solStep [data-k="go"]'); await p.waitForTimeout(800);
  st = await p.evaluate(() => ({ box: document.getElementById('solStep').hidden, sheet: !document.getElementById('solSheet') || document.getElementById('solSheet').hidden, short: document.getElementById('raceShort').textContent, name: (window.__navCourse() || {}).name, back: !document.getElementById('rmOffshore').hidden }));
  ok(st.box && st.sheet && st.short === 'Solent race' && /^Solent race \d{1,2} [A-Z][a-z]{2} \d\d:\d\d$/.test(st.name || '') && st.back, 'Route this race: box closes, never the big sheet; top left still Solent race; saved with the date and time; the offshore race still to go back to', JSON.stringify(st));
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && f.sel.path.length > 5 && !f.running; }, null, { timeout: 600000 }).catch(() => {});
  ok(await p.evaluate(() => !!(window.__navFc() || {}).sel), 'the Solent race routes');
  /* round the cans, with a starboard mark */
  await menu('rmSolent'); await p.click('#solCardM'); await p.waitForTimeout(500); await tap('3G'); await click('#solStep [data-k="next"]');
  st = await box(); ok(/Step 2 of 4/.test(st.step) && /first buoy/.test(st.ask), 'Round the cans: step 2 "Tap the first buoy"', st.ask);
  await tap('3F'); await p.waitForSelector('#solSide:not([hidden])', { timeout: 3000 }).catch(() => {}); await click('#solSide [data-s="stbd"]'); await tap('3E'); await click('#solSide [data-s="port"]');
  const chips = await p.evaluate(() => [...document.querySelectorAll('#solStep .solchip')].map(x => x.textContent));
  ok(chips.length === 2 && /3F S/.test(chips[0]) && /3E P/.test(chips[1]), 'two buoys tapped with Starboard and Port, shown as chips in the box', JSON.stringify(chips));
  await click('#solStep [data-k="next"]'); st = await box(); ok(/Step 3 of 4/.test(st.step) && /start line/i.test(st.ask), 'step 3: the finish (start line by default)', st.ask);
  await click('#solStep [data-k="next"]'); await click('#solStep [data-k="go"]'); await p.waitForTimeout(800);
  const sides = await p.evaluate(() => (window.__navCourse() || { marks: [] }).marks.map(m => m.side));
  ok(sides[0] === 'starboard' && sides[1] === 'port', 'the starboard buoy routes as starboard (was routed as port before)', JSON.stringify(sides));
  /* back to the offshore race */
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && !f.running; }, null, { timeout: 600000 }).catch(() => {});
  await menu('rmOffshore'); await p.waitForTimeout(2500);
  st = await p.evaluate(() => ({ short: document.getElementById('raceShort').textContent, routes: (window.__navFc() || {}).routes ? window.__navFc().routes.length : 0, buoys: FSSolent.isOn(), inshore: document.body.classList.contains('inshore'), back: !document.getElementById('rmOffshore').hidden }));
  ok(st.short === off.short && st.routes === off.routes && !st.buoys && !st.inshore && !st.back, 'Back to the offshore race: its name and its routes as they were, buoys off', JSON.stringify(st));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
