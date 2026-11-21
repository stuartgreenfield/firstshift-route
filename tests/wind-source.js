/* F83 / P16 (Stuart 20 Nov 23:05): the start line set-up has a True wind from choice; Boat instruments uses the live TWD, Set by hand
   the typed wind, and the line maths follow it. Run: node tests/wind-source.js http://localhost:8778 (Route+ and Mark+ server) */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778';
let pass = 0, fail = 0; const ok = (c, m, d) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d != null ? ' | ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-rdetail', 'quick'); });
  const p = await c.newPage(); await p.goto(BASE + '/mark/'); await p.waitForFunction(() => window.__navFc && window.__navFc().P, null, { timeout: 300000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__navWind = () => [14, 215]; });   /* the boat's instruments: 14 kn from 215 deg true */
  await p.evaluate(() => { const c = [...document.querySelectorAll('#solCard *')].find(x => /^Windward-leeward$/.test((x.textContent || '').trim())); (c && (c.closest('button') || c)).click(); });
  await p.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) { const has = await p.evaluate(() => !!document.querySelector('#solStep .solwsrc')); if (has) break; await p.evaluate(() => { const n = [...document.querySelectorAll('#solStep button')].find(x => /^Next/.test(x.textContent.trim())); if (n) n.click(); }); await p.waitForTimeout(800); }
  const opts = await p.evaluate(() => { const s = document.querySelector('#solStep .solwsrc'); return s ? [...s.options].map(o => o.value) : null; });
  ok(opts && opts.includes('boat') && opts.includes('hand'), 'the line set-up offers True wind from, with Boat instruments', JSON.stringify(opts));
  const pick = v => p.evaluate(v => { const s = document.querySelector('#solStep .solwsrc'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  await p.evaluate(() => FSSolent.set({ wind: { twd: 250, tws: 9, src: 'typed', at: Date.now() } }));
  await pick('boat'); await p.waitForTimeout(400);
  const w1 = await p.evaluate(() => FSSolent.windNow ? FSSolent.windNow() : null);
  ok(w1 && w1.twd === 215, 'Boat instruments uses the live TWD (215), not the typed 250', JSON.stringify(w1));
  await pick('hand'); await p.waitForTimeout(400);
  const w2 = await p.evaluate(() => FSSolent.windNow ? FSSolent.windNow() : null);
  ok(w2 && w2.twd === 250, 'Set by hand uses the typed 250', JSON.stringify(w2));
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /solent/i.test(k) && /wsrc/.test(localStorage.getItem(k) || '')) || '"{}"') || '{}').wsrc);
  ok(kept === 'hand', 'the choice is kept on the device', kept);
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);
})();
