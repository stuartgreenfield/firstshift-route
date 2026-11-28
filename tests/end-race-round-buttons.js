/* C6 and AP, pictures first (Stuart 27 Nov 23:00 and 23:15, his iPhone, photos IMG_0144 and IMG_0147).
   Phone upright, 393 by 852 as his iPhone. A boat is set, the class start is three minutes off, RACE is tapped, the gun comes in real time.
   C6: the race drop-down next to the logo must show End race directly below Edit this course once a race is set; two taps end it.
   AP: with the button row cleared, the round chart buttons must sit along the bottom of the map (or up the edge), never half way up.
   Run (through tools/probe/with78.sh): node tests/end-race-round-buttons.js http://localhost:8779 route   or   http://localhost:8778 routeplus. About 9 minutes; pictures in /tmp/claude-0/probe/c6ap */
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2], TAG = process.argv[3], OUT = '/tmp/claude-0/probe/c6ap'; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + TAG + ' ' + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
  await c.route(/open-meteo|googleapis|gstatic|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!localStorage.getItem('fs-terms')) { const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); } });
  await c.addInitScript(() => { window.__fake = { la: 50.7745, lo: -1.2990, sog: 0.5, cog: 300 };
    setInterval(() => { const f = window.__fake, d = f.sog / 3600 / 60, R = Math.PI / 180; f.la += d * Math.cos(f.cog * R); f.lo += d * Math.sin(f.cog * R) / Math.cos(f.la * R); }, 1000);
    const fx = () => ({ coords: { latitude: window.__fake.la, longitude: window.__fake.lo, accuracy: 5, speed: window.__fake.sog * 0.514444, heading: window.__fake.cog, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) };
    Object.defineProperty(navigator, 'geolocation', { get: () => g }); });
  const p = await c.newPage(); let errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('ERR', e.message); });
  const tap = async (q, wait) => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, q); if (!r) return false; await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(wait || 1500); return true; };
  const shot = n => p.screenshot({ path: OUT + '/' + TAG + '-' + n + '.png' });
  const menu = () => p.evaluate(() => { const m = document.getElementById('raceMenu'); if (!m || m.hidden) return null; return [...m.querySelectorAll('button')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { id: e.id, t: e.innerText.replace(/\s+/g, ' ').trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; }); });
  const state = () => p.evaluate(() => { let gun = null, live = null, cleared = null; try { cleared = window.__fsCleared(); } catch (e) {} try { gun = window.__fsGunAt(); } catch (e) {} try { live = window.__navLiveState().on; } catch (e) {} return { gun: gun ? Math.round(gun - Date.now() / 1000) : null, live, cleared, routes: document.querySelectorAll('#finBox .fin').length, race: document.body.classList.contains('fsrace'), clear: document.body.classList.contains('navclear') }; });
  const fabs = () => p.evaluate(() => { const v = [...document.querySelectorAll('.fabhelp')].filter(f => f.getClientRects().length && getComputedStyle(f).visibility !== 'hidden'); if (!v.length) return null; const host = v[0].offsetParent, hr = host.getBoundingClientRect(), bar = document.getElementById('bar'), br = bar && bar.getClientRects().length ? bar.getBoundingClientRect() : null;
    const R = v.map(f => { const r = f.getBoundingClientRect(); return { id: f.id, l: Math.round(r.left), t: Math.round(r.top), b: Math.round(r.bottom), r: Math.round(r.right), row: f.dataset.fr === '1' }; });
    return { n: R.length, inRow: R.filter(x => x.row).length, tops: [...new Set(R.map(x => x.t))], lefts: [...new Set(R.map(x => x.l))], lowest: Math.max(...R.map(x => x.b)), highest: Math.min(...R.map(x => x.t)), chartTop: Math.round(hr.top), chartBottom: Math.round(hr.bottom), barTop: br ? Math.round(br.top) : null, barBottom: br ? Math.round(br.bottom) : null, screen: innerHeight, off: R.filter(x => x.l < 0 || x.r > innerWidth || x.t < 0 || x.b > innerHeight).map(x => x.id), ids: R.map(x => x.id + '@' + x.l + ',' + x.t) }; });

  await p.goto(BASE + '/fastnet/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  if (await p.evaluate(() => { const n = document.getElementById('spTourNo'); return !!(n && n.getClientRects().length); })) await tap('#spTourNo');
  /* no race set yet: End race must not be in the list */
  await p.evaluate(() => { const s = document.getElementById('setupCard'); if (s && s.getClientRects().length) { const x = s.querySelector('.x, [aria-label="Close"]'); } });
  await tap('[data-su="boat"]'); await p.fill('#boatName', 'Morning After'); await p.dispatchEvent('#boatName', 'change'); await p.fill('#tcc', '1.031'); await p.dispatchEvent('#tcc', 'change'); if (!(await tap('#setDone'))) await tap('#sheetX');
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(900);
  let m = await menu(); ok(!!m && !m.some(x => x.id === 'rmEnd'), 'no race set: End race is not in the list', m ? m.map(x => x.t).join(' / ') : 'menu not open');
  await shot('1-menu-no-race'); await p.evaluate(() => { document.getElementById('raceMenu').hidden = true; });
  /* class start three minutes off */
  const g = new Date(Date.now() + 7 * 60000), hh = String(g.getHours()).padStart(2, '0') + ':' + String(g.getMinutes()).padStart(2, '0');
  await tap('[data-su="start"]'); await p.fill('#wzTime', hh); await p.dispatchEvent('#wzTime', 'input'); await p.dispatchEvent('#wzTime', 'change'); await tap('#wizNext');
  for (let i = 0; i < 90; i++) { const s = await p.evaluate(() => { const f = window.__navFc(); return { fins: document.querySelectorAll('#finBox .fin').length, run: !!f.running }; }); if (s.fins && !s.run) break; await p.waitForTimeout(2000); }
  console.log('race set:', JSON.stringify(await state()));
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(900);
  m = await menu(); const iE = m ? m.findIndex(x => x.id === 'rmEdit') : -1, iX = m ? m.findIndex(x => x.id === 'rmEnd') : -1;
  ok(iX >= 0, 'race set, before the gun: End race is in the list'); ok(iE >= 0 && iX === iE + 1, 'End race is directly below Edit this course', m ? m.map(x => x.t).join(' / ') : '');
  ok(!!m && m.every(x => x.left >= 0 && x.right <= 393 && x.top >= 0 && x.bottom <= 852), 'the whole list is on the screen', m ? 'list ' + m[0].top + ' to ' + m[m.length - 1].bottom + ' of 852' : '');
  await shot('2-menu-race-set');
  await p.evaluate(() => { document.getElementById('raceMenu').hidden = true; });
  /* RACE, and the gun in real time */
  await p.evaluate(() => { const b = [...document.querySelectorAll('.fsmode button')].find(e => /RACE/.test(e.innerText)); if (b) b.click(); }); await p.waitForTimeout(2500);
  for (let i = 0; i < 260; i++) { const s = await state(); if (s.gun !== null && s.gun < -25) break; if (s.gun === null) break; await p.waitForTimeout(2000); }
  /* the start screen and anything else over the chart is closed as a user would */
  await p.evaluate(() => { ['solStartX', 'solCardX'].forEach(id => { const e = document.getElementById(id); if (e && e.getClientRects().length) e.click(); }); }); await tap('#panelX'); await p.evaluate(() => { const h = [...document.querySelectorAll('#solSeq button, #solSeq a')].find(e => /Hide/.test(e.innerText) && e.getClientRects().length); if (h) h.click(); });
  await p.waitForTimeout(2500); console.log('after the gun:', JSON.stringify(await state()));
  await shot('3-racing');
  console.log('round buttons, racing, buttons showing:', JSON.stringify(await fabs()));
  /* AP: clear the button row */
  await p.evaluate(() => { const b = document.getElementById('navClearBtn'); if (b) b.click(); }); await p.waitForTimeout(4000);
  let f = await fabs(); console.log('round buttons, CLEAR:', JSON.stringify(f)); await shot('4-clear');
  if (f) { const gap = f.chartBottom - f.lowest, covered = f.barTop !== null ? Math.max(0, f.chartBottom - f.barTop) : 0;
    ok((await state()).clear, 'the button row is cleared');
    if (f.inRow) { ok(f.tops.length === 1, 'the round buttons are in one straight row', 'tops ' + f.tops.join(',')); ok(gap - covered >= 0 && gap - covered <= 16, 'the row sits on the bottom of the map', 'row foot ' + f.lowest + ', map foot ' + f.chartBottom + ', bar covers ' + covered + ' px of the map: ' + (gap - covered) + ' px clear'); }
    else ok(f.lefts.length === 1, 'the round buttons are in one straight column up the edge', 'lefts ' + f.lefts.join(','));
    ok(!f.off.length, 'none of them is off the edge', f.off.join(',')); ok(f.barTop === null || f.lowest <= f.barTop + 1 || f.lowest <= f.chartBottom, 'none of them is under the foot bar'); }
  await p.evaluate(() => { const b = document.getElementById('navMenuBtn'); if (b && b.getClientRects().length) b.click(); }); await p.waitForTimeout(3000);
  f = await fabs(); console.log('round buttons, buttons back:', JSON.stringify(f)); await shot('5-buttons-back');
  /* C6: after the gun, End race, one tap arms, a wait disarms, two taps end */
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(900);
  m = await menu(); ok(!!m && m.some(x => x.id === 'rmEnd'), 'racing: End race is in the list', m ? m.map(x => x.t).join(' / ') : 'menu not open'); await shot('6-menu-racing');
  await tap('#rmEnd', 600); m = await menu(); ok(!!m && (m.find(x => x.id === 'rmEnd') || {}).t === 'Tap again to end', 'one tap: the button asks for a second tap', m ? (m.find(x => x.id === 'rmEnd') || {}).t : ''); await shot('7-tap-again');
  ok((await state()).gun !== null, 'one tap does not end the race');
  await p.waitForTimeout(4600); m = await menu(); ok(!!m && /End race/.test((m.find(x => x.id === 'rmEnd') || {}).t || ''), 'left alone for four seconds it goes back to End race', m ? (m.find(x => x.id === 'rmEnd') || {}).t : 'menu closed');
  if (!m) { await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(900); }
  await tap('#rmEnd', 500); await tap('#rmEnd', 3000);
  const s2 = await state(); ok(s2.cleared === true && !s2.live && !s2.routes, 'two taps end the race: chart clear, GPS stopped, routes gone', JSON.stringify(s2)); const said = await p.evaluate(() => { const e = [...document.querySelectorAll('#busy, #prog, #navToast, .busy')].find(x => x.getClientRects().length && /Race ended/.test(x.innerText)); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 200) : document.body.innerText.match(/Race ended[^\n]{0,160}/) ? document.body.innerText.match(/Race ended[^\n]{0,160}/)[0] : null; }); ok(!!said, 'it says the race is ended', said); ok(await p.evaluate(() => document.getElementById('raceMenu').hidden), 'the list closes');
  await shot('8-ended');
  await p.evaluate(() => document.getElementById('raceBtn').click()); await p.waitForTimeout(1200); m = await menu();
  ok(!!m && !m.some(x => x.id === 'rmEnd'), 'race ended: End race has left the list', m ? m.map(x => x.t).join(' / ') : 'menu not open'); await shot('9-menu-after-end');
  ok(!errs.length, 'no script errors', errs.join(' ; ').slice(0, 200));
  console.log('c6ap ' + TAG + ': ' + pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('STOPPED', e.message.slice(0, 400)); process.exit(2); });
