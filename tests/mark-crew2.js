/* Mark crew sync on Route's own boat code (Stuart 17 Nov 05:04 "Crew sync"; 06:55 "all crew can have access via boat codes across all 4 products").
   Two phones on one boat code: the course, the start line and the gun set on one reach the other; Route's boat record keeps them,
   and a Route page sharing the same code does not wipe them. Run: node tests/mark-crew2.js http://localhost:8779 (test server stands in for the boat code server) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
const CODE = 'K' + 'MNPQR'.split('').sort(() => Math.random() - 0.5).join('');
async function phone(b, path, dev) { const c = await b.newContext({ ...devices[dev || 'iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(code => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-boatcode', code); localStorage.setItem('fs-boatcode-at', '0'); }, CODE);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + path);
  await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.__fsBcCode, null, { timeout: 300000 }); await p.waitForTimeout(2500); return p; }
const waitFor = (p, fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms || 30000 }).then(() => true).catch(() => false);
(async () => { const b = await chromium.launch();
  const A = await phone(b, '/mark/'); const B = await phone(b, '/mark/', 'Pixel 5');
  ok(await A.evaluate(() => window.__fsBcCode()) === CODE, 'both phones on the boat code', CODE);
  await A.evaluate(() => { FSSolent.set({ type: 'marks', start: { code: null, name: 'Start line', lat: 50.770, lon: -1.2925, line: true }, marks: FSSolent.board('3F P, 2C S, 3E').marks, plan: 'list' }); window.__fsSetLine('boat', 50.7700, -1.2950); window.__fsSetLine('pin', 50.7700, -1.2895); FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 600) }); FSSolent.go(); });
  let got = await waitFor(B, () => FSSolent.state().marks.map(m => m.code).join() === '3F,2C,3E', null, 40000);
  ok(got, 'the course set on one phone reaches the other', await B.evaluate(() => FSSolent.state().marks.map(m => m.code).join()));
  got = await waitFor(B, () => { const l = window.__fsLine(); return l.boat && l.pin && Math.abs(l.pin[1] + 1.2895) < 1e-5; }, null, 30000);
  ok(got, 'and the start line', JSON.stringify(await B.evaluate(() => window.__fsLine())).slice(0, 80));
  got = await waitFor(B, () => window.__navCourse && window.__navCourse() && window.__navCourse().marks.length === 3, null, 30000);
  ok(got, 'and the course shows on its chart');
  ok(await B.evaluate(() => FSSolent.state().startAt) === await A.evaluate(() => FSSolent.state().startAt), 'and the gun time');
  /* a Route page on the same code does not wipe the inshore race */
  const Rt = await phone(b, '/channel-area/'); await Rt.evaluate(() => window.__fsBcPush()); await Rt.waitForTimeout(3000);
  const rec = await Rt.evaluate(async c => { const r = await fetch('/api/boat/' + c, { cache: 'no-store' }); const j = await r.json(); return j.data && j.data.inshore && j.data.inshore.b && j.data.inshore.b.marks.length; }, CODE);
  ok(rec === 3, 'Route on the same code keeps the inshore race in the boat record', String(rec));
  /* B changes the course; A gets it */
  await B.evaluate(() => { const s = FSSolent.state(); FSSolent.set({ marks: s.marks.slice(0, 2) }); });
  got = await waitFor(A, () => FSSolent.state().marks.length === 2, null, 40000); ok(got, 'a change on the second phone comes back to the first');
  ok(!A.errs.length && !B.errs.length && !Rt.errs.length, 'no page errors', A.errs.concat(B.errs, Rt.errs).join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
