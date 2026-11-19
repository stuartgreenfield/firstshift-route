/* E3 for Mark and Mark+ (Stuart 19 Nov 17:35, "Keep both"; "4 / 2 / 3"): a tack costs 4, 2 or 3 boat lengths in light, medium and
   strong wind (light under 8 kn, strong over 16 kn), a gybe a quarter of that, as the time to sail those lengths at the speed sailed.
   The test boat loses that time in each tack. Hand check: 10 m boat, 12 kn (medium), 2 lengths = 20 m; at 5.6 kn (2.88 m/s) about 6.9 s.
   Run: node tests/e3-turn.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const page = async (b) => { const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => FSSolent.set({ loa: 10 })); await p.click('#solCardT'); await p.waitForTimeout(3000); return p; };
const race = async (p, tws) => { await p.evaluate((tws) => { const e = FSSolent.em(); e.base = { twd: e.base.twd, tws }; const g = Math.round(Date.now() / 1000 + 2); window.__fsGun(g); FSSolent.set({ startAt: g }); }, tws); await p.waitForTimeout(4000);
  await p.evaluate(() => { FSSolent.em().x = 20; }); await p.waitForTimeout(40000);
  return p.evaluate(() => { const L = FSSolent.em().log, out = []; L.forEach((q, i) => { if (q[0] !== 'tack' && q[0] !== 'gybe') return; const nx = L.slice(i + 1).find(z => z[0] === 'p'); out.push({ k: q[0], s: q[2], bsp: nx ? nx[6] : null }); }); return out; }); };
(async () => { const b = await chromium.launch();
  let p = await page(b); let T = await race(p, 12);
  const t1 = T.filter(q => q.k === 'tack'); ok(t1.length > 0, 'Medium wind (12 kn): the test boat tacks', T.slice(0, 3));
  const m1 = t1.map(q => q.s * q.bsp * 0.5144); ok(t1.length && m1.every(m => Math.abs(m - 20) < 3), 'Medium wind: each tack costs the time to sail 2 boat lengths (20 m) at the speed sailed', m1.map(m => +m.toFixed(1)));
  ok(p.errs.length === 0, 'No script errors (medium)', p.errs.slice(0, 2));
  p = await page(b); T = await race(p, 6);
  const t2 = T.filter(q => q.k === 'tack'), m2 = t2.map(q => q.s * q.bsp * 0.5144);
  ok(t2.length && m2.every(m => Math.abs(m - 40) < 5), 'Light wind (6 kn): each tack costs 4 boat lengths (40 m)', m2.map(m => +m.toFixed(1)));
  ok(p.errs.length === 0, 'No script errors (light)', p.errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
