/* Stuart 15 Nov 2026 (job I): reopen exactly where it left off. Route (and Navigate, which is built on it) closed at sea and opened
   again must come back with the routes, the chart view and zoom, the chart orientation and Live GPS, and if the GPS does not answer,
   the boat carries on by dead reckoning from the last fix kept on the phone. A GPS stopped on purpose leaves nothing to reckon from.
   Run: node tests/reopen.js http://localhost:8769 (Route) or http://localhost:8768 (Navigate) */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8769';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); });
    if (!sessionStorage.getItem('t-once')) { sessionStorage.setItem('t-once', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); }
    const W = {}; let id = 0;
    window.__gps = (la, lo, kn, cog) => Object.values(W).forEach(w => w({ coords: { latitude: la, longitude: lo, accuracy: 5, speed: kn / 1.94384, heading: cog }, timestamp: Date.now() }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => ({ watchPosition: (ok) => { W[++id] = ok; return id; }, clearWatch: (i) => { delete W[i]; }, getCurrentPosition: () => {} }) });
  });
  const ready = () => p.waitForFunction(() => window.__fsPlan && window.__fsPlan() && window.__navViewGet && window.__fsOri, null, { timeout: 300000 });
  await p.goto(BASE + '/channel-area/'); await ready(); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__navLiveOn()); await p.waitForTimeout(500);
  let la = 50.70, lo = -1.60;
  for (let i = 0; i < 4; i++) { await p.evaluate(([a, o]) => window.__gps(a, o, 6, 90), [la, lo]); lo += 6 / 3600 / 60 / Math.cos(la * Math.PI / 180); await p.waitForTimeout(1000); }
  const lastLo = lo - 6 / 3600 / 60 / Math.cos(la * Math.PI / 180), lastAt = Date.now() - 1000;
  await p.click('#oriBtn'); await p.waitForTimeout(300);
  await p.evaluate(() => { const v = window.__navViewGet(); window.__navViewSet({ la: v.la + 0.03, lo: v.lo - 0.05, s: v.s * 2, follow: false }); }); await p.waitForTimeout(2600);
  const before = await p.evaluate(() => ({ v: window.__navViewGet(), ori: window.__fsOri(), plan: window.__fsPlan().path.length, name: window.__fsPlan().name }));
  ok(before.ori === 'course', 'orientation set to course up before closing', before.ori);
  // close and open again at sea, with the GPS not answering
  await p.reload(); await ready();
  const said = await p.waitForFunction(() => /Carried on where you left off/.test((document.getElementById('navToast') || document.getElementById('busy') || {}).textContent || ''), null, { timeout: 15000, polling: 100 }).then(() => true).catch(() => false);
  await p.waitForTimeout(13000);
  const after = await p.evaluate(() => ({ v: window.__navViewGet(), ori: window.__fsOri(), plan: window.__fsPlan() && window.__fsPlan().path.length, name: window.__fsPlan() && window.__fsPlan().name, gps: window.__navLiveState(), dr: window.__fsDR(), sess: !document.getElementById('sessBox').hidden }));
  ok(after.plan === before.plan && after.name === before.name, 'the routes come back as they were', before.name + ' ' + before.plan + ' points, then ' + after.name + ' ' + after.plan);
  ok(Math.abs(after.v.s - before.v.s) < 0.01 * before.v.s && Math.abs(after.v.la - before.v.la) < 1e-6 && Math.abs(after.v.lo - before.v.lo) < 1e-6, 'the chart comes back at the same place and zoom', JSON.stringify(before.v) + ' then ' + JSON.stringify(after.v));
  ok(after.ori === 'course', 'the chart orientation is kept (course up)', after.ori);
  ok(after.gps.on, 'Live GPS is back on by itself');
  ok(!after.sess, 'no "start a new race" question on top when reopened at sea');
  ok(said, 'a note says it carried on where it left off');
  ok(after.dr.active && after.dr.fix && Math.abs(after.dr.fix.since - lastAt) < 3000, 'with no GPS answering, dead reckoning carries on from the last fix kept on the phone, timed from that fix', after.dr.fix && ('since ' + Math.round((Date.now() - after.dr.fix.since) / 1000) + ' s'));
  ok(after.dr.fix && after.dr.fix.lo > lastLo + 0.0005 && Math.abs(after.dr.fix.cog - 90) < 2, 'it has moved on east at the last course and speed', after.dr.fix && (after.dr.fix.lo - lastLo).toFixed(5) + ' deg east, ' + Math.round(after.dr.fix.cog) + '°');
  const box = await p.evaluate(() => (document.querySelector('#liveBox .lvdr') || {}).textContent || '');
  ok(/DEAD RECKONING/.test(box), 'the dead reckoning warning shows after the reopen', box.slice(0, 80));
  await p.evaluate(([a, o]) => window.__gps(a, o, 6, 90), [la, lo + 0.003]); await p.waitForTimeout(800);
  const back = await p.evaluate(() => window.__fsDR());
  ok(!back.active && /GPS back after/.test(back.msg || ''), 'GPS back: the reckoning ends and says how far out it was', back.msg);
  // GPS stopped on purpose, then opened again: nothing old to reckon from
  await p.evaluate(() => document.getElementById('liveBtn').click()); await p.waitForTimeout(500);
  await p.reload(); await ready(); await p.evaluate(() => window.__navLiveOn()); await p.waitForTimeout(13000);
  const st = await p.evaluate(() => window.__fsDR());
  ok(!st.active, 'after stopping the GPS on purpose, a later start does not reckon from the old fix');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
