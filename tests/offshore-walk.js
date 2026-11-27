/* The offshore walk (Stuart 27 Nov 2026 14:13: "a complete test of all four (a course set and started, inshore and offshore, the logic
   flow)"). The partner of tests/mark-walk.js, for Route and Route+ on a phone upright (412 by 840, as the Mark walk): a new user opens
   the Fastnet page, goes through the set-up card (the boat, then the class start 11 to 12 minutes off), taps Route, waits for the routes,
   taps RACE, goes back to ROUTE and to RACE again, watches the start screen open at 10 minutes, closes it, goes through 5, 4 and 1 minute, the gun goes, the plotter is opened, ROUTE and RACE are tapped while racing. The
   The gun comes in real time (nothing is jumped), so a run takes about 15 minutes. The phone's GPS is stood in for by a boat 0.3 nm
   from the line, drifting at half a knot before the gun and making 6.5 kn down the western Solent after it. At each step it prints what is
   on the screen and where, saves a picture, and after the gun it watches for boxes that move by themselves. It judges nothing by
   itself except script errors: the lines and the pictures are read by a person.
   Run (through tools/probe/with78.sh): node tests/offshore-walk.js http://localhost:8779 route [outdir]
                                         node tests/offshore-walk.js http://localhost:8778 routeplus [outdir] */
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8779', TAG = process.argv[3] || 'route', OUT = process.argv[4] || '/tmp/claude-0/probe';
fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 412, height: 840 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', timezoneId: 'Europe/London' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  await c.addInitScript(() => { /* a moving boat for the phone's GPS, one fix a second (as tests/plotter.js) */
    window.__fake = { la: 50.7745, lo: -1.2990, sog: 0.5, cog: 300, go: true };
    const step = () => { const f = window.__fake; if (!f.go) return; const d = f.sog / 3600 / 60, R = Math.PI / 180; f.la += d * Math.cos(f.cog * R); f.lo += d * Math.sin(f.cog * R) / Math.cos(f.la * R); };
    setInterval(step, 1000);
    const fx = () => ({ coords: { latitude: window.__fake.la, longitude: window.__fake.lo, accuracy: 5, speed: window.__fake.sog * 0.514444, heading: window.__fake.cog, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
    const g = { getCurrentPosition: ok => setTimeout(() => ok(fx()), 50), watchPosition: ok => setInterval(() => ok(fx()), 1000), clearWatch: id => clearInterval(id) };
    Object.defineProperty(navigator, 'geolocation', { get: () => g }); });
  const p = await c.newPage(); let errs = 0; p.on('pageerror', e => { errs++; console.log('ERR', e.message); });
  const vis = () => p.evaluate(() => { const v = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0;
    const st = [...document.querySelectorAll('.fsmode button')].map(e => e.innerText.replace(/\s+/g, ' ').trim() + (e.classList.contains('on') ? '*' : '')).join(' | ');
    const ids = ['splash', 'wiz', 'setupCard', 'prog', 'panel', 'races', 'solSeq', 'solStartScr', 'solGunBar', 'solRaceBtns', 'solGun', 'fsPlot', 'navPlot', 'navStrip', 'lhPop', 'cbanner', 'liveBig', 'readyChip', 'solTestBar', 'navPracTag', 'sheet'];
    const pill = document.querySelector('.fsmodepill'), toast = document.getElementById('navToast');
    let live = null, gun = null, mode = null; try { live = window.__navLiveState().on; } catch (e) {} try { gun = window.__fsGunAt(); } catch (e) {} try { mode = document.body.classList.contains('fsrace') ? 'race' : document.body.classList.contains('fsplan') ? 'plan' : null; } catch (e) {}
    return 'switch[' + st + '] mode ' + mode + ' · GPS ' + (live ? 'on' : 'off') + ' · gun ' + (gun ? Math.round(gun - Date.now() / 1000) + ' s away' : 'not chosen') + ' · shown: ' + ids.filter(i => v(document.getElementById(i))).map(i => { const r = document.getElementById(i).getBoundingClientRect(); return i + '@' + Math.round(r.top) + '-' + Math.round(r.bottom); }).join(' ') +
      (v(pill) ? ' · pill: ' + pill.innerText.replace(/\s+/g, ' ').slice(0, 80) : '') + (v(toast) ? ' · toast: ' + toast.innerText.replace(/\s+/g, ' ').slice(0, 140) : ''); });
  const txt = (id, n) => p.evaluate(a => { const e = document.getElementById(a[0]); return e && e.getClientRects().length ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, a[1]) : null; }, [id, n || 260]);
  const shot = async n => { await p.screenshot({ path: OUT + '/offshore-' + TAG + '-' + n + '.png' }); };
  const tapSel = async (q, wait) => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return [b.left + b.width / 2, b.top + b.height / 2, top === e || e.contains(top) ? '' : 'covered by ' + (top ? (top.id ? '#' + top.id : top.tagName + '.' + top.className) : 'nothing')]; }, q); if (!r) { console.log('   NOT ON SCREEN: ' + q); return false; } if (r[2]) console.log('   NOTE ' + q + ' is ' + r[2]); await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(wait || 2200); return true; };
  const samp = async (secs, tag) => { const L = await p.evaluate(async secs => { const ids = ['fsPlot', 'navPlot', 'lhPop', 'navStrip', 'solSeq', 'solGun', 'solGunBar', 'solRaceBtns', 'navPracTag', 'cbanner', 'prog', 'readyChip'], log = {}, t0 = performance.now(); for (let i = 0; i < secs * 10; i++) { ids.forEach(id => { const e = document.getElementById(id); const k = !e || !e.getClientRects().length ? 'hidden' : (function () { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); })(); const A = log[id] = log[id] || []; if (!A.length || A[A.length - 1][1] !== k) A.push([Math.round((performance.now() - t0) / 100) / 10, k]); }); await new Promise(r => setTimeout(r, 100)); } return log; }, secs); let moves = 0; for (const k in L) if (L[k].length > 1 || L[k][0][1] !== 'hidden') { moves += L[k].length - 1; console.log('   ' + tag + ' ' + k + ': ' + (L[k].length - 1) + ' moves: ' + L[k].slice(0, 16).map(x => x[0] + 's ' + x[1]).join(' | ')); } return moves; };

  /* 0 first open */
  await p.goto(BASE + '/fastnet/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  console.log('0 first open:', await vis()); await shot('00-first-open');
  if (await p.evaluate(() => { const n = document.getElementById('spTourNo'); return !!(n && n.getClientRects().length); })) { await tapSel('#spTourNo', 1500); console.log('0b "Show me round?" answered No:', await vis()); await shot('00b-after-tour-question'); }
  console.log('   version on the page:', await p.evaluate(() => (document.getElementById('dataChip') || {}).textContent || ''));

  /* 1 the set-up card a new user is given: Boat, then Start. The class start goes to 11 minutes from now. */
  console.log('1 set-up card:', await txt('setupCard', 320));
  if (await tapSel('[data-su="boat"]', 1800)) { console.log('1a Boat tapped:', await vis()); await shot('01-a-boat');
    await p.fill('#boatName', 'Walk Boat'); await p.dispatchEvent('#boatName', 'change'); await p.fill('#tcc', '1.031'); await p.dispatchEvent('#tcc', 'input'); await p.dispatchEvent('#tcc', 'change'); await p.waitForTimeout(500); await shot('01-a2-boat-typed');
    if (!(await tapSel('#setDone', 2000))) await tapSel('#sheetX', 2000); console.log('   boat saved; set-up card:', await txt('setupCard', 320)); }
  const gunAt = new Date(Math.ceil((Date.now() + 11.3 * 60000) / 60000) * 60000), hh = String(gunAt.getHours()).padStart(2, '0') + ':' + String(gunAt.getMinutes()).padStart(2, '0');
  let startSet = false;
  if (await tapSel('[data-su="start"]', 1800)) { console.log('1b Start tapped:', await vis());
    console.log('   window "' + await txt('wizH', 40) + '": ' + await txt('wizBody', 260)); await shot('01-b-start');
    if (await p.$('#wzTime')) { await p.fill('#wzTime', hh); await p.dispatchEvent('#wzTime', 'input'); await p.dispatchEvent('#wzTime', 'change'); await p.waitForTimeout(500); console.log('   class start typed: ' + hh + ' (11 to 12 minutes off). It says:', await txt('wzFit', 220)); await shot('01-b2-start-typed'); startSet = true; }
    await tapSel('#wizNext', 2000); }
  console.log('1c after the set-up:', await vis()); console.log('   set-up card:', await txt('setupCard', 320));
  console.log('   course:', await p.evaluate(() => { try { const c = window.__navCourse(); return c ? c.name + ', ' + (c.marks || []).length + ' marks' : 'none'; } catch (e) { return 'error ' + e.message; } }), '· start typed:', startSet); await shot('01-c-after-setup');
  const st0 = await p.evaluate(() => { const f = window.__navFc && window.__navFc(); return { run: !!(f && f.running), fins: document.querySelectorAll('#finBox .fin').length, btn: (document.getElementById('suRoute') || {}).textContent || null, dis: !!(document.getElementById('suRoute') || {}).disabled }; });
  if (!st0.run && !st0.fins) { console.log('   routing has not started by itself; the card\'s button reads "' + st0.btn + '"' + (st0.dis ? ' (greyed)' : '')); if (st0.btn && !st0.dis) await tapSel('#suRoute', 1500); } else console.log('   routing started by itself');

  /* 2 the first routes (the finer passes go on for minutes; the walk does not wait for them, as a crew would not) */
  const t0 = Date.now(); let first = null;
  for (let i = 0; i < 45; i++) { const s = await p.evaluate(() => { const f = window.__navFc && window.__navFc(); return { sel: !!(f && f.sel), run: !!(f && f.running), fins: document.querySelectorAll('#finBox .fin').length, note: (document.getElementById('runNote') || {}).textContent || '' }; }); if (s.fins && first === null) { first = (Date.now() - t0) / 1000; console.log('   first route card after ' + first.toFixed(0) + ' s: ' + s.note.slice(0, 120)); } if (s.fins && (/Refining|Routed in/.test(s.note) || !s.run)) break; await p.waitForTimeout(2000); }
  console.log('2 first routes after ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s:', await vis());
  console.log('   route cards:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#finBox .fin')].map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 60)))));
  console.log('   progress card:', await txt('prog', 160)); console.log('   plan line:', await txt('now', 200)); await shot('02-routes');
  const toGun = () => p.evaluate(() => { const g = window.__fsGunAt(); return g ? g - Date.now() / 1000 : null; });
  const waitTo = async secs => { for (;;) { const r = await toGun(); if (r === null || r <= secs) return; await p.waitForTimeout(Math.min(5000, Math.max(200, (r - secs) * 1000))); } };

  /* 3 to 5 RACE with the gun more than 10 minutes off, back to ROUTE, RACE again */
  await tapSel('.fsmode [data-m="race"]', 3500); console.log('3 RACE tapped, gun more than 10 minutes off:', await vis()); await shot('03-race-before-gun');
  console.log('   countdown box:', await txt('solSeq', 160)); console.log('   race buttons:', await txt('solRaceBtns', 160)); console.log('   live line:', await txt('now', 200));
  await tapSel('.fsmode [data-m="plan"]', 2500); console.log('4 ROUTE tapped:', await vis()); await shot('04-route-again');
  await tapSel('.fsmode [data-m="race"]', 3500); console.log('5 RACE tapped again:', await vis()); await shot('05-race-again');

  /* 5b the start screen should open by itself 10 minutes before the gun (Settings, Start and manoeuvres) */
  let opened = null; for (let i = 0; i < 400; i++) { const r = await toGun(); if (await p.evaluate(() => { const e = document.getElementById('solStartScr'); return !!(e && !e.hidden && e.getClientRects().length); })) { opened = r; break; } if (r < 570) break; await p.waitForTimeout(500); }
  console.log('5b start screen ' + (opened !== null ? 'opened by itself with the gun ' + Math.round(opened) + ' s away' : 'DID NOT OPEN by 9 min 30 s before the gun') + ':', await vis()); console.log('   start screen says:', await txt('solStartScr', 300)); await shot('05b-start-screen');
  /* 5c its ✕: back to the chart; what is left to count the start down, and RACE tapped to see whether the start screen comes back */
  const closed = await p.evaluate(() => { const s = document.getElementById('solStartScr'); if (!s) return 'no start screen'; const x = [...s.querySelectorAll('button')].find(b => /^[✕×]$/.test(b.innerText.trim()) || /close/i.test(b.getAttribute('aria-label') || '')); if (!x) return 'no ✕ found'; const r = x.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (Array.isArray(closed)) { await p.touchscreen.tap(closed[0], closed[1]); await p.waitForTimeout(2500); console.log('5c start screen closed with its ✕:', await vis()); console.log('   countdown box:', await txt('solSeq', 160)); console.log('   race buttons:', await txt('solRaceBtns', 200)); await shot('05c-start-screen-closed');
    const back = await p.evaluate(() => { const b = [...document.querySelectorAll('#solSeq button, #solRaceBtns button')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ').trim()); return b; }); console.log('   buttons there:', JSON.stringify(back));
    await tapSel('.fsmode [data-m="race"]', 2500); console.log('5d RACE tapped with the start screen closed:', await vis()); } else console.log('5c', closed);
  /* 5e through the signals */
  for (const [secs, name] of [[300, '5 minutes'], [240, '4 minutes'], [60, '1 minute']]) { if ((await toGun()) < secs) continue; await waitTo(secs - 2); console.log('5e ' + name + ' to the gun:', await vis()); console.log('   start screen says:', await txt('solStartScr', 120)); console.log('   countdown box:', await txt('solSeq', 120)); await shot('05e-' + name.replace(' ', '-')); }

  /* 6 the gun, in real time: the boat sets off down the western Solent */
  await waitTo(0.5); await p.evaluate(() => { Object.assign(window.__fake, { sog: 6.5, cog: 255, go: true }); }); await p.waitForTimeout(5500); console.log('6a 5 s after the gun:', await vis()); console.log('   countdown box:', await txt('solSeq', 120)); await shot('06a-gun');
  await waitTo(-45); console.log('6 45 s after the gun:', await vis()); await shot('06-after-gun');
  console.log('   live line:', await txt('now', 220)); console.log('   countdown box:', await txt('solSeq', 120)); console.log('   race buttons:', await txt('solRaceBtns', 160));
  let moves = await samp(25, 'racing');

  /* 7 the plotter */
  const plotId = await p.evaluate(() => document.getElementById('navPlotBtn') ? 'navPlot' : 'fsPlot'); const plotOn = await p.evaluate(id => { const e = document.getElementById(id); return !!(e && !e.hidden && e.getClientRects().length); }, plotId);
  if (!plotOn) { if (!(await p.evaluate(id => { const e = document.getElementById(id + 'Btn'); return !!(e && e.getClientRects().length); }, plotId))) { console.log('   the button row has cleared by itself (one minute untouched, as set): MENU tapped to bring it back'); await tapSel('#navMenuBtn', 1500); } await tapSel('#' + plotId + 'Btn', 3000); } console.log('7 plotter ' + (plotOn ? '(already open)' : 'opened') + ':', await vis()); console.log('   plotter says:', await txt(plotId, 300)); await shot('07-plotter'); moves += await samp(15, 'plotter');

  /* 8 and 9 ROUTE and RACE while racing */
  await tapSel('.fsmode [data-m="plan"]', 2500); console.log('8 ROUTE tapped while racing:', await vis()); await shot('08-route-while-racing');
  await tapSel('.fsmode [data-m="race"]', 3500); console.log('9 RACE tapped to get back:', await vis()); await shot('09-back-to-race'); moves += await samp(15, 'back');

  /* 10 the panel tabs while racing: Routes, Plan, Fleet, Data */
  console.log('10 panel tabs:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.tab[data-tab]')].filter(e => e.getClientRects().length).map(e => e.textContent.trim()))));
  console.log('RESULT ' + TAG + ': ' + errs + ' script errors, ' + moves + ' box moves while watched');
  await b.close(); process.exit(errs ? 1 : 0); })().catch(e => { console.log('WALK STOPPED: ' + e.message.slice(0, 300)); process.exit(2); });
