/* M93 (Stuart 21 Nov 09:45, Mark): with no route, the time slider runs a boat along the rhumb lines, and the strip (RHUMB) shows the leg,
   the wind and the tide where it is. Run: node tests/rhumb-boat.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/mark/', { timeout: 120000 }); await p.waitForTimeout(10000);
  await p.evaluate(() => { [...document.querySelectorAll('[role=dialog] .close')].filter(x => x.offsetParent).forEach(x => x.click()); });
  /* a short Solent course, shown and not routed (Mark's "Show the course") */
  await p.evaluate(() => window.__fsUseCourse({ name: 'Rhumb test', solent: true, solPlan: { route: false }, start: { name: 'Start', lat: 50.7665, lon: -1.302 }, marks: [{ name: 'East mark', lat: 50.784, lon: -1.25, side: 'port' }], finish: { name: 'Finish', lat: 50.7705, lon: -1.290 } }));
  await p.waitForTimeout(4000);
  const st = await p.evaluate(() => ({ sel: !!(window.__navFc && window.__navFc() && window.__navFc().sel), course: window.__navCourse() && window.__navCourse().name }));
  ok(!st.sel && st.course === 'Rhumb test', 'A Mark course is on the chart with no route', JSON.stringify(st));
  await p.waitForFunction(() => /Leg|before the gun|Finished/.test(document.getElementById('now').textContent) && document.getElementById('now').classList.contains('rhumb'), null, { timeout: 60000 }).catch(() => null);
  const strip = async () => p.evaluate(() => ({ cls: document.getElementById('now').className, txt: document.getElementById('now').textContent, tag: getComputedStyle(document.getElementById('now'), '::before').content }));
  const s0 = await strip(); ok(/rhumb/.test(s0.cls) && /RHUMB/.test(s0.tag), 'The strip is tagged RHUMB', s0.tag + ' ' + s0.txt.slice(0, 80));
  /* slide through time: find a moment on each leg */
  const legs = new Set(), seen = [];
  for (const v of [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 30, 60, 1000]) { await p.evaluate(v => { const t = document.getElementById('time'); t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }, v); await p.waitForTimeout(250); const s = await strip(); seen.push(v + ': ' + s.txt.slice(0, 70)); const m = s.txt.match(/Leg\s*(\d)\/(\d)/); if (m) legs.add(m[1]); }
  ok(legs.has('1') && legs.has('2'), 'Sliding the time moves the boat along both legs', [...legs].join(','));
  const onLeg = seen.find(x => /Leg/.test(x)) || '';
  ok(/TWS\s*[0-9.]+/.test(onLeg) && /TWD\s*\d{3}°/.test(onLeg) && /TWA\s*\d+°/.test(onLeg), 'On a leg it shows the wind speed, direction and angle there', onLeg);
  ok(seen.some(x => /Finished/.test(x)), 'Past the finish it shows the finish time', seen.find(x => /Finished/.test(x)));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
