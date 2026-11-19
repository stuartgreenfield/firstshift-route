/* F45 (Stuart 18 Nov 07:40, Q&A): time to the line allows for the turn needed to reach it (tack or gybe seconds, typed until learnt),
   beating when the line is upwind (wider at slow speed, from the polar), and speeding up by wind speed (a typed table).
   Run: node tests/f45-maths.js http://localhost:8779 [/channel-area/?race=cowes-dinard] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATH = process.argv[3] || '/channel-area/?race=cowes-dinard';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
(async () => {
  const b = await chromium.launch(); let la = 50.770, lo = -1.300;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: la, longitude: lo, accuracy: 5 }, permissions: ['geolocation'] });
  await ctx.addInitScript(init); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + PATH, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsGun && window.FSSolent && window.__fsLineSet, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => window.__fsGun(Math.round(Date.now() / 1000) + 9 * 60));
  /* a line running east-west, 400 m long, 0.3 nm north of the boat */
  await p.evaluate(() => { window.__fsSetLine('boat', 50.775, -1.297); window.__fsSetLine('pin', 50.775, -1.3027); });
  const cdp = await ctx.newCDPSession(p); const put = (sog, cog) => cdp.send('Emulation.setGeolocationOverride', { latitude: la, longitude: lo, accuracy: 5, speed: sog * 1852 / 3600, heading: cog });
  await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l.getAttribute('aria-pressed') !== 'true') l.click(); });
  /* sailing south (away from the line) at 6 kn: the line is behind, so a turn is needed */
  for (let i = 0; i < 10; i++) { la -= 6 / 3600 / 60; await put(6, 180); await p.waitForTimeout(1000); }
  const w = await p.evaluate(() => { const st = window.FSSolent.state(); return { twd: (window.__fsWindAt(50.772, -1.30) || {}).twd }; });
  const sm0 = await p.evaluate(() => window.FSSolent.startNow());
  /* Stuart 16:55: with nothing typed or learnt, a tack costs one boat length, a gybe a quarter */
  await p.evaluate(() => window.__fsLoa(10)); await put(6, 180); await p.waitForTimeout(3500);
  const tl = await p.evaluate(() => { const s = document.getElementById('solStartScr'); return s ? s.textContent.replace(/\s+/g, ' ') : ''; });
  /* E3 (Stuart 19 Nov 17:35): 4 / 2 / 3 boat lengths in light / medium / strong, a gybe a quarter; the seconds are those lengths at 6 kn (3.087 m/s) */
  const mt = /\+(\d+(?:\.\d)?) s to (tack|gybe) \((one|[\d.]+) boat lengths?/.exec(tl), nL = mt ? (mt[3] === 'one' ? 1 : +mt[3]) : 0;
  ok(mt && Math.abs(+mt[1] - nL * 10 / (6 * 0.5144)) <= (/\./.test(mt[1]) ? 0.15 : 0.6), '10 m boat at 6 kn, nothing typed: the turn costs its boat lengths at 6 kn (2 lengths in medium wind: 6.5 s; 4 in light air: 13 s)', mt ? mt[0] : tl.slice(0, 300));
  await p.evaluate(() => { window.__fsLineSet(); const e = document.getElementById('kitTk'); e.value = '12'; e.dispatchEvent(new Event('change')); const g = document.getElementById('kitGy'); g.value = '9'; g.dispatchEvent(new Event('change')); document.getElementById('klX').click(); });
  await put(6, 180); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => { const s = document.getElementById('solStartScr'); return s ? s.textContent.replace(/\s+/g, ' ') : ''; });
  const want = w.twd != null ? (Math.abs(((180 - w.twd) % 360 + 540) % 360 - 180) < 90 ? 'tack' : 'gybe') : null;
  ok(want && new RegExp('\\+' + (want === 'tack' ? 12 : 9) + ' s to ' + want).test(txt), 'line behind the boat: the ' + want + ' seconds are added to the time to the line', { twd: w.twd, txt: txt.slice(0, 400) });
  const sm1 = await p.evaluate(() => window.FSSolent.startNow());
  ok(sm0 && sm1 && sm1.burn != null && sm0.burn != null && sm0.burn - sm1.burn > 5, 'time to burn drops by the turn', { before: sm0 && sm0.burn, after: sm1 && sm1.burn });
  /* speeding up by wind: table 8 kn 20 s, 20 kn 10 s */
  await p.evaluate(() => { window.__fsLineSet(); const es = document.querySelectorAll('.kitAccW'); es[0].value = '20'; es[0].dispatchEvent(new Event('change')); es[3].value = '10'; es[3].dispatchEvent(new Event('change')); document.getElementById('klX').click(); const st = window.FSSolent.state(); st.accMode = 'wind'; });
  ok(await p.evaluate(() => { const st = window.FSSolent.state(); return st.accW[0] === 20 && st.accW[3] === 10; }), 'speed-up table saved');
  ok(!p.errs.length, 'no script errors', p.errs.slice(0, 3)); await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
