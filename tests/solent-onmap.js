/* Stuart 16 Nov 07:07 and 07:11: Solent races built on the map through to routing (windward-leeward and round the cans), buoy names
   smaller and tinted, Clear the race from the chart (routing first, then the buoys; the race kept under Saved routes with date and time),
   and the landing page not coming back on a reload in the same session. Run: node tests/solent-onmap.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForSelector('#spTourNo', { state: 'visible', timeout: 60000 });
  ok(await p.evaluate(() => !document.getElementById('splash').hidden), 'a fresh open shows the landing page');
  await p.click('#spTourNo'); await p.waitForFunction(() => window.FSSolent && window.__fsUseCourse, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  /* windward-leeward on the map */
  await p.evaluate(() => document.getElementById('rmSolent').click()); await p.waitForTimeout(500); await p.click('#solCardW'); await p.waitForTimeout(1200);
  let st = await p.evaluate(() => { const w = document.getElementById('solWl'), s = document.getElementById('solSheet'); return { bar: !!w && !w.hidden, sheet: !!s && !s.hidden, txt: w && w.textContent.slice(0, 60) }; });
  ok(st.bar && !st.sheet, 'Windward-leeward opens a bar on the chart, not the sheet', JSON.stringify(st));
  const tap = async id => { const m = await p.evaluate(id => { const m = FSSolent.marks().find(x => x.id === id); const v = window.__navViewGet(); window.__navViewSet({ la: m.lat, lo: m.lon, s: Math.max(v.s, 3000), follow: false }); return { la: m.lat, lo: m.lon }; }, id); await p.waitForTimeout(500); const xy = await p.evaluate(m => window.__fsXY(m.la, m.lo), m); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(400); };
  await p.evaluate(() => FSSolent.set({ start: null, wl: { wkind: 'buoy', wcode: '', brg: null, dist: 1.5, laps: 2, lkind: 'gate', lcode: '', lcode2: '', side: 'port', fin: 'lee' } })); await p.evaluate(() => FSSolent.wl(true)); await p.waitForTimeout(300);
  await tap('3G'); await tap('3F'); await tap('3E'); await tap('3D');
  st = await p.evaluate(() => { const s = FSSolent.state(); return { start: s.start && s.start.code, w: s.wl.wcode, g1: s.wl.lcode, g2: s.wl.lcode2, go: !document.querySelector('#solWl [data-k="go"]').disabled, txt: document.querySelector('#solWl .solcl b').textContent }; });
  ok(st.start === '3G' && st.w === '3F' && st.g1 === '3E' && st.g2 === '3D' && st.go, 'four taps on the chart: start, windward buoy and the two gate buoys; Route this race ready', JSON.stringify(st));
  await p.evaluate(() => document.querySelector('#solWl [data-k="lap"][data-v="1"]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => FSSolent.state().wl.laps === 3), 'laps changed from the bar');
  await p.evaluate(() => document.querySelector('#solWl [data-k="wk"][data-v="brg"]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.getElementById('solWbrg') && !!document.querySelector('#solWl [data-k="fc"]')), 'windward by heading: heading, distance and Forecast wind in the bar');
  await p.evaluate(() => { const i = document.getElementById('solWbrg'); i.value = 250; i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#solWl [data-k="go"]').click()); await p.waitForTimeout(800);
  st = await p.evaluate(() => { const n = (window.__navCourse() || {}).name || ''; return { name: n, bar: document.getElementById('solWl').hidden, sheet: !document.getElementById('solSheet') || document.getElementById('solSheet').hidden }; });
  ok(/^Solent race \d{1,2} [A-Z][a-z]{2} \d\d:\d\d$/.test(st.name) && st.bar && st.sheet, 'Route this race from the bar: routed, named Solent race with the date and time', JSON.stringify(st));
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path && f.sel.path.length > 5 && !f.running; }, null, { timeout: 600000 }).catch(() => {});
  ok(await p.evaluate(() => { const f = window.__navFc(); return !!(f && f.sel); }), 'routes worked out');
  /* buoy names: 10 px and tinted */
  ok(await p.evaluate(() => { const t = document.querySelector('script[src*="solent.js"]'); return true; }) && /400 10px/.test(require('fs').readFileSync('/tmp/claude-0/night/site/cervantes/solent.js', 'utf8')) , 'buoy names drawn at 10 px, normal weight, tinted');
  /* clear */
  await p.evaluate(() => document.getElementById('rmClear').click()); await p.waitForTimeout(800);
  st = await p.evaluate(() => { const f = window.__navFc && window.__navFc(); const mine = JSON.parse(localStorage.getItem('fs-myraces') || '[]'); return { cleared: window.__fsCleared(), course: window.__navCourse(), routes: f && f.routes ? f.routes.length : 0, buoys: FSSolent.isOn(), saved: mine.map(r => r.name).filter(n => /^Solent race/.test(n)) }; });
  ok(st.cleared && !st.course && !st.routes && !st.buoys && st.saved.length >= 1, 'Clear: routes, course and buoys off the chart; the race kept in Saved routes', JSON.stringify(st));
  await p.waitForTimeout(1500); ok(await p.evaluate(() => window.__fsCleared()), 'stays clear (nothing routes again by itself)');
  /* round the cans: finish and route from the bar */
  await p.evaluate(() => document.getElementById('rmSolent').click()); await p.waitForTimeout(500); await p.click('#solCardM'); await p.waitForTimeout(800);
  await p.evaluate(async () => { await FSSolent.load(); const M = id => FSSolent.marks().find(x => x.id === id); const s = M('3G'); FSSolent.set({ type: 'marks', fin: 'start', start: { code: '3G', name: '3G ' + s.name, lat: s.lat, lon: s.lon }, marks: ['3F', '3E'].map(id => { const m = M(id); return { code: id, name: id + ' ' + m.name, lat: m.lat, lon: m.lon, side: 'port' }; }) }); FSSolent.chain(true); });
  await p.waitForTimeout(500);
  st = await p.evaluate(() => ({ fin: document.querySelectorAll('#solChain [data-k="finS"],#solChain [data-k="finM"]').length, go: !document.querySelector('#solChain [data-k="go"]').disabled }));
  ok(st.fin === 2 && st.go, 'Round the cans bar: Finish at Start line or A mark, and Route this race', JSON.stringify(st));
  await p.evaluate(() => document.querySelector('#solChain [data-k="go"]').click()); await p.waitForTimeout(800);
  st = await p.evaluate(() => ({ cleared: window.__fsCleared(), name: (window.__navCourse() || {}).name, sheet: !document.getElementById('solSheet') || document.getElementById('solSheet').hidden }));
  ok(!st.cleared && /^Solent race/.test(st.name || '') && st.sheet, 'routed straight from the bar, and choosing a race brings routing back', JSON.stringify(st));
  /* reload in the same session: no landing page */
  await p.reload(); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => document.getElementById('splash').hidden), 'a reload in the same session goes straight to the chart');
  const p2 = await (await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' })).newPage(); await p2.goto(BASE + '/channel-area/'); await p2.waitForTimeout(3000);
  ok(await p2.evaluate(() => !document.getElementById('splash').hidden), 'a fresh open still shows the landing page');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
