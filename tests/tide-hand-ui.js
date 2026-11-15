/* Tide by hand on screen: the Tide direction slider in "If you think the forecast is wrong", the chart note, and a Solent race's
   tide per leg (the legs table) carried with the race into routing. Run: node tests/tide-hand-ui.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.__fsUseCourse && document.getElementById('adjTdir'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const r1 = await p.evaluate(() => { const e = document.getElementById('adjTdir'); e.value = 30; e.oninput(); return { v: document.getElementById('adjTdirV').textContent, pill: document.getElementById('adjPillTxt').textContent, shown: !document.getElementById('adjPill').hidden }; });
  ok(r1.v === '+30° clockwise' && r1.shown && /tide \+30° clockwise/.test(r1.pill), 'Tide direction slider, labelled, and the chart note says so', JSON.stringify(r1));
  await p.evaluate(() => document.getElementById('adjReset').click());
  ok(await p.evaluate(() => document.getElementById('adjPill').hidden && +document.getElementById('adjTdir').value === 0), 'Back to the forecast clears it');
  await p.evaluate(() => { FSSolent.on(true); FSSolent.set({ type: 'marks', start: { name: 'Start', lat: 50.77, lon: -1.30 }, marks: [{ name: '3G Gurnard', lat: 50.77, lon: -1.35, side: 'port' }], fin: 'start' }); FSSolent.open(); }); await p.waitForTimeout(800);
  const hasSel = await p.evaluate(() => { const s = document.getElementById('solSheet'); return s ? document.querySelectorAll('#solSheet select.soltide').length : -1; });
  ok(hasSel >= 4, 'the Solent legs table has tide strength and direction for each leg', hasSel);
  await p.evaluate(() => { document.querySelectorAll('.sheet').forEach(s => s.hidden = true); window.__fsUseCourse({ name: 'Test Solent race', start: { name: 'Start', lat: 50.77, lon: -1.30 }, marks: [{ name: '3G Gurnard', lat: 50.77, lon: -1.35, side: 'port' }], finish: { name: 'Finish', lat: 50.77, lon: -1.30 }, legTide: [{ p: -30, d: 45 }, null] }); }); await p.waitForTimeout(3000); await p.waitForFunction(() => window.__fsRedraw, null, { timeout: 120000 }); await p.waitForTimeout(4000);
  const pill = await p.evaluate(() => ({ t: document.getElementById('adjPillTxt').textContent, shown: !document.getElementById('adjPill').hidden, course: (window.__navFc && window.__navFc().sel) ? 'routing' : '' }));
  ok(pill.shown && /tide on 1 leg/.test(pill.t), 'a race with tide set on a leg routes with it, and the chart note says so', JSON.stringify(pill));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
