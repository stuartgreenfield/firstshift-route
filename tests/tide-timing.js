/* Tide timing (Stuart 19 Nov 17:33): "a slider control that moves the timing of the tide in minutes. The amount stays the same but the
   time it applies changes + and -". One setting (Settings, Forecasts, Tide timing; also under Forecast in Mark's tide choice): routes,
   the chart's tide arrows and Mark's start screen all use it. Hand check: with +30 min, the tide at 12:30 is the forecast's tide at 12:00.
   Run: node tests/tide-timing.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const el = await p.evaluate(() => { const e = document.getElementById('adjTtime'), sec = e && e.closest('.sbody'); return e && { min: e.min, max: e.max, step: e.step, sec: sec && sec.id, nextToTide: !!(e.closest('.row').previousElementSibling && e.closest('.row').previousElementSibling.querySelector('#tideSel')) }; });
  ok(el && el.min === '-120' && el.max === '120' && el.step === '5' && el.nextToTide, 'Settings: Tide timing sits under Tidal stream, minus 2 h to plus 2 h in 5 minute steps', el);
  const r = await p.evaluate(() => { const la = 50.78, lo = -1.30, t0 = Math.round(Date.now() / 1000), set = v => { const e = document.getElementById('adjTtime'); e.value = v; e.oninput(); };
    set(0); const a = window.__fsTideAt(la, lo, t0), a30 = window.__fsTideAt(la, lo, t0 + 1800); set(30); const b = window.__fsTideAt(la, lo, t0 + 1800), lbl = document.getElementById('adjTtimeV').textContent; set(-45); const m = window.__fsTideAt(la, lo, t0 - 2700); set(0);
    return { a, a30, b, m, lbl, moved: Math.hypot(a30[0] - a[0], a30[1] - a[1]) }; });
  const same = (x, y) => x && y && Math.abs(x[0] - y[0]) < 1e-9 && Math.abs(x[1] - y[1]) < 1e-9;
  ok(same(r.a, r.b) && same(r.a, r.m), '+30 min: the tide at 12:30 is the forecast tide at 12:00; −45 min: at 11:15 it is 12:00 (rates unchanged, only the time moves)', r);
  ok(/\+30 min later/.test(r.lbl), 'The slider reads "+30 min later"', r.lbl);
  const rt = await p.evaluate(() => { const C = (la, lo, t) => [Math.sin(t), Math.cos(t)], A = FSRouter.adjust({ wind: () => [10, 200], tide: C }, { ttime: 0.5 }); return [A.tide(50.7, -1.3, 3)[0], Math.sin(2.5)]; });
  ok(Math.abs(rt[0] - rt[1]) < 1e-12, 'Routes: the engine applies the same shift (adjust, ttime 0.5 h)', rt);
  await p.click('#solCardT'); await p.waitForTimeout(3000);
  await p.evaluate(() => { const e = document.getElementById('adjTtime'); e.value = 20; e.oninput(); }); await p.waitForTimeout(2500);
  const tx = await p.evaluate(() => (document.getElementById('solStartScr') || {}).innerText || '');
  ok(/forecast \+20 min/.test(tx), 'Mark start screen: the TIDE box says "forecast +20 min"', (tx.match(/TIDE[\s\S]{0,60}/) || [''])[0]);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 2));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
