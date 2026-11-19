/* A practice race as a committee would lay it (screen audit A2, A17, A22, A26; Stuart 19 Nov 03:37, 03:55).
   Run: node tests/test-mode-real.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const page = async (b, type) => { const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  if (type) await p.evaluate(t => FSSolent.set({ type: t }), type);
  await p.click('#solCardT'); await p.waitForTimeout(3000); return p; };
(async () => { const b = await chromium.launch();
  /* round the cans, no course of the crew's own */
  let p = await page(b, null);
  const r = await p.evaluate(() => { const s = FSSolent.state(), c = window.__navCourse(), pts = [c.start].concat(c.marks || [], c.finish ? [c.finish] : []); let nm = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], q = pts[i], k = Math.cos(a.lat * Math.PI / 180); nm += Math.hypot((q.lat - a.lat) * 60, (q.lon - a.lon) * 60 * k); }
    const t = document.getElementById('solStartScr'), bias = t && t.innerText.replace(/\s+/g, ' ').match(/(\d+)° off square/); return { type: s.type, marks: (c.marks || []).length, nm: +nm.toFixed(2), off: bias ? +bias[1] : (t && /0° off square|square/i.test(t.innerText) ? 0 : null) }; });
  ok(r.off != null && r.off <= 8, 'The practice line is laid nearly square to the wind (a few degrees of bias)', r.off);
  ok(r.type === 'marks' && r.marks >= 2 && r.nm > 2 && r.nm < 5, 'Round the cans practice course: short (2 to 5 nm), at least two marks', r);
  const legs = await p.evaluate(() => { const s = document.body.innerText; return /beat/i.test(s); }); ok(legs, 'The first leg is a beat');
  /* x20: the race clock keeps up with the boat */
  await p.evaluate(() => { const g = Math.round(Date.now() / 1000 + 3); window.__fsGun(g); FSSolent.set({ startAt: g }); }); await p.waitForTimeout(5000);
  await p.evaluate(() => { FSSolent.em().x = 20; }); await p.waitForTimeout(30000);
  const k = await p.evaluate(() => ({ sim: FSSolent.em().t, race: Date.now() / 1000 - FSSolent.state().startAt }));
  ok(Math.abs(k.race - k.sim) < Math.max(30, 0.1 * k.sim), 'At x20 the race clock matches the boat\'s sailing time', { sim: Math.round(k.sim), race: Math.round(k.race) });
  ok(p.errs.length === 0, 'No script errors (round the cans)', p.errs.slice(0, 2)); await p.context().close();
  /* windward-leeward chosen, no line and no course: a windward-leeward is sailed */
  p = await page(b, 'wl');
  const w = await p.evaluate(() => { const s = FSSolent.state(), c = window.__navCourse(); return { type: s.type, first: c && c.marks && c.marks[0] && c.marks[0].name }; });
  ok(w.type === 'wl' && /windward/i.test(w.first || ''), 'Windward-leeward chosen: the practice race is a windward-leeward', w);
  ok(p.errs.length === 0, 'No script errors (windward-leeward)', p.errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
