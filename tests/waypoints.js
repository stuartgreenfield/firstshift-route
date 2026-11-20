/* Stuart 15 Nov 2026 (job K; Q&A 13:40): the waypoint store (My marks, grown) and the measuring tool.
   Run: node tests/waypoints.js http://localhost:8769 (Route) or http://localhost:8768 (Navigate) */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3] || '/tmp/claude-0/sh';
const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block', acceptDownloads: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-measfull', '1'); /* the full ruler box (compact by default since 20:30; measure-label.js checks that) */ localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-mymarks', JSON.stringify([{ name: 'Old mark', lat: 50.75, lon: -1.3 }])); }
  });
  const ready = () => p.waitForFunction(() => window.__fsPlan && window.__fsPlan() && window.FSWpt && window.__fsMeasure && document.getElementById('fsRulerBtn'), null, { timeout: 300000 });
  await p.goto(BASE + '/channel-area/'); await ready(); await p.waitForTimeout(800);
  // positions typed in every usual way
  const ps = await p.evaluate(() => ['50 46.58N 001 21.46W', "50°46.58'N 1°21.46'W", '50.776333 -1.357667', '50 46 34.8N 1 21 27.6W', 'nonsense'].map(t => window.FSWpt.parse(t)));
  ok(ps.slice(0, 4).every(q => q && Math.abs(q.lat - 50.776333) < 1e-4 && Math.abs(q.lon + 1.357667) < 1e-4) && ps[4] === null, 'positions typed as degrees and minutes, with symbols, as decimals, or with seconds all read the same; nonsense is refused', JSON.stringify(ps[1]));
  // open the sheet from Settings, Chart
  await p.evaluate(() => document.getElementById('wptOpen').click()); await p.waitForTimeout(400);
  const old = await p.evaluate(() => document.getElementById('wptBody').textContent);
  ok(/Old mark/.test(old), 'Open my waypoints shows the marks saved before (My marks grown, nothing lost)');
  await p.click('[data-a="new"]'); await p.fill('#wpN', 'Gurnard test'); await p.fill('#wpP', '50 46.22N 001 18.84W'); await p.selectOption('#wpT', 'mark'); await p.fill('#wpNo', 'test note'); await p.click('[data-a="save"]'); await p.waitForTimeout(300);
  const l1 = await p.evaluate(() => window.FSWpt.list());
  ok(l1[0].name === 'Gurnard test' && l1[0].type === 'mark' && Math.abs(l1[0].lat - (50 + 46.22 / 60)) < 1e-5 && l1[0].notes === 'test note', 'add a waypoint with a name, typed position, type and notes', JSON.stringify(l1[0]));
  // import GPX and CSV
  const n1 = await p.evaluate(() => window.FSWpt.importText('<gpx><wpt lat="50.735" lon="-1.42"><name>West Solent</name><desc>narrows</desc></wpt><wpt lat="50.66" lon="-1.6"><name>Bridge</name></wpt></gpx>', 'a.gpx'));
  const n2 = await p.evaluate(() => window.FSWpt.importText('name,lat,lon\nBrambles,50 46.80N,001 16.20W\nPeel,50.7582,-1.2225', 'b.csv'));
  const names = await p.evaluate(() => window.FSWpt.list().map(m => m.name));
  ok(n1 === 2 && n2 === 2 && ['West Solent', 'Bridge', 'Brambles', 'Peel'].every(x => names.includes(x)), 'import from GPX and from CSV', names.join(', '));
  // export GPX
  await p.evaluate(() => window.FSWpt.open({})); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="exp"]')]); const fp = await dl.path(); const g = fs.readFileSync(fp, 'utf8');
  ok(/<gpx/.test(g) && /<name>Gurnard test<\/name>/.test(g) && (g.match(/<wpt /g) || []).length === names.length, 'export to GPX for a plotter', dl.suggestedFilename() + ', ' + (g.match(/<wpt /g) || []).length + ' waypoints');
  // build a course from waypoints and route it
  const idx = await p.evaluate(() => { const a = window.FSWpt.list().map(m => m.name); return ['West Solent', 'Gurnard test', 'Brambles'].map(n => a.indexOf(n)); });
  for (const i of idx) { await p.click('[data-c="' + i + '"]'); await p.waitForTimeout(150); }
  await p.selectOption('[data-cs="1"]', 'starboard'); await p.waitForTimeout(100);
  await p.click('[data-a="route"]'); await p.waitForTimeout(1500);
  const rt = await p.waitForFunction(() => { const c = window.__navCourse && window.__navCourse(); return c && /West Solent to Brambles/.test(document.getElementById('raceTitle').textContent) && window.__fsPlan() && c.marks.length === 1 && !(window.__navFc() || {}).running && !(window.__navFc() || {}).sel.partial ? (() => { const pl = window.__fsPlan().path, q = pl[pl.length - 1], f = c.finish; return { m: c.marks[0].name + ' ' + c.marks[0].side, n: pl.length, togo: +(Math.hypot((q[0] - f.lat) * 60, (q[1] - f.lon) * 60 * Math.cos(f.lat * Math.PI / 180))).toFixed(2) }; })() : null; }, null, { timeout: 240000 }).then(h => h.jsonValue()).catch(() => null);
  ok(rt && rt.m === 'Gurnard test starboard' && rt.n > 3 && rt.togo < 0.6, 'a course built from waypoints in order, the mark to starboard, routes as normal to the finish', JSON.stringify(rt));
  // the chart shows the waypoints; the tap box offers Save as waypoint
  await p.evaluate(() => { const v = window.__navViewGet(); window.__navViewSet({ la: 50.75, lo: -1.35, s: 4000, follow: false }); }); await p.waitForTimeout(500);
  const tp = await p.evaluate(() => window.__fsScr(50.735, -1.42));
  await p.mouse.click(tp[0], tp[1]); await p.waitForTimeout(500);
  const tipB = await p.evaluate(() => !!document.querySelector('#tipBody [data-w="save"]') && !!document.querySelector('#tipBody [data-w="ruler"]'));
  ok(tipB, 'tapping the chart offers Save as waypoint and Measure from here');
  await p.click('#tipBody [data-w="save"]'); await p.waitForTimeout(300);
  const pre = await p.evaluate(() => document.getElementById('wpP').value);
  ok(/^50°44\.\d\d'N 001°25\.\d\d'W$/.test(pre), 'Save as waypoint fills in the position tapped', pre);
  await p.click('#wptX');
  // the ruler: drag from one waypoint to another
  await p.click('#fsRulerBtn'); await p.waitForTimeout(200);
  const a = await p.evaluate(() => { const m = window.FSWpt.list().find(x => x.name === 'Gurnard test'); return window.__fsScr(m.lat, m.lon); });
  const z = await p.evaluate(() => window.__fsScr(50.70, -1.40));
  const v0 = await p.evaluate(() => JSON.stringify(window.__navViewGet()));
  await p.mouse.move(a[0] + 4, a[1] + 3); await p.mouse.down(); await p.mouse.move((a[0] + z[0]) / 2, (a[1] + z[1]) / 2, { steps: 4 }); await p.mouse.move(z[0], z[1], { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(500);
  const v1 = await p.evaluate(() => JSON.stringify(window.__navViewGet()));
  const st = await p.evaluate(() => { const s = window.FSWpt.state(); return { from: s.m && s.m.a.what, r: s.m && s.m.r, box: (document.getElementById('fsMeas') || {}).textContent || '' }; });
  ok(v0 === v1, 'with the ruler on, dragging measures instead of moving the chart');
  ok(st.from === 'Gurnard test', 'the line snaps to the waypoint it starts on', st.from);
  const r = st.r; const want = (() => { const la0 = 50 + 46.22 / 60, lo0 = -(1 + 18.84 / 60), dy = (50.70 - la0) * 60, dx = (-1.40 - lo0) * 60 * Math.cos((la0 + 50.70) / 2 * Math.PI / 180); return { nm: Math.hypot(dx, dy), brg: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360 }; })();
  ok(r && Math.abs(r.nm - want.nm) < 0.03 && Math.abs(r.brg - want.brg) < 1.5, 'bearing and distance', r && r.brg.toFixed(1) + '° ' + r.nm.toFixed(2) + ' nm (expected ' + want.brg.toFixed(1) + '° ' + want.nm.toFixed(2) + ')');
  ok(r && r.tws > 0 && r.bsp > 0 && r.sog > 0 && r.hours > 0 && /kn from/.test(st.box) && /Boat speed/.test(st.box) && /VMC/.test(st.box), 'wind, polar boat speed, VMC and time from the forecasts and your polar', st.box.slice(0, 160));
  ok(r && /^(beat|run|fetch|reach)$/.test(r.kind) && (r.tack ? /Includes \d+ (tack|gybe)/.test(st.box) && r.other != null : true), 'says fetch, reach, beat or run; on a beat or run, both headings and the time with tacks or gybes', r && r.kind + (r.tack ? ' ' + Math.round(r.hdg) + '/' + Math.round(r.other) : ''));
  ok(r && r.tide != null && /Tide .* kn to/.test(st.box), 'the tide along the line', (st.box.match(/Tide[^]*?(?=Crosses|Save|$)/) || [''])[0].slice(0, 80));
  // a beat: measure straight into the wind
  /* 20 Nov: the line is laid into the wind at its own middle (the ruler reads the wind there), with the tide chart off for these two checks,
     so a strong cross tide on the day of the test cannot make the leg fetchable on one tack */
  await p.evaluate(() => { window.__tideWas = document.getElementById('tideSel').value; document.getElementById('tideSel').value = '';
    window.__upLine = () => { let w = window.__fsMeasure(50.70, -1.45, 50.70, -1.4499).twd, la1, lo1; for (let i = 0; i < 4; i++) { la1 = 50.70 + 2 * Math.cos(w * Math.PI / 180) / 60; lo1 = -1.45 + 2 * Math.sin(w * Math.PI / 180) / 60 / Math.cos(50.7 * Math.PI / 180); w = window.__fsMeasure(50.70, -1.45, la1, lo1).twd; } return { la: la1, lo: lo1 }; }; });
  const beat = await p.evaluate(() => { const e = window.__upLine(); return window.__fsMeasure(50.70, -1.45, e.la, e.lo); });
  ok(beat.kind === 'beat' && beat.tack && Math.abs(Math.abs(((beat.hdg - beat.other + 540) % 360) - 180)) > 40, 'straight upwind it is a beat, with two tacking headings', beat.kind + ' ' + Math.round(beat.hdg) + '/' + Math.round(beat.other) + ' VMG ' + beat.sog.toFixed(1));
  // shallow water: across the Shingles
  const sh = await p.evaluate(() => window.__fsMeasure(50.6950, -1.6100, 50.6700, -1.5700).shallow);
  ok(sh === true, 'a line across the Shingles bank warns of shallow water');
  const lt = await p.evaluate(() => [...document.querySelectorAll('.fsmlater tr')].map(r => r.textContent));
  ok(lt.length === 4 && /\+1 h/.test(lt[1]) && /\+3 h/.test(lt[3]), 'the same leg at +1, +2 and +3 hours, with wind, tide along, VMC and time', lt.slice(1).join(' | '));
  const bt = await p.evaluate(() => { const e = window.__upLine(); return window.FSWpt.measure({ la: 50.70, lo: -1.45 }, e); });
  const btxt = await p.evaluate(() => document.getElementById('fsMeas').textContent); await p.evaluate(() => { document.getElementById('tideSel').value = window.__tideWas; });
  ok(bt.nTurns >= 1 && bt.turnS === 60 && Math.abs(bt.hoursAll - bt.hours - bt.nTurns * 60 / 3600) < 1e-9 && /Includes \d+ tacks? at 60 s each/.test(btxt), 'a beat counts its tacks at the Course tab tack loss (60 s each)', bt.nTurns + ' tacks, ' + (bt.hours * 60).toFixed(1) + ' min plus ' + bt.nTurns + ' min');
  await p.screenshot({ path: OUT + '/wpt-measure.png' });
  await p.click('#fsRulerBtn'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !window.FSWpt.state().ruler && document.getElementById('fsMeas').hidden), 'ruler off clears the line');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
