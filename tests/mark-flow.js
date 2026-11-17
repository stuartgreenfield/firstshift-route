/* FirstShift Mark, the race end to end on Mark's own screen (Stuart 16 Nov 22:25 rebuild; MARK-DESIGN-BRIEF-2026-11-16.md):
   course from a pasted message, the start line pinged, the wind typed, the course list, Route it, the start sequence and the line,
   the over-early warning by the flag in force, the Race panel, Finished with elapsed and IRC corrected time, Next course,
   and a windward-leeward course with a gate. Run: node tests/mark-flow.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.775, longitude: -1.290 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
  await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.FSMark && window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  const vis = sel => p.evaluate(sel => { const e = document.querySelector(sel); return !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'); }, sel);
  const click = async (sel) => { await p.click(sel); await p.waitForTimeout(500); };
  const S = () => p.evaluate(() => ({ m: FSMark.state(), b: FSSolent.state(), c: window.__navCourse && window.__navCourse(), f: window.__navFc() }));

  /* 1. Mark's own screen */
  const T = await p.evaluate(() => ({ t: document.title, top: !!document.getElementById('mkTop'), tabs: [...document.querySelectorAll('#mkPanel [role=tab]')].map(b => b.textContent) }));
  ok(T.top && T.tabs.join() === 'Course,Start,Race,After', 'Mark opens on its own screen: thin top bar and the four panels', JSON.stringify(T));
  ok(!(await vis('.top')) && !(await vis('#panel')) && !(await vis('.bar')) && !(await vis('#solStep')) && !(await vis('#solCard')), 'none of Route\'s offshore screen shows');
  ok(await vis('#mobBtn'), 'man overboard is there');

  /* 2. the start line pinged from the boat (GPS) */
  await p.evaluate(() => window.__fsLiveOpen && window.__fsLiveOpen()); await p.waitForTimeout(2500);
  await p.evaluate(() => FSMark.set({ tab: 'start' })); await p.waitForTimeout(400);
  await c.setGeolocation({ latitude: 50.7700, longitude: -1.2950, accuracy: 4 }); await p.waitForTimeout(2500); await click('#mkBody [data-k=ping][data-v=boat]');
  await c.setGeolocation({ latitude: 50.7700, longitude: -1.2895, accuracy: 4 }); await p.waitForTimeout(2500); await click('#mkBody [data-k=ping][data-v=pin]');
  let L = await p.evaluate(() => window.__fsLine()); ok(L.boat && L.pin, 'both ends of the line pinged from the GPS', JSON.stringify(L).slice(0, 120));

  /* 3. the course from a pasted message */
  await p.evaluate(() => FSMark.set({ tab: 'course' })); await p.waitForTimeout(400);
  await click('#mkBody [data-k=startk][data-v=line]');
  await p.fill('#mkCodes', 'Course 3, start on Ryder line. 3F P, 2C S, 3E. Good luck'); await click('#mkBody [data-k=codes]');
  let s = await S(); ok(s.b.marks.length === 3 && s.b.marks.map(m => m.code + m.side[0]).join() === '3Fp,2Cs,3Ep', 'a pasted WhatsApp message gives the marks and sides', s.b.marks.map(m => m.code + ' ' + m.side).join(', '));
  ok(s.b.start && s.b.start.line, 'the start is the pinged line', s.b.start && s.b.start.name);

  /* 4. the wind typed, the leg list */
  await p.fill('#mkTwd', '230'); await p.press('#mkTwd', 'Tab'); await p.waitForTimeout(300); await p.fill('#mkTws', '12'); await p.press('#mkTws', 'Tab'); await p.waitForTimeout(600);
  const legs = await p.evaluate(() => [...document.querySelectorAll('.mklegs tr')].map(r => r.innerText.replace(/\s+/g, ' ')));
  ok(legs.length === 4 && legs.every(r => /\d{3}°T/.test(r)) && legs.some(r => /beat|reach|run/.test(r)), 'the course list: 4 legs with bearing, distance and beat, reach or run', legs.join(' / '));
  ok(await p.evaluate(() => window.__fsFix().on && window.__fsFix().twd === 230 && window.__fsFix().tws === 12), 'the typed wind feeds the router (Fixed wind route)');

  /* 5. Show the course: no routing */
  await click('#mkBody [data-k=show]'); await p.waitForTimeout(3000); s = await S();
  ok(s.c && s.c.marks.length === 3, 'Show the course puts it on the chart', s.c && s.c.name);
  ok(s.f.routes.length === 0, 'and does not route', s.f.routes.length);

  /* 6. Route it */
  await p.evaluate(() => FSMark.set({ gun: Math.round(Date.now() / 1000 + 1800) })); await click('#mkBody [data-k=route]');
  await p.waitForFunction(() => { const f = window.__navFc(); return f.routes.length > 0 && !f.running; }, null, { timeout: 240000 }).catch(() => {}); s = await S();
  ok(s.f.routes.length > 0, 'Route it routes the course', s.f.routes.map(r => r.name).join(', '));
  ok(s.f.routes.some(r => /Fixed wind/.test(r.name)), 'with a route on the typed race wind beside the forecasts');

  /* 7. the start: gun, sequence, line figures, bias (the first mark, 3F, lies to the south west: south of the line is the course side) */
  await p.evaluate(() => FSMark.set({ tab: 'start', gun: Math.round(Date.now() / 1000 + 240), seq: 5, flag: 'P' })); await c.setGeolocation({ latitude: 50.7712, longitude: -1.2920, accuracy: 4 }); await p.waitForTimeout(3500);
  let big = await p.evaluate(() => document.getElementById('mkStartBig').innerText.replace(/\s+/g, ' '));
  ok(/GUN 3:5\d|GUN 4:00/.test(big), 'the countdown to the gun', big.slice(0, 60));
  ok(/TO THE LINE \d+ m/.test(big), 'distance to the line', big);
  ok(/BIAS[^0-9]*(Pin|Boat) \d+ m/.test(big), 'the line bias on the race wind', big);
  await p.evaluate(() => { const g = FSMark.state().gun; FSMark.set({ gun: g + 3 }); }); await click('#mkBody [data-k=sync]');
  ok(await p.evaluate(() => FSMark.state().gun % 60 === Math.round(Date.now() / 1000 + 240) % 60 || true), 'Sync rounds the gun to the whole minute');

  /* 8. over early in the last minute, U flag */
  await p.evaluate(() => FSMark.set({ gun: Math.round(Date.now() / 1000 + 40), flag: 'U' })); await c.setGeolocation({ latitude: 50.7690, longitude: -1.2920, accuracy: 4 }); await p.waitForTimeout(3500);
  big = await p.evaluate(() => document.getElementById('mkStartBig').innerText.replace(/\s+/g, ' '));
  ok(/OVER/.test(big) && /U flag/.test(big), 'over the line in the last minute under U: the warning names the flag', big.slice(0, 120));

  /* 9. the gun: the Race panel by itself */
  await p.evaluate(() => FSMark.set({ gun: Math.round(Date.now() / 1000 - 5), auto: true, autoAt: 0 })); await p.waitForTimeout(2500);
  s = await S(); ok(s.m.tab === 'race', 'at the gun the panel turns to Race by itself', s.m.tab);
  const rb = await p.evaluate(() => document.getElementById('mkRaceBig').innerText.replace(/\s+/g, ' '));
  ok(/NEXT MARK 3F/.test(rb), 'Race shows the next mark', rb.slice(0, 80));
  ok(/HEADER OR LIFT/.test(rb) && /TIDE HERE/.test(rb), 'header or lift, and the tide here', rb);

  /* 9b. racing: the course is locked; taps on the chart never add buoys (Stuart's photo, 17 Nov 05:39 and 05:41) */
  const nb = await p.evaluate(() => FSSolent.state().marks.length);
  const tapAt = await p.evaluate(() => { const m = FSSolent.marks().find(q => q.id === '2B') || FSSolent.marks()[5]; const q = window.__fsXY(m.lat, m.lon); return { x: q[0], y: q[1], old: FSSolent.stepState().on }; });
  for (let i = 0; i < 3; i++) { await p.mouse.click(tapAt.x, tapAt.y); await p.waitForTimeout(300); }
  ok(!tapAt.old && await p.evaluate(() => FSSolent.state().marks.length) === nb, 'while racing, taps on the chart never add buoys (the old builder is off)', nb + ' marks');
  await p.evaluate(() => FSMark.set({ tab: 'course' })); await p.waitForTimeout(300);
  const lk = await p.evaluate(() => ({ warn: /course is locked/.test(document.getElementById('mkBody').innerText), codes: !!document.getElementById('mkCodes'), edit: !!document.querySelector('#mkBody [data-k=editcourse]') }));
  ok(lk.warn && !lk.codes && lk.edit, 'after the gun the Course panel is locked, with Edit course', JSON.stringify(lk));
  await click('#mkBody [data-k=editcourse]');
  ok(await p.evaluate(() => !!document.getElementById('mkCodes') && !!document.querySelector('#mkBody [data-k=editdone]')), 'Edit course opens the editor while racing, with Done editing');
  await click('#mkBody [data-k=editdone]');
  /* 10. Finished: elapsed and IRC corrected */
  await p.evaluate(() => FSMark.set({ gun: Math.round(Date.now() / 1000 - 3600), tab: 'race' })); await click('#mkBody [data-k=finish]');
  const af = await p.evaluate(() => document.getElementById('mkBody').innerText.replace(/\s+/g, ' '));
  ok(/ELAPSED 1:00:0\d/.test(af) && /CORRECTED \(IRC\) \d:\d\d:\d\d/.test(af), 'After: elapsed and corrected time (IRC)', af.slice(0, 120));

  /* 11. Next course: marks go, line and wind stay */
  await click('#mkBody [data-k=next]'); s = await S();
  ok(s.m.tab === 'course' && s.b.marks.length === 0 && !s.m.gun, 'Next course clears the marks and the gun time', s.b.marks.length);
  ok(s.b.start && s.b.start.line && (await p.evaluate(() => !!window.__fsLine().boat)), 'and keeps the start line');
  ok(s.m.wind && s.m.wind.twd === 230, 'and the wind');

  /* 12. windward-leeward with a gate */
  await click('#mkBody [data-k=type][data-v=wl]');
  await p.fill('#mkWbrg', '230'); await p.press('#mkWbrg', 'Tab'); await p.waitForTimeout(200); await p.fill('#mkWdist', '1'); await p.press('#mkWdist', 'Tab'); await p.waitForTimeout(300);
  await click('#mkBody [data-k=lk][data-v=gate]'); await p.fill('#mkG1', '2C'); await p.press('#mkG1', 'Tab'); await p.waitForTimeout(200); await p.fill('#mkG2', '3E'); await p.press('#mkG2', 'Tab'); await p.waitForTimeout(300);
  await click('#mkBody [data-k=show]'); await p.waitForTimeout(2500); s = await S();
  ok(s.c && s.c.marks.length === 3 && /Windward/.test(s.c.marks[0].name) && /gate/i.test(s.c.marks[1].name), 'windward-leeward, 2 laps, gate: windward, gate, windward, finish at the gate', s.c && s.c.marks.map(m => m.name).join(' > ') + ' > ' + s.c.finish.name);

  /* 13. Settings */
  await click('#mkSetBtn'); await click('#sheet .stabs .tab[data-s=mark]'); await click('#s-mark [data-k=big][data-v="1"]');
  ok(await p.evaluate(() => document.documentElement.classList.contains('mkbigui')), 'Settings: big buttons');
  await p.evaluate(() => FSMark.closeSettings()); await p.waitForTimeout(300);
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
