/* Stuart 17 Nov 13:31: the race emulator for Mark and Mark+ test mode. The boat must sail the course as a boat would: never closer to the
   wind than close-hauled, tacking on the laylines, every mark rounded in order, always getting nearer the mark over each leg; on Mark+ the
   instruments must come from the same boat. Run: node tests/mark-sim.js http://localhost:8779 [/mark/] */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block', geolocation: { latitude: 50.77, longitude: -1.30, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const plus = await p.evaluate(() => !!window.NAV_VERSION);
  if (plus) await p.evaluate(() => { try { window.__navPractice(true); } catch (e) {} });   /* as in Stuart's photo: Route+'s practice boat running first */
  await p.evaluate(() => { const x = document.getElementById('solCardX'); if (x && x.offsetParent) x.click(); FSSolent.set({ wind: { twd: 230, tws: 12, src: 'typed', at: Date.now() }, tide: { mode: 'hand', spd: 1.0, dir: 248 } }); FSSolent.test(true); });
  await p.waitForTimeout(1500); await p.evaluate(() => { FSSolent.set({ startAt: Math.round(Date.now() / 1000 + 6) }); if (window.__fsGun) window.__fsGun(FSSolent.state().startAt); });
  if (plus) ok(await p.evaluate(() => !window.__navPracticeOn()), "Mark+: Route+'s practice boat stops while test mode runs");
  await p.waitForTimeout(8000); await p.click('#solTestBar [data-em=spd]'); await p.click('#solTestBar [data-em=spd]'); await p.click('#solTestBar [data-em=spd]');   /* x60 */
  const samples = []; for (let i = 0; i < 160; i++) { await p.waitForTimeout(1000); samples.push(await p.evaluate(() => { const e = FSSolent.em(), f = window.__fsLiveFix && window.__fsLiveFix(); return { i: e.i, mode: e.mode, tacks: e.tacks || 0, last: e.log[e.log.length - 1], fix: f ? [+f.la.toFixed(5), +f.lo.toFixed(5), f.sog && +f.sog.toFixed(1)] : null, p: e.p ? [+e.p.lat.toFixed(5), +e.p.lon.toFixed(5)] : null, inst: window.PL && window.PL.state ? window.PL.state() : null, bar: (document.getElementById('navStrip') || {}).innerText }; })); if (samples[samples.length - 1].i >= 3) break; }
  const L = await p.evaluate(() => FSSolent.em().log.filter(q => q[0] === 'p')), R = await p.evaluate(() => FSSolent.em().log.filter(q => q[0] === 'round').map(q => q[1]));
  console.log('DIST', L.filter((q, j) => j % 8 === 0).map(q => q[1] + ':' + q[3] + ':' + q[4]).join(' '));
  console.log('rounded', JSON.stringify(R), 'tacks', samples[samples.length - 1].tacks, 'steps', L.length);
  ok(R[0] === 1 && R[1] === 2 && R.every((v, j) => v === j + 1), 'the marks are rounded in order', JSON.stringify(R));
  /* over each leg, the distance to the mark falls: never sailing away from it for long (a minute of sim time at most) */
  let worst = 0; const legs = {}; L.forEach(q => { (legs[q[2]] = legs[q[2]] || []).push(q); }); Object.keys(legs).forEach(k => { const a = legs[k]; let run = 0; for (let j = 1; j < a.length; j++) { if (a[j][3] > a[j - 1][3]) run += a[j][1] - a[j - 1][1]; else run = 0; worst = Math.max(worst, run); } });
  ok(worst <= 120, 'the boat never sails away from the mark for more than two minutes', worst + ' s');
  const close = await p.evaluate(() => { const w = 230; return FSSolent.em().log.filter(q => q[0] === 'p').filter(q => Math.abs(((q[4] - w + 540) % 360) - 180) < 38).length; }); ok(close === 0, 'never closer than 38° to the wind (with the shift wobble)', close + ' steps');
  ok(samples.some(s => s.tacks > 0), 'it tacks on the beat', samples[samples.length - 1].tacks);
  const s1 = samples.find(s => s.fix && s.p); ok(s1 && Math.abs(s1.fix[0] - s1.p[0]) < 0.0005 && Math.abs(s1.fix[1] - s1.p[1]) < 0.0008, 'the GPS position on the screen is the emulated boat', JSON.stringify(s1 && [s1.fix, s1.p]));
  if (plus) ok(samples.some(s => /BSP/.test(s.bar || '') && !/No boat data/.test(s.bar || '')), 'Mark+: the instruments show the emulated boat', (samples[samples.length - 1].bar || '').replace(/\s+/g, ' ').slice(0, 120));
  if (plus) { const m2 = samples.filter(s => /(port|starboard) (tack|gybe)/.test(s.mode || '') && /PORT|STBD/.test(s.bar || '')); const bad = m2.filter(s => (/port/.test(s.mode) ? 'PORT' : 'STBD') !== (/PORT/.test(s.bar) ? 'PORT' : 'STBD')); ok(m2.length > 3 && bad.length <= 1, 'Mark+: the instruments show the same tack as the emulated boat', m2.length + ' checked, ' + bad.length + ' differ' + (bad[0] ? ': ' + bad[0].mode + ' / ' + bad[0].bar.replace(/\s+/g, ' ').slice(0, 40) : '')); }
  await p.screenshot({ path: '/tmp/claude-0/ui/m2/sim-' + (plus ? 'plus' : 'mark') + '.png' });
  ok(!errs.length, 'no page errors', errs.join(' | ') || null);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
