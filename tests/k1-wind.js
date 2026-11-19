/* K1 (Mark review, 19 Nov 2026): one live wind source for the race. (1) In practice, a wind shift reaches the start screen's wind and bias.
   (2) Mark+: the instrument wind is followed, not frozen on its first reading. (3) A wind typed by hand wins and says so.
   Run: node tests/k1-wind.js http://localhost:8779 (Mark) and http://localhost:8778 (Mark+) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/mark/');
  await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const plus = await p.evaluate(() => !!window.__navFeed);
  /* (1) practice: Wind +10 moves the wind and the bias */
  await p.click('#solCardT'); await p.waitForTimeout(3000);
  const w0 = await p.evaluate(() => { const w = FSSolent.windRef(); return { twd: w && w.twd, src: w && w.src }; });
  ok(w0.twd != null && /simulated/.test(w0.src), 'Practice: the race wind comes from the practice boat, labelled simulated', w0);
  const b0 = await p.evaluate(() => { const t = document.getElementById('solStartScr'); return t && t.innerText.replace(/\s+/g, ' ').match(/BIAS (.*?) (off square|square)/i); });
  await p.evaluate(() => { const x = document.querySelector('[data-em=wplus], [data-em="w+"], [data-em=wr]'); if (x) x.click(); else { const y = [...document.querySelectorAll('#solTestBar button, .soltest button')].find(q => /Wind \+10/.test(q.textContent)); if (y) y.click(); } }); await p.waitForTimeout(3000);
  const w1 = await p.evaluate(() => { const w = FSSolent.windRef(); return { twd: w && w.twd, src: w && w.src }; });
  const d = ((w1.twd - w0.twd + 540) % 360) - 180; ok(d >= 6 && d <= 14, 'Practice: Wind +10° moves the race wind about 10° (the practice wind also swings a few degrees)', [w0.twd, w1.twd]);
  const b1 = await p.evaluate(() => { const t = document.getElementById('solStartScr'); return t && t.innerText.replace(/\s+/g, ' ').match(/BIAS (.*?) (off square|square)/i); });
  ok(b0 && b1 && b0[0] !== b1[0], 'Practice: the start screen bias changes with the shift', [b0 && b0[0], b1 && b1[0]]);
  const lab = await p.evaluate(() => { const t = document.getElementById('solStartScr'); return t && /simulated/i.test(t.innerText); }); ok(lab, 'Practice: the start screen says the wind is simulated');
  await p.evaluate(() => { const y = [...document.querySelectorAll('#solTestBar button, .soltest button')].find(q => /^\s*Stop\s*$/.test(q.textContent)); if (y) y.click(); }); await p.waitForTimeout(2500);
  /* (2) Mark+: instrument wind followed live */
  if (plus) {
    /* a connected boat: Route+'s own practice boat feeds the instruments, and its wind swings a few degrees on its own */
    await p.evaluate(() => window.__navPractice(true)); await p.waitForTimeout(45000);
    const rd = () => p.evaluate(() => { const n = window.__navWind(), w = FSSolent.windRef(); return { nav: n && Math.round(n[1]), ref: w && w.twd, src: w && w.src }; });
    const r = []; for (let k = 0; k < 4; k++) { r.push(await rd()); await p.waitForTimeout(30000); }
    await p.evaluate(() => window.__navPractice(false));
    ok(r.every(x => x.nav != null && x.src === 'boat'), 'Mark+: with a boat connected the race wind is the instruments\' wind, labelled boat', r.map(x => x.src));
    ok(r.every(x => x.nav != null && Math.abs(((x.ref - x.nav + 540) % 360) - 180) <= 1), 'Mark+: the race wind follows the live instrument average at every reading (it froze on the first before)', r.map(x => [x.nav, x.ref]));
    /* and a controlled shift in the instrument average (the interface windRef reads), 230 then 250 */
    const sh = await p.evaluate(async () => { const real = window.__navWind, out = []; window.__navWind = () => [12, 230]; out.push(FSSolent.windRef().twd); window.__navWind = () => [12, 250]; out.push(FSSolent.windRef().twd); window.__navWind = real; return out; });
    ok(sh[0] === 230 && sh[1] === 250, 'Mark+: a 20° shift in the instrument wind reaches the race wind at once (it froze on the first reading before)', sh);
  } else console.log('(Mark: no instruments; the Mark+ checks run on the Route+ server)');
  /* (3) a wind typed by hand wins and is labelled typed */
  await p.evaluate(() => FSSolent.set({ wind: { twd: 200, tws: 10, src: 'typed', at: Date.now() } })); await p.waitForTimeout(800);
  const m = await p.evaluate(() => { const w = FSSolent.windRef(); return w && [w.twd, w.src]; }); ok(m && m[0] === 200 && m[1] === 'typed', 'A wind typed by hand wins over every other source', m);
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
