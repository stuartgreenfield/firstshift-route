/* No window dots on top of a full-screen view (Big numbers, helm view, start screen) */
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block', geolocation: { latitude: 50.769, longitude: -1.296, accuracy: 5 }, permissions: ['geolocation'] });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8778') + '/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const b = document.getElementById('liveBtn'); b && b.click(); }); await p.waitForTimeout(3000);
  const before = await p.evaluate(() => [...document.querySelectorAll('.navgrip2')].filter(g => !g.hidden).length);
  await p.evaluate(() => { const b = document.getElementById('lvBig'); b && b.click(); }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ big: !!(document.getElementById('liveBig') && !document.getElementById('liveBig').hidden), dots: [...document.querySelectorAll('.navgrip2')].filter(g => !g.hidden).length }));
  console.log((r.big && r.dots === 0 && before > 0 ? 'PASS' : 'FAIL') + ' Big numbers open with no dots on top | dots before ' + before + ', with Big ' + r.dots + ', big ' + r.big); await b.close(); })();
