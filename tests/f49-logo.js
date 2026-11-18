/* F49 (Stuart 18 Nov 07:55): the logo's line turns while GPS fixes arrive, and is still and grey when none do; top bar and the
   clear-screen badge alike. Run: node tests/f49-logo.js <base> [paths...], e.g. http://localhost:8779 /channel-area/ /mark/ */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8779', PATHS = process.argv.slice(3).length ? process.argv.slice(3) : ['/channel-area/', '/mark/'];
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
const init = () => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); const x = new Date(); localStorage.setItem('fs-terms', x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); };
const st = p => p.evaluate(() => { const lb = document.querySelector('.top .logobox'), bg = document.getElementById('fsBadge'), d = lb && lb.querySelector('.mkdisc');
  const an = d ? getComputedStyle(d, '::before').animationName : null; return { disc: !!d, rx: lb ? lb.classList.contains('rx') : null, badgeOff: bg ? bg.classList.contains('off') : null, anim: an, title: lb && lb.title }; });
(async () => {
  const b = await chromium.launch();
  for (const path of PATHS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', geolocation: { latitude: 50.80, longitude: -1.25, accuracy: 5 }, permissions: ['geolocation'] });
    await ctx.addInitScript(init); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__fsLiveFix && document.getElementById('fsBadge'), null, { timeout: 60000 }); await p.waitForTimeout(2500);
    let s = await st(p);
    ok(s.disc && s.rx === false && s.badgeOff === true && s.anim === 'none', path + ': no GPS: line still and grey, top bar and badge', s);
    await p.evaluate(() => { const l = document.getElementById('liveBtn'); if (l && l.getAttribute('aria-pressed') !== 'true') l.click(); });
    for (let i = 0; i < 4; i++) { await ctx.setGeolocation({ latitude: 50.80 + i * 1e-5, longitude: -1.25, accuracy: 5 }); await p.waitForTimeout(1000); }
    s = await st(p);
    ok(s.rx === true && s.badgeOff === false && s.anim === 'mkspin', path + ': GPS fixes arriving: the line turns, top bar and badge', s);
    await ctx.clearPermissions(); await p.waitForTimeout(7000);   /* GPS lost: the phone stops giving fixes */
    s = await st(p);
    ok(s.rx === false && s.badgeOff === true, path + ': fixes stop for 7 s: the line stops again', s);
    ok(!p.errs.length, path + ': no script errors', p.errs.slice(0, 2)); await ctx.close();
  }
  await b.close(); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
