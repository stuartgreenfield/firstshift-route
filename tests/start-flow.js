/* Stuart 20 Nov 12:16: "Once you set the startline and the time where do start the race start view ? Or does it appear automatically if you set a start sequence".
   A model of the start in Route, offshore (Cowes Dinard St Malo, RYS line): set the line and the class start, then step the clock towards the gun and record
   what is on screen. Run: node tests/start-flow.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' }); await c.route(/open-meteo|googleapis/, r => r.fulfill({ status: 200, body: '{}' })); await c.route(/\/pre\/routes\.json/, r => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const T0 = Date.now(); await p.clock.install({ time: T0 }); await p.goto(BASE + '/channel-area/?race=dinard'); await p.clock.runFor(9000);
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); });
  const state = () => p.evaluate(() => { const v = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return false; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; }; return { bar: v('solSeq'), screen: v('solStartScr'), text: ((v('solStartScr') ? document.getElementById('solStartScr').textContent : v('solSeq') ? document.getElementById('solSeq').textContent : '') || '').replace(/\s+/g, ' ').slice(0, 90) }; });
  /* 1. the line: RYS, start to the West, from the race menu */
  await p.click('#raceBtn'); await p.clock.runFor(400); await p.click('#rmLine'); await p.clock.runFor(400); await p.click('#klRYSW'); await p.clock.runFor(800);
  const ln = await p.evaluate(() => window.__fsLine ? window.__fsLine() : null); ok(ln && ln.boat && ln.pin, 'Set start line, RYS West: both ends set', JSON.stringify(ln).slice(0, 120));
  await p.evaluate(() => { const k = document.getElementById('kitLine'); if (k) k.hidden = true; });
  /* 2. the class start, 30 minutes from now, as chosen in the start step */
  const gun = Math.round(T0 / 1000) + 1800; await p.evaluate((g) => window.__fsGun(g), gun); await p.clock.runFor(2000);
  let s = await state(); ok(!s.bar && !s.screen, 'T-30 min: nothing opens by itself', JSON.stringify(s));
  /* 3. step the clock: the countdown bar from 15 minutes, the start screen from 10 */
  const at = async (secLeft) => { const now = await p.evaluate(() => Date.now()); await p.clock.runFor(Math.max(0, (gun - secLeft) * 1000 - now)); await p.clock.runFor(2000); return state(); };
  s = await at(16 * 60); ok(!s.screen, 'T-16 min: no start screen', JSON.stringify(s));
  s = await at(14 * 60); ok(s.bar && !s.screen, 'T-14 min: the countdown bar shows by itself', JSON.stringify(s));
  s = await at(9 * 60 + 30); ok(s.screen, 'T-9.5 min: the start screen opens by itself (default 10 min)', JSON.stringify(s));
  s = await at(30); ok(s.screen, 'T-30 s: still on the start screen', JSON.stringify(s));
  s = await at(-120); ok(!s.screen, 'Gun +2 min: the start screen has gone, racing', JSON.stringify(s));
  /* 4. opened by hand early: the Start screen button in the line window, 2 hours before a new start */
  const gun2 = Math.round((await p.evaluate(() => Date.now())) / 1000) + 7200; await p.evaluate((g) => window.__fsGun(g), gun2); await p.clock.runFor(2000);
  await p.evaluate(() => window.__fsLineSet()); await p.clock.runFor(300); await p.click('#klSS'); await p.clock.runFor(1500); s = await state();
  ok(s.screen, 'T-2 h: "Start screen" in the line window opens it by hand', JSON.stringify(s));
  ok(!errs.length, 'no script errors', JSON.stringify(errs).slice(0, 200));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
