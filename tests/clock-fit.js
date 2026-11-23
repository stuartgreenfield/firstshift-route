/* The plan clock fits the time row (Check 23 Nov 03:03, Pixel 7; Stuart 23 Nov 06:47, iPhone 14 Plus: the clock and "Race 7h 45" ran
   off the screen). The date line shows only from 561 px; under 395 px TIDE moves to the top of the Data tab (Stuart 23 Nov, "Fold TIDE
   into Data") and still opens the tide gate. node tests/clock-fit.js [base] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL ' + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); } };
(async () => { const b = await chromium.launch(), errs = [];
  for (const path of ['/fastnet/', '/mark/']) for (const w of [341, 360, 364, 365, 375, 384, 393, 412, 428, 430, 480, 561, 700]) {
    const c = await b.newContext({ viewport: { width: w, height: 860 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); localStorage.setItem('fs-finesec', '0'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(w + path + ': ' + e.message)); await p.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('tgBtn'), null, { timeout: 60000 }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const ck = document.querySelector('.bar .clock'), R = ck.getBoundingClientRect(), t = ck.querySelector('.ckt').getBoundingClientRect(), vis = e => !!e && getComputedStyle(e).display !== 'none';
      const over = [...document.querySelectorAll('.bar *')].filter(e => vis(e) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > innerWidth + 0.5).map(e => e.id || e.className);
      return { fits: R.right <= innerWidth + 0.5, clip: t.right > R.right + 0.5, date: vis(ck.querySelector('.ckd')), tide: vis(document.getElementById('tgBtn')), tideData: vis(document.getElementById('tgBtnData')), over }; });
    const tag = (path === '/mark/' ? 'Mark ' : 'Route ') + w + ' px';
    ok(r.fits && !r.clip && !r.over.length, tag + ': the clock and the whole time row fit, the time not cut', r);
    ok(r.date === (w >= 561), tag + ': the date line only where it fits (561 px and wider)', r.date);
    ok(r.tide === (w >= 365) && r.tideData === (w < 365), tag + ': TIDE in the row from 365 px, in the Data tab below', [r.tide, r.tideData]);
    if (w === 360) {
      await p.evaluate(() => { const t = document.querySelector('.tabs .tab[data-tab="data"]'); if (t) t.click(); }); await p.waitForTimeout(600);
      const shown = await p.evaluate(() => { const e = document.getElementById('tgBtnData'), R = e.getBoundingClientRect(); return R.width > 200 && R.height >= 44; });
      ok(shown, tag + ': the Data tab shows the TIDE button, full width, 44 px tall');
      await p.evaluate(() => document.getElementById('tgBtnData').click()); await p.waitForTimeout(600);
      ok(await p.evaluate(() => document.getElementById('tgBtnData').getAttribute('aria-pressed') === 'true'), tag + ': it opens the tide gate');
    }
    await c.close(); }
  ok(!errs.length, 'no script errors', errs.slice(0, 3));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
