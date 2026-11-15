/* First-time guide (Stuart 14 Nov 13:52): Try it safely on the landing page closes it and starts the practice: Route plays the race,
   Navigate starts its practice boat. Run: node tests/try-safely.js <base> */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await c.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/?race=morgan'); await p.waitForTimeout(5000);
  const v = await p.evaluate(() => { const b = document.getElementById('spTry'); if (!b) return null; const q = b.getBoundingClientRect(); return { w: q.width, inView: q.bottom <= innerHeight && q.right <= innerWidth, t: b.textContent }; });
  ok(v && v.w > 40 && v.inView, 'Try it safely sits beside Show me round on the landing page', JSON.stringify(v));
  await p.waitForFunction(() => document.querySelectorAll('#finBox *').length > 2, null, { timeout: 300000 }).catch(() => {});
  await p.tap('#spTry'); await p.waitForTimeout(4000);
  const r = await p.evaluate(() => { const sp = document.getElementById('splash'); return { splash: !!sp && !sp.hidden && getComputedStyle(sp).display !== 'none', nav: window.__navBoat ? window.__navBoat().practice : null, play: (document.getElementById('play') || {}).getAttribute && document.getElementById('play').getAttribute('aria-label') }; });
  ok(!r.splash, 'the landing page closes');
  ok(r.nav === true || (r.nav === null && /Pause/i.test(r.play || '')), 'the practice starts: Navigate\'s practice boat, or Route playing the race', JSON.stringify(r));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
