/* The Solent tactician screen (Stuart 15 Nov 11:39, 17:32): a Tactician view on the deck screen with the shift against the 10-minute
   mean as Lift or Header for the tack, the wind trace, the next mark, and the re-route trigger as a slider in view.
   Run: node tests/tact.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 800, height: 1280 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/mark/');   /* Solent racing moved to Mark+ (17 Nov), so the Tactician view is there */ await p.waitForFunction(() => window.NavTact && window.FSDeck !== undefined || (window.NavTact && document.getElementById('fsDeckBtn')), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const v = await p.evaluate(() => [NavTact.verdict(8, 40).w, NavTact.verdict(8, -40).w, NavTact.verdict(-8, -40).w, NavTact.verdict(-8, 40).w, NavTact.verdict(8, 150).w, NavTact.verdict(1, 40).w]);
  ok(v.join(',') === 'Lift,Header,Lift,Header,Go deeper,Steady', 'upwind: a veer lifts on starboard and heads on port, a back the reverse; downwind it says go deeper or head up; under 2° steady', v.join(', '));
  await p.evaluate(() => { localStorage.setItem('fs-solent', JSON.stringify({ on: true })); if (window.FSSolent) FSSolent.on(true); NavTact.clear(); const t = Date.now(); for (let i = 120; i > 1; i--) NavTact.push({ t: t - i * 5000, d: 220 + Math.sin(i / 9) * 2, s: 12, a: 40 }); NavTact.push({ t: t - 3000, d: 229, s: 12, a: 40 }); });
  await p.evaluate(() => document.getElementById('fsDeckBtn').click()); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const e = document.getElementById('tcView'); return { shown: !!e && !e.hidden, view: (document.getElementById('dkView') || {}).textContent, big: e && e.querySelector('.tcbig b') && e.querySelector('.tcbig b').textContent, txt: e && e.textContent.slice(0, 200), trace: !!(e && e.querySelector('svg path')), slider: !!document.getElementById('tcShift') }; });
  ok(r.shown && /Tactician/.test(r.view), 'with a Solent race the deck screen opens on the Tactician view', r.view);
  ok(r.big === 'Lift' && /Veer \d+° on starboard/.test(r.txt) && r.trace, 'it shows the shift as Lift with veer and tack, and the wind trace', r.txt.slice(0, 80));
  await p.evaluate(() => { const s = document.getElementById('tcShift'); s.value = 15; s.oninput(); }); await p.waitForTimeout(200);
  const s2 = await p.evaluate(() => ({ C: window.__navRoute.C.shift, out: document.getElementById('tcShiftV').textContent, kept: JSON.parse(localStorage.getItem('nav-route') || '{}').shift }));
  ok(s2.C === 15 && s2.out === '15°' && s2.kept === 15, 'the re-route slider in view sets the same trigger as Settings, and is kept', JSON.stringify(s2));
  await p.evaluate(() => document.getElementById('dkView').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('tcView').hidden), 'VIEW moves on to the chart and the tactician view goes');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
