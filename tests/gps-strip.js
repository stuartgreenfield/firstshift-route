/* F104 (Stuart 21 Nov 09:45: "You can go with A, recommended, for no floating window"; 12:13: "ensure we have a roll back").
   With GPS on: no floating GPS window; the strip at the foot shows LIVE figures; a tap on GPS opens a menu with what the window did;
   nothing covers the chart's buttons; Stop GPS brings the PLAN strip back; fs-gpswin = 1 brings the old window back.
   Run: node tests/gps-strip.js http://localhost:8779   (and 8778 for Route+) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779', PAGE = process.argv[3] || '/channel-area/';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    const fx = () => ({ coords: { latitude: 50.70, longitude: -1.45, accuracy: 6, speed: 3, heading: 240, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) }; Object.defineProperty(navigator, 'geolocation', { get: () => g }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async () => { await p.goto(BASE + PAGE, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(10000); await p.evaluate(() => { ['spTourNo', 'wizX'].forEach(id => { const n = document.getElementById(id); if (n && n.offsetParent) n.click(); }); [...document.querySelectorAll('[role=dialog] .close')].filter(x => x.offsetParent).forEach(x => x.click()); }); await p.waitForTimeout(800); };   /* Mark opens on its Start new race card */
  await open();
  const plan0 = await p.evaluate(() => ({ live: document.getElementById('now').classList.contains('live'), tag: getComputedStyle(document.getElementById('now'), '::before').content }));
  ok(!plan0.live && /PLAN/.test(plan0.tag), 'GPS off: the strip is the PLAN', plan0.tag);
  await p.click('#liveBtn'); await p.waitForTimeout(3500);
  const s = await p.evaluate(() => { const n = document.getElementById('now'), lb = document.getElementById('liveBox'); return { live: n.classList.contains('live'), tag: getComputedStyle(n, '::before').content, txt: n.textContent, box: !!lb && getComputedStyle(lb).display !== 'none' && lb.getClientRects().length > 0 }; });
  ok(s.live && /LIVE/.test(s.tag), 'GPS on: the strip turns LIVE', s.tag);
  ok(/SOG/.test(s.txt) && /5\.8|5\.9|6\.0|5\.7/.test(s.txt) && /COG/.test(s.txt) && /240/.test(s.txt), 'It shows the GPS speed and course', s.txt.slice(0, 120));
  ok(!s.box, 'No floating GPS window');
  /* nothing covers the chart's own buttons (once routing has finished: the routing progress box is F110) */
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && !f.running; }, null, { timeout: 300000 }).catch(() => null); await p.waitForTimeout(1500);
  const cov = await p.evaluate(() => [...document.querySelectorAll('.chart button')].filter(x => x.offsetParent && x.getClientRects().length).map(x => { const r = x.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return null; const e = document.elementFromPoint(cx, cy); return e && (x === e || x.contains(e)) ? null : (x.id || x.className) + ' under ' + (e && (e.id || e.className)); }).filter(Boolean));
  ok(cov.length === 0, 'No chart button is covered', cov.slice(0, 4).join('; '));
  /* the GPS menu */
  await p.click('#liveBtn'); await p.waitForTimeout(500);
  const m = await p.evaluate(() => { const e = document.getElementById('gpsMenu'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { t: [...e.querySelectorAll('[data-g]')].map(x => x.dataset.g).join(','), r: [r.left, r.top, r.right, r.bottom].map(Math.round), on: document.getElementById('liveBtn').getAttribute('aria-pressed') }; });
  ok(!!m && /stop/.test(m.t) && /big/.test(m.t) && /file/.test(m.t) && /clr/.test(m.t) && /info/.test(m.t), 'A tap on GPS opens the menu: Stop, Big numbers, File track, Clear track, What these mean', m && m.t);
  ok(m && m.on === 'true', 'Opening the menu does not stop the GPS');
  ok(m && m.r[0] >= 0 && m.r[1] >= 0 && m.r[2] <= 390 + 1 && m.r[3] <= 844 + 1, 'The menu is on the screen', m && m.r.join(','));
  await p.click('#gpsMenu [data-g="info"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#gpsMenu .gminfo')), 'What these mean opens in the menu');
  await p.click('#gpsMenu [data-g="big"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById('fsDeckBtn').getAttribute('aria-pressed') === 'true' && document.getElementById('gpsMenu').hidden), '20/20 (was Big numbers, Stuart 22 Nov 10:32) opens the 20/20 screen and closes the menu');
  await p.evaluate(() => { const x = document.getElementById('dkExit'); if (x) x.click(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('fsDeckBtn').getAttribute('aria-pressed') !== 'true'), 'CHART × closes the 20/20 screen');
  /* a tap elsewhere closes the menu */
  await p.click('#liveBtn'); await p.waitForTimeout(300); const mr = await p.evaluate(() => document.getElementById('gpsMenu').getBoundingClientRect().top); await p.mouse.click(4, 330); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('gpsMenu').hidden), 'A tap elsewhere closes the menu', await p.evaluate((y) => { const e = document.elementFromPoint(4, 330); return (e && (e.id || e.className || e.tagName)) + ' (menu top ' + y + ')'; }, mr));
  /* stop */
  await p.click('#liveBtn'); await p.waitForTimeout(300); await p.click('#gpsMenu [data-g="stop"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ on: document.getElementById('liveBtn').getAttribute('aria-pressed'), live: document.getElementById('now').classList.contains('live') }));
  ok(st.on === 'false' && !st.live, 'Stop GPS in the menu stops it, and the strip is the PLAN again', JSON.stringify(st));
  /* rollback */
  await p.evaluate(() => localStorage.setItem('fs-gpswin', '1')); await open();
  await p.click('#liveBtn'); await p.waitForTimeout(3500);
  const rb = await p.evaluate(() => { const lb = document.getElementById('liveBox'); return { box: !!lb && getComputedStyle(lb).display !== 'none' && lb.getClientRects().length > 0, live: document.getElementById('now').classList.contains('live') }; });
  ok(rb.box && !rb.live, 'Rollback: with fs-gpswin = 1 the old GPS window is back and the strip stays PLAN', JSON.stringify(rb));
  await p.click('#liveBtn'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('liveBtn').getAttribute('aria-pressed') === 'false'), 'Rollback: a tap on GPS stops it, as before');
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
