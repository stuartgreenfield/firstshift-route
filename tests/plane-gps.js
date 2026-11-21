/* F116 (Stuart's flight, 21 Nov 16:48: "screen stalled then came back", then the course gone and the gun moved): Route on a phone with
   the race under way and the GPS on, fed a GPS track at aircraft speed (about 420 kn, off the course and out of the forecast area), with
   a 3-minute gap in the fixes (dead reckoning). Checks the page never freezes, the course and the gun stay, and the strip shows a course.
   Run: node tests/plane-gps.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    window.__gap = false; const t0 = Date.now();
    const fx = () => { const k = (Date.now() - t0) / 1000; return { coords: { latitude: 50.80 + k * 0.0015, longitude: -1.20 + k * 0.0026, accuracy: 8, speed: 216, heading: 48, altitude: 10000, altitudeAccuracy: null }, timestamp: Date.now() }; };
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => { if (!window.__gap) ok(fx()); }, 1000), clearWatch: id => clearInterval(id) };
    Object.defineProperty(navigator, 'geolocation', { get: () => g, configurable: true });
    window.__long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=dinard', { timeout: 120000 });
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && !f.running; }, null, { timeout: 600000 }).catch(() => null);
  /* the gun 40 minutes ago, kept */
  const gun = Math.round(Date.now() / 1000 - 40 * 60); await p.evaluate(g => window.__fsGun(g), gun); await p.waitForTimeout(1500);
  const before = await p.evaluate(() => ({ course: window.__navCourse() && window.__navCourse().name, gun: +document.getElementById('startSel').value }));
  const THR = +(process.argv[3] || 1); if (THR > 1) { const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR }); console.log('processor slowed', THR, 'times'); }
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(60000);
  const strip = await p.evaluate(() => document.getElementById('now').textContent.replace(/\s+/g, ' '));
  console.log('strip at 420 kn (speed over 40 kn is left out as a GPS jump):', strip.slice(0, 120));
  await p.evaluate(() => { window.__gap = true; }); await p.waitForTimeout(190000); await p.evaluate(() => { window.__gap = false; }); await p.waitForTimeout(60000);
  const after = await p.evaluate(() => ({ course: window.__navCourse() && window.__navCourse().name, gun: +document.getElementById('startSel').value, plot: (window.__fsPlotCalc ? '' : '') + ((document.getElementById('fsPlot') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 80), long: window.__long.slice().sort((a, b) => b - a).slice(0, 5) }));
  console.log(JSON.stringify({ before, after }));
  ok(after.course === before.course && !!after.course, 'The course is still loaded after 5 minutes at aircraft speed and a 3-minute gap', after.course);
  ok(after.gun === before.gun, 'The gun has not moved', before.gun + ' to ' + after.gun);
  ok(!/No course loaded/.test(after.plot), 'The plotter still has the course', after.plot);
  ok(!after.long.length || after.long[0] < 3000, 'No freeze of 3 seconds or more on the main thread', after.long.join(',') + ' ms');
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
