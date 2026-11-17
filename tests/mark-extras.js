/* FirstShift Mark: the things that make it the same as Route (Stuart 17 Nov 05:07 to 05:15): the sails logo top left with the colour
   line round it; Route's icon buttons (Layers, Settings) and round buttons (ruler, north up); Route's Layers box with the No-go depth
   control and the buoys, beacons and lights layer (on by default on Mark); Settings with Help, Share, Show me round and Test mode;
   the landing page in Mark's name with the terms. Run: node tests/mark-extras.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1])); await p.goto(BASE + '/mark/');
  /* the landing page */
  await p.waitForSelector('#spTour', { timeout: 60000 }); await p.waitForTimeout(800);
  const sp = await p.evaluate(() => ({ h1: document.querySelector('.sp-txt h1').textContent, p: document.querySelector('.sp-txt > p').textContent, film: getComputedStyle(document.getElementById('spFilm')).display, tour: !!document.getElementById('spTourYes').getClientRects().length }));
  ok(/^Mark/.test(sp.h1) && /inshore/i.test(sp.p), 'the landing page is in Mark\'s name', sp.h1 + ' / ' + sp.p.slice(0, 50));
  ok(sp.tour && sp.film === 'none', 'with Show me round, and no Route film', JSON.stringify(sp));
  await p.click('#spTourNo'); await p.waitForFunction(() => window.FSMark && window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  /* logo and Route's buttons */
  const T = await p.evaluate(() => { const r = q => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(), st = getComputedStyle(e); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), vis: !!e.getClientRects().length && st.display !== 'none' }; };
    return { logo: r('#mkTop .mklogo'), lay: r('#mkLayBtn'), set: r('#mkSetBtn'), layIb: document.getElementById('mkLayBtn').className, setSvg: document.getElementById('mkSetBtn').innerHTML === document.querySelector('#setBtn svg').outerHTML, ruler: r('#fsRulerBtn'), ori: r('#oriBtn'), ring: getComputedStyle(document.querySelector('.mklogo'), '::before').animationName }; });
  ok(T.logo && T.logo.x <= 20 && T.ring === 'mkring', 'sails logo top left, with the colour line round it', JSON.stringify(T.logo));
  ok(T.layIb === 'ib' && T.setSvg, 'Layers and Settings are Route\'s own icon buttons');
  ok(T.ruler && T.ruler.vis && T.ori && T.ori.vis, 'Route\'s round buttons on the chart: ruler and north up', JSON.stringify([T.ruler, T.ori]));
  /* Layers: depth control and the lights layer, on by default */
  await p.click('#mkLayBtn'); await p.waitForTimeout(900);
  const L = await p.evaluate(() => { const l = document.getElementById('layers'); const cm = l.querySelector('input[data-l="cmarks"]'); return { open: !l.hidden, depth: !!l.querySelector('#lDepth'), lights: cm ? cm.checked : null, text: /Buoys, beacons and lights/.test(l.textContent) }; });
  ok(L.open && L.depth, 'Layers opens Route\'s box with the No-go depth control');
  ok(L.text && L.lights === true, 'with buoys, beacons and lights (OpenSeaMap), on by default on Mark', JSON.stringify(L));
  await p.click('#mkLayBtn'); await p.waitForTimeout(400);
  /* the Racing view before the gun: only once the wind is known (Stuart 05:28) */
  await p.evaluate(() => FSMark.set({ tab: 'course', wind: null, gun: Math.round(Date.now() / 1000 + 1200) })); await p.click('#mkTab-race'); await p.waitForTimeout(500);
  const r0 = await p.evaluate(() => FSMark.state().tab);
  await p.evaluate(() => FSMark.set({ wind: { twd: 230, tws: 12 } })); await p.click('#mkTab-race'); await p.waitForTimeout(500);
  const r1 = await p.evaluate(() => FSMark.state().tab);
  ok(r0 === 'course' && r1 === 'race', 'before the gun, Racing opens with a tap only once the wind is given', r0 + ' then ' + r1);
  await p.evaluate(() => FSMark.set({ tab: 'course', gun: null, wind: null }));
  /* Settings: Help, Share, Show me round, Test mode */
  await p.click('#mkSetBtn'); await p.waitForTimeout(400); await p.click('#sheet .stabs .tab[data-s=mark]'); await p.waitForTimeout(300);
  const RS = await p.evaluate(() => ({ open: !document.getElementById('sheet').hidden, tabs: [...document.querySelectorAll('#sheet .stabs .tab')].map(t => t.textContent.trim()), tcc: !!document.getElementById('tcc') }));
  ok(RS.open && RS.tabs[0] === 'Mark' && ['Boat', 'Forecasts', 'Course', 'Sails', 'Display', 'Charts', 'My set-up'].every(x => RS.tabs.includes(x)) && RS.tcc, 'Settings is Route\'s Settings (boat, IRC TCC, polars, forecasts, sails, charts, My set-up) with a Mark tab', RS.tabs.join(', '));
  const S = await p.evaluate(() => [...document.querySelectorAll('#s-mark .xrow .btn')].map(b => b.textContent));
  ok(['Help', 'Share', 'Show me round', 'Test mode'].every(x => S.includes(x)), 'Settings has Help, Share, Show me round and Test mode', S.join(', '));
  await p.click('#s-mark [data-k=help]'); await p.waitForTimeout(400);
  const H = await p.evaluate(() => ({ n: document.querySelectorAll('#mkBody .htopic').length, listen: document.querySelectorAll('#mkBody [data-k=listen]').length, top: document.querySelector('#mkBody .xrow .btn').textContent }));
  ok(H.n >= 12 && H.listen === H.n && /test mode/i.test(H.top), 'Help: Mark\'s topics with Listen, test mode at the top', JSON.stringify(H));
  await p.evaluate(() => { FSSolent.set({ type: 'marks', start: { code: null, name: 'Start point', lat: 50.772, lon: -1.300 }, marks: FSSolent.board('3F P, 2C S').marks }); FSMark.set({ tab: 'share', gun: Math.round(Date.now() / 1000 + 600), wind: { twd: 230, tws: 12 } }); }); await p.waitForTimeout(400);
  const sh = await p.evaluate(() => document.getElementById('mkShareTxt').value);
  ok(/Course: 3F P, 2C S/.test(sh) && /Gun \d\d:\d\d/.test(sh) && /Legs: 1 \d{3}°T/.test(sh), 'Share: the course, the gun and the legs, ready to send', sh.replace(/\n/g, ' / ').slice(0, 160));
  /* the tour walks Mark's screen */
  await p.evaluate(() => FSMark.set({ tab: 'settings' })); await p.click('#s-mark [data-k=tour]'); await p.waitForTimeout(1200);
  const tour = await p.evaluate(() => { const c = document.querySelector('.fst-card, .fst h4'); return c ? c.textContent.slice(0, 80) : null; });
  ok(tour && /Your race/.test(tour), 'Show me round starts the tour on Mark\'s own screen', tour);
  await p.evaluate(() => { try { FSTour.end(); } catch (e) {} }); await p.waitForTimeout(500);
  /* test mode: the practice boat sails the course */
  await p.evaluate(() => FSMark.set({ tab: 'settings' })); await p.click('#s-mark [data-k=test]'); await p.waitForTimeout(4000);
  const t1 = await p.evaluate(() => ({ bar: !!document.getElementById('mkTestBar'), fix: window.__fsLiveFix && window.__fsLiveFix(), tab: FSMark.state().tab, big: (document.getElementById('mkStartBig') || {}).innerText }));
  ok(t1.bar && t1.fix && t1.tab === 'start', 'Test mode: a practice boat on the GPS, the Start panel open', JSON.stringify({ bar: t1.bar, tab: t1.tab, fix: t1.fix && [t1.fix.la.toFixed(4), t1.fix.lo.toFixed(4)] }));
  ok(/TO THE LINE \d+ m/.test((t1.big || '').replace(/\s+/g, ' ')), 'the line figures from the practice boat', (t1.big || '').replace(/\s+/g, ' ').slice(0, 90));
  await p.evaluate(() => { const g = Math.round(Date.now() / 1000 + 2); FSMark.set({ gun: g }); }); await p.waitForTimeout(9000);
  const t2 = await p.evaluate(() => ({ tab: FSMark.state().tab, rb: (document.getElementById('mkRaceBig') || {}).innerText }));
  ok(t2.tab === 'race' && /NEXT MARK/.test(t2.rb || ''), 'after the gun the practice boat races and the panel turns to Race', (t2.rb || '').replace(/\s+/g, ' ').slice(0, 90));
  const rw = (t2.rb || '').replace(/\s+/g, ' ');
  ok(/OFF THE LINE \d+ m/.test(rw) && /BACK ON IT/.test(rw) && /COG · SOG \d{3}°T/.test(rw), 'Racing window, rhumb line: distance off the line, the course back on it, COG and SOG', rw.slice(0, 200));
  await p.click('#mkBody [data-k=follow][data-v=route]'); await p.waitForTimeout(1500);
  const rr = await p.evaluate(() => (document.getElementById('mkBody') || {}).innerText.replace(/\s+/g, ' '));
  ok(/No route yet/.test(rr), 'Racing window, route: says so when the course has not been routed', rr.slice(0, 120));
  await p.click('#mkBody [data-k=follow][data-v=mark]'); await p.waitForTimeout(500);
  await p.click('#mkTestX'); await p.waitForTimeout(1500);
  const t3 = await p.evaluate(() => ({ bar: !!document.getElementById('mkTestBar'), sim: !!(window.__fsLiveFix && window.__fsLiveFix()), marks: FSSolent.state().marks.map(m => m.code).join() }));
  ok(!t3.bar && t3.marks === '3F,2C', 'Stop puts your own course back', JSON.stringify(t3));
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
