/* Stuart 15 Nov 2026 (job J): the Solent race marks on the chart (Settings, Chart: on/off) and the Solent race builder: a start
   picked from a mark or the chart, marks from the course board each to port or starboard, or a windward-leeward with the windward
   mark a buoy or a heading and distance; routed as normal, with the safety depth.
   Run: node tests/solent.js http://localhost:8769 (Route) or http://localhost:8768 (Navigate) */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3] || '/tmp/claude-0/sh';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
  });
  const ready = () => p.waitForFunction(() => window.FSSolent && window.FSSolent.marks && window.__navViewSet && document.querySelector('#solCard:not([hidden])'), null, { timeout: 300000 });
  await p.goto(BASE + '/mark/'); await ready(); await p.waitForTimeout(1000); await p.evaluate(() => { document.getElementById('solCard').hidden = true; });   /* Mark opens on the course card; this test drives the full Solent sheet */
  ok(await p.evaluate(() => !!document.getElementById('solentOn') && !!document.getElementById('solentBuild')), 'Settings, Chart: the Solent race marks switch and a Build a Solent race button');
  await p.evaluate(() => { const e = document.getElementById('solentOn'); e.checked = true; e.dispatchEvent(new Event('change')); });
  await p.waitForFunction(() => window.FSSolent.marks(), null, { timeout: 30000 });
  const mk = await p.evaluate(() => { const m = window.FSSolent.marks(); const g = m.find(x => x.id === '3G'); return { n: m.length, g, kept: JSON.parse(localStorage.getItem('fs-solent')).on }; });
  const zm = await p.evaluate(() => ({ v: +document.getElementById('zoomMax').value, kept: localStorage.getItem('fs-zoomMax') }));
  ok(zm.v === 6 && zm.kept === '6', 'Solent marks on: the closest zoom is set to the maximum (6 times)', JSON.stringify(zm));
  ok(mk.n === 157 && mk.g && mk.g.name === 'Cowes Week 200' && Math.abs(mk.g.lat - (50 + 46.58 / 60)) < 1e-5 && Math.abs(mk.g.lon + (1 + 21.46 / 60)) < 1e-5 && mk.kept, 'the 157 marks of the JOG / SCRA 2026 list load, positions as printed (3G Cowes Week 200, 50 46.58N 01 21.46W), and the switch is kept', mk.n + ' marks');
  // zoom to Cowes and tap 3G
  await p.evaluate(() => { const v = window.__navViewGet(); window.__navViewSet({ la: 50.775, lo: -1.33, s: v.s * 30 > 60000 ? 60000 : 60 * 60, follow: false }); }); await p.waitForTimeout(600);
  const xy = await p.evaluate(() => window.__fsScr(50 + 46.58 / 60, -(1 + 21.46 / 60)));
  await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(500);
  const pop = await p.evaluate(() => { const e = document.getElementById('solPop'); return e && !e.hidden ? e.textContent : ''; });
  ok(/3G Cowes Week 200/.test(pop) && /50° 46\.58' N/.test(pop) && /001° 21\.46' W/.test(pop), 'tapping a mark shows its code, name and position', pop.slice(0, 90));
  await p.screenshot({ path: OUT + '/solent-marks.png' });
  // the builder: start from a code, marks from the course board
  await p.click('#setBtn').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('solentBuild').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.getElementById('solSheet').hidden && document.getElementById('sheet').hidden), 'Build a Solent race opens the builder (and closes Settings)');
  await p.fill('#solStartCode', '3X'); await p.press('#solStartCode', 'Tab'); await p.waitForTimeout(200);
  await p.fill('#solBoard', '3G p, 3E s 4F'); await p.click('#solBoardGo'); await p.waitForTimeout(200);
  const b1 = await p.evaluate(() => ({ st: window.FSSolent.state().start, m: window.FSSolent.state().marks.map(x => x.code + ':' + x.side), c: window.FSSolent.build(), msg: document.getElementById('solMsg').textContent }));
  ok(b1.st && b1.st.code === '3X' && b1.m.join(' ') === '3G:port 3E:starboard 4F:port', 'start from its code; the course board sets the marks in order with their sides (port when not given)', b1.m.join(' '));
  ok(b1.c.finish && /start line/.test(b1.c.finish.name) && b1.c.marks.length === 3 && /Ready: 3 marks/.test(b1.msg), 'the course: start, three marks, finish at the start line', b1.msg);
  const shn = await p.evaluate(() => (document.getElementById('solShallow') || {}).textContent || '');
  ok(/3X/.test(shn) && !/3G|3E|4F/.test(shn.replace(/0\.\d+ nm/g, '')), 'inshore marks the depth data reads shallow (3X off Cowes) are named, with what the router does near them', shn.slice(0, 120));
  const bad = await p.evaluate(() => window.FSSolent.board('3G p 9Q 99 xx'));
  ok(bad.marks.length === 1 && bad.bad.join(',') === '9Q,99', 'codes not on the list are named, not guessed', bad.bad.join(','));
  const sms = await p.evaluate(() => window.FSSolent.board('Class 2 course: Start, 3G (P), 4F S, 2B P, Finish. Good luck!').marks.map(m => m.code + ':' + m.side).join(' '));
  ok(sms === '3G:port 4F:starboard 2B:port', 'a course pasted from a VHF note, text or WhatsApp message: only the mark codes and sides are taken', sms);
  const legs = await p.evaluate(() => [...document.querySelectorAll('.soltab tbody tr')].map(r => r.textContent));
  ok(legs.length === 4 && /3G Cowes Week 200/.test(legs[0]), 'a table of legs with bearing and distance', legs[0]);
  // pick a mark on the chart: Add a mark, then tap 4F
  await p.click('[data-pick="mark"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('solPick').hidden && document.getElementById('solSheet').hidden), 'Add a mark on the chart: the builder steps aside with a Tap the next mark bar');
  const xy2 = await p.evaluate(() => { const m = window.FSSolent.marks().find(x => x.id === '3W'); return window.__fsScr(m.lat, m.lon); });
  await p.mouse.click(xy2[0] + 3, xy2[1] - 2); await p.waitForTimeout(400);
  const b2 = await p.evaluate(() => window.FSSolent.state().marks.map(x => x.code));
  ok(b2.join(' ') === '3G 3E 4F 3W' && !(await p.evaluate(() => document.getElementById('solSheet').hidden)), 'tapping a mark adds it to the course and brings the builder back', b2.join(' '));
  await p.click('[data-del="3"]'); await p.waitForTimeout(200);
  // depth box is the safety depth
  await p.fill('#solDepth', '2.5'); await p.press('#solDepth', 'Tab'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__fsDepth() === 2.5 && +document.getElementById('depth').value === 2.5), 'the depth box sets the safety depth used by the router', await p.evaluate(() => window.__fsDepth()));
  await p.screenshot({ path: OUT + '/solent-builder.png' });
  // route it
  await p.click('#solGo'); await p.waitForTimeout(1500);
  const card = await p.evaluate(() => document.getElementById('raceTitle').textContent);
  ok(/Solent race/.test(card), 'Route this race: the course becomes the race on screen', card);
  await p.evaluate(() => { const b = document.querySelector('#card [data-act="route"], #cardGo, #runBtn'); if (b) b.click(); });
  const got = await p.waitForFunction(() => { const pl = window.__fsPlan(); return pl && /Solent/.test(pl.name || document.getElementById('raceTitle').textContent) && window.__navCourse && window.__navCourse().marks.length === 3; }, null, { timeout: 240000 }).then(() => true).catch(() => false);
  if (!got) await p.evaluate(() => { if (window.__fsRun) window.__fsRun(); });
  await p.waitForTimeout(3000);
  const rt = await p.evaluate(() => { const pl = window.__fsPlan(), c = window.__navCourse(); if (!pl || !c) return null; const near = (m) => Math.min.apply(null, pl.path.map(q => Math.hypot(q[0] - m.lat, (q[1] - m.lon) * Math.cos(m.lat * Math.PI / 180)) * 60)); return { n: pl.path.length, marks: c.marks.map(m => m.name + ' ' + m.side), near: c.marks.map(near).map(x => +x.toFixed(2)), mine: JSON.parse(localStorage.getItem('fs-myraces') || '[]').map(r => r.name) }; });
  ok(rt && rt.n > 5 && rt.near.every(x => x < 0.3), 'it is routed as normal: the route goes round each mark', rt && JSON.stringify({ points: rt.n, nearest: rt.near }));
  ok(rt && rt.marks.join('|') === '3G Cowes Week 200 port|3E The Boss starboard|4F Royal Thames port', 'with each mark to the side chosen', rt && rt.marks.join(' | '));
  ok(rt && /^Solent race \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d\d:\d\d$/.test(rt.mine[0]), 'and it is saved in My races with the race date', rt && rt.mine.join(', '));
  await p.screenshot({ path: OUT + '/solent-routed.png' });
  // windward-leeward from a heading and distance, two laps
  await p.evaluate(() => { window.FSSolent.open(); window.FSSolent.set({ type: 'wl', start: { code: '3X', name: '3X Island Sailing Club', lat: 50 + 46.10 / 60, lon: -(1 + 18.43 / 60) }, wl: { wkind: 'brg', brg: 270, dist: 1.2, laps: 2, lkind: 'start', side: 'port', wcode: '', lcode: '' } }); }); await p.waitForTimeout(300);
  const wl = await p.evaluate(() => window.FSSolent.build());
  const w0 = wl.marks[0], st = wl.start, dnm = Math.hypot((w0.lon - st.lon) * Math.cos(st.lat * Math.PI / 180) * 60, (w0.lat - st.lat) * 60);
  ok(wl.marks.length === 3 && /Windward mark, 270°T 1.2 nm/.test(w0.name) && Math.abs(dnm - 1.2) < 0.01 && w0.lon < st.lon, 'windward-leeward: the windward mark 1.2 nm at 270°T from the start; two laps: windward, leeward, windward, then finish at the leeward mark', wl.marks.map(m => m.name).join(' | ') + ' | ' + dnm.toFixed(3) + ' nm');
  await p.evaluate(() => window.FSSolent.set({ wl: Object.assign(window.FSSolent.state().wl, { wkind: 'buoy', wcode: '3E' }) })); await p.waitForTimeout(200);
  const wl2 = await p.evaluate(() => window.FSSolent.build());
  ok(/3E The Boss/.test(wl2.marks[0].name), 'or the windward mark is a buoy', wl2.marks[0].name);
  await p.evaluate(() => window.FSSolent.set({ wl: Object.assign(window.FSSolent.state().wl, { wkind: 'brg' }) })); await p.waitForTimeout(200);
  await p.click('#solFc'); await p.waitForTimeout(400);
  const fc = await p.evaluate(() => ({ brg: window.FSSolent.state().wl.brg, note: document.getElementById('solFcNote').textContent }));
  ok(fc.brg != null && /kn from/.test(fc.note), 'Use the forecast wind puts the windward mark upwind', fc.note);
  await p.screenshot({ path: OUT + '/solent-wl.png' });
  // switched off: no marks drawn, taps go to the chart as before
  await p.evaluate(() => { document.getElementById('solX').click(); window.FSSolent.on(false); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const e = document.getElementById('solPop'); if (e) e.hidden = true; }); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const e = document.getElementById('solPop'); return !e || e.hidden; }), 'with the switch off a tap is the chart\'s again (no mark box)');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
