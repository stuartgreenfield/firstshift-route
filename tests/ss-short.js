/* Mark's start screen on short screens (to-do 16; Stuart 23 Nov 09:14 "continue"): every card and button on the screen, small phones and
   phones on their side. node tests/ss-short.js [base] */
const { chromium } = require('playwright'); let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else { fail++; console.log('FAIL ' + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); } };
(async () => { const b = await chromium.launch(); const out = [];
  for (const [w, h] of JSON.parse('[[360,560],[375,600],[390,664],[780,360],[844,390],[915,412],[1280,800]]')) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block' });
    await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); localStorage.setItem('fs-autostart', '1'); });
    await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
    const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8779') + '/mark/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => window.FSSolent && FSSolent.marks && FSSolent.marks() && window.__navFc && window.__navFc().P && document.getElementById('solCardT'), null, { timeout: 300000 }); await p.waitForTimeout(800);
    await p.click('#solCardT'); await p.waitForTimeout(3500);
    const r = await p.evaluate(() => { const s = document.getElementById('solStartScr'); if (!s || s.hidden) return { ss: 'not shown' }; const H = innerHeight, W = innerWidth, bad = [];
      s.querySelectorAll('button, .ssc, canvas').forEach(e => { const R = e.getBoundingClientRect(); if (R.width && (R.bottom > H + 0.5 || R.right > W + 0.5)) bad.push((e.id || e.textContent.trim().slice(0, 12) || e.className) + '@' + Math.round(R.bottom)); });
      const cv = s.querySelector('canvas'); return { W, H, cls: s.className, canvasH: cv ? Math.round(cv.getBoundingClientRect().height) : 0, scrollH: s.scrollHeight, bad: bad.slice(0, 10), nBad: bad.length }; });
    ok(r.ss !== 'not shown', w + 'x' + h + ': the start screen is up', r); ok(r.nBad === 0, w + 'x' + h + ': every card and button is on the screen', r.bad); await c.close(); }
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
