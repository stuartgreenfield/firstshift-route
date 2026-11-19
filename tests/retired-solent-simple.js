/* Simpler Solent racing (Stuart 16 Nov 18:30, decided 18:40). Round the cans without routing gives the course as a list of bearings,
   distances and leg types; header or lift shows as you sail a beat; Route it routes on one model; New course clears the marks and keeps
   the start line and the wind. Windward-leeward: a start line of two tapped ends, a windward point and a gate of two points.
   Run: node tests/solent-simple.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: 50.7665, longitude: -1.2950 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
  await p.goto(BASE + '/mark/'); await p.waitForSelector('#spTourNo', { state: 'visible', timeout: 120000 }); await p.click('#spTourNo');
  await p.waitForFunction(() => window.FSSolent && window.__fsXY, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  const box = () => p.evaluate(() => { const b = document.getElementById('solStep'); return b && !b.hidden ? { step: b.querySelector('.solstepn').textContent, ask: b.querySelector('.solhd b').textContent, text: b.innerText.replace(/\s+/g, ' '), go: (b.querySelector('[data-k="go"]') || {}).textContent } : null; });
  const next = async () => { await p.click('#solStep [data-k="next"]'); await p.waitForTimeout(400); };
  const tapAt = async (la, lo) => { const q = await p.evaluate(([a, o]) => window.__fsXY(a, o), [la, lo]); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(500); };
  const tapBuoy = async id => { const m = await p.evaluate(id => FSSolent.marks().find(x => x.id === id), id); await tapAt(m.lat, m.lon); };
  /* A: round the cans, not routed */
  await p.waitForSelector('#solCard:not([hidden])', { timeout: 60000 }).catch(() => {});
  const T = await p.evaluate(() => ({ title: document.title, name: (document.querySelector('.tname') || {}).textContent, card: !!document.querySelector('#solCard:not([hidden])') }));
  ok(T.title === 'FirstShift Mark · Solent' && T.name === 'Mark · Solent' && T.card, 'FirstShift Mark opens straight onto the Solent course card', JSON.stringify(T));
  await p.click('#solCardM'); await p.waitForTimeout(1200);
  let bx = await box(); ok(bx && /Route this race, or not/.test(bx.ask) && /Step 1 of 5/.test(bx.step), 'step 1 asks Route or not (5 steps when not routed)', bx && bx.step + ' ' + bx.ask);
  ok(await p.evaluate(() => document.querySelector('#solStep [data-k="plan"][data-v="list"]').getAttribute('aria-pressed') === 'true'), 'No routing is ticked first');
  const sail0 = async (la, lo, brg, n) => { for (let i = 0; i < n; i++) { la += 6 / 3600 * Math.cos(brg * Math.PI / 180) / 60; lo += 6 / 3600 * Math.sin(brg * Math.PI / 180) / 60 / Math.cos(la * Math.PI / 180); await c.setGeolocation({ latitude: la, longitude: lo, accuracy: 5 }); await p.waitForTimeout(1000); } return [la, lo]; };
  await p.evaluate(() => window.__fsLiveOpen()); await p.waitForTimeout(1000); let tp = await sail0(50.7600, -1.3000, 188, 30);
  await p.click('#solStep [data-k="tref"][data-v="stbd"]'); await p.waitForTimeout(300); tp = await sail0(tp[0], tp[1], 272, 30); await p.click('#solStep [data-k="tref"][data-v="port"]'); await p.waitForTimeout(300);
  const TW = await p.evaluate(() => FSSolent.windRef()); ok(TW && Math.abs(TW.twd - 230) <= 3 && Math.abs(TW.ba - 42) <= 3, 'wind from the two tacks: 188 and 272 give 230, 42 degrees off', JSON.stringify(TW));
  await p.evaluate(() => { const lb = document.getElementById('lvStop'); if (lb) lb.click(); });
  await p.fill('#solTwd', '230'); await p.press('#solTwd', 'Tab'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => FSSolent.windRef() && FSSolent.windRef().twd === 230), 'the wind typed in is kept for the race');
  await next(); await tapBuoy('3G'); await next();
  for (const [id, sd] of [['3F', 'port'], ['2C', 'stbd'], ['3E', 'port']]) { await p.fill('#solCode', id); await p.click('#solStep [data-k="code"][data-v="' + sd + '"]'); await p.waitForTimeout(300); }
  await next(); await next(); bx = await box(); ok(bx && /Check the course/.test(bx.ask) && bx.go === 'Show the course', 'the last step offers Show the course, not Route', bx && bx.go);
  const past = await p.evaluate(() => { const d = new Date(Date.now() + 10 * 60000), z = v => ('0' + v).slice(-2); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); });
  await p.fill('#solStartT', past); await p.press('#solStartT', 'Tab'); await p.waitForTimeout(300);
  await p.click('#solStep [data-k="go"]'); await p.waitForTimeout(5000);
  const L = await p.evaluate(() => { const c = document.getElementById('solLegs'), f = window.__navFc(); return { shown: !!c && !c.hidden, rows: c ? [...c.querySelectorAll('tr')].map(r => r.innerText.replace(/\s+/g, ' ')) : [], routes: f.routes.length, running: f.running }; });
  ok(L.shown && L.rows.length === 4, 'not routed: the course shows as a list of 4 legs', JSON.stringify(L.rows));
  ok(L.rows.every(r => /\d{3}°T \d+\.\d nm/.test(r)) && L.rows.some(r => /beat|reach|run/.test(r)), 'each leg has bearing, distance and leg type');
  ok(L.routes === 0 && !L.running, 'no routing ran', JSON.stringify({ routes: L.routes, running: L.running }));
  /* header or lift: sail a starboard beat in a 230 wind (close-hauled 185), then 10 degrees higher */
  await p.evaluate(() => window.__fsLiveOpen()); await p.waitForTimeout(1500);
  const sail = async (la, lo, brg, n) => { for (let i = 0; i < n; i++) { la += 6 / 3600 * 1.0 * Math.cos(brg * Math.PI / 180) / 60 * 1; lo += 6 / 3600 * 1.0 * Math.sin(brg * Math.PI / 180) / 60 / Math.cos(la * Math.PI / 180); await c.setGeolocation({ latitude: la, longitude: lo, accuracy: 5 }); await p.waitForTimeout(1000); } return [la, lo]; };
  const open = async () => p.evaluate(() => { const ms = FSSolent.marks(); for (let la = 50.74; la < 50.80; la += 0.002) for (let lo = -1.36; lo < -1.26; lo += 0.003) { const wet = (a, o) => !window.__fsOnLand(a, o); if (!ms.some(m => Math.hypot(m.lat - la, (m.lon - lo) * 0.63) * 60 < 0.25) && !ms.some(m => Math.hypot(m.lat - (la - 0.0012), (m.lon - lo) * 0.63) * 60 < 0.25) && [[0, 0], [-0.0015, 0.02], [0.002, 0.008], [0.001, 0.013], [-0.0007 - 0.0085, 0.01 - 0.0151]].every(d => wet(la + d[0], lo + d[1]))) return [la, lo]; } return null; });
  let pos = await sail(50.7600, -1.3000, 188, 26); let sh = await p.evaluate(() => (document.querySelector('.lvsh') || {}).textContent || 'none');
  ok(/ON THE WIND|LIFT [0-3]°|HEADER [0-3]°/.test(sh), 'close-hauled on starboard at 188 (wind 230, 42° off): on the wind', sh);
  pos = await sail(pos[0], pos[1], 198, 25); sh = await p.evaluate(() => (document.querySelector('.lvsh') || {}).textContent || 'none');
  ok(/LIFT (9|10|11)°/.test(sh), 'ten degrees higher on starboard: a lift of about 10', sh);
  pos = await sail(pos[0], pos[1], 178, 25); sh = await p.evaluate(() => (document.querySelector('.lvsh') || {}).textContent || 'none');
  ok(/HEADER (9|10|11)°/.test(sh), 'ten degrees lower: a header of about 10', sh);
  /* Route it: one model */
  await p.evaluate(() => { const c = document.getElementById('solLegs'); if (c) c.hidden = false; const s = document.getElementById('startSel'); const o = [...s.options].find(x => +x.value > Date.now() / 1000 + 1800); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }); await p.click('#solLegs [data-k="route"]');
  for (let k = 0; k < 60; k++) { await p.waitForTimeout(2000); const r = await p.evaluate(() => { const f = window.__navFc(); return { running: f.running, n: f.routes.length }; }); if (!r.running && r.n) break; }
  const R1 = await p.evaluate(() => window.__navFc().routes.map(r => r.name)); ok(R1.length === 1 && /UKV/.test(R1[0]), 'Route it routes on one model, UKV', JSON.stringify(R1) + ' ' + await p.evaluate(() => (document.getElementById('runNote') || {}).textContent + ' | ' + (document.getElementById('busy') || {}).textContent + ' | card ' + !!document.querySelector('#setupCard:not([hidden]), .setcard:not([hidden])')));
  /* New course: marks go, line and wind stay */
  await p.evaluate(() => window.__fsSetLine('boat', 50.7700, -1.3100)); await p.evaluate(() => window.__fsSetLine('pin', 50.7690, -1.3050));
  await p.evaluate(() => FSSolent.newCourse()); await p.waitForTimeout(1500);
  const N = await p.evaluate(() => ({ marks: FSSolent.state().marks.length, wind: FSSolent.windRef() && FSSolent.windRef().twd, line: !!(window.__fsLine().boat && window.__fsLine().pin), routes: window.__navFc().routes.length, card: !document.getElementById('solCard').hidden }));
  ok(N.marks === 0 && N.routes === 0 && N.card, 'New course: the marks and routes go, the course card opens', JSON.stringify(N));
  ok(N.wind === 230 && N.line, 'New course keeps the start line and the wind', JSON.stringify(N));
  /* B: windward-leeward, start line of two ends, windward point, gate of two points */
  await p.click('#solCardW'); await p.waitForTimeout(1200); await next();
  await p.click('#solStep [data-k="sk"][data-v="line"]'); await p.waitForTimeout(300); bx = await box();
  ok(bx && /Start line set/.test(bx.ask) && /favoured|square/.test(bx.text), 'the kept start line is ready, with its bias for the wind', bx && bx.text.slice(0, 160));
  const O = await open(); { const q = await p.evaluate(([a, o]) => window.__fsXY(a, o), [O[0] - 0.003, O[1] + 0.008]); await p.mouse.move(q[0], q[1]); for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -400); await p.waitForTimeout(400); } await p.waitForTimeout(800); }
  await p.click('#solStep [data-k="lclr"]'); await p.waitForTimeout(300); await tapAt(O[0], O[1]); await tapAt(O[0] - 0.0015, O[1] + 0.02); bx = await box();
  ok(bx && /Committee boat: set · Pin: set/.test(bx.text), 'start line by tapping both ends', bx && bx.text.slice(0, 160));
  await next(); await p.click('#solStep [data-k="wk"][data-v="pt"]'); await p.waitForTimeout(300); await tapAt(O[0] - 0.0007 + 0.8 / 60 * Math.cos(230 * Math.PI / 180), O[1] + 0.01 + 0.8 / 60 * Math.sin(230 * Math.PI / 180) / 0.633); await next();
  await p.click('#solStep [data-k="lk"][data-v="gate"]'); await p.waitForTimeout(300); await tapAt(O[0] + 0.002, O[1] + 0.008); await tapAt(O[0] + 0.001, O[1] + 0.013); bx = await box();
  ok(bx && /Gate: A and B/.test(bx.text), 'a gate of two tapped points', bx && bx.text.slice(0, 160));
  for (let z = 0; z < 4; z++) { if (await p.evaluate(() => FSSolent.stepState().key) === 'check') break; await next(); }
  await p.click('#solStep [data-k="plan"]').catch(() => {}); await p.evaluate(() => { FSSolent.set({ plan: 'list' }); FSSolent.step(FSSolent.stepState().n); }); await p.waitForTimeout(300);
  for (let z = 0; z < 6; z++) { if (await p.evaluate(() => FSSolent.stepState().key) === 'check') break; await next(); }
  await p.click('#solStep [data-k="go"]'); await p.waitForTimeout(5000);
  const L2 = await p.evaluate(() => { const c = document.getElementById('solLegs'); return { shown: !!c && !c.hidden, rows: c ? [...c.querySelectorAll('tr')].map(r => r.innerText.replace(/\s+/g, ' ')) : [], routes: window.__navFc().routes.length }; });
  ok(L2.shown && L2.rows.length >= 3 && L2.routes === 0, 'windward-leeward course listed, not routed', JSON.stringify(L2.rows));
  ok(L2.rows.length && /beat/.test(L2.rows[0]), 'first leg to windward is a beat', L2.rows[0]);
  await p.screenshot({ path: '/tmp/claude-0/ui/solent-simple.png' });
  /* Route has no Solent screens now */
  const q = await c.newPage(); await q.goto(BASE + '/channel-area/'); await q.waitForFunction(() => window.FSSolent && window.__navFc, null, { timeout: 120000 }); await q.waitForTimeout(2000);
  const RR = await q.evaluate(() => { const m = document.getElementById('rmSolent'), st = document.querySelector('.solsettings'); return { menu: m ? getComputedStyle(m).display : 'none', settings: st ? getComputedStyle(st).display : 'none', on: FSSolent.isOn(), title: document.title }; });
  ok(RR.menu === 'none' && RR.settings === 'none' && !RR.on && RR.title === 'FirstShift Route', 'Route has no inshore menu, settings or marks', JSON.stringify(RR));
  ok(!errs.length, 'no page errors', errs.join('; ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
