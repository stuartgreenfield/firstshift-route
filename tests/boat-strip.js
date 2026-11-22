/* Stuart 22 Nov 09:01 (decided 09:10): Route+ with the boat connected shows the boat's figures under the slider (BSP, TWA, TWS, HDG, depth,
   SOG, COG), not the plan; with no boat data it goes back to the plan. Run: node tests/boat-strip.js http://localhost:8778 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8778', PATH = process.argv[3] || '/channel-area/?race=cervantes';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + JSON.stringify(d) : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); ['fs-wizdone', 'fs-boatset', 'fs-autostart'].forEach(k => localStorage.setItem(k, '1')); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + PATH);
  await p.waitForFunction(() => window.__navFeed && (/mark/.test(location.pathname) || document.querySelectorAll('#finBox .fin').length), null, { timeout: 400000 }); await p.waitForTimeout(1500);
  const strip = () => p.evaluate(() => { const n = document.getElementById('now'); return { cls: n.className, txt: n.innerText.replace(/\s+/g, ' ').slice(0, 160) }; });
  let s = await strip(); ok(!/boatd/.test(s.cls) && /HDG|BSP/.test(s.txt), 'No boat data: the plan strip', s);
  const feed = () => p.evaluate(() => { const t = Date.now() / 1000, cs = x => { let k = 0; for (const ch of x) k ^= ch.charCodeAt(0); return '$' + x + '*' + k.toString(16).toUpperCase().padStart(2, '0'); };
    window.__navFeed([t.toFixed(3) + '\t' + cs('IIVHW,,T,,M,6.5,N,12.0,K'), t.toFixed(3) + '\t' + cs('IIMWV,40.0,T,14.0,N,A'), t.toFixed(3) + '\t' + cs('IIHDG,250.0,,,,'), t.toFixed(3) + '\t' + cs('IIDBT,,f,20.5,M,,F')]); });
  for (let i = 0; i < 4; i++) { await feed(); await p.waitForTimeout(500); } await p.waitForTimeout(1200);
  s = await strip(); ok(/boatd/.test(s.cls) && /BSP 6\.5/.test(s.txt) && /TWA 40°\s*STBD/i.test(s.txt) && /TWS 14/.test(s.txt) && /HDG 250°/i.test(s.txt) && /Depth 2[01]/i.test(s.txt), 'Boat data arriving: BOAT strip with BSP, TWA, TWS, HDG and depth from the boat', s);
  const order = s.txt.split(' ').filter(w => /^(SOG|COG|BSP|TWA|TWS|HDG)$/i.test(w)).map(w => w.toUpperCase()).join(',');
  ok(order === 'SOG,COG,BSP,TWA,TWS,HDG', 'BOAT strip in the one column order', order);
  let pk = await p.evaluate(() => { const z = document.getElementById('now2'); return { shown: !!(z && !z.hidden && z.getClientRects().length), txt: z ? z.innerText.replace(/\s+/g, ' ') : '' }; }); ok(pk.shown && /VMC/i.test(pk.txt) && pk.txt.toUpperCase().indexOf('SOG') < pk.txt.toUpperCase().indexOf('HDG'), 'The PLAN figures show underneath, same order (since 0.12.100 they no longer need a tap)', pk);
  for (let i = 0; i < 6; i++) { await feed(); await p.waitForTimeout(2000); } pk = await strip(); ok(/boatd/.test(pk.cls), 'After 10 s back to the BOAT strip', pk.cls);
  await p.waitForTimeout(7000); s = await strip(); ok(!/boatd/.test(s.cls), 'Boat data stops: back to the plan strip', s);
  ok(!errs.length, 'No script errors', errs.slice(0, 2)); console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
