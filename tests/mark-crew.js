/* FirstShift Mark crew sync (brief 5; Stuart 17 Nov 05:04 "Crew sync"): two crew phones on one boat code stay on the same course,
   line, gun, flag and wind; two changes made at once on different phones both stand; Route's own boat record is never touched.
   Also checks the sails logo with the colour line round it, top left (Stuart 05:07).
   Run: node tests/mark-crew.js http://localhost:8779  (the test server stands in for the boat code server) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); };
async function phone(b, url, dev) { const c = await b.newContext({ ...devices[dev || 'iPhone 13'], serviceWorkers: 'block', geolocation: { latitude: 50.7705, longitude: -1.2930 }, permissions: ['geolocation'] }); await c.addInitScript(init);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(url);
  await p.waitForFunction(() => window.FSMark && window.__mkSync && window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(3000); p.ctx = c; return p; }
const waitFor = (p, fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms || 15000 }).then(() => true).catch(() => false);
(async () => { const b = await chromium.launch();
  const A = await phone(b, BASE + '/mark/');
  /* the logo */
  const lg = await A.evaluate(() => { const a = document.querySelector('#mkTop .mklogo'), r = a && a.getBoundingClientRect(), st = a && getComputedStyle(a, '::before'); return a && { x: r.left, y: r.top, w: r.width, svg: !!a.querySelector('svg.mk-s'), anim: st.animationName, grad: /conic-gradient/.test(st.backgroundImage) }; });
  ok(lg && lg.x < 20 && lg.svg, 'the sails logo, top left of Mark', JSON.stringify(lg));
  ok(lg && lg.anim === 'mkring' && lg.grad, 'with the colour line running round it');
  await A.screenshot({ path: '/tmp/claude-0/ui/mark-logo.png', clip: { x: 0, y: 0, width: 390, height: 110 } });
  /* A makes a boat code */
  await A.evaluate(() => FSMark.set({ tab: 'settings' })); await A.click('#s-mark [data-k=bcmake]'); await A.waitForTimeout(1500);
  const code = await A.evaluate(() => window.__mkSync.code()); ok(/^[A-HJ-NP-Z2-9]{6}$/.test(code), 'Make a boat code', code);
  /* A sets the course and shows it */
  await A.evaluate(() => { FSSolent.set({ type: 'marks', start: { code: null, name: 'Start point', lat: 50.772, lon: -1.300 }, marks: FSSolent.board('3F P, 2C S, 3E').marks }); FSMark.set({ tab: 'course' }); });
  await A.click('#mkBody [data-k=show]'); await A.waitForTimeout(2500);
  /* B joins by the link */
  const B = await phone(b, BASE + '/mark/?boat=' + code, 'Pixel 5');
  let got = await waitFor(B, () => FSSolent.state().marks.map(m => m.code).join() === '3F,2C,3E', null, 20000);
  ok(got, 'a second phone joining by the link gets the course', await B.evaluate(() => FSSolent.state().marks.map(m => m.code + ' ' + m.side).join(', ')));
  got = await waitFor(B, () => window.__navCourse && window.__navCourse() && window.__navCourse().marks.length === 3, null, 20000);
  ok(got, 'and shows it on its chart');
  /* B pings the line; A gets it */
  await B.evaluate(() => { window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); });
  got = await waitFor(A, () => { const l = window.__fsLine(); return l.boat && l.pin && Math.abs(l.pin[1] + 1.2895) < 1e-5; }, null, 20000);
  ok(got, 'a line pinged on one phone reaches the other', JSON.stringify(await A.evaluate(() => window.__fsLine())).slice(0, 90));
  /* A sets the gun; B gets it */
  const gun = await A.evaluate(() => { const g = Math.round(Date.now() / 1000 + 420); FSMark.set({ gun: g, seq: 5 }); return g; });
  got = await waitFor(B, g => FSMark.state().gun === g, gun, 20000); ok(got, 'the gun time set on one phone reaches the other');
  /* both at once: A the flag, B the wind */
  await Promise.all([A.evaluate(() => FSMark.set({ flag: 'I' })), B.evaluate(() => FSMark.set({ wind: { twd: 225, tws: 11 } }))]);
  const both = p => waitFor(p, () => FSMark.state().flag === 'I' && FSMark.state().wind && FSMark.state().wind.twd === 225, null, 25000);
  ok(await both(A) && await both(B), 'two changes made at once on two phones both stand on both', JSON.stringify(await B.evaluate(() => [FSMark.state().flag, FSMark.state().wind])));
  /* Route's own boat record is untouched */
  const rec = await A.evaluate(async c => (await fetch('/api/boat/' + c, { cache: 'no-store' })).status, code);
  ok(rec === 404, "Route's boat settings and races record is not touched by Mark", 'status ' + rec);
  /* Stop sharing on B: A's next change does not reach it */
  await B.evaluate(() => FSMark.set({ tab: 'settings' })); await B.click('#s-mark [data-k=bcleave]'); await B.waitForTimeout(500);
  await A.evaluate(() => FSMark.set({ flag: 'Z' })); await B.waitForTimeout(9000);
  ok(await B.evaluate(() => FSMark.state().flag) === 'I', 'after Stop sharing, the crew\'s changes no longer arrive');
  ok(!A.errs.length && !B.errs.length, 'no page errors', A.errs.concat(B.errs).join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
