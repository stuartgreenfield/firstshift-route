/* Stuart 15 Nov 2026 (10:54 sketch, Q&A 12:40): the deck screen. Four big numbers 2 by 2 above the view in portrait and beside it in
   landscape; the crew picks each figure; trend arrow, one-minute average and target colour; the view below steps through Chart,
   Routes, Plan, Fleet and Data by a button or a swipe; a DECK button on the chart; kept when reopened.
   Run: node tests/deck.js http://localhost:8769 (Route) or http://localhost:8768 (Navigate) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769', OUT = process.argv[3] || '/tmp/claude-0/sh';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    const W = {}; let id = 0;
    window.__gps = (la, lo, kn, cog) => Object.values(W).forEach(w => w({ coords: { latitude: la, longitude: lo, accuracy: 5, speed: kn / 1.94384, heading: cog }, timestamp: Date.now() }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => ({ watchPosition: (ok) => { W[++id] = ok; return id; }, clearWatch: (i) => { delete W[i]; }, getCurrentPosition: () => {} }) });
  });
  const ready = () => p.waitForFunction(() => window.__fsPlan && window.__fsPlan() && window.FSDeck && document.getElementById('fsDeckBtn'), null, { timeout: 300000 });
  await p.goto(BASE + '/channel-area/'); await ready(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const b = document.getElementById('fsDeckBtn'); const r = b.getBoundingClientRect(); return r.width >= 40 && r.height >= 40 && b.textContent === '20/20'; }), 'a 20/20 button on the chart (renamed from DECK, 22 Nov), big enough for a wet finger');
  await p.tap('#fsDeckBtn'); await p.waitForTimeout(600);
  const L = () => p.evaluate(() => { const n = document.getElementById('deckNums').getBoundingClientRect(), m = document.getElementById('map').getBoundingClientRect(), bx = [...document.querySelectorAll('.dkbox')].map(e => e.getBoundingClientRect()); return { n: [n.top, n.bottom, n.left, n.right].map(Math.round), m: [m.top, m.bottom, m.left, m.right, m.width, m.height].map(Math.round), boxes: bx.length, bh: Math.round(bx[0].height), bw: Math.round(bx[0].width), sx: document.documentElement.scrollWidth > innerWidth }; });
  const po = await L();
  ok(po.boxes === 4 && po.n[1] <= po.m[0] + 1 && po.m[5] > 200 && po.bh > 70 && !po.sx, 'portrait: four big boxes 2 by 2 above the chart, the chart below fills the rest', JSON.stringify(po));
  // fake GPS: east at 6 kn, then 7 kn
  await p.evaluate(() => window.__navLiveOn()); let la = 50.70, lo = -1.60;
  for (let i = 0; i < 14; i++) { const kn = i < 7 ? 6 : 7.2; await p.evaluate(([a, o, k]) => window.__gps(a, o, k, 90), [la, lo, kn]); lo += kn / 3600 / 60 / Math.cos(la * Math.PI / 180) * 3; await p.waitForTimeout(3000); }
  const v = await p.evaluate(() => [...document.querySelectorAll('.dkbox')].map(b => ({ l: b.querySelector('.dkl').textContent, v: b.querySelector('.dkv').textContent, a: b.querySelector('.dka').textContent, t: b.querySelector('.dkt').textContent })));
  ok(v[0].l === 'SOG' && v[0].v === '7.2' && /1 min [67]\.\d/.test(v[0].a) && v[0].t === '▲', 'box 1 SOG: the big number, the one-minute average and a rising trend arrow', JSON.stringify(v[0]));
  ok(v[1].l === 'HEADING' && v[1].v === '090°', 'box 2 heading (the GPS course when no compass)', JSON.stringify(v[1]));
  ok(v[2].l === 'TO MARK', 'box 3 distance to the mark', JSON.stringify(v[2]));
  const mo = await p.evaluate(() => { const m = document.getElementById('mobBtn').getBoundingClientRect(), n = document.getElementById('deckNums').getBoundingClientRect(), lb = document.getElementById('liveBox'); return { over: m.top < n.bottom && m.bottom > n.top && m.left < n.right && m.right > n.left, vis: m.width > 0, live: getComputedStyle(lb).display }; });
  ok(mo.vis && !mo.over && mo.live === 'none', 'MOB stays in reach but never covers a number; the Live GPS box gives way to the deck numbers', JSON.stringify(mo));
  await p.waitForTimeout(12500);
  const dr = await p.evaluate(() => { const d = document.getElementById('dkDr'); return d && !d.hidden ? d.textContent : ''; });
  ok(/DEAD RECKONING: no GPS for/.test(dr), 'GPS lost on the deck screen: the dead reckoning warning shows above the numbers', dr);
  await p.evaluate(([a, o]) => window.__gps(a, o, 7.2, 90), [la, lo]); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/deck-portrait.png' });
  const tp = await p.evaluate(() => getComputedStyle(document.querySelector('.top')).display);
  await p.tap('#dkMenu'); await p.waitForTimeout(300); const tp2 = await p.evaluate(() => getComputedStyle(document.querySelector('.top')).display);
  await p.tap('#dkMenu'); await p.waitForTimeout(300);
  ok(tp === 'none' && tp2 !== 'none', 'the menus over the chart are hidden on the deck screen; MENU brings them back', tp + ' then ' + tp2);
  // pick a figure for box 4
  await p.tap('.dkbox[data-i="3"]'); await p.waitForTimeout(400);
  const groups = await p.evaluate(() => [...document.querySelectorAll('#dkPick h3')].map(h => h.textContent));
  ok(groups.join(',') === 'SPEED AND COURSE,WIND,MARK,RACE', 'tapping a box offers every figure, in four groups', groups.join(', '));
  await p.tap('#dkPick [data-k="twd"]'); await p.waitForTimeout(1300);
  const b4 = await p.evaluate(() => ({ l: document.querySelector('.dkbox[data-i="3"] .dkl').textContent, fc: document.querySelector('.dkbox[data-i="3"]').classList.contains('dkfc'), v: document.querySelector('.dkbox[data-i="3"] .dkv').textContent, kept: JSON.parse(localStorage.getItem('fs-deck')).boxes[3] }));
  ok(b4.l === 'TWD' && b4.kept === 'twd' && /^\d{3}°$/.test(b4.v), 'box 4 now shows TWD, and the choice is kept', JSON.stringify(b4));
  ok(b4.fc || /Navigate/.test(await p.title()), 'with no boat instruments the wind is marked FORECAST', String(b4.fc));
  // the view: button steps, then a swipe
  await p.tap('#dkView'); await p.waitForTimeout(700);
  const r1 = await p.evaluate(() => ({ v: window.FSDeck.view(), map: getComputedStyle(document.querySelector('.app>.chart')).display, pn: !document.getElementById('panel').hidden && getComputedStyle(document.getElementById('panel')).display !== 'none', tab: (document.querySelector('#panel .tab[aria-selected="true"]') || {}).dataset.tab, label: document.getElementById('dkView').textContent }));
  ok(r1.v === 'decision' && r1.map === 'none' && r1.pn && r1.tab === 'decision' && /Routes/.test(r1.label), 'the VIEW button steps to Routes: the routes panel shows under the numbers', JSON.stringify(r1));
  const nb = await p.evaluate(() => { const r = document.getElementById('deckNums').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.6]; });
  const sw = async (x0, x1, y) => { await p.evaluate(([x0, x1, y]) => { const el = document.elementFromPoint(x0, y), mk = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(x0)], changedTouches: [mk(x0)] })); el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(x1)] })); }, [x0, x1, y]); await p.waitForTimeout(600); };
  await sw(nb[0] + 100, nb[0] - 100, nb[1]);
  ok(await p.evaluate(() => window.FSDeck.view()) === 'plan', 'a swipe left on the numbers steps on to Plan');
  await sw(nb[0] + 100, nb[0] - 100, nb[1]); await sw(nb[0] + 100, nb[0] - 100, nb[1]);
  ok(await p.evaluate(() => window.FSDeck.view()) === 'data', 'and on to Fleet and Data');
  await p.screenshot({ path: OUT + '/deck-data.png' });
  await sw(nb[0] + 100, nb[0] - 100, nb[1]);
  if (await p.evaluate(() => window.FSDeck.view() === 'tact')) await sw(nb[0] + 100, nb[0] - 100, nb[1]);   /* Route+: the Tactician view is in the cycle (15 Nov) */
  ok(await p.evaluate(() => window.FSDeck.view() === 'chart' && getComputedStyle(document.querySelector('.app>.chart')).display !== 'none'), 'and round to the chart again');
  // landscape
  await p.setViewportSize({ width: 915, height: 412 }); await p.waitForTimeout(800);
  const ls = await L();
  ok(ls.n[3] <= ls.m[2] + 1 && ls.m[4] > 400 && ls.bh > 70 && !ls.sx, 'landscape: the four boxes 2 by 2 on the left, the chart on the right', JSON.stringify(ls));
  await p.screenshot({ path: OUT + '/deck-landscape.png' });
  // reopen: still on the deck screen with the same boxes
  await p.reload(); await ready(); await p.waitForTimeout(1500);
  const re = await p.evaluate(() => ({ on: window.FSDeck.on(), boxes: window.FSDeck.boxes().join(','), body: document.body.classList.contains('fsdeck') }));
  ok(re.on && re.body && re.boxes === 'spd,hdg,dtw,twd', 'reopened: the deck screen comes back as it was', JSON.stringify(re));
  await p.tap('#dkExit'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.body.classList.contains('fsdeck') && getComputedStyle(document.getElementById('deckNums')).display === 'none'), 'CHART × goes back to the normal screen');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
