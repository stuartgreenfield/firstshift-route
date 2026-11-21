/* 13 (Stuart 20 Nov 15:59: the start had been set for yesterday, and no start window showed): once the gun is over 10 min gone the
   START chip says Started, in amber, and its note says the race is under way. Run: node tests/start-chip-past.js http://localhost:8779 */
const { chromium } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.clock.install(); await p.goto(BASE + '/channel-area/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const set = async min => { await p.click('#startChip'); await p.waitForTimeout(800); const t = new Date(Date.now() + min * 60000); const hm = String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
    await p.evaluate(([hm, day]) => { const d = document.getElementById('wzDay'); const opt = [...d.options].find(o => +o.value === day); if (opt) { d.value = opt.value; d.dispatchEvent(new Event('change', { bubbles: true })); } const tt = document.getElementById('wzTime'); tt.value = hm; tt.dispatchEvent(new Event('input', { bubbles: true })); }, [hm, Math.floor(t.getTime() / 86400000) * 86400]);
    const can = await p.evaluate(() => !document.getElementById('wizNext').disabled); if (can) await p.click('#wizNext'); else await p.evaluate(() => { const x = document.querySelector('#wizard .close, #wizClose'); if (x) x.click(); }); await p.waitForTimeout(1500); return can; };
  const chip = () => p.evaluate(() => { const e = document.getElementById('startChip'); return { t: e.innerText.replace(/\s+/g, ' '), amber: e.classList.contains('ask'), title: e.title }; });
  await set(90); const a = await chip(); ok(/^Start /i.test(a.t) && !/Started/i.test(a.t), 'a start 90 min ahead reads Start', a.t);
  await set(15); const a2 = await chip(); ok(/^Start /i.test(a2.t) && !/Started/i.test(a2.t), 'a start 15 min ahead reads Start', a2.t);
  await p.clock.fastForward('30:00'); await p.waitForTimeout(2500);
  const b2 = await chip(); ok(/^Started/i.test(b2.t) && b2.amber, 'thirty minutes on, the gun 15 min gone, it reads Started, in amber', b2.t + ' amber=' + b2.amber); ok(/under way/.test(b2.title), 'its note says the race is under way', b2.title);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
