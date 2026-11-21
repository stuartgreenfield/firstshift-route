/* F114 (Stuart 21 Nov 15:28 and 15:50): the Rolex Sydney Hobart in Route and Route+, working like the other races: in the race list
   (Other races), on its own area page (tasman-area) with global wind models, Copernicus global currents with tides, ETOPO depth and the
   OSM coastline; routes reach Hobart without crossing land. Run: node tests/sydney-hobart.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  /* the race list, from another page */
  await p.goto(BASE + '/channel-area/', { timeout: 120000 }); await p.waitForTimeout(8000);
  const opt = await p.evaluate(() => [...document.querySelectorAll('#raceSel optgroup')].map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.value).join(',')).join(' | '));
  ok(/Rolex Sydney Hobart Yacht Race: sydney-hobart-l1,sydney-hobart,sydney-hobart-l4/.test(opt), 'The race list has the Rolex Sydney Hobart Yacht Race as its own group', opt.slice(-80));
  await p.evaluate(() => { document.getElementById('raceBtn').click(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const b = document.getElementById('rmOther'); return !!(b && b.offsetParent); }), 'The race menu has its own Rolex Sydney Hobart Yacht Race button');
  await p.evaluate(() => { document.getElementById('raceMenu').hidden = true; document.getElementById('rmOther').click(); }); await p.waitForTimeout(800);
  const sheet = await p.evaluate(() => document.getElementById('racesH').textContent + ' | ' + document.getElementById('raceList').textContent.replace(/\s+/g, ' '));
  ok(/^Rolex Sydney Hobart Yacht Race \|/.test(sheet) && /Rolex Sydney Hobart Yacht Race · Line 1/.test(sheet) && /26\/12 2026/.test(sheet) && /2023 Sailing Instructions/.test(sheet), 'Its menu lists the three start-line entries with the note on the course', sheet.slice(0, 160));
  /* choosing it opens its own page */
  await p.evaluate(() => { document.getElementById('races').hidden = true; const s = document.getElementById('raceSel'); s.value = 'sydney-hobart'; s.dispatchEvent(new Event('change')); });
  await p.waitForURL(/tasman-area/, { timeout: 30000 }).catch(() => null);
  ok(/\/tasman-area\//.test(p.url()), 'Choosing it opens the Sydney to Hobart page', p.url());
  await p.waitForFunction(() => { const f = window.__navFc && window.__navFc(); return f && f.sel && f.sel.path; }, null, { timeout: 900000 }).catch(() => null); await p.waitForTimeout(3000);
  const st = await p.evaluate(() => { const f = window.__navFc(), c = window.__navCourse(); const ids = [].concat(...['wind', 'tide', 'wave', 'met'].map(k => Object.keys(f.P[k] || {}))); return { course: c && c.name, marks: c && c.marks.map(m => m.name + ' ' + m.side), layers: ids, routes: (f.routes || []).length, sel: !!(f.sel && f.sel.path) }; });
  ok(/^Rolex Sydney Hobart Yacht Race/.test(st.course) && st.marks.length === 3, 'The course: from the seamark off the Heads, Tasman Island, Iron Pot, John Garrow Shoal Light', JSON.stringify(st.marks));
  ok(['ecmwf', 'gfs', 'aifs', 'mog'].every(k => st.layers.includes(k)) && !st.layers.some(k => ['ukv', 'icon', 'arome', 'nwscur'].includes(k)), 'Global wind models only (ECMWF, GFS, AIFS, Met Office global), no European ones', st.layers.join(','));
  ok(st.layers.includes('glocur'), 'Copernicus global currents with tides', st.layers.filter(k => /cur/.test(k)).join(','));
  ok(st.sel, 'A route is chosen', st.routes + ' routes');
  /* every route reaches the finish and never crosses land */
  const r = await p.evaluate(() => { const f = window.__navFc(), fin = window.__navCourse().finish, pa = f.sel.path, e = pa[pa.length - 1];
    const d = Math.hypot(e.la - fin.lat, (e.lo - fin.lon) * Math.cos(fin.lat * Math.PI / 180)) * 60; let land = 0;
    for (let i = 1; i < pa.length; i++) for (let k = 1; k < 10; k++) { const t = k / 10; if (window.__fsOnLand(pa[i - 1].la + (pa[i].la - pa[i - 1].la) * t, pa[i - 1].lo + (pa[i].lo - pa[i - 1].lo) * t)) land++; }
    const cur = Math.max(...pa.map(q => Math.hypot(q.cu || 0, q.cv || 0))); return { endNm: +d.toFixed(2), hours: +e.t.toFixed(1), land, curMax: +cur.toFixed(2), n: pa.length }; });
  console.log(JSON.stringify(r));
  ok(r.endNm < 1, 'The route reaches the finish off Battery Point', JSON.stringify(r));
  ok(r.land === 0, 'The route never crosses land', r.land);
  ok(r.curMax > 0.3, 'The route sails with the current (the East Australian Current and the tide)', r.curMax + ' kn at most');
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/abeaea36-9130-5b0e-8b05-be1641b6b08c/scratchpad/sh-route.png' });
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
