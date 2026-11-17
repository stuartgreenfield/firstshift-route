/* Practice: off when the app opens, starts from the phone's position (nearest water), shows the PRACTICE label */
const { chromium, devices } = require('playwright');
(async () => { const b = await chromium.launch(); let pass = 0, fail = 0; const ok = (n, v, d) => { console.log((v ? 'PASS ' : 'FAIL ') + n + (d ? ' | ' + d : '')); v ? pass++ : fail++; };
  const c = await b.newContext({ ...devices['Galaxy Tab S4'], serviceWorkers: 'block', geolocation: { latitude: 50.9097, longitude: -1.4044, accuracy: 10 }, permissions: ['geolocation'] });   /* Southampton, ashore */
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8778/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P && window.__fsLiveFix, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const b = document.getElementById('liveBtn') || [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'GPS'); b && b.click(); }); await p.waitForTimeout(4000);
  ok('phone fix', await p.evaluate(() => !!window.__fsLiveFix()), JSON.stringify(await p.evaluate(() => { const f = window.__fsLiveFix(); return f && [f.la, f.lo]; })));
  await p.evaluate(() => { document.getElementById('navBoatBtn').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const cb = document.getElementById('navPrac'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#navPanel button')].find(x => /^Connect/i.test(x.textContent.trim())); b && b.click(); }); await p.waitForTimeout(3000);
  const st = await p.evaluate(() => { const t = document.getElementById('navPracTag'); const bt = window.__navBoat && window.__navBoat(); return { tag: t && !t.hidden ? t.textContent : null, boat: bt && [bt.lat, bt.lon] }; });
  ok('PRACTICE label showing', !!st.tag, st.tag); ok('practice boat starts near Southampton, not in the western Solent', st.boat && Math.abs(st.boat[0] - 50.9) < 0.12 && Math.abs(st.boat[1] + 1.40) < 0.15, JSON.stringify(st.boat));
  await p.screenshot({ path: '/tmp/claude-0/ui/prac.png' });
  await p.reload(); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(6000);
  const st2 = await p.evaluate(() => { const t = document.getElementById('navPracTag'); return { tag: !!(t && !t.hidden), cfg: Object.keys(localStorage).filter(k => /nav/i.test(k)).map(k => k + '=' + (localStorage.getItem(k) || '').slice(0, 0)).length, prac: (document.getElementById('navPrac') || {}).checked }; });
  ok('after reopening: practice not running', !st2.tag && !st2.prac, JSON.stringify(st2));
  ok('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); })();
