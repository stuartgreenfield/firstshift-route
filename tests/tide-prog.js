/* F116 (Stuart's 16:45 photo, 21 Nov): the Routing box (#prog) never sits on the tide line (#tgStrip) on the deck screen.
   Run: node tests/tide-prog.js http://localhost:8779 */
const { chromium, devices } = require('playwright'); const BASE = process.argv[2] || 'http://localhost:8779';
let pass = 0, fail = 0; const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d !== undefined ? ' | ' + d : '')); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 14'], serviceWorkers: 'block' });
  await c.route(/open-meteo|googleapis|openseamap/, r => r.fulfill({ status: 200, body: '' }));
  await c.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.clear(); const d = new Date(); localStorage.setItem('fs-terms', d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()); localStorage.setItem('fs-wizdone', '1'); localStorage.setItem('fs-boatset', '1'); } document.addEventListener('DOMContentLoaded', () => { const n = document.getElementById('spTourNo'); if (n) setTimeout(() => n.click(), 200); }); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/channel-area/', { timeout: 120000 }); await p.waitForTimeout(9000);
  /* the tide line as the deck screen shows it, and the Routing box at the same height */
  await p.evaluate(() => { const css = document.createElement('style'); css.textContent = '.tgstrip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 70px);z-index:6;padding:4px 12px;font:700 12px monospace;white-space:nowrap}'; document.head.appendChild(css); });
  await p.evaluate(() => { let st = document.getElementById('tgStrip'); if (!st) { st = document.createElement('div'); st.id = 'tgStrip'; st.className = 'tgstrip'; (document.querySelector('.app>.chart') || document.body).appendChild(st); }
    st.hidden = false; st.textContent = 'TIDE FAIR · turns 18:40 · ETA 19:54 · -74 min'; const pg = document.getElementById('prog'); pg.hidden = false; pg.style.display = 'block'; pg.textContent = 'Routing 43%';
    const b = st.getBoundingClientRect(); pg.style.position = 'fixed'; pg.style.top = (b.top - 4) + 'px'; pg.style.left = (b.left + 10) + 'px'; });
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => { const a = document.getElementById('prog').getBoundingClientRect(), b = document.getElementById('tgStrip').getBoundingClientRect(); return { over: !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom), onScreen: b.top >= 0 && b.bottom <= innerHeight, a: [a.top, a.bottom].map(Math.round), b: [b.top, b.bottom].map(Math.round) }; });
  ok(!r.over && r.onScreen, 'The tide line moves just clear of the Routing box and stays on the screen', JSON.stringify(r));
  ok(errs.length === 0, 'No script errors', errs.slice(0, 3).join(' ; '));
  console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0); })();
